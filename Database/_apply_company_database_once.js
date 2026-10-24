require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const mysql = require('mysql2/promise');

async function applyMigration() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 5000),
      multipleStatements: true,
    });

    const lines = fs.readFileSync('Database/04_company_database.sql', 'utf8').split(/\r?\n/);
    const body = lines
      .filter((line) => {
        const value = line.trim().toUpperCase();
        return !value.startsWith('USE ') && !value.startsWith('DELIMITER ');
      })
      .join('\n');
    const statements = body.split('$$').map((value) => value.trim()).filter(Boolean);
    for (const statement of statements) await connection.query(statement);

    const [column] = await connection.execute(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.MYSQL_DATABASE, 'company', 'database_name'],
    );
    const [version] = await connection.execute(
      'SELECT version FROM schema_migrations WHERE version = ?',
      ['1.2.0'],
    );
    const [procedures] = await connection.execute(
      'SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = ? AND ROUTINE_NAME LIKE ?',
      [process.env.MYSQL_DATABASE, 'PROCEDURE', 'sp_companies_%'],
    );
    process.stdout.write(JSON.stringify({
      applied: true,
      database: process.env.MYSQL_DATABASE,
      databaseNameColumn: column.length === 1,
      migrationRecorded: version.length === 1,
      procedures: procedures.map((row) => row.ROUTINE_NAME),
    }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ applied: false, code: error.code || 'UNKNOWN' }));
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

void applyMigration();
