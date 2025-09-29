"""
压测机Pydantic模式
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class LoadGeneratorBase(BaseModel):
    """压测机基础模式"""
    name: str = Field(..., description="压测机名称")
    host: str = Field(..., description="主机地址")
    port: int = Field(22, description="SSH端口")
    username: str = Field(..., description="用户名")
    password: Optional[str] = Field(None, description="密码")
    ssh_key_path: Optional[str] = Field(None, description="SSH密钥路径")
    
    # 硬件配置
    cpu_cores: int = Field(..., description="CPU核心数")
    memory_gb: float = Field(..., description="内存大小(GB)")
    network_bandwidth: Optional[str] = Field(None, description="网络带宽")
    disk_space: Optional[str] = Field(None, description="磁盘空间")
    
    # 备注
    description: Optional[str] = Field(None, description="备注说明")


class LoadGeneratorCreate(LoadGeneratorBase):
    """创建压测机模式"""
    pass


class LoadGeneratorUpdate(BaseModel):
    """更新压测机模式"""
    name: Optional[str] = Field(None, description="压测机名称")
    host: Optional[str] = Field(None, description="主机地址")
    port: Optional[int] = Field(None, description="SSH端口")
    username: Optional[str] = Field(None, description="用户名")
    password: Optional[str] = Field(None, description="密码")
    ssh_key_path: Optional[str] = Field(None, description="SSH密钥路径")
    
    # 硬件配置
    cpu_cores: Optional[int] = Field(None, description="CPU核心数")
    memory_gb: Optional[float] = Field(None, description="内存大小(GB)")
    network_bandwidth: Optional[str] = Field(None, description="网络带宽")
    disk_space: Optional[str] = Field(None, description="磁盘空间")
    
    # 备注
    description: Optional[str] = Field(None, description="备注说明")
    is_active: Optional[bool] = Field(None, description="是否启用")


class LoadGeneratorResponse(LoadGeneratorBase):
    """压测机响应模式"""
    id: int
    status: str = Field(..., description="状态")
    last_heartbeat: Optional[datetime] = Field(None, description="最后心跳时间")
    
    # 资源使用情况
    cpu_usage: float = Field(0.0, description="CPU使用率")
    memory_usage: float = Field(0.0, description="内存使用率")
    network_usage: float = Field(0.0, description="网络使用率")
    
    # 配置信息
    locust_version: Optional[str] = Field(None, description="Locust版本")
    python_version: Optional[str] = Field(None, description="Python版本")
    system_info: Optional[Dict[str, Any]] = Field(None, description="系统信息")
    
    # 时间戳
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class LoadGeneratorConfigBase(BaseModel):
    """压测机配置基础模式"""
    config_name: str = Field(..., description="配置名称")
    
    # Master配置
    master_enabled: bool = Field(True, description="是否启用Master")
    master_cpu_cores: int = Field(1, description="Master CPU核心数")
    master_memory_gb: float = Field(2.0, description="Master 内存(GB)")
    master_network_mbps: int = Field(100, description="Master 网络带宽(Mbps)")
    
    # Worker配置
    worker_count: int = Field(1, description="Worker数量")
    worker_cpu_cores: int = Field(1, description="每个Worker CPU核心数")
    worker_memory_gb: float = Field(2.0, description="每个Worker 内存(GB)")
    worker_network_mbps: int = Field(100, description="每个Worker 网络带宽(Mbps)")
    
    # 系统预留
    system_cpu_cores: int = Field(1, description="系统预留CPU核心数")
    system_memory_gb: float = Field(1.0, description="系统预留内存(GB)")
    system_network_mbps: int = Field(50, description="系统预留网络带宽(Mbps)")
    
    # 备注
    description: Optional[str] = Field(None, description="配置说明")


class LoadGeneratorConfigCreate(LoadGeneratorConfigBase):
    """创建压测机配置模式"""
    pass


class LoadGeneratorConfigUpdate(BaseModel):
    """更新压测机配置模式"""
    config_name: Optional[str] = Field(None, description="配置名称")
    
    # Master配置
    master_enabled: Optional[bool] = Field(None, description="是否启用Master")
    master_cpu_cores: Optional[int] = Field(None, description="Master CPU核心数")
    master_memory_gb: Optional[float] = Field(None, description="Master 内存(GB)")
    master_network_mbps: Optional[int] = Field(None, description="Master 网络带宽(Mbps)")
    
    # Worker配置
    worker_count: Optional[int] = Field(None, description="Worker数量")
    worker_cpu_cores: Optional[int] = Field(None, description="每个Worker CPU核心数")
    worker_memory_gb: Optional[float] = Field(None, description="每个Worker 内存(GB)")
    worker_network_mbps: Optional[int] = Field(None, description="每个Worker 网络带宽(Mbps)")
    
    # 系统预留
    system_cpu_cores: Optional[int] = Field(None, description="系统预留CPU核心数")
    system_memory_gb: Optional[float] = Field(None, description="系统预留内存(GB)")
    system_network_mbps: Optional[int] = Field(None, description="系统预留网络带宽(Mbps)")
    
    # 备注
    description: Optional[str] = Field(None, description="配置说明")
    is_active: Optional[bool] = Field(None, description="是否启用")


class LoadGeneratorConfigResponse(LoadGeneratorConfigBase):
    """压测机配置响应模式"""
    id: int
    load_generator_id: int
    is_valid: bool = Field(..., description="配置是否有效")
    validation_message: Optional[str] = Field(None, description="验证消息")
    
    # 时间戳
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class LoadGeneratorStatus(BaseModel):
    """压测机状态模式"""
    id: int
    name: str
    status: str
    cpu_usage: float
    memory_usage: float
    network_usage: float
    last_heartbeat: Optional[datetime]
    is_active: bool


class LoadGeneratorResourceUsage(BaseModel):
    """压测机资源使用情况模式"""
    id: int
    name: str
    cpu_usage: float
    memory_usage: float
    network_usage: float
    timestamp: datetime
