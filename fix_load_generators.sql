-- 修复load_generators表结构，允许cpu_cores和memory_gb为NULL
-- 执行方式：docker exec -i pfp-mysql mysql -upfp -ppfp123456 pfp < fix_load_generators.sql

USE pfp;

-- 修改cpu_cores和memory_gb允许为NULL，并修改memory_gb为DECIMAL类型
ALTER TABLE load_generators 
    MODIFY COLUMN cpu_cores INT NULL COMMENT 'CPU核心数',
    MODIFY COLUMN memory_gb DECIMAL(10,2) NULL COMMENT '内存大小(GB)';

-- 修改status字段类型（从ENUM改为VARCHAR，以支持更多状态值）
ALTER TABLE load_generators 
    MODIFY COLUMN status VARCHAR(20) NULL DEFAULT 'offline' COMMENT '状态: online/offline/maintenance';

-- 添加缺失的字段（如果列已存在会报错，可以忽略）
ALTER TABLE load_generators ADD COLUMN network_bandwidth VARCHAR(50) NULL COMMENT '网络带宽';
ALTER TABLE load_generators ADD COLUMN disk_space VARCHAR(50) NULL COMMENT '磁盘空间';
ALTER TABLE load_generators ADD COLUMN ssh_key_path VARCHAR(500) NULL COMMENT 'SSH密钥路径';
ALTER TABLE load_generators ADD COLUMN last_heartbeat DATETIME NULL COMMENT '最后心跳时间';
ALTER TABLE load_generators ADD COLUMN cpu_usage DECIMAL(5,2) NULL DEFAULT 0.0 COMMENT 'CPU使用率';
ALTER TABLE load_generators ADD COLUMN memory_usage DECIMAL(5,2) NULL DEFAULT 0.0 COMMENT '内存使用率';
ALTER TABLE load_generators ADD COLUMN network_usage DECIMAL(5,2) NULL DEFAULT 0.0 COMMENT '网络使用率';
ALTER TABLE load_generators ADD COLUMN locust_version VARCHAR(20) NULL COMMENT 'Locust版本';
ALTER TABLE load_generators ADD COLUMN python_version VARCHAR(20) NULL COMMENT 'Python版本';
ALTER TABLE load_generators ADD COLUMN system_info JSON NULL COMMENT '系统信息';
ALTER TABLE load_generators ADD COLUMN description TEXT NULL COMMENT '备注说明';
ALTER TABLE load_generators ADD COLUMN is_active BOOLEAN NULL DEFAULT TRUE COMMENT '是否启用';

-- 如果存在private_key字段，重命名为ssh_key_path（如果ssh_key_path不存在）
-- ALTER TABLE load_generators CHANGE COLUMN private_key ssh_key_path VARCHAR(500) NULL COMMENT 'SSH密钥路径';

-- 如果存在disk_gb字段，可以删除（因为已改为disk_space）
-- ALTER TABLE load_generators DROP COLUMN disk_gb;
