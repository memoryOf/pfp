"""
MinIO对象存储服务
"""
import hashlib
import io
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from minio import Minio
from minio.error import S3Error
from app.models.test_management import ScenarioFile
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class FileStorageService:
    """MinIO对象存储服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        
        # 确保bucket存在
        self._ensure_bucket_exists()
    
    def save_file(self, scenario_id: int, file: UploadFile, description: str = None) -> ScenarioFile:
        """
        保存文件到MinIO对象存储
        
        Args:
            scenario_id: 场景ID
            file: 上传的文件
            description: 文件描述
            
        Returns:
            ScenarioFile: 保存的文件记录
        """
        try:
            # 生成对象名称
            object_name = self._generate_object_name(scenario_id, file.filename)
            
            # 读取文件内容
            file_content_bytes = file.file.read()
            file_size = len(file_content_bytes)
            
            # 计算文件哈希
            file_hash = hashlib.md5(file_content_bytes).hexdigest()
            
            # 上传到MinIO
            self.minio_client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=io.BytesIO(file_content_bytes),
                length=file_size,
                content_type=file.content_type or "application/octet-stream"
            )
            
            # 读取文件内容（小文件直接存储）
            file_content = None
            if file_size < 1024 * 1024:  # 小于1MB的文件
                try:
                    file_content = file_content_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    # 如果不是文本文件，不存储内容
                    pass
            
            # 创建数据库记录
            scenario_file = ScenarioFile(
                scenario_id=scenario_id,
                file_name=file.filename,
                file_path=object_name,  # 存储MinIO对象名称
                file_size=file_size,
                file_type=file.content_type or "application/octet-stream",
                file_hash=file_hash,
                file_content=file_content,
                description=description,
                is_script=self._is_script_file(file.filename)
            )
            
            self.db.add(scenario_file)
            self.db.commit()
            self.db.refresh(scenario_file)
            
            logger.info(f"File saved successfully to MinIO: {file.filename} -> {object_name}")
            return scenario_file
            
        except Exception as e:
            logger.error(f"Failed to save file {file.filename} to MinIO: {e}")
            raise
    
    def get_file(self, file_id: int) -> Optional[ScenarioFile]:
        """获取文件记录"""
        return self.db.query(ScenarioFile).filter(ScenarioFile.id == file_id).first()
    
    def get_file_content(self, file_id: int) -> Optional[str]:
        """
        获取文件内容
        
        Args:
            file_id: 文件ID
            
        Returns:
            str: 文件内容
        """
        scenario_file = self.get_file(file_id)
        if not scenario_file:
            return None
        
        # 如果数据库中有内容，直接返回
        if scenario_file.file_content:
            return scenario_file.file_content
        
        # 否则从MinIO读取
        try:
            response = self.minio_client.get_object(
                bucket_name=self.bucket_name,
                object_name=scenario_file.file_path
            )
            content = response.read().decode('utf-8')
            response.close()
            response.release_conn()
            return content
        except Exception as e:
            logger.error(f"Failed to read file from MinIO {scenario_file.file_path}: {e}")
            return None
    
    def update_file_content(self, file_id: int, content: str) -> bool:
        """
        更新文件内容
        
        Args:
            file_id: 文件ID
            content: 新内容
            
        Returns:
            bool: 是否成功
        """
        try:
            scenario_file = self.get_file(file_id)
            if not scenario_file:
                return False
            
            # 更新MinIO中的文件
            content_bytes = content.encode('utf-8')
            self.minio_client.put_object(
                bucket_name=self.bucket_name,
                object_name=scenario_file.file_path,
                data=io.BytesIO(content_bytes),
                length=len(content_bytes),
                content_type=scenario_file.file_type
            )
            
            # 更新数据库记录
            scenario_file.file_content = content
            scenario_file.file_size = len(content_bytes)
            scenario_file.file_hash = hashlib.md5(content_bytes).hexdigest()
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update file content {file_id}: {e}")
            return False
    
    def delete_file(self, file_id: int) -> bool:
        """
        删除文件
        
        Args:
            file_id: 文件ID
            
        Returns:
            bool: 是否成功
        """
        try:
            scenario_file = self.get_file(file_id)
            if not scenario_file:
                return False
            
            # 删除MinIO中的文件
            self.minio_client.remove_object(
                bucket_name=self.bucket_name,
                object_name=scenario_file.file_path
            )
            
            # 删除数据库记录
            self.db.delete(scenario_file)
            self.db.commit()
            
            logger.info(f"File deleted successfully from MinIO: {scenario_file.file_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file {file_id} from MinIO: {e}")
            return False
    
    def get_scenario_files(self, scenario_id: int) -> list[ScenarioFile]:
        """获取场景的所有文件"""
        return self.db.query(ScenarioFile).filter(
            ScenarioFile.scenario_id == scenario_id
        ).order_by(ScenarioFile.created_at.desc()).all()
    
    def _ensure_bucket_exists(self):
        """确保MinIO bucket存在"""
        try:
            if not self.minio_client.bucket_exists(self.bucket_name):
                self.minio_client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Failed to create MinIO bucket {self.bucket_name}: {e}")
            raise
    
    def _generate_object_name(self, scenario_id: int, filename: str) -> str:
        """生成MinIO对象名称"""
        # 生成唯一对象名称（避免重名）
        file_stem = filename.rsplit('.', 1)[0] if '.' in filename else filename
        file_suffix = '.' + filename.rsplit('.', 1)[1] if '.' in filename else ''
        counter = 1
        base_name = f"scenario_{scenario_id}/{file_stem}{file_suffix}"
        
        # 检查对象是否已存在
        while self._object_exists(base_name):
            base_name = f"scenario_{scenario_id}/{file_stem}_{counter}{file_suffix}"
            counter += 1
        
        return base_name
    
    def _object_exists(self, object_name: str) -> bool:
        """检查MinIO对象是否存在"""
        try:
            self.minio_client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    def _is_script_file(self, filename: str) -> bool:
        """判断是否为脚本文件"""
        script_extensions = {'.py', '.js', '.ts', '.java', '.go', '.rs', '.sh', '.bat'}
        return filename.rsplit('.', 1)[-1].lower() in script_extensions
