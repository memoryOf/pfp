"""
场景文件管理API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....schemas.scenario_file import (
    ScenarioFileResponse, 
    ScenarioFileCreate, 
    ScenarioFileUpdate,
    ScenarioFileWithContent,
    ScenarioFileUpload,
    ScenarioFileUpdateUpload
)
from ....services.scenario_file_service import ScenarioFileService
from ....services.karate_service import KarateService
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class KarateRunRequest(BaseModel):
    """Karate运行请求"""
    file_content: str
    file_name: Optional[str] = None

router = APIRouter()


@router.get("/scenarios/{scenario_id}/files", response_model=List[ScenarioFileResponse])
async def get_scenario_files(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """获取场景的所有文件"""
    service = ScenarioFileService(db)
    files = await service.get_scenario_files(scenario_id)
    return files


@router.get("/scenarios/{scenario_id}/files/{file_id}", response_model=ScenarioFileWithContent)
async def get_scenario_file(
    scenario_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """获取场景文件及其内容"""
    service = ScenarioFileService(db)
    
    # 验证文件是否属于该场景
    file_record = await service.get_scenario_file(file_id)
    if not file_record or file_record.scenario_id != scenario_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="File not found"
        )
    
    # 获取文件内容
    file_content = await service.get_file_content(file_id)
    if file_content is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file content"
        )
    
    # 构建响应
    file_data = ScenarioFileWithContent(
        id=file_record.id,
        scenario_id=file_record.scenario_id,
        file_name=file_record.file_name,
        file_path=file_record.file_path,
        file_size=file_record.file_size,
        file_type=file_record.file_type,
        content_type=file_record.content_type,
        created_at=file_record.created_at,
        updated_at=file_record.updated_at,
        file_content=file_content.decode('utf-8', errors='ignore')
    )
    
    return file_data


@router.post("/scenarios/{scenario_id}/files", response_model=ScenarioFileResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario_file(
    scenario_id: int,
    file_data: ScenarioFileUpload,
    db: Session = Depends(get_db)
):
    """创建场景文件"""
    try:
        service = ScenarioFileService(db)
        
        # 转换文件内容为bytes
        file_content_bytes = file_data.file_content.encode('utf-8')
        
        # 创建文件数据
        create_data = ScenarioFileCreate(
            file_name=file_data.file_name,
            file_content=file_content_bytes,
            content_type=file_data.content_type
        )
        
        file_record = await service.create_scenario_file(scenario_id, create_data)
        return file_record
        
    except Exception as e:
        logger.error(f"Failed to create scenario file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/scenarios/{scenario_id}/files/{file_id}", response_model=ScenarioFileResponse)
async def update_scenario_file(
    scenario_id: int,
    file_id: int,
    file_data: ScenarioFileUpdateUpload,
    db: Session = Depends(get_db)
):
    """更新场景文件"""
    try:
        service = ScenarioFileService(db)
        
        # 验证文件是否属于该场景
        file_record = await service.get_scenario_file(file_id)
        if not file_record or file_record.scenario_id != scenario_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="File not found"
            )
        
        # 转换文件内容为bytes
        file_content_bytes = file_data.file_content.encode('utf-8')
        
        # 创建更新数据（如果 file_name 未提供，使用现有文件名）
        update_data = ScenarioFileUpdate(
            file_name=file_data.file_name if file_data.file_name else file_record.file_name,
            file_content=file_content_bytes,
            content_type=file_data.content_type if file_data.content_type else file_record.content_type
        )
        
        updated_file = await service.update_scenario_file(file_id, update_data)
        if not updated_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return updated_file
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update scenario file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/scenarios/{scenario_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario_file(
    scenario_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """删除场景文件"""
    try:
        service = ScenarioFileService(db)
        
        # 验证文件是否属于该场景
        file_record = await service.get_scenario_file(file_id)
        if not file_record or file_record.scenario_id != scenario_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="File not found"
            )
        
        success = await service.delete_scenario_file(file_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file"
            )
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete scenario file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/scenarios/{scenario_id}/files/{file_id}/download")
async def download_scenario_file(
    scenario_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """获取文件下载URL"""
    try:
        service = ScenarioFileService(db)
        
        # 验证文件是否属于该场景
        file_record = await service.get_scenario_file(file_id)
        if not file_record or file_record.scenario_id != scenario_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="File not found"
            )
        
        # 获取下载URL
        download_url = await service.get_file_url(file_id)
        if not download_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download URL"
            )
        
        return {"download_url": download_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get download URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/scenarios/{scenario_id}/files/{file_id}/run")
async def run_karate_file(
    scenario_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """运行Karate测试文件"""
    try:
        service = ScenarioFileService(db)
        karate_service = KarateService()
        
        # 验证文件是否属于该场景
        file_record = await service.get_scenario_file(file_id)
        if not file_record or file_record.scenario_id != scenario_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="File not found"
            )
        
        # 检查文件类型
        if file_record.file_type != "feature":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only .feature files can be run"
            )
        
        # 获取文件内容
        file_content_bytes = await service.get_file_content(file_id)
        if file_content_bytes is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve file content"
            )
        
        file_content = file_content_bytes.decode('utf-8', errors='ignore')
        
        # 运行Karate测试
        result = await karate_service.run_karate_test(
            feature_content=file_content,
            feature_name=file_record.file_name
        )
        
        return {
            "success": result["success"],
            "output": result["output"],
            "error": result["error"],
            "exit_code": result["exit_code"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to run Karate test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/scenarios/{scenario_id}/files/run-content")
async def run_karate_content(
    scenario_id: int,
    request: KarateRunRequest,
    db: Session = Depends(get_db)
):
    """直接运行Karate测试内容（不需要保存文件）"""
    try:
        karate_service = KarateService()
        
        # 运行Karate测试
        result = await karate_service.run_karate_test(
            feature_content=request.file_content,
            feature_name=request.file_name or "test.feature"
        )
        
        return {
            "success": result["success"],
            "output": result["output"],
            "error": result["error"],
            "exit_code": result["exit_code"]
        }
        
    except Exception as e:
        logger.error(f"Failed to run Karate test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )