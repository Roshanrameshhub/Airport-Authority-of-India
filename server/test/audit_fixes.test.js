import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('Final Release Audit Security & Data-Integrity Hardening Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire Admin and Employee authentication credentials', async () => {
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
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;
  });

  // 1. Employee cannot raise complaint on another custodian's asset
  await t.test('POST /complaints by employee on another custodian\'s asset returns 403 Forbidden', async () => {
    // AAI-REG-LPT-2024-0007 is assigned to Priya Nair (AAI-10512)
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-LPT-2024-0007',
        category: 'HARDWARE_FAULT',
        title: 'Keyboard keys sticky and unresponsive',
        description: 'Several keys on the numeric pad and enter key are intermittently failing.',
        severity: 'MEDIUM'
      })
    });

    assert.strictEqual(res.status, 403, 'Should reject with 403 Forbidden');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Unauthorized/i);
  });

  // 2. Employee can raise complaint on their own assigned asset
  let testTicketId = '';
  await t.test('POST /complaints by employee on own assigned asset succeeds with 201 Created', async () => {
    // AAI-REG-PC-2024-0001 is assigned to Roshan R (AAI-10842)
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        category: 'POWER_UPS',
        title: 'Workstation SMPS fan vibrating loudly',
        description: 'The internal cooling fan produces high-pitched noise after 2 hours of continuous operation.',
        severity: 'MEDIUM'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.ticketId);
    testTicketId = body.data.ticketId;
  });

  // 3. Duplicate active ticket on the same asset and category is rejected
  await t.test('POST /complaints with duplicate category on same asset returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        category: 'POWER_UPS',
        title: 'Second duplicate complaint for SMPS fan',
        description: 'Submitting again because the noise is still occurring.',
        severity: 'MEDIUM'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  // 4. Employee cannot inspect another employee's custody ledger
  await t.test('GET /assignments/employee/:employeeId for another staff member returns 403 Forbidden', async () => {
    // Roshan (AAI-10842) requesting Priya's (AAI-10512) assignments
    const res = await fetch(`${baseUrl}/assignments/employee/AAI-10512`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Unauthorized/i);
  });

  // 5. Employee can inspect their own custody ledger
  await t.test('GET /assignments/employee/:employeeId for self returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/assignments/employee/AAI-10842`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  // 6. Non-admin Employee cannot export bulk organization inventory Excel
  await t.test('GET /export/assets/excel by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });

    assert.strictEqual(res.status, 403);
  });

  // 7. Admin CAN export bulk organization inventory Excel
  await t.test('GET /export/assets/excel by Admin returns 200 OK with XLSX content-type', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  // 8. Admin cannot mark ticket RESOLVED without resolution notes
  await t.test('PATCH /complaints/:id/status to RESOLVED without resolution notes returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolutionNotes: '   ' // empty whitespace
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Resolution notes are mandatory/i);
  });

  // 9. Admin marks ticket RESOLVED with valid resolution notes
  await t.test('PATCH /complaints/:id/status to RESOLVED with valid resolution notes succeeds', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolutionNotes: 'Replaced SMPS exhaust fan with standard 80mm OEM chassis fan. Thermal levels normal.',
        partsReplaced: 'Chassis cooling fan 80mm'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RESOLVED');
  });

  // 10. Admin closes complaint ticket
  await t.test('PATCH /complaints/:id/status to CLOSED succeeds', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'CLOSED',
        resolutionNotes: 'Issue verified resolved by user. Ticket closed.'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'CLOSED');
  });

  // 11. Cannot modify a CLOSED ticket
  await t.test('PATCH /complaints/:id/status on an already CLOSED ticket returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        remarks: 'Attempting invalid reopen'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already CLOSED/i);
  });

  // 12. Asset repository query filtering by employeeId
  await t.test('assetRepository.find filters accurately by employeeId', async () => {
    const res = await assetRepository.find({ employeeId: 'AAI-10842' });
    assert.ok(res.items.length >= 2, 'Should find at least 2 assets for Roshan R');
    res.items.forEach(asset => {
      assert.strictEqual(asset.currentEmployeeId, 'AAI-10842');
    });
  });
});
