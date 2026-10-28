-- Normalize protocol/driver comparisons across legacy Extraction Method and Service collations.
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

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-col-proto-coll', 'Normalize Service/Extraction Method protocol comparison collations');
