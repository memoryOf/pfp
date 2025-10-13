"""
Celery定时任务
"""
from celery import Celery
from celery.schedules import crontab
from .core.config import settings
from .services.heartbeat_service import heartbeat_check_task
# 导入所有模型以确保SQLAlchemy关系正确初始化
from .models.load_generator import LoadGenerator, LoadGeneratorConfig
from .models.test_management import TestTask, TestScript, TestExecution
import asyncio
import logging

logger = logging.getLogger(__name__)

# 创建Celery应用
celery_app = Celery(
    "pfp",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.celery_tasks"]
)

# Celery配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5分钟超时
    task_soft_time_limit=240,  # 4分钟软超时
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# 定时任务配置
celery_app.conf.beat_schedule = {
    # 心跳检测任务 - 每2分钟执行一次
    "heartbeat-check": {
        "task": "app.celery_tasks.heartbeat_check",
        "schedule": 120.0,  # 120秒 = 2分钟
    },
    # 清理长时间离线的压测机 - 每10分钟执行一次
    "cleanup-stale-load-generators": {
        "task": "app.celery_tasks.cleanup_stale_load_generators",
        "schedule": 600.0,  # 600秒 = 10分钟
    },
}

# 任务定义
@celery_app.task(bind=True)
def heartbeat_check(self):
    """心跳检测任务"""
    try:
        logger.info("Starting heartbeat check task")
        
        # 运行异步心跳检测
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(heartbeat_check_task())
            logger.info(f"Heartbeat check completed: {result}")
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Heartbeat check task failed: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)

@celery_app.task(bind=True)
def cleanup_stale_load_generators(self):
    """清理长时间离线的压测机"""
    try:
        logger.info("Starting cleanup stale load generators task")
        
        from .services.heartbeat_service import HeartbeatService
        from .core.database import get_db
        
        db = next(get_db())
        try:
            service = HeartbeatService(db)
            
            # 标记30分钟没有心跳的压测机为离线
            stale_count = asyncio.run(service.mark_stale_as_offline(stale_minutes=30))
            
            logger.info(f"Marked {stale_count} stale load generators as offline")
            return {"stale_marked_offline": stale_count}
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Cleanup stale load generators task failed: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)

@celery_app.task
def test_task():
    """测试任务"""
    return {"message": "Celery is working!", "timestamp": "2024-01-01T00:00:00Z"}

# 健康检查任务
@celery_app.task
def health_check():
    """健康检查任务"""
    return {
        "status": "healthy",
        "celery_worker": True,
        "timestamp": "2024-01-01T00:00:00Z"
    }

