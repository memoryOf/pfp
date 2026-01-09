"""
脚本部署服务
"""
import paramiko
import logging
import re
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ScriptDeploymentService:
    """脚本部署服务"""
    
    def __init__(self, load_generator_service, venv_service, db: Session):
        self.load_generator_service = load_generator_service
        self.venv_service = venv_service
        self.db = db
    
    async def deploy_scripts(
        self,
        task_id: int,
        load_generator_id: int,
        scenario_ids: List[int],
        target_dir: Optional[str] = None,
        deployment_mode: str = "overwrite"
    ) -> Dict:
        """
        部署脚本到压测机
        
        Args:
            task_id: 任务ID
            load_generator_id: 压测机ID
            scenario_ids: 场景ID列表
            target_dir: 目标目录（可选，默认为 /opt/pfp-locust/tasks/{task_id}/scripts）
            deployment_mode: 部署模式 "overwrite" 或 "incremental"
        
        Returns:
            {
                "deployment_id": str,
                "status": "completed",
                "files": [...],
                "venv_status": {...},
                "logs": [...]
            }
        """
        # 验证输入参数
        if not scenario_ids:
            return {"error": "场景ID列表不能为空"}
        
        load_generator = await self.load_generator_service.get_load_generator(load_generator_id)
        if not load_generator:
            return {"error": "Load generator not found"}
        
        # 确保虚拟环境存在
        venv_result = await self.venv_service.ensure_venv_exists(load_generator_id)
        if venv_result.get("status") not in ["ok", "created"]:
            return {"error": f"Virtual environment issue: {venv_result.get('message')}"}
        
        # 确定目标目录
        # 如果虚拟环境使用了备用路径（用户主目录），则任务目录也应该在用户主目录下
        if not target_dir:
            if self.venv_service.VENV_BASE_PATH.startswith("/opt"):
                target_dir = f"/opt/pfp-locust/tasks/{task_id}/scripts"
            else:
                # 使用与虚拟环境相同的基础路径
                base_path = self.venv_service.VENV_BASE_PATH
                target_dir = f"{base_path}/tasks/{task_id}/scripts"
        
        # 获取场景文件并检查是否有文件需要部署
        from ..models.scenario import ScenarioFileRecord
        total_files = 0
        for scenario_id in scenario_ids:
            scenario_files = self.db.query(ScenarioFileRecord).filter(
                ScenarioFileRecord.scenario_id == scenario_id
            ).all()
            total_files += len(scenario_files)
        
        if total_files == 0:
            return {"error": "所选场景没有关联的文件，无法部署"}
        
        ssh_client = None
        sftp = None
        deployment_logs = []
        deployed_files = []
        
        try:
            ssh_client = self.load_generator_service._get_ssh_client(load_generator)
            sftp = ssh_client.open_sftp()
            
            # 创建目标目录
            self._ensure_directory(ssh_client, target_dir)
            deployment_logs.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Created directory: {target_dir}")
            
            # 如果覆盖模式，先清空目录
            if deployment_mode == "overwrite":
                ssh_client.exec_command(f"rm -f {target_dir}/*.py")
                deployment_logs.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Cleared existing scripts (overwrite mode)")
            
            # 获取场景文件并上传
            from .minio_service import minio_service
            from .script_fix_service import ScriptFixService
            
            for scenario_id in scenario_ids:
                scenario_files = self.db.query(ScenarioFileRecord).filter(
                    ScenarioFileRecord.scenario_id == scenario_id
                ).all()
                
                for file_record in scenario_files:
                    file_name = file_record.file_name
                    file_path = f"{target_dir}/{file_name}"
                    
                    try:
                        # 从MinIO获取文件内容
                        file_content = minio_service.download_file(file_record.file_path)
                        original_content = file_content.decode('utf-8') if isinstance(file_content, bytes) else file_content
                        
                        # 如果是Python文件，尝试修复常见问题（如assert语句）
                        fixed_content = original_content
                        fix_changes = []
                        if file_name.endswith('.py'):
                            fix_result = ScriptFixService.fix_assert_statements(original_content)
                            if fix_result["fixed_count"] > 0:
                                fixed_content = fix_result["fixed_content"]
                                fix_changes = fix_result["changes"]
                                deployment_logs.append(
                                    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fixed {fix_result['fixed_count']} issue(s) in {file_name}"
                                )
                                for change in fix_changes:
                                    deployment_logs.append(
                                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]   - {change}"
                                    )
                        
                        # 上传修复后的文件
                        file_content_to_upload = fixed_content.encode('utf-8') if isinstance(fixed_content, str) else fixed_content
                        with sftp.open(file_path, 'w') as remote_file:
                            remote_file.write(file_content_to_upload)
                        
                        file_size = len(file_content_to_upload)
                        deployed_files.append({
                            "name": file_name,
                            "size": file_size,
                            "status": "uploaded",
                            "path": file_path,
                            "fixed": len(fix_changes) > 0,
                            "fixes": fix_changes
                        })
                        
                        deployment_logs.append(
                            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Uploaded {file_name} ({file_size} bytes)"
                        )
                    except Exception as e:
                        logger.error(f"Failed to deploy file {file_name}: {str(e)}")
                        deployed_files.append({
                            "name": file_name,
                            "size": 0,
                            "status": "failed",
                            "error": str(e)
                        })
                        deployment_logs.append(
                            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Failed to upload {file_name}: {str(e)}"
                        )
            
            # 检查是否有文件成功部署
            successful_files = [f for f in deployed_files if f.get("status") == "uploaded"]
            if not successful_files:
                return {
                    "error": "没有文件成功部署，请检查场景文件是否存在",
                    "logs": deployment_logs,
                    "files": deployed_files
                }
            
            # 验证脚本语法
            validation_result = await self._validate_scripts(
                ssh_client, target_dir, venv_path=self.venv_service.VENV_PATH
            )
            
            deployment_logs.extend(validation_result["logs"])
            
            # 生成部署ID
            deployment_id = f"deploy_{task_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            return {
                "deployment_id": deployment_id,
                "status": "completed" if validation_result["valid"] else "completed_with_warnings",
                "files": deployed_files,
                "venv_status": venv_result,
                "validation": validation_result,
                "logs": deployment_logs,
                "target_dir": target_dir
            }
        
        except Exception as e:
            logger.error(f"Deployment failed: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "logs": deployment_logs,
                "files": deployed_files
            }
        finally:
            if sftp:
                try:
                    sftp.close()
                except:
                    pass
            if ssh_client:
                try:
                    ssh_client.close()
                except:
                    pass
    
    def _ensure_directory(self, ssh_client: paramiko.SSHClient, directory: str):
        """确保目录存在，如果失败则尝试创建父目录"""
        stdin, stdout, stderr = ssh_client.exec_command(f"mkdir -p {directory}")
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            error = stderr.read().decode().strip()
            logger.warning(f"Failed to create directory {directory}: {error}")
            # 如果失败，尝试使用 sudo（如果可用），或者使用用户主目录
            # 提取任务ID（假设目录格式为 .../tasks/{task_id}/scripts）
            task_id_match = re.search(r'/tasks/(\d+)/', directory)
            if task_id_match:
                task_id = task_id_match.group(1)
                fallback_dir = f"~/pfp-locust/tasks/{task_id}/scripts"
                stdin, stdout, stderr = ssh_client.exec_command(f"sudo mkdir -p {directory} 2>/dev/null || mkdir -p {fallback_dir}")
                exit_status = stdout.channel.recv_exit_status()
                if exit_status != 0:
                    raise Exception(f"Cannot create directory: {directory} or {fallback_dir}")
            else:
                raise Exception(f"Cannot create directory: {directory}")
    
    async def _validate_scripts(
        self, 
        ssh_client: paramiko.SSHClient, 
        script_dir: str, 
        venv_path: str
    ) -> Dict:
        """验证脚本语法和最佳实践"""
        validate_script = f"""
#!/bin/bash
set +e

SCRIPT_DIR="{script_dir}"
VENV_PYTHON="{venv_path}/bin/python3"

errors=0
warnings=0
validation_logs=()

# 检查目录是否存在
if [ ! -d "$SCRIPT_DIR" ]; then
    echo "ERROR: Directory does not exist: $SCRIPT_DIR"
    exit 1
fi

# 检查是否有Python文件
file_count=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.py" -type f | wc -l)
if [ $file_count -eq 0 ]; then
    echo "WARNING: No Python files found in $SCRIPT_DIR"
    echo "VALIDATION_PASSED"
    exit 0
fi

# 验证每个Python文件
for script in "$SCRIPT_DIR"/*.py; do
    if [ -f "$script" ]; then
        script_name=$(basename "$script")
        echo "Validating $script_name..."
        
        # 语法检查
        if "$VENV_PYTHON" -m py_compile "$script" 2>&1; then
            echo "OK: $script_name syntax is valid"
            validation_logs+=("OK: $script_name syntax is valid")
        else
            echo "ERROR: $script_name has syntax errors"
            validation_logs+=("ERROR: $script_name has syntax errors")
            errors=$((errors + 1))
            continue
        fi
        
        # 检查是否使用了assert语句（不推荐在Locust中使用）
        if grep -q "assert.*status_code" "$script" 2>/dev/null; then
            echo "WARNING: $script_name uses 'assert' with status_code - this may cause all requests to be marked as failed"
            validation_logs+=("WARNING: $script_name uses assert with status_code - consider using response.raise_for_status() or response.failure() instead")
            warnings=$((warnings + 1))
        fi
        
        # 检查是否使用了assert response（更通用的检查）
        if grep -q "assert.*response" "$script" 2>/dev/null; then
            echo "WARNING: $script_name uses 'assert' with response - assertions in Locust tasks can cause unexpected failures"
            validation_logs+=("WARNING: $script_name uses assert with response - consider using response.raise_for_status() or response.failure() instead")
            warnings=$((warnings + 1))
        fi
        
        # 检查是否使用了推荐的错误处理方式
        if grep -q "response.raise_for_status\|response.failure" "$script" 2>/dev/null; then
            echo "INFO: $script_name uses recommended error handling methods"
            validation_logs+=("INFO: $script_name uses recommended error handling")
        fi
    fi
done

if [ $errors -eq 0 ]; then
    if [ $warnings -gt 0 ]; then
        echo "VALIDATION_PASSED_WITH_WARNINGS"
    else
        echo "VALIDATION_PASSED"
    fi
    exit 0
else
    echo "VALIDATION_FAILED: $errors error(s) found"
    exit 1
fi
"""
        
        try:
            stdin, stdout, stderr = ssh_client.exec_command(validate_script)
            
            output_lines = []
            error_lines = []
            
            while True:
                line = stdout.readline()
                if not line:
                    break
                output_lines.append(line.strip())
            
            while True:
                line = stderr.readline()
                if not line:
                    break
                error_lines.append(line.strip())
            
            exit_status = stdout.channel.recv_exit_status()
            
            # 检查验证结果
            has_warnings = any("VALIDATION_PASSED_WITH_WARNINGS" in line for line in output_lines)
            validation_passed = exit_status == 0
            
            # 过滤掉验证结果标记
            validation_logs = [line for line in output_lines if not line.startswith("VALIDATION_")]
            
            return {
                "valid": validation_passed,
                "has_warnings": has_warnings,
                "logs": validation_logs,
                "errors": error_lines if error_lines else [],
                "error_count": exit_status if exit_status != 0 else 0
            }
        
        except Exception as e:
            logger.error(f"Error validating scripts: {str(e)}", exc_info=True)
            return {
                "valid": False,
                "logs": [f"Validation error: {str(e)}"],
                "errors": [str(e)],
                "error_count": 1
            }

