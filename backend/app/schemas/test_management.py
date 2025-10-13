"""
测试管理相关数据模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TestTaskBase(BaseModel):
    """测试任务基础模式"""
    name: str = Field(..., description="任务名称")
    description: Optional[str] = Field(None, description="任务描述")
    scenario_type: str = Field(default="single", description="场景类型: single/multi")
    target_host: str = Field(..., description="目标主机")
    script_id: Optional[int] = Field(None, description="测试脚本ID")


class TestTaskCreate(BaseModel):
    """创建测试任务模式"""
    name: str = Field(..., description="任务名称")
    description: Optional[str] = Field(None, description="任务描述")


class TestTaskUpdate(BaseModel):
    """更新测试任务模式"""
    name: Optional[str] = Field(None, description="任务名称")
    description: Optional[str] = Field(None, description="任务描述")
    scenario_type: Optional[str] = Field(None, description="场景类型")
    target_host: Optional[str] = Field(None, description="目标主机")
    script_id: Optional[int] = Field(None, description="测试脚本ID")


class TestTaskResponse(TestTaskBase):
    """测试任务响应模式"""
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class TestStrategyBase(BaseModel):
    """压测策略基础模式"""
    name: str = Field(..., description="策略名称")
    description: Optional[str] = Field(None, description="策略描述")
    strategy_type: str = Field(default="linear", description="策略类型: linear/step/adaptive")
    user_count: int = Field(default=10, description="用户数")
    spawn_rate: int = Field(default=2, description="用户生成速率")
    run_time: int = Field(default=60, description="运行时间(秒)")
    ramp_up_time: int = Field(default=10, description="预热时间(秒)")
    strategy_config: Optional[Dict[str, Any]] = Field(None, description="策略详细配置")


class TestStrategyCreate(TestStrategyBase):
    """创建压测策略模式"""
    pass


class TestStrategyUpdate(BaseModel):
    """更新压测策略模式"""
    name: Optional[str] = Field(None, description="策略名称")
    description: Optional[str] = Field(None, description="策略描述")
    strategy_type: Optional[str] = Field(None, description="策略类型")
    user_count: Optional[int] = Field(None, description="用户数")
    spawn_rate: Optional[int] = Field(None, description="用户生成速率")
    run_time: Optional[int] = Field(None, description="运行时间(秒)")
    ramp_up_time: Optional[int] = Field(None, description="预热时间(秒)")
    strategy_config: Optional[Dict[str, Any]] = Field(None, description="策略详细配置")


class TestStrategyResponse(TestStrategyBase):
    """压测策略响应模式"""
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class TestScenarioBase(BaseModel):
    """测试场景基础模式"""
    interface_name: str = Field(..., description="接口名称")
    interface_url: str = Field(..., description="接口URL")
    method: str = Field(default="GET", description="HTTP方法")
    weight: int = Field(default=1, description="权重")
    order: int = Field(default=1, description="执行顺序")
    headers: Optional[Dict[str, str]] = Field(None, description="请求头")
    body: Optional[str] = Field(None, description="请求体")
    timeout: int = Field(default=30, description="超时时间(秒)")


class TestScenarioCreate(TestScenarioBase):
    """创建测试场景模式"""
    task_id: int = Field(..., description="任务ID")


class TestScenarioUpdate(BaseModel):
    """更新测试场景模式"""
    interface_name: Optional[str] = Field(None, description="接口名称")
    interface_url: Optional[str] = Field(None, description="接口URL")
    method: Optional[str] = Field(None, description="HTTP方法")
    weight: Optional[int] = Field(None, description="权重")
    order: Optional[int] = Field(None, description="执行顺序")
    headers: Optional[Dict[str, str]] = Field(None, description="请求头")
    body: Optional[str] = Field(None, description="请求体")
    timeout: Optional[int] = Field(None, description="超时时间(秒)")


class TestScenarioResponse(TestScenarioBase):
    """测试场景响应模式"""
    id: int
    task_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestExecutionBase(BaseModel):
    """测试执行基础模式"""
    execution_name: str = Field(..., description="执行名称")


class TestExecutionCreate(TestExecutionBase):
    """创建测试执行模式"""
    task_id: int = Field(..., description="任务ID")
    strategy_id: int = Field(..., description="策略ID")
    load_generator_id: int = Field(..., description="压力机ID")
    load_generator_config_id: int = Field(..., description="压力机配置ID")


class TestExecutionUpdate(BaseModel):
    """更新测试执行模式"""
    execution_name: Optional[str] = Field(None, description="执行名称")
    status: Optional[str] = Field(None, description="状态")
    total_requests: Optional[int] = Field(None, description="总请求数")
    total_failures: Optional[int] = Field(None, description="总失败数")
    avg_response_time: Optional[float] = Field(None, description="平均响应时间")
    max_response_time: Optional[float] = Field(None, description="最大响应时间")
    min_response_time: Optional[float] = Field(None, description="最小响应时间")
    requests_per_second: Optional[float] = Field(None, description="每秒请求数")
    error_message: Optional[str] = Field(None, description="错误信息")
    error_rate: Optional[float] = Field(None, description="错误率")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    duration: Optional[int] = Field(None, description="实际执行时长(秒)")


class TestExecutionResponse(TestExecutionBase):
    """测试执行响应模式"""
    id: int
    task_id: int
    strategy_id: int
    load_generator_id: int
    load_generator_config_id: int
    status: str
    total_requests: int
    total_failures: int
    avg_response_time: float
    max_response_time: float
    min_response_time: float
    requests_per_second: float
    error_message: Optional[str] = None
    error_rate: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[int] = None

    class Config:
        from_attributes = True


class TestScriptBase(BaseModel):
    """测试脚本基础模式"""
    name: str = Field(..., description="脚本名称")
    content: str = Field(..., description="脚本内容")
    description: Optional[str] = Field(None, description="脚本描述")
    script_language: str = Field(default="python", description="脚本语言")


class TestScriptCreate(TestScriptBase):
    """创建测试脚本模式"""
    pass


class TestScriptUpdate(BaseModel):
    """更新测试脚本模式"""
    name: Optional[str] = Field(None, description="脚本名称")
    content: Optional[str] = Field(None, description="脚本内容")
    description: Optional[str] = Field(None, description="脚本描述")
    script_language: Optional[str] = Field(None, description="脚本语言")
    is_active: Optional[bool] = Field(None, description="是否启用")


class TestScriptResponse(TestScriptBase):
    """测试脚本响应模式"""
    id: int
    version: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestExecutionStartRequest(BaseModel):
    """启动测试执行请求"""
    task_id: int = Field(..., description="任务ID")
    strategy_id: int = Field(..., description="策略ID")
    load_generator_id: int = Field(..., description="压力机ID")
    load_generator_config_id: int = Field(..., description="压力机配置ID")
    execution_name: Optional[str] = Field(None, description="执行名称")


class TestExecutionStopRequest(BaseModel):
    """停止测试执行请求"""
    reason: Optional[str] = Field(None, description="停止原因")


class ScenarioFileBase(BaseModel):
    """场景文件基础模式"""
    file_name: str = Field(..., description="文件名")
    file_size: Optional[int] = Field(None, description="文件大小(字节)")
    file_type: Optional[str] = Field(None, description="文件类型")
    description: Optional[str] = Field(None, description="文件描述")
    is_script: bool = Field(False, description="是否为脚本文件")


class ScenarioFileCreate(ScenarioFileBase):
    """创建场景文件模式"""
    scenario_id: int = Field(..., description="场景ID")


class ScenarioFileUpdate(BaseModel):
    """更新场景文件模式"""
    file_name: Optional[str] = Field(None, description="文件名")
    description: Optional[str] = Field(None, description="文件描述")


class ScenarioFileResponse(ScenarioFileBase):
    """场景文件响应模式"""
    id: int = Field(..., description="文件ID")
    scenario_id: int = Field(..., description="场景ID")
    file_path: str = Field(..., description="文件存储路径")
    file_hash: Optional[str] = Field(None, description="文件MD5哈希值")
    file_content: Optional[str] = Field(None, description="文件内容")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class TestTaskWithScenariosResponse(TestTaskResponse):
    """包含场景详情的测试任务响应"""
    scenarios: List[TestScenarioResponse] = []


class TestExecutionWithDetailsResponse(TestExecutionResponse):
    """包含详细信息的测试执行响应"""
    task: Optional[TestTaskResponse] = None
    strategy: Optional[TestStrategyResponse] = None
    load_generator: Optional[Dict[str, Any]] = None
    load_generator_config: Optional[Dict[str, Any]] = None

