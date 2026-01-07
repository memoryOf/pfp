"""
数据库工具函数
"""
from sqlalchemy.orm import Session
from typing import TypeVar, Generic, Type, Optional, List
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """基础仓储类，提供通用的CRUD操作"""
    
    def __init__(self, db: Session, model: Type[T]):
        self.db = db
        self.model = model
    
    def get(self, id: int) -> Optional[T]:
        """根据ID获取记录"""
        try:
            return self.db.query(self.model).filter(self.model.id == id).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model.__name__} by id {id}: {e}")
            raise
    
    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[dict] = None
    ) -> List[T]:
        """获取记录列表"""
        try:
            query = self.db.query(self.model)
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.filter(getattr(self.model, key) == value)
            return query.offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model.__name__} list: {e}")
            raise
    
    def create(self, obj: T) -> T:
        """创建记录"""
        try:
            self.db.add(obj)
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating {self.model.__name__}: {e}")
            raise
    
    def update(self, id: int, update_data: dict) -> Optional[T]:
        """更新记录"""
        try:
            obj = self.get(id)
            if not obj:
                return None
            
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating {self.model.__name__} {id}: {e}")
            raise
    
    def delete(self, id: int) -> bool:
        """删除记录"""
        try:
            obj = self.get(id)
            if not obj:
                return False
            
            self.db.delete(obj)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting {self.model.__name__} {id}: {e}")
            raise
    
    def soft_delete(self, id: int) -> bool:
        """软删除记录（设置is_active=False）"""
        try:
            obj = self.get(id)
            if not obj:
                return False
            
            if hasattr(obj, 'is_active'):
                obj.is_active = False
                self.db.commit()
                return True
            return False
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error soft deleting {self.model.__name__} {id}: {e}")
            raise

