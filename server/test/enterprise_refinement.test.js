import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { auditRepository } from '../src/repositories/auditRepository.js';

test('Enterprise Refinement: Audit Integrity, PDF RBAC & Physical Verification Suite', async (t) => {
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

  // 1. Employee change audit trail with diff tracking
  await t.test('Employee update records EMPLOYEE_UPDATED audit log with old and new values', async () => {
    const updateRes = await fetch(`${baseUrl}/employees/AAI-10842`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        department: 'Airport Systems & Information Technology',
        floor: '1st Floor, Technical Block'
      })
    });
    assert.strictEqual(updateRes.status, 200);

    // Verify audit record was created
    const auditRes = await fetch(`${baseUrl}/audit-logs?entityType=EMPLOYEE&action=EMPLOYEE_UPDATED&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const auditBody = await auditRes.json();
    assert.strictEqual(auditRes.status, 200);
    const empLogs = auditBody.data.items || auditBody.data;
    const match = empLogs.find(l => l.entityId === 'AAI-10842' && l.action === 'EMPLOYEE_UPDATED');
    assert.ok(match, 'Must have recorded EMPLOYEE_UPDATED in audit trail');
    assert.ok(match.details.changes, 'Must record field-level diffs in details');
  });

  // 2. Handover PDF Download RBAC: Employee cannot download another employee's slip
  await t.test('GET /export/handover/:assignmentId/pdf rejects employee downloading another custodian\'s slip with 403', async () => {
    // AAI-ASG-2023-00001 belongs to Amit Sharma (AAI-10950)
    const res = await fetch(`${baseUrl}/export/handover/AAI-ASG-2023-00001/pdf`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 403, 'Should reject other employee with 403 Forbidden');
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 3. Handover PDF Download: Admin can download handover slip
  await t.test('GET /export/handover/:assignmentId/pdf allows Admin to download and logs PDF_GENERATED audit', async () => {
    const res = await fetch(`${baseUrl}/export/handover/AAI-ASG-2023-00001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');

    // Check audit log
    const auditRes = await fetch(`${baseUrl}/audit-logs?action=PDF_GENERATED&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const auditBody = await auditRes.json();
    const pdfLogs = auditBody.data.items || auditBody.data;
    assert.ok(pdfLogs.some(l => l.action === 'PDF_GENERATED'), 'Must record PDF_GENERATED event');
  });

  // 4. Physical Verification Campaign Workflow
  let campaignId = '';
  await t.test('Physical Verification: Admin launches verification campaign', async () => {
    const res = await fetch(`${baseUrl}/verification/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'CNS Annual Equipment Audit FY 2025-26',
        financialYear: '2025-26',
        department: 'Communication, Navigation & Surveillance',
        notes: 'Annual mandatory institutional audit'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.campaignId);
    campaignId = body.data.campaignId;
  });

  await t.test('Physical Verification: Admin records asset verification and discrepancy', async () => {
    const res = await fetch(`${baseUrl}/verification/campaigns/${campaignId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2024-0001',
        observedLocation: '2nd Floor, Technical Block, Cabin 201',
        observedCondition: 'EXCELLENT',
        result: 'VERIFIED',
        remarks: 'Physical inspection completed'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.record.result, 'VERIFIED');
  });

  await t.test('Physical Verification: Admin finalizes campaign and discrepancy report', async () => {
    const res = await fetch(`${baseUrl}/verification/campaigns/${campaignId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'FINALIZED');
  });

  // 5. Audit Summary contains meaningful operational categories
  await t.test('GET /audit-logs/summary returns structured operational metric categories', async () => {
    const res = await fetch(`${baseUrl}/audit-logs/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.categories, 'Must include operational categories breakdown');
    assert.ok(typeof body.data.categories.totalEvents === 'number');
    assert.ok(typeof body.data.categories.custodyEvents === 'number');
    assert.ok(typeof body.data.categories.employeeChanges === 'number');
    assert.ok(typeof body.data.categories.dataOperations === 'number');
  });
});
