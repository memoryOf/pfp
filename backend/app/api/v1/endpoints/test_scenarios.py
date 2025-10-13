"""
测试场景API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ....core.database import get_db
from ....models.test_management import TestScenario, TestTask
from ....schemas.test_management import (
    TestScenarioCreate, TestScenarioUpdate, TestScenarioResponse
)

router = APIRouter()


@router.get("/task/{task_id}", response_model=List[TestScenarioResponse])
async def get_test_scenarios_by_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """根据任务ID获取测试场景列表"""
    # 验证任务是否存在
    task = db.query(TestTask).filter(
        TestTask.id == task_id,
        TestTask.is_active == True
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    scenarios = db.query(TestScenario).filter(
        TestScenario.task_id == task_id
    ).order_by(TestScenario.order).all()
    
    return scenarios


@router.get("/{scenario_id}/", response_model=TestScenarioResponse)
async def get_test_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """获取单个测试场景"""
    scenario = db.query(TestScenario).filter(
        TestScenario.id == scenario_id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test scenario not found"
        )
    
    return scenario


@router.post("/", response_model=TestScenarioResponse)
async def create_test_scenario(
    scenario: TestScenarioCreate,
    db: Session = Depends(get_db)
):
    """创建测试场景"""
    # 验证任务是否存在
    task = db.query(TestTask).filter(
        TestTask.id == scenario.task_id,
        TestTask.is_active == True
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    db_scenario = TestScenario(**scenario.dict())
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario


@router.put("/{scenario_id}/", response_model=TestScenarioResponse)
async def update_test_scenario(
    scenario_id: int,
    scenario_update: TestScenarioUpdate,
    db: Session = Depends(get_db)
):
    """更新测试场景"""
    scenario = db.query(TestScenario).filter(
        TestScenario.id == scenario_id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test scenario not found"
        )
    
    update_data = scenario_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(scenario, field, value)
    
    db.commit()
    db.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}/")
async def delete_test_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """删除测试场景"""
    scenario = db.query(TestScenario).filter(
        TestScenario.id == scenario_id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test scenario not found"
        )
    
    db.delete(scenario)
    db.commit()
    
    return {"message": "Test scenario deleted successfully"}


