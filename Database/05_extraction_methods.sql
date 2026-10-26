CREATE DATABASE IF NOT EXISTS `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(40) NOT NULL PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL,
  `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `extraction_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `protocol` VARCHAR(30) NOT NULL,
  `configuration_schema` JSON NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extraction_methods_code` (`code`),
  KEY `idx_extraction_methods_protocol` (`protocol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `extraction_method_parameters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `extraction_method_id` BIGINT UNSIGNED NOT NULL,
  `parameter_key` VARCHAR(100) NOT NULL,
  `data_type` VARCHAR(30) NOT NULL,
  `default_value` TEXT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_secret` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_method_parameter` (`extraction_method_id`, `parameter_key`),
  CONSTRAINT `fk_parameter_method` FOREIGN KEY (`extraction_method_id`)
    REFERENCES `extraction_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `extraction_method_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `extraction_method_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `request_type` VARCHAR(30) NOT NULL,
  `request_config` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_method_request` (`extraction_method_id`, `code`),
  CONSTRAINT `fk_request_method` FOREIGN KEY (`extraction_method_id`)
    REFERENCES `extraction_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `extraction_method_fields` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` BIGINT UNSIGNED NOT NULL,
  `field_key` VARCHAR(100) NOT NULL,
  `source_path` VARCHAR(500) NOT NULL,
  `data_type` VARCHAR(30) NOT NULL,
  `unit` VARCHAR(30) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_request_field` (`request_id`, `field_key`),
  CONSTRAINT `fk_field_request` FOREIGN KEY (`request_id`)
    REFERENCES `extraction_method_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `equipment_extraction_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `equipment_id` BIGINT UNSIGNED NOT NULL,
  `extraction_method_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `connection_config` JSON NULL,
  `credential_ref` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_equipment_method_equipment` (`equipment_id`),
  KEY `idx_equipment_method_method` (`extraction_method_id`),
  CONSTRAINT `fk_equipment_extraction_method` FOREIGN KEY (`extraction_method_id`)
    REFERENCES `extraction_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `extraction_method_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `extraction_method_id` BIGINT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `definition_snapshot` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_method_version` (`extraction_method_id`, `version_number`),
  CONSTRAINT `fk_version_method` FOREIGN KEY (`extraction_method_id`)
    REFERENCES `extraction_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-1.1.0', 'Create normalized Extraction Methods tables and CRUD procedures')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list`$$
CREATE PROCEDURE `sp_extraction_methods_list`()
BEGIN
  SELECT m.`id`, m.`code`, m.`name`, m.`description`, m.`protocol`,
         m.`configuration_schema` AS `configurationSchema`,
         m.`is_active` AS `isActive`, m.`created_at` AS `createdAt`,
         m.`updated_at` AS `updatedAt`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', p.`id`, 'parameterKey', p.`parameter_key`,
           'dataType', p.`data_type`,
           'defaultValue', IF(p.`is_secret`, NULL, p.`default_value`),
           'hasDefaultValue', (p.`is_secret` AND p.`default_value` IS NOT NULL),
           'isRequired', p.`is_required`, 'isSecret', p.`is_secret`,
           'description', p.`description`
         )), JSON_ARRAY()) FROM `extraction_method_parameters` p
           WHERE p.`extraction_method_id` = m.`id`) AS `parameters`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', r.`id`, 'code', r.`code`, 'name', r.`name`,
           'requestType', r.`request_type`, 'requestConfig', r.`request_config`,
           'isActive', r.`is_active`,
           'fields', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
             'id', f.`id`, 'fieldKey', f.`field_key`,
             'sourcePath', f.`source_path`, 'dataType', f.`data_type`,
             'unit', f.`unit`, 'description', f.`description`
           )), JSON_ARRAY()) FROM `extraction_method_fields` f
             WHERE f.`request_id` = r.`id`)
         )), JSON_ARRAY()) FROM `extraction_method_requests` r
           WHERE r.`extraction_method_id` = m.`id`) AS `requests`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', e.`id`, 'equipmentId', e.`equipment_id`, 'name', e.`name`,
           'connectionConfig', e.`connection_config`,
           'credentialRef', e.`credential_ref`, 'isActive', e.`is_active`,
           'createdAt', e.`created_at`, 'updatedAt', e.`updated_at`
         )), JSON_ARRAY()) FROM `equipment_extraction_methods` e
           WHERE e.`extraction_method_id` = m.`id`) AS `equipment`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', v.`id`, 'versionNumber', v.`version_number`,
           'definitionSnapshot', v.`definition_snapshot`, 'createdAt', v.`created_at`
         )), JSON_ARRAY()) FROM `extraction_method_versions` v
           WHERE v.`extraction_method_id` = m.`id`) AS `versions`
  FROM `extraction_methods` m
  ORDER BY m.`name`, m.`id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_get`$$
CREATE PROCEDURE `sp_extraction_methods_get`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT m.`id`, m.`code`, m.`name`, m.`description`, m.`protocol`,
         m.`configuration_schema` AS `configurationSchema`,
         m.`is_active` AS `isActive`, m.`created_at` AS `createdAt`,
         m.`updated_at` AS `updatedAt`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', p.`id`, 'parameterKey', p.`parameter_key`,
           'dataType', p.`data_type`,
           'defaultValue', IF(p.`is_secret`, NULL, p.`default_value`),
           'hasDefaultValue', (p.`is_secret` AND p.`default_value` IS NOT NULL),
           'isRequired', p.`is_required`, 'isSecret', p.`is_secret`,
           'description', p.`description`
         )), JSON_ARRAY()) FROM `extraction_method_parameters` p
           WHERE p.`extraction_method_id` = m.`id`) AS `parameters`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', r.`id`, 'code', r.`code`, 'name', r.`name`,
           'requestType', r.`request_type`, 'requestConfig', r.`request_config`,
           'isActive', r.`is_active`,
           'fields', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
             'id', f.`id`, 'fieldKey', f.`field_key`,
             'sourcePath', f.`source_path`, 'dataType', f.`data_type`,
             'unit', f.`unit`, 'description', f.`description`
           )), JSON_ARRAY()) FROM `extraction_method_fields` f
             WHERE f.`request_id` = r.`id`)
         )), JSON_ARRAY()) FROM `extraction_method_requests` r
           WHERE r.`extraction_method_id` = m.`id`) AS `requests`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', e.`id`, 'equipmentId', e.`equipment_id`, 'name', e.`name`,
           'connectionConfig', e.`connection_config`,
           'credentialRef', e.`credential_ref`, 'isActive', e.`is_active`,
           'createdAt', e.`created_at`, 'updatedAt', e.`updated_at`
         )), JSON_ARRAY()) FROM `equipment_extraction_methods` e
           WHERE e.`extraction_method_id` = m.`id`) AS `equipment`,
         (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
           'id', v.`id`, 'versionNumber', v.`version_number`,
           'definitionSnapshot', v.`definition_snapshot`, 'createdAt', v.`created_at`
         )), JSON_ARRAY()) FROM `extraction_method_versions` v
           WHERE v.`extraction_method_id` = m.`id`) AS `versions`
  FROM `extraction_methods` m
  WHERE m.`id` = p_id
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list_parameters`$$
CREATE PROCEDURE `sp_extraction_methods_list_parameters`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `parameter_key` AS `parameterKey`, `data_type` AS `dataType`,
         IF(`is_secret`, NULL, `default_value`) AS `defaultValue`,
         (`is_secret` AND `default_value` IS NOT NULL) AS `hasDefaultValue`,
         `is_required` AS `isRequired`, `is_secret` AS `isSecret`, `description`
  FROM `extraction_method_parameters`
  WHERE `extraction_method_id` = p_id
  ORDER BY `id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list_requests`$$
CREATE PROCEDURE `sp_extraction_methods_list_requests`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT r.`id`, r.`code`, r.`name`, r.`request_type` AS `requestType`,
         r.`request_config` AS `requestConfig`, r.`is_active` AS `isActive`
  FROM `extraction_method_requests` r
  WHERE r.`extraction_method_id` = p_id
  ORDER BY r.`id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list_fields`$$
CREATE PROCEDURE `sp_extraction_methods_list_fields`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT f.`id`, f.`request_id` AS `requestId`, f.`field_key` AS `fieldKey`,
         f.`source_path` AS `sourcePath`, f.`data_type` AS `dataType`,
         f.`unit`, f.`description`
  FROM `extraction_method_fields` f
  INNER JOIN `extraction_method_requests` r ON r.`id` = f.`request_id`
  WHERE r.`extraction_method_id` = p_id
  ORDER BY f.`id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list_equipment`$$
CREATE PROCEDURE `sp_extraction_methods_list_equipment`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `equipment_id` AS `equipmentId`, `name`,
         `connection_config` AS `connectionConfig`, `credential_ref` AS `credentialRef`,
         `is_active` AS `isActive`, `created_at` AS `createdAt`,
         `updated_at` AS `updatedAt`
  FROM `equipment_extraction_methods`
  WHERE `extraction_method_id` = p_id
  ORDER BY `id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list_versions`$$
CREATE PROCEDURE `sp_extraction_methods_list_versions`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT `id`, `version_number` AS `versionNumber`,
         `definition_snapshot` AS `definitionSnapshot`, `created_at` AS `createdAt`
  FROM `extraction_method_versions`
  WHERE `extraction_method_id` = p_id
  ORDER BY `version_number` DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_create`$$
CREATE PROCEDURE `sp_extraction_methods_create`(
  IN p_code VARCHAR(100),
  IN p_name VARCHAR(150),
  IN p_description TEXT,
  IN p_protocol VARCHAR(30),
  IN p_configuration_schema LONGTEXT,
  IN p_is_active BOOLEAN,
  IN p_parameters_json LONGTEXT,
  IN p_requests_json LONGTEXT,
  IN p_equipment_json LONGTEXT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_next_version INT UNSIGNED;
  DECLARE v_method JSON;
  DECLARE v_snapshot JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO `extraction_methods` (`code`, `name`, `description`, `protocol`, `configuration_schema`, `is_active`)
  VALUES (p_code, p_name, p_description, IF(p_protocol IS NULL, '', p_protocol),
          IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)),
          p_is_active);
  SET v_id = LAST_INSERT_ID();
  CALL `sp_extraction_methods_replace_children`(
    v_id, p_parameters_json, p_requests_json, p_equipment_json
  );
  SET v_method = JSON_OBJECT(
    'code', p_code, 'name', p_name, 'description', p_description,
    'protocol', p_protocol,
    'configurationSchema', IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)),
    'isActive', p_is_active
  );
  SET v_snapshot = JSON_OBJECT(
    'method', v_method,
    'parameters', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'parameterKey', `parameter_key`, 'dataType', `data_type`,
      'defaultValue', IF(`is_secret`, NULL, `default_value`),
      'hasDefaultValue', (`is_secret` AND `default_value` IS NOT NULL),
      'isRequired', `is_required`, 'isSecret', `is_secret`,
      'description', `description`
    )), JSON_ARRAY()) FROM `extraction_method_parameters`
      WHERE `extraction_method_id` = v_id),
    'requests', CAST(COALESCE(p_requests_json, '[]') AS JSON),
    'equipment', CAST(COALESCE(p_equipment_json, '[]') AS JSON)
  );
  SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_next_version
  FROM `extraction_method_versions` WHERE `extraction_method_id` = v_id;
  INSERT INTO `extraction_method_versions` (`extraction_method_id`, `version_number`, `definition_snapshot`)
  VALUES (v_id, v_next_version, v_snapshot);
  COMMIT;
  CALL `sp_extraction_methods_get`(v_id);
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_replace_children`$$
CREATE PROCEDURE `sp_extraction_methods_replace_children`(
  IN p_method_id BIGINT UNSIGNED,
  IN p_parameters_json LONGTEXT,
  IN p_requests_json LONGTEXT,
  IN p_equipment_json LONGTEXT
)
BEGIN
  DECLARE v_done BOOLEAN DEFAULT FALSE;
  DECLARE v_index INT UNSIGNED DEFAULT 0;
  DECLARE v_count INT UNSIGNED DEFAULT 0;
  DECLARE v_request_id BIGINT UNSIGNED;
  DECLARE v_item JSON;
  DECLARE v_field JSON;
  DECLARE v_fields JSON;
  DECLARE v_field_index INT UNSIGNED;
  DECLARE v_field_count INT UNSIGNED;
  DECLARE v_config JSON;

  DELETE f FROM `extraction_method_fields` f
  INNER JOIN `extraction_method_requests` r ON r.`id` = f.`request_id`
  WHERE r.`extraction_method_id` = p_method_id;
  DELETE FROM `extraction_method_requests` WHERE `extraction_method_id` = p_method_id;
  DELETE FROM `extraction_method_parameters` WHERE `extraction_method_id` = p_method_id;
  DELETE FROM `equipment_extraction_methods` WHERE `extraction_method_id` = p_method_id;

  SET v_count = COALESCE(JSON_LENGTH(p_parameters_json), 0);
  SET v_index = 0;
  WHILE v_index < v_count DO
    SET v_item = JSON_EXTRACT(p_parameters_json, CONCAT('$[', v_index, ']'));
    INSERT INTO `extraction_method_parameters` (
      `extraction_method_id`, `parameter_key`, `data_type`, `default_value`,
      `is_required`, `is_secret`, `description`
    ) VALUES (
      p_method_id,
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.parameterKey')),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.dataType')),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.defaultValue')),
      IF(JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.isRequired')) = 'true', TRUE, FALSE),
      IF(JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.isSecret')) = 'true', TRUE, FALSE),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.description'))
    );
    SET v_index = v_index + 1;
  END WHILE;

  SET v_count = COALESCE(JSON_LENGTH(p_requests_json), 0);
  SET v_index = 0;
  WHILE v_index < v_count DO
    SET v_item = JSON_EXTRACT(p_requests_json, CONCAT('$[', v_index, ']'));
    SET v_config = JSON_EXTRACT(v_item, '$.requestConfig');
    INSERT INTO `extraction_method_requests` (
      `extraction_method_id`, `code`, `name`, `request_type`, `request_config`, `is_active`
    ) VALUES (
      p_method_id,
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.code')),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.name')),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.requestType')),
      v_config,
      IF(JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.isActive')) = 'false', FALSE, TRUE)
    );
    SET v_request_id = LAST_INSERT_ID();
    SET v_fields = JSON_EXTRACT(v_item, '$.fields');
    SET v_field_count = COALESCE(JSON_LENGTH(v_fields), 0);
    SET v_field_index = 0;
    WHILE v_field_index < v_field_count DO
      SET v_field = JSON_EXTRACT(v_fields, CONCAT('$[', v_field_index, ']'));
      INSERT INTO `extraction_method_fields` (
        `request_id`, `field_key`, `source_path`, `data_type`, `unit`, `description`
      ) VALUES (
        v_request_id,
        JSON_UNQUOTE(JSON_EXTRACT(v_field, '$.fieldKey')),
        JSON_UNQUOTE(JSON_EXTRACT(v_field, '$.sourcePath')),
        JSON_UNQUOTE(JSON_EXTRACT(v_field, '$.dataType')),
        JSON_UNQUOTE(JSON_EXTRACT(v_field, '$.unit')),
        JSON_UNQUOTE(JSON_EXTRACT(v_field, '$.description'))
      );
      SET v_field_index = v_field_index + 1;
    END WHILE;
    SET v_index = v_index + 1;
  END WHILE;

  SET v_count = COALESCE(JSON_LENGTH(p_equipment_json), 0);
  SET v_index = 0;
  WHILE v_index < v_count DO
    SET v_item = JSON_EXTRACT(p_equipment_json, CONCAT('$[', v_index, ']'));
    INSERT INTO `equipment_extraction_methods` (
      `equipment_id`, `extraction_method_id`, `name`, `connection_config`,
      `credential_ref`, `is_active`
    ) VALUES (
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.equipmentId')),
      p_method_id,
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.name')),
      JSON_EXTRACT(v_item, '$.connectionConfig'),
      JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.credentialRef')),
      IF(JSON_UNQUOTE(JSON_EXTRACT(v_item, '$.isActive')) = 'false', FALSE, TRUE)
    );
    SET v_index = v_index + 1;
  END WHILE;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_update`$$
CREATE PROCEDURE `sp_extraction_methods_update`(
  IN p_id BIGINT UNSIGNED,
  IN p_code VARCHAR(100), IN p_has_code BOOLEAN,
  IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_description TEXT, IN p_has_description BOOLEAN,
  IN p_protocol VARCHAR(30), IN p_has_protocol BOOLEAN,
  IN p_configuration_schema LONGTEXT, IN p_has_configuration_schema BOOLEAN,
  IN p_is_active BOOLEAN, IN p_has_is_active BOOLEAN,
  IN p_parameters_json LONGTEXT, IN p_has_parameters BOOLEAN,
  IN p_requests_json LONGTEXT, IN p_has_requests BOOLEAN,
  IN p_equipment_json LONGTEXT, IN p_has_equipment BOOLEAN
)
BEGIN
  DECLARE v_next_version INT UNSIGNED;
  DECLARE v_method JSON;
  DECLARE v_snapshot JSON;
  DECLARE v_parameters JSON;
  DECLARE v_requests JSON;
  DECLARE v_equipment JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF NOT EXISTS (SELECT 1 FROM `extraction_methods` WHERE `id` = p_id) THEN
    SELECT 0 AS `found`;
  ELSE
    START TRANSACTION;
    UPDATE `extraction_methods`
    SET `code` = IF(p_has_code, p_code, `code`),
        `name` = IF(p_has_name, p_name, `name`),
        `description` = IF(p_has_description, p_description, `description`),
        `protocol` = IF(p_has_protocol, p_protocol, `protocol`),
        `configuration_schema` = IF(p_has_configuration_schema,
          IF(p_configuration_schema IS NULL, NULL, CAST(p_configuration_schema AS JSON)),
          `configuration_schema`),
        `is_active` = IF(p_has_is_active, p_is_active, `is_active`)
    WHERE `id` = p_id;

    IF p_has_parameters OR p_has_requests OR p_has_equipment THEN
      CALL `sp_extraction_methods_replace_children`(
        p_id,
        IF(p_has_parameters, p_parameters_json,
          (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
            'parameterKey', `parameter_key`, 'dataType', `data_type`,
            'defaultValue', `default_value`, 'isRequired', `is_required`,
            'isSecret', `is_secret`, 'description', `description`
          ))) FROM `extraction_method_parameters` WHERE `extraction_method_id` = p_id)),
        IF(p_has_requests, p_requests_json,
          (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
            'code', r.`code`, 'name', r.`name`, 'requestType', r.`request_type`,
            'requestConfig', r.`request_config`, 'isActive', r.`is_active`,
            'fields', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
              'fieldKey', f.`field_key`, 'sourcePath', f.`source_path`,
              'dataType', f.`data_type`, 'unit', f.`unit`, 'description', f.`description`
            ))) FROM `extraction_method_fields` f WHERE f.`request_id` = r.`id`)
          ))) FROM `extraction_method_requests` r WHERE r.`extraction_method_id` = p_id)),
        IF(p_has_equipment, p_equipment_json,
          (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
            'equipmentId', `equipment_id`, 'name', `name`,
            'connectionConfig', `connection_config`, 'credentialRef', `credential_ref`,
            'isActive', `is_active`
          ))) FROM `equipment_extraction_methods` WHERE `extraction_method_id` = p_id))
      );
    END IF;

    SELECT JSON_OBJECT(
      'code', `code`, 'name', `name`, 'description', `description`,
      'protocol', `protocol`, 'configurationSchema', `configuration_schema`,
      'isActive', `is_active`
    ) INTO v_method FROM `extraction_methods` WHERE `id` = p_id;
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'parameterKey', `parameter_key`, 'dataType', `data_type`,
      'defaultValue', IF(`is_secret`, NULL, `default_value`),
      'hasDefaultValue', (`is_secret` AND `default_value` IS NOT NULL),
      'isRequired', `is_required`, 'isSecret', `is_secret`,
      'description', `description`
    )), JSON_ARRAY()) INTO v_parameters
    FROM `extraction_method_parameters` WHERE `extraction_method_id` = p_id;
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'code', r.`code`, 'name', r.`name`, 'requestType', r.`request_type`,
      'requestConfig', r.`request_config`, 'isActive', r.`is_active`,
      'fields', (SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
        'fieldKey', f.`field_key`, 'sourcePath', f.`source_path`,
        'dataType', f.`data_type`, 'unit', f.`unit`, 'description', f.`description`
      ))) FROM `extraction_method_fields` f WHERE f.`request_id` = r.`id`)
    )), JSON_ARRAY()) INTO v_requests
    FROM `extraction_method_requests` r WHERE r.`extraction_method_id` = p_id;
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'equipmentId', `equipment_id`, 'name', `name`,
      'connectionConfig', `connection_config`, 'credentialRef', `credential_ref`,
      'isActive', `is_active`
    )), JSON_ARRAY()) INTO v_equipment
    FROM `equipment_extraction_methods` WHERE `extraction_method_id` = p_id;
    SET v_snapshot = JSON_OBJECT(
      'method', v_method, 'parameters', v_parameters,
      'requests', v_requests, 'equipment', v_equipment
    );
    SELECT COALESCE(MAX(`version_number`), 0) + 1 INTO v_next_version
    FROM `extraction_method_versions` WHERE `extraction_method_id` = p_id;
    INSERT INTO `extraction_method_versions` (`extraction_method_id`, `version_number`, `definition_snapshot`)
    VALUES (p_id, v_next_version, v_snapshot);
    COMMIT;
    CALL `sp_extraction_methods_get`(p_id);
  END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_delete`$$
CREATE PROCEDURE `sp_extraction_methods_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  DELETE FROM `extraction_methods` WHERE `id` = p_id;
  SELECT ROW_COUNT() AS `affected`;
END$$

DELIMITER ;
