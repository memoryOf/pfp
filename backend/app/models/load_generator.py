"""
压测机数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, JSON
from sqlalchemy.sql import func
from ..core.database import Base


class LoadGenerator(Base):
    """压测机模型"""
    __tablename__ = "load_generators"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="压测机名称")
    host = Column(String(255), nullable=False, comment="主机地址")
    port = Column(Integer, default=22, comment="SSH端口")
    username = Column(String(100), nullable=False, comment="用户名")
    password = Column(String(255), comment="密码")
    ssh_key_path = Column(String(500), comment="SSH密钥路径")
    
    # 硬件配置
    cpu_cores = Column(Integer, nullable=False, comment="CPU核心数")
    memory_gb = Column(Float, nullable=False, comment="内存大小(GB)")
    network_bandwidth = Column(String(50), comment="网络带宽")
    disk_space = Column(String(50), comment="磁盘空间")
    
    # 状态信息
    status = Column(String(20), default="offline", comment="状态: online/offline/maintenance")
    last_heartbeat = Column(DateTime, comment="最后心跳时间")
    
    # 资源使用情况
    cpu_usage = Column(Float, default=0.0, comment="CPU使用率")
    memory_usage = Column(Float, default=0.0, comment="内存使用率")
    network_usage = Column(Float, default=0.0, comment="网络使用率")
    
    # 配置信息
    locust_version = Column(String(20), comment="Locust版本")
    python_version = Column(String(20), comment="Python版本")
    system_info = Column(JSON, comment="系统信息")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    description = Column(Text, comment="备注说明")
    is_active = Column(Boolean, default=True, comment="是否启用")


class LoadGeneratorConfig(Base):
    """压测机配置模型"""
    __tablename__ = "load_generator_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    load_generator_id = Column(Integer, nullable=False, comment="压测机ID")
    config_name = Column(String(100), nullable=False, comment="配置名称")
    
    # Master配置
    master_enabled = Column(Boolean, default=True, comment="是否启用Master")
    master_cpu_cores = Column(Integer, default=1, comment="Master CPU核心数")
    master_memory_gb = Column(Float, default=2.0, comment="Master 内存(GB)")
    master_network_mbps = Column(Integer, default=100, comment="Master 网络带宽(Mbps)")
    
    # Worker配置
    worker_count = Column(Integer, default=1, comment="Worker数量")
    worker_cpu_cores = Column(Integer, default=1, comment="每个Worker CPU核心数")
    worker_memory_gb = Column(Float, default=2.0, comment="每个Worker 内存(GB)")
    worker_network_mbps = Column(Integer, default=100, comment="每个Worker 网络带宽(Mbps)")
    
    # 系统预留
    system_cpu_cores = Column(Integer, default=1, comment="系统预留CPU核心数")
    system_memory_gb = Column(Float, default=1.0, comment="系统预留内存(GB)")
    system_network_mbps = Column(Integer, default=50, comment="系统预留网络带宽(Mbps)")
    
    # 配置验证
    is_valid = Column(Boolean, default=True, comment="配置是否有效")
    validation_message = Column(Text, comment="验证消息")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    description = Column(Text, comment="配置说明")
    is_active = Column(Boolean, default=True, comment="是否启用")
