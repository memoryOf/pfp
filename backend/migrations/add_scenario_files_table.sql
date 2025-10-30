-- 创建scenario_files_new表
CREATE TABLE IF NOT EXISTS scenario_files_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scenario_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_path VARCHAR(500) NOT NULL COMMENT 'MinIO文件路径',
    file_size INT NOT NULL COMMENT '文件大小(字节)',
    file_type VARCHAR(50) COMMENT '文件类型',
    content_type VARCHAR(100) COMMENT 'MIME类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_scenario_id (scenario_id),
    INDEX idx_file_name (file_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场景文件表';

-- 如果需要，可以删除scenarios表中的script_files字段（如果存在）
-- ALTER TABLE scenarios DROP COLUMN IF EXISTS script_files;