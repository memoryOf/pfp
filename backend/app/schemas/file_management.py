"""
文件管理Pydantic模式
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class FileItemBase(BaseModel):
    """文件项目基础模式"""
    original_name: str = Field(..., description="原始文件名")
    description: Optional[str] = Field(None, description="文件描述")
    tags: Optional[List[str]] = Field(default_factory=list, description="文件标签")

class FileItemCreate(FileItemBase):
    """创建文件项目模式"""
    stored_name: str = Field(..., description="存储文件名")
    object_path: str = Field(..., description="MinIO对象路径")
    file_size: int = Field(..., description="文件大小（字节）")
    content_type: Optional[str] = Field(None, description="文件类型")
    upload_path: str = Field(default="/", description="上传路径")
    creator: Optional[str] = Field(None, description="创建者")

class FileItemUpdate(BaseModel):
    """更新文件项目模式"""
    description: Optional[str] = Field(None, description="文件描述")
    tags: Optional[List[str]] = Field(None, description="文件标签")
    updater: Optional[str] = Field(None, description="更新者")

class FileItemResponse(FileItemBase):
    """文件项目响应模式"""
    id: int = Field(..., description="文件ID")
    stored_name: str = Field(..., description="存储文件名")
    object_path: str = Field(..., description="MinIO对象路径")
    file_size: int = Field(..., description="文件大小（字节）")
    content_type: Optional[str] = Field(None, description="文件类型")
    upload_path: str = Field(..., description="上传路径")
    creator: Optional[str] = Field(None, description="创建者")
    updater: Optional[str] = Field(None, description="更新者")
    is_deleted: bool = Field(False, description="是否已删除")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    # 计算属性
    @property
    def file_size_mb(self) -> str:
        """文件大小（MB）"""
        return f"{(self.file_size / 1024 / 1024):.2f}MB"
    
    @property
    def file_type(self) -> str:
        """文件类型（从文件名提取）"""
        if '.' in self.original_name:
            return self.original_name.split('.')[-1].upper()
        return 'UNKNOWN'

    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    """文件上传响应模式"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    file_id: Optional[int] = Field(None, description="文件ID")
    file_name: Optional[str] = Field(None, description="文件名")
    file_path: Optional[str] = Field(None, description="文件路径")
    file_size: Optional[int] = Field(None, description="文件大小")

class FileListResponse(BaseModel):
    """文件列表响应模式"""
    success: bool = Field(..., description="是否成功")
    files: List[FileItemResponse] = Field(..., description="文件列表")
    path: str = Field(..., description="当前路径")
    total: int = Field(..., description="文件总数")

class FileDownloadResponse(BaseModel):
    """文件下载响应模式"""
    success: bool = Field(..., description="是否成功")
    download_url: Optional[str] = Field(None, description="下载URL")
    expires_at: Optional[datetime] = Field(None, description="URL过期时间")










