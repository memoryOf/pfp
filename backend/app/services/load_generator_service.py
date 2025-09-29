"""
压测机服务层
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import paramiko
import json
import asyncio
from ..models.load_generator import LoadGenerator, LoadGeneratorConfig
from ..schemas.load_generator import (
    LoadGeneratorCreate, LoadGeneratorUpdate, LoadGeneratorConfigCreate, LoadGeneratorConfigUpdate
)


class LoadGeneratorService:
    """压测机服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_load_generators(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[str] = None
    ) -> List[LoadGenerator]:
        """获取压测机列表"""
        query = self.db.query(LoadGenerator).filter(LoadGenerator.is_active == True)
        
        if status:
            query = query.filter(LoadGenerator.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    async def get_load_generator(self, load_generator_id: int) -> Optional[LoadGenerator]:
        """获取单个压测机"""
        return self.db.query(LoadGenerator).filter(
            and_(
                LoadGenerator.id == load_generator_id,
                LoadGenerator.is_active == True
            )
        ).first()
    
    async def create_load_generator(self, load_generator_data: LoadGeneratorCreate) -> LoadGenerator:
        """创建压测机"""
        load_generator = LoadGenerator(**load_generator_data.dict())
        self.db.add(load_generator)
        self.db.commit()
        self.db.refresh(load_generator)
        return load_generator
    
    async def update_load_generator(
        self, 
        load_generator_id: int, 
        load_generator_data: LoadGeneratorUpdate
    ) -> Optional[LoadGenerator]:
        """更新压测机"""
        load_generator = await self.get_load_generator(load_generator_id)
        if not load_generator:
            return None
        
        update_data = load_generator_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(load_generator, field, value)
        
        load_generator.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(load_generator)
        return load_generator
    
    async def delete_load_generator(self, load_generator_id: int) -> bool:
        """删除压测机（软删除）"""
        load_generator = await self.get_load_generator(load_generator_id)
        if not load_generator:
            return False
        
        load_generator.is_active = False
        load_generator.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    async def test_connection(self, load_generator_id: int) -> Dict[str, Any]:
        """测试压测机连接"""
        load_generator = await self.get_load_generator(load_generator_id)
        if not load_generator:
            return {"success": False, "message": "压测机不存在"}
        
        try:
            # 创建SSH连接
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # 连接参数
            connect_kwargs = {
                "hostname": load_generator.host,
                "port": load_generator.port,
                "username": load_generator.username,
                "timeout": 10
            }
            
            if load_generator.ssh_key_path:
                connect_kwargs["key_filename"] = load_generator.ssh_key_path
            elif load_generator.password:
                connect_kwargs["password"] = load_generator.password
            else:
                return {"success": False, "message": "未配置认证信息"}
            
            # 建立连接
            ssh.connect(**connect_kwargs)
            
            # 测试基本命令
            stdin, stdout, stderr = ssh.exec_command("python3 --version")
            python_version = stdout.read().decode().strip()
            
            stdin, stdout, stderr = ssh.exec_command("locust --version")
            locust_version = stdout.read().decode().strip()
            
            # 获取系统信息
            stdin, stdout, stderr = ssh.exec_command("cat /proc/cpuinfo | grep processor | wc -l")
            cpu_cores = int(stdout.read().decode().strip())
            
            stdin, stdout, stderr = ssh.exec_command("free -m | grep Mem | awk '{print $2}'")
            memory_mb = int(stdout.read().decode().strip())
            
            ssh.close()
            
            # 更新压测机信息
            load_generator.status = "online"
            load_generator.last_heartbeat = datetime.utcnow()
            load_generator.python_version = python_version
            load_generator.locust_version = locust_version
            load_generator.cpu_cores = cpu_cores
            load_generator.memory_gb = memory_mb / 1024
            load_generator.system_info = {
                "python_version": python_version,
                "locust_version": locust_version,
                "cpu_cores": cpu_cores,
                "memory_gb": memory_mb / 1024
            }
            
            self.db.commit()
            
            return {
                "success": True,
                "message": "连接成功",
                "system_info": load_generator.system_info
            }
            
        except Exception as e:
            # 更新状态为离线
            load_generator.status = "offline"
            self.db.commit()
            
            return {"success": False, "message": f"连接失败: {str(e)}"}
    
    async def get_configs(self, load_generator_id: int) -> List[LoadGeneratorConfig]:
        """获取压测机配置列表"""
        return self.db.query(LoadGeneratorConfig).filter(
            and_(
                LoadGeneratorConfig.load_generator_id == load_generator_id,
                LoadGeneratorConfig.is_active == True
            )
        ).all()
    
    async def create_config(
        self, 
        load_generator_id: int, 
        config_data: LoadGeneratorConfigCreate
    ) -> LoadGeneratorConfig:
        """创建压测机配置"""
        config = LoadGeneratorConfig(
            load_generator_id=load_generator_id,
            **config_data.dict()
        )
        
        # 验证配置
        validation_result = await self._validate_config(config)
        config.is_valid = validation_result["is_valid"]
        config.validation_message = validation_result["message"]
        
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config
    
    async def update_config(
        self, 
        config_id: int, 
        config_data: LoadGeneratorConfigUpdate
    ) -> Optional[LoadGeneratorConfig]:
        """更新压测机配置"""
        config = self.db.query(LoadGeneratorConfig).filter(
            and_(
                LoadGeneratorConfig.id == config_id,
                LoadGeneratorConfig.is_active == True
            )
        ).first()
        
        if not config:
            return None
        
        update_data = config_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)
        
        # 重新验证配置
        validation_result = await self._validate_config(config)
        config.is_valid = validation_result["is_valid"]
        config.validation_message = validation_result["message"]
        
        config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(config)
        return config
    
    async def delete_config(self, config_id: int) -> bool:
        """删除压测机配置（软删除）"""
        config = self.db.query(LoadGeneratorConfig).filter(
            and_(
                LoadGeneratorConfig.id == config_id,
                LoadGeneratorConfig.is_active == True
            )
        ).first()
        
        if not config:
            return False
        
        config.is_active = False
        config.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    async def validate_config(self, config_id: int) -> Dict[str, Any]:
        """验证压测机配置"""
        config = self.db.query(LoadGeneratorConfig).filter(
            and_(
                LoadGeneratorConfig.id == config_id,
                LoadGeneratorConfig.is_active == True
            )
        ).first()
        
        if not config:
            return {"is_valid": False, "message": "配置不存在"}
        
        validation_result = await self._validate_config(config)
        
        # 更新验证结果
        config.is_valid = validation_result["is_valid"]
        config.validation_message = validation_result["message"]
        self.db.commit()
        
        return validation_result
    
    async def _validate_config(self, config: LoadGeneratorConfig) -> Dict[str, Any]:
        """内部配置验证方法"""
        # 获取压测机信息
        load_generator = await self.get_load_generator(config.load_generator_id)
        if not load_generator:
            return {"is_valid": False, "message": "压测机不存在"}
        
        # 计算总资源需求
        total_cpu_cores = config.system_cpu_cores
        total_memory_gb = config.system_memory_gb
        total_network_mbps = config.system_network_mbps
        
        if config.master_enabled:
            total_cpu_cores += config.master_cpu_cores
            total_memory_gb += config.master_memory_gb
            total_network_mbps += config.master_network_mbps
        
        total_cpu_cores += config.worker_count * config.worker_cpu_cores
        total_memory_gb += config.worker_count * config.worker_memory_gb
        total_network_mbps += config.worker_count * config.worker_network_mbps
        
        # 验证资源约束
        if total_cpu_cores > load_generator.cpu_cores:
            return {
                "is_valid": False, 
                "message": f"CPU核心数超出限制: 需要{total_cpu_cores}核，可用{load_generator.cpu_cores}核"
            }
        
        if total_memory_gb > load_generator.memory_gb:
            return {
                "is_valid": False, 
                "message": f"内存超出限制: 需要{total_memory_gb}GB，可用{load_generator.memory_gb}GB"
            }
        
        # 验证配置约束
        if config.worker_count < 1:
            return {"is_valid": False, "message": "Worker数量必须大于0"}
        
        if config.master_cpu_cores < 1 or config.worker_cpu_cores < 1:
            return {"is_valid": False, "message": "CPU核心数必须大于0"}
        
        if config.master_memory_gb < 1 or config.worker_memory_gb < 1:
            return {"is_valid": False, "message": "内存必须大于1GB"}
        
        return {
            "is_valid": True, 
            "message": "配置验证通过",
            "resource_usage": {
                "cpu_cores": total_cpu_cores,
                "memory_gb": total_memory_gb,
                "network_mbps": total_network_mbps
            }
        }
