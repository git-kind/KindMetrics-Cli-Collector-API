USE `kindmetricscte`;

-- Manual, additive migration. Verify schema_migrations and information_schema first.
CREATE TABLE `extraction_providers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(80) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extraction_providers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `extraction_connectors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_id` BIGINT UNSIGNED NOT NULL,
  `connector_key` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) NULL,
  `driver_key` VARCHAR(100) NULL,
  `driver_version` VARCHAR(40) NULL,
  `configuration_schema` JSON NULL,
  `capabilities` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extraction_connectors_key` (`connector_key`),
  KEY `idx_extraction_connectors_provider` (`provider_id`, `is_active`),
  CONSTRAINT `fk_extraction_connectors_provider` FOREIGN KEY (`provider_id`)
    REFERENCES `extraction_providers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `extraction_connector_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `connector_id` BIGINT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `definition_snapshot` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extraction_connector_version` (`connector_id`, `version_number`),
  CONSTRAINT `fk_extraction_connector_versions_connector` FOREIGN KEY (`connector_id`)
    REFERENCES `extraction_connectors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `extraction_connector_auth_types` (
  `connector_id` BIGINT UNSIGNED NOT NULL,
  `auth_type` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`connector_id`, `auth_type`),
  CONSTRAINT `fk_extraction_connector_auth_connector` FOREIGN KEY (`connector_id`)
    REFERENCES `extraction_connectors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `extraction_connector_parameters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `connector_id` BIGINT UNSIGNED NOT NULL,
  `parameter_key` VARCHAR(100) NOT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `data_type` VARCHAR(30) NOT NULL,
  `default_value` TEXT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_secret` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` VARCHAR(500) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extraction_connector_parameter` (`connector_id`, `parameter_key`),
  CONSTRAINT `fk_extraction_connector_parameters_connector` FOREIGN KEY (`connector_id`)
    REFERENCES `extraction_connectors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_extraction_connector_secret_default` CHECK (`is_secret` = FALSE OR `default_value` IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$

CREATE PROCEDURE `sp_extraction_provider_list`(
  IN p_search VARCHAR(150), IN p_is_active BOOLEAN, IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
BEGIN
  DECLARE v_limit INT UNSIGNED DEFAULT 50;
  DECLARE v_offset INT UNSIGNED DEFAULT 0;
  SET v_limit = LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  SET v_offset = COALESCE(p_offset, 0);
  SELECT `id`, `code`, `name`, `description`, `is_active` AS `isActive`,
         `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `extraction_providers`
  WHERE (p_search IS NULL OR `name` LIKE CONCAT('%', p_search, '%') OR `code` LIKE CONCAT('%', p_search, '%'))
    AND (p_is_active IS NULL OR `is_active` = p_is_active)
  ORDER BY `name`, `id` LIMIT v_limit OFFSET v_offset;
END$$

CREATE PROCEDURE `sp_extraction_provider_get`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `code`, `name`, `description`, `is_active` AS `isActive`,
         `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `extraction_providers` WHERE `id` = p_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_extraction_provider_create`(
  IN p_code VARCHAR(80), IN p_name VARCHAR(150), IN p_description VARCHAR(500), IN p_is_active BOOLEAN
)
BEGIN
  INSERT INTO `extraction_providers` (`code`, `name`, `description`, `is_active`)
  VALUES (p_code, p_name, p_description, COALESCE(p_is_active, TRUE));
  CALL `sp_extraction_provider_get`(LAST_INSERT_ID());
END$$

CREATE PROCEDURE `sp_extraction_provider_update`(
  IN p_id BIGINT UNSIGNED,
  IN p_code VARCHAR(80), IN p_has_code BOOLEAN,
  IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_description VARCHAR(500), IN p_has_description BOOLEAN,
  IN p_is_active BOOLEAN, IN p_has_is_active BOOLEAN
)
BEGIN
  UPDATE `extraction_providers`
  SET `code` = IF(p_has_code, p_code, `code`),
      `name` = IF(p_has_name, p_name, `name`),
      `description` = IF(p_has_description, p_description, `description`),
      `is_active` = IF(p_has_is_active, p_is_active, `is_active`)
  WHERE `id` = p_id;
  CALL `sp_extraction_provider_get`(p_id);
END$$

CREATE PROCEDURE `sp_extraction_provider_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  IF EXISTS (
    SELECT 1 FROM `extraction_connectors`
    WHERE `provider_id` = p_id AND `is_active` = TRUE
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PROVIDER_HAS_ACTIVE_CONNECTORS';
  END IF;
  UPDATE `extraction_providers` SET `is_active` = FALSE
  WHERE `id` = p_id AND `is_active` = TRUE;
  SELECT ROW_COUNT() AS `affected`;
END$$

CREATE PROCEDURE `sp_extraction_connector_list`(
  IN p_provider_id BIGINT UNSIGNED, IN p_search VARCHAR(150),
  IN p_is_active BOOLEAN, IN p_limit INT UNSIGNED, IN p_offset INT UNSIGNED
)
BEGIN
  DECLARE v_limit INT UNSIGNED DEFAULT 50;
  DECLARE v_offset INT UNSIGNED DEFAULT 0;
  SET v_limit = LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  SET v_offset = COALESCE(p_offset, 0);
  SELECT c.`id`, c.`provider_id` AS `providerId`, p.`code` AS `providerCode`,
         c.`connector_key` AS `connectorKey`, c.`name`, c.`description`,
         c.`driver_key` AS `driverKey`, c.`driver_version` AS `driverVersion`,
         c.`configuration_schema` AS `configurationSchema`, c.`capabilities`,
         c.`is_active` AS `isActive`, c.`created_at` AS `createdAt`, c.`updated_at` AS `updatedAt`
  FROM `extraction_connectors` c
  INNER JOIN `extraction_providers` p ON p.`id` = c.`provider_id`
  WHERE (p_provider_id IS NULL OR c.`provider_id` = p_provider_id)
    AND (p_search IS NULL OR c.`name` LIKE CONCAT('%', p_search, '%') OR c.`connector_key` LIKE CONCAT('%', p_search, '%'))
    AND (p_is_active IS NULL OR c.`is_active` = p_is_active)
  ORDER BY c.`name`, c.`id` LIMIT v_limit OFFSET v_offset;
END$$

CREATE PROCEDURE `sp_extraction_connector_get`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT c.`id`, c.`provider_id` AS `providerId`, p.`code` AS `providerCode`,
         c.`connector_key` AS `connectorKey`, c.`name`, c.`description`,
         c.`driver_key` AS `driverKey`, c.`driver_version` AS `driverVersion`,
         c.`configuration_schema` AS `configurationSchema`, c.`capabilities`,
         c.`is_active` AS `isActive`, c.`created_at` AS `createdAt`, c.`updated_at` AS `updatedAt`
  FROM `extraction_connectors` c
  INNER JOIN `extraction_providers` p ON p.`id` = c.`provider_id`
  WHERE c.`id` = p_id LIMIT 1;
END$$

CREATE PROCEDURE `sp_extraction_connector_create`(
  IN p_provider_id BIGINT UNSIGNED, IN p_connector_key VARCHAR(100),
  IN p_name VARCHAR(150), IN p_description VARCHAR(500),
  IN p_driver_key VARCHAR(100), IN p_driver_version VARCHAR(40),
  IN p_configuration_schema LONGTEXT, IN p_capabilities LONGTEXT, IN p_is_active BOOLEAN
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  INSERT INTO `extraction_connectors` (
    `provider_id`, `connector_key`, `name`, `description`, `driver_key`, `driver_version`,
    `configuration_schema`, `capabilities`, `is_active`
  ) VALUES (
    p_provider_id, p_connector_key, p_name, p_description, p_driver_key, p_driver_version,
    IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)),
    CAST(COALESCE(p_capabilities, '{}') AS JSON), COALESCE(p_is_active, TRUE)
  );
  SET v_id = LAST_INSERT_ID();
  INSERT INTO `extraction_connector_versions` (`connector_id`, `version_number`, `definition_snapshot`)
  SELECT v_id, 1, JSON_OBJECT(
    'providerId', p_provider_id, 'connectorKey', p_connector_key, 'name', p_name,
    'description', p_description, 'driverKey', p_driver_key, 'driverVersion', p_driver_version,
    'configurationSchema', IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)),
    'capabilities', CAST(COALESCE(p_capabilities, '{}') AS JSON), 'isActive', COALESCE(p_is_active, TRUE)
  );
  COMMIT;
  CALL `sp_extraction_connector_get`(v_id);
END$$

CREATE PROCEDURE `sp_extraction_connector_update`(
  IN p_id BIGINT UNSIGNED,
  IN p_provider_id BIGINT UNSIGNED, IN p_has_provider_id BOOLEAN,
  IN p_connector_key VARCHAR(100), IN p_has_connector_key BOOLEAN,
  IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_description VARCHAR(500), IN p_has_description BOOLEAN,
  IN p_driver_key VARCHAR(100), IN p_has_driver_key BOOLEAN,
  IN p_driver_version VARCHAR(40), IN p_has_driver_version BOOLEAN,
  IN p_configuration_schema LONGTEXT, IN p_has_configuration_schema BOOLEAN,
  IN p_capabilities LONGTEXT, IN p_has_capabilities BOOLEAN,
  IN p_is_active BOOLEAN, IN p_has_is_active BOOLEAN
)
BEGIN
  DECLARE v_version INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF EXISTS (SELECT 1 FROM `extraction_connectors` WHERE `id` = p_id) THEN
    START TRANSACTION;
    UPDATE `extraction_connectors`
    SET `provider_id` = IF(p_has_provider_id, p_provider_id, `provider_id`),
        `connector_key` = IF(p_has_connector_key, p_connector_key, `connector_key`),
        `name` = IF(p_has_name, p_name, `name`),
        `description` = IF(p_has_description, p_description, `description`),
        `driver_key` = IF(p_has_driver_key, p_driver_key, `driver_key`),
        `driver_version` = IF(p_has_driver_version, p_driver_version, `driver_version`),
        `configuration_schema` = IF(p_has_configuration_schema,
          IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)), `configuration_schema`),
        `capabilities` = IF(p_has_capabilities, CAST(p_capabilities AS JSON), `capabilities`),
        `is_active` = IF(p_has_is_active, p_is_active, `is_active`)
    WHERE `id` = p_id;
    SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_version
    FROM `extraction_connector_versions` WHERE `connector_id` = p_id;
    INSERT INTO `extraction_connector_versions` (`connector_id`, `version_number`, `definition_snapshot`)
    SELECT `id`, v_version, JSON_OBJECT(
      'providerId', `provider_id`, 'connectorKey', `connector_key`, 'name', `name`,
      'description', `description`, 'driverKey', `driver_key`, 'driverVersion', `driver_version`,
      'configurationSchema', `configuration_schema`, 'capabilities', `capabilities`, 'isActive', `is_active`
    ) FROM `extraction_connectors` WHERE `id` = p_id;
    COMMIT;
  END IF;
  CALL `sp_extraction_connector_get`(p_id);
END$$

CREATE PROCEDURE `sp_extraction_connector_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  UPDATE `extraction_connectors` SET `is_active` = FALSE
  WHERE `id` = p_id AND `is_active` = TRUE;
  SELECT ROW_COUNT() AS `affected`;
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('local-2026.10.26-extraction-catalog', 'Add local extraction provider and connector catalogs')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);