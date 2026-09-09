import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';

test('Phase 7 Export and Printable PDF Handover Slips Test Suite', async (t) => {
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

  // 1. Export all assets to Excel
  await t.test('GET /export/assets/excel returns valid Excel file with 13 confirmed fields', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /spreadsheetml/);
    assert.match(res.headers.get('content-disposition'), /AAI_Asset_Inventory/);

    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    assert.ok(rows.length >= 10, 'Should contain headers and seeded inventory rows');
    const headers = rows[0];
    assert.ok(headers.includes('Asset ID'));
    assert.ok(headers.includes('Serial Number'));
    assert.ok(headers.includes('User Name (Custodian)'));
    assert.ok(headers.includes('Department'));
    assert.ok(headers.includes('Floor / Location'));
    assert.ok(headers.includes('Make / Company'));
    assert.ok(headers.includes('Model'));
    assert.ok(headers.includes('Operating System'));
    assert.ok(headers.includes('Warranty End Date'));
  });

  // 2. Export filtered assets to Excel
  await t.test('GET /export/assets/excel?department=Information Technology filters output', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel?department=Information%20Technology`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);

    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    assert.ok(rows.length >= 2, 'Should have header and at least one matching row');
    const deptColIdx = rows[0].indexOf('Department');
    assert.ok(deptColIdx >= 0);

    for (let r = 1; r < rows.length; r++) {
      assert.strictEqual(rows[r][deptColIdx], 'Information Technology');
    }
  });

  // 3. Generate PDF Handover Slip by assignment ID
  await t.test('GET /export/handover/:assignmentId/pdf returns valid PDF document', async () => {
    const res = await fetch(`${baseUrl}/export/handover/AAI-ASG-2024-00002/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500, 'PDF buffer must contain generated content');
    // PDF magic bytes header check '%PDF-'
    const magicHeader = buffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(magicHeader, '%PDF-');
  });

  // 4. Generate PDF Handover Slip by asset ID
  await t.test('GET /export/handover/asset/:assetId/pdf returns PDF for current custody', async () => {
    const res = await fetch(`${baseUrl}/export/handover/asset/AAI-REG-PC-2024-0001/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');

    const buffer = Buffer.from(await res.arrayBuffer());
    const magicHeader = buffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(magicHeader, '%PDF-');
  });

  // 5. Error handling for non-existent assignment
  await t.test('GET /export/handover/:assignmentId/pdf with invalid ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/export/handover/NON-EXISTENT-ID/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  // 6. Employee role authorization
  await t.test('GET /export/handover/:assignmentId/pdf accessible by Employee role', async () => {
    const res = await fetch(`${baseUrl}/export/handover/AAI-ASG-2024-00002/pdf`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  });
});
