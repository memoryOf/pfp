"""
Redis连接管理
"""
import redis.asyncio as redis
from .config import settings


class RedisClient:
    """Redis客户端单例"""
    _instance = None
    _redis = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def get_redis(self):
        """获取Redis连接"""
        if self._redis is None:
            self._redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis
    
    async def close(self):
        """关闭Redis连接"""
        if self._redis:
            await self._redis.close()
            self._redis = None


# 创建全局Redis客户端实例
redis_client = RedisClient()
