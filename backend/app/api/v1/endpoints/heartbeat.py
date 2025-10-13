"""
心跳检测API端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from ....core.database import get_db
from ....services.heartbeat_service import HeartbeatService
from ....celery_tasks import heartbeat_check, cleanup_stale_load_generators

router = APIRouter()


@router.post("/check-all")
async def check_all_heartbeats(db: Session = Depends(get_db)):
    """手动触发所有压测机心跳检测"""
    try:
        service = HeartbeatService(db)
        result = await service.check_all_load_generators()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Heartbeat check failed: {str(e)}"
        )


@router.post("/check-all-async")
async def check_all_heartbeats_async():
    """异步触发所有压测机心跳检测"""
    try:
        # 异步执行心跳检测任务
        task = heartbeat_check.delay()
        return {
            "message": "Heartbeat check task started",
            "task_id": task.id,
            "status": "pending"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start heartbeat check task: {str(e)}"
        )


@router.get("/status")
async def get_heartbeat_status(db: Session = Depends(get_db)):
    """获取心跳检测状态"""
    try:
        service = HeartbeatService(db)
        
        # 获取所有在线压测机
        from ....models.load_generator import LoadGenerator
        from sqlalchemy import and_
        
        online_count = db.query(LoadGenerator).filter(
            and_(
                LoadGenerator.status == "online",
                LoadGenerator.is_active == True
            )
        ).count()
        
        offline_count = db.query(LoadGenerator).filter(
            and_(
                LoadGenerator.status == "offline",
                LoadGenerator.is_active == True
            )
        ).count()
        
        # 获取长时间没有心跳的压测机
        stale_load_generators = await service.get_stale_load_generators(stale_minutes=10)
        
        return {
            "online_count": online_count,
            "offline_count": offline_count,
            "stale_count": len(stale_load_generators),
            "stale_load_generators": [
                {
                    "id": lg.id,
                    "name": lg.name,
                    "last_heartbeat": lg.last_heartbeat.isoformat() if lg.last_heartbeat else None
                }
                for lg in stale_load_generators
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get heartbeat status: {str(e)}"
        )


@router.post("/cleanup-stale")
async def cleanup_stale_load_generators_endpoint():
    """清理长时间离线的压测机"""
    try:
        # 异步执行清理任务
        task = cleanup_stale_load_generators.delay()
        return {
            "message": "Cleanup stale load generators task started",
            "task_id": task.id,
            "status": "pending"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start cleanup task: {str(e)}"
        )


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """获取任务状态"""
    try:
        from ....celery_tasks import celery_app
        
        task = celery_app.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": task.status,
            "result": task.result if task.ready() else None,
            "info": task.info if not task.ready() else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}"
        )

