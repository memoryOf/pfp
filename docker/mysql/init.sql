-- 性能测试平台数据库初始化脚本

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS pfp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE pfp;

-- 创建压测机表
CREATE TABLE IF NOT EXISTS load_generators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '压测机名称',
    host VARCHAR(255) NOT NULL COMMENT '主机地址',
    port INT NOT NULL DEFAULT 22 COMMENT 'SSH端口',
    username VARCHAR(100) NOT NULL COMMENT 'SSH用户名',
    password VARCHAR(255) COMMENT 'SSH密码',
    private_key TEXT COMMENT 'SSH私钥',
    status ENUM('active', 'inactive', 'error') DEFAULT 'inactive' COMMENT '状态',
    cpu_cores INT NOT NULL COMMENT 'CPU核心数',
    memory_gb INT NOT NULL COMMENT '内存大小(GB)',
    disk_gb INT NOT NULL COMMENT '磁盘大小(GB)',
    os_info JSON COMMENT '操作系统信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_host (host)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='压测机表';

-- 创建压测机配置表
CREATE TABLE IF NOT EXISTS load_generator_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    load_generator_id INT NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT '配置名称',
    master_cores INT NOT NULL COMMENT 'Master核心数',
    worker_cores INT NOT NULL COMMENT '每个Worker核心数',
    worker_count INT NOT NULL COMMENT 'Worker数量',
    total_cores INT NOT NULL COMMENT '总核心数',
    memory_allocation JSON COMMENT '内存分配配置',
    is_active BOOLEAN DEFAULT FALSE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (load_generator_id) REFERENCES load_generators(id) ON DELETE CASCADE,
    INDEX idx_load_generator_id (load_generator_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='压测机配置表';

-- 创建测试任务表
CREATE TABLE IF NOT EXISTS test_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '任务名称',
    description TEXT COMMENT '任务描述',
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试任务表';

-- 创建测试场景表
CREATE TABLE IF NOT EXISTS test_scenarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT '场景名称',
    script_content TEXT NOT NULL COMMENT '脚本内容',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES test_tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试场景表';

-- 创建测试脚本表
CREATE TABLE IF NOT EXISTS test_scripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '脚本名称',
    content TEXT NOT NULL COMMENT '脚本内容',
    version VARCHAR(50) DEFAULT '1.0.0' COMMENT '版本号',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试脚本表';

-- 创建测试结果表
CREATE TABLE IF NOT EXISTS test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    execution_id VARCHAR(255) NOT NULL COMMENT '执行ID',
    status ENUM('running', 'completed', 'failed') DEFAULT 'running' COMMENT '状态',
    start_time TIMESTAMP NULL COMMENT '开始时间',
    end_time TIMESTAMP NULL COMMENT '结束时间',
    total_requests INT DEFAULT 0 COMMENT '总请求数',
    successful_requests INT DEFAULT 0 COMMENT '成功请求数',
    failed_requests INT DEFAULT 0 COMMENT '失败请求数',
    avg_response_time DECIMAL(10,3) DEFAULT 0 COMMENT '平均响应时间(ms)',
    max_response_time DECIMAL(10,3) DEFAULT 0 COMMENT '最大响应时间(ms)',
    min_response_time DECIMAL(10,3) DEFAULT 0 COMMENT '最小响应时间(ms)',
    requests_per_second DECIMAL(10,3) DEFAULT 0 COMMENT '每秒请求数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES test_tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_execution_id (execution_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试结果表';

-- 创建测试执行表
CREATE TABLE IF NOT EXISTS test_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    result_id INT NOT NULL,
    load_generator_id INT NOT NULL,
    config_id INT NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending' COMMENT '状态',
    start_time TIMESTAMP NULL COMMENT '开始时间',
    end_time TIMESTAMP NULL COMMENT '结束时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES test_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (result_id) REFERENCES test_results(id) ON DELETE CASCADE,
    FOREIGN KEY (load_generator_id) REFERENCES load_generators(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES load_generator_configs(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_result_id (result_id),
    INDEX idx_load_generator_id (load_generator_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试执行表';

-- 插入示例数据
INSERT INTO load_generators (name, host, port, username, password, cpu_cores, memory_gb, disk_gb, status) VALUES
('测试压测机1', '192.168.1.100', 22, 'root', 'password123', 8, 16, 100, 'inactive'),
('测试压测机2', '192.168.1.101', 22, 'root', 'password123', 4, 8, 50, 'inactive');

INSERT INTO load_generator_configs (load_generator_id, name, master_cores, worker_cores, worker_count, total_cores) VALUES
(1, '1M+2W配置', 1, 2, 2, 5),
(1, '1M+3W配置', 1, 2, 3, 7),
(2, '1M+1W配置', 1, 1, 1, 2);

INSERT INTO test_tasks (name, description, status) VALUES
('API压力测试', '测试用户登录API的性能', 'pending'),
('数据库压力测试', '测试数据库查询性能', 'pending');

INSERT INTO test_scripts (name, content, version) VALUES
('用户登录测试', 'from locust import HttpUser, task\n\nclass UserBehavior(HttpUser):\n    @task\n    def login(self):\n        self.client.post("/api/login", json={"username": "test", "password": "test"})', '1.0.0'),
('API查询测试', 'from locust import HttpUser, task\n\nclass ApiBehavior(HttpUser):\n    @task\n    def get_data(self):\n        self.client.get("/api/data")', '1.0.0');


