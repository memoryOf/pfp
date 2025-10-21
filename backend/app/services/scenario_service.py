"""
场景管理服务
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.scenario import Scenario
from ..schemas.scenario import ScenarioCreate, ScenarioUpdate


class ScenarioService:
    """场景管理服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_scenarios(
        self, 
        skip: int = 0, 
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[Scenario]:
        """获取场景列表"""
        query = self.db.query(Scenario)
        
        if is_active is not None:
            query = query.filter(Scenario.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    async def get_scenario(self, scenario_id: int) -> Optional[Scenario]:
        """获取单个场景"""
        return self.db.query(Scenario).filter(Scenario.id == scenario_id).first()
    
    async def create_scenario(self, scenario_data: ScenarioCreate) -> Scenario:
        """创建场景"""
        scenario = Scenario(
            name=scenario_data.name,
            description=scenario_data.description,
            scenario_type=scenario_data.scenario_type,
            is_active=True
        )
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        return scenario
    
    async def update_scenario(
        self, 
        scenario_id: int, 
        scenario_data: ScenarioUpdate
    ) -> Optional[Scenario]:
        """更新场景"""
        scenario = await self.get_scenario(scenario_id)
        if not scenario:
            return None
        
        update_data = scenario_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(scenario, field, value)
        
        self.db.commit()
        self.db.refresh(scenario)
        return scenario
    
    async def delete_scenario(self, scenario_id: int) -> bool:
        """删除场景"""
        scenario = await self.get_scenario(scenario_id)
        if not scenario:
            return False
        
        self.db.delete(scenario)
        self.db.commit()
        return True
