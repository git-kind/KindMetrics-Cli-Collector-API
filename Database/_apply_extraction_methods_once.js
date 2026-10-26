require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const tables = [
  'extraction_methods',
  'extraction_method_parameters',
  'extraction_method_requests',
  'extraction_method_fields',
  'equipment_extraction_methods',
  'extraction_method_versions',
];
const procedures = [
  'sp_extraction_methods_list',
  'sp_extraction_methods_get',
  'sp_extraction_methods_create',
  'sp_extraction_methods_replace_children',
  'sp_extraction_methods_update',
  'sp_extraction_methods_delete',
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
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database,
      connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 5000),
    });

    const sql = fs.readFileSync('Database/05_extraction_methods.sql', 'utf8');
    const statements = parseStatements(sql).filter((statement) => {
      const start = statement.trimStart().toUpperCase();
      return !start.startsWith('CREATE DATABASE ') && !start.startsWith('USE ');
    });

    for (const statement of statements) await connection.query(statement);

    const [tableRows] = await connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?, ?)',
      [database, ...tables],
    );
    const [procedureRows] = await connection.execute(
      'SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = ? AND ROUTINE_NAME IN (?, ?, ?, ?, ?, ?)',
      [database, 'PROCEDURE', ...procedures],
    );
    const foundTables = tableRows.map((row) => row.TABLE_NAME);
    const foundProcedures = procedureRows.map((row) => row.ROUTINE_NAME);
    const [versionRows] = await connection.execute(
      'SELECT `version` FROM `schema_migrations` WHERE `version` = ?',
      ['company-1.1.0'],
    );

    const valid =
      foundTables.length === tables.length &&
      foundProcedures.length === procedures.length &&
      versionRows.length === 1;
    process.stdout.write(
      JSON.stringify({
        applied: valid,
        database,
        tables: foundTables,
        procedures: foundProcedures,
        migrationRecorded: versionRows.length === 1,
      }),
    );
    if (!valid) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(
      JSON.stringify({ applied: false, code: error.code || 'UNKNOWN' }),
    );
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

void applyMigration();
