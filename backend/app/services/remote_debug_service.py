"""
远程调试服务
"""
import paramiko
import asyncio
import logging
import os
from typing import Dict, Optional, AsyncGenerator, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# 全局存储调试会话信息（模块级别，所有实例共享）
_active_debug_sessions: Dict[str, Dict] = {}

# SSH命令执行超时时间（秒）
SSH_COMMAND_TIMEOUT = 30


class RemoteDebugService:
    """远程调试服务"""
    
    def __init__(self, load_generator_service, venv_service):
        self.load_generator_service = load_generator_service
        self.venv_service = venv_service
        # 使用模块级别的全局字典
        self.active_debug_sessions = _active_debug_sessions
    
    async def _exec_ssh_command(
        self, 
        ssh_client: paramiko.SSHClient, 
        command: str,
        timeout: int = SSH_COMMAND_TIMEOUT
    ) -> Tuple[str, str]:
        """
        异步执行SSH命令，带超时控制
        
        Args:
            ssh_client: SSH客户端
            command: 要执行的命令
            timeout: 超时时间（秒）
            
        Returns:
            (stdout, stderr) 元组
        """
        def _exec_command():
            """在后台线程中执行SSH命令"""
            try:
                stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
                stdout_text = stdout.read().decode().strip()
                stderr_text = stderr.read().decode().strip()
                return stdout_text, stderr_text
            except Exception as e:
                logger.error(f"SSH command execution error: {str(e)}")
                raise
        
        try:
            # 在线程池中执行SSH命令，避免阻塞事件循环
            stdout_text, stderr_text = await asyncio.wait_for(
                asyncio.to_thread(_exec_command),
                timeout=timeout
            )
            return stdout_text, stderr_text
        except asyncio.TimeoutError:
            logger.error(f"SSH command timeout after {timeout}s: {command[:100]}")
            raise Exception(f"SSH命令执行超时（{timeout}秒）")
        except Exception as e:
            logger.error(f"SSH command execution failed: {str(e)}")
            raise
    
    async def start_debug(
        self,
        task_id: int,
        load_generator_id: int,
        deployment_info: Dict,
        debug_config: Dict
    ) -> Dict:
        """
        启动远程调试
        
        Args:
            task_id: 任务ID
            load_generator_id: 压测机ID
            deployment_info: 部署信息（包含target_dir等）
            debug_config: {
                "users": 1,
                "duration": 30,
                "host": "https://api.example.com",
                "spawn_rate": 1
            }
        
        Returns:
            {
                "debug_id": str,
                "status": "running",
                "process_id": str
            }
        """
        load_generator = await self.load_generator_service.get_load_generator(load_generator_id)
        if not load_generator:
            return {"error": "Load generator not found"}
        
        # 确保虚拟环境路径正确（可能需要先检查虚拟环境状态）
        try:
            venv_result = await self.venv_service.ensure_venv_exists(load_generator_id)
            if venv_result.get("status") not in ["ok", "created"]:
                return {"error": f"Virtual environment issue: {venv_result.get('message', 'Unknown error')}"}
        except Exception as e:
            logger.error(f"Error ensuring venv: {str(e)}", exc_info=True)
            return {"error": f"Failed to ensure virtual environment: {str(e)}"}
        
        venv_path = self.venv_service.VENV_PATH
        script_dir = deployment_info.get("target_dir", f"/opt/pfp-locust/tasks/{task_id}/scripts")
        
        # 如果虚拟环境路径不在 /opt 下，调整脚本目录
        if not venv_path.startswith("/opt"):
            # 使用与虚拟环境相同的基础路径
            base_path = "/".join(venv_path.split("/")[:-1])
            script_dir = deployment_info.get("target_dir", f"{base_path}/tasks/{task_id}/scripts")
        
        debug_id = f"debug_{task_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        log_file = f"/tmp/debug_{debug_id}.log"
        out_file = f"/tmp/debug_{debug_id}.out"
        
        ssh_client = None
        try:
            # 异步创建SSH连接，避免阻塞
            def _create_ssh_client():
                try:
                    return self.load_generator_service._get_ssh_client(load_generator)
                except Exception as e:
                    logger.error(f"Failed to create SSH client: {str(e)}", exc_info=True)
                    raise
            
            try:
                ssh_client = await asyncio.wait_for(
                    asyncio.to_thread(_create_ssh_client),
                    timeout=30
                )
            except asyncio.TimeoutError:
                logger.error("SSH connection timeout after 30s")
                return {"error": "SSH连接超时（30秒），请检查压测机网络连接"}
            except Exception as e:
                logger.error(f"SSH connection failed: {str(e)}", exc_info=True)
                error_msg = str(e) if str(e) else repr(e)
                return {"error": f"SSH连接失败: {error_msg}"}
            
            # 获取主脚本文件
            script_file = await self._get_main_script(ssh_client, script_dir)
            if not script_file:
                if ssh_client:
                    ssh_client.close()
                return {"error": f"No script files found in {script_dir}"}
            
            # 构建Locust调试命令
            locust_cmd = (
                f'source {venv_path}/bin/activate && '
                f'cd {script_dir} && '
                f'locust -f {script_file} '
                f'--host={debug_config.get("host", "http://localhost")} '
                f'--users={debug_config.get("users", 1)} '
                f'--spawn-rate={debug_config.get("spawn_rate", 1)} '
                f'--run-time={debug_config.get("duration", 30)}s '
                f'--headless '
                f'--logfile={log_file} '
                f'--loglevel=INFO'
            )
            
            # 创建日志文件（使用异步方法）
            try:
                await self._exec_ssh_command(ssh_client, f"touch {log_file}", timeout=10)
            except Exception as e:
                logger.warning(f"Failed to create log file: {str(e)}")
            
            # 在后台执行（使用nohup保持运行）
            exec_cmd = f"nohup bash -c '{locust_cmd}' > /tmp/debug_{debug_id}.out 2>&1 & echo $!"
            stdout_text, stderr_text = await self._exec_ssh_command(ssh_client, exec_cmd, timeout=30)
            
            process_id = stdout_text.strip()
            error_output = stderr_text.strip()
            
            if error_output:
                logger.warning(f"Debug start warning: {error_output}")
            
            if not process_id or not process_id.isdigit():
                if ssh_client:
                    ssh_client.close()
                return {
                    "error": f"Failed to start debug process. Output: {stdout_text}, Error: {error_output}",
                    "debug_id": debug_id
                }
            
            # 等待一下确保进程启动
            await asyncio.sleep(2)
            
            # 多次检查进程状态，确保进程稳定运行
            process_running = False
            for attempt in range(3):
                check_cmd = f"ps -p {process_id} > /dev/null 2>&1 && echo 'running' || echo 'stopped'"
                try:
                    status_check, _ = await self._exec_ssh_command(ssh_client, check_cmd, timeout=10)
                    status_check = status_check.strip()
                    
                    if status_check == "running":
                        process_running = True
                        break
                    else:
                        # 如果进程停止，等待一下再检查（可能是启动延迟）
                        if attempt < 2:
                            await asyncio.sleep(1)
                            continue
                except Exception as e:
                    logger.warning(f"Failed to check process status (attempt {attempt + 1}): {str(e)}")
                    if attempt < 2:
                        await asyncio.sleep(1)
                        continue
            
            if not process_running:
                # 读取输出日志以判断是成功完成还是失败
                error_details = ""
                test_completed = False
                try:
                    read_error_cmd = f"cat {out_file} 2>/dev/null | head -200 || echo ''"
                    error_output, _ = await self._exec_ssh_command(ssh_client, read_error_cmd, timeout=10)
                    if error_output and error_output.strip():
                        # 检查输出中是否包含Locust成功完成的标志
                        output_lower = error_output.lower()
                        # 如果包含统计信息、聚合数据或响应时间百分位数，说明测试成功完成
                        if any(keyword in output_lower for keyword in [
                            "aggregated", "response time percentiles", 
                            "# reqs", "req/s", "failures/s", "percentiles"
                        ]):
                            test_completed = True
                            logger.info(f"Debug test completed successfully: {debug_id}")
                        else:
                            error_details = f"\n错误详情:\n{error_output.strip()}"
                    else:
                        # 也尝试读取日志文件
                        read_log_cmd = f"cat {log_file} 2>/dev/null | head -200 || echo ''"
                        log_output, _ = await self._exec_ssh_command(ssh_client, read_log_cmd, timeout=10)
                        if log_output and log_output.strip():
                            log_lower = log_output.lower()
                            if any(keyword in log_lower for keyword in [
                                "aggregated", "response time percentiles",
                                "# reqs", "req/s", "failures/s"
                            ]):
                                test_completed = True
                                logger.info(f"Debug test completed successfully (from log): {debug_id}")
                            else:
                                error_details = f"\n日志详情:\n{log_output.strip()}"
                except Exception as read_error:
                    logger.warning(f"Failed to read error logs: {str(read_error)}")
                    error_details = f"\n无法读取错误日志: {str(read_error)}"
                
                # 如果测试成功完成，返回成功状态（即使进程已退出）
                if test_completed:
                    # 保存会话信息（标记为已完成）
                    self.active_debug_sessions[debug_id] = {
                        "ssh_client": ssh_client,
                        "process_id": process_id,
                        "log_file": log_file,
                        "out_file": out_file,
                        "load_generator_id": load_generator_id,
                        "start_time": datetime.now(),
                        "status": "completed"
                    }
                    return {
                        "debug_id": debug_id,
                        "status": "completed",
                        "process_id": process_id,
                        "log_file": log_file,
                        "out_file": out_file,
                        "message": "Debug test completed successfully"
                    }
                
                # 如果测试未成功完成，返回错误
                # 清理会话
                if ssh_client:
                    ssh_client.close()
                
                error_msg = f"Failed to start debug session. Process stopped immediately.{error_details}"
                logger.error(f"Debug process stopped immediately: {error_msg}")
                return {
                    "error": error_msg,
                    "debug_id": debug_id,
                    "out_file": out_file,
                    "log_file": log_file
                }
            
            # 保存会话信息（只有在进程确认运行后才保存）
            self.active_debug_sessions[debug_id] = {
                "ssh_client": ssh_client,
                "process_id": process_id,
                "log_file": log_file,
                "out_file": out_file,
                "load_generator_id": load_generator_id,
                "start_time": datetime.now(),
                "status": "running"
            }
            
            return {
                "debug_id": debug_id,
                "status": "running",
                "process_id": process_id,
                "log_file": log_file,
                "out_file": out_file
            }
        
        except Exception as e:
            logger.error(f"Error starting debug: {str(e)}", exc_info=True)
            if ssh_client:
                try:
                    ssh_client.close()
                except Exception as close_error:
                    logger.warning(f"Error closing SSH client: {str(close_error)}")
            error_msg = str(e) if str(e) else repr(e)
            logger.error(f"Debug start failed with error: {error_msg}")
            return {"error": f"启动调试失败: {error_msg}"}
    
    async def stream_debug_logs(
        self, 
        debug_id: str,
        limit: Optional[int] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        流式返回调试日志（包含.log和.out文件内容）
        
        Args:
            debug_id: 调试会话ID
            limit: 限制返回的行数（None表示实时流式传输）
        
        Yields:
            {
                "timestamp": "2024-01-20T14:30:00Z",
                "level": "INFO",
                "message": "...",
                "source": "log" | "out"  # 日志来源
            }
        """
        if debug_id not in self.active_debug_sessions:
            yield {
                "timestamp": datetime.now().isoformat(),
                "level": "ERROR",
                "message": "Debug session not found",
                "source": "system"
            }
            return
        
        session = self.active_debug_sessions[debug_id]
        ssh_client = session["ssh_client"]
        log_file = session.get("log_file", f"/tmp/debug_{debug_id}.log")
        out_file = session.get("out_file", f"/tmp/debug_{debug_id}.out")
        
        try:
            if limit:
                # 返回最后N行日志（合并.log和.out）
                # 先读取.out文件的启动信息
                out_cmd = f"tail -n {limit // 2} {out_file} 2>/dev/null || echo ''"
                out_text, _ = await self._exec_ssh_command(ssh_client, out_cmd, timeout=10)
                
                for line in out_text.split('\n'):
                    line = line.strip()
                    if line:
                        yield {
                            "timestamp": datetime.now().isoformat(),
                            "level": self._parse_log_level(line),
                            "message": line,
                            "source": "out"
                        }
                
                # 再读取.log文件
                log_cmd = f"tail -n {limit} {log_file} 2>/dev/null || echo ''"
                log_text, _ = await self._exec_ssh_command(ssh_client, log_cmd, timeout=10)
                
                for line in log_text.split('\n'):
                    line = line.strip()
                    if line:
                        yield {
                            "timestamp": datetime.now().isoformat(),
                            "level": self._parse_log_level(line),
                            "message": line,
                            "source": "log"
                        }
            else:
                # 实时流式传输
                # 首先读取.out文件的初始内容（启动信息）
                try:
                    initial_out_lines = await self._read_remaining_logs(ssh_client, out_file)
                    for line in initial_out_lines:
                        line = line.strip()
                        if line:
                            yield {
                                "timestamp": datetime.now().isoformat(),
                                "level": self._parse_log_level(line),
                                "message": line,
                                "source": "out"
                            }
                except Exception as e:
                    logger.warning(f"Failed to read initial .out file: {str(e)}")
                
                # 然后实时读取.log文件
                tail_cmd = f"tail -f {log_file} 2>/dev/null"
                stdin, stdout, stderr = ssh_client.exec_command(tail_cmd)
                stdout.channel.settimeout(1.0)  # 设置通道超时
                
                while True:
                    # 检查进程是否还在运行
                    if not await self._is_process_running(ssh_client, session["process_id"]):
                        # 进程已结束，读取剩余日志
                        # 先读取.log的剩余内容
                        remaining_log_lines = await self._read_remaining_logs(ssh_client, log_file)
                        for line in remaining_log_lines:
                            line = line.strip()
                            if line:
                                yield {
                                    "timestamp": datetime.now().isoformat(),
                                    "level": self._parse_log_level(line),
                                    "message": line,
                                    "source": "log"
                                }
                        
                        # 再读取.out的剩余内容（可能包含错误信息）
                        try:
                            remaining_out_lines = await self._read_remaining_logs(ssh_client, out_file)
                            for line in remaining_out_lines:
                                line = line.strip()
                                if line:
                                    yield {
                                        "timestamp": datetime.now().isoformat(),
                                        "level": self._parse_log_level(line),
                                        "message": line,
                                        "source": "out"
                                    }
                        except Exception as e:
                            logger.warning(f"Failed to read remaining .out file: {str(e)}")
                        
                        yield {
                            "timestamp": datetime.now().isoformat(),
                            "level": "INFO",
                            "message": "Debug session completed",
                            "source": "system"
                        }
                        break
                    
                    # 读取可用数据
                    try:
                        if stdout.channel.recv_ready():
                            line = stdout.readline()
                            if line:
                                line = line.strip()
                                if line:
                                    yield {
                                        "timestamp": datetime.now().isoformat(),
                                        "level": self._parse_log_level(line),
                                        "message": line,
                                        "source": "log"
                                    }
                        else:
                            await asyncio.sleep(0.1)
                    except Exception as e:
                        # 超时或其他错误，继续循环
                        await asyncio.sleep(0.1)
                        continue
        
        except Exception as e:
            logger.error(f"Error streaming logs: {str(e)}")
            yield {
                "timestamp": datetime.now().isoformat(),
                "level": "ERROR",
                "message": f"Error reading logs: {str(e)}",
                "source": "system"
            }
    
    async def _is_process_running(self, ssh_client: paramiko.SSHClient, process_id: str) -> bool:
        """检查进程是否还在运行"""
        try:
            check_cmd = f"ps -p {process_id} > /dev/null 2>&1 && echo 'running' || echo 'stopped'"
            stdout_text, _ = await self._exec_ssh_command(ssh_client, check_cmd, timeout=5)
            status = stdout_text.strip()
            return status == "running"
        except:
            return False
    
    async def _read_remaining_logs(self, ssh_client: paramiko.SSHClient, log_file: str) -> List[str]:
        """读取剩余的日志"""
        try:
            read_cmd = f"cat {log_file} 2>/dev/null || echo ''"
            stdout_text, _ = await self._exec_ssh_command(ssh_client, read_cmd, timeout=10)
            return stdout_text.split('\n')
        except:
            return []
    
    async def _get_main_script(self, ssh_client: paramiko.SSHClient, script_dir: str) -> Optional[str]:
        """获取主脚本文件"""
        try:
            # 列出所有.py文件，返回第一个
            list_cmd = f"ls {script_dir}/*.py 2>/dev/null | head -1"
            stdout_text, stderr_text = await self._exec_ssh_command(ssh_client, list_cmd, timeout=10)
            script_file = stdout_text.strip()
            
            if script_file:
                # 提取文件名
                filename = os.path.basename(script_file)
                if filename:
                    return filename
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting main script: {str(e)}", exc_info=True)
            return None
    
    def _parse_log_level(self, line: str) -> str:
        """解析日志级别"""
        line_upper = line.upper()
        if "ERROR" in line_upper or "FAILED" in line_upper or "FAILURE" in line_upper:
            return "ERROR"
        elif "WARN" in line_upper or "WARNING" in line_upper:
            return "WARNING"
        elif "INFO" in line_upper:
            return "INFO"
        elif "DEBUG" in line_upper:
            return "DEBUG"
        else:
            return "INFO"
    
    async def stop_debug(self, debug_id: str) -> Dict:
        """停止调试"""
        if debug_id not in self.active_debug_sessions:
            return {"error": "Debug session not found"}
        
        session = self.active_debug_sessions[debug_id]
        ssh_client = session["ssh_client"]
        process_id = session.get("process_id")
        
        try:
            # 杀死进程及其子进程
            if process_id:
                # 首先检查进程是否还在运行
                is_running = await self._is_process_running(ssh_client, process_id)
                
                if is_running:
                    # 方法1: 尝试获取进程组ID并杀死整个进程组
                    try:
                        # 获取进程组ID (PGID)
                        pgid_cmd = f"ps -o pgid= -p {process_id} 2>/dev/null | tr -d ' ' || echo ''"
                        pgid_output, _ = await self._exec_ssh_command(ssh_client, pgid_cmd, timeout=5)
                        pgid = pgid_output.strip()
                        
                        if pgid and pgid.isdigit():
                            # 使用进程组ID杀死整个进程组（更可靠）
                            logger.info(f"Killing process group {pgid} for process {process_id}")
                            await self._exec_ssh_command(ssh_client, f"kill -TERM -{pgid} 2>/dev/null || true", timeout=5)
                            await asyncio.sleep(1)
                            
                            # 检查是否还在运行，如果是则强制杀死
                            if await self._is_process_running(ssh_client, process_id):
                                logger.warning(f"Process {process_id} still running, using SIGKILL")
                                await self._exec_ssh_command(ssh_client, f"kill -KILL -{pgid} 2>/dev/null || true", timeout=5)
                                await asyncio.sleep(0.5)
                    except Exception as pgid_error:
                        logger.warning(f"Failed to kill by process group: {str(pgid_error)}, trying alternative methods")
                    
                    # 方法2: 杀死所有子进程
                    try:
                        # 使用 pkill 杀死所有子进程
                        await self._exec_ssh_command(ssh_client, f"pkill -P {process_id} 2>/dev/null || true", timeout=5)
                        await asyncio.sleep(0.5)
                    except Exception as pkill_error:
                        logger.warning(f"Failed to kill child processes: {str(pkill_error)}")
                    
                    # 方法3: 直接杀死主进程
                    try:
                        # 先尝试 SIGTERM（优雅停止）
                        await self._exec_ssh_command(ssh_client, f"kill -TERM {process_id} 2>/dev/null || true", timeout=5)
                        await asyncio.sleep(1)
                        
                        # 如果还在运行，使用 SIGKILL（强制停止）
                        if await self._is_process_running(ssh_client, process_id):
                            logger.warning(f"Process {process_id} still running after SIGTERM, using SIGKILL")
                            await self._exec_ssh_command(ssh_client, f"kill -KILL {process_id} 2>/dev/null || true", timeout=5)
                            await asyncio.sleep(0.5)
                    except Exception as kill_error:
                        logger.warning(f"Failed to kill main process: {str(kill_error)}")
                    
                    # 方法4: 使用 killall 作为最后手段（针对 locust 进程）
                    try:
                        # 查找所有相关的 locust 进程并杀死
                        killall_cmd = f"ps aux | grep -E 'locust.*{process_id}|bash.*locust.*{process_id}' | grep -v grep | awk '{{print $2}}' | xargs -r kill -9 2>/dev/null || true"
                        await self._exec_ssh_command(ssh_client, killall_cmd, timeout=5)
                        await asyncio.sleep(0.5)
                    except Exception as killall_error:
                        logger.warning(f"Failed to killall: {str(killall_error)}")
                    
                    # 最终验证进程是否已停止
                    final_check = await self._is_process_running(ssh_client, process_id)
                    if final_check:
                        logger.error(f"Process {process_id} still running after all kill attempts")
                        # 即使进程还在运行，也继续清理会话，但记录警告
                    else:
                        logger.info(f"Successfully stopped process {process_id}")
                else:
                    logger.info(f"Process {process_id} was already stopped")
            
            # 清理会话
            del self.active_debug_sessions[debug_id]
            ssh_client.close()
            
            return {
                "status": "stopped",
                "debug_id": debug_id,
                "process_id": process_id
            }
        
        except Exception as e:
            logger.error(f"Error stopping debug: {str(e)}", exc_info=True)
            # 即使出错，也尝试清理会话
            try:
                if debug_id in self.active_debug_sessions:
                    session = self.active_debug_sessions[debug_id]
                    if "ssh_client" in session:
                        try:
                            session["ssh_client"].close()
                        except:
                            pass
                    del self.active_debug_sessions[debug_id]
            except:
                pass
            return {"error": str(e)}
    
    async def get_debug_status(self, debug_id: str) -> Dict:
        """获取调试状态"""
        if debug_id not in self.active_debug_sessions:
            return {"error": "Debug session not found"}
        
        session = self.active_debug_sessions[debug_id]
        ssh_client = session["ssh_client"]
        process_id = session.get("process_id")
        
        try:
            is_running = await self._is_process_running(ssh_client, process_id)
            
            return {
                "debug_id": debug_id,
                "status": "running" if is_running else "stopped",
                "process_id": process_id,
                "start_time": session["start_time"].isoformat() if session.get("start_time") else None
            }
        except Exception as e:
            return {"error": str(e)}

