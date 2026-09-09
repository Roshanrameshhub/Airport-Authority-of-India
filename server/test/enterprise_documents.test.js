import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { auditRepository } from '../src/repositories/auditRepository.js';

test('Enterprise Document Generation & RBAC Audit Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire admin and staff employee authentication tokens', async () => {
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

  // 1. Assignment Slip PDF
  await t.test('GET /export/assignment/:assignmentId/pdf generates valid PDF and logs audit', async () => {
    const res = await fetch(`${baseUrl}/export/assignment/AAI-ASG-2024-00002/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_Assignment_AAI-ASG-2024-00002\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    // Verify audit event
    const auditRes = await auditRepository.find({ action: 'ASSIGNMENT_SLIP_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event ASSIGNMENT_SLIP_GENERATED should be logged');
  });

  // 2. Transfer Slip PDF
  await t.test('GET /export/transfer/:assignmentId/pdf generates valid PDF with FROM -> TO structure', async () => {
    const res = await fetch(`${baseUrl}/export/transfer/AAI-ASG-2024-00002/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_Transfer_AAI-ASG-2024-00002\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'TRANSFER_SLIP_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event TRANSFER_SLIP_GENERATED should be logged');
  });

  // 3. Return Receipt PDF
  await t.test('GET /export/return/:assignmentId/pdf generates store return receipt', async () => {
    const res = await fetch(`${baseUrl}/export/return/AAI-ASG-2023-00001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_Return_AAI-ASG-2023-00001\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'RETURN_RECEIPT_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event RETURN_RECEIPT_GENERATED should be logged');
  });

  // 4. Physical Verification Report PDF (Admin only)
  await t.test('GET /export/verification/:campaignId/pdf generates verification audit document', async () => {
    const res = await fetch(`${baseUrl}/export/verification/VCP-2025-001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_Verification_VCP-2025-001\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'VERIFICATION_REPORT_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event VERIFICATION_REPORT_GENERATED should be logged');
  });

  // 5. Verification Report RBAC: Employee forbidden
  await t.test('Employee role cannot download physical verification report (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/export/verification/VCP-2025-001/pdf`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // 6. IT Complaint Service Report PDF
  await t.test('GET /export/complaint/:ticketId/pdf generates IT service & incident report', async () => {
    const res = await fetch(`${baseUrl}/export/complaint/AAI-TKT-2024-0001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_ServiceReport_AAI-TKT-2024-0001\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'COMPLAINT_REPORT_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event COMPLAINT_REPORT_GENERATED should be logged');
  });

  // 7. Asset Retirement Record PDF (Admin only)
  await t.test('GET /export/retirement/:assetId/pdf generates asset retirement record', async () => {
    const res = await fetch(`${baseUrl}/export/retirement/AAI-REG-PC-2024-0001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_Retirement_AAI-REG-PC-2024-0001\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'RETIREMENT_RECORD_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event RETIREMENT_RECORD_GENERATED should be logged');
  });

  // 8. Vendor AMC SLA Agreement Report PDF (Admin only)
  await t.test('GET /export/amc/:contractNumber/pdf generates AMC SLA report', async () => {
    const res = await fetch(`${baseUrl}/export/amc/AAI-AMC-DELL-2024/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /AAI_AMC_AAI-AMC-DELL-2024\.pdf/);

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.subarray(0, 5).toString('ascii'), '%PDF-');

    const auditRes = await auditRepository.find({ action: 'AMC_REPORT_GENERATED' });
    assert.ok(auditRes.items.length > 0, 'Audit event AMC_REPORT_GENERATED should be logged');
  });

  // 9. AMC Report RBAC: Employee forbidden
  await t.test('Employee role cannot download AMC SLA report (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/export/amc/AAI-AMC-DELL-2024/pdf`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 403);
  });
});
