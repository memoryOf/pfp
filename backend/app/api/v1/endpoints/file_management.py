"""
文件管理API端点 - 支持MinIO存储
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....schemas.file_management import (
    FileItemResponse,
    FileUploadResponse,
    FileListResponse
)
from ....services.file_management_service import FileManagementService
from ....services.minio_service import minio_service
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form("/"),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    上传文件到MinIO
    
    Args:
        file: 上传的文件
        path: 文件存储路径
        description: 文件描述
        tags: 文件标签（逗号分隔）
        db: 数据库会话
    """
    try:
        # 生成唯一文件名
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        
        # 构建MinIO对象路径
        object_path = f"{path.strip('/')}/{unique_filename}" if path != "/" else unique_filename
        
        # 上传到MinIO
        file_content = await file.read()
        minio_service.upload_file(
            file_content=file_content,
            file_name=unique_filename,
            content_type=file.content_type,
            object_name=object_path
        )
        
        # 保存文件信息到数据库
        service = FileManagementService(db)
        file_item = await service.create_file_record(
            original_name=file.filename,
            stored_name=unique_filename,
            object_path=object_path,
            file_size=len(file_content),
            content_type=file.content_type,
            description=description,
            tags=tags.split(',') if tags else [],
            upload_path=path
        )
        
        return FileUploadResponse(
            success=True,
            message="File uploaded successfully",
            file_id=file_item.id,
            file_name=file_item.original_name,
            file_path=file_item.object_path,
            file_size=file_item.file_size
        )
        
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

@router.get("/files", response_model=FileListResponse)
async def get_files(
    path: str = Query("/", description="文件路径"),
    recursive: bool = Query(False, description="是否递归获取子目录文件"),
    db: Session = Depends(get_db)
):
    """
    获取指定路径下的文件列表
    
    Args:
        path: 文件路径
        recursive: 是否递归获取子目录文件
        db: 数据库会话
    """
    try:
        service = FileManagementService(db)
        
        if recursive:
            files = await service.get_files_by_path_recursive(path)
        else:
            files = await service.get_files_by_path(path)
        
        return FileListResponse(
            success=True,
            files=files,
            path=path,
            total=len(files)
        )
        
    except Exception as e:
        logger.error(f"Get files failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get files failed: {str(e)}"
        )

@router.get("/files/{file_id}", response_model=FileItemResponse)
async def get_file_info(
    file_id: int,
    db: Session = Depends(get_db)
):
    """
    获取文件详细信息
    
    Args:
        file_id: 文件ID
        db: 数据库会话
    """
    try:
        service = FileManagementService(db)
        file_item = await service.get_file_by_id(file_id)
        
        if not file_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return file_item
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get file info failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Get file info failed: {str(e)}"
        )

@router.get("/files/{file_id}/download")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """
    下载文件
    
    Args:
        file_id: 文件ID
        db: 数据库会话
    """
    try:
        service = FileManagementService(db)
        file_item = await service.get_file_by_id(file_id)
        
        if not file_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # 从MinIO获取文件
        file_data = minio_service.download_file(
            object_path=file_item.object_path
        )
        
        from fastapi.responses import StreamingResponse
        import io
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=file_item.content_type,
            headers={
                "Content-Disposition": f"attachment; filename={file_item.original_name}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download file failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download file failed: {str(e)}"
        )

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """
    删除文件
    
    Args:
        file_id: 文件ID
        db: 数据库会话
    """
    try:
        service = FileManagementService(db)
        file_item = await service.get_file_by_id(file_id)
        
        if not file_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # 从MinIO删除文件
        minio_service.delete_file(
            object_path=file_item.object_path
        )
        
        # 从数据库删除记录
        await service.delete_file(file_id)
        
        return {"success": True, "message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete file failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete file failed: {str(e)}"
        )

@router.put("/files/{file_id}")
async def update_file_info(
    file_id: int,
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    更新文件信息
    
    Args:
        file_id: 文件ID
        description: 文件描述
        tags: 文件标签（逗号分隔）
        db: 数据库会话
    """
    try:
        service = FileManagementService(db)
        
        update_data = {}
        if description is not None:
            update_data["description"] = description
        if tags is not None:
            update_data["tags"] = tags.split(',') if tags else []
        
        file_item = await service.update_file(file_id, update_data)
        
        if not file_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return {"success": True, "message": "File updated successfully", "file": file_item}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update file failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update file failed: {str(e)}"
        )
