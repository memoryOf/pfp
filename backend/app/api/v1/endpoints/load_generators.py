"""
压测机管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.load_generator import LoadGenerator, LoadGeneratorConfig
from app.schemas.load_generator import (
    LoadGeneratorCreate, LoadGeneratorUpdate, LoadGeneratorResponse,
    LoadGeneratorConfigCreate, LoadGeneratorConfigUpdate, LoadGeneratorConfigResponse
)
from app.services.load_generator_service import LoadGeneratorService

router = APIRouter()


@router.get("/", response_model=List[LoadGeneratorResponse])
async def get_load_generators(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取压测机列表"""
    service = LoadGeneratorService(db)
    return await service.get_load_generators(skip=skip, limit=limit, status=status)


@router.get("/{load_generator_id}/", response_model=LoadGeneratorResponse)
async def get_load_generator(
    load_generator_id: int,
    db: Session = Depends(get_db)
):
    """获取单个压测机详情"""
    service = LoadGeneratorService(db)
    load_generator = await service.get_load_generator(load_generator_id)
    if not load_generator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="压测机不存在"
        )
    return load_generator


@router.post("/", response_model=LoadGeneratorResponse)
async def create_load_generator(
    load_generator: LoadGeneratorCreate,
    db: Session = Depends(get_db)
):
    """创建压测机"""
    service = LoadGeneratorService(db)
    return await service.create_load_generator(load_generator)


@router.put("/{load_generator_id}/", response_model=LoadGeneratorResponse)
async def update_load_generator(
    load_generator_id: int,
    load_generator_update: LoadGeneratorUpdate,
    db: Session = Depends(get_db)
):
    """更新压测机"""
    service = LoadGeneratorService(db)
    load_generator = await service.update_load_generator(load_generator_id, load_generator_update)
    if not load_generator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="压测机不存在"
        )
    return load_generator


@router.delete("/{load_generator_id}/")
async def delete_load_generator(
    load_generator_id: int,
    db: Session = Depends(get_db)
):
    """删除压测机"""
    service = LoadGeneratorService(db)
    success = await service.delete_load_generator(load_generator_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="压测机不存在"
        )
    return {"message": "压测机删除成功"}


@router.post("/{load_generator_id}/test-connection/")
async def test_connection(
    load_generator_id: int,
    db: Session = Depends(get_db)
):
    """测试压测机连接"""
    service = LoadGeneratorService(db)
    result = await service.test_connection(load_generator_id)
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    return result


@router.get("/{load_generator_id}/configs/", response_model=List[LoadGeneratorConfigResponse])
async def get_load_generator_configs(
    load_generator_id: int,
    db: Session = Depends(get_db)
):
    """获取压测机配置列表"""
    service = LoadGeneratorService(db)
    return await service.get_configs(load_generator_id)


@router.post("/{load_generator_id}/configs/", response_model=LoadGeneratorConfigResponse)
async def create_load_generator_config(
    load_generator_id: int,
    config: LoadGeneratorConfigCreate,
    db: Session = Depends(get_db)
):
    """创建压测机配置"""
    service = LoadGeneratorService(db)
    return await service.create_config(load_generator_id, config)


@router.put("/configs/{config_id}/", response_model=LoadGeneratorConfigResponse)
async def update_load_generator_config(
    config_id: int,
    config_update: LoadGeneratorConfigUpdate,
    db: Session = Depends(get_db)
):
    """更新压测机配置"""
    service = LoadGeneratorService(db)
    config = await service.update_config(config_id, config_update)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在"
        )
    return config


@router.delete("/configs/{config_id}/")
async def delete_load_generator_config(
    config_id: int,
    db: Session = Depends(get_db)
):
    """删除压测机配置"""
    service = LoadGeneratorService(db)
    success = await service.delete_config(config_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在"
        )
    return {"message": "配置删除成功"}


@router.post("/configs/{config_id}/validate/")
async def validate_config(
    config_id: int,
    db: Session = Depends(get_db)
):
    """验证压测机配置"""
    service = LoadGeneratorService(db)
    result = await service.validate_config(config_id)
    return result
