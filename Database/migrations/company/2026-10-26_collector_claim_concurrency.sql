-- Enforce max_concurrency while atomically claiming queued or abandoned execution leases.
DROP PROCEDURE `sp_collector_execution_claim`;

DELIMITER $$

CREATE PROCEDURE `sp_collector_execution_claim`(IN p_worker VARCHAR(128), IN p_lease_seconds INT UNSIGNED)
BEGIN
  DECLARE v_collector_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_execution_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_max_concurrency SMALLINT UNSIGNED DEFAULT 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT c.`id`, COALESCE(p.`max_concurrency`, 1)
    INTO v_collector_id, v_max_concurrency
  FROM `collectors` c
  LEFT JOIN `collector_policies` p ON p.`collector_id` = c.`id`
  WHERE c.`status` = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM `collector_executions` candidate
      WHERE candidate.`collector_id` = c.`id`
        AND (candidate.`status` = 'QUEUED'
          OR (candidate.`status` = 'RUNNING' AND candidate.`lease_until` < CURRENT_TIMESTAMP(3)))
    )
    AND (
      SELECT COUNT(*) FROM `collector_executions` running
      WHERE running.`collector_id` = c.`id` AND running.`status` = 'RUNNING'
        AND running.`lease_until` >= CURRENT_TIMESTAMP(3)
    ) < COALESCE(p.`max_concurrency`, 1)
  ORDER BY (
    SELECT MIN(candidate.`requested_at`) FROM `collector_executions` candidate
    WHERE candidate.`collector_id` = c.`id`
      AND (candidate.`status` = 'QUEUED'
        OR (candidate.`status` = 'RUNNING' AND candidate.`lease_until` < CURRENT_TIMESTAMP(3)))
  ), c.`id`
  LIMIT 1 FOR UPDATE;

  IF v_collector_id IS NOT NULL THEN
    SELECT `id` INTO v_execution_id FROM `collector_executions`
    WHERE `collector_id` = v_collector_id
      AND (`status` = 'QUEUED' OR (`status` = 'RUNNING' AND `lease_until` < CURRENT_TIMESTAMP(3)))
    ORDER BY `requested_at`, `id` LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF v_execution_id IS NOT NULL THEN
      UPDATE `collector_executions` SET `status` = 'RUNNING', `lease_owner` = p_worker,
        `lease_until` = TIMESTAMPADD(SECOND, LEAST(GREATEST(COALESCE(p_lease_seconds, 60), 10), 3600), CURRENT_TIMESTAMP(3)),
        `started_at` = COALESCE(`started_at`, CURRENT_TIMESTAMP(3))
      WHERE `id` = v_execution_id;
    END IF;
  END IF;
  COMMIT;
  SELECT * FROM `collector_executions` WHERE `id` = v_execution_id;
END$$

DELIMITER ;

INSERT INTO `schema_migrations` (`version`, `description`)
VALUES ('company-2026.10.26-col-claim', 'Enforce max_concurrency during transactional Collector job claims');
