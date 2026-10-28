require('dotenv').config({ path: '.env.dev', quiet: true });
const { JwtService } = require('@nestjs/jwt');
const mysql = require('mysql2/promise');

const database = 'km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1';
const baseUrl = process.env.COLLECTORS_TEST_BASE_URL || 'http://127.0.0.1:3318/api/v1';
const companyCode = '76u76uyyy';
const userGuid = '64d3d228-cec5-11f1-b541-a6d1e9ab77e1';
const marker = `HTTP_COLLECTORS_TEST_${Date.now()}`;
const jwt = new JwtService();
const createdServiceIds = [];
const createdCollectorIds = [];
const executionIds = [];

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Company-Code': companyCode,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  return body?.data ?? body;
}

async function requestExpectStatus(path, token, options, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Company-Code': companyCode,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${options.method ?? 'GET'} ${path} expected ${expectedStatus}, got ${response.status}: ${await response.text()}`);
  }
  return response;
}

async function cleanupDatabase() {
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
    for (const id of executionIds) {
      await connection.execute(
        'UPDATE collector_executions SET status = ?, finished_at = CURRENT_TIMESTAMP(3), lease_owner = NULL, lease_until = NULL WHERE id = ? AND status IN (?, ?)',
        ['CANCELLED', id, 'QUEUED', 'RUNNING'],
      );
    }
  } finally {
    if (connection) await connection.end();
  }
}

async function run() {
  const token = await jwt.signAsync(
    { sub: userGuid, isPlatformAdmin: true },
    { secret: process.env.JWT_SECRET, expiresIn: 300 },
  );
  const checks = [];
  try {
    const serviceTypes = await request('/service-types', token);
    const graphType = serviceTypes.find((type) => type.code === 'TEAMS');
    const snmpType = serviceTypes.find((type) => type.code === 'SNMP');
    if (!graphType || !snmpType) throw new Error('Required seeded service types were not returned.');

    const service = await request('/services', token, {
      method: 'POST',
      body: JSON.stringify({ serviceTypeId: graphType.id, driverKey: 'microsoft-graph', code: `${marker}_GRAPH`, name: `${marker}_GRAPH`, isActive: true }),
    });
    createdServiceIds.push(Number(service.id));
    const snmpService = await request('/services', token, {
      method: 'POST',
      body: JSON.stringify({ serviceTypeId: snmpType.id, driverKey: 'snmp', code: `${marker}_SNMP`, name: `${marker}_SNMP`, isActive: true }),
    });
    createdServiceIds.push(Number(snmpService.id));
    checks.push('Services created through REST');

    await requestExpectStatus('/collectors', token, {
      method: 'POST',
      body: JSON.stringify({ code: `${marker}_NO_SERVICE`, name: `${marker}_NO_SERVICE` }),
    }, 400);
    checks.push('serviceId required by API');

    const collector = await request('/collectors', token, {
      method: 'POST',
      body: JSON.stringify({
        serviceId: service.id, code: `${marker}_ONE`, name: `${marker}_ONE`,
        collectorType: 'POLLING', status: 'ACTIVE', tags: ['http-test'],
      }),
    });
    const collectorId = Number(collector.id);
    createdCollectorIds.push(collectorId);
    if (Number(collector.serviceId) !== Number(service.id) || collector.serviceName !== service.name) {
      throw new Error('Collector response omitted or changed serviceId/serviceName.');
    }

    const collectorTwo = await request('/collectors', token, {
      method: 'POST',
      body: JSON.stringify({
        serviceId: service.id, code: `${marker}_TWO`, name: `${marker}_TWO`, status: 'DRAFT',
      }),
    });
    createdCollectorIds.push(Number(collectorTwo.id));
    checks.push('POST /collectors and mandatory serviceId');

    const byFilter = await request(`/collectors?serviceId=${service.id}`, token);
    if (byFilter.length !== 2 || byFilter.some((row) => Number(row.serviceId) !== Number(service.id))) {
      throw new Error('GET /collectors?serviceId filtering failed.');
    }
    const byService = await request(`/services/${service.id}/collectors`, token);
    if (byService.length !== 2) throw new Error('GET /services/:serviceId/collectors failed.');
    checks.push('filter by serviceId and Service collectors endpoint');

    await requestExpectStatus('/collectors', token, {
      method: 'POST',
      body: JSON.stringify({ serviceId: 999999999, code: `${marker}_BAD`, name: `${marker}_BAD` }),
    }, 404);
    checks.push('nonexistent service rejected');

    const configuration = {
      targets: [{ targetIdentifier: `${marker}_tenant`, targetConfig: { tenant: 'test' } }],
      methods: [{ extractionMethodId: 4, executionOrder: 0, parameters: {} }],
      schedules: [{ scheduleType: 'INTERVAL', intervalSeconds: 300, timezone: 'UTC' }],
      transformations: [{ executionOrder: 0, transformationType: 'RENAME_FIELD', configuration: { from: 'old', to: 'new' } }],
      fieldMappings: [{ sourceField: 'new', destinationField: 'metric_value', destinationType: 'DECIMAL' }],
      destinations: [{ destinationType: 'SERVER_STORAGE', destinationReference: 'authorized-default', storageConfig: {} }],
      policies: { overlapPolicy: 'SKIP' },
    };
    await requestExpectStatus(`/collectors/${collectorId}/configuration`, token, {
      method: 'PUT',
      body: JSON.stringify({ targets: [{ targetIdentifier: 'bad-secret', targetConfig: { apiToken: 'not-real' } }] }),
    }, 400);
    await requestExpectStatus(`/collectors/${collectorId}/configuration`, token, {
      method: 'PUT',
      body: JSON.stringify({ schedules: [{ scheduleType: 'CRON', cronExpression: 'not-a-cron', timezone: 'UTC' }] }),
    }, 400);
    checks.push('secret JSON and invalid cron rejected');

    await request(`/collectors/${collectorId}/configuration`, token, {
      method: 'PUT', body: JSON.stringify(configuration),
    });
    const loadedConfiguration = await request(`/collectors/${collectorId}/configuration`, token);
    if (Number(loadedConfiguration.serviceId) !== Number(service.id)) throw new Error('Configuration response serviceId mismatch.');
    checks.push('PUT/GET configuration');

    await requestExpectStatus(`/collectors/${collectorId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ serviceId: snmpService.id }),
    }, 400);
    checks.push('service change with incompatible method rejected');

    const validation = await request(`/collectors/${collectorId}/validate`, token, { method: 'POST', body: '{}' });
    if (validation.valid !== true) throw new Error('Collector validation did not pass.');
    checks.push('POST /validate');

    const duplicate = await request(`/collectors/${collectorId}/duplicate`, token, {
      method: 'POST', body: JSON.stringify({ code: `${marker}_COPY`, name: `${marker}_COPY` }),
    });
    createdCollectorIds.push(Number(duplicate.id));
    if (Number(duplicate.serviceId) !== Number(service.id)) throw new Error('Duplicate did not retain serviceId.');
    checks.push('duplicate retains serviceId');

    const blockedServiceDelete = await requestExpectStatus(`/services/${service.id}`, token, { method: 'DELETE' }, 409);
    void blockedServiceDelete;
    const usage = await request(`/services/${service.id}/usage`, token);
    if (Number(usage.collectorBindings) !== 3) throw new Error('Service usage collectorBindings mismatch.');
    checks.push('Service deletion blocked and usage count returned');

    const queued = await request(`/collectors/${collectorId}/run`, token, {
      method: 'POST', body: JSON.stringify({ triggerType: 'MANUAL' }),
    });
    const executionId = Number(queued.id);
    executionIds.push(executionId);
    if (queued.status !== 'QUEUED') throw new Error('Manual execution was not left QUEUED for Collector-BS.');
    const listedExecutions = await request(`/collectors/${collectorId}/executions`, token);
    if (!listedExecutions.some((item) => Number(item.id) === executionId)) throw new Error('Queued execution missing from history.');
    checks.push('manual run queued; execution history visible');

    await cleanupDatabase();
    for (const id of [...createdCollectorIds].reverse()) {
      await request(`/collectors/${id}`, token, { method: 'DELETE' });
    }
    createdCollectorIds.length = 0;
    for (const id of [...createdServiceIds].reverse()) {
      await request(`/services/${id}`, token, { method: 'DELETE' });
    }
    createdServiceIds.length = 0;
    checks.push('temporary data cleaned through API');

    process.stdout.write(JSON.stringify({ baseUrl, database, companyCode, checks }, null, 2));
  } finally {
    await cleanupDatabase().catch(() => undefined);
    for (const id of [...createdCollectorIds].reverse()) {
      await request(`/collectors/${id}`, token, { method: 'DELETE' }).catch(() => undefined);
    }
    for (const id of [...createdServiceIds].reverse()) {
      await request(`/services/${id}`, token, { method: 'DELETE' }).catch(() => undefined);
    }
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
