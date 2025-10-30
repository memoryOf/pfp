"""
MinIO客户端封装
"""
import os
from minio import Minio
from minio.error import S3Error
import logging
from typing import Optional, BinaryIO
import io

logger = logging.getLogger(__name__)

class MinIOClient:
    def __init__(self):
        """初始化MinIO客户端"""
        from .config import settings
        
        self.endpoint = settings.MINIO_ENDPOINT
        self.access_key = settings.MINIO_ACCESS_KEY
        self.secret_key = settings.MINIO_SECRET_KEY
        self.secure = settings.MINIO_SECURE
        
        try:
            self.client = Minio(
                endpoint=self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure
            )
            self._ensure_bucket_exists()
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {str(e)}")
            raise
    
    def _ensure_bucket_exists(self, bucket_name: str = None):
        """确保存储桶存在"""
        if bucket_name is None:
            from .config import settings
            bucket_name = settings.MINIO_BUCKET_NAME
            
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")
        except S3Error as e:
            logger.error(f"Failed to create bucket {bucket_name}: {str(e)}")
            raise
    
    def upload_file(
        self, 
        bucket_name: str, 
        object_name: str, 
        file_data: bytes, 
        content_type: str = "application/octet-stream"
    ) -> bool:
        """
        上传文件到MinIO
        
        Args:
            bucket_name: 存储桶名称
            object_name: 对象名称（文件路径）
            file_data: 文件数据
            content_type: 文件类型
            
        Returns:
            bool: 上传是否成功
        """
        try:
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket_name)
            
            # 创建文件流
            file_stream = io.BytesIO(file_data)
            
            # 上传文件
            self.client.put_object(
                bucket_name=bucket_name,
                object_name=object_name,
                data=file_stream,
                length=len(file_data),
                content_type=content_type
            )
            
            logger.info(f"Successfully uploaded file: {object_name}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to upload file {object_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading file {object_name}: {str(e)}")
            raise
    
    def get_file(self, bucket_name: str, object_name: str) -> bytes:
        """
        从MinIO获取文件
        
        Args:
            bucket_name: 存储桶名称
            object_name: 对象名称（文件路径）
            
        Returns:
            bytes: 文件数据
        """
        try:
            response = self.client.get_object(bucket_name, object_name)
            file_data = response.read()
            response.close()
            response.release_conn()
            
            logger.info(f"Successfully retrieved file: {object_name}")
            return file_data
            
        except S3Error as e:
            logger.error(f"Failed to get file {object_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting file {object_name}: {str(e)}")
            raise
    
    def delete_file(self, bucket_name: str, object_name: str) -> bool:
        """
        从MinIO删除文件
        
        Args:
            bucket_name: 存储桶名称
            object_name: 对象名称（文件路径）
            
        Returns:
            bool: 删除是否成功
        """
        try:
            self.client.remove_object(bucket_name, object_name)
            logger.info(f"Successfully deleted file: {object_name}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to delete file {object_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error deleting file {object_name}: {str(e)}")
            raise
    
    def list_files(self, bucket_name: str, prefix: str = "") -> list:
        """
        列出存储桶中的文件
        
        Args:
            bucket_name: 存储桶名称
            prefix: 文件前缀（路径）
            
        Returns:
            list: 文件列表
        """
        try:
            objects = self.client.list_objects(bucket_name, prefix=prefix, recursive=True)
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
            logger.error(f"Failed to list files in bucket {bucket_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error listing files: {str(e)}")
            raise
    
    def get_file_url(self, bucket_name: str, object_name: str, expires_in_seconds: int = 3600) -> str:
        """
        获取文件的预签名URL
        
        Args:
            bucket_name: 存储桶名称
            object_name: 对象名称（文件路径）
            expires_in_seconds: URL过期时间（秒）
            
        Returns:
            str: 预签名URL
        """
        try:
            url = self.client.presigned_get_object(
                bucket_name, 
                object_name, 
                expires=expires_in_seconds
            )
            return url
            
        except S3Error as e:
            logger.error(f"Failed to generate presigned URL for {object_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {str(e)}")
            raise
