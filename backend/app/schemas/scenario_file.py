"""
场景文件管理Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ScenarioFileBase(BaseModel):
    """场景文件基础模型"""
    file_name: str = Field(..., description="文件名", max_length=255)
    file_path: str = Field(..., description="MinIO文件路径", max_length=500)
    file_size: int = Field(..., description="文件大小(字节)")
    file_type: Optional[str] = Field(None, description="文件类型", max_length=50)
    content_type: Optional[str] = Field(None, description="MIME类型", max_length=100)


class ScenarioFileCreate(BaseModel):
    """创建场景文件模型"""
    file_name: str = Field(..., description="文件名", max_length=255)
    file_content: bytes = Field(..., description="文件内容")
    content_type: Optional[str] = Field("application/octet-stream", description="MIME类型", max_length=100)


class ScenarioFileUpdate(BaseModel):
    """更新场景文件模型"""
    file_name: Optional[str] = Field(None, description="文件名", max_length=255)
    file_content: Optional[bytes] = Field(None, description="文件内容")
    content_type: Optional[str] = Field(None, description="MIME类型", max_length=100)


class ScenarioFileResponse(ScenarioFileBase):
    """场景文件响应模型"""
    id: int = Field(..., description="文件ID")
    scenario_id: int = Field(..., description="场景ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class ScenarioFileWithContent(ScenarioFileResponse):
    """包含文件内容的场景文件响应模型"""
    file_content: str = Field(..., description="文件内容(字符串)")


class ScenarioFileUpload(BaseModel):
    """文件上传模型"""
    file_name: str = Field(..., description="文件名")
    file_content: str = Field(..., description="文件内容(字符串)")
    content_type: Optional[str] = Field("text/plain", description="MIME类型")

