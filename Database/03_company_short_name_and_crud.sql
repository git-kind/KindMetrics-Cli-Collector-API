USE `kindmetricscte`;

-- Additive migration: preserve existing Company rows and initialize short_name from code.
SET @short_name_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company'
    AND COLUMN_NAME = 'short_name'
);

SET @short_name_ddl = IF(
  @short_name_exists = 0,
  'ALTER TABLE `company` ADD COLUMN `short_name` VARCHAR(80) NULL AFTER `name`',
  'SELECT 1'
);
PREPARE short_name_stmt FROM @short_name_ddl;
EXECUTE short_name_stmt;
DEALLOCATE PREPARE short_name_stmt;

UPDATE `company`
SET `short_name` = LEFT(`code`, 80)
WHERE `short_name` IS NULL OR `short_name` = '';

ALTER TABLE `company`
  MODIFY COLUMN `short_name` VARCHAR(80) NOT NULL;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('1.1.0', 'Add Company short name and CRUD procedures')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_companies_list`$$
CREATE PROCEDURE `sp_companies_list`()
BEGIN
  SELECT `guid`, `name`, `short_name` AS `shortName`, `code`, `timezone`,
         `locale`, `status`, `config_json` AS `configJson`,
         `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `company`
  ORDER BY `name`, `id`;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_get_by_guid`$$
CREATE PROCEDURE `sp_companies_get_by_guid`(IN p_guid CHAR(36))
BEGIN
  SELECT `guid`, `name`, `short_name` AS `shortName`, `code`, `timezone`,
         `locale`, `status`, `config_json` AS `configJson`,
         `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
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

    SELECT `guid`, `name`, `short_name` AS `shortName`, `code`, `timezone`,
      `locale`, `status`, `config_json` AS `configJson`,
      `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
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

        SELECT `guid`, `name`, `short_name` AS `shortName`, `code`, `timezone`,
          `locale`, `status`, `config_json` AS `configJson`,
          `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
        FROM `company`
        WHERE `guid` = p_guid;
  END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_companies_delete`$$
CREATE PROCEDURE `sp_companies_delete`(IN p_guid CHAR(36))
BEGIN
  DELETE FROM `company` WHERE `guid` = p_guid;
  SELECT ROW_COUNT() AS `affected`;
END$$

DELIMITER ;