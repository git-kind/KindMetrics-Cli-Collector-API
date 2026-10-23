
-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS `kindmetricscte`
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

-- 2. Crear el usuario
CREATE USER IF NOT EXISTS 'kindmetricscte'@'%'
IDENTIFIED WITH caching_sha2_password BY 'KindMetricsCte2026!';

-- 3. Asignar permisos sobre kindmetricscte
GRANT ALL PRIVILEGES ON `kindmetricscte`.*
TO 'kindmetricscte'@'%';

-- 4. Verificar permisos
SHOW GRANTS FOR 'kindmetricscte'@'%';
