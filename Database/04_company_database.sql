USE `kindmetricscte`;

SET @database_name_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company'
    AND COLUMN_NAME = 'database_name'
);

SET @database_name_ddl = IF(
  @database_name_exists = 0,
  'ALTER TABLE `company` ADD COLUMN `database_name` VARCHAR(64) NULL AFTER `code`',
  'SELECT 1'
);
PREPARE company_database_column_stmt FROM @database_name_ddl;
EXECUTE company_database_column_stmt;
DEALLOCATE PREPARE company_database_column_stmt;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('1.2.0', 'Add Company database mapping and database creation procedure')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_companies_list`$$
CREATE PROCEDURE `sp_companies_list`()
BEGIN
  SELECT `guid`, `name`, `short_name` AS `shortName`, `code`,
         `database_name` AS `databaseName`, `timezone`, `locale`, `status`,
         `config_json` AS `configJson`, `created_at` AS `createdAt`,
         `updated_at` AS `updatedAt`
  FROM `company`
  ORDER BY `name`, `id`;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_get_by_guid`$$
CREATE PROCEDURE `sp_companies_get_by_guid`(IN p_guid CHAR(36))
BEGIN
  SELECT `guid`, `name`, `short_name` AS `shortName`, `code`,
         `database_name` AS `databaseName`, `timezone`, `locale`, `status`,
         `config_json` AS `configJson`, `created_at` AS `createdAt`,
         `updated_at` AS `updatedAt`
  FROM `company`
  WHERE `guid` = p_guid
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_create`$$
CREATE PROCEDURE `sp_companies_create`(
  IN p_name VARCHAR(200),
  IN p_short_name VARCHAR(80),
  IN p_code VARCHAR(60),
  IN p_timezone VARCHAR(64),
  IN p_locale VARCHAR(10),
  IN p_status VARCHAR(8),
  IN p_config_json LONGTEXT
)
BEGIN
  DECLARE v_guid CHAR(36);
  SET v_guid = UUID();

  INSERT INTO `company`
    (`guid`, `name`, `short_name`, `code`, `timezone`, `locale`, `status`, `config_json`)
  VALUES
    (v_guid, p_name, p_short_name, p_code, p_timezone, p_locale, p_status,
     IF(p_config_json IS NULL, NULL, CAST(p_config_json AS JSON)));

  SELECT `guid`, `name`, `short_name` AS `shortName`, `code`,
         `database_name` AS `databaseName`, `timezone`, `locale`, `status`,
         `config_json` AS `configJson`, `created_at` AS `createdAt`,
         `updated_at` AS `updatedAt`
  FROM `company`
  WHERE `guid` = v_guid;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_update`$$
CREATE PROCEDURE `sp_companies_update`(
  IN p_guid CHAR(36),
  IN p_name VARCHAR(200), IN p_has_name BOOLEAN,
  IN p_short_name VARCHAR(80), IN p_has_short_name BOOLEAN,
  IN p_code VARCHAR(60), IN p_has_code BOOLEAN,
  IN p_timezone VARCHAR(64), IN p_has_timezone BOOLEAN,
  IN p_locale VARCHAR(10), IN p_has_locale BOOLEAN,
  IN p_status VARCHAR(8), IN p_has_status BOOLEAN,
  IN p_config_json LONGTEXT, IN p_has_config_json BOOLEAN
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM `company` WHERE `guid` = p_guid) THEN
    SELECT NULL AS `guid`;
  ELSE
    UPDATE `company`
    SET `name` = IF(p_has_name, p_name, `name`),
        `short_name` = IF(p_has_short_name, p_short_name, `short_name`),
        `code` = IF(p_has_code, p_code, `code`),
        `timezone` = IF(p_has_timezone, p_timezone, `timezone`),
        `locale` = IF(p_has_locale, p_locale, `locale`),
        `status` = IF(p_has_status, p_status, `status`),
        `config_json` = IF(p_has_config_json,
          IF(p_config_json IS NULL, NULL, CAST(p_config_json AS JSON)),
          `config_json`)
    WHERE `guid` = p_guid;

    SELECT `guid`, `name`, `short_name` AS `shortName`, `code`,
           `database_name` AS `databaseName`, `timezone`, `locale`, `status`,
           `config_json` AS `configJson`, `created_at` AS `createdAt`,
           `updated_at` AS `updatedAt`
    FROM `company`
    WHERE `guid` = p_guid;
  END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_create_database`$$
CREATE PROCEDURE `sp_companies_create_database`(IN p_guid CHAR(36))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_guid CHAR(36) DEFAULT NULL;
  DECLARE v_existing_name VARCHAR(64) DEFAULT NULL;
  DECLARE v_database_name VARCHAR(64);
  DECLARE v_database_exists BOOLEAN DEFAULT FALSE;

  SELECT `guid`, `database_name`
    INTO v_guid, v_existing_name
  FROM `company`
  WHERE `guid` = p_guid
  LIMIT 1;

  IF v_guid IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COMPANY_NOT_FOUND';
  END IF;

  SET v_database_name = CONCAT('km_company_', REPLACE(v_guid, '-', ''));

  IF v_guid NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_COMPANY_GUID';
  END IF;

  IF v_existing_name IS NOT NULL AND v_existing_name <> v_database_name THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'COMPANY_DATABASE_MAPPING_CONFLICT';
  END IF;

  SELECT COUNT(*) > 0
    INTO v_database_exists
  FROM information_schema.SCHEMATA
  WHERE SCHEMA_NAME = v_database_name;

  IF v_database_exists AND v_existing_name IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'COMPANY_DATABASE_ALREADY_EXISTS_UNMAPPED';
  END IF;

  IF NOT v_database_exists THEN
    SET @company_database_ddl = CONCAT(
      'CREATE DATABASE `', v_database_name,
      '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    PREPARE company_database_stmt FROM @company_database_ddl;
    EXECUTE company_database_stmt;
    DEALLOCATE PREPARE company_database_stmt;
  END IF;

  UPDATE `company`
  SET `database_name` = v_database_name
  WHERE `guid` = v_guid;

  SELECT v_guid AS `companyGuid`,
         v_database_name AS `databaseName`,
         NOT v_database_exists AS `created`;
END$$

DELIMITER ;