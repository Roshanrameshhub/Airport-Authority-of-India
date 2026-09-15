import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 7 Transaction History & Custody Chain Test Suite', async (t) => {
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
  });

  // 1. Fetch complete unified timeline of workstation
  await t.test('GET /assets/:id/timeline aggregates custody, complaints, components, and registration', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001/timeline`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, 'AAI-REG-PC-2024-0001');
    assert.ok(body.data.currentCustodian);
    assert.strictEqual(body.data.currentCustodian.employeeId, 'AAI-10842');

    const timeline = body.data.timeline;
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length >= 3, 'Timeline must contain multiple chronological events');

    // Check categories present in unified timeline
    const categories = timeline.map(e => e.category);
    assert.ok(categories.includes('LIFECYCLE'), 'Must contain LIFECYCLE registration event');
    assert.ok(categories.includes('CUSTODY'), 'Must contain CUSTODY assignment/transfer events');
    assert.ok(categories.includes('ASSEMBLY'), 'Must contain ASSEMBLY component events');

    // Verify events are sorted chronologically descending
    for (let i = 0; i < timeline.length - 1; i++) {
      const t1 = new Date(timeline[i].timestamp).getTime();
      const t2 = new Date(timeline[i + 1].timestamp).getTime();
      assert.ok(t1 >= t2, `Event at index ${i} (${timeline[i].timestamp}) must be >= event at index ${i + 1} (${timeline[i + 1].timestamp})`);
    }
  });

  // 2. Timeline of scanner with complaint
  await t.test('GET /assets/:id/timeline includes MAINTENANCE events for serviced equipment', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-SCN-2023-0010/timeline`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const timeline = body.data.timeline;
    assert.ok(timeline.some(e => e.category === 'MAINTENANCE'), 'Must include MAINTENANCE complaint');
  });

  // 3. 404 for unknown asset
  await t.test('GET /assets/:id/timeline returns 404 for unknown asset', async () => {
    const res = await fetch(`${baseUrl}/assets/UNKNOWN-ASSET-9999/timeline`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 404);
  });
});
