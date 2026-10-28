require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const migrationVersion = 'company-2026.10.26-services';
const tables = [
  'service_types',
  'service_drivers',
  'service_type_drivers',
  'service_auth_types',
  'service_driver_auth_types',
  'services',
  'service_connections',
  'service_credentials',
  'service_versions',
];
const procedures = [
  'sp_service_type_list',
  'sp_service_driver_list',
  'sp_service_auth_type_list',
  'sp_service_get',
  'sp_service_list',
  'sp_service_create',
  'sp_service_update',
  'sp_service_duplicate',
  'sp_service_set_status',
  'sp_service_get_usage',
  'sp_service_delete',
  'sp_service_connection_get',
  'sp_service_connection_upsert',
  'sp_service_credential_list',
  'sp_service_credential_reference_upsert',
  'sp_service_credential_reference_delete',
  'sp_service_version_list',
  'sp_service_version_get',
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
  if (process.env.APPLY_COMPANY_SERVICES !== '1') {
    throw new Error('Set APPLY_COMPANY_SERVICES=1 to confirm this Company migration.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Company Services migration runner refuses NODE_ENV=production.');
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
    const [identityRows] = await connection.query('SELECT DATABASE() AS selectedSchema');
    if (identityRows[0]?.selectedSchema !== database) {
      throw new Error(`Unexpected selected schema: ${identityRows[0]?.selectedSchema ?? 'none'}`);
    }

    const [migrationRows] = await connection.execute(
      'SELECT `version` FROM `schema_migrations` WHERE `version` = ?',
      [migrationVersion],
    );
    const tableMarks = tables.map(() => '?').join(', ');
    const procedureMarks = procedures.map(() => '?').join(', ');
    const [tableRows] = await connection.execute(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${tableMarks})`,
      [database, ...tables],
    );
    const [procedureRows] = await connection.execute(
      `SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME IN (${procedureMarks})`,
      [database, ...procedures],
    );

    if (migrationRows.length > 0) {
      if (tableRows.length !== tables.length || procedureRows.length !== procedures.length) {
        throw new Error('Migration is recorded but expected objects are incomplete; inspect before repair.');
      }
      process.stdout.write(JSON.stringify({ applied: false, alreadyApplied: true, database, tables: tables.length, procedures: procedures.length }));
      return;
    }
    if (tableRows.length > 0 || procedureRows.length > 0) {
      throw new Error('Some Services objects already exist without the migration record; inspect before continuing.');
    }

    const migrationPath = path.join(__dirname, 'migrations', 'company', '2026-10-26_services.sql');
    for (const statement of parseStatements(fs.readFileSync(migrationPath, 'utf8'))) {
      await connection.query(statement);
    }

    const [appliedRows] = await connection.execute(
      'SELECT `version` FROM `schema_migrations` WHERE `version` = ?',
      [migrationVersion],
    );
    const [createdTables] = await connection.execute(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${tableMarks})`,
      [database, ...tables],
    );
    const [createdProcedures] = await connection.execute(
      `SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME IN (${procedureMarks})`,
      [database, ...procedures],
    );
    if (appliedRows.length !== 1 || createdTables.length !== tables.length || createdProcedures.length !== procedures.length) {
      throw new Error('Migration verification failed; version was not accepted as complete. Inspect MySQL state.');
    }
    process.stdout.write(JSON.stringify({ applied: true, database, version: migrationVersion, tables: createdTables.map((row) => row.name), procedures: createdProcedures.map((row) => row.name) }));
  } finally {
    await connection.end();
  }
}

applyMigration().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});