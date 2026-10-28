-- Keep Services deletion and usage consistent with the new mandatory Collector -> Service FK.
DROP PROCEDURE `sp_service_get_usage`;
DROP PROCEDURE `sp_service_delete`;

DELIMITER $$

CREATE PROCEDURE `sp_service_get_usage`(IN p_id BIGINT UNSIGNED)
BEGIN
  SELECT s.`id` AS `serviceId`,
    (SELECT COUNT(*) FROM `service_credentials` c WHERE c.`service_id` = s.`id`) AS `credentialReferences`,
    (SELECT COUNT(*) FROM `collectors` c WHERE c.`service_id` = s.`id`) AS `collectorBindings`,
    ((SELECT COUNT(*) FROM `service_credentials` c WHERE c.`service_id` = s.`id`) > 0
      OR (SELECT COUNT(*) FROM `collectors` c WHERE c.`service_id` = s.`id`) > 0) AS `deletionBlocked`
  FROM `services` s WHERE s.`id` = p_id;
END$$

CREATE PROCEDURE `sp_service_delete`(IN p_id BIGINT UNSIGNED)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF EXISTS (SELECT 1 FROM `service_credentials` WHERE `service_id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_HAS_CREDENTIAL_REFERENCES';
  END IF;
  IF EXISTS (SELECT 1 FROM `collectors` WHERE `service_id` = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SERVICE_HAS_COLLECTORS';
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

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-svc-coll', 'Block Service deletion while linked Collectors exist and report usage');
