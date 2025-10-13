"""
测试策略API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ....core.database import get_db
from ....models.test_management import TestStrategy
from ....schemas.test_management import (
    TestStrategyCreate, TestStrategyUpdate, TestStrategyResponse
)

router = APIRouter()


@router.get("/", response_model=List[TestStrategyResponse])
async def get_test_strategies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取测试策略列表"""
    strategies = db.query(TestStrategy).filter(
        TestStrategy.is_active == True
    ).offset(skip).limit(limit).all()
    return strategies


@router.get("/{strategy_id}", response_model=TestStrategyResponse)
async def get_test_strategy(
    strategy_id: int,
    db: Session = Depends(get_db)
):
    """获取单个测试策略"""
    strategy = db.query(TestStrategy).filter(
        TestStrategy.id == strategy_id,
        TestStrategy.is_active == True
    ).first()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test strategy not found"
        )
    
    return strategy


@router.post("/", response_model=TestStrategyResponse)
async def create_test_strategy(
    strategy: TestStrategyCreate,
    db: Session = Depends(get_db)
):
    """创建测试策略"""
    db_strategy = TestStrategy(**strategy.dict())
    db.add(db_strategy)
    db.commit()
    db.refresh(db_strategy)
    return db_strategy


@router.put("/{strategy_id}", response_model=TestStrategyResponse)
async def update_test_strategy(
    strategy_id: int,
    strategy_update: TestStrategyUpdate,
    db: Session = Depends(get_db)
):
    """更新测试策略"""
    strategy = db.query(TestStrategy).filter(
        TestStrategy.id == strategy_id,
        TestStrategy.is_active == True
    ).first()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test strategy not found"
        )
    
    update_data = strategy_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(strategy, field, value)
    
    db.commit()
    db.refresh(strategy)
    return strategy


@router.delete("/{strategy_id}")
async def delete_test_strategy(
    strategy_id: int,
    db: Session = Depends(get_db)
):
    """删除测试策略（软删除）"""
    strategy = db.query(TestStrategy).filter(
        TestStrategy.id == strategy_id,
        TestStrategy.is_active == True
    ).first()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test strategy not found"
        )
    
    strategy.is_active = False
    db.commit()
    
    return {"message": "Test strategy deleted successfully"}


