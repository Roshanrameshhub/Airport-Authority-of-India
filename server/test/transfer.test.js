import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 5 Assignment and Transfer Engine Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Login tokens
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
  });

  // 1. Get assignments paginated list
  await t.test('GET /assignments returns paginated list of custody records', async () => {
    const res = await fetch(`${baseUrl}/assignments?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3);
  });

  // 2. Timeline history for an asset
  await t.test('GET /assignments/asset/:assetId returns chronological custody history', async () => {
    const res = await fetch(`${baseUrl}/assignments/asset/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 2, 'Should contain at least 2 historical assignments');
    // Verify sorting is descending by assignedDate
    assert.strictEqual(body.data[0].status, 'ACTIVE');
    assert.strictEqual(body.data[1].status, 'TRANSFERRED');
    assert.ok(body.data[1].returnedDate, 'Transferred record must have returnedDate');
  });

  // 3. Employee assignments
  await t.test('GET /assignments/employee/:employeeId returns staff assignments', async () => {
    const res = await fetch(`${baseUrl}/assignments/employee/AAI-10842`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(a => a.assetId === 'AAI-REG-PC-2024-0001'));
  });

  // 4. Assign an AVAILABLE asset
  await t.test('POST /assignments/assign assigns an AVAILABLE asset to an employee', async () => {
    const res = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        employeeId: 'AAI-10950',
        condition: 'EXCELLENT',
        transferReason: 'ATC Tower power backup installation',
        remarks: 'Allocated for display monitoring battery backup'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'ACTIVE');
    assert.strictEqual(body.data.employeeId, 'AAI-10950');

    // Verify Asset is now ASSIGNED with updated custodian
    const assetRes = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetBody = await assetRes.json();
    assert.strictEqual(assetBody.data.status, 'ASSIGNED');
    assert.strictEqual(assetBody.data.currentEmployeeId, 'AAI-10950');
  });

  // 5. Guardrail: Reject assignment on already assigned asset
  await t.test('POST /assignments/assign rejects already assigned asset', async () => {
    const res = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        employeeId: 'AAI-ADM-001',
        condition: 'GOOD',
        transferReason: 'Attempt duplicate assignment'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already assigned/i);
  });

  // 6. Guardrail: Reject assignment on asset under maintenance
  await t.test('POST /assignments/assign rejects assignment on UNDER_MAINTENANCE asset', async () => {
    const res = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-SCN-2023-0010',
        employeeId: 'AAI-10842',
        transferReason: 'Attempt to assign machine undergoing maintenance'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /under_maintenance/i);
  });

  // 7. Guardrail: Cannot transfer asset to same employee
  await t.test('POST /assignments/transfer rejects transfer to current custodian', async () => {
    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        toEmployeeId: 'AAI-10950', // Already assigned to AAI-10950 in step 4
        transferReason: 'Attempt transfer to self'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already assigned to employee/i);
  });

  // 8. Transfer asset to new employee with immutable history
  await t.test('POST /assignments/transfer moves asset to new custodian immutably', async () => {
    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        toEmployeeId: 'AAI-ADM-001',
        transferReason: 'Transferred to Admin for training display setup',
        conditionAtReturn: 'GOOD',
        conditionAtNewAssignment: 'EXCELLENT',
        remarks: 'Transferred from ATC to Admin block'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.newAssignment.employeeId, 'AAI-ADM-001');
    assert.strictEqual(body.data.newAssignment.status, 'ACTIVE');
    assert.strictEqual(body.data.previousAssignment.status, 'TRANSFERRED');
    assert.ok(body.data.previousAssignment.returnedDate);

    // Verify Asset record reflects new custodian
    const assetRes = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetBody = await assetRes.json();
    assert.strictEqual(assetBody.data.currentEmployeeId, 'AAI-ADM-001');
    assert.strictEqual(assetBody.data.status, 'ASSIGNED');
  });

  // 9. Return asset to pool (unassign)
  await t.test('POST /assignments/return unassigns asset back to available pool', async () => {
    const res = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        returnReason: 'Training completed, returned to IT pool',
        conditionAtReturn: 'GOOD',
        remarks: 'Clean and fully functional'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'AVAILABLE');

    // Verify Asset record is now AVAILABLE and custody cleared
    const assetRes = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetBody = await assetRes.json();
    assert.strictEqual(assetBody.data.status, 'AVAILABLE');
    assert.strictEqual(assetBody.data.currentEmployeeId, null);
    assert.strictEqual(assetBody.data.floor, 'IT Store / Pool');
  });

  // 10. Guardrail: Cannot return an already AVAILABLE asset
  await t.test('POST /assignments/return rejects unassign on available asset', async () => {
    const res = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2024-0009',
        returnReason: 'Duplicate return'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /not currently assigned/i);
  });

  // 11. RBAC authorization check
  await t.test('POST /assignments/transfer by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        toEmployeeId: 'AAI-10950',
        transferReason: 'Unauthorized transfer attempt'
      })
    });
    assert.strictEqual(res.status, 403);
  });
});
