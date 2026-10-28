require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const version = 'company-2026.10.26-services-collation';
const constraints = [
  ['service_type_drivers', 'fk_service_type_drivers_type', '(`service_type_id`) REFERENCES `service_types` (`id`) ON DELETE RESTRICT'],
  ['service_type_drivers', 'fk_service_type_drivers_driver', '(`driver_key`) REFERENCES `service_drivers` (`driver_key`) ON DELETE RESTRICT'],
  ['service_driver_auth_types', 'fk_service_driver_auth_driver', '(`driver_id`) REFERENCES `service_drivers` (`id`) ON DELETE RESTRICT'],
  ['service_driver_auth_types', 'fk_service_driver_auth_type', '(`auth_type_id`) REFERENCES `service_auth_types` (`id`) ON DELETE RESTRICT'],
  ['services', 'fk_services_type', '(`service_type_id`) REFERENCES `service_types` (`id`) ON DELETE RESTRICT'],
  ['services', 'fk_services_driver', '(`driver_key`) REFERENCES `service_drivers` (`driver_key`) ON DELETE RESTRICT'],
  ['services', 'fk_services_type_driver', '(`service_type_id`, `driver_key`) REFERENCES `service_type_drivers` (`service_type_id`, `driver_key`) ON DELETE RESTRICT'],
  ['service_connections', 'fk_service_connections_service', '(`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT'],
  ['service_connections', 'fk_service_connections_auth_type', '(`auth_type_id`) REFERENCES `service_auth_types` (`id`) ON DELETE RESTRICT'],
  ['service_credentials', 'fk_service_credentials_service', '(`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT'],
  ['service_versions', 'fk_service_versions_service', '(`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT'],
];

async function repair() {
  if (process.env.APPLY_COMPANY_SERVICES !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Set APPLY_COMPANY_SERVICES=1 outside production to confirm this repair.');
  }
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database,
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 5000),
  });
  try {
    const [[identity]] = await connection.query('SELECT DATABASE() AS selectedSchema');
    if (identity.selectedSchema !== database) throw new Error('Unexpected schema selected.');
    const migrationPath = path.join(__dirname, 'migrations', 'company', '2026-10-26_services_collation.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8').replace(/^\s*--.*$/gm, '');
    for (const statement of migrationSql.split(';').map((item) => item.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
    for (const [table, name, definition] of constraints) {
      const [found] = await connection.execute(
        'SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
        [database, table, name],
      );
      if (found.length === 0) {
        await connection.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY ${definition}`);
      }
    }
    const [foreignKeys] = await connection.execute(
      'SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME LIKE ?',
      [database, 'service%'],
    );
    const [collations] = await connection.execute(
      'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE ? AND COLLATION_NAME IS NOT NULL AND COLLATION_NAME <> ?',
      [database, 'service%', 'utf8mb4_unicode_ci'],
    );
    const expectedNames = new Set(constraints.map((item) => item[1]));
    const foundNames = new Set(foreignKeys.map((item) => item.CONSTRAINT_NAME));
    if ([...expectedNames].some((name) => !foundNames.has(name)) || Number(collations[0].count) !== 0) {
      throw new Error('Repair verification failed; migration version was not recorded.');
    }
    await connection.execute(
      'INSERT INTO schema_migrations (version, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
      [version, 'Align Services table collations and restore missing foreign keys'],
    );
    process.stdout.write(JSON.stringify({ database, version, foreignKeys: foreignKeys.length, collation: 'utf8mb4_unicode_ci' }));
  } finally {
    await connection.end();
  }
}

repair().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
