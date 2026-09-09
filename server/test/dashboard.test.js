import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 9 Dashboard Analytics and Warranty Engine Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Setup tokens
  await t.test('Acquire authentication tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    employeeToken = empBody.data.token;

    assert.ok(adminToken, 'Admin token acquired');
    assert.ok(employeeToken, 'Employee token acquired');
  });

  // 1. Unauthorized access
  await t.test('GET /dashboard/stats without token returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/dashboard/stats`);
    assert.strictEqual(res.status, 401);
  });

  // 2. Dashboard KPIs
  await t.test('GET /dashboard/stats returns real-time inventory and warranty KPIs', async () => {
    const res = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.assets, 'Assets stats object present');
    assert.ok(typeof body.data.assets.total === 'number');
    assert.ok(body.data.assets.total >= 10, 'Expected at least 10 seeded assets');
    assert.ok(typeof body.data.assets.assigned === 'number');
    assert.ok(typeof body.data.assets.available === 'number');
    assert.ok(typeof body.data.assets.utilizationRate === 'number');

    // Warranty summary
    assert.ok(body.data.warranties, 'Warranties summary object present');
    assert.ok(typeof body.data.warranties.active === 'number');
    assert.ok(typeof body.data.warranties.expiringSoon === 'number');
    assert.ok(typeof body.data.warranties.expired === 'number');

    // Complaints summary
    assert.ok(body.data.complaints, 'Complaints summary present');
    assert.ok(typeof body.data.complaints.open === 'number');
    assert.ok(typeof body.data.complaints.total === 'number');
  });

  // 3. Employee accessibility
  await t.test('GET /dashboard/stats is accessible by Employee role', async () => {
    const res = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 4. Category distribution
  await t.test('GET /dashboard/category-distribution returns aggregated categories and percentages', async () => {
    const res = await fetch(`${baseUrl}/dashboard/category-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0, 'Should have category breakdown');

    const first = body.data[0];
    assert.ok(first.category, 'Has category name');
    assert.ok(typeof first.count === 'number');
    assert.ok(typeof first.percentage === 'number');
    assert.ok(typeof first.assigned === 'number');
    assert.ok(typeof first.available === 'number');
  });

  // 5. Department distribution
  await t.test('GET /dashboard/department-distribution returns department equipment mapping', async () => {
    const res = await fetch(`${baseUrl}/dashboard/department-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0, 'Should have department breakdown');

    const dept = body.data.find(d => d.department.includes('Communication') || d.department.includes('CNS'));
    assert.ok(dept, 'CNS department found in distribution');
    assert.ok(dept.assetCount > 0, 'CNS has assets');
    assert.ok(dept.employeeCount > 0, 'CNS has employees');
  });

  // 6. Warranty alert queue
  await t.test('GET /dashboard/warranty-alerts returns assets expiring soon or expired', async () => {
    const res = await fetch(`${baseUrl}/dashboard/warranty-alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));

    if (body.data.length > 0) {
      const alert = body.data[0];
      assert.ok(alert.assetId, 'Alert includes assetId');
      assert.ok(alert.warrantyStatus, 'Alert includes warrantyStatus');
      assert.ok(typeof alert.daysRemaining === 'number', 'Alert includes daysRemaining');
      assert.ok(['CRITICAL_EXPIRED', 'HIGH_WARNING', 'MODERATE_WARNING'].includes(alert.urgency));
    }
  });

  // 7. Recent activity timeline
  await t.test('GET /dashboard/recent-activity returns chronological activity feed', async () => {
    const res = await fetch(`${baseUrl}/dashboard/recent-activity?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length <= 5);

    if (body.data.length > 0) {
      const act = body.data[0];
      assert.ok(act.id, 'Activity has id');
      assert.ok(act.title, 'Activity has title');
      assert.ok(act.timestamp, 'Activity has timestamp');
      assert.ok(act.type, 'Activity has type');
    }
  });
});
