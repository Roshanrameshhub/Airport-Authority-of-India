import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 8 Search, Filter & Reporting Engines Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let employeeToken = '';
  let adminToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire authentication tokens', async () => {
    // Employee
    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;

    // Admin
    const admRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const admBody = await admRes.json();
    assert.strictEqual(admRes.status, 200);
    adminToken = admBody.data.token;
  });

  // 1. Compound search across asset attributes
  await t.test('Search across serial numbers, oldAssetId, supplier, supply order, and room', async () => {
    // Search by GeM supply order number
    const res1 = await fetch(`${baseUrl}/assets?search=GEMC-511687720238120`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.ok(body1.data.length >= 1);
    assert.strictEqual(body1.data[0].assetId, 'AAI-REG-PRT-2023-0003');

    // Search by oldAssetId
    const res2 = await fetch(`${baseUrl}/assets?search=AAI-SR-IT-CPU-510`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.ok(body2.data.length >= 1);
    assert.strictEqual(body2.data[0].assetId, 'AAI-REG-PC-2023-0004');

    // Search by supplier name
    const res3 = await fetch(`${baseUrl}/assets?search=Sky Star`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.ok(body3.data.length >= 1);
    body3.data.forEach(item => {
      const supplierName = item.supplier || item.vendor || '';
      assert.ok(supplierName.toLowerCase().includes('sky star'));
    });
  });

  // 2. Multi-criteria filtering
  await t.test('Multi-criteria filter by assetType, status, and amcApplicable', async () => {
    const res = await fetch(`${baseUrl}/assets?assetType=PRINTER&status=ASSIGNED&amcApplicable=true`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1);
    body.data.forEach(item => {
      assert.strictEqual(item.assetType, 'PRINTER');
      assert.strictEqual(item.status, 'ASSIGNED');
      assert.strictEqual(item.amcApplicable, true);
    });
  });

  // 3. Custom sorting and pagination
  await t.test('Sort assets by purchaseCost and paginate correctly', async () => {
    const res = await fetch(`${baseUrl}/assets?sortBy=purchaseCost&sortOrder=desc&page=1&limit=3`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 3);
    assert.ok(body.pagination.total >= 3);

    // Verify descending order
    const costs = body.data.map(i => i.purchaseCost || 0);
    for (let i = 0; i < costs.length - 1; i++) {
      assert.ok(costs[i] >= costs[i + 1], `Cost ${costs[i]} must be >= ${costs[i + 1]}`);
    }
  });

  // 4. Status distribution endpoint
  await t.test('GET /dashboard/status-distribution returns operational status breakdown', async () => {
    const res = await fetch(`${baseUrl}/dashboard/status-distribution`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    const statuses = body.data.map(d => d.status);
    assert.ok(statuses.includes('ASSIGNED') || statuses.includes('AVAILABLE'));
    body.data.forEach(entry => {
      assert.ok(typeof entry.status === 'string');
      assert.ok(typeof entry.count === 'number');
      assert.ok(typeof entry.percentage === 'number');
    });
  });

  // 5. Vendor distribution endpoint
  await t.test('GET /dashboard/vendor-distribution returns procurement breakdown by supplier', async () => {
    const res = await fetch(`${baseUrl}/dashboard/vendor-distribution`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    body.data.forEach(entry => {
      assert.ok(entry.vendorName);
      assert.ok(typeof entry.assetCount === 'number');
      assert.ok(typeof entry.totalCostINR === 'number');
      assert.ok(typeof entry.percentage === 'number');
    });
  });

  // 6. Asset type distribution endpoint
  await t.test('GET /dashboard/type-distribution returns breakdown across rationalized asset types', async () => {
    const res = await fetch(`${baseUrl}/dashboard/type-distribution`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    const types = body.data.map(d => d.assetType);
    assert.ok(types.includes('DESKTOP') || types.includes('LAPTOP') || types.includes('PRINTER'));
    body.data.forEach(entry => {
      assert.ok(typeof entry.assetType === 'string');
      assert.ok(typeof entry.count === 'number');
      assert.ok(typeof entry.percentage === 'number');
    });
  });

  // 7. Security: Unauthenticated request should be rejected (401)
  await t.test('Dashboard endpoints reject unauthenticated access', async () => {
    const res = await fetch(`${baseUrl}/dashboard/status-distribution`);
    assert.strictEqual(res.status, 401);
  });
});
