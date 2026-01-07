"""
MinIO文件存储服务 - 统一服务
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from io import BytesIO
from minio import Minio
from minio.error import S3Error
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class MinIOService:
    """MinIO文件存储服务"""
    
    def __init__(self):
        """初始化MinIO客户端"""
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self, bucket_name: str = None):
        """确保存储桶存在"""
        if bucket_name is None:
            bucket_name = self.bucket_name
            
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")
        except S3Error as e:
            logger.error(f"Failed to create bucket {bucket_name}: {str(e)}")
            raise
    
    def init_minio(self) -> bool:
        """初始化MinIO连接和bucket（用于应用启动时）"""
        try:
            if self.client.bucket_exists(self.bucket_name):
                logger.info(f"MinIO bucket '{self.bucket_name}' already exists")
            else:
                self._ensure_bucket_exists()
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            
            logger.info("MinIO initialization completed successfully")
            return True
            
        except S3Error as e:
            logger.error(f"MinIO S3 error: {e}")
            return False
        except Exception as e:
            logger.error(f"MinIO initialization failed: {e}")
            return False
    
    def upload_file(
        self, 
        file_content: bytes = None,
        file_name: str = None,
        content_type: str = "application/octet-stream",
        bucket_name: str = None,
        object_name: str = None,
        file_data: bytes = None  # 兼容旧接口
    ) -> str:
        """
        上传文件到MinIO
        
        Args:
            file_content: 文件内容（优先使用）
            file_name: 文件名（用于生成路径）
            content_type: 文件类型
            bucket_name: 存储桶名称（可选，默认使用配置的bucket）
            object_name: 对象名称（可选，如果不提供则自动生成）
            file_data: 文件数据（兼容旧接口，已废弃）
            
        Returns:
            str: MinIO中的文件路径
        """
        try:
            # 兼容旧接口
            if file_data is not None and file_content is None:
                file_content = file_data
            
            if file_content is None:
                raise ValueError("file_content or file_data must be provided")
            
            # 确定bucket
            target_bucket = bucket_name or self.bucket_name
            self._ensure_bucket_exists(target_bucket)
            
            # 生成对象路径
            if object_name:
                object_path = object_name
            elif file_name:
                # 生成唯一的文件路径
                file_extension = os.path.splitext(file_name)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                object_path = f"scenarios/{datetime.now().strftime('%Y/%m/%d')}/{unique_filename}"
            else:
                # 如果没有文件名，生成UUID
                unique_filename = str(uuid.uuid4())
                object_path = f"scenarios/{datetime.now().strftime('%Y/%m/%d')}/{unique_filename}"
            
            # 上传文件
            self.client.put_object(
                bucket_name=target_bucket,
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
    
    def download_file(
        self, 
        object_path: str,
        bucket_name: str = None
    ) -> bytes:
        """
        从MinIO下载文件
        
        Args:
            object_path: MinIO中的文件路径
            bucket_name: 存储桶名称（可选）
            
        Returns:
            bytes: 文件内容
        """
        try:
            target_bucket = bucket_name or self.bucket_name
            response = self.client.get_object(target_bucket, object_path)
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
    
    def get_file(
        self,
        bucket_name: str,
        object_name: str
    ) -> bytes:
        """
        从MinIO获取文件（兼容旧接口）
        
        Args:
            bucket_name: 存储桶名称
            object_name: 对象名称
            
        Returns:
            bytes: 文件数据
        """
        return self.download_file(object_name, bucket_name)
    
    def delete_file(
        self, 
        object_path: str,
        bucket_name: str = None
    ) -> bool:
        """
        从MinIO删除文件
        
        Args:
            object_path: MinIO中的文件路径
            bucket_name: 存储桶名称（可选）
            
        Returns:
            bool: 删除是否成功
        """
        try:
            target_bucket = bucket_name or self.bucket_name
            self.client.remove_object(target_bucket, object_path)
            logger.info(f"File deleted successfully: {object_path}")
            return True
            
        except S3Error as e:
            logger.error(f"MinIO delete error: {e}")
            return False
        except Exception as e:
            logger.error(f"File delete error: {e}")
            return False
    
    def get_file_url(
        self, 
        object_path: str, 
        expires: timedelta = timedelta(hours=1),
        bucket_name: str = None
    ) -> str:
        """
        获取文件的预签名URL
        
        Args:
            object_path: MinIO中的文件路径
            expires: URL过期时间
            bucket_name: 存储桶名称（可选）
            
        Returns:
            str: 预签名URL
        """
        try:
            target_bucket = bucket_name or self.bucket_name
            url = self.client.presigned_get_object(
                bucket_name=target_bucket,
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
    
    def file_exists(
        self, 
        object_path: str,
        bucket_name: str = None
    ) -> bool:
        """
        检查文件是否存在
        
        Args:
            object_path: MinIO中的文件路径
            bucket_name: 存储桶名称（可选）
            
        Returns:
            bool: 文件是否存在
        """
        try:
            target_bucket = bucket_name or self.bucket_name
            self.client.stat_object(target_bucket, object_path)
            return True
        except S3Error:
            return False
        except Exception as e:
            logger.error(f"File exists check error: {e}")
            return False
    
    def list_files(
        self, 
        bucket_name: str = None,
        prefix: str = ""
    ) -> list:
        """
        列出存储桶中的文件
        
        Args:
            bucket_name: 存储桶名称（可选）
            prefix: 文件前缀（路径）
            
        Returns:
            list: 文件列表
        """
        try:
            target_bucket = bucket_name or self.bucket_name
            objects = self.client.list_objects(target_bucket, prefix=prefix, recursive=True)
            files = []
            
            for obj in objects:
                files.append({
                    'name': obj.object_name,
                    'size': obj.size,
                    'last_modified': obj.last_modified,
                    'etag': obj.etag
                })
            
            return files
            
        except S3Error as e:
            logger.error(f"Failed to list files in bucket {target_bucket}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error listing files: {str(e)}")
            raise


# 创建全局MinIO服务实例
minio_service = MinIOService()
