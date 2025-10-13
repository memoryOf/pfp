"""
测试脚本管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.test_management import TestScript
from app.schemas.test_management import (
    TestScriptCreate, TestScriptUpdate, TestScriptResponse
)
from app.services.test_management_service import TestScriptService

router = APIRouter()


@router.get("/", response_model=List[TestScriptResponse])
async def get_test_scripts(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """获取测试脚本列表"""
    service = TestScriptService(db)
    return await service.get_test_scripts(skip=skip, limit=limit, is_active=is_active)


@router.get("/{script_id}", response_model=TestScriptResponse)
async def get_test_script(
    script_id: int,
    db: Session = Depends(get_db)
):
    """获取单个测试脚本详情"""
    service = TestScriptService(db)
    script = await service.get_test_script(script_id)
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试脚本不存在"
        )
    return script


@router.post("/", response_model=TestScriptResponse)
async def create_test_script(
    script: TestScriptCreate,
    db: Session = Depends(get_db)
):
    """创建测试脚本"""
    service = TestScriptService(db)
    return await service.create_test_script(script)


@router.put("/{script_id}", response_model=TestScriptResponse)
async def update_test_script(
    script_id: int,
    script: TestScriptUpdate,
    db: Session = Depends(get_db)
):
    """更新测试脚本"""
    service = TestScriptService(db)
    updated_script = await service.update_test_script(script_id, script)
    if not updated_script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试脚本不存在"
        )
    return updated_script


@router.delete("/{script_id}")
async def delete_test_script(
    script_id: int,
    db: Session = Depends(get_db)
):
    """删除测试脚本"""
    service = TestScriptService(db)
    success = await service.delete_test_script(script_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试脚本不存在"
        )
    return {"message": "测试脚本删除成功"}


@router.post("/generate")
async def generate_test_script(
    description: str,
    db: Session = Depends(get_db)
):
    """AI生成测试脚本"""
    # TODO: 实现AI脚本生成功能
    return {
        "message": "AI脚本生成功能暂未实现",
        "description": description
    }


@router.post("/{script_id}/optimize")
async def optimize_test_script(
    script_id: int,
    optimization_hints: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """AI优化测试脚本"""
    # TODO: 实现AI脚本优化功能
    return {
        "message": "AI脚本优化功能暂未实现",
        "script_id": script_id,
        "optimization_hints": optimization_hints
    }

