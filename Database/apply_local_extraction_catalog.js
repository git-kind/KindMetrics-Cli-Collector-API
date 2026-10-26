const mysql = require('mysql2/promise');

const database = process.env.MYSQL_DATABASE;
const migrationVersion = 'local-2026.10.26-extraction-catalog';
const expectedTables = [
  'extraction_providers',
  'extraction_connectors',
  'extraction_connector_versions',
  'extraction_connector_auth_types',
  'extraction_connector_parameters',
];
const expectedProcedures = [
  'sp_extraction_provider_list',
  'sp_extraction_provider_get',
  'sp_extraction_provider_create',
  'sp_extraction_provider_update',
  'sp_extraction_provider_delete',
  'sp_extraction_connector_list',
  'sp_extraction_connector_get',
  'sp_extraction_connector_create',
  'sp_extraction_connector_update',
  'sp_extraction_connector_delete',
];

function parseStatements(sql) {
  let delimiter = ';';
  let buffer = '';
  const statements = [];
  for (const line of sql.split(/\r?\n/)) {
    const directive = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (directive) {
      delimiter = directive[1];
      continue;
    }
    buffer += `${line}\n`;
    let delimiterIndex = buffer.indexOf(delimiter);
    while (delimiterIndex >= 0) {
      const statement = buffer.slice(0, delimiterIndex).trim();
      if (statement) statements.push(statement);
      buffer = buffer.slice(delimiterIndex + delimiter.length);
      delimiterIndex = buffer.indexOf(delimiter);
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function applyMigration() {
  if (process.env.APPLY_LOCAL_EXTRACTION_CATALOG !== '1') {
    throw new Error('Set APPLY_LOCAL_EXTRACTION_CATALOG=1 to confirm this manual migration.');
  }
  if (process.env.NODE_ENV === 'production' || database !== 'kindmetricscte') {
    throw new Error('This runner only accepts MYSQL_DATABASE=kindmetricscte outside production.');
  }
  for (const key of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD']) {
    if (!process.env[key]) throw new Error(`${key} must be supplied through the environment.`);
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
    const [migrationRows] = await connection.execute(
      'SELECT `version` FROM `schema_migrations` WHERE `version` = ?',
      [migrationVersion],
    );
    const [tableRows] = await connection.execute(
      'SELECT `TABLE_NAME` AS `name` FROM `information_schema`.`TABLES` WHERE `TABLE_SCHEMA` = ? AND `TABLE_NAME` IN (?, ?, ?, ?, ?)',
      [database, ...expectedTables],
    );
    const [procedureRows] = await connection.execute(
      'SELECT `ROUTINE_NAME` AS `name` FROM `information_schema`.`ROUTINES` WHERE `ROUTINE_SCHEMA` = ? AND `ROUTINE_TYPE` = ? AND `ROUTINE_NAME` IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [database, 'PROCEDURE', ...expectedProcedures],
    );

    if (migrationRows.length === 1) {
      if (tableRows.length !== expectedTables.length || procedureRows.length !== expectedProcedures.length) {
        throw new Error('Migration record exists but objects are incomplete; inspect and repair manually.');
      }
      process.stdout.write(JSON.stringify({ applied: false, alreadyApplied: true, database }));
      return;
    }
    if (tableRows.length > 0 || procedureRows.length > 0) {
      throw new Error('Catalog objects exist without the migration record; inspect and reconcile manually.');
    }

    const fs = require('node:fs');
    const path = require('node:path');
    const migrationPath = path.join(__dirname, 'migrations', 'local', '2026-10-26_extraction_catalog.sql');
    for (const statement of parseStatements(fs.readFileSync(migrationPath, 'utf8'))) {
      await connection.query(statement);
    }

    const [appliedRows] = await connection.execute(
      'SELECT `version` FROM `schema_migrations` WHERE `version` = ?',
      [migrationVersion],
    );
    if (appliedRows.length !== 1) throw new Error('Migration did not record its version. Inspect schema state manually.');
    process.stdout.write(JSON.stringify({ applied: true, database, version: migrationVersion }));
  } finally {
    await connection.end();
  }
}

applyMigration().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});