INSERT INTO `service_types` (`code`, `name`, `description`)
VALUES
  ('REST_API', 'REST API', 'Servicio HTTP REST.'),
  ('SNMP', 'SNMP', 'Servicio de consulta SNMP.'),
  ('WEBHOOK', 'Webhook', 'Servicio de recepción o envío de eventos.'),
  ('TEAMS', 'Microsoft Teams', 'Servicio Microsoft Teams mediante Microsoft Graph.'),
  ('OUTLOOK', 'Microsoft Outlook', 'Servicio Microsoft Outlook mediante Microsoft Graph.'),
  ('WEBEX', 'Webex', 'Servicio Webex.'),
  ('ZOOM', 'Zoom', 'Servicio Zoom.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

INSERT INTO `service_drivers` (`driver_key`, `name`, `status`, `capabilities`)
VALUES
  ('http', 'HTTP', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE)),
  ('snmp', 'SNMP', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE)),
  ('webhook', 'Webhook', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE)),
  ('microsoft-graph', 'Microsoft Graph', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE)),
  ('webex', 'Webex', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE)),
  ('zoom', 'Zoom', 'NOT_IMPLEMENTED', JSON_OBJECT('executionAvailable', FALSE))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `service_type_drivers` (`service_type_id`, `driver_key`)
SELECT t.`id`, d.`driver_key` FROM (
  SELECT 'REST_API' AS `type_code`, 'http' AS `driver_key`
  UNION ALL SELECT 'SNMP', 'snmp'
  UNION ALL SELECT 'WEBHOOK', 'webhook'
  UNION ALL SELECT 'TEAMS', 'microsoft-graph'
  UNION ALL SELECT 'OUTLOOK', 'microsoft-graph'
  UNION ALL SELECT 'WEBEX', 'webex'
  UNION ALL SELECT 'ZOOM', 'zoom'
) mappings
INNER JOIN `service_types` t ON t.`code` = mappings.`type_code`
INNER JOIN `service_drivers` d ON d.`driver_key` = mappings.`driver_key`
ON DUPLICATE KEY UPDATE `driver_key` = VALUES(`driver_key`);

INSERT INTO `service_auth_types` (`code`, `name`)
VALUES
  ('NONE', 'Sin autenticación'),
  ('BASIC', 'Basic'),
  ('API_KEY', 'API Key'),
  ('BEARER', 'Bearer Token'),
  ('OAUTH2_CLIENT_CREDENTIALS', 'OAuth 2.0 Client Credentials'),
  ('OAUTH2_AUTHORIZATION_CODE', 'OAuth 2.0 Authorization Code'),
  ('SNMP_COMMUNITY', 'SNMP Community'),
  ('SNMP_V3_USM', 'SNMP v3 USM'),
  ('MTLS', 'Mutual TLS'),
  ('HMAC', 'HMAC')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `service_driver_auth_types` (`driver_id`, `auth_type_id`)
SELECT d.`id`, a.`id` FROM (
  SELECT 'http' AS `driver_key`, 'NONE' AS `auth_code`
  UNION ALL SELECT 'http', 'BASIC'
  UNION ALL SELECT 'http', 'API_KEY'
  UNION ALL SELECT 'http', 'BEARER'
  UNION ALL SELECT 'http', 'OAUTH2_CLIENT_CREDENTIALS'
  UNION ALL SELECT 'http', 'OAUTH2_AUTHORIZATION_CODE'
  UNION ALL SELECT 'http', 'MTLS'
  UNION ALL SELECT 'http', 'HMAC'
  UNION ALL SELECT 'snmp', 'NONE'
  UNION ALL SELECT 'snmp', 'SNMP_COMMUNITY'
  UNION ALL SELECT 'snmp', 'SNMP_V3_USM'
  UNION ALL SELECT 'webhook', 'NONE'
  UNION ALL SELECT 'webhook', 'API_KEY'
  UNION ALL SELECT 'webhook', 'BEARER'
  UNION ALL SELECT 'webhook', 'HMAC'
  UNION ALL SELECT 'microsoft-graph', 'OAUTH2_CLIENT_CREDENTIALS'
  UNION ALL SELECT 'microsoft-graph', 'OAUTH2_AUTHORIZATION_CODE'
  UNION ALL SELECT 'webex', 'OAUTH2_AUTHORIZATION_CODE'
  UNION ALL SELECT 'zoom', 'OAUTH2_AUTHORIZATION_CODE'
) mappings
INNER JOIN `service_drivers` d ON d.`driver_key` = mappings.`driver_key`
INNER JOIN `service_auth_types` a ON a.`code` = mappings.`auth_code`
ON DUPLICATE KEY UPDATE `auth_type_id` = VALUES(`auth_type_id`);