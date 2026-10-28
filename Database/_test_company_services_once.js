require('dotenv').config({ path: '.env.dev', quiet: true });
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const marker = `SERVICES_TEST_${Date.now()}`;
const createdIds = [];

async function call(connection, procedure, parameters) {
  const [results] = await connection.query(
    `CALL \`${procedure}\`(${parameters.map(() => '?').join(', ')})`,
    parameters,
  );
  return Array.isArray(results) && Array.isArray(results[0]) ? results[0] : results;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database,
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 5000),
  });
  const checks = [];
  try {
    const [[identity]] = await connection.query('SELECT DATABASE() AS selectedSchema');
    if (identity.selectedSchema !== database) throw new Error('Unexpected schema selected.');

    const [types] = await connection.execute(
      'SELECT id, code FROM service_types WHERE code IN (?, ?, ?) ORDER BY code',
      ['REST_API', 'SNMP', 'TEAMS'],
    );
    if (types.length !== 3) throw new Error('Expected service type seeds are missing.');
    const [authTypes] = await connection.execute(
      'SELECT id FROM service_auth_types WHERE code = ?',
      ['NONE'],
    );
    if (!authTypes.length) throw new Error('NONE auth type seed is missing.');
    checks.push('seed lookups');

    for (const [typeCode, driverKey] of [
      ['REST_API', 'http'],
      ['SNMP', 'snmp'],
      ['TEAMS', 'microsoft-graph'],
    ]) {
      const serviceType = types.find((row) => row.code === typeCode);
      const code = `${marker}_${typeCode}`;
      const rows = await call(connection, 'sp_service_create', [
        serviceType.id, driverKey, code, code, 'Temporary integration test', true, 'copilot-test',
      ]);
      const id = Number(rows[0]?.id);
      if (!id) throw new Error(`Create failed for ${typeCode}.`);
      createdIds.push(id);
      checks.push(`create ${typeCode}`);
    }

    const list = await call(connection, 'sp_service_list', [marker, null, null, 1, 50]);
    if (list.length !== 3) throw new Error(`Expected three listed test services; got ${list.length}.`);
    checks.push('filtered list');

    const [basicAuth] = await connection.execute(
      'SELECT id FROM service_auth_types WHERE code = ?',
      ['BASIC'],
    );
    let incompatibleAuthRejected = false;
    try {
      await call(connection, 'sp_service_connection_upsert', [
        createdIds[1], JSON.stringify({}), basicAuth[0].id,
        JSON.stringify({}), null, null, JSON.stringify({}), 'copilot-test',
      ]);
    } catch (error) {
      incompatibleAuthRejected = error.sqlMessage === 'SERVICE_AUTH_TYPE_NOT_SUPPORTED';
    }
    if (!incompatibleAuthRejected) throw new Error('SNMP accepted an unsupported BASIC auth type.');
    checks.push('incompatible driver auth type rejected');

    const serviceId = createdIds[0];
    const connectionRows = await call(connection, 'sp_service_connection_upsert', [
      serviceId,
      JSON.stringify({ baseUrl: 'https://example.invalid' }),
      authTypes[0].id,
      JSON.stringify({ credentialRef: 'vault://test/reference' }),
      null,
      null,
      JSON.stringify({}),
      'copilot-test',
    ]);
    if (!connectionRows.length) throw new Error('Connection upsert returned no row.');
    checks.push('connection upsert');

    const updatedCode = `${marker}_REST_UPDATED`;
    const updated = await call(connection, 'sp_service_update', [
      serviceId, null, false, null, false,
      updatedCode, true, updatedCode, true, null, false, true, true, 'copilot-test',
    ]);
    if (updated[0]?.code !== updatedCode) throw new Error('Update verification failed.');
    checks.push('update');

    const duplicateCode = `${marker}_REST_COPY`;
    const duplicate = await call(connection, 'sp_service_duplicate', [
      serviceId, duplicateCode, duplicateCode, 'copilot-test',
    ]);
    const duplicateId = Number(duplicate[0]?.id);
    if (!duplicateId) throw new Error('Duplicate did not return a service id.');
    createdIds.push(duplicateId);
    checks.push('duplicate');

    await call(connection, 'sp_service_set_status', [duplicateId, false, 'copilot-test']);
    const versions = await call(connection, 'sp_service_version_list', [duplicateId]);
    if (versions.length < 2) throw new Error('Expected immutable snapshots after status change.');
    const [secretSnapshots] = await connection.execute(
      'SELECT COUNT(*) AS count FROM service_versions WHERE service_id = ? AND JSON_CONTAINS_PATH(configuration_snapshot, ?, ?) = 1',
      [duplicateId, 'one', '$.authConfig'],
    );
    if (Number(secretSnapshots[0]?.count) !== 0) throw new Error('A version snapshot contains authConfig.');
    checks.push('status and version history');

    const usage = await call(connection, 'sp_service_get_usage', [serviceId]);
    if (Number(usage[0]?.serviceId) !== serviceId) throw new Error('Usage query failed.');
    checks.push('usage');

    const deleted = await call(connection, 'sp_service_delete', [duplicateId]);
    if (Number(deleted[0]?.affected) !== 1) throw new Error('Delete did not affect the duplicate.');
    createdIds.splice(createdIds.indexOf(duplicateId), 1);
    checks.push('delete');

    process.stdout.write(JSON.stringify({ database: identity.selectedSchema, checks }, null, 2));
  } finally {
    for (const id of createdIds.reverse()) {
      try {
        await call(connection, 'sp_service_delete', [id]);
      } catch (error) {
        process.stderr.write(`Cleanup failed for temporary Service ${id}: ${error.message}\n`);
      }
    }
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`);
  process.exitCode = 1;
});
