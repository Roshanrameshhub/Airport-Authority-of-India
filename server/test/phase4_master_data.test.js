import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 4 Master Data Normalization Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire employee token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    employeeToken = body.data.token;
    assert.ok(employeeToken, 'Token acquired');
  });

  // 1. Departments Master Data
  await t.test('GET /master/departments returns operational AAI departments', async () => {
    const res = await fetch(`${baseUrl}/master/departments`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 8);
    assert.ok(body.data.some(d => d.code === 'CNS'), 'CNS department must exist');
    assert.ok(body.data.some(d => d.code === 'IT'), 'IT department must exist');
    assert.ok(body.data.some(d => d.code === 'ATM'), 'ATM department must exist');
  });

  // 2. Categories Master Data
  await t.test('GET /master/categories returns asset categories with requiresOS flag', async () => {
    const res = await fetch(`${baseUrl}/master/categories`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 7);

    const pc = body.data.find(c => c.code === 'PC');
    assert.ok(pc);
    assert.strictEqual(pc.requiresOS, true);

    const ups = body.data.find(c => c.code === 'UPS');
    assert.ok(ups);
    assert.strictEqual(ups.requiresOS, false);
  });

  // 3. Locations / Airport Facilities Master Data
  await t.test('GET /master/locations returns AAI airport facilities', async () => {
    const res = await fetch(`${baseUrl}/master/locations`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 7);
    assert.ok(body.data.some(l => l.code === 'MAA' && l.name.includes('Chennai')));
    assert.ok(body.data.some(l => l.code === 'SRHQ'));
    assert.ok(body.data.some(l => l.code === 'CJB'));
  });

  // 4. Vendors Master Data
  await t.test('GET /master/vendors returns registered vendors from asset.pdf', async () => {
    const res = await fetch(`${baseUrl}/master/vendors`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 5);
    assert.ok(body.data.some(v => v.name.includes('Sky Star Technology')));
    assert.ok(body.data.some(v => v.name.includes('Usam Technology')));
    assert.ok(body.data.some(v => v.name.includes('Broadline Computers')));
  });

  // 5. Lifecycle Statuses
  await t.test('GET /master/statuses returns all 11 lifecycle statuses', async () => {
    const res = await fetch(`${baseUrl}/master/statuses`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 11);
    const keys = body.data.map(s => s.key);
    assert.ok(keys.includes('AVAILABLE'));
    assert.ok(keys.includes('ASSIGNED'));
    assert.ok(keys.includes('GODOWN'));
    assert.ok(keys.includes('WRITE_OFF'));
  });

  // 6. Condition Ratings
  await t.test('GET /master/conditions returns 8 condition ratings', async () => {
    const res = await fetch(`${baseUrl}/master/conditions`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 8);
    const keys = body.data.map(c => c.key);
    assert.ok(keys.includes('NEW'));
    assert.ok(keys.includes('EXCELLENT'));
    assert.ok(keys.includes('UNSERVICEABLE'));
  });

  // 7. Asset Types
  await t.test('GET /master/asset-types returns asset types and schema config mappings', async () => {
    const res = await fetch(`${baseUrl}/master/asset-types`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 10);
    assert.ok(body.data.some(t => t.key === 'DESKTOP' && t.hasConfig === 'computerConfig'));
    assert.ok(body.data.some(t => t.key === 'UPS' && t.hasConfig === 'powerConfig'));
    assert.ok(body.data.some(t => t.key === 'MONITOR' && t.hasConfig === 'displayConfig'));
  });
});
