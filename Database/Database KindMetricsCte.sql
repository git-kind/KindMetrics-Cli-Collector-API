CREATE DATABASE IF NOT EXISTS `kindmetricsCte`
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'kindmetricscte'@'%'
IDENTIFIED BY '';

GRANT ALL PRIVILEGES ON `kindmetricscte`.*
TO 'kindmetricscte'@'%';

SHOW GRANTS FOR 'kindmetricscte'@'%';