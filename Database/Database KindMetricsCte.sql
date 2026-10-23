-- Set the same strong password in this script and MYSQL_PASSWORD before running.
-- This provisions the Collector database only; it does not modify table data.
CREATE DATABASE IF NOT EXISTS `kindmetricscte`
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'kindmetricscte'@'%'
IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';

ALTER USER 'kindmetricscte'@'%'
IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON `kindmetricscte`.*
TO 'kindmetricscte'@'%';

SHOW GRANTS FOR 'kindmetricscte'@'%';