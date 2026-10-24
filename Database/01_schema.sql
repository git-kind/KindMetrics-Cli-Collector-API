CREATE DATABASE IF NOT EXISTS `kindmetricscte` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kindmetricscte`;
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(40) NOT NULL PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL,
  `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `company` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `guid` CHAR(36) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `short_name` VARCHAR(80) NOT NULL,
  `code` VARCHAR(60) NOT NULL,
  `database_name` VARCHAR(64) NULL,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
  `locale` VARCHAR(10) NOT NULL DEFAULT 'es',
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `config_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_company_guid` (`guid`),
  UNIQUE KEY `uq_company_code` (`code`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `collector_instance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `guid` CHAR(36) NOT NULL,
  `company_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `version` VARCHAR(40) NULL,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `last_seen_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_collector_guid` (`guid`),
  KEY `ix_collector_company` (`company_id`),
  CONSTRAINT `fk_collector_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `guid` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `is_platform_admin` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_guid` (`guid`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) NULL,
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(80) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `is_system` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_roles_company_code` (`company_id`,`code`),
  CONSTRAINT `fk_roles_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `sync_destinations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(80) NOT NULL,
  `destination_type` ENUM('KIND_SERVER','CUSTOM_API') NOT NULL DEFAULT 'KIND_SERVER',
  `base_url` VARCHAR(1024) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `config_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_sync_destination` (`company_id`,`code`),
  CONSTRAINT `fk_sync_dest_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `sync_state` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `destination_id` BIGINT UNSIGNED NOT NULL,
  `stream_code` VARCHAR(100) NOT NULL,
  `cursor_value` VARCHAR(512) NULL,
  `last_success_at` DATETIME(3) NULL,
  `last_attempt_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_sync_state` (`collector_id`,`destination_id`,`stream_code`),
  CONSTRAINT `fk_sync_state_collector` FOREIGN KEY (`collector_id`) REFERENCES `collector_instance` (`id`),
  CONSTRAINT `fk_sync_state_destination` FOREIGN KEY (`destination_id`) REFERENCES `sync_destinations` (`id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `sync_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `run_guid` CHAR(36) NOT NULL,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `destination_id` BIGINT UNSIGNED NOT NULL,
  `stream_code` VARCHAR(100) NOT NULL,
  `status` ENUM('RUNNING','SUCCESS','PARTIAL','FAILED') NOT NULL DEFAULT 'RUNNING',
  `records_sent` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `records_failed` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` DATETIME(3) NULL,
  `error_message` TEXT NULL,
  UNIQUE KEY `uq_sync_run_guid` (`run_guid`),
  KEY `ix_sync_runs_status_started` (`status`,`started_at`),
  CONSTRAINT `fk_sync_runs_collector` FOREIGN KEY (`collector_id`) REFERENCES `collector_instance` (`id`),
  CONSTRAINT `fk_sync_runs_destination` FOREIGN KEY (`destination_id`) REFERENCES `sync_destinations` (`id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `sync_outbox` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `event_guid` CHAR(36) NOT NULL,
  `collector_id` BIGINT UNSIGNED NOT NULL,
  `destination_id` BIGINT UNSIGNED NOT NULL,
  `stream_code` VARCHAR(100) NOT NULL,
  `source_record_key` VARCHAR(191) NOT NULL,
  `payload_json` JSON NOT NULL,
  `status` ENUM('PENDING','PROCESSING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `next_retry_at` DATETIME(3) NULL,
  `locked_until` DATETIME(3) NULL,
  `last_error` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sent_at` DATETIME(3) NULL,
  UNIQUE KEY `uq_outbox_event_guid` (`event_guid`),
  UNIQUE KEY `uq_outbox_dedup` (`destination_id`,`stream_code`,`source_record_key`),
  KEY `ix_outbox_dispatch` (`status`,`next_retry_at`,`locked_until`,`id`),
  CONSTRAINT `fk_outbox_collector` FOREIGN KEY (`collector_id`) REFERENCES `collector_instance` (`id`),
  CONSTRAINT `fk_outbox_destination` FOREIGN KEY (`destination_id`) REFERENCES `sync_destinations` (`id`)
) ENGINE=InnoDB;
INSERT INTO `schema_migrations` (`version`,`description`) VALUES ('1.0.0','Initial collector company, users and synchronization schema') ON DUPLICATE KEY UPDATE `version`=VALUES(`version`);
