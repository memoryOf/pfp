"""
Celery应用初始化
"""
from .celery_tasks import celery_app

__all__ = ["celery_app"]

