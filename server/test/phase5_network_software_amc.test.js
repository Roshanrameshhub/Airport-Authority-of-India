import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 5 Network, Software & AMC Subsystems Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire administrator token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    adminToken = body.data.token;
  });

  // 1. Filter by Operating System
  await t.test('GET /assets?operatingSystem=Windows 11 filters Windows 11 fleet', async () => {
    const res = await fetch(`${baseUrl}/assets?operatingSystem=Windows 11`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
    assert.ok(body.data.every(a => a.computerConfig?.operatingSystem?.includes('Windows 11')));
  });

  // 2. Filter by Static IP Address
  await t.test('GET /assets?ipAddress=10.20.14.101 retrieves equipment by network address', async () => {
    const res = await fetch(`${baseUrl}/assets?ipAddress=10.20.14.101`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].networkConfig?.ipAddress, '10.20.14.101');
    assert.strictEqual(body.data[0].assetId, 'AAI-REG-PC-2024-0001');
  });

  // 3. Filter by AMC Applicability
  await t.test('GET /assets?amcApplicable=true filters equipment under AMC', async () => {
    const res = await fetch(`${baseUrl}/assets?amcApplicable=true`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
    assert.ok(body.data.every(a => a.amcApplicable === true));
  });

  // 4. Filter by specific AMC Contract ID
  await t.test('GET /assets?amcContractId=AMC-2024-HP-001 retrieves contract assets', async () => {
    const res = await fetch(`${baseUrl}/assets?amcContractId=AMC-2024-HP-001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.some(a => a.assetId === 'AAI-REG-PRT-2023-0003'));
  });

  // 5. Vendor AMC Integration check
  await t.test('GET /amc returns vendor maintenance agreements with derived status', async () => {
    const res = await fetch(`${baseUrl}/amc`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    const contract = body.data[0];
    assert.ok(contract.contractNumber);
    assert.ok(contract.vendorName);
    assert.ok(contract.status, 'Derived warranty status must exist');
  });
});
