USE `kindmetricscte`;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_users_get_by_email`$$
CREATE PROCEDURE `sp_users_get_by_email`(IN p_email VARCHAR(255))
BEGIN
  SELECT `guid`, `email`, `name`, `password_hash`, `status`, `is_platform_admin`
  FROM `users`
  WHERE `email` = p_email
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_users_get_by_guid`$$
CREATE PROCEDURE `sp_users_get_by_guid`(IN p_guid CHAR(36))
BEGIN
  SELECT `guid`, `email`, `name`, `status`, `is_platform_admin`, `created_at`
  FROM `users`
  WHERE `guid` = p_guid
  LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_users_list`$$
CREATE PROCEDURE `sp_users_list`()
BEGIN
  SELECT `guid`, `email`, `name`, `status`, `is_platform_admin`, `created_at`
  FROM `users`
  ORDER BY `created_at` DESC, `id` DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_users_create`$$
CREATE PROCEDURE `sp_users_create`(
  IN p_email VARCHAR(255),
  IN p_name VARCHAR(160),
  IN p_password_hash VARCHAR(255),
  IN p_is_platform_admin TINYINT(1)
)
BEGIN
  DECLARE v_guid CHAR(36);
  SET v_guid = UUID();

  INSERT INTO `users` (`guid`, `email`, `name`, `password_hash`, `is_platform_admin`)
  VALUES (v_guid, p_email, p_name, p_password_hash, p_is_platform_admin);

  SELECT v_guid AS `guid`;
END$$

DROP PROCEDURE IF EXISTS `sp_users_update`$$
CREATE PROCEDURE `sp_users_update`(
  IN p_guid CHAR(36),
  IN p_email VARCHAR(255),
  IN p_name VARCHAR(160),
  IN p_status VARCHAR(20),
  IN p_is_platform_admin TINYINT(1),
  IN p_password_hash VARCHAR(255)
)
BEGIN
  UPDATE `users`
  SET `email` = p_email,
      `name` = p_name,
      `status` = p_status,
      `is_platform_admin` = p_is_platform_admin,
      `password_hash` = COALESCE(p_password_hash, `password_hash`)
  WHERE `guid` = p_guid;

  SELECT ROW_COUNT() AS `affected`;
END$$

DROP PROCEDURE IF EXISTS `sp_users_delete`$$
CREATE PROCEDURE `sp_users_delete`(IN p_guid CHAR(36))
BEGIN
  DELETE FROM `users` WHERE `guid` = p_guid;
  SELECT ROW_COUNT() AS `affected`;
END$$

DELIMITER ;