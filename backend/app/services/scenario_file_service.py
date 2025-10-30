"""
场景文件服务
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.scenario import ScenarioFileRecord
from ..schemas.scenario_file import ScenarioFileCreate, ScenarioFileUpdate
from .minio_service import minio_service
import logging

logger = logging.getLogger(__name__)


class ScenarioFileService:
    """场景文件服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_scenario_files(self, scenario_id: int) -> List[ScenarioFileRecord]:
        """获取场景的所有文件"""
        return self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.scenario_id == scenario_id).all()
    
    async def get_scenario_file(self, file_id: int) -> Optional[ScenarioFileRecord]:
        """获取单个场景文件"""
        return self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.id == file_id).first()
    
    async def create_scenario_file(self, scenario_id: int, file_data: ScenarioFileCreate) -> ScenarioFileRecord:
        """创建场景文件"""
        try:
            # 上传文件到MinIO
            file_path = minio_service.upload_file(
                file_content=file_data.file_content,
                file_name=file_data.file_name,
                content_type=file_data.content_type
            )
            
            # 获取文件扩展名
            file_extension = file_data.file_name.split('.')[-1] if '.' in file_data.file_name else ''
            
            # 创建数据库记录
            db_file = ScenarioFileRecord(
                scenario_id=scenario_id,
                file_name=file_data.file_name,
                file_path=file_path,
                file_size=len(file_data.file_content),
                file_type=file_extension,
                content_type=file_data.content_type
            )
            
            self.db.add(db_file)
            self.db.commit()
            self.db.refresh(db_file)
            
            logger.info(f"Scenario file created: {file_data.file_name} for scenario {scenario_id}")
            return db_file
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create scenario file: {e}")
            raise Exception(f"创建场景文件失败: {e}")
    
    async def update_scenario_file(self, file_id: int, file_data: ScenarioFileUpdate) -> Optional[ScenarioFileRecord]:
        """更新场景文件"""
        try:
            db_file = self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.id == file_id).first()
            if not db_file:
                return None
            
            # 如果更新了文件内容，需要重新上传到MinIO
            if file_data.file_content is not None:
                # 删除旧文件
                minio_service.delete_file(db_file.file_path)
                
                # 上传新文件
                file_path = minio_service.upload_file(
                    file_content=file_data.file_content,
                    file_name=file_data.file_name or db_file.file_name,
                    content_type=file_data.content_type or db_file.content_type
                )
                
                db_file.file_path = file_path
                db_file.file_size = len(file_data.file_content)
            
            # 更新其他字段
            if file_data.file_name is not None:
                db_file.file_name = file_data.file_name
                # 更新文件类型
                file_extension = file_data.file_name.split('.')[-1] if '.' in file_data.file_name else ''
                db_file.file_type = file_extension
            
            if file_data.content_type is not None:
                db_file.content_type = file_data.content_type
            
            self.db.commit()
            self.db.refresh(db_file)
            
            logger.info(f"Scenario file updated: {file_id}")
            return db_file
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update scenario file: {e}")
            raise Exception(f"更新场景文件失败: {e}")
    
    async def delete_scenario_file(self, file_id: int) -> bool:
        """删除场景文件"""
        try:
            db_file = self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.id == file_id).first()
            if not db_file:
                return False
            
            # 从MinIO删除文件
            minio_service.delete_file(db_file.file_path)
            
            # 从数据库删除记录
            self.db.delete(db_file)
            self.db.commit()
            
            logger.info(f"Scenario file deleted: {file_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete scenario file: {e}")
            return False
    
    async def get_file_content(self, file_id: int) -> Optional[bytes]:
        """获取文件内容"""
        try:
            db_file = self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.id == file_id).first()
            if not db_file:
                return None
            
            # 从MinIO下载文件内容
            file_content = minio_service.download_file(db_file.file_path)
            return file_content
            
        except Exception as e:
            logger.error(f"Failed to get file content: {e}")
            return None
    
    async def get_file_url(self, file_id: int) -> Optional[str]:
        """获取文件下载URL"""
        try:
            db_file = self.db.query(ScenarioFileRecord).filter(ScenarioFileRecord.id == file_id).first()
            if not db_file:
                return None
            
            # 获取预签名URL
            file_url = minio_service.get_file_url(db_file.file_path)
            return file_url
            
        except Exception as e:
            logger.error(f"Failed to get file URL: {e}")
            return None
