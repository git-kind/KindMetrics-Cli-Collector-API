require('dotenv').config({ path: '.env.dev', quiet: true });
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const marker = `COLLECTORS_TEST_${Date.now()}`;
const serviceIds = [];
const collectorIds = [];

async function call(connection, procedure, parameters = []) {
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
    const [[identity]] = await connection.query('SELECT DATABASE() AS selectedSchema, VERSION() AS serverVersion');
    if (identity.selectedSchema !== database) throw new Error('Unexpected schema selected.');
    const [[type]] = await connection.execute('SELECT id FROM service_types WHERE code = ?', ['TEAMS']);
    const [[method]] = await connection.execute('SELECT id, protocol FROM extraction_methods WHERE is_active = TRUE ORDER BY id LIMIT 1');
    if (!type || !method) throw new Error('Required seeded Service type or active Extraction Method is missing.');

    const serviceCode = `${marker}_SERVICE`;
    const serviceRows = await call(connection, 'sp_service_create', [
      type.id, 'microsoft-graph', serviceCode, serviceCode, 'Temporary Collector FK test', true, 'copilot-test',
    ]);
    const serviceId = Number(serviceRows[0]?.id);
    if (!serviceId) throw new Error('Temporary Service was not created.');
    serviceIds.push(serviceId);
    checks.push('temporary Service create');

    const [[snmpType]] = await connection.execute('SELECT id FROM service_types WHERE code = ?', ['SNMP']);
    const serviceTwoCode = `${marker}_SERVICE_TWO`;
    const serviceTwoRows = await call(connection, 'sp_service_create', [
      snmpType.id, 'snmp', serviceTwoCode, serviceTwoCode, 'Temporary second Service', true, 'copilot-test',
    ]);
    const serviceTwoId = Number(serviceTwoRows[0]?.id);
    if (!serviceTwoId) throw new Error('Second temporary Service was not created.');
    serviceIds.push(serviceTwoId);
    checks.push('second Service create');

    const firstCode = `${marker}_ONE`;
    const secondCode = `${marker}_TWO`;
    const firstRows = await call(connection, 'sp_collector_create', [
      serviceId, firstCode, firstCode, 'Temporary SQL integration test', 'POLLING', 'ACTIVE', JSON.stringify(['test']), 'copilot-test',
    ]);
    const firstId = Number(firstRows[0]?.id);
    if (!firstId || Number(firstRows[0]?.serviceId) !== serviceId) throw new Error('Collector create/serviceId response failed.');
    collectorIds.push(firstId);

    const secondRows = await call(connection, 'sp_collector_create', [
      serviceId, secondCode, secondCode, null, 'POLLING', 'DRAFT', JSON.stringify([]), 'copilot-test',
    ]);
    const secondId = Number(secondRows[0]?.id);
    if (!secondId || Number(secondRows[0]?.serviceId) !== serviceId) throw new Error('Second Collector does not retain serviceId.');
    collectorIds.push(secondId);
    checks.push('one Service to multiple Collectors');

    const byService = await call(connection, 'sp_collector_get_by_service', [serviceId, 1, 50]);
    if (byService.length !== 2 || byService.some((row) => Number(row.serviceId) !== serviceId)) {
      throw new Error('Filtering by service_id failed.');
    }
    const [[serviceUsage]] = await connection.execute('SELECT COUNT(*) AS count FROM collectors WHERE service_id = ?', [serviceId]);
    if (Number(serviceUsage.count) !== 2) throw new Error('Direct MySQL relation count is incorrect.');
    checks.push('filter by service_id and direct MySQL relation');

    let invalidServiceRejected = false;
    try {
      await call(connection, 'sp_collector_create', [
        18446744073709551600n, `${marker}_BAD`, `${marker}_BAD`, null, 'POLLING', 'DRAFT', '[]', 'copilot-test',
      ]);
    } catch (error) {
      invalidServiceRejected = error.sqlMessage === 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE' || error.code === 'ER_NO_REFERENCED_ROW_2';
    }
    if (!invalidServiceRejected) throw new Error('Invalid service reference was not rejected.');
    checks.push('invalid service reference rejected');

    let duplicateReferenceRejected = false;
    try {
      await call(connection, 'sp_collector_create', [
        serviceId, `${marker}_ONE`, `${marker}_DUPLICATE`, null, 'POLLING', 'DRAFT', '[]', 'copilot-test',
      ]);
    } catch (error) {
      duplicateReferenceRejected = error.code === 'ER_DUP_ENTRY';
    }
    if (!duplicateReferenceRejected) throw new Error('Duplicate Collector code was not rejected.');
    checks.push('duplicate code rejected');

    const configuration = {
      targets: [{ targetIdentifier: `${marker}_target`, targetConfig: { resource: 'tenant' }, isActive: true }],
      methods: [{ extractionMethodId: method.id, executionOrder: 0, parameters: {}, isActive: true }],
      schedules: [{ scheduleType: 'INTERVAL', intervalSeconds: 300, timezone: 'UTC', isEnabled: true }],
      transformations: [{ executionOrder: 0, transformationType: 'RENAME_FIELD', configuration: { from: 'old', to: 'new' }, isEnabled: true }],
      fieldMappings: [{ sourceField: 'new', destinationField: 'metric_value', destinationType: 'DECIMAL', transformationConfig: {}, isRequired: true }],
      destinations: [{ destinationType: 'SERVER_STORAGE', destinationReference: 'authorized-default', storageConfig: {}, isEnabled: true }],
      policies: { timeoutMs: 30000, maxRetries: 2, retryDelayMs: 500, backoffStrategy: 'EXPONENTIAL', maxConcurrency: 1, overlapPolicy: 'SKIP', batchSize: 500 },
    };
    await call(connection, 'sp_collector_save_configuration', [firstId, JSON.stringify(configuration), 'copilot-test']);
    const configResult = await call(connection, 'sp_collector_get_configuration', [firstId]);
    const loadedConfig = typeof configResult[0]?.configuration === 'string'
      ? JSON.parse(configResult[0].configuration)
      : configResult[0]?.configuration;
    if (Number(configResult[0]?.serviceId) !== serviceId || loadedConfig?.methods?.[0]?.extractionMethodId !== method.id) {
      throw new Error('Collector configuration was not saved and returned.');
    }
    checks.push('targets/methods/schedule/transformation/mapping/destination/policy config saved');

    let invalidMethodRejected = false;
    try {
      await call(connection, 'sp_collector_save_configuration', [
        firstId, JSON.stringify({ methods: [{ extractionMethodId: 999999999 }] }), 'copilot-test',
      ]);
    } catch (error) {
      invalidMethodRejected = error.sqlMessage === 'COLLECTOR_METHOD_INVALID_OR_INCOMPATIBLE';
    }
    if (!invalidMethodRejected) throw new Error('Invalid extraction method was not rejected.');
    checks.push('invalid extraction method rejected');

    let incompatibleServiceRejected = false;
    try {
      await call(connection, 'sp_collector_update', [
        firstId, serviceTwoId, true,
        null, false, null, false, null, false, null, false, null, false, null, false, 'copilot-test',
      ]);
    } catch (error) {
      incompatibleServiceRejected = error.sqlMessage === 'COLLECTOR_METHOD_INVALID_OR_INCOMPATIBLE';
    }
    if (!incompatibleServiceRejected) throw new Error('Service change did not validate configured Methods.');
    checks.push('service update revalidates extraction methods');

    const [[target]] = await connection.execute(
      'SELECT id FROM collector_targets WHERE collector_id = ? ORDER BY id LIMIT 1',
      [firstId],
    );
    const [[collectorMethod]] = await connection.execute(
      'SELECT id FROM collector_methods WHERE collector_id = ? ORDER BY id LIMIT 1',
      [firstId],
    );
    const checkpointFirst = await call(connection, 'sp_collector_checkpoint_upsert', [
      firstId, collectorMethod.id, target.id, 'cursor', JSON.stringify({ value: 1 }), null,
    ]);
    if (Number(checkpointFirst[0]?.lock_version) !== 1) throw new Error('Initial checkpoint lock version is not 1.');
    const checkpointSecond = await call(connection, 'sp_collector_checkpoint_upsert', [
      firstId, collectorMethod.id, target.id, 'cursor', JSON.stringify({ value: 2 }), 1,
    ]);
    if (Number(checkpointSecond[0]?.lock_version) !== 2) throw new Error('Checkpoint optimistic update did not increment its version.');
    let staleCheckpointRejected = false;
    try {
      await call(connection, 'sp_collector_checkpoint_upsert', [
        firstId, collectorMethod.id, target.id, 'cursor', JSON.stringify({ value: 3 }), 1,
      ]);
    } catch (error) {
      staleCheckpointRejected = error.sqlMessage === 'COLLECTOR_CHECKPOINT_VERSION_CONFLICT';
    }
    if (!staleCheckpointRejected) throw new Error('Stale checkpoint lock_version was not rejected.');
    checks.push('checkpoint scope and optimistic concurrency');

    const duplicateRows = await call(connection, 'sp_collector_duplicate', [firstId, `${marker}_COPY`, `${marker}_COPY`, 'copilot-test']);
    const duplicateId = Number(duplicateRows[0]?.id);
    if (!duplicateId || Number(duplicateRows[0]?.serviceId) !== serviceId) throw new Error('Duplicate did not retain the original service_id.');
    collectorIds.push(duplicateId);
    checks.push('duplicate retains original service_id');

    const queued = await call(connection, 'sp_collector_execution_create', [firstId, 'MANUAL', 'copilot-test']);
    const executionId = Number(queued[0]?.id);
    if (!executionId || queued[0]?.status !== 'QUEUED') throw new Error('Manual execution was not queued.');
    checks.push('manual run creates QUEUED execution');

    let overlapRejected = false;
    try {
      await call(connection, 'sp_collector_execution_create', [firstId, 'MANUAL', 'copilot-test']);
    } catch (error) {
      overlapRejected = error.sqlMessage === 'COLLECTOR_EXECUTION_OVERLAP';
    }
    if (!overlapRejected) throw new Error('SKIP overlap policy did not reject a second queued execution.');
    checks.push('overlap SKIP enforced');

    const [claimed] = await call(connection, 'sp_collector_execution_claim', ['test-worker', 30]);
    if (Number(claimed?.id) !== executionId || claimed?.status !== 'RUNNING') throw new Error('Execution claim failed.');
    await call(connection, 'sp_collector_execution_finish', [executionId, 'test-worker', 'SUCCESS', 10, 10, 10, null, null]);
    const execution = (await call(connection, 'sp_collector_execution_get', [firstId, executionId]))[0];
    if (execution?.status !== 'SUCCESS') throw new Error('Execution finish/history failed.');
    checks.push('claim/finish/history');

    await connection.execute(
      'UPDATE collector_policies SET overlap_policy = ?, max_concurrency = ? WHERE collector_id = ?',
      ['QUEUE', 1, firstId],
    );
    const queuedOne = await call(connection, 'sp_collector_execution_create', [firstId, 'MANUAL', 'copilot-test']);
    const queuedTwo = await call(connection, 'sp_collector_execution_create', [firstId, 'MANUAL', 'copilot-test']);
    const queuedOneId = Number(queuedOne[0]?.id);
    const queuedTwoId = Number(queuedTwo[0]?.id);
    const [claimedUnderLimit] = await call(connection, 'sp_collector_execution_claim', ['concurrency-worker', 30]);
    if (Number(claimedUnderLimit?.id) !== queuedOneId) throw new Error('Queue did not claim its oldest eligible execution.');
    const blockedByConcurrency = await call(connection, 'sp_collector_execution_claim', ['second-worker', 30]);
    if (blockedByConcurrency.length !== 0) throw new Error('max_concurrency=1 allowed a second simultaneous claim.');
    await call(connection, 'sp_collector_execution_finish', [queuedOneId, 'concurrency-worker', 'SUCCESS', 1, 1, 1, null, null]);
    await connection.execute('UPDATE collector_executions SET status = ?, finished_at = CURRENT_TIMESTAMP(3) WHERE id = ?', ['CANCELLED', queuedTwoId]);
    checks.push('QUEUE policy honors max_concurrency=1');

    let serviceDeleteBlocked = false;
    try {
      await call(connection, 'sp_service_delete', [serviceId]);
    } catch (error) {
      serviceDeleteBlocked = error.sqlMessage === 'SERVICE_HAS_COLLECTORS';
    }
    if (!serviceDeleteBlocked) throw new Error('Service deletion with Collector dependencies was not blocked.');
    const usage = (await call(connection, 'sp_service_get_usage', [serviceId]))[0];
    if (Number(usage?.collectorBindings) !== 3) throw new Error('Service usage does not count associated Collectors.');
    checks.push('Service delete dependency blocked and usage count verified');

    process.stdout.write(JSON.stringify({ database: identity.selectedSchema, checks }, null, 2));
  } finally {
    for (const id of collectorIds.reverse()) {
      try { await call(connection, 'sp_collector_delete', [id]); }
      catch (error) { process.stderr.write(`Collector cleanup failed for ${id}: ${error.message}\n`); }
    }
    for (const id of serviceIds.reverse()) {
      try { await call(connection, 'sp_service_delete', [id]); }
      catch (error) { process.stderr.write(`Service cleanup failed for ${id}: ${error.message}\n`); }
    }
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`);
  process.exitCode = 1;
});
