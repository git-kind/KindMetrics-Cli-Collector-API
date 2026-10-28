-- Additive Services module migration. Run only against the reviewed Company schema.
CREATE TABLE `service_types` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_drivers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `driver_key` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `version` VARCHAR(40) NULL,
  `status` ENUM('AVAILABLE', 'INSTALLED', 'NOT_IMPLEMENTED') NOT NULL DEFAULT 'NOT_IMPLEMENTED',
  `capabilities` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_drivers_key` (`driver_key`),
  KEY `idx_service_drivers_status` (`status`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_type_drivers` (
  `service_type_id` BIGINT UNSIGNED NOT NULL,
  `driver_key` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`service_type_id`, `driver_key`),
  KEY `idx_service_type_drivers_driver` (`driver_key`),
  CONSTRAINT `fk_service_type_drivers_type` FOREIGN KEY (`service_type_id`)
    REFERENCES `service_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_service_type_drivers_driver` FOREIGN KEY (`driver_key`)
    REFERENCES `service_drivers` (`driver_key`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_auth_types` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_auth_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_driver_auth_types` (
  `driver_id` BIGINT UNSIGNED NOT NULL,
  `auth_type_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`driver_id`, `auth_type_id`),
  KEY `idx_service_driver_auth_type` (`auth_type_id`),
  CONSTRAINT `fk_service_driver_auth_driver` FOREIGN KEY (`driver_id`)
    REFERENCES `service_drivers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_service_driver_auth_type` FOREIGN KEY (`auth_type_id`)
    REFERENCES `service_auth_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `services` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_type_id` BIGINT UNSIGNED NOT NULL,
  `driver_key` VARCHAR(100) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(1000) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(64) NULL,
  `updated_by` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_code` (`code`),
  UNIQUE KEY `uq_services_name` (`name`),
  KEY `idx_services_type_status` (`service_type_id`, `is_active`),
  KEY `idx_services_driver` (`driver_key`),
  CONSTRAINT `fk_services_type` FOREIGN KEY (`service_type_id`)
    REFERENCES `service_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_services_driver` FOREIGN KEY (`driver_key`)
    REFERENCES `service_drivers` (`driver_key`) ON DELETE RESTRICT,
  CONSTRAINT `fk_services_type_driver` FOREIGN KEY (`service_type_id`, `driver_key`)
    REFERENCES `service_type_drivers` (`service_type_id`, `driver_key`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_connections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `connection_config` JSON NOT NULL,
  `auth_type_id` BIGINT UNSIGNED NOT NULL,
  `auth_config` JSON NOT NULL,
  `auth_algorithm` VARCHAR(80) NULL,
  `encryption_algorithm` VARCHAR(80) NULL,
  `additional_parameters` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_connections_service` (`service_id`),
  KEY `idx_service_connections_auth_type` (`auth_type_id`),
  CONSTRAINT `fk_service_connections_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_service_connections_auth_type` FOREIGN KEY (`auth_type_id`)
    REFERENCES `service_auth_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_credentials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `credential_type` VARCHAR(50) NOT NULL,
  `credential_reference` VARCHAR(500) NOT NULL,
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_credentials_reference` (`service_id`, `credential_type`, `credential_reference`),
  KEY `idx_service_credentials_service` (`service_id`),
  CONSTRAINT `fk_service_credentials_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_service_credentials_reference` CHECK (
    `credential_reference` LIKE 'vault://%' OR `credential_reference` LIKE 'secret://%'
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `configuration_snapshot` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_versions_number` (`service_id`, `version_number`),
  CONSTRAINT `fk_service_versions_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE PROCEDURE `sp_service_type_list`()
BEGIN
  SELECT `id`, `code`, `name`, `description`, `is_active` AS `isActive`
  FROM `service_types` WHERE `is_active` = TRUE ORDER BY `name`, `id`;
END$$

CREATE PROCEDURE `sp_service_driver_list`(IN p_service_type_id BIGINT UNSIGNED)
BEGIN
  SELECT d.`id`, d.`driver_key` AS `driverKey`, d.`name`, d.`version`,
         d.`status`, d.`capabilities`, d.`is_active` AS `isActive`
  FROM `service_drivers` d
  LEFT JOIN `service_type_drivers` td ON td.`driver_key` = d.`driver_key`
  WHERE d.`is_active` = TRUE
    AND (p_service_type_id IS NULL OR td.`service_type_id` = p_service_type_id)
  ORDER BY d.`name`, d.`id`;
END$$

CREATE PROCEDURE `sp_service_auth_type_list`(IN p_driver_key VARCHAR(100))
BEGIN
  SELECT a.`id`, a.`code`, a.`name`
  FROM `service_auth_types` a
  WHERE a.`is_active` = TRUE
    AND (p_driver_key IS NULL OR EXISTS (
      SELECT 1 FROM `service_driver_auth_types` da
      INNER JOIN `service_drivers` d ON d.`id` = da.`driver_id`
      WHERE d.`driver_key` = p_driver_key AND da.`auth_type_id` = a.`id`
    ))
  ORDER BY a.`name`, a.`id`;
END$$

CREATE PROCEDURE `sp_service_get`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT s.`id`, s.`service_type_id` AS `serviceTypeId`, t.`code` AS `serviceTypeCode`,
         s.`driver_key` AS `driverKey`, d.`status` AS `driverStatus`, s.`code`, s.`name`,
         s.`description`, s.`is_active` AS `isActive`, s.`created_at` AS `createdAt`,
         s.`updated_at` AS `updatedAt`, s.`created_by` AS `createdBy`,
         s.`updated_by` AS `updatedBy`, c.`connection_config` AS `connectionConfig`,
         c.`auth_type_id` AS `authTypeId`, a.`code` AS `authTypeCode`,
         c.`auth_config` AS `authConfig`, c.`auth_algorithm` AS `authAlgorithm`,
         c.`encryption_algorithm` AS `encryptionAlgorithm`,
         c.`additional_parameters` AS `additionalParameters`
  FROM `services` s
  INNER JOIN `service_types` t ON t.`id` = s.`service_type_id`
  INNER JOIN `service_drivers` d ON d.`driver_key` = s.`driver_key`
  LEFT JOIN `service_connections` c ON c.`service_id` = s.`id`
  LEFT JOIN `service_auth_types` a ON a.`id` = c.`auth_type_id`
  WHERE s.`id` = p_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_service_list`(
  IN p_search VARCHAR(150), IN p_service_type_id BIGINT UNSIGNED,
  IN p_is_active BOOLEAN, IN p_page INT UNSIGNED, IN p_page_size INT UNSIGNED
)
BEGIN
  DECLARE v_limit INT UNSIGNED DEFAULT 50;
  DECLARE v_offset BIGINT UNSIGNED DEFAULT 0;
  SET v_limit = LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
  SET v_offset = (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_limit;
  SELECT s.`id`, s.`service_type_id` AS `serviceTypeId`, t.`code` AS `serviceTypeCode`,
         s.`driver_key` AS `driverKey`, d.`status` AS `driverStatus`, s.`code`, s.`name`,
         s.`description`, s.`is_active` AS `isActive`, s.`created_at` AS `createdAt`,
         s.`updated_at` AS `updatedAt`, c.`auth_type_id` AS `authTypeId`,
         a.`code` AS `authTypeCode`
  FROM `services` s
  INNER JOIN `service_types` t ON t.`id` = s.`service_type_id`
  INNER JOIN `service_drivers` d ON d.`driver_key` = s.`driver_key`
  LEFT JOIN `service_connections` c ON c.`service_id` = s.`id`
  LEFT JOIN `service_auth_types` a ON a.`id` = c.`auth_type_id`
  WHERE (p_search IS NULL OR s.`name` LIKE CONCAT('%', p_search, '%')
         OR s.`code` LIKE CONCAT('%', p_search, '%'))
    AND (p_service_type_id IS NULL OR s.`service_type_id` = p_service_type_id)
    AND (p_is_active IS NULL OR s.`is_active` = p_is_active)
  ORDER BY s.`name`, s.`id` LIMIT v_limit OFFSET v_offset;
END$$

CREATE PROCEDURE `sp_service_create`(
  IN p_service_type_id BIGINT UNSIGNED, IN p_driver_key VARCHAR(100),
  IN p_code VARCHAR(100), IN p_name VARCHAR(150), IN p_description VARCHAR(1000),
  IN p_is_active BOOLEAN, IN p_created_by VARCHAR(64)
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (
    SELECT 1 FROM `service_type_drivers` td
    INNER JOIN `service_drivers` d ON d.`driver_key` = td.`driver_key`
    INNER JOIN `service_types` t ON t.`id` = td.`service_type_id`
    WHERE td.`service_type_id` = p_service_type_id AND td.`driver_key` = p_driver_key
      AND d.`is_active` = TRUE AND t.`is_active` = TRUE
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_TYPE_DRIVER_NOT_AVAILABLE';
  END IF;
  START TRANSACTION;
  INSERT INTO `services` (
    `service_type_id`, `driver_key`, `code`, `name`, `description`, `is_active`, `created_by`, `updated_by`
  ) VALUES (
    p_service_type_id, p_driver_key, p_code, p_name, p_description,
    COALESCE(p_is_active, TRUE), p_created_by, p_created_by
  );
  SET v_id = LAST_INSERT_ID();
  INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
  VALUES (v_id, 1, JSON_OBJECT(
    'serviceTypeId', p_service_type_id, 'driverKey', p_driver_key, 'code', p_code,
    'name', p_name, 'description', p_description, 'isActive', COALESCE(p_is_active, TRUE)
  ), p_created_by);
  COMMIT;
  CALL `sp_service_get`(v_id);
END$$

CREATE PROCEDURE `sp_service_update`(
  IN p_id BIGINT UNSIGNED,
  IN p_service_type_id BIGINT UNSIGNED, IN p_has_service_type_id BOOLEAN,
  IN p_driver_key VARCHAR(100), IN p_has_driver_key BOOLEAN,
  IN p_code VARCHAR(100), IN p_has_code BOOLEAN,
  IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_description VARCHAR(1000), IN p_has_description BOOLEAN,
  IN p_is_active BOOLEAN, IN p_has_is_active BOOLEAN, IN p_updated_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_NOT_FOUND';
  END IF;
  START TRANSACTION;
  UPDATE `services` s
  SET s.`service_type_id` = IF(p_has_service_type_id, p_service_type_id, s.`service_type_id`),
      s.`driver_key` = IF(p_has_driver_key, p_driver_key, s.`driver_key`),
      s.`code` = IF(p_has_code, p_code, s.`code`),
      s.`name` = IF(p_has_name, p_name, s.`name`),
      s.`description` = IF(p_has_description, p_description, s.`description`),
      s.`is_active` = IF(p_has_is_active, p_is_active, s.`is_active`),
      s.`updated_by` = p_updated_by
  WHERE s.`id` = p_id;
  IF NOT EXISTS (
    SELECT 1 FROM `service_type_drivers` td
    INNER JOIN `service_drivers` d ON d.`driver_key` = td.`driver_key`
    WHERE td.`service_type_id` = (SELECT `service_type_id` FROM `services` WHERE `id` = p_id)
    AND td.`driver_key` = (SELECT `driver_key` FROM `services` WHERE `id` = p_id)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_TYPE_DRIVER_NOT_AVAILABLE';
  END IF;
  SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_version
  FROM `service_versions` WHERE `service_id` = p_id;
  INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
  SELECT s.`id`, v_version, JSON_OBJECT(
    'serviceTypeId', s.`service_type_id`, 'driverKey', s.`driver_key`, 'code', s.`code`,
    'name', s.`name`, 'description', s.`description`, 'isActive', s.`is_active`
  ), p_updated_by FROM `services` s WHERE s.`id` = p_id;
  COMMIT;
  CALL `sp_service_get`(p_id);
END$$

CREATE PROCEDURE `sp_service_duplicate`(
  IN p_id BIGINT UNSIGNED, IN p_code VARCHAR(100), IN p_name VARCHAR(150), IN p_created_by VARCHAR(64)
)
BEGIN
  DECLARE v_new_id BIGINT UNSIGNED;
  DECLARE v_type_id BIGINT UNSIGNED;
  DECLARE v_driver_key VARCHAR(100);
  DECLARE v_description VARCHAR(1000);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_NOT_FOUND';
  END IF;
  START TRANSACTION;
  SELECT `service_type_id`, `driver_key`, `description`
    INTO v_type_id, v_driver_key, v_description FROM `services` WHERE `id` = p_id;
  INSERT INTO `services` (`service_type_id`, `driver_key`, `code`, `name`, `description`, `is_active`, `created_by`, `updated_by`)
  VALUES (v_type_id, v_driver_key, p_code, p_name, v_description, FALSE, p_created_by, p_created_by);
  SET v_new_id = LAST_INSERT_ID();
  INSERT INTO `service_connections` (
    `service_id`, `connection_config`, `auth_type_id`, `auth_config`, `auth_algorithm`,
    `encryption_algorithm`, `additional_parameters`
  )
  SELECT v_new_id, `connection_config`, `auth_type_id`, JSON_OBJECT(), `auth_algorithm`,
         `encryption_algorithm`, `additional_parameters`
  FROM `service_connections` WHERE `service_id` = p_id;
  INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
  SELECT v_new_id, 1, JSON_OBJECT(
    'serviceTypeId', v_type_id, 'driverKey', v_driver_key, 'code', p_code,
    'name', p_name, 'description', v_description, 'isActive', FALSE,
    'connectionConfig', c.`connection_config`, 'authTypeId', c.`auth_type_id`,
    'authAlgorithm', c.`auth_algorithm`,
    'encryptionAlgorithm', c.`encryption_algorithm`, 'additionalParameters', c.`additional_parameters`
  ), p_created_by FROM `service_connections` c WHERE c.`service_id` = v_new_id;
  IF ROW_COUNT() = 0 THEN
    INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
    VALUES (v_new_id, 1, JSON_OBJECT(
      'serviceTypeId', v_type_id, 'driverKey', v_driver_key, 'code', p_code,
      'name', p_name, 'description', v_description, 'isActive', FALSE
    ), p_created_by);
  END IF;
  COMMIT;
  CALL `sp_service_get`(v_new_id);
END$$

CREATE PROCEDURE `sp_service_set_status`(
  IN p_id BIGINT UNSIGNED, IN p_is_active BOOLEAN, IN p_updated_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  UPDATE `services` SET `is_active` = p_is_active, `updated_by` = p_updated_by WHERE `id` = p_id;
  IF ROW_COUNT() = 0 AND NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_NOT_FOUND';
  END IF;
  SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_version
  FROM `service_versions` WHERE `service_id` = p_id;
  INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
  SELECT s.`id`, v_version, JSON_OBJECT(
    'serviceTypeId', s.`service_type_id`, 'driverKey', s.`driver_key`, 'code', s.`code`,
    'name', s.`name`, 'description', s.`description`, 'isActive', s.`is_active`
  ), p_updated_by FROM `services` s WHERE s.`id` = p_id;
  COMMIT;
  CALL `sp_service_get`(p_id);
END$$

CREATE PROCEDURE `sp_service_get_usage`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT s.`id` AS `serviceId`,
         (SELECT COUNT(*) FROM `service_credentials` c WHERE c.`service_id` = s.`id`) AS `credentialReferences`,
         0 AS `collectorBindings`,
         (SELECT COUNT(*) FROM `service_credentials` c WHERE c.`service_id` = s.`id`) > 0 AS `deletionBlocked`
  FROM `services` s WHERE s.`id` = p_id;
END$$

CREATE PROCEDURE `sp_service_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF EXISTS (SELECT 1 FROM `service_credentials` WHERE `service_id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_HAS_CREDENTIAL_REFERENCES';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_id) THEN
    SELECT 0 AS `affected`;
  ELSE
    START TRANSACTION;
    DELETE FROM `service_connections` WHERE `service_id` = p_id;
    DELETE FROM `service_versions` WHERE `service_id` = p_id;
    DELETE FROM `services` WHERE `id` = p_id;
    SELECT ROW_COUNT() AS `affected`;
    COMMIT;
  END IF;
END$$

CREATE PROCEDURE `sp_service_connection_get`(IN p_service_id BIGINT UNSIGNED)
BEGIN
  SELECT c.`service_id` AS `serviceId`, c.`connection_config` AS `connectionConfig`,
         c.`auth_type_id` AS `authTypeId`, a.`code` AS `authTypeCode`,
         c.`auth_config` AS `authConfig`, c.`auth_algorithm` AS `authAlgorithm`,
         c.`encryption_algorithm` AS `encryptionAlgorithm`,
         c.`additional_parameters` AS `additionalParameters`,
         c.`created_at` AS `createdAt`, c.`updated_at` AS `updatedAt`
  FROM `service_connections` c INNER JOIN `service_auth_types` a ON a.`id` = c.`auth_type_id`
  WHERE c.`service_id` = p_service_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_service_connection_upsert`(
  IN p_service_id BIGINT UNSIGNED, IN p_connection_config LONGTEXT,
  IN p_auth_type_id BIGINT UNSIGNED, IN p_auth_config LONGTEXT,
  IN p_auth_algorithm VARCHAR(80), IN p_encryption_algorithm VARCHAR(80),
  IN p_additional_parameters LONGTEXT, IN p_updated_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE v_driver_key VARCHAR(100);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM `services` WHERE `id` = p_service_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_NOT_FOUND';
  END IF;
  SELECT `driver_key` INTO v_driver_key FROM `services` WHERE `id` = p_service_id;
  IF NOT EXISTS (
    SELECT 1 FROM `service_driver_auth_types` da
    INNER JOIN `service_drivers` d ON d.`id` = da.`driver_id`
    INNER JOIN `service_auth_types` a ON a.`id` = da.`auth_type_id`
    WHERE d.`driver_key` = v_driver_key AND a.`id` = p_auth_type_id
      AND d.`is_active` = TRUE AND a.`is_active` = TRUE
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_AUTH_TYPE_NOT_SUPPORTED';
  END IF;
  IF NOT JSON_VALID(p_connection_config) OR NOT JSON_VALID(p_auth_config)
     OR NOT JSON_VALID(p_additional_parameters) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_CONFIGURATION_INVALID_JSON';
  END IF;
  START TRANSACTION;
  INSERT INTO `service_connections` (
    `service_id`, `connection_config`, `auth_type_id`, `auth_config`, `auth_algorithm`,
    `encryption_algorithm`, `additional_parameters`
  ) VALUES (
    p_service_id, CAST(p_connection_config AS JSON), p_auth_type_id,
    CAST(p_auth_config AS JSON), p_auth_algorithm, p_encryption_algorithm,
    CAST(p_additional_parameters AS JSON)
  ) AS incoming
  ON DUPLICATE KEY UPDATE `connection_config` = incoming.`connection_config`,
    `auth_type_id` = incoming.`auth_type_id`, `auth_config` = incoming.`auth_config`,
    `auth_algorithm` = incoming.`auth_algorithm`,
    `encryption_algorithm` = incoming.`encryption_algorithm`,
    `additional_parameters` = incoming.`additional_parameters`;
  UPDATE `services` SET `updated_by` = p_updated_by WHERE `id` = p_service_id;
  SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_version
  FROM `service_versions` WHERE `service_id` = p_service_id;
  INSERT INTO `service_versions` (`service_id`, `version_number`, `configuration_snapshot`, `created_by`)
  SELECT s.`id`, v_version, JSON_OBJECT(
    'serviceTypeId', s.`service_type_id`, 'driverKey', s.`driver_key`, 'code', s.`code`,
    'name', s.`name`, 'description', s.`description`, 'isActive', s.`is_active`,
    'connectionConfig', c.`connection_config`, 'authTypeId', c.`auth_type_id`,
    'authAlgorithm', c.`auth_algorithm`,
    'encryptionAlgorithm', c.`encryption_algorithm`, 'additionalParameters', c.`additional_parameters`
  ), p_updated_by FROM `services` s INNER JOIN `service_connections` c ON c.`service_id` = s.`id`
  WHERE s.`id` = p_service_id;
  COMMIT;
  CALL `sp_service_connection_get`(p_service_id);
END$$

CREATE PROCEDURE `sp_service_credential_list`(IN p_service_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `service_id` AS `serviceId`, `credential_type` AS `credentialType`,
         `credential_reference` AS `credentialReference`, `expires_at` AS `expiresAt`,
         `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `service_credentials` WHERE `service_id` = p_service_id ORDER BY `id`;
END$$

CREATE PROCEDURE `sp_service_credential_reference_upsert`(
  IN p_service_id BIGINT UNSIGNED, IN p_credential_type VARCHAR(50),
  IN p_credential_reference VARCHAR(500), IN p_expires_at DATETIME(3)
)
BEGIN
  IF p_credential_reference NOT LIKE 'vault://%' AND p_credential_reference NOT LIKE 'secret://%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CREDENTIAL_REFERENCE_MUST_USE_VAULT_SCHEME';
  END IF;
  INSERT INTO `service_credentials` (`service_id`, `credential_type`, `credential_reference`, `expires_at`)
  VALUES (p_service_id, p_credential_type, p_credential_reference, p_expires_at)
  ON DUPLICATE KEY UPDATE `expires_at` = VALUES(`expires_at`);
  CALL `sp_service_credential_list`(p_service_id);
END$$

CREATE PROCEDURE `sp_service_credential_reference_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  DELETE FROM `service_credentials` WHERE `id` = p_id;
  SELECT ROW_COUNT() AS `affected`;
END$$

CREATE PROCEDURE `sp_service_version_list`(IN p_service_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `service_id` AS `serviceId`, `version_number` AS `versionNumber`,
         `configuration_snapshot` AS `configurationSnapshot`, `created_at` AS `createdAt`,
         `created_by` AS `createdBy`
  FROM `service_versions` WHERE `service_id` = p_service_id ORDER BY `version_number` DESC;
END$$

CREATE PROCEDURE `sp_service_version_get`(IN p_service_id BIGINT UNSIGNED, IN p_version_number INT UNSIGNED)
BEGIN
  SELECT `id`, `service_id` AS `serviceId`, `version_number` AS `versionNumber`,
         `configuration_snapshot` AS `configurationSnapshot`, `created_at` AS `createdAt`,
         `created_by` AS `createdBy`
  FROM `service_versions` WHERE `service_id` = p_service_id AND `version_number` = p_version_number LIMIT 1;
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-services', 'Create Company Services, connection, credential references, versions and catalog procedures');