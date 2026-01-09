"""
场景管理数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Scenario(Base):
    """场景模型"""
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="场景名称")
    description = Column(Text, comment="场景描述")
    scenario_type = Column(String(20), nullable=False, comment="场景类型: locust/jmeter/gatling/karate")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 状态
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 关联的文件
    files = relationship("ScenarioFileRecord", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioFileRecord(Base):
    """场景文件模型"""
    __tablename__ = "scenario_files_new"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False, comment="场景ID")
    file_name = Column(String(255), nullable=False, comment="文件名")
    file_path = Column(String(500), nullable=False, comment="MinIO文件路径")
    file_size = Column(Integer, nullable=False, comment="文件大小(字节)")
    file_type = Column(String(50), comment="文件类型")
    content_type = Column(String(100), comment="MIME类型")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关联的场景
    scenario = relationship("Scenario", back_populates="files")
