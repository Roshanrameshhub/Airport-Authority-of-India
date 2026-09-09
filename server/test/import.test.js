import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';

test('Phase 6 Bulk Excel Import Engine Test Suite', async (t) => {
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

  // 1. Download template
  await t.test('GET /import/template returns downloadable Excel template buffer', async () => {
    const res = await fetch(`${baseUrl}/import/template`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /spreadsheetml/);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'Template buffer must not be empty');

    // Parse returned buffer to verify 13 column headers
    const wb = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    assert.ok(rows.length >= 2, 'Template must have headers and sample rows');
    assert.strictEqual(rows[0][0], 'User Name');
    assert.strictEqual(rows[0][8], 'Serial Number');
  });

  // 2. Reject request without file
  await t.test('POST /import/validate without file returns 400 Bad Request', async () => {
    const formData = new FormData();
    const res = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  let validImportToken = '';

  // 3. Validate valid spreadsheet
  await t.test('POST /import/validate parses and stages valid Excel rows', async () => {
    // Construct test workbook with 3 valid assets
    const headers = [
      'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
      'Asset Name', 'Make / Company', 'Model', 'Serial Number',
      'Install Date', 'Warranty End Date', 'Type of OS', 'Remarks'
    ];
    const data = [
      headers,
      [
        'Roshan R', 'Assistant Manager (CNS)', 'Communication, Navigation & Surveillance',
        '2nd Floor, Technical Block', 'AAI-10842', 'Dell OptiPlex 7000', 'Dell',
        'OptiPlex 7000', 'DL-TST-BULK-001', '2024-02-01', '2027-02-01',
        'Windows 11 Pro', 'Batch import unit 1'
      ],
      [
        'Amit Sharma', 'Junior Executive (ATC)', 'Air Traffic Management',
        '3rd Floor, ATC Tower', 'AAI-10950', 'HP EliteDesk 805', 'HP',
        'EliteDesk 805 G8', 'HP-TST-BULK-002', '2024-03-01', '2027-03-01',
        'Windows 10 Enterprise', 'Batch import unit 2'
      ],
      [
        '', '', 'Information Technology', '2nd Floor, Admin Block', '',
        'APC Smart-UPS 2200VA', 'APC', 'SMT2200I', 'APC-TST-BULK-003',
        '2024-04-10', '2026-04-10', 'N/A', 'Store spare backup unit'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const formData = new FormData();
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'test_valid.xlsx');

    const res = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.validCount, 3);
    assert.strictEqual(body.data.invalidCount, 0);
    assert.ok(body.data.importToken, 'Must generate valid importToken');

    validImportToken = body.data.importToken;
  });

  // 4. Validate spreadsheet with duplicate serials and missing fields
  await t.test('POST /import/validate flags duplicate serials and missing fields as invalid', async () => {
    const headers = [
      'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
      'Asset Name', 'Make', 'Model', 'Serial Number'
    ];
    const data = [
      headers,
      // Missing Make and Model
      ['Staff A', 'Clerk', 'Finance & Accounts', '1st Floor', 'AAI-001', 'Dell PC', '', '', 'DL-DUP-SN-101'],
      // First instance of duplicate
      ['Staff B', 'Officer', 'Commercial', '1st Floor', 'AAI-002', 'Lenovo PC', 'Lenovo', 'M70', 'DUP-INTRA-FILE-999'],
      // Second instance of duplicate within same file
      ['Staff C', 'Engineer', 'Civil Engineering', '1st Floor', 'AAI-003', 'Lenovo PC', 'Lenovo', 'M70', 'DUP-INTRA-FILE-999'],
      // Duplicate against pre-seeded inventory
      ['Staff D', 'Manager', 'Human Resources', '1st Floor', 'AAI-004', 'Dell PC', 'Dell', 'OptiPlex', 'DL-7090-99481']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import_Errors');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const formData = new FormData();
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'test_errors.xlsx');

    const res = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.invalidCount, 3); // Rows with errors
    assert.ok(body.data.invalidRows.some(r => r.errors.some(e => e.includes('Make / Company is required'))));
    assert.ok(body.data.invalidRows.some(r => r.errors.some(e => e.includes('Duplicate Serial Number'))));
    assert.ok(body.data.invalidRows.some(r => r.errors.some(e => e.includes('already exists in database'))));
  });

  // 5. Commit staged import
  await t.test('POST /import/commit commits staged valid assets to inventory', async () => {
    assert.ok(validImportToken, 'Must have valid import token from step 3');

    const res = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken: validImportToken })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.importedCount, 3);

    // Verify imported assets are now queryable in /assets
    const checkRes = await fetch(`${baseUrl}/assets?search=DL-TST-BULK-001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.success, true);
    assert.ok(checkBody.data.length >= 1);
    assert.strictEqual(checkBody.data[0].serialNumber, 'DL-TST-BULK-001');
    assert.strictEqual(checkBody.data[0].currentEmployeeName, 'Roshan R');
  });

  // 6. Anti-replay: cannot commit same token twice
  await t.test('POST /import/commit rejects consumed or expired token', async () => {
    const res = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken: validImportToken })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /invalid or expired/i);
  });

  // 7. RBAC Check: Employee cannot access import endpoints
  await t.test('POST /import/validate by Employee returns 403 Forbidden', async () => {
    const formData = new FormData();
    const res = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formData
    });
    assert.strictEqual(res.status, 403);
  });
});
