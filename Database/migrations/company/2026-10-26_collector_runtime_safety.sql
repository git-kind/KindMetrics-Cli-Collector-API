-- Serialize queue policy decisions per Collector and enforce checkpoint optimistic concurrency.
DROP PROCEDURE `sp_collector_execution_create`;
DROP PROCEDURE `sp_collector_checkpoint_upsert`;

DELIMITER $$

CREATE PROCEDURE `sp_collector_execution_create`(
  IN p_collector_id BIGINT UNSIGNED, IN p_trigger_type VARCHAR(20), IN p_requested_by VARCHAR(64)
)
BEGIN
  DECLARE v_version INT UNSIGNED DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_overlap_policy VARCHAR(30) DEFAULT 'SKIP';
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF p_trigger_type NOT IN ('MANUAL', 'SCHEDULE', 'EVENT', 'RETRY') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_TRIGGER_INVALID';
  END IF;
  START TRANSACTION;
  SELECT c.`config_version`, c.`status`, COALESCE(p.`overlap_policy`, 'SKIP')
    INTO v_version, v_status, v_overlap_policy
  FROM `collectors` c LEFT JOIN `collector_policies` p ON p.`collector_id` = c.`id`
  WHERE c.`id` = p_collector_id FOR UPDATE;
  IF v_version IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND'; END IF;
  IF v_status <> 'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_ACTIVE'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM `collectors` c INNER JOIN `services` s ON s.`id` = c.`service_id`
    WHERE c.`id` = p_collector_id AND s.`is_active` = TRUE
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE'; END IF;
  IF v_overlap_policy = 'SKIP' AND EXISTS (
    SELECT 1 FROM `collector_executions` WHERE `collector_id` = p_collector_id AND `status` IN ('QUEUED', 'RUNNING')
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_EXECUTION_OVERLAP'; END IF;
  IF v_overlap_policy = 'CANCEL_PREVIOUS' THEN
    UPDATE `collector_executions` SET `status` = 'CANCELLED', `finished_at` = CURRENT_TIMESTAMP(3),
      `lease_owner` = NULL, `lease_until` = NULL
    WHERE `collector_id` = p_collector_id AND `status` IN ('QUEUED', 'RUNNING');
  END IF;
  INSERT INTO `collector_executions` (`collector_id`, `collector_version`, `trigger_type`, `status`, `requested_by`)
  VALUES (p_collector_id, v_version, p_trigger_type, 'QUEUED', p_requested_by);
  SET v_id = LAST_INSERT_ID();
  COMMIT;
  SELECT * FROM `collector_executions` WHERE `id` = v_id;
END$$

CREATE PROCEDURE `sp_collector_checkpoint_upsert`(
  IN p_collector_id BIGINT UNSIGNED, IN p_method_id BIGINT UNSIGNED,
  IN p_target_id BIGINT UNSIGNED, IN p_key VARCHAR(100), IN p_value LONGTEXT,
  IN p_expected_lock_version BIGINT UNSIGNED
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_current_version BIGINT UNSIGNED DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT JSON_VALID(p_value) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_INVALID_JSON'; END IF;
  IF NOT EXISTS (SELECT 1 FROM `collectors` WHERE `id` = p_collector_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_NOT_FOUND';
  END IF;
  IF p_method_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `collector_methods` WHERE `id` = p_method_id AND `collector_id` = p_collector_id
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_METHOD_INVALID'; END IF;
  IF p_target_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `collector_targets` WHERE `id` = p_target_id AND `collector_id` = p_collector_id
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_TARGET_INVALID'; END IF;
  START TRANSACTION;
  SELECT `id`, `lock_version` INTO v_id, v_current_version
  FROM `collector_checkpoints`
  WHERE `collector_id` = p_collector_id
    AND `method_scope_id` = COALESCE(p_method_id, 0)
    AND `target_scope_id` = COALESCE(p_target_id, 0)
    AND `checkpoint_key` = COALESCE(p_key, 'DEFAULT')
  FOR UPDATE;
  IF v_id IS NULL THEN
    IF p_expected_lock_version IS NOT NULL AND p_expected_lock_version <> 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_VERSION_CONFLICT';
    END IF;
    INSERT INTO `collector_checkpoints` (`collector_id`, `collector_method_id`, `collector_target_id`, `checkpoint_key`, `checkpoint_value`)
    VALUES (p_collector_id, p_method_id, p_target_id, COALESCE(p_key, 'DEFAULT'), CAST(p_value AS JSON));
  ELSE
    IF p_expected_lock_version IS NOT NULL AND p_expected_lock_version <> v_current_version THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COLLECTOR_CHECKPOINT_VERSION_CONFLICT';
    END IF;
    UPDATE `collector_checkpoints` SET `checkpoint_value` = CAST(p_value AS JSON), `lock_version` = `lock_version` + 1
    WHERE `id` = v_id;
  END IF;
  COMMIT;
  CALL `sp_collector_checkpoint_get`(p_collector_id, p_method_id, p_target_id, COALESCE(p_key, 'DEFAULT'));
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-col-runtime', 'Serialize Collector enqueue and enforce checkpoint optimistic concurrency');
