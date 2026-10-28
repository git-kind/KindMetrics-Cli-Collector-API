require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const version = 'company-2026.10.26-svc-coll';
const requiredTables = ['collectors', 'services', 'service_credentials'];
const procedures = ['sp_service_get_usage', 'sp_service_delete'];

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
  if (process.env.APPLY_COMPANY_COLLECTORS !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Set APPLY_COMPANY_COLLECTORS=1 outside production to confirm this migration.');
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
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${requiredTables.map(() => '?').join(',')})`,
      [database, ...requiredTables],
    );
    const [foundProcedures] = await connection.execute(
      `SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME IN (${procedures.map(() => '?').join(',')})`,
      [database, ...procedures],
    );
    if (tables.length !== requiredTables.length || foundProcedures.length !== procedures.length) {
      throw new Error('Required Services/Collectors objects are incomplete; migration was not run.');
    }
    if (!existing.length) {
      const migration = fs.readFileSync(path.join(__dirname, 'migrations', 'company', '2026-10-26_collector_service_dependency.sql'), 'utf8');
      for (const statement of parseStatements(migration)) await connection.query(statement);
    }
    const [record] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [version]);
    if (record.length !== 1) throw new Error('Dependency migration version is missing.');
    process.stdout.write(JSON.stringify({ applied: existing.length === 0, database, version }));
  } finally {
    await connection.end();
  }
}

apply().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
