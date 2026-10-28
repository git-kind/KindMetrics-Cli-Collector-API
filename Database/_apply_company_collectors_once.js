require('dotenv').config({ path: '.env.dev', quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const migrationVersion = 'company-2026.10.26-collectors';
const tables = [
  'collectors', 'collector_targets', 'collector_methods', 'collector_schedules',
  'collector_transformations', 'collector_field_mappings', 'collector_destinations',
  'collector_policies', 'collector_versions', 'collector_executions',
  'collector_execution_details', 'collector_checkpoints',
];
const procedures = [
  'sp_collector_validate_references', 'sp_collector_get_configuration', 'sp_collector_list',
  'sp_collector_get', 'sp_collector_create', 'sp_collector_update', 'sp_collector_set_status',
  'sp_collector_save_configuration', 'sp_collector_get_by_service', 'sp_collector_duplicate',
  'sp_collector_delete', 'sp_collector_execution_create', 'sp_collector_execution_claim',
  'sp_collector_execution_start', 'sp_collector_execution_finish', 'sp_collector_execution_list',
  'sp_collector_execution_get', 'sp_collector_version_list', 'sp_collector_version_get',
  'sp_collector_version_create', 'sp_collector_checkpoint_get', 'sp_collector_checkpoint_upsert',
  'sp_collector_get_usage', 'sp_collector_health', 'sp_collector_execution_detail_create',
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

async function applyMigration() {
  if (process.env.APPLY_COMPANY_COLLECTORS !== '1') {
    throw new Error('Set APPLY_COMPANY_COLLECTORS=1 to confirm this Company migration.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Company Collectors migration runner refuses NODE_ENV=production.');
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
    const [[identity]] = await connection.query('SELECT DATABASE() AS selectedSchema');
    if (identity.selectedSchema !== database) {
      throw new Error(`Unexpected selected schema: ${identity.selectedSchema ?? 'none'}`);
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
    const existingTables = new Set(tableRows.map((row) => row.name));
    const existingProcedures = new Set(procedureRows.map((row) => row.name));

    const migrationPath = path.join(__dirname, 'migrations', 'company', '2026-10-26_collectors.sql');
    const statements = parseStatements(fs.readFileSync(migrationPath, 'utf8'));
    if (process.env.DRY_RUN === '1') {
      const normalized = statements.map((statement) => statement.replace(/^\s*(?:--[^\n]*\n\s*)*/, '').trim());
      process.stdout.write(JSON.stringify({
        dryRun: true,
        database,
        tables: normalized.filter((statement) => /^CREATE TABLE/i.test(statement)).length,
        procedures: normalized.filter((statement) => /^CREATE PROCEDURE/i.test(statement)).length,
        statements: statements.length,
        destructive: normalized.some((statement) => /^(DROP\s+(?:TABLE|PROCEDURE)|CREATE\s+DATABASE)/i.test(statement)),
      }));
      return;
    }
    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements[index];
      const normalized = statement.replace(/^\s*(?:--[^\n]*\n\s*)*/, '').trim();
      const tableMatch = normalized.match(/^CREATE TABLE `([^`]+)`/i);
      const procedureMatch = normalized.match(/^CREATE PROCEDURE `([^`]+)`/i);
      if (tableMatch && existingTables.has(tableMatch[1])) continue;
      if (procedureMatch && existingProcedures.has(procedureMatch[1])) continue;
      try {
        await connection.query(statement);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const excerpt = normalized.replace(/\s+/g, ' ').slice(0, 1800);
        throw new Error(`Collector migration statement ${index + 1}/${statements.length} failed: ${detail}. SQL: ${excerpt}`);
      }
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
    const [foreignKeys] = await connection.execute(
      'SELECT CONSTRAINT_NAME AS name FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME LIKE ?',
      [database, 'collector%'],
    );
    if (appliedRows.length !== 1 || createdTables.length !== tables.length ||
        createdProcedures.length !== procedures.length || foreignKeys.length < 19) {
      throw new Error('Migration verification failed; version was not accepted as complete. Inspect MySQL state.');
    }
    process.stdout.write(JSON.stringify({
      applied: true,
      database,
      version: migrationVersion,
      tables: createdTables.map((row) => row.name),
      procedures: createdProcedures.map((row) => row.name),
      foreignKeys: foreignKeys.length,
    }));
  } finally {
    await connection.end();
  }
}

applyMigration().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
