"""
MinIO初始化服务
"""
from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def init_minio():
    """初始化MinIO连接和bucket"""
    try:
        # 创建MinIO客户端
        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        
        # 检查连接
        if minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
            logger.info(f"MinIO bucket '{settings.MINIO_BUCKET_NAME}' already exists")
        else:
            # 创建bucket
            minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
            logger.info(f"Created MinIO bucket: {settings.MINIO_BUCKET_NAME}")
        
        # 设置bucket策略（可选）
        # policy = {
        #     "Version": "2012-10-17",
        #     "Statement": [
        #         {
        #             "Effect": "Allow",
        #             "Principal": {"AWS": ["*"]},
        #             "Action": ["s3:GetObject"],
        #             "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET_NAME}/*"]
        #         }
        #     ]
        # }
        # minio_client.set_bucket_policy(settings.MINIO_BUCKET_NAME, json.dumps(policy))
        
        logger.info("MinIO initialization completed successfully")
        return True
        
    except S3Error as e:
        logger.error(f"MinIO S3 error: {e}")
        return False
    except Exception as e:
        logger.error(f"MinIO initialization failed: {e}")
        return False


if __name__ == "__main__":
    init_minio()
