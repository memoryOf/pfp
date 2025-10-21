"""
场景管理Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ScenarioBase(BaseModel):
    """场景基础模型"""
    name: str = Field(..., description="场景名称", max_length=200)
    description: Optional[str] = Field(None, description="场景描述")
    scenario_type: str = Field(..., description="场景类型: locust/jmeter/gatling")
    is_active: bool = Field(default=True, description="是否启用")


class ScenarioCreate(BaseModel):
    """创建场景模型"""
    name: str = Field(..., description="场景名称", max_length=200)
    description: Optional[str] = Field(None, description="场景描述")
    scenario_type: str = Field(..., description="场景类型: locust/jmeter/gatling")


class ScenarioUpdate(BaseModel):
    """更新场景模型"""
    name: Optional[str] = Field(None, description="场景名称", max_length=200)
    description: Optional[str] = Field(None, description="场景描述")
    scenario_type: Optional[str] = Field(None, description="场景类型: locust/jmeter/gatling")
    is_active: Optional[bool] = Field(None, description="是否启用")


class ScenarioResponse(ScenarioBase):
    """场景响应模型"""
    id: int = Field(..., description="场景ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True
