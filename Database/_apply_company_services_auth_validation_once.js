require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const version = 'company-2026.10.26-svc-auth';

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
    if (existing.length) {
      process.stdout.write(JSON.stringify({ applied: false, alreadyApplied: true, database, version }));
      return;
    }
    const migrationPath = path.join(__dirname, 'migrations', 'company', '2026-10-26_services_auth_validation.sql');
    for (const statement of parseStatements(fs.readFileSync(migrationPath, 'utf8'))) {
      await connection.query(statement);
    }
    const [record] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [version]);
    const [procedure] = await connection.execute(
      'SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = ? AND ROUTINE_NAME = ?',
      [database, 'PROCEDURE', 'sp_service_connection_upsert'],
    );
    if (record.length !== 1 || procedure.length !== 1) throw new Error('Authentication compatibility migration verification failed.');
    process.stdout.write(JSON.stringify({ applied: true, database, version, procedure: procedure[0].name }));
  } finally {
    await connection.end();
  }
}

apply().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
