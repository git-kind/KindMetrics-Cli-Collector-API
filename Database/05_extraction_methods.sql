CREATE DATABASE IF NOT EXISTS `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`;

CREATE TABLE IF NOT EXISTS `extraction_method` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `type` VARCHAR(60) NOT NULL,
  `target` VARCHAR(255) NULL,
  `connection_json` JSON NOT NULL,
  `credentials_json` JSON NULL,
  `discovery_json` JSON NULL,
  `available_data_json` JSON NULL,
  `capabilities_json` JSON NULL,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  KEY `ix_extraction_method_status_name` (`status`, `name`)
) ENGINE=InnoDB;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_list`$$
CREATE PROCEDURE `sp_extraction_methods_list`()
BEGIN
  SELECT `id`, `name`, `type`, `target`,
         `connection_json` AS `connection`,
         (`credentials_json` IS NOT NULL) AS `hasCredentials`,
         `discovery_json` AS `discovery`,
         `available_data_json` AS `availableData`,
         `capabilities_json` AS `capabilities`,
         `status`, `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `extraction_method`
  ORDER BY `name`, `id`;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_get`$$
CREATE PROCEDURE `sp_extraction_methods_get`(IN p_id CHAR(36))
BEGIN
  SELECT `id`, `name`, `type`, `target`,
         `connection_json` AS `connection`,
         (`credentials_json` IS NOT NULL) AS `hasCredentials`,
         `discovery_json` AS `discovery`,
         `available_data_json` AS `availableData`,
         `capabilities_json` AS `capabilities`,
         `status`, `created_at` AS `createdAt`, `updated_at` AS `updatedAt`
  FROM `extraction_method`
  WHERE `id` = p_id
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_create`$$
CREATE PROCEDURE `sp_extraction_methods_create`(
  IN p_name VARCHAR(150),
  IN p_type VARCHAR(60),
  IN p_target VARCHAR(255),
  IN p_connection_json LONGTEXT,
  IN p_credentials_json LONGTEXT,
  IN p_discovery_json LONGTEXT,
  IN p_available_data_json LONGTEXT,
  IN p_capabilities_json LONGTEXT,
  IN p_status VARCHAR(8)
)
BEGIN
  DECLARE v_id CHAR(36);
  SET v_id = UUID();

  INSERT INTO `extraction_method` (
    `id`, `name`, `type`, `target`, `connection_json`, `credentials_json`,
    `discovery_json`, `available_data_json`, `capabilities_json`, `status`
  ) VALUES (
    v_id, p_name, p_type, p_target,
    CAST(p_connection_json AS JSON),
    IF(p_credentials_json IS NULL, NULL, CAST(p_credentials_json AS JSON)),
    IF(p_discovery_json IS NULL, NULL, CAST(p_discovery_json AS JSON)),
    IF(p_available_data_json IS NULL, NULL, CAST(p_available_data_json AS JSON)),
    IF(p_capabilities_json IS NULL, NULL, CAST(p_capabilities_json AS JSON)),
    p_status
  );

  CALL `sp_extraction_methods_get`(v_id);
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_update`$$
CREATE PROCEDURE `sp_extraction_methods_update`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(150), IN p_has_name BOOLEAN,
  IN p_type VARCHAR(60), IN p_has_type BOOLEAN,
  IN p_target VARCHAR(255), IN p_has_target BOOLEAN,
  IN p_connection_json LONGTEXT, IN p_has_connection BOOLEAN,
  IN p_credentials_json LONGTEXT, IN p_has_credentials BOOLEAN,
  IN p_discovery_json LONGTEXT, IN p_has_discovery BOOLEAN,
  IN p_available_data_json LONGTEXT, IN p_has_available_data BOOLEAN,
  IN p_capabilities_json LONGTEXT, IN p_has_capabilities BOOLEAN,
  IN p_status VARCHAR(8), IN p_has_status BOOLEAN
)
BEGIN
  IF EXISTS (SELECT 1 FROM `extraction_method` WHERE `id` = p_id) THEN
    UPDATE `extraction_method`
    SET `name` = IF(p_has_name, p_name, `name`),
        `type` = IF(p_has_type, p_type, `type`),
        `target` = IF(p_has_target, p_target, `target`),
        `connection_json` = IF(p_has_connection,
          CAST(p_connection_json AS JSON), `connection_json`),
        `credentials_json` = IF(p_has_credentials,
          IF(p_credentials_json IS NULL, NULL, CAST(p_credentials_json AS JSON)),
          `credentials_json`),
        `discovery_json` = IF(p_has_discovery,
          IF(p_discovery_json IS NULL, NULL, CAST(p_discovery_json AS JSON)),
          `discovery_json`),
        `available_data_json` = IF(p_has_available_data,
          IF(p_available_data_json IS NULL, NULL, CAST(p_available_data_json AS JSON)),
          `available_data_json`),
        `capabilities_json` = IF(p_has_capabilities,
          IF(p_capabilities_json IS NULL, NULL, CAST(p_capabilities_json AS JSON)),
          `capabilities_json`),
        `status` = IF(p_has_status, p_status, `status`)
    WHERE `id` = p_id;
  END IF;

  CALL `sp_extraction_methods_get`(p_id);
END$$

DROP PROCEDURE IF EXISTS `sp_extraction_methods_delete`$$
CREATE PROCEDURE `sp_extraction_methods_delete`(IN p_id CHAR(36))
BEGIN
  DELETE FROM `extraction_method` WHERE `id` = p_id;
  SELECT ROW_COUNT() AS `affected`;
END$$

DELIMITER ;