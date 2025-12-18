"""
测试任务管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....models.test_management import TestTask, TestExecution, TestScenario, TaskScenarioReference
from ....models.scenario import Scenario
from ....schemas.test_management import (
    TestTaskCreate, TestTaskUpdate, TestTaskResponse, TestTaskWithScenariosResponse,
    TestExecutionResponse, TestExecutionStartRequest, TestExecutionStopRequest,
    TaskScenarioReferenceCreate, TaskScenarioReferenceUpdate, TaskScenarioReferenceResponse
)

router = APIRouter()


@router.get("/", response_model=List[TestTaskResponse])
async def get_test_tasks(
    skip: int = 0,
    limit: int = 100,
    scenario_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取测试任务列表"""
    query = db.query(TestTask).filter(TestTask.is_active == True)
    
    if scenario_type:
        query = query.filter(TestTask.scenario_type == scenario_type)
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks


@router.get("/{task_id}/", response_model=TestTaskWithScenariosResponse)
async def get_test_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取单个测试任务详情（包含场景）"""
    task = db.query(TestTask).filter(
        TestTask.id == task_id,
        TestTask.is_active == True
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    # 获取关联的场景
    scenarios = db.query(TestScenario).filter(
        TestScenario.task_id == task_id
    ).order_by(TestScenario.order).all()
    
    # 构建响应
    task_dict = {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "scenario_type": task.scenario_type,
        "target_host": task.target_host,
        "script_id": task.script_id,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "is_active": task.is_active,
        "scenarios": scenarios
    }
    
    return task_dict


@router.post("/", response_model=TestTaskResponse)
async def create_test_task(
    task: TestTaskCreate,
    db: Session = Depends(get_db)
):
    """创建测试任务"""
    # 为缺失的字段提供默认值
    task_data = task.dict()
    task_data.update({
        "scenario_type": "single",
        "target_host": "",
        "script_id": None
    })
    
    db_task = TestTask(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.put("/{task_id}/", response_model=TestTaskResponse)
async def update_test_task(
    task_id: int,
    task_update: TestTaskUpdate,
    db: Session = Depends(get_db)
):
    """更新测试任务"""
    task = db.query(TestTask).filter(
        TestTask.id == task_id,
        TestTask.is_active == True
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}/")
async def delete_test_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """删除测试任务（软删除）"""
    task = db.query(TestTask).filter(
        TestTask.id == task_id,
        TestTask.is_active == True
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test task not found"
        )
    
    task.is_active = False
    db.commit()
    
    return {"message": "Test task deleted successfully"}


@router.get("/{task_id}/executions/", response_model=List[TestExecutionResponse])
async def get_test_executions(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取测试任务的执行记录"""
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
    
    executions = db.query(TestExecution).filter(
        TestExecution.task_id == task_id
    ).order_by(TestExecution.created_at.desc()).all()
    
    return executions


@router.get("/{task_id}/scenario-references/", response_model=List[TaskScenarioReferenceResponse])
async def get_task_scenario_references(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取任务关联的场景列表"""
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
    
    references = db.query(TaskScenarioReference).filter(
        TaskScenarioReference.task_id == task_id
    ).all()
    
    return references


@router.post("/{task_id}/scenario-references/", response_model=List[TaskScenarioReferenceResponse])
async def create_task_scenario_references(
    task_id: int,
    scenario_refs: List[TaskScenarioReferenceCreate],
    db: Session = Depends(get_db)
):
    """批量创建任务场景关联（新增为追加，不移除已存在的关联）"""
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
    
    # 创建新的关联（已存在则跳过）
    created_refs = []
    for ref_data in scenario_refs:
        # 验证场景是否存在
        scenario = db.query(Scenario).filter(Scenario.id == ref_data.scenario_id).first()
        if not scenario:
            continue
        # 若已存在关联则更新其状态，否则创建
        existing = db.query(TaskScenarioReference).filter(
            TaskScenarioReference.task_id == task_id,
            TaskScenarioReference.scenario_id == ref_data.scenario_id
        ).first()

        if existing:
            existing.is_enabled = ref_data.is_enabled
            db_ref = existing
        else:
            db_ref = TaskScenarioReference(
                task_id=task_id,
                scenario_id=ref_data.scenario_id,
                is_enabled=ref_data.is_enabled
            )
            db.add(db_ref)
        created_refs.append(db_ref)
    
    db.commit()
    
    # 刷新所有创建的对象
    for ref in created_refs:
        db.refresh(ref)
    
    return created_refs


@router.put("/{task_id}/scenario-references/{reference_id}/", response_model=TaskScenarioReferenceResponse)
async def update_task_scenario_reference(
    task_id: int,
    reference_id: int,
    ref_update: TaskScenarioReferenceUpdate,
    db: Session = Depends(get_db)
):
    """更新任务场景关联"""
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
    
    # 查找关联
    ref = db.query(TaskScenarioReference).filter(
        TaskScenarioReference.id == reference_id,
        TaskScenarioReference.task_id == task_id
    ).first()
    
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task scenario reference not found"
        )
    
    # 更新
    update_data = ref_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ref, field, value)
    
    db.commit()
    db.refresh(ref)
    return ref


@router.delete("/{task_id}/scenario-references/{reference_id}/")
async def delete_task_scenario_reference(
    task_id: int,
    reference_id: int,
    db: Session = Depends(get_db)
):
    """删除任务场景关联"""
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
    
    # 查找并删除关联
    ref = db.query(TaskScenarioReference).filter(
        TaskScenarioReference.id == reference_id,
        TaskScenarioReference.task_id == task_id
    ).first()
    
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task scenario reference not found"
        )
    
    db.delete(ref)
    db.commit()
    
    return {"message": "Task scenario reference deleted successfully"}


@router.get("/by-scenario/{scenario_id}/", response_model=List[TestTaskResponse])
async def get_tasks_by_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """根据场景ID查询已绑定该场景的任务列表"""
    refs = db.query(TaskScenarioReference).filter(
        TaskScenarioReference.scenario_id == scenario_id
    ).all()
    if not refs:
        return []
    task_ids = [ref.task_id for ref in refs]
    tasks = db.query(TestTask).filter(TestTask.id.in_(task_ids), TestTask.is_active == True).all()
    return tasks

