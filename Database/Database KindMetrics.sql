CREATE DATABASE IF NOT EXISTS `kindmetrics`
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'kindmetrics'@'%'
IDENTIFIED BY 'TU_CONTRASENA_SEGURA';

GRANT ALL PRIVILEGES ON `kindmetrics`.*
TO 'kindmetrics'@'%';

SHOW GRANTS FOR 'kindmetrics'@'%';
