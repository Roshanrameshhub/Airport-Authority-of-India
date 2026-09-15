import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 13 Role-Based Access Control & Governance Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire both Admin and Employee tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminBody.data.token;

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee01', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;
  });

  await t.test('Employee is forbidden from creating assets', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetName: 'Rogue Asset',
        category: 'Desktop PC',
        serialNumber: 'ROGUE-SN-999',
        department: 'General'
      })
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for POST /assets');
  });

  await t.test('Employee is forbidden from editing asset specifications', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetName: 'Hacked Workstation'
      })
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for PUT /assets/:id');
  });

  await t.test('Employee is forbidden from deleting or retiring assets', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${employeeToken}`
      }
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for DELETE /assets/:id');
  });

  await t.test('Employee is forbidden from bulk importing workbooks', async () => {
    const res = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ importToken: 'fake-token' })
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for POST /import/commit');
  });

  await t.test('Employee is forbidden from linking hardware components', async () => {
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-2024-0001',
        childAssetId: 'AAI-REG-MON-2024-0005',
        relationshipType: 'ATTACHED_COMPONENT'
      })
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for POST /relationships/link');
  });

  await t.test('Employee is forbidden from launching physical verification campaigns', async () => {
    const res = await fetch(`${baseUrl}/verification/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        name: 'Unapproved Verification Audit'
      })
    });
    assert.strictEqual(res.status, 403, 'Employee should receive 403 Forbidden for POST /verification/campaigns');
  });

  await t.test('Employee is authorized to view Master Data, Inventory, and Timelines', async () => {
    const deptRes = await fetch(`${baseUrl}/master/departments`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(deptRes.status, 200, 'Employee should have read access to master departments');

    const assetRes = await fetch(`${baseUrl}/assets?limit=5`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(assetRes.status, 200, 'Employee should have read access to asset inventory');

    const timelineRes = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001/timeline`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(timelineRes.status, 200, 'Employee should have read access to asset timeline');
  });
});
