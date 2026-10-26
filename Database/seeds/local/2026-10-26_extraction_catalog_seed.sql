USE `kindmetricscte`;

-- Idempotent metadata only. All connectors remain non-executable until a driver is installed.
INSERT INTO `extraction_providers` (`code`, `name`, `description`, `is_active`)
VALUES
  ('GENERIC', 'Genérico', 'Proveedor genérico para integraciones no asociadas a fabricante.', TRUE),
  ('MICROSOFT', 'Microsoft', 'Servicios Microsoft mediante APIs y permisos compatibles.', TRUE),
  ('CISCO', 'Cisco', 'Productos Cisco.', TRUE),
  ('AUDIOCODES', 'AudioCodes', 'Productos AudioCodes.', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

INSERT INTO `extraction_connectors` (
  `provider_id`, `connector_key`, `name`, `description`, `driver_key`, `driver_version`,
  `configuration_schema`, `capabilities`, `is_active`
)
SELECT p.`id`, seed.`connector_key`, seed.`name`, seed.`description`, NULL, NULL,
       seed.`configuration_schema`, JSON_OBJECT('executionAvailable', FALSE), TRUE
FROM (
  SELECT 'GENERIC' AS `provider_code`, 'SNMP' AS `connector_key`, 'SNMP' AS `name`,
         'Definición de conector SNMP; requiere driver autorizado.' AS `description`,
         JSON_OBJECT('operations', JSON_ARRAY('GET', 'GETNEXT', 'WALK', 'GETBULK')) AS `configuration_schema`
  UNION ALL SELECT 'GENERIC', 'REST_API', 'REST API',
         'Definición de conector HTTP; requiere driver con destinos permitidos.',
         JSON_OBJECT('methods', JSON_ARRAY('GET', 'POST', 'PUT', 'PATCH', 'DELETE'))
  UNION ALL SELECT 'MICROSOFT', 'MICROSOFT_GRAPH', 'Microsoft Graph',
         'Definición de Microsoft Graph; requiere app, permisos y licencia aplicables.',
         JSON_OBJECT('authTypes', JSON_ARRAY('OAUTH2'))
  UNION ALL SELECT 'GENERIC', 'MYSQL', 'MySQL',
         'Definición de consulta parametrizada; no habilita SQL arbitrario.',
         JSON_OBJECT('parameterizedOnly', TRUE)
  UNION ALL SELECT 'GENERIC', 'SSH', 'SSH',
         'Definición SSH; requiere comandos permitidos registrados en driver.',
         JSON_OBJECT('commandAllowlistRequired', TRUE)
  UNION ALL SELECT 'GENERIC', 'SOAP', 'SOAP',
         'Definición SOAP; requiere driver y destinos permitidos.',
         JSON_OBJECT('destinationAllowlistRequired', TRUE)
) seed
INNER JOIN `extraction_providers` p ON p.`code` = seed.`provider_code`
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

INSERT INTO `extraction_connector_auth_types` (`connector_id`, `auth_type`)
SELECT c.`id`, auth.`auth_type`
FROM (
       SELECT 'SNMP' AS `connector_key`, 'NONE' AS `auth_type`
       UNION ALL SELECT 'SNMP', 'SNMP_V2C'
       UNION ALL SELECT 'SNMP', 'SNMP_V3'
       UNION ALL SELECT 'REST_API', 'NONE'
       UNION ALL SELECT 'REST_API', 'API_KEY'
       UNION ALL SELECT 'REST_API', 'BEARER_TOKEN'
       UNION ALL SELECT 'MICROSOFT_GRAPH', 'OAUTH2'
       UNION ALL SELECT 'MYSQL', 'DATABASE_CREDENTIALS'
       UNION ALL SELECT 'SSH', 'SSH_KEY'
       UNION ALL SELECT 'SOAP', 'BASIC'
       UNION ALL SELECT 'SOAP', 'OAUTH2'
) auth
INNER JOIN `extraction_connectors` c ON c.`connector_key` = auth.`connector_key`
ON DUPLICATE KEY UPDATE `auth_type` = VALUES(`auth_type`);

INSERT INTO `extraction_connector_versions` (`connector_id`, `version_number`, `definition_snapshot`)
SELECT c.`id`, 1, JSON_OBJECT(
  'providerId', c.`provider_id`, 'connectorKey', c.`connector_key`, 'name', c.`name`,
  'description', c.`description`, 'driverKey', c.`driver_key`, 'driverVersion', c.`driver_version`,
  'configurationSchema', c.`configuration_schema`, 'capabilities', c.`capabilities`, 'isActive', c.`is_active'
)
FROM `extraction_connectors` c
WHERE NOT EXISTS (
  SELECT 1 FROM `extraction_connector_versions` v
  WHERE v.`connector_id` = c.`id` AND v.`version_number` = 1
);