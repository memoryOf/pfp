"""
测试管理服务
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import asyncio
from app.models.test_management import TestTask, TestExecution, TestScript
from app.schemas.test_management import (
    TestTaskCreate, TestTaskUpdate, TestExecutionCreate, TestExecutionUpdate,
    TestScriptCreate, TestScriptUpdate
)


class TestTaskService:
    """测试任务服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_test_tasks(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[str] = None
    ) -> List[TestTask]:
        """获取测试任务列表"""
        query = self.db.query(TestTask)
        
        if status:
            query = query.filter(TestTask.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    async def get_test_task(self, task_id: int) -> Optional[TestTask]:
        """获取单个测试任务"""
        return self.db.query(TestTask).filter(TestTask.id == task_id).first()
    
    async def create_test_task(self, task_data: TestTaskCreate) -> TestTask:
        """创建测试任务"""
        task = TestTask(**task_data.dict())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task
    
    async def update_test_task(self, task_id: int, task_data: TestTaskUpdate) -> Optional[TestTask]:
        """更新测试任务"""
        task = await self.get_test_task(task_id)
        if not task:
            return None
        
        update_data = task_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        
        task.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task
    
    async def delete_test_task(self, task_id: int) -> bool:
        """删除测试任务"""
        task = await self.get_test_task(task_id)
        if not task:
            return False
        
        self.db.delete(task)
        self.db.commit()
        return True
    
    async def start_test_task(self, task_id: int, load_generator_id: Optional[int] = None) -> Dict[str, Any]:
        """启动测试任务"""
        task = await self.get_test_task(task_id)
        if not task:
            return {"success": False, "message": "测试任务不存在"}
        
        if task.status == "running":
            return {"success": False, "message": "测试任务已在运行中"}
        
        # 更新任务状态
        task.status = "running"
        task.started_at = datetime.utcnow()
        task.load_generator_id = load_generator_id or task.load_generator_id
        self.db.commit()
        
        # 创建执行记录
        execution = TestExecution(
            task_id=task_id,
            execution_name=f"{task.name}_execution_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            user_count=task.user_count,
            spawn_rate=task.spawn_rate,
            run_time=str(task.run_time),
            status="pending"
        )
        self.db.add(execution)
        self.db.commit()
        
        # TODO: 这里应该调用Locust服务启动实际的性能测试
        # 暂时模拟启动成功
        execution.status = "running"
        execution.started_at = datetime.utcnow()
        self.db.commit()
        
        return {
            "success": True, 
            "message": "测试任务启动成功",
            "execution_id": execution.id
        }
    
    async def stop_test_task(self, task_id: int, reason: Optional[str] = None) -> Dict[str, Any]:
        """停止测试任务"""
        task = await self.get_test_task(task_id)
        if not task:
            return {"success": False, "message": "测试任务不存在"}
        
        if task.status != "running":
            return {"success": False, "message": "测试任务未在运行中"}
        
        # 更新任务状态
        task.status = "cancelled"
        task.completed_at = datetime.utcnow()
        self.db.commit()
        
        # 更新执行记录
        execution = self.db.query(TestExecution).filter(
            TestExecution.task_id == task_id,
            TestExecution.status == "running"
        ).first()
        
        if execution:
            execution.status = "cancelled"
            execution.completed_at = datetime.utcnow()
            if reason:
                execution.error_message = reason
            self.db.commit()
        
        # TODO: 这里应该调用Locust服务停止实际的性能测试
        
        return {"success": True, "message": "测试任务停止成功"}


class TestExecutionService:
    """测试执行服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_executions(self, task_id: int) -> List[TestExecution]:
        """获取测试执行记录"""
        return self.db.query(TestExecution).filter(
            TestExecution.task_id == task_id
        ).order_by(TestExecution.created_at.desc()).all()
    
    async def get_execution(self, execution_id: int) -> Optional[TestExecution]:
        """获取单个执行记录"""
        return self.db.query(TestExecution).filter(
            TestExecution.id == execution_id
        ).first()
    
    async def create_execution(self, execution_data: TestExecutionCreate) -> TestExecution:
        """创建执行记录"""
        execution = TestExecution(**execution_data.dict())
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution
    
    async def update_execution(self, execution_id: int, execution_data: TestExecutionUpdate) -> Optional[TestExecution]:
        """更新执行记录"""
        execution = await self.get_execution(execution_id)
        if not execution:
            return None
        
        update_data = execution_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(execution, field, value)
        
        self.db.commit()
        self.db.refresh(execution)
        return execution


class TestScriptService:
    """测试脚本服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_test_scripts(
        self, 
        skip: int = 0, 
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[TestScript]:
        """获取测试脚本列表"""
        query = self.db.query(TestScript)
        
        if is_active is not None:
            query = query.filter(TestScript.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    async def get_test_script(self, script_id: int) -> Optional[TestScript]:
        """获取单个测试脚本"""
        return self.db.query(TestScript).filter(TestScript.id == script_id).first()
    
    async def create_test_script(self, script_data: TestScriptCreate) -> TestScript:
        """创建测试脚本"""
        script = TestScript(**script_data.dict())
        self.db.add(script)
        self.db.commit()
        self.db.refresh(script)
        return script
    
    async def update_test_script(self, script_id: int, script_data: TestScriptUpdate) -> Optional[TestScript]:
        """更新测试脚本"""
        script = await self.get_test_script(script_id)
        if not script:
            return None
        
        update_data = script_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(script, field, value)
        
        script.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(script)
        return script
    
    async def delete_test_script(self, script_id: int) -> bool:
        """删除测试脚本"""
        script = await self.get_test_script(script_id)
        if not script:
            return False
        
        self.db.delete(script)
        self.db.commit()
        return True

