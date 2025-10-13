"""
测试管理数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class TestTask(Base):
    """测试任务模型 - 轻量级任务定义"""
    __tablename__ = "test_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="任务名称")
    description = Column(Text, comment="任务描述")
    
    # 场景类型
    scenario_type = Column(String(20), default="single", comment="场景类型: single/multi")
    
    # 基础配置
    target_host = Column(String(255), comment="目标主机")
    script_id = Column(Integer, ForeignKey("test_scripts.id"), comment="测试脚本ID")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 关联关系
    script = relationship("TestScript", back_populates="test_tasks")
    scenarios = relationship("TestScenario", back_populates="task")
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
    strategy_id = Column(Integer, ForeignKey("test_strategies.id"), nullable=False, comment="策略ID")
    load_generator_id = Column(Integer, ForeignKey("load_generators.id"), nullable=False, comment="压力机ID")
    load_generator_config_id = Column(Integer, ForeignKey("load_generator_configs.id"), nullable=False, comment="压力机配置ID")
    
    # 执行信息
    execution_name = Column(String(200), comment="执行名称")
    status = Column(String(20), default="pending", comment="状态: pending/running/completed/failed/cancelled")
    
    # 执行结果（暂时保留，后续会移到TestMetrics）
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
    duration = Column(Integer, comment="实际执行时长(秒)")
    
    # 关联关系
    task = relationship("TestTask", back_populates="executions")
    strategy = relationship("TestStrategy", back_populates="executions")
    load_generator = relationship("LoadGenerator", back_populates="test_executions")
    load_generator_config = relationship("LoadGeneratorConfig")


class TestStrategy(Base):
    """压测策略模型"""
    __tablename__ = "test_strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="策略名称")
    description = Column(Text, comment="策略描述")
    
    # 策略配置
    strategy_type = Column(String(20), default="linear", comment="策略类型: linear/step/adaptive")
    user_count = Column(Integer, default=10, comment="用户数")
    spawn_rate = Column(Integer, default=2, comment="用户生成速率")
    run_time = Column(Integer, default=60, comment="运行时间(秒)")
    ramp_up_time = Column(Integer, default=10, comment="预热时间(秒)")
    
    # 高级配置
    strategy_config = Column(JSON, comment="策略详细配置")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 备注
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # 关联关系
    executions = relationship("TestExecution", back_populates="strategy")


class TestScenario(Base):
    """测试场景详情模型 - 多接口场景中的接口定义"""
    __tablename__ = "test_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("test_tasks.id"), nullable=False, comment="任务ID")
    
    # 接口信息
    interface_name = Column(String(200), nullable=False, comment="接口名称")
    interface_url = Column(String(500), nullable=False, comment="接口URL")
    method = Column(String(10), default="GET", comment="HTTP方法")
    
    # 接口配置
    weight = Column(Integer, default=1, comment="权重")
    order = Column(Integer, default=1, comment="执行顺序")
    headers = Column(JSON, comment="请求头")
    body = Column(Text, comment="请求体")
    timeout = Column(Integer, default=30, comment="超时时间(秒)")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关联关系
    task = relationship("TestTask", back_populates="scenarios")
    files = relationship("ScenarioFile", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioFile(Base):
    """场景关联文件模型"""
    __tablename__ = "scenario_files"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("test_scenarios.id"), nullable=False, comment="场景ID")
    
    # 文件信息
    file_name = Column(String(255), nullable=False, comment="文件名")
    file_path = Column(String(500), nullable=False, comment="文件存储路径")
    file_size = Column(Integer, comment="文件大小(字节)")
    file_type = Column(String(50), comment="文件类型")
    file_hash = Column(String(64), comment="文件MD5哈希值")
    
    # 文件内容（可选，小文件可以直接存储）
    file_content = Column(Text, comment="文件内容")
    
    # 元数据
    description = Column(Text, comment="文件描述")
    is_script = Column(Boolean, default=False, comment="是否为脚本文件")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    
    # 关联关系
    scenario = relationship("TestScenario", back_populates="files")
