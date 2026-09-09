import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 8 Complaint Management and Service Desk Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire tokens
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

  // 1. Get complaints list
  await t.test('GET /complaints returns paginated list of service tickets', async () => {
    const res = await fetch(`${baseUrl}/complaints?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 2, 'Should include seeded complaints');
  });

  let newTicketId = '';

  // 2. Raise new complaint ticket by Employee
  await t.test('POST /complaints by Employee raises hardware fault ticket', async () => {
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        category: 'HARDWARE_FAULT',
        title: 'Workstation SMPS failure and frequent power tripping',
        description: 'System powers down unexpectedly during radar processing; smoke smell from power unit.',
        severity: 'CRITICAL',
        phone: '+91 98401 23456'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.ticketId);
    assert.strictEqual(body.data.status, 'OPEN');
    assert.strictEqual(body.data.priority, 'P1_CRITICAL');
    assert.strictEqual(body.data.reportedBy.employeeName, 'Roshan R');

    newTicketId = body.data.ticketId;
  });

  // 3. Verify Asset Lifecycle Interlock: Asset transitions to UNDER_MAINTENANCE
  await t.test('Asset status automatically transitions to UNDER_MAINTENANCE on CRITICAL hardware fault', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'UNDER_MAINTENANCE');
  });

  // 4. Guardrail: Cannot transfer equipment while UNDER_MAINTENANCE
  await t.test('Transfer engine rejects transfer while asset is UNDER_MAINTENANCE', async () => {
    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        toEmployeeId: 'AAI-10950',
        transferReason: 'Attempt to transfer machine undergoing repair'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /only assigned assets can be transferred/i);
  });

  // 5. Admin assigns technician
  await t.test('PATCH /complaints/:id/assign assigns technician and marks IN_PROGRESS', async () => {
    const res = await fetch(`${baseUrl}/complaints/${newTicketId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        technicianName: 'Rajesh Kumar (Senior Hardware Engineer)'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assignedTechnician.name, 'Rajesh Kumar (Senior Hardware Engineer)');
    assert.strictEqual(body.data.status, 'IN_PROGRESS');
  });

  // 6. Admin resolves ticket with replacement parts
  await t.test('PATCH /complaints/:id/status resolves ticket and records resolution notes', async () => {
    const res = await fetch(`${baseUrl}/complaints/${newTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolutionNotes: 'Replaced faulty 500W SMPS unit with new OEM spare; bench tested for 4 hours.',
        partsReplaced: 'Dell OEM 500W Bronze SMPS Unit'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RESOLVED');
    assert.strictEqual(body.data.resolution.resolvedBy, 'admin');
    assert.ok(body.data.resolution.resolvedAt);
  });

  // 7. Verify Lifecycle Interlock: Asset restored to ASSIGNED
  await t.test('Asset status automatically restored to ASSIGNED after ticket resolution', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'ASSIGNED');
    assert.strictEqual(body.data.currentEmployeeId, 'AAI-10842');
  });

  // 8. Query complaints by asset ID
  await t.test('GET /complaints/asset/:assetId returns all historical tickets for equipment', async () => {
    const res = await fetch(`${baseUrl}/complaints/asset/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 2, 'Should include newly resolved ticket and pre-seeded ticket');
  });

  // 9. RBAC: Employee cannot modify ticket status
  await t.test('PATCH /complaints/:id/status by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/complaints/${newTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ status: 'CLOSED' })
    });
    assert.strictEqual(res.status, 403);
  });
});
