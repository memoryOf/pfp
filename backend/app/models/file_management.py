"""
文件管理数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from ..core.database import Base

class FileItem(Base):
    """文件项目模型"""
    __tablename__ = "file_items"
    
    id = Column(Integer, primary_key=True, index=True)
    original_name = Column(String(255), nullable=False, comment="原始文件名")
    stored_name = Column(String(255), nullable=False, comment="存储文件名")
    object_path = Column(String(500), nullable=False, comment="MinIO对象路径")
    file_size = Column(Integer, nullable=False, comment="文件大小（字节）")
    content_type = Column(String(100), comment="文件类型")
    description = Column(Text, comment="文件描述")
    tags = Column(JSON, comment="文件标签")
    upload_path = Column(String(500), default="/", comment="上传路径")
    
    # 元数据
    creator = Column(String(100), comment="创建者")
    updater = Column(String(100), comment="更新者")
    is_deleted = Column(Boolean, default=False, comment="是否已删除")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<FileItem(id={self.id}, original_name='{self.original_name}', object_path='{self.object_path}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'original_name': self.original_name,
            'stored_name': self.stored_name,
            'object_path': self.object_path,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'description': self.description,
            'tags': self.tags or [],
            'upload_path': self.upload_path,
            'creator': self.creator,
            'updater': self.updater,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }



