"""
Celery应用初始化（已合并到celery_tasks.py）
"""
from .celery_tasks import celery_app

__all__ = ["celery_app"]

