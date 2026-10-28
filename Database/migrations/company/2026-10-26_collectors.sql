-- Company-local Collectors configuration and execution queue.
CREATE TABLE `collectors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(1000) NULL,
  `collector_type` VARCHAR(50) NOT NULL DEFAULT 'POLLING',
  `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
  `tags` JSON NOT NULL,
  `config_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(64) NULL,
  `updated_by` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collectors_code` (`code`),
  KEY `idx_collectors_service_id` (`service_id`),
  KEY `idx_collectors_status` (`status`, `updated_at`),
  CONSTRAINT `fk_collectors_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_targets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `equipment_id` BIGINT UNSIGNED NULL,
  `target_identifier` VARCHAR(255) NOT NULL,
  `target_config` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_target_identifier` (`collector_id`, `target_identifier`),
  KEY `idx_collector_targets_equipment` (`equipment_id`),
  CONSTRAINT `fk_collector_targets_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `extraction_method_id` BIGINT UNSIGNED NOT NULL,
  `method_version_id` BIGINT UNSIGNED NULL,
  `execution_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `parameters` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_method` (`collector_id`, `extraction_method_id`),
  KEY `idx_collector_methods_method` (`extraction_method_id`),
  KEY `idx_collector_methods_version` (`method_version_id`),
  CONSTRAINT `fk_collector_methods_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_methods_method` FOREIGN KEY (`extraction_method_id`)
    REFERENCES `extraction_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_methods_method_version` FOREIGN KEY (`method_version_id`)
    REFERENCES `extraction_method_versions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `schedule_type` ENUM('INTERVAL', 'CRON', 'MANUAL', 'EVENT') NOT NULL,
  `interval_seconds` INT UNSIGNED NULL,
  `cron_expression` VARCHAR(120) NULL,
  `timezone` VARCHAR(80) NOT NULL DEFAULT 'UTC',
  `start_at` DATETIME(3) NULL,
  `end_at` DATETIME(3) NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_collector_schedules_due` (`collector_id`, `is_enabled`),
  CONSTRAINT `fk_collector_schedules_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_collector_schedule_interval` CHECK (
    (`schedule_type` = 'INTERVAL' AND `interval_seconds` IS NOT NULL AND `interval_seconds` > 0)
    OR (`schedule_type` <> 'INTERVAL' AND `interval_seconds` IS NULL)
  ),
  CONSTRAINT `ck_collector_schedule_cron` CHECK (
    (`schedule_type` = 'CRON' AND `cron_expression` IS NOT NULL AND `cron_expression` <> '')
    OR (`schedule_type` <> 'CRON' AND `cron_expression` IS NULL)
  ),
  CONSTRAINT `ck_collector_schedule_window` CHECK (`end_at` IS NULL OR `start_at` IS NULL OR `end_at` > `start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_transformations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `execution_order` INT UNSIGNED NOT NULL,
  `transformation_type` ENUM('RENAME_FIELD', 'CAST_TYPE', 'UNIT_CONVERSION', 'FILTER', 'MAP_VALUE', 'CALCULATE', 'DELTA', 'RATE', 'TIMESTAMP_NORMALIZATION') NOT NULL,
  `configuration` JSON NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_transformation_order` (`collector_id`, `execution_order`),
  CONSTRAINT `fk_collector_transformations_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_field_mappings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `source_field` VARCHAR(255) NOT NULL,
  `destination_field` VARCHAR(255) NOT NULL,
  `destination_type` VARCHAR(50) NOT NULL,
  `transformation_config` JSON NOT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_field_mapping` (`collector_id`, `source_field`),
  KEY `idx_collector_mapping_destination` (`collector_id`, `destination_field`),
  CONSTRAINT `fk_collector_field_mappings_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_destinations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `destination_type` ENUM('SERVER_STORAGE', 'LOCAL_TEMPORARY_STORAGE') NOT NULL,
  `destination_reference` VARCHAR(255) NOT NULL,
  `storage_config` JSON NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_destination` (`collector_id`, `destination_type`, `destination_reference`),
  CONSTRAINT `fk_collector_destinations_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_policies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `timeout_ms` INT UNSIGNED NOT NULL DEFAULT 60000,
  `max_retries` SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  `retry_delay_ms` INT UNSIGNED NOT NULL DEFAULT 1000,
  `backoff_strategy` ENUM('FIXED', 'EXPONENTIAL') NOT NULL DEFAULT 'EXPONENTIAL',
  `max_concurrency` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `overlap_policy` ENUM('SKIP', 'QUEUE', 'CANCEL_PREVIOUS') NOT NULL DEFAULT 'SKIP',
  `batch_size` INT UNSIGNED NOT NULL DEFAULT 1000,
  `retention_policy_reference` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_policies_collector` (`collector_id`),
  CONSTRAINT `fk_collector_policies_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_collector_policy_timeout` CHECK (`timeout_ms` BETWEEN 100 AND 3600000),
  CONSTRAINT `ck_collector_policy_retries` CHECK (`max_retries` <= 20),
  CONSTRAINT `ck_collector_policy_concurrency` CHECK (`max_concurrency` BETWEEN 1 AND 100),
  CONSTRAINT `ck_collector_policy_batch` CHECK (`batch_size` BETWEEN 1 AND 100000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `configuration_snapshot` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_versions_number` (`collector_id`, `version_number`),
  CONSTRAINT `fk_collector_versions_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_executions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `collector_version` INT UNSIGNED NOT NULL,
  `trigger_type` ENUM('MANUAL', 'SCHEDULE', 'EVENT', 'RETRY') NOT NULL,
  `status` ENUM('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `started_at` DATETIME(3) NULL,
  `finished_at` DATETIME(3) NULL,
  `duration_ms` BIGINT UNSIGNED NULL,
  `records_collected` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `records_processed` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `records_stored` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `error_code` VARCHAR(100) NULL,
  `error_message` VARCHAR(1000) NULL,
  `requested_by` VARCHAR(64) NULL,
  `lease_owner` VARCHAR(128) NULL,
  `lease_until` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_collector_execution_history` (`collector_id`, `requested_at`),
  KEY `idx_collector_execution_queue` (`status`, `requested_at`, `lease_until`),
  CONSTRAINT `fk_collector_executions_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_executions_version` FOREIGN KEY (`collector_id`, `collector_version`)
    REFERENCES `collector_versions` (`collector_id`, `version_number`) ON DELETE RESTRICT,
  CONSTRAINT `ck_collector_execution_finish` CHECK (`finished_at` IS NULL OR `started_at` IS NULL OR `finished_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_execution_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `execution_id` BIGINT UNSIGNED NOT NULL,
  `collector_method_id` BIGINT UNSIGNED NULL,
  `collector_target_id` BIGINT UNSIGNED NULL,
  `status` ENUM('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED') NOT NULL,
  `started_at` DATETIME(3) NULL,
  `finished_at` DATETIME(3) NULL,
  `records_collected` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `records_stored` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `error_code` VARCHAR(100) NULL,
  `error_message` VARCHAR(1000) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_collector_execution_details_execution` (`execution_id`),
  CONSTRAINT `fk_collector_execution_details_execution` FOREIGN KEY (`execution_id`)
    REFERENCES `collector_executions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_execution_details_method` FOREIGN KEY (`collector_method_id`)
    REFERENCES `collector_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_execution_details_target` FOREIGN KEY (`collector_target_id`)
    REFERENCES `collector_targets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collector_checkpoints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `collector_method_id` BIGINT UNSIGNED NULL,
  `collector_target_id` BIGINT UNSIGNED NULL,
  `method_scope_id` BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(`collector_method_id`, 0)) STORED,
  `target_scope_id` BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(`collector_target_id`, 0)) STORED,
  `checkpoint_key` VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
  `checkpoint_value` JSON NOT NULL,
  `lock_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collector_checkpoint_scope` (`collector_id`, `method_scope_id`, `target_scope_id`, `checkpoint_key`),
  KEY `idx_collector_checkpoints_method` (`collector_method_id`),
  KEY `idx_collector_checkpoints_target` (`collector_target_id`),
  CONSTRAINT `fk_collector_checkpoints_collector` FOREIGN KEY (`collector_id`)
    REFERENCES `collectors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_checkpoints_method` FOREIGN KEY (`collector_method_id`)
    REFERENCES `collector_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collector_checkpoints_target` FOREIGN KEY (`collector_target_id`)
    REFERENCES `collector_targets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE PROCEDURE `sp_collector_validate_references`(
  IN p_service_id BIGINT UNSIGNED, IN p_methods JSON
)
BEGIN
  DECLARE v_driver_key VARCHAR(100);
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_service_id AND `is_active` = TRUE) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE';
  END IF;
  SELECT `driver_key` INTO v_driver_key FROM `services` WHERE `id` = p_service_id;
  IF p_methods IS NOT NULL AND JSON_TYPE(p_methods) <> 'ARRAY' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_METHODS_MUST_BE_ARRAY';
  END IF;
  IF p_methods IS NOT NULL AND EXISTS (
    SELECT 1 FROM JSON_TABLE(p_methods, '$[*]' COLUMNS (
      method_id BIGINT UNSIGNED PATH '$.extractionMethodId',
      method_version_id BIGINT UNSIGNED PATH '$.methodVersionId' NULL ON EMPTY
    )) requested
    LEFT JOIN `extraction_methods` method ON method.`id` = requested.method_id
    LEFT JOIN `extraction_method_versions` version ON version.`id` = requested.method_version_id
      AND version.`extraction_method_id` = requested.method_id
    WHERE method.`id` IS NULL OR method.`is_active` = FALSE
      OR (requested.method_version_id IS NOT NULL AND version.`id` IS NULL)
      OR NOT (
        LOWER(method.`protocol`) COLLATE utf8mb4_unicode_ci = LOWER(v_driver_key) COLLATE utf8mb4_unicode_ci
        OR (v_driver_key = 'http' AND LOWER(method.`protocol`) COLLATE utf8mb4_unicode_ci IN ('http', 'rest_api'))
        OR (v_driver_key = 'microsoft-graph' AND LOWER(method.`protocol`) COLLATE utf8mb4_unicode_ci IN ('microsoft_graph', 'teams', 'outlook'))
      )
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_METHOD_INVALID_OR_INCOMPATIBLE';
  END IF;
END$$

CREATE PROCEDURE `sp_collector_get_configuration`(IN p_collector_id BIGINT UNSIGNED)
BEGIN
  SELECT c.`id` AS `collectorId`, c.`service_id` AS `serviceId`, c.`config_version` AS `configVersion`,
    JSON_OBJECT(
      'targets', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', t.`id`, 'equipmentId', t.`equipment_id`, 'targetIdentifier', t.`target_identifier`,
        'targetConfig', t.`target_config`, 'isActive', t.`is_active`
      )), JSON_ARRAY()) FROM `collector_targets` t WHERE t.`collector_id` = c.`id`),
      'methods', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', m.`id`, 'extractionMethodId', m.`extraction_method_id`, 'methodVersionId', m.`method_version_id`,
        'executionOrder', m.`execution_order`, 'parameters', m.`parameters`, 'isActive', m.`is_active`
      )), JSON_ARRAY()) FROM `collector_methods` m WHERE m.`collector_id` = c.`id`),
      'schedules', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', s.`id`, 'scheduleType', s.`schedule_type`, 'intervalSeconds', s.`interval_seconds`,
        'cronExpression', s.`cron_expression`, 'timezone', s.`timezone`, 'startAt', s.`start_at`,
        'endAt', s.`end_at`, 'isEnabled', s.`is_enabled`
      )), JSON_ARRAY()) FROM `collector_schedules` s WHERE s.`collector_id` = c.`id`),
      'transformations', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', x.`id`, 'executionOrder', x.`execution_order`, 'transformationType', x.`transformation_type`,
        'configuration', x.`configuration`, 'isEnabled', x.`is_enabled`
      )), JSON_ARRAY()) FROM `collector_transformations` x WHERE x.`collector_id` = c.`id`),
      'fieldMappings', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', f.`id`, 'sourceField', f.`source_field`, 'destinationField', f.`destination_field`,
        'destinationType', f.`destination_type`, 'transformationConfig', f.`transformation_config`,
        'isRequired', f.`is_required`
      )), JSON_ARRAY()) FROM `collector_field_mappings` f WHERE f.`collector_id` = c.`id`),
      'destinations', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'id', d.`id`, 'destinationType', d.`destination_type`, 'destinationReference', d.`destination_reference`,
        'storageConfig', d.`storage_config`, 'isEnabled', d.`is_enabled`
      )), JSON_ARRAY()) FROM `collector_destinations` d WHERE d.`collector_id` = c.`id`),
      'policies', (SELECT JSON_OBJECT(
        'timeoutMs', p.`timeout_ms`, 'maxRetries', p.`max_retries`, 'retryDelayMs', p.`retry_delay_ms`,
        'backoffStrategy', p.`backoff_strategy`, 'maxConcurrency', p.`max_concurrency`,
        'overlapPolicy', p.`overlap_policy`, 'batchSize', p.`batch_size`,
        'retentionPolicyReference', p.`retention_policy_reference`
      ) FROM `collector_policies` p WHERE p.`collector_id` = c.`id` LIMIT 1)
    ) AS `configuration`
  FROM `collectors` c WHERE c.`id` = p_collector_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_collector_list`(
  IN p_search VARCHAR(150), IN p_service_id BIGINT UNSIGNED, IN p_status VARCHAR(20),
  IN p_page INT UNSIGNED, IN p_page_size INT UNSIGNED
)
BEGIN
  DECLARE v_limit INT UNSIGNED DEFAULT 50;
  DECLARE v_offset BIGINT UNSIGNED DEFAULT 0;
  SET v_limit = LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
  SET v_offset = (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_limit;
  SELECT c.`id`, c.`service_id` AS `serviceId`, s.`name` AS `serviceName`, c.`code`, c.`name`,
    c.`description`, c.`collector_type` AS `collectorType`, c.`status`, c.`tags`,
    c.`config_version` AS `configVersion`, c.`created_at` AS `createdAt`, c.`updated_at` AS `updatedAt`,
    (SELECT e.`status` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionStatus`,
    (SELECT e.`finished_at` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionAt`
  FROM `collectors` c INNER JOIN `services` s ON s.`id` = c.`service_id`
  WHERE (p_search IS NULL OR c.`name` LIKE CONCAT('%', p_search, '%') OR c.`code` LIKE CONCAT('%', p_search, '%'))
    AND (p_service_id IS NULL OR c.`service_id` = p_service_id)
    AND (p_status IS NULL OR c.`status` = p_status)
  ORDER BY c.`name`, c.`id` LIMIT v_limit OFFSET v_offset;
END$$

CREATE PROCEDURE `sp_collector_get`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT c.`id`, c.`service_id` AS `serviceId`, s.`name` AS `serviceName`, c.`code`, c.`name`,
    c.`description`, c.`collector_type` AS `collectorType`, c.`status`, c.`tags`,
    c.`config_version` AS `configVersion`, c.`created_at` AS `createdAt`, c.`updated_at` AS `updatedAt`,
    c.`created_by` AS `createdBy`, c.`updated_by` AS `updatedBy`,
    (SELECT e.`status` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionStatus`,
    (SELECT e.`finished_at` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionAt`
  FROM `collectors` c INNER JOIN `services` s ON s.`id` = c.`service_id`
  WHERE c.`id` = p_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_collector_create`(
  IN p_service_id BIGINT UNSIGNED, IN p_code VARCHAR(100), IN p_name VARCHAR(150),
  IN p_description VARCHAR(1000), IN p_collector_type VARCHAR(50), IN p_status VARCHAR(20),
  IN p_tags LONGTEXT, IN p_created_by VARCHAR(64)
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_service_id AND `is_active` = TRUE) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE';
  END IF;
  IF p_status NOT IN ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_STATUS_INVALID';
  END IF;
  IF NOT JSON_VALID(p_tags) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_TAGS_INVALID_JSON'; END IF;
  START TRANSACTION;
  INSERT INTO `collectors` (`service_id`, `code`, `name`, `description`, `collector_type`, `status`, `tags`, `created_by`, `updated_by`)
  VALUES (p_service_id, p_code, p_name, p_description, COALESCE(NULLIF(p_collector_type, ''), 'POLLING'), p_status, CAST(p_tags AS JSON), p_created_by, p_created_by);
  SET v_id = LAST_INSERT_ID();
  INSERT INTO `collector_policies` (`collector_id`) VALUES (v_id);
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
  VALUES (v_id, 1, JSON_OBJECT('serviceId', p_service_id, 'code', p_code, 'name', p_name,
    'description', p_description, 'collectorType', p_collector_type, 'status', p_status,
    'tags', CAST(p_tags AS JSON)), p_created_by);
  COMMIT;
  CALL `sp_collector_get`(v_id);
END$$

CREATE PROCEDURE `sp_collector_update`(
  IN p_id BIGINT UNSIGNED, IN p_service_id BIGINT UNSIGNED, IN p_has_service_id BOOLEAN,
  IN p_code VARCHAR(100), IN p_has_code BOOLEAN, IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_description VARCHAR(1000), IN p_has_description BOOLEAN,
  IN p_collector_type VARCHAR(50), IN p_has_collector_type BOOLEAN,
  IN p_status VARCHAR(20), IN p_has_status BOOLEAN, IN p_tags LONGTEXT, IN p_has_tags BOOLEAN,
  IN p_updated_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE v_service_id BIGINT UNSIGNED;
  DECLARE v_methods JSON;
  DECLARE v_snapshot JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  IF p_has_service_id AND NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_service_id AND `is_active` = TRUE) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE';
  END IF;
  IF p_has_status AND p_status NOT IN ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_STATUS_INVALID'; END IF;
  IF p_has_tags AND NOT JSON_VALID(p_tags) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_TAGS_INVALID_JSON'; END IF;
  IF p_has_service_id AND EXISTS (SELECT 1 FROM `collector_executions` WHERE `collector_id` = p_id AND `status` IN ('QUEUED', 'RUNNING')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_HAS_ACTIVE_EXECUTIONS';
  END IF;
  IF p_has_service_id THEN
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'extractionMethodId', `extraction_method_id`, 'methodVersionId', `method_version_id`
    )), JSON_ARRAY()) INTO v_methods FROM `collector_methods` WHERE `collector_id` = p_id;
    CALL `sp_collector_validate_references`(p_service_id, v_methods);
  END IF;
  START TRANSACTION;
  UPDATE `collectors` SET
    `service_id` = IF(p_has_service_id, p_service_id, `service_id`),
    `code` = IF(p_has_code, p_code, `code`),
    `name` = IF(p_has_name, p_name, `name`),
    `description` = IF(p_has_description, p_description, `description`),
    `collector_type` = IF(p_has_collector_type, p_collector_type, `collector_type`),
    `status` = IF(p_has_status, p_status, `status`),
    `tags` = IF(p_has_tags, CAST(p_tags AS JSON), `tags`), `updated_by` = p_updated_by
  WHERE `id` = p_id;
  SELECT `config_version`, `service_id` INTO v_version, v_service_id FROM `collectors` WHERE `id` = p_id;
  SET v_version = v_version + 1;
  UPDATE `collectors` SET `config_version` = v_version WHERE `id` = p_id;
  SELECT JSON_OBJECT('serviceId', c.`service_id`, 'code', c.`code`, 'name', c.`name`,
    'description', c.`description`, 'collectorType', c.`collector_type`, 'status', c.`status`, 'tags', c.`tags`)
    INTO v_snapshot FROM `collectors` c WHERE c.`id` = p_id;
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
    VALUES (p_id, v_version, v_snapshot, p_updated_by);
  COMMIT;
  CALL `sp_collector_get`(p_id);
END$$

CREATE PROCEDURE `sp_collector_set_status`(IN p_id BIGINT UNSIGNED, IN p_status VARCHAR(20), IN p_updated_by VARCHAR(64))
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE v_snapshot JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF p_status NOT IN ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_STATUS_INVALID'; END IF;
  START TRANSACTION;
  UPDATE `collectors` SET `status` = p_status, `updated_by` = p_updated_by WHERE `id` = p_id;
  IF ROW_COUNT() = 0 AND NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  SELECT `config_version` + 1 INTO v_version FROM `collectors` WHERE `id` = p_id;
  UPDATE `collectors` SET `config_version` = v_version WHERE `id` = p_id;
  SELECT JSON_OBJECT('serviceId', c.`service_id`, 'code', c.`code`, 'name', c.`name`,
    'description', c.`description`, 'collectorType', c.`collector_type`, 'status', c.`status`, 'tags', c.`tags`)
    INTO v_snapshot FROM `collectors` c WHERE c.`id` = p_id;
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
    VALUES (p_id, v_version, v_snapshot, p_updated_by);
  COMMIT;
  CALL `sp_collector_get`(p_id);
END$$

CREATE PROCEDURE `sp_collector_save_configuration`(
  IN p_id BIGINT UNSIGNED, IN p_configuration LONGTEXT, IN p_updated_by VARCHAR(64)
)
BEGIN
  DECLARE v_service_id BIGINT UNSIGNED;
  DECLARE v_version INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT JSON_VALID(p_configuration) OR JSON_TYPE(p_configuration) <> 'OBJECT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CONFIGURATION_INVALID_JSON';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  SELECT `service_id` INTO v_service_id FROM `collectors` WHERE `id` = p_id;
  CALL `sp_collector_validate_references`(v_service_id, JSON_EXTRACT(p_configuration, '$.methods'));
  START TRANSACTION;
  DELETE FROM `collector_targets` WHERE `collector_id` = p_id;
  DELETE FROM `collector_methods` WHERE `collector_id` = p_id;
  DELETE FROM `collector_schedules` WHERE `collector_id` = p_id;
  DELETE FROM `collector_transformations` WHERE `collector_id` = p_id;
  DELETE FROM `collector_field_mappings` WHERE `collector_id` = p_id;
  DELETE FROM `collector_destinations` WHERE `collector_id` = p_id;

  INSERT INTO `collector_targets` (`collector_id`, `equipment_id`, `target_identifier`, `target_config`, `is_active`)
  SELECT p_id, j.equipment_id, j.target_identifier, COALESCE(j.target_config, JSON_OBJECT()), COALESCE(j.is_active, TRUE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.targets'), JSON_ARRAY()), '$[*]' COLUMNS (
    equipment_id BIGINT UNSIGNED PATH '$.equipmentId' NULL ON EMPTY,
    target_identifier VARCHAR(255) PATH '$.targetIdentifier',
    target_config JSON PATH '$.targetConfig' NULL ON EMPTY,
    is_active BOOLEAN PATH '$.isActive' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_methods` (`collector_id`, `extraction_method_id`, `method_version_id`, `execution_order`, `parameters`, `is_active`)
  SELECT p_id, j.extraction_method_id, j.method_version_id, COALESCE(j.execution_order, 0), COALESCE(j.parameters, JSON_OBJECT()), COALESCE(j.is_active, TRUE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.methods'), JSON_ARRAY()), '$[*]' COLUMNS (
    extraction_method_id BIGINT UNSIGNED PATH '$.extractionMethodId',
    method_version_id BIGINT UNSIGNED PATH '$.methodVersionId' NULL ON EMPTY,
    execution_order INT UNSIGNED PATH '$.executionOrder' NULL ON EMPTY,
    parameters JSON PATH '$.parameters' NULL ON EMPTY,
    is_active BOOLEAN PATH '$.isActive' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_schedules` (`collector_id`, `schedule_type`, `interval_seconds`, `cron_expression`, `timezone`, `start_at`, `end_at`, `is_enabled`)
  SELECT p_id, j.schedule_type, j.interval_seconds, j.cron_expression, COALESCE(j.timezone, 'UTC'), j.start_at, j.end_at, COALESCE(j.is_enabled, TRUE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.schedules'), JSON_ARRAY()), '$[*]' COLUMNS (
    schedule_type VARCHAR(20) PATH '$.scheduleType', interval_seconds INT UNSIGNED PATH '$.intervalSeconds' NULL ON EMPTY,
    cron_expression VARCHAR(120) PATH '$.cronExpression' NULL ON EMPTY, timezone VARCHAR(80) PATH '$.timezone' NULL ON EMPTY,
    start_at DATETIME(3) PATH '$.startAt' NULL ON EMPTY, end_at DATETIME(3) PATH '$.endAt' NULL ON EMPTY,
    is_enabled BOOLEAN PATH '$.isEnabled' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_transformations` (`collector_id`, `execution_order`, `transformation_type`, `configuration`, `is_enabled`)
  SELECT p_id, COALESCE(j.execution_order, 0), j.transformation_type, j.configuration, COALESCE(j.is_enabled, TRUE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.transformations'), JSON_ARRAY()), '$[*]' COLUMNS (
    execution_order INT UNSIGNED PATH '$.executionOrder', transformation_type VARCHAR(40) PATH '$.transformationType',
    configuration JSON PATH '$.configuration', is_enabled BOOLEAN PATH '$.isEnabled' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_field_mappings` (`collector_id`, `source_field`, `destination_field`, `destination_type`, `transformation_config`, `is_required`)
  SELECT p_id, j.source_field, j.destination_field, j.destination_type, COALESCE(j.transformation_config, JSON_OBJECT()), COALESCE(j.is_required, FALSE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.fieldMappings'), JSON_ARRAY()), '$[*]' COLUMNS (
    source_field VARCHAR(255) PATH '$.sourceField', destination_field VARCHAR(255) PATH '$.destinationField',
    destination_type VARCHAR(50) PATH '$.destinationType', transformation_config JSON PATH '$.transformationConfig' NULL ON EMPTY,
    is_required BOOLEAN PATH '$.isRequired' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_destinations` (`collector_id`, `destination_type`, `destination_reference`, `storage_config`, `is_enabled`)
  SELECT p_id, j.destination_type, j.destination_reference, COALESCE(j.storage_config, JSON_OBJECT()), COALESCE(j.is_enabled, TRUE)
  FROM JSON_TABLE(COALESCE(JSON_EXTRACT(p_configuration, '$.destinations'), JSON_ARRAY()), '$[*]' COLUMNS (
    destination_type VARCHAR(40) PATH '$.destinationType', destination_reference VARCHAR(255) PATH '$.destinationReference',
    storage_config JSON PATH '$.storageConfig' NULL ON EMPTY, is_enabled BOOLEAN PATH '$.isEnabled' NULL ON EMPTY
  )) j;

  INSERT INTO `collector_policies` (`collector_id`, `timeout_ms`, `max_retries`, `retry_delay_ms`, `backoff_strategy`, `max_concurrency`, `overlap_policy`, `batch_size`, `retention_policy_reference`)
  SELECT p_id, COALESCE(j.timeout_ms, 60000), COALESCE(j.max_retries, 3), COALESCE(j.retry_delay_ms, 1000),
    COALESCE(j.backoff_strategy, 'EXPONENTIAL'), COALESCE(j.max_concurrency, 1), COALESCE(j.overlap_policy, 'SKIP'),
    COALESCE(j.batch_size, 1000), j.retention_policy_reference
  FROM JSON_TABLE(COALESCE(JSON_ARRAY(JSON_EXTRACT(p_configuration, '$.policies')), JSON_ARRAY(JSON_OBJECT())), '$[*]' COLUMNS (
    timeout_ms INT UNSIGNED PATH '$.timeoutMs' NULL ON EMPTY, max_retries SMALLINT UNSIGNED PATH '$.maxRetries' NULL ON EMPTY,
    retry_delay_ms INT UNSIGNED PATH '$.retryDelayMs' NULL ON EMPTY, backoff_strategy VARCHAR(20) PATH '$.backoffStrategy' NULL ON EMPTY,
    max_concurrency SMALLINT UNSIGNED PATH '$.maxConcurrency' NULL ON EMPTY, overlap_policy VARCHAR(30) PATH '$.overlapPolicy' NULL ON EMPTY,
    batch_size INT UNSIGNED PATH '$.batchSize' NULL ON EMPTY, retention_policy_reference VARCHAR(255) PATH '$.retentionPolicyReference' NULL ON EMPTY
  )) j
  ON DUPLICATE KEY UPDATE `timeout_ms` = VALUES(`timeout_ms`), `max_retries` = VALUES(`max_retries`),
    `retry_delay_ms` = VALUES(`retry_delay_ms`), `backoff_strategy` = VALUES(`backoff_strategy`),
    `max_concurrency` = VALUES(`max_concurrency`), `overlap_policy` = VALUES(`overlap_policy`),
    `batch_size` = VALUES(`batch_size`), `retention_policy_reference` = VALUES(`retention_policy_reference`);

  SELECT `config_version` + 1 INTO v_version FROM `collectors` WHERE `id` = p_id;
  UPDATE `collectors` SET `config_version` = v_version, `updated_by` = p_updated_by WHERE `id` = p_id;
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
  VALUES (p_id, v_version, CAST(p_configuration AS JSON), p_updated_by);
  COMMIT;
  CALL `sp_collector_get_configuration`(p_id);
END$$

CREATE PROCEDURE `sp_collector_get_by_service`(IN p_service_id BIGINT UNSIGNED, IN p_page INT UNSIGNED, IN p_page_size INT UNSIGNED)
BEGIN
  CALL `sp_collector_list`(NULL, p_service_id, NULL, p_page, p_page_size);
END$$

CREATE PROCEDURE `sp_collector_duplicate`(IN p_id BIGINT UNSIGNED, IN p_code VARCHAR(100), IN p_name VARCHAR(150), IN p_created_by VARCHAR(64))
BEGIN
  DECLARE v_new_id BIGINT UNSIGNED;
  DECLARE v_service_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  START TRANSACTION;
  SELECT `service_id` INTO v_service_id FROM `collectors` WHERE `id` = p_id;
  INSERT INTO `collectors` (`service_id`, `code`, `name`, `description`, `collector_type`, `status`, `tags`, `config_version`, `created_by`, `updated_by`)
  SELECT `service_id`, p_code, p_name, `description`, `collector_type`, 'DRAFT', `tags`, `config_version`, p_created_by, p_created_by FROM `collectors` WHERE `id` = p_id;
  SET v_new_id = LAST_INSERT_ID();
  INSERT INTO `collector_targets` (`collector_id`, `equipment_id`, `target_identifier`, `target_config`, `is_active`)
    SELECT v_new_id, `equipment_id`, `target_identifier`, `target_config`, `is_active` FROM `collector_targets` WHERE `collector_id` = p_id;
  INSERT INTO `collector_methods` (`collector_id`, `extraction_method_id`, `method_version_id`, `execution_order`, `parameters`, `is_active`)
    SELECT v_new_id, `extraction_method_id`, `method_version_id`, `execution_order`, `parameters`, `is_active` FROM `collector_methods` WHERE `collector_id` = p_id;
  INSERT INTO `collector_schedules` (`collector_id`, `schedule_type`, `interval_seconds`, `cron_expression`, `timezone`, `start_at`, `end_at`, `is_enabled`)
    SELECT v_new_id, `schedule_type`, `interval_seconds`, `cron_expression`, `timezone`, `start_at`, `end_at`, `is_enabled` FROM `collector_schedules` WHERE `collector_id` = p_id;
  INSERT INTO `collector_transformations` (`collector_id`, `execution_order`, `transformation_type`, `configuration`, `is_enabled`)
    SELECT v_new_id, `execution_order`, `transformation_type`, `configuration`, `is_enabled` FROM `collector_transformations` WHERE `collector_id` = p_id;
  INSERT INTO `collector_field_mappings` (`collector_id`, `source_field`, `destination_field`, `destination_type`, `transformation_config`, `is_required`)
    SELECT v_new_id, `source_field`, `destination_field`, `destination_type`, `transformation_config`, `is_required` FROM `collector_field_mappings` WHERE `collector_id` = p_id;
  INSERT INTO `collector_destinations` (`collector_id`, `destination_type`, `destination_reference`, `storage_config`, `is_enabled`)
    SELECT v_new_id, `destination_type`, `destination_reference`, `storage_config`, `is_enabled` FROM `collector_destinations` WHERE `collector_id` = p_id;
  INSERT INTO `collector_policies` (`collector_id`, `timeout_ms`, `max_retries`, `retry_delay_ms`, `backoff_strategy`, `max_concurrency`, `overlap_policy`, `batch_size`, `retention_policy_reference`)
    SELECT v_new_id, `timeout_ms`, `max_retries`, `retry_delay_ms`, `backoff_strategy`, `max_concurrency`, `overlap_policy`, `batch_size`, `retention_policy_reference` FROM `collector_policies` WHERE `collector_id` = p_id;
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
    SELECT v_new_id, `version_number`, `configuration_snapshot`, p_created_by FROM `collector_versions` WHERE `collector_id` = p_id;
  COMMIT;
  CALL `sp_collector_get`(v_new_id);
END$$

CREATE PROCEDURE `sp_collector_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF EXISTS (SELECT 1 FROM `collector_executions` WHERE `collector_id` = p_id AND `status` IN ('QUEUED', 'RUNNING')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_HAS_ACTIVE_EXECUTIONS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_id) THEN SELECT 0 AS `affected`;
  ELSE
    START TRANSACTION;
    DELETE cp FROM `collector_checkpoints` cp INNER JOIN `collector_methods` cm ON cm.`id` = cp.`collector_method_id` WHERE cm.`collector_id` = p_id;
    DELETE FROM `collector_checkpoints` WHERE `collector_id` = p_id;
    DELETE FROM `collector_execution_details` WHERE `execution_id` IN (SELECT `id` FROM `collector_executions` WHERE `collector_id` = p_id);
    DELETE FROM `collector_executions` WHERE `collector_id` = p_id;
    DELETE FROM `collector_targets` WHERE `collector_id` = p_id;
    DELETE FROM `collector_methods` WHERE `collector_id` = p_id;
    DELETE FROM `collector_schedules` WHERE `collector_id` = p_id;
    DELETE FROM `collector_transformations` WHERE `collector_id` = p_id;
    DELETE FROM `collector_field_mappings` WHERE `collector_id` = p_id;
    DELETE FROM `collector_destinations` WHERE `collector_id` = p_id;
    DELETE FROM `collector_policies` WHERE `collector_id` = p_id;
    DELETE FROM `collector_versions` WHERE `collector_id` = p_id;
    DELETE FROM `collectors` WHERE `id` = p_id;
    SELECT ROW_COUNT() AS `affected`;
    COMMIT;
  END IF;
END$$

CREATE PROCEDURE `sp_collector_execution_create`(IN p_collector_id BIGINT UNSIGNED, IN p_trigger_type VARCHAR(20), IN p_requested_by VARCHAR(64))
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_overlap_policy VARCHAR(30);
  IF p_trigger_type NOT IN ('MANUAL', 'SCHEDULE', 'EVENT', 'RETRY') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_TRIGGER_INVALID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_collector_id AND `status` = 'ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_ACTIVE';
  END IF;
  SELECT `overlap_policy` INTO v_overlap_policy FROM `collector_policies` WHERE `collector_id` = p_collector_id;
  IF v_overlap_policy = 'SKIP' AND EXISTS (SELECT 1 FROM `collector_executions` WHERE `collector_id` = p_collector_id AND `status` IN ('QUEUED', 'RUNNING')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_EXECUTION_OVERLAP';
  END IF;
  IF v_overlap_policy = 'CANCEL_PREVIOUS' THEN
    UPDATE `collector_executions` SET `status` = 'CANCELLED', `finished_at` = CURRENT_TIMESTAMP(3),
      `lease_owner` = NULL, `lease_until` = NULL
    WHERE `collector_id` = p_collector_id AND `status` IN ('QUEUED', 'RUNNING');
  END IF;
  SELECT `config_version` INTO v_version FROM `collectors` WHERE `id` = p_collector_id;
  INSERT INTO `collector_executions` (`collector_id`, `collector_version`, `trigger_type`, `status`, `requested_by`)
    VALUES (p_collector_id, v_version, p_trigger_type, 'QUEUED', p_requested_by);
  SET v_id = LAST_INSERT_ID();
  SELECT * FROM `collector_executions` WHERE `id` = v_id;
END$$

CREATE PROCEDURE `sp_collector_execution_claim`(IN p_worker VARCHAR(128), IN p_lease_seconds INT UNSIGNED)
BEGIN
  DECLARE v_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT `id` INTO v_id FROM `collector_executions`
  WHERE `status` = 'QUEUED' OR (`status` = 'RUNNING' AND `lease_until` < CURRENT_TIMESTAMP(3))
  ORDER BY `requested_at`, `id` LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_id IS NOT NULL THEN
    UPDATE `collector_executions` SET `status` = 'RUNNING', `lease_owner` = p_worker,
      `lease_until` = TIMESTAMPADD(SECOND, LEAST(GREATEST(COALESCE(p_lease_seconds, 60), 10), 3600), CURRENT_TIMESTAMP(3)),
      `started_at` = COALESCE(`started_at`, CURRENT_TIMESTAMP(3)) WHERE `id` = v_id;
  END IF;
  COMMIT;
  SELECT * FROM `collector_executions` WHERE `id` = v_id;
END$$

CREATE PROCEDURE `sp_collector_execution_start`(IN p_execution_id BIGINT UNSIGNED, IN p_worker VARCHAR(128))
BEGIN
  UPDATE `collector_executions` SET `status` = 'RUNNING', `started_at` = COALESCE(`started_at`, CURRENT_TIMESTAMP(3))
  WHERE `id` = p_execution_id AND `status` = 'RUNNING' AND `lease_owner` = p_worker;
  SELECT * FROM `collector_executions` WHERE `id` = p_execution_id AND `lease_owner` = p_worker;
END$$

CREATE PROCEDURE `sp_collector_execution_finish`(
  IN p_execution_id BIGINT UNSIGNED, IN p_worker VARCHAR(128), IN p_status VARCHAR(30),
  IN p_records_collected BIGINT UNSIGNED, IN p_records_processed BIGINT UNSIGNED,
  IN p_records_stored BIGINT UNSIGNED, IN p_error_code VARCHAR(100), IN p_error_message VARCHAR(1000)
)
BEGIN
  IF p_status NOT IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_EXECUTION_FINISH_STATUS_INVALID'; END IF;
  UPDATE `collector_executions` SET `status` = p_status, `finished_at` = CURRENT_TIMESTAMP(3),
    `duration_ms` = IF(`started_at` IS NULL, NULL, TIMESTAMPDIFF(MICROSECOND, `started_at`, CURRENT_TIMESTAMP(3)) DIV 1000),
    `records_collected` = COALESCE(p_records_collected, 0), `records_processed` = COALESCE(p_records_processed, 0),
    `records_stored` = COALESCE(p_records_stored, 0), `error_code` = p_error_code,
    `error_message` = LEFT(p_error_message, 1000), `lease_owner` = NULL, `lease_until` = NULL
  WHERE `id` = p_execution_id AND `status` = 'RUNNING' AND `lease_owner` = p_worker;
  SELECT ROW_COUNT() AS `affected`;
END$$

CREATE PROCEDURE `sp_collector_execution_list`(IN p_collector_id BIGINT UNSIGNED, IN p_page INT UNSIGNED, IN p_page_size INT UNSIGNED)
BEGIN
  DECLARE v_limit INT UNSIGNED DEFAULT 50;
  DECLARE v_offset BIGINT UNSIGNED DEFAULT 0;
  SET v_limit = LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
  SET v_offset = (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_limit;
  SELECT * FROM `collector_executions` WHERE `collector_id` = p_collector_id
  ORDER BY `requested_at` DESC, `id` DESC LIMIT v_limit OFFSET v_offset;
END$$

CREATE PROCEDURE `sp_collector_execution_get`(IN p_collector_id BIGINT UNSIGNED, IN p_execution_id BIGINT UNSIGNED)
BEGIN
  SELECT e.*, COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', d.`id`, 'collectorMethodId', d.`collector_method_id`, 'collectorTargetId', d.`collector_target_id`,
    'status', d.`status`, 'startedAt', d.`started_at`, 'finishedAt', d.`finished_at`,
    'recordsCollected', d.`records_collected`, 'recordsStored', d.`records_stored`,
    'errorCode', d.`error_code`, 'errorMessage', d.`error_message`
  )) FROM `collector_execution_details` d WHERE d.`execution_id` = e.`id`), JSON_ARRAY()) AS `details`
  FROM `collector_executions` e WHERE e.`collector_id` = p_collector_id AND e.`id` = p_execution_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_collector_version_list`(IN p_collector_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `collector_id` AS `collectorId`, `version_number` AS `versionNumber`,
    `configuration_snapshot` AS `configurationSnapshot`, `created_at` AS `createdAt`, `created_by` AS `createdBy`
  FROM `collector_versions` WHERE `collector_id` = p_collector_id ORDER BY `version_number` DESC;
END$$

CREATE PROCEDURE `sp_collector_version_get`(IN p_collector_id BIGINT UNSIGNED, IN p_version INT UNSIGNED)
BEGIN
  SELECT `id`, `collector_id` AS `collectorId`, `version_number` AS `versionNumber`,
    `configuration_snapshot` AS `configurationSnapshot`, `created_at` AS `createdAt`, `created_by` AS `createdBy`
  FROM `collector_versions` WHERE `collector_id` = p_collector_id AND `version_number` = p_version LIMIT 1;
END$$

CREATE PROCEDURE `sp_collector_version_create`(
  IN p_collector_id BIGINT UNSIGNED, IN p_snapshot LONGTEXT, IN p_created_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT JSON_VALID(p_snapshot) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_VERSION_INVALID_JSON'; END IF;
  START TRANSACTION;
  SELECT `config_version` + 1 INTO v_version FROM `collectors` WHERE `id` = p_collector_id FOR UPDATE;
  IF v_version IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  UPDATE `collectors` SET `config_version` = v_version WHERE `id` = p_collector_id;
  INSERT INTO `collector_versions` (`collector_id`, `version_number`, `configuration_snapshot`, `created_by`)
  VALUES (p_collector_id, v_version, CAST(p_snapshot AS JSON), p_created_by);
  COMMIT;
  CALL `sp_collector_version_get`(p_collector_id, v_version);
END$$

CREATE PROCEDURE `sp_collector_checkpoint_get`(
  IN p_collector_id BIGINT UNSIGNED, IN p_method_id BIGINT UNSIGNED,
  IN p_target_id BIGINT UNSIGNED, IN p_key VARCHAR(100)
)
BEGIN
  SELECT * FROM `collector_checkpoints` WHERE `collector_id` = p_collector_id
    AND (`collector_method_id` <=> p_method_id) AND (`collector_target_id` <=> p_target_id)
    AND `checkpoint_key` = p_key LIMIT 1;
END$$

CREATE PROCEDURE `sp_collector_checkpoint_upsert`(
  IN p_collector_id BIGINT UNSIGNED, IN p_method_id BIGINT UNSIGNED,
  IN p_target_id BIGINT UNSIGNED, IN p_key VARCHAR(100), IN p_value LONGTEXT,
  IN p_expected_lock_version BIGINT UNSIGNED
)
BEGIN
  IF NOT JSON_VALID(p_value) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_INVALID_JSON'; END IF;
  IF p_method_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `collector_methods` WHERE `id` = p_method_id AND `collector_id` = p_collector_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_METHOD_INVALID';
  END IF;
  IF p_target_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `collector_targets` WHERE `id` = p_target_id AND `collector_id` = p_collector_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_TARGET_INVALID';
  END IF;
  INSERT INTO `collector_checkpoints` (`collector_id`, `collector_method_id`, `collector_target_id`, `checkpoint_key`, `checkpoint_value`)
  VALUES (p_collector_id, p_method_id, p_target_id, COALESCE(p_key, 'DEFAULT'), CAST(p_value AS JSON))
  ON DUPLICATE KEY UPDATE `checkpoint_value` = IF(p_expected_lock_version IS NULL OR `lock_version` = p_expected_lock_version,
    VALUES(`checkpoint_value`), `checkpoint_value`),
    `lock_version` = IF(p_expected_lock_version IS NULL OR `lock_version` = p_expected_lock_version, `lock_version` + 1, `lock_version`);
  IF p_expected_lock_version IS NOT NULL AND EXISTS (
    SELECT 1 FROM `collector_checkpoints` WHERE `collector_id` = p_collector_id
      AND (`collector_method_id` <=> p_method_id) AND (`collector_target_id` <=> p_target_id)
      AND `checkpoint_key` = COALESCE(p_key, 'DEFAULT') AND `lock_version` = p_expected_lock_version
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_VERSION_CONFLICT'; END IF;
  CALL `sp_collector_checkpoint_get`(p_collector_id, p_method_id, p_target_id, COALESCE(p_key, 'DEFAULT'));
END$$

CREATE PROCEDURE `sp_collector_get_usage`(IN p_service_id BIGINT UNSIGNED)
BEGIN
  SELECT p_service_id AS `serviceId`, COUNT(*) AS `collectorCount`
  FROM `collectors` WHERE `service_id` = p_service_id;
END$$

CREATE PROCEDURE `sp_collector_health`(IN p_collector_id BIGINT UNSIGNED)
BEGIN
  SELECT c.`id` AS `collectorId`, c.`status` AS `configurationStatus`,
    (SELECT e.`status` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionStatus`,
    (SELECT e.`requested_at` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionRequestedAt`,
    (SELECT e.`finished_at` FROM `collector_executions` e WHERE e.`collector_id` = c.`id` ORDER BY e.`requested_at` DESC LIMIT 1) AS `lastExecutionFinishedAt`
  FROM `collectors` c WHERE c.`id` = p_collector_id;
END$$

CREATE PROCEDURE `sp_collector_execution_detail_create`(
  IN p_execution_id BIGINT UNSIGNED, IN p_method_id BIGINT UNSIGNED, IN p_target_id BIGINT UNSIGNED,
  IN p_status VARCHAR(30), IN p_records_collected BIGINT UNSIGNED, IN p_records_stored BIGINT UNSIGNED,
  IN p_error_code VARCHAR(100), IN p_error_message VARCHAR(1000)
)
BEGIN
  INSERT INTO `collector_execution_details` (`execution_id`, `collector_method_id`, `collector_target_id`, `status`,
    `started_at`, `finished_at`, `records_collected`, `records_stored`, `error_code`, `error_message`)
  VALUES (p_execution_id, p_method_id, p_target_id, p_status, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3),
    COALESCE(p_records_collected, 0), COALESCE(p_records_stored, 0), p_error_code, LEFT(p_error_message, 1000));
  SELECT LAST_INSERT_ID() AS `id`;
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-collectors', 'Create Company Collectors configuration, versioning, execution queue and checkpoints');
