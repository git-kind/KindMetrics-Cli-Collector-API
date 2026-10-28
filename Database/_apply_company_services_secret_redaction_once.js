require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const version = 'company-2026.10.26-svc-secrets';
const expectedProcedures = [
  'sp_service_get',
  'sp_service_connection_get',
  'sp_service_duplicate',
  'sp_service_connection_upsert',
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
    let index = buffer.indexOf(delimiter);
    while (index >= 0) {
      const statement = buffer.slice(0, index).trim();
      if (statement) statements.push(statement);
      buffer = buffer.slice(index + delimiter.length);
      index = buffer.indexOf(delimiter);
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function apply() {
  if (process.env.APPLY_COMPANY_SERVICES !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Set APPLY_COMPANY_SERVICES=1 outside production to confirm this migration.');
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
    const [existing] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [version]);
    const [objects] = await connection.execute(
      `SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME IN (${expectedProcedures.map(() => '?').join(',')})`,
      [database, ...expectedProcedures],
    );
    if (existing.length && objects.length !== expectedProcedures.length) {
      throw new Error('Migration is recorded but replacement procedures are missing.');
    }
    if (existing.length) {
      process.stdout.write(JSON.stringify({ applied: false, alreadyApplied: true, database, procedures: objects.map((row) => row.name) }));
      return;
    }
    if (objects.length !== expectedProcedures.length) {
      throw new Error('Expected Services procedures are incomplete; migration was not run.');
    }

    const migrationPath = path.join(__dirname, 'migrations', 'company', '2026-10-26_services_secret_redaction.sql');
    for (const statement of parseStatements(fs.readFileSync(migrationPath, 'utf8'))) {
      await connection.query(statement);
    }
    const [record] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [version]);
    const [verified] = await connection.execute(
      `SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME IN (${expectedProcedures.map(() => '?').join(',')})`,
      [database, ...expectedProcedures],
    );
    if (record.length !== 1 || verified.length !== expectedProcedures.length) {
      throw new Error('Security procedure migration verification failed.');
    }
    process.stdout.write(JSON.stringify({ applied: true, database, version, procedures: verified.map((row) => row.name) }));
  } finally {
    await connection.end();
  }
}

apply().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
