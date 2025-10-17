"""
场景文件管理API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....models.test_management import ScenarioFile, TestScenario
from ....services.file_storage_service import FileStorageService
from ....schemas.test_management import ScenarioFileResponse, ScenarioFileCreate

router = APIRouter()


@router.get("/scenario/{scenario_id}/files/", response_model=List[ScenarioFileResponse])
async def get_scenario_files(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """获取场景的所有文件"""
    # 验证场景是否存在
    scenario = db.query(TestScenario).filter(TestScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test scenario not found"
        )
    
    file_service = FileStorageService(db)
    files = file_service.get_scenario_files(scenario_id)
    return files


@router.post("/scenario/{scenario_id}/files/", response_model=ScenarioFileResponse)
async def upload_scenario_file(
    scenario_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """上传文件到场景"""
    # 验证场景是否存在
    scenario = db.query(TestScenario).filter(TestScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test scenario not found"
        )
    
    # 验证文件类型和大小
    from ....core.config import settings
    file_extension = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_extension} not allowed"
        )
    
    if file.size and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
        )
    
    try:
        file_service = FileStorageService(db)
        scenario_file = file_service.save_file(scenario_id, file, description)
        return scenario_file
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )


@router.get("/files/{file_id}/", response_model=ScenarioFileResponse)
async def get_file_info(
    file_id: int,
    db: Session = Depends(get_db)
):
    """获取文件信息"""
    file_service = FileStorageService(db)
    scenario_file = file_service.get_file(file_id)
    if not scenario_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    return scenario_file


@router.get("/files/{file_id}/content/")
async def get_file_content(
    file_id: int,
    db: Session = Depends(get_db)
):
    """获取文件内容"""
    file_service = FileStorageService(db)
    scenario_file = file_service.get_file(file_id)
    if not scenario_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    content = file_service.get_file_content(file_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read file content"
        )
    
    return {
        "file_id": file_id,
        "file_name": scenario_file.file_name,
        "content": content
    }


@router.put("/files/{file_id}/content/")
async def update_file_content(
    file_id: int,
    content: str,
    db: Session = Depends(get_db)
):
    """更新文件内容"""
    file_service = FileStorageService(db)
    success = file_service.update_file_content(file_id, content)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or update failed"
        )
    
    return {"message": "File content updated successfully"}


@router.delete("/files/{file_id}/")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """删除文件"""
    file_service = FileStorageService(db)
    success = file_service.delete_file(file_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or delete failed"
        )
    
    return {"message": "File deleted successfully"}




