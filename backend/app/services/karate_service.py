"""
Karate测试运行服务 - 仅支持Docker运行
"""
import subprocess
import tempfile
import os
import logging
import shutil
from typing import Dict

logger = logging.getLogger(__name__)

# Karate版本和Docker镜像配置（可以从环境变量配置）
# 注意：1.4.1正式版不存在，使用1.4.1.RC4或更新版本
KARATE_VERSION = os.getenv("KARATE_VERSION", "1.4.1.RC4")
# Karate官方Docker镜像名称（可能需要使用不同的镜像）
KARATE_DOCKER_IMAGE = os.getenv("KARATE_DOCKER_IMAGE", "intuit/karate")


class KarateService:
    """Karate测试运行服务 - 仅支持Docker运行"""
    
    def __init__(self):
        pass
    
    async def run_karate_test(self, feature_content: str, feature_name: str = "test.feature") -> Dict:
        """
        运行Karate测试 - 仅支持Docker运行
        
        Args:
            feature_content: Feature文件内容
            feature_name: Feature文件名
            
        Returns:
            {
                "success": bool,
                "output": str,
                "error": str,
                "exit_code": int
            }
        """
        try:
            # 检查Docker是否可用
            docker_available, docker_error = self._check_docker_available()
            if not docker_available:
                return {
                    "success": False,
                    "output": "",
                    "error": self._get_docker_required_message(docker_error),
                    "exit_code": -1
                }
            
            # 创建临时目录
            # 注意：在macOS上，Docker Desktop使用虚拟机，需要确保目录在Docker可以访问的位置
            # 使用/tmp目录，这是Docker通常可以访问的
            import time
            temp_dir = f"/tmp/karate_test_{int(time.time() * 1000000)}"
            os.makedirs(temp_dir, exist_ok=True)
            try:
                # 确保feature_name不为空且有.feature扩展名
                if not feature_name or feature_name.strip() == "":
                    feature_name = "test.feature"
                elif not feature_name.endswith('.feature'):
                    feature_name = f"{feature_name}.feature"
                
                # 清理feature_name，移除路径分隔符（只保留文件名）
                feature_name = os.path.basename(feature_name)
                
                # 验证feature_content不为空
                if not feature_content or feature_content.strip() == "":
                    return {
                        "success": False,
                        "output": "",
                        "error": "Feature file content is empty. Please provide valid Karate feature file content.",
                        "exit_code": -1
                    }
                
                # 创建feature文件
                feature_path = os.path.join(temp_dir, feature_name)
                with open(feature_path, 'w', encoding='utf-8') as f:
                    f.write(feature_content)
                    # 确保文件被写入磁盘
                    f.flush()
                    os.fsync(f.fileno())
                
                logger.info(f"Created feature file: {feature_path}, size: {len(feature_content)} bytes, name: {feature_name}")
                logger.info(f"Feature content preview (first 300 chars): {feature_content[:300]}")
                
                # 验证文件确实存在
                if not os.path.exists(feature_path):
                    return {
                        "success": False,
                        "output": "",
                        "error": f"Feature file was not created: {feature_path}",
                        "exit_code": -1
                    }
                
                # 列出临时目录中的所有文件
                temp_files = os.listdir(temp_dir)
                logger.info(f"Files in temp directory before Docker run: {temp_files}")
                
                # 使用Docker运行Karate测试
                result = await self._run_with_docker(feature_path, temp_dir)
                return result
            finally:
                # 清理临时目录
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to run Karate test: {e}")
            return {
                "success": False,
                "output": "",
                "error": f"执行失败: {str(e)}\n\n{self._get_docker_required_message()}",
                "exit_code": -1
            }
    
    def _check_docker_available(self) -> tuple[bool, str]:
        """检查Docker是否可用"""
        # 1. 检查docker命令是否存在
        if not shutil.which("docker"):
            return False, "docker命令未找到"
        
        # 2. 检查Docker socket是否可访问（尝试多个可能的路径）
        docker_socket_paths = [
            "/var/run/docker.sock",
            os.path.expanduser("~/.docker/run/docker.sock"),
        ]
        
        docker_socket = None
        for socket_path in docker_socket_paths:
            if os.path.exists(socket_path):
                docker_socket = socket_path
                break
        
        if not docker_socket:
            return False, f"Docker socket未找到。尝试的路径: {', '.join(docker_socket_paths)}"
        
        # 3. 检查socket权限
        try:
            socket_stat = os.stat(docker_socket)
            socket_mode = oct(socket_stat.st_mode)[-3:]
            logger.info(f"Docker socket found at {docker_socket}, permissions: {socket_mode}")
        except Exception as e:
            logger.warning(f"Failed to check socket permissions: {e}")
        
        # 4. 设置DOCKER_HOST环境变量（如果需要）
        env = os.environ.copy()
        if docker_socket != "/var/run/docker.sock":
            env["DOCKER_HOST"] = f"unix://{docker_socket}"
        
        # 5. 尝试运行docker命令验证（使用更详细的错误信息）
        try:
            # 先尝试简单的docker ps命令（比docker info更轻量）
            result = subprocess.run(
                ["docker", "ps"],
                capture_output=True,
                text=True,
                timeout=10,
                env=env
            )
            if result.returncode != 0:
                error_msg = result.stderr.strip() or result.stdout.strip()
                # 检查是否是权限问题
                if "permission denied" in error_msg.lower() or "access denied" in error_msg.lower() or "operation not permitted" in error_msg.lower():
                    return False, f"Docker权限不足: {error_msg}\n提示: 在macOS上，可能需要:\n1. 确保Docker Desktop正在运行\n2. 检查Docker socket权限\n3. 尝试重启Docker Desktop"
                # 检查是否是连接问题
                if "cannot connect" in error_msg.lower() or "connection refused" in error_msg.lower():
                    return False, f"无法连接到Docker daemon: {error_msg}\n提示: 请确保Docker Desktop正在运行"
                return False, f"Docker不可用: {error_msg}"
            
            # 再尝试docker version获取版本信息
            version_result = subprocess.run(
                ["docker", "version", "--format", "{{.Server.Version}}"],
                capture_output=True,
                text=True,
                timeout=5,
                env=env
            )
            if version_result.returncode == 0:
                docker_version = version_result.stdout.strip()
                logger.info(f"Docker version: {docker_version}")
            
            return True, ""
        except subprocess.TimeoutExpired:
            return False, "Docker命令执行超时（10秒）"
        except FileNotFoundError:
            return False, "docker命令未找到"
        except Exception as e:
            return False, f"Docker检查失败: {str(e)}"
    
    
    async def _run_with_docker(self, feature_path: str, temp_dir: str) -> Dict:
        """使用Docker运行Karate"""
        try:
            # 设置环境变量，确保Docker命令可以访问socket
            # 尝试找到正确的Docker socket路径
            env = os.environ.copy()
            docker_socket_paths = [
                "/var/run/docker.sock",
                os.path.expanduser("~/.docker/run/docker.sock"),
            ]
            for socket_path in docker_socket_paths:
                if os.path.exists(socket_path):
                    env["DOCKER_HOST"] = f"unix://{socket_path}"
                    break
            else:
                # 如果都没找到，使用默认路径
                env["DOCKER_HOST"] = "unix:///var/run/docker.sock"
            
            # 使用karate-docker官方镜像
            # 需要将feature文件挂载到容器中
            feature_name = os.path.basename(feature_path)
            
            # 验证feature文件是否存在
            if not os.path.exists(feature_path):
                return {
                    "success": False,
                    "output": "",
                    "error": f"Feature file not found: {feature_path}",
                    "exit_code": -1
                }
            
            # 验证feature_name不为空
            if not feature_name or feature_name.strip() == "":
                return {
                    "success": False,
                    "output": "",
                    "error": f"Feature file name is empty. feature_path: {feature_path}",
                    "exit_code": -1
                }
            
            logger.info(f"Running Karate test with feature file: {feature_name} (full path: {feature_path})")
            
            # 读取feature文件内容用于调试
            with open(feature_path, 'r', encoding='utf-8') as f:
                content = f.read()
                logger.info(f"Feature file content length: {len(content)} bytes")
                logger.info(f"Feature file content preview (first 200 chars): {content[:200]}")
            
            # 构建Docker命令
            # 使用自定义构建的Karate镜像
            # 注意：在Docker容器内运行Docker（Docker-in-Docker），需要确保：
            # 1. Docker socket已挂载
            # 2. 容器有权限访问socket（通常需要root用户或docker组）
            # 3. 使用相同的网络，以便Karate容器可以访问外部服务
            karate_image = f"pfp-karate:{KARATE_VERSION}"
            
            # 检查镜像是否存在，如果不存在则构建
            check_image_result = subprocess.run(
                ["docker", "images", "-q", karate_image],
                capture_output=True,
                text=True,
                timeout=5,
                env=env
            )
            
            if not check_image_result.stdout.strip():
                # 镜像不存在，尝试构建
                logger.info(f"Karate image {karate_image} not found, attempting to build...")
                # 构建上下文路径：从backend/app/services/karate_service.py -> 项目根目录/docker/karate
                # 获取项目根目录（假设backend目录在项目根目录下）
                current_file_dir = os.path.dirname(os.path.abspath(__file__))
                # backend/app/services -> backend -> 项目根目录
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file_dir)))
                project_root = os.path.dirname(backend_dir)
                build_context = os.path.join(project_root, "docker", "karate")
                
                # 检查构建上下文是否存在
                if os.path.exists(build_context):
                    build_cmd = [
                        "docker", "build",
                        "-t", karate_image,
                        "--build-arg", f"KARATE_VERSION={KARATE_VERSION}",
                        build_context
                    ]
                    
                    build_result = subprocess.run(
                        build_cmd,
                        capture_output=True,
                        text=True,
                        timeout=300,  # 5分钟超时
                        env=env
                    )
                    
                    if build_result.returncode != 0:
                        return {
                            "success": False,
                            "output": "",
                            "error": f"""无法构建Karate Docker镜像。

构建错误: {build_result.stderr}

解决方案:
  1. 手动构建镜像:
     cd docker/karate
     docker build -t pfp-karate:{KARATE_VERSION} --build-arg KARATE_VERSION={KARATE_VERSION} .
  
  2. 或者使用docker-compose构建:
     docker-compose build karate-builder
  
  3. 确保网络连接正常，可以访问Maven Central
""",
                            "exit_code": -1
                        }
                    logger.info(f"Successfully built Karate image: {karate_image}")
                else:
                    return {
                        "success": False,
                        "output": "",
                        "error": f"""Karate镜像不存在且无法构建。

镜像名称: {karate_image}
构建上下文不存在: {build_context}

解决方案:
  1. 确保docker/karate/Dockerfile存在
  2. 手动构建镜像:
     docker build -t {karate_image} -f docker/karate/Dockerfile --build-arg KARATE_VERSION={KARATE_VERSION} .
""",
                        "exit_code": -1
                    }
            
            # 检查网络是否存在，如果不存在则使用bridge网络
            # 对于Karate测试，通常不需要特定的网络，使用bridge即可
            network_name = "bridge"  # 默认使用bridge网络
            
            # 尝试使用pfp-network（如果存在）
            check_network_result = subprocess.run(
                ["docker", "network", "ls", "-q", "-f", "name=^pfp-network$"],
                capture_output=True,
                text=True,
                timeout=5,
                env=env
            )
            
            if check_network_result.stdout.strip():
                network_name = "pfp-network"
                logger.info(f"Using existing network: {network_name}")
            else:
                logger.info(f"Network pfp-network not found, using default bridge network")
            
            # 确保feature_name是相对于工作目录的路径（在容器内就是/karate目录）
            # 由于工作目录是/karate，feature文件也在/karate目录下，所以使用相对路径
            # 使用相对路径（相对于工作目录/karate）
            
            # 验证feature文件在临时目录中是否存在
            if not os.path.exists(feature_path):
                return {
                    "success": False,
                    "output": "",
                    "error": f"Feature file not found at path: {feature_path}",
                    "exit_code": -1
                }
            
            # 列出临时目录中的所有文件用于调试
            temp_files = os.listdir(temp_dir)
            logger.info(f"Files in temp directory: {temp_files}")
            
            # 读取feature文件内容的前200个字符用于调试
            with open(feature_path, 'r', encoding='utf-8') as f:
                preview = f.read(200)
                logger.info(f"Feature file preview (first 200 chars): {preview}")
            
            # 读取feature文件内容
            with open(feature_path, 'r', encoding='utf-8') as f:
                feature_content_raw = f.read()
            
            # 使用base64编码传递文件内容，避免shell转义特殊字符（如?会被编码为%3F）
            import base64
            feature_content_encoded = base64.b64encode(feature_content_raw.encode('utf-8')).decode('ascii')
            
            # 在macOS上，Docker Desktop可能无法访问某些临时目录
            # 使用base64编码的环境变量传递文件内容，然后在容器内解码并创建文件
            # 这样可以避免文件挂载的问题，同时避免shell转义特殊字符
            # 添加host.docker.internal支持，以便容器可以访问主机服务
            cmd = [
                "docker", "run", "--rm",
                "--network", network_name,  # 使用Docker网络
                "--add-host", "host.docker.internal:host-gateway",  # 允许容器访问主机服务
                "-e", f"KARATE_FEATURE_NAME={feature_name}",
                "-e", f"KARATE_FEATURE_CONTENT_B64={feature_content_encoded}",
                "-w", "/karate",
                karate_image,
                feature_name  # 文件名，文件会在容器启动脚本中创建
            ]
            
            logger.info(f"Running Karate test with Docker: {' '.join(cmd[:10])}... (feature content passed via base64 encoded env var)")
            logger.info(f"Feature file name: {feature_name}, temp_dir: {temp_dir}, feature_path: {feature_path}")
            logger.info(f"Feature content length: {len(feature_content_raw)} bytes, encoded length: {len(feature_content_encoded)} bytes")
            
            # 设置环境变量以启用详细日志输出
            # Karate使用Logback，可以通过系统属性控制日志级别
            docker_env = env.copy()
            
            # 验证文件在主机上存在（容器挂载后应该也能访问）
            # 由于ENTRYPOINT直接执行Karate，我们无法使用ls命令验证
            # 但我们可以信任文件存在，因为我们已经验证了feature_path存在
            if not os.path.exists(feature_path):
                return {
                    "success": False,
                    "output": "",
                    "error": f"Feature file not found on host: {feature_path}",
                    "exit_code": -1
                }
            
            # 验证文件大小不为0
            file_size = os.path.getsize(feature_path)
            if file_size == 0:
                return {
                    "success": False,
                    "output": "",
                    "error": f"Feature file is empty: {feature_path}",
                    "exit_code": -1
                }
            
            logger.info(f"Feature file verified: {feature_path}, size: {file_size} bytes")
            logger.info(f"Final Docker command: {' '.join(cmd)}")
            logger.info(f"Feature file will be accessed as: /karate/{feature_name} in container")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5分钟超时
                env=docker_env
            )
            
            # 记录执行结果
            logger.info(f"Karate execution completed. Exit code: {result.returncode}")
            logger.info(f"Stdout length: {len(result.stdout) if result.stdout else 0}")
            logger.info(f"Stderr length: {len(result.stderr) if result.stderr else 0}")
            
            # 合并stdout和stderr，确保所有日志都被捕获
            # Karate的输出可能在stdout或stderr中
            combined_output = ""
            if result.stdout:
                combined_output += result.stdout
            if result.stderr:
                if combined_output:
                    combined_output += "\n--- stderr ---\n"
                combined_output += result.stderr
            
            # 记录原始输出用于调试
            logger.info(f"Karate execution completed with exit code: {result.returncode}")
            logger.info(f"Stdout length: {len(result.stdout) if result.stdout else 0} chars")
            logger.info(f"Stderr length: {len(result.stderr) if result.stderr else 0} chars")
            if combined_output:
                logger.info(f"Combined output preview (first 500 chars): {combined_output[:500]}")
            
            # 如果失败，提供更详细的错误信息
            if result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr.strip() else result.stdout.strip()
                # 检查是否是镜像拉取问题
                if "pull access denied" in error_msg.lower() or "repository does not exist" in error_msg.lower():
                    error_msg += f"\n\n提示: 可能需要先手动拉取镜像: docker pull intuit/karate:{KARATE_VERSION}"
                # 检查是否是权限问题
                elif "permission denied" in error_msg.lower():
                    error_msg += "\n\n提示: Docker权限不足，请检查Docker socket权限"
                
                return {
                    "success": False,
                    "output": combined_output if combined_output else result.stdout,
                    "error": error_msg if error_msg else "执行失败，但没有错误信息",
                    "exit_code": result.returncode
                }
            
            # 成功时返回合并的输出
            return {
                "success": True,
                "output": combined_output if combined_output else result.stdout or result.stderr or "执行完成，但没有输出",
                "error": "",  # 成功时error为空
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "",
                "error": "Karate测试执行超时（5分钟）",
                "exit_code": -1
            }
        except FileNotFoundError:
            return {
                "success": False,
                "output": "",
                "error": self._get_docker_required_message("docker命令未找到"),
                "exit_code": -1
            }
        except Exception as e:
            logger.error(f"Failed to run with Docker: {e}", exc_info=True)
            return {
                "success": False,
                "output": "",
                "error": f"Docker运行失败: {str(e)}\n\n{self._get_docker_required_message(str(e))}",
                "exit_code": -1
            }
    
    def _get_docker_required_message(self, error_detail: str = "") -> str:
        """获取Docker必需的提示信息"""
        docker_cmd_available = shutil.which('docker') is not None
        docker_socket_exists = os.path.exists("/var/run/docker.sock")
        is_docker_container = os.path.exists('/.dockerenv') or os.path.exists('/proc/1/cgroup')
        
        message = f"""Karate测试仅支持通过Docker运行。

要求:
  - Docker必须已安装并运行
  - Docker版本: 20.10或更高
  - 如果后端运行在Docker容器中，需要挂载Docker socket

当前状态:
  - Docker命令可用: {docker_cmd_available}
  - Docker socket存在: {docker_socket_exists}
  - 运行在Docker容器中: {is_docker_container}
  - Karate版本: {KARATE_VERSION}
"""
        
        if error_detail:
            message += f"\n错误详情: {error_detail}\n"
        
        if is_docker_container:
            message += """
⚠️  检测到后端运行在Docker容器中

macOS Docker Desktop特殊说明:
  - macOS上的Docker socket路径: /var/run/docker.sock -> ~/.docker/run/docker.sock
  - 确保Docker Desktop正在运行
  - 容器需要以root用户运行以访问Docker socket

解决方案:
  1. 确保Docker Desktop正在运行:
     - 打开Docker Desktop应用
     - 等待Docker完全启动（状态栏显示"Running"）
  
  2. 确保docker-compose.yml中已挂载Docker socket:
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock
     user: "0:0"  # 使用root用户
  
  3. 重新启动容器:
     docker-compose down
     docker-compose up -d backend
  
  4. 验证Docker访问:
     docker-compose exec backend docker ps
     
  5. 如果仍然失败，尝试重启Docker Desktop:
     - 完全退出Docker Desktop
     - 重新启动Docker Desktop
     - 等待完全启动后重试
"""
        else:
            message += """
安装Docker:
  - macOS: https://docs.docker.com/desktop/install/mac-install/
  - Linux: https://docs.docker.com/engine/install/
  - Windows: https://docs.docker.com/desktop/install/windows-install/

验证Docker安装:
  $ docker --version
  $ docker ps
"""
        
        message += f"""
Karate将通过以下Docker镜像运行:
  - pfp-karate:{KARATE_VERSION} (自定义构建的镜像)

首次运行时会自动构建Docker镜像，可能需要一些时间。
如果构建失败，可以手动构建:
  cd docker/karate
  docker build -t pfp-karate:{KARATE_VERSION} --build-arg KARATE_VERSION={KARATE_VERSION} .
"""
        
        return message
