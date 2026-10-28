-- Enforce driver/auth-type compatibility when saving a Service connection.
DROP PROCEDURE `sp_service_connection_upsert`;

DELIMITER $$

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
    'authConfigured', (c.`auth_config` <> JSON_OBJECT()), 'authAlgorithm', c.`auth_algorithm`,
    'encryptionAlgorithm', c.`encryption_algorithm`, 'additionalParameters', c.`additional_parameters`
  ), p_updated_by FROM `services` s INNER JOIN `service_connections` c ON c.`service_id` = s.`id`
  WHERE s.`id` = p_service_id;
  COMMIT;
  CALL `sp_service_connection_get`(p_service_id);
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-svc-auth', 'Enforce Service driver authentication compatibility');
