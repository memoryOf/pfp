-- 修复test_scenarios表结构以匹配代码模型（简化版）
-- 执行此SQL脚本前请先备份数据库
-- 如果列已存在，会报错，可以安全忽略

-- 添加interface_name列
ALTER TABLE test_scenarios 
    ADD COLUMN interface_name VARCHAR(200) NULL COMMENT '接口名称';

-- 添加interface_url列
ALTER TABLE test_scenarios 
    ADD COLUMN interface_url VARCHAR(500) NULL COMMENT '接口URL';

-- 添加method列
ALTER TABLE test_scenarios 
    ADD COLUMN method VARCHAR(10) NULL DEFAULT 'GET' COMMENT 'HTTP方法';

-- 添加weight列
ALTER TABLE test_scenarios 
    ADD COLUMN weight INT NULL DEFAULT 1 COMMENT '权重';

-- 添加order列（注意order是MySQL关键字，需要用反引号）
ALTER TABLE test_scenarios 
    ADD COLUMN `order` INT NULL DEFAULT 1 COMMENT '执行顺序';

-- 添加headers列
ALTER TABLE test_scenarios 
    ADD COLUMN headers JSON NULL COMMENT '请求头';

-- 添加body列
ALTER TABLE test_scenarios 
    ADD COLUMN body TEXT NULL COMMENT '请求体';

-- 添加timeout列
ALTER TABLE test_scenarios 
    ADD COLUMN timeout INT NULL DEFAULT 30 COMMENT '超时时间(秒)';

-- 如果存在旧的name列，迁移数据到interface_name
UPDATE test_scenarios 
SET interface_name = name 
WHERE interface_name IS NULL AND name IS NOT NULL;

-- 设置默认值
UPDATE test_scenarios 
SET interface_url = COALESCE(interface_url, '/');

UPDATE test_scenarios 
SET method = COALESCE(method, 'GET');

UPDATE test_scenarios 
SET weight = COALESCE(weight, 1);

UPDATE test_scenarios 
SET `order` = COALESCE(`order`, 1);

UPDATE test_scenarios 
SET timeout = COALESCE(timeout, 30);

-- 修改列约束为非空（在数据迁移完成后）
ALTER TABLE test_scenarios 
    MODIFY COLUMN interface_name VARCHAR(200) NOT NULL COMMENT '接口名称',
    MODIFY COLUMN interface_url VARCHAR(500) NOT NULL COMMENT '接口URL';

