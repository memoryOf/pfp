"""
MinIO文件存储服务
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from io import BytesIO
from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class MinIOService:
    """MinIO文件存储服务"""
    
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
    
    def upload_file(self, file_content: bytes, file_name: str, content_type: str = "application/octet-stream") -> str:
        """
        上传文件到MinIO
        
        Args:
            file_content: 文件内容
            file_name: 文件名
            content_type: 文件类型
            
        Returns:
            str: MinIO中的文件路径
        """
        try:
            # 生成唯一的文件路径
            file_extension = os.path.splitext(file_name)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            object_path = f"scenarios/{datetime.now().strftime('%Y/%m/%d')}/{unique_filename}"
            
            # 上传文件
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_path,
                data=BytesIO(file_content),
                length=len(file_content),
                content_type=content_type
            )
            
            logger.info(f"File uploaded successfully: {object_path}")
            return object_path
            
        except S3Error as e:
            logger.error(f"MinIO upload error: {e}")
            raise Exception(f"文件上传失败: {e}")
        except Exception as e:
            logger.error(f"File upload error: {e}")
            raise Exception(f"文件上传失败: {e}")
    
    def download_file(self, object_path: str) -> bytes:
        """
        从MinIO下载文件
        
        Args:
            object_path: MinIO中的文件路径
            
        Returns:
            bytes: 文件内容
        """
        try:
            response = self.client.get_object(self.bucket_name, object_path)
            file_content = response.read()
            response.close()
            response.release_conn()
            
            return file_content
            
        except S3Error as e:
            logger.error(f"MinIO download error: {e}")
            raise Exception(f"文件下载失败: {e}")
        except Exception as e:
            logger.error(f"File download error: {e}")
            raise Exception(f"文件下载失败: {e}")
    
    def delete_file(self, object_path: str) -> bool:
        """
        从MinIO删除文件
        
        Args:
            object_path: MinIO中的文件路径
            
        Returns:
            bool: 删除是否成功
        """
        try:
            self.client.remove_object(self.bucket_name, object_path)
            logger.info(f"File deleted successfully: {object_path}")
            return True
            
        except S3Error as e:
            logger.error(f"MinIO delete error: {e}")
            return False
        except Exception as e:
            logger.error(f"File delete error: {e}")
            return False
    
    def get_file_url(self, object_path: str, expires: timedelta = timedelta(hours=1)) -> str:
        """
        获取文件的预签名URL
        
        Args:
            object_path: MinIO中的文件路径
            expires: URL过期时间
            
        Returns:
            str: 预签名URL
        """
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_path,
                expires=expires
            )
            return url
            
        except S3Error as e:
            logger.error(f"MinIO presigned URL error: {e}")
            raise Exception(f"获取文件URL失败: {e}")
        except Exception as e:
            logger.error(f"Presigned URL error: {e}")
            raise Exception(f"获取文件URL失败: {e}")
    
    def file_exists(self, object_path: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            object_path: MinIO中的文件路径
            
        Returns:
            bool: 文件是否存在
        """
        try:
            self.client.stat_object(self.bucket_name, object_path)
            return True
        except S3Error:
            return False
        except Exception as e:
            logger.error(f"File exists check error: {e}")
            return False


# 创建全局MinIO服务实例
minio_service = MinIOService()
