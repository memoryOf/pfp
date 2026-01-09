-- 直接修复test_scenarios表结构
-- 执行方式：docker exec -i pfp-mysql mysql -upfp -ppfp123456 pfp < fix_test_scenarios.sql
-- 或者：mysql -h localhost -P 3306 -u pfp -ppfp123456 pfp < fix_test_scenarios.sql

USE pfp;

-- 添加缺失的列（如果列已存在会报错，可以忽略）
ALTER TABLE test_scenarios ADD COLUMN interface_name VARCHAR(200) NULL COMMENT '接口名称';
ALTER TABLE test_scenarios ADD COLUMN interface_url VARCHAR(500) NULL COMMENT '接口URL';
ALTER TABLE test_scenarios ADD COLUMN method VARCHAR(10) NULL DEFAULT 'GET' COMMENT 'HTTP方法';
ALTER TABLE test_scenarios ADD COLUMN weight INT NULL DEFAULT 1 COMMENT '权重';
ALTER TABLE test_scenarios ADD COLUMN `order` INT NULL DEFAULT 1 COMMENT '执行顺序';
ALTER TABLE test_scenarios ADD COLUMN headers JSON NULL COMMENT '请求头';
ALTER TABLE test_scenarios ADD COLUMN body TEXT NULL COMMENT '请求体';
ALTER TABLE test_scenarios ADD COLUMN timeout INT NULL DEFAULT 30 COMMENT '超时时间(秒)';

-- 如果存在旧的name列，迁移数据到interface_name
UPDATE test_scenarios SET interface_name = name WHERE interface_name IS NULL AND name IS NOT NULL;

-- 设置默认值
UPDATE test_scenarios SET interface_url = COALESCE(interface_url, '/') WHERE interface_url IS NULL;
UPDATE test_scenarios SET method = COALESCE(method, 'GET') WHERE method IS NULL;
UPDATE test_scenarios SET weight = COALESCE(weight, 1) WHERE weight IS NULL;
UPDATE test_scenarios SET `order` = COALESCE(`order`, 1) WHERE `order` IS NULL;
UPDATE test_scenarios SET timeout = COALESCE(timeout, 30) WHERE timeout IS NULL;

-- 修改列约束为非空
ALTER TABLE test_scenarios MODIFY COLUMN interface_name VARCHAR(200) NOT NULL COMMENT '接口名称';
ALTER TABLE test_scenarios MODIFY COLUMN interface_url VARCHAR(500) NOT NULL COMMENT '接口URL';

