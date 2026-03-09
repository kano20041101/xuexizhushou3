-- 创建知识点关联关系表
CREATE TABLE IF NOT EXISTS `knowledge_relation` (
  `relation_id` INT NOT NULL AUTO_INCREMENT COMMENT '关联ID（自增）',
  `source_kp_id` INT NOT NULL COMMENT '源知识点ID',
  `target_kp_id` INT NOT NULL COMMENT '目标知识点ID',
  `relation_type` VARCHAR(50) NOT NULL COMMENT '关联类型（如：前置知识、相关概念、应用场景等）',
  `strength` INT NOT NULL DEFAULT 1 COMMENT '关联强度（1-5）',
  `description` TEXT NULL COMMENT '关联描述',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`relation_id`),
  INDEX `source_kp_id` (`source_kp_id`),
  INDEX `target_kp_id` (`target_kp_id`),
  CONSTRAINT `knowledge_relation_ibfk_1` FOREIGN KEY (`source_kp_id`) REFERENCES `knowledge_point` (`kp_id`) ON DELETE CASCADE,
  CONSTRAINT `knowledge_relation_ibfk_2` FOREIGN KEY (`target_kp_id`) REFERENCES `knowledge_point` (`kp_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT '知识点关联关系表';