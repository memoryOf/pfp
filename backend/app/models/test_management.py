"""
测试管理数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class TestTask(Base):
    """测试任务模型"""
    __tablename__ = "test_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="任务名称")
    description = Column(Text, comment="任务描述")
    
    # 任务状态
    status = Column(String(20), default="draft", comment="状态: draft/running/completed/failed/cancelled")
    
    # 关联信息
    load_generator_id = Column(Integer, ForeignKey("load_generators.id"), comment="压测机ID")
    load_generator_config_id = Column(Integer, ForeignKey("load_generator_configs.id"), comment="压测机配置ID")
    script_id = Column(Integer, ForeignKey("test_scripts.id"), comment="测试脚本ID")
    
    # 测试配置
    target_host = Column(String(255), comment="目标主机")
    user_count = Column(Integer, default=10, comment="用户数")
    spawn_rate = Column(Integer, default=2, comment="用户生成速率")
    run_time = Column(String(50), comment="运行时间")
    
    # 测试策略
    test_strategy = Column(String(50), default="single", comment="测试策略: single/progressive/adaptive")
    strategy_config = Column(JSON, comment="策略配置")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    
    # 备注
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 关联关系
    load_generator = relationship("LoadGenerator", back_populates="test_tasks")
    load_generator_config = relationship("LoadGeneratorConfig")
    script = relationship("TestScript", back_populates="test_tasks")
    executions = relationship("TestExecution", back_populates="task")


class TestScript(Base):
    """测试脚本模型"""
    __tablename__ = "test_scripts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="脚本名称")
    description = Column(Text, comment="脚本描述")
    
    # 脚本内容
    script_content = Column(Text, nullable=False, comment="脚本内容")
    script_type = Column(String(20), default="locust", comment="脚本类型: locust/custom")
    
    # AI生成信息
    is_ai_generated = Column(Boolean, default=False, comment="是否AI生成")
    ai_prompt = Column(Text, comment="AI生成提示")
    ai_model = Column(String(50), comment="AI模型")
    
    # 脚本配置
    target_host = Column(String(255), comment="目标主机")
    wait_time_min = Column(Float, default=1.0, comment="最小等待时间")
    wait_time_max = Column(Float, default=2.0, comment="最大等待时间")
    
    # 版本控制
    version = Column(String(20), default="1.0.0", comment="版本号")
    parent_script_id = Column(Integer, ForeignKey("test_scripts.id"), comment="父脚本ID")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 关联关系
    test_tasks = relationship("TestTask", back_populates="script")
    parent_script = relationship("TestScript", remote_side=[id])


class TestExecution(Base):
    """测试执行记录模型"""
    __tablename__ = "test_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("test_tasks.id"), nullable=False, comment="任务ID")
    
    # 执行信息
    execution_name = Column(String(200), comment="执行名称")
    status = Column(String(20), default="pending", comment="状态: pending/running/completed/failed/cancelled")
    
    # 执行配置
    user_count = Column(Integer, comment="用户数")
    spawn_rate = Column(Integer, comment="用户生成速率")
    run_time = Column(String(50), comment="运行时间")
    
    # 执行结果
    total_requests = Column(Integer, default=0, comment="总请求数")
    total_failures = Column(Integer, default=0, comment="总失败数")
    avg_response_time = Column(Float, default=0.0, comment="平均响应时间")
    max_response_time = Column(Float, default=0.0, comment="最大响应时间")
    min_response_time = Column(Float, default=0.0, comment="最小响应时间")
    requests_per_second = Column(Float, default=0.0, comment="每秒请求数")
    
    # 错误信息
    error_message = Column(Text, comment="错误信息")
    error_rate = Column(Float, default=0.0, comment="错误率")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    
    # 关联关系
    task = relationship("TestTask", back_populates="executions")


class TestScenario(Base):
    """测试场景模型"""
    __tablename__ = "test_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="场景名称")
    description = Column(Text, comment="场景描述")
    
    # 场景配置
    scenario_type = Column(String(50), default="api", comment="场景类型: api/web/mobile")
    target_apis = Column(JSON, comment="目标API列表")
    
    # 测试参数
    test_parameters = Column(JSON, comment="测试参数")
    expected_results = Column(JSON, comment="预期结果")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    is_active = Column(Boolean, default=True, comment="是否启用")
