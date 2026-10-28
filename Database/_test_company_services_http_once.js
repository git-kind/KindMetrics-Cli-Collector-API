require('dotenv').config({ path: '.env.dev', quiet: true });
const { JwtService } = require('@nestjs/jwt');

const baseUrl = process.env.SERVICES_TEST_BASE_URL || 'http://127.0.0.1:3317/api/v1';
const companyCode = '76u76uyyy';
const userGuid = '64d3d228-cec5-11f1-b541-a6d1e9ab77e1';
const marker = `HTTP_SERVICES_TEST_${Date.now()}`;
const jwt = new JwtService();
let serviceId;
let snmpServiceId;
let credentialId;

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
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body?.data ?? body;
}

async function run() {
  const token = await jwt.signAsync(
    { sub: userGuid, isPlatformAdmin: true },
    { secret: process.env.JWT_SECRET, expiresIn: 300 },
  );
  const checks = [];
  try {
    const types = await request('/service-types', token);
    const restType = types.find((type) => type.code === 'REST_API');
    if (!restType) throw new Error('REST_API service type was not returned.');
    checks.push('GET /service-types');

    const service = await request('/services', token, {
      method: 'POST',
      body: JSON.stringify({
        serviceTypeId: restType.id,
        driverKey: 'http',
        code: marker,
        name: marker,
        description: 'Temporary HTTP integration test',
        isActive: true,
      }),
    });
    serviceId = Number(service.id);
    if (!serviceId) throw new Error('POST /services returned no id.');
    checks.push('POST /services');

    const snmpType = types.find((type) => type.code === 'SNMP');
    const snmpService = await request('/services', token, {
      method: 'POST',
      body: JSON.stringify({
        serviceTypeId: snmpType.id,
        driverKey: 'snmp',
        code: `${marker}_SNMP`,
        name: `${marker}_SNMP`,
        isActive: true,
      }),
    });
    snmpServiceId = Number(snmpService.id);
    if (!snmpServiceId) throw new Error('SNMP test Service was not created.');
    checks.push('POST /services SNMP');

    const authTypes = await request('/service-auth-types', token);
    const basicAuth = authTypes.find((authType) => authType.code === 'BASIC');
    if (!basicAuth) throw new Error('BASIC auth type was not returned.');
    const incompatibleAuth = await fetch(`${baseUrl}/services/${snmpServiceId}/connection`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Company-Code': companyCode,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionConfig: {},
        authTypeId: basicAuth.id,
        authConfig: {},
        additionalParameters: {},
      }),
    });
    if (incompatibleAuth.status !== 409) {
      throw new Error(
        `Unsupported HTTP driver/auth combination returned ${incompatibleAuth.status}: ${await incompatibleAuth.text()}`,
      );
    }
    checks.push('driver/auth incompatibility => 409');

    const rejectedSecret = await fetch(`${baseUrl}/services/${serviceId}/connection`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Company-Code': companyCode,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionConfig: { baseUrl: 'https://example.invalid' },
        authTypeId: 1,
        authConfig: { clientSecret: 'not-a-real-secret' },
        additionalParameters: {},
      }),
    });
    if (rejectedSecret.status !== 400) throw new Error(`Secret-shaped authConfig was not rejected (${rejectedSecret.status}).`);
    checks.push('secret-shaped JSON rejected');

    await request(`/services/${serviceId}/connection`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        connectionConfig: { baseUrl: 'https://example.invalid' },
        authTypeId: 1,
        authConfig: { credentialRef: 'vault://http-test/reference' },
        additionalParameters: {},
      }),
    });
    checks.push('PATCH /services/:id/connection');

    const fetched = await request(`/services/${serviceId}`, token);
    if (JSON.stringify(fetched).includes('vault://http-test/reference') || 'authConfig' in fetched) {
      throw new Error('Service response exposed authentication configuration.');
    }
    checks.push('GET /services/:id secret redaction');

    const testResult = await request(`/services/${serviceId}/test-connection`, token, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (testResult.status !== 'NOT_SUPPORTED') throw new Error('Expected NOT_SUPPORTED from the unimplemented HTTP driver.');
    checks.push('POST /services/:id/test-connection => NOT_SUPPORTED');

    const credentials = await request(`/services/${serviceId}/credentials`, token, {
      method: 'POST',
      body: JSON.stringify({ credentialType: 'OAUTH_CLIENT', credentialReference: 'vault://http-test/client' }),
    });
    credentialId = Number(credentials[0]?.id);
    if (!credentialId) throw new Error('Credential reference was not returned.');
    checks.push('POST /services/:id/credentials');

    const deleteBlocked = await fetch(`${baseUrl}/services/${serviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Company-Code': companyCode },
    });
    if (deleteBlocked.status !== 409) throw new Error(`Delete with credential dependency was not blocked (${deleteBlocked.status}).`);
    checks.push('DELETE blocked by credential reference');

    await request(`/service-credentials/${credentialId}`, token, { method: 'DELETE' });
    credentialId = undefined;
    await request(`/services/${serviceId}`, token, { method: 'DELETE' });
    serviceId = undefined;
    checks.push('cleanup via REST');

    process.stdout.write(JSON.stringify({ baseUrl, companyCode, checks }, null, 2));
  } finally {
    if (credentialId) {
      await fetch(`${baseUrl}/service-credentials/${credentialId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-Company-Code': companyCode },
      }).catch(() => undefined);
    }
    if (serviceId) {
      await fetch(`${baseUrl}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-Company-Code': companyCode },
      }).catch(() => undefined);
    }
    if (snmpServiceId) {
      await fetch(`${baseUrl}/services/${snmpServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-Company-Code': companyCode },
      }).catch(() => undefined);
    }
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
