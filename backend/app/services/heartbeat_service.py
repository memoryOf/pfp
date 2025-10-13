"""
心跳检测服务
"""
import asyncio
import socket
import paramiko
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..core.database import get_db
from ..models.load_generator import LoadGenerator
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class HeartbeatService:
    """心跳检测服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def check_all_load_generators(self) -> Dict[str, Any]:
        """检查所有活跃压测机的心跳"""
        try:
            # 获取所有活跃的压测机（包括online和offline状态）
            active_load_generators = self.db.query(LoadGenerator).filter(
                LoadGenerator.is_active == True
            ).all()
            
            results = {
                "total_checked": len(active_load_generators),
                "successful": 0,
                "failed": 0,
                "details": []
            }
            
            for load_generator in active_load_generators:
                try:
                    # 检查心跳
                    is_alive = await self._check_single_heartbeat(load_generator)
                    
                    if is_alive:
                        # 更新状态为在线
                        load_generator.status = "online"
                        load_generator.updated_at = datetime.utcnow()
                        results["successful"] += 1
                        results["details"].append({
                            "id": load_generator.id,
                            "name": load_generator.name,
                            "status": "online",
                            "message": "Heartbeat successful"
                        })
                    else:
                        # 更新状态为离线
                        load_generator.status = "offline"
                        load_generator.updated_at = datetime.utcnow()
                        results["failed"] += 1
                        results["details"].append({
                            "id": load_generator.id,
                            "name": load_generator.name,
                            "status": "offline",
                            "message": "Heartbeat failed - connection lost"
                        })
                        
                except Exception as e:
                    # 更新状态为离线
                    load_generator.status = "offline"
                    load_generator.updated_at = datetime.utcnow()
                    results["failed"] += 1
                    results["details"].append({
                        "id": load_generator.id,
                        "name": load_generator.name,
                        "status": "offline",
                        "message": f"Heartbeat error: {str(e)}"
                    })
                    logger.error(f"Heartbeat check failed for {load_generator.name}: {str(e)}")
            
            # 提交所有更改
            self.db.commit()
            
            return results
            
        except Exception as e:
            logger.error(f"Heartbeat service error: {str(e)}")
            self.db.rollback()
            return {
                "total_checked": 0,
                "successful": 0,
                "failed": 0,
                "error": str(e),
                "details": []
            }
    
    async def _check_single_heartbeat(self, load_generator: LoadGenerator) -> bool:
        """检查单个压测机的心跳"""
        try:
            # 首先检查网络连通性
            if not await self._check_network_connectivity(load_generator.host, load_generator.port):
                return False
            
            # 尝试SSH连接
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            connect_kwargs = {
                "hostname": load_generator.host,
                "port": load_generator.port,
                "username": load_generator.username,
                "timeout": 5  # 较短的超时时间用于心跳检测
            }
            
            if load_generator.ssh_key_path:
                connect_kwargs["key_filename"] = load_generator.ssh_key_path
            elif load_generator.password:
                connect_kwargs["password"] = load_generator.password
            else:
                return False
            
            # 建立连接
            ssh.connect(**connect_kwargs)
            
            # 执行简单的心跳命令
            stdin, stdout, stderr = ssh.exec_command("echo 'heartbeat'")
            result = stdout.read().decode().strip()
            
            if result == "heartbeat":
                # 收集资源使用情况
                await self._collect_resource_usage(ssh, load_generator)
                
                # 更新最后心跳时间
                load_generator.last_heartbeat = datetime.utcnow()
            
            ssh.close()
            
            return result == "heartbeat"
            
        except Exception as e:
            logger.warning(f"Heartbeat check failed for {load_generator.name}: {str(e)}")
            return False
    
    async def _check_network_connectivity(self, host: str, port: int) -> bool:
        """检查网络连通性"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)  # 3秒超时
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except Exception:
            return False
    
    async def _collect_resource_usage(self, ssh: paramiko.SSHClient, load_generator: LoadGenerator):
        """收集资源使用情况"""
        try:
            # 收集CPU使用率 - 方法1：使用top命令
            stdin, stdout, stderr = ssh.exec_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'")
            cpu_usage_str = stdout.read().decode().strip()
            stderr_output = stderr.read().decode().strip()
            
            if cpu_usage_str and cpu_usage_str.replace('.', '').isdigit():
                load_generator.cpu_usage = float(cpu_usage_str)
                logger.info(f"CPU usage collected for {load_generator.name}: {cpu_usage_str}%")
            else:
                # 备用方法1：使用vmstat
                stdin, stdout, stderr = ssh.exec_command("vmstat 1 2 | tail -1 | awk '{print 100-$15}'")
                cpu_usage_str = stdout.read().decode().strip()
                if cpu_usage_str and cpu_usage_str.replace('.', '').isdigit():
                    load_generator.cpu_usage = float(cpu_usage_str)
                    logger.info(f"CPU usage collected via vmstat for {load_generator.name}: {cpu_usage_str}%")
                else:
                    # 备用方法2：使用sar命令
                    stdin, stdout, stderr = ssh.exec_command("sar 1 1 | tail -1 | awk '{print 100-$8}'")
                    cpu_usage_str = stdout.read().decode().strip()
                    if cpu_usage_str and cpu_usage_str.replace('.', '').isdigit():
                        load_generator.cpu_usage = float(cpu_usage_str)
                        logger.info(f"CPU usage collected via sar for {load_generator.name}: {cpu_usage_str}%")
                    else:
                        # 备用方法3：使用iostat
                        stdin, stdout, stderr = ssh.exec_command("iostat -c 1 1 | tail -1 | awk '{print 100-$6}'")
                        cpu_usage_str = stdout.read().decode().strip()
                        if cpu_usage_str and cpu_usage_str.replace('.', '').isdigit():
                            load_generator.cpu_usage = float(cpu_usage_str)
                            logger.info(f"CPU usage collected via iostat for {load_generator.name}: {cpu_usage_str}%")
                        else:
                            load_generator.cpu_usage = 0.0
                            logger.warning(f"Failed to collect CPU usage for {load_generator.name}, all methods failed")
            
            # 收集内存使用率
            stdin, stdout, stderr = ssh.exec_command("free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'")
            memory_usage_str = stdout.read().decode().strip()
            if memory_usage_str and memory_usage_str.replace('.', '').isdigit():
                load_generator.memory_usage = float(memory_usage_str)
                logger.info(f"Memory usage collected for {load_generator.name}: {memory_usage_str}%")
            else:
                load_generator.memory_usage = 0.0
                logger.warning(f"Failed to collect memory usage for {load_generator.name}")
            
            # 收集网络使用率（简化版本，基于网络接口统计）
            stdin, stdout, stderr = ssh.exec_command("cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2,$10}'")
            network_stats = stdout.read().decode().strip()
            if network_stats:
                # 这里简化处理，实际应该计算网络带宽使用率
                # 暂时设置为一个模拟值，实际项目中需要更复杂的计算
                load_generator.network_usage = 0.0
            else:
                load_generator.network_usage = 0.0
                
        except Exception as e:
            logger.warning(f"Failed to collect resource usage for {load_generator.name}: {str(e)}")
            # 设置默认值
            load_generator.cpu_usage = 0.0
            load_generator.memory_usage = 0.0
            load_generator.network_usage = 0.0
    
    async def get_stale_load_generators(self, stale_minutes: int = 10) -> List[LoadGenerator]:
        """获取长时间没有心跳的压测机"""
        stale_time = datetime.utcnow() - timedelta(minutes=stale_minutes)
        
        return self.db.query(LoadGenerator).filter(
            and_(
                LoadGenerator.status == "online",
                LoadGenerator.is_active == True,
                LoadGenerator.last_heartbeat < stale_time
            )
        ).all()
    
    async def mark_stale_as_offline(self, stale_minutes: int = 10) -> int:
        """将长时间没有心跳的压测机标记为离线"""
        try:
            stale_load_generators = await self.get_stale_load_generators(stale_minutes)
            
            for load_generator in stale_load_generators:
                load_generator.status = "offline"
                load_generator.updated_at = datetime.utcnow()
            
            self.db.commit()
            return len(stale_load_generators)
            
        except Exception as e:
            logger.error(f"Error marking stale load generators as offline: {str(e)}")
            self.db.rollback()
            return 0


# 全局心跳检测函数，供Celery任务使用
async def heartbeat_check_task():
    """心跳检测任务"""
    db = next(get_db())
    try:
        service = HeartbeatService(db)
        result = await service.check_all_load_generators()
        
        # 同时检查长时间没有心跳的压测机
        stale_count = await service.mark_stale_as_offline()
        
        logger.info(f"Heartbeat check completed: {result['successful']} online, {result['failed']} offline, {stale_count} stale marked offline")
        
        return {
            "heartbeat_result": result,
            "stale_marked_offline": stale_count
        }
        
    except Exception as e:
        logger.error(f"Heartbeat check task failed: {str(e)}")
        return {"error": str(e)}
    finally:
        db.close()

