"""
测试执行API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ....core.database import get_db
from ....models.test_management import TestExecution, TestTask, TestStrategy
from ....models.load_generator import LoadGenerator, LoadGeneratorConfig
from ....services.test_execution_service import TestExecutionService
from ....schemas.test_management import (
    TestExecutionCreate, TestExecutionUpdate, TestExecutionResponse,
    TestExecutionWithDetailsResponse, TestExecutionStartRequest, TestExecutionStopRequest
)

router = APIRouter()


@router.get("/", response_model=List[TestExecutionResponse])
async def get_test_executions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    task_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取测试执行列表"""
    query = db.query(TestExecution)
    
    if status:
        query = query.filter(TestExecution.status == status)
    
    if task_id:
        query = query.filter(TestExecution.task_id == task_id)
    
    executions = query.order_by(TestExecution.created_at.desc()).offset(skip).limit(limit).all()
    return executions


@router.get("/{execution_id}", response_model=TestExecutionWithDetailsResponse)
async def get_test_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """获取单个测试执行详情"""
    execution = db.query(TestExecution).filter(
        TestExecution.id == execution_id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test execution not found"
        )
    
    # 获取关联的详细信息
    task = db.query(TestTask).filter(TestTask.id == execution.task_id).first()
    strategy = db.query(TestStrategy).filter(TestStrategy.id == execution.strategy_id).first()
    load_generator = db.query(LoadGenerator).filter(LoadGenerator.id == execution.load_generator_id).first()
    load_generator_config = db.query(LoadGeneratorConfig).filter(LoadGeneratorConfig.id == execution.load_generator_config_id).first()
    
    # 构建响应
    execution_dict = {
        "id": execution.id,
        "task_id": execution.task_id,
        "strategy_id": execution.strategy_id,
        "load_generator_id": execution.load_generator_id,
        "load_generator_config_id": execution.load_generator_config_id,
        "execution_name": execution.execution_name,
        "status": execution.status,
        "total_requests": execution.total_requests,
        "total_failures": execution.total_failures,
        "avg_response_time": execution.avg_response_time,
        "max_response_time": execution.max_response_time,
        "min_response_time": execution.min_response_time,
        "requests_per_second": execution.requests_per_second,
        "error_message": execution.error_message,
        "error_rate": execution.error_rate,
        "created_at": execution.created_at,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "duration": execution.duration,
        "task": task,
        "strategy": strategy,
        "load_generator": {
            "id": load_generator.id,
            "name": load_generator.name,
            "host": load_generator.host,
            "status": load_generator.status
        } if load_generator else None,
        "load_generator_config": {
            "id": load_generator_config.id,
            "config_name": load_generator_config.config_name,
            "master_cpu_cores": load_generator_config.master_cpu_cores,
            "master_memory_gb": load_generator_config.master_memory_gb,
            "worker_count": load_generator_config.worker_count
        } if load_generator_config else None
    }
    
    return execution_dict


@router.post("/", response_model=TestExecutionResponse)
async def create_test_execution(
    execution: TestExecutionCreate,
    db: Session = Depends(get_db)
):
    """创建测试执行"""
    # 验证关联的资源是否存在
    task = db.query(TestTask).filter(
        TestTask.id == execution.task_id,
        TestTask.is_active == True
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    strategy = db.query(TestStrategy).filter(
        TestStrategy.id == execution.strategy_id,
        TestStrategy.is_active == True
    ).first()
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test strategy not found"
        )
    
    load_generator = db.query(LoadGenerator).filter(
        LoadGenerator.id == execution.load_generator_id,
        LoadGenerator.is_active == True
    ).first()
    if not load_generator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load generator not found"
        )
    
    load_generator_config = db.query(LoadGeneratorConfig).filter(
        LoadGeneratorConfig.id == execution.load_generator_config_id,
        LoadGeneratorConfig.is_active == True
    ).first()
    if not load_generator_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load generator config not found"
        )
    
    db_execution = TestExecution(**execution.dict())
    db.add(db_execution)
    db.commit()
    db.refresh(db_execution)
    return db_execution


@router.put("/{execution_id}", response_model=TestExecutionResponse)
async def update_test_execution(
    execution_id: int,
    execution_update: TestExecutionUpdate,
    db: Session = Depends(get_db)
):
    """更新测试执行"""
    execution = db.query(TestExecution).filter(
        TestExecution.id == execution_id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test execution not found"
        )
    
    update_data = execution_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(execution, field, value)
    
    db.commit()
    db.refresh(execution)
    return execution


@router.post("/{execution_id}/start")
async def start_test_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """启动测试执行"""
    execution_service = TestExecutionService(db)
    result = await execution_service.start_execution(execution_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result


@router.post("/{execution_id}/stop")
async def stop_test_execution(
    execution_id: int,
    request: TestExecutionStopRequest,
    db: Session = Depends(get_db)
):
    """停止测试执行"""
    execution_service = TestExecutionService(db)
    result = await execution_service.stop_execution(execution_id, request.reason or "手动停止")
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result


@router.delete("/{execution_id}")
async def delete_test_execution(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """删除测试执行"""
    execution = db.query(TestExecution).filter(
        TestExecution.id == execution_id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test execution not found"
        )
    
    if execution.status == "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete running execution"
        )
    
    db.delete(execution)
    db.commit()
    
    return {"message": "Test execution deleted successfully"}
