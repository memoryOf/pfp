-- 创建 task_scenario_references 表
CREATE TABLE IF NOT EXISTS `task_scenario_references` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL COMMENT '任务ID',
  `scenario_id` INT NOT NULL COMMENT '场景ID',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_scenario` (`task_id`, `scenario_id`),
  KEY `idx_task_scenario_references_task_id` (`task_id`),
  KEY `idx_task_scenario_references_scenario_id` (`scenario_id`),
  CONSTRAINT `fk_task_scenario_ref_task` FOREIGN KEY (`task_id`) REFERENCES `test_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_scenario_ref_scenario` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务场景关联表';


