"""
场景管理API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....models.scenario import Scenario
from ....schemas.scenario import (
    ScenarioCreate, ScenarioUpdate, ScenarioResponse
)
from ....services.scenario_service import ScenarioService

router = APIRouter()


@router.get("/", response_model=List[ScenarioResponse])
async def get_scenarios(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """获取场景列表"""
    service = ScenarioService(db)
    scenarios = await service.get_scenarios(skip=skip, limit=limit, is_active=is_active)
    return scenarios


@router.get("/{scenario_id}/", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """获取单个场景"""
    service = ScenarioService(db)
    scenario = await service.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    return scenario


@router.post("/", response_model=ScenarioResponse)
async def create_scenario(
    scenario_data: ScenarioCreate,
    db: Session = Depends(get_db)
):
    """创建场景"""
    service = ScenarioService(db)
    scenario = await service.create_scenario(scenario_data)
    return scenario


@router.put("/{scenario_id}/", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    scenario_data: ScenarioUpdate,
    db: Session = Depends(get_db)
):
    """更新场景"""
    service = ScenarioService(db)
    scenario = await service.update_scenario(scenario_id, scenario_data)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    return scenario


@router.delete("/{scenario_id}/")
async def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """删除场景"""
    service = ScenarioService(db)
    success = await service.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    return {"message": "Scenario deleted successfully"}
