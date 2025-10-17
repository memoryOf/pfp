-- 创建场景文件表
CREATE TABLE IF NOT EXISTS scenario_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scenario_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_path VARCHAR(500) NOT NULL COMMENT '文件存储路径',
    file_size INT COMMENT '文件大小(字节)',
    file_type VARCHAR(50) COMMENT '文件类型',
    file_hash VARCHAR(64) COMMENT '文件MD5哈希值',
    file_content TEXT COMMENT '文件内容',
    description TEXT COMMENT '文件描述',
    is_script BOOLEAN DEFAULT FALSE COMMENT '是否为脚本文件',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE,
    INDEX idx_scenario_id (scenario_id),
    INDEX idx_file_name (file_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场景关联文件表';




