"""
文件管理服务层
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from ..models.file_management import FileItem
from ..schemas.file_management import FileItemCreate, FileItemUpdate
import logging

logger = logging.getLogger(__name__)

class FileManagementService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_file_record(
        self,
        original_name: str,
        stored_name: str,
        object_path: str,
        file_size: int,
        content_type: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        upload_path: str = "/",
        creator: Optional[str] = None
    ) -> FileItem:
        """
        创建文件记录
        
        Args:
            original_name: 原始文件名
            stored_name: 存储文件名
            object_path: MinIO对象路径
            file_size: 文件大小
            content_type: 文件类型
            description: 文件描述
            tags: 文件标签
            upload_path: 上传路径
            creator: 创建者
            
        Returns:
            FileItem: 创建的文件记录
        """
        try:
            file_item = FileItem(
                original_name=original_name,
                stored_name=stored_name,
                object_path=object_path,
                file_size=file_size,
                content_type=content_type,
                description=description,
                tags=tags or [],
                upload_path=upload_path,
                creator=creator
            )
            
            self.db.add(file_item)
            self.db.commit()
            self.db.refresh(file_item)
            
            logger.info(f"Created file record: {file_item.id}")
            return file_item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create file record: {str(e)}")
            raise
    
    async def get_file_by_id(self, file_id: int) -> Optional[FileItem]:
        """
        根据ID获取文件记录
        
        Args:
            file_id: 文件ID
            
        Returns:
            Optional[FileItem]: 文件记录
        """
        try:
            return self.db.query(FileItem).filter(
                and_(
                    FileItem.id == file_id,
                    FileItem.is_deleted == False
                )
            ).first()
            
        except Exception as e:
            logger.error(f"Failed to get file by ID {file_id}: {str(e)}")
            raise
    
    async def get_files_by_path(self, path: str) -> List[FileItem]:
        """
        根据路径获取文件列表
        
        Args:
            path: 文件路径
            
        Returns:
            List[FileItem]: 文件列表
        """
        try:
            # 如果是根路径"/"，返回所有文件
            if path == "/":
                return self.db.query(FileItem).filter(
                    FileItem.is_deleted == False
                ).order_by(FileItem.created_at.desc()).all()
            
            # 如果是特定路径，返回该路径下的文件
            return self.db.query(FileItem).filter(
                and_(
                    FileItem.upload_path == path,
                    FileItem.is_deleted == False
                )
            ).order_by(FileItem.created_at.desc()).all()
            
        except Exception as e:
            logger.error(f"Failed to get files by path {path}: {str(e)}")
            raise
    
    async def get_files_by_path_recursive(self, path: str) -> List[FileItem]:
        """
        根据路径获取文件列表（递归获取子目录中的文件）
        
        Args:
            path: 文件路径
            
        Returns:
            List[FileItem]: 文件列表（包括子目录中的文件）
        """
        try:
            # 如果是根路径"/"，返回所有文件
            if path == "/":
                return self.db.query(FileItem).filter(
                    FileItem.is_deleted == False
                ).order_by(FileItem.created_at.desc()).all()
            
            # 如果是特定路径，返回该路径及其子路径下的所有文件
            # 使用LIKE查询来匹配路径前缀
            path_pattern = f"{path.rstrip('/')}/%"
            return self.db.query(FileItem).filter(
                and_(
                    FileItem.upload_path.like(path_pattern),
                    FileItem.is_deleted == False
                )
            ).order_by(FileItem.created_at.desc()).all()
            
        except Exception as e:
            logger.error(f"Failed to get files by path recursive {path}: {str(e)}")
            raise
    
    async def update_file(self, file_id: int, update_data: dict) -> Optional[FileItem]:
        """
        更新文件记录
        
        Args:
            file_id: 文件ID
            update_data: 更新数据
            
        Returns:
            Optional[FileItem]: 更新后的文件记录
        """
        try:
            file_item = await self.get_file_by_id(file_id)
            if not file_item:
                return None
            
            for key, value in update_data.items():
                if hasattr(file_item, key):
                    setattr(file_item, key, value)
            
            self.db.commit()
            self.db.refresh(file_item)
            
            logger.info(f"Updated file record: {file_id}")
            return file_item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update file {file_id}: {str(e)}")
            raise
    
    async def delete_file(self, file_id: int) -> bool:
        """
        删除文件记录（软删除）
        
        Args:
            file_id: 文件ID
            
        Returns:
            bool: 删除是否成功
        """
        try:
            file_item = await self.get_file_by_id(file_id)
            if not file_item:
                return False
            
            file_item.is_deleted = True
            self.db.commit()
            
            logger.info(f"Deleted file record: {file_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete file {file_id}: {str(e)}")
            raise
    
    async def search_files(
        self, 
        query: str, 
        path: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[FileItem]:
        """
        搜索文件
        
        Args:
            query: 搜索关键词
            path: 搜索路径
            tags: 标签过滤
            
        Returns:
            List[FileItem]: 搜索结果
        """
        try:
            query_obj = self.db.query(FileItem).filter(FileItem.is_deleted == False)
            
            # 文件名搜索
            if query:
                query_obj = query_obj.filter(
                    FileItem.original_name.ilike(f"%{query}%")
                )
            
            # 路径过滤
            if path:
                query_obj = query_obj.filter(FileItem.upload_path == path)
            
            # 标签过滤
            if tags:
                for tag in tags:
                    query_obj = query_obj.filter(FileItem.tags.contains([tag]))
            
            return query_obj.order_by(FileItem.created_at.desc()).all()
            
        except Exception as e:
            logger.error(f"Failed to search files: {str(e)}")
            raise
    
    async def get_file_statistics(self) -> dict:
        """
        获取文件统计信息
        
        Returns:
            dict: 统计信息
        """
        try:
            total_files = self.db.query(FileItem).filter(FileItem.is_deleted == False).count()
            total_size = self.db.query(FileItem).filter(FileItem.is_deleted == False).with_entities(
                FileItem.file_size
            ).all()
            
            total_size_bytes = sum(size[0] for size in total_size if size[0])
            
            return {
                "total_files": total_files,
                "total_size_bytes": total_size_bytes,
                "total_size_mb": round(total_size_bytes / 1024 / 1024, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get file statistics: {str(e)}")
            raise
