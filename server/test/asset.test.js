import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 4 Core Asset Management Test Suite', async (t) => {
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

  // 1. Get Assets & Verify 13 Confirmed Handwritten Fields
  await t.test('GET /assets returns paginated inventory with all 13 confirmed handwritten fields', async () => {
    const res = await fetch(`${baseUrl}/assets?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 10);

    const asset = body.data[0];
    // Verify the 13 confirmed handwritten spec fields
    assert.ok('currentEmployeeName' in asset, 'User Name must exist');
    assert.ok('currentDesignation' in asset, 'Designation must exist');
    assert.ok('department' in asset, 'Department must exist');
    assert.ok('floor' in asset, 'Floor must exist');
    assert.ok('currentEmployeeId' in asset, 'Employee ID must exist');
    assert.ok('assetName' in asset, 'Asset Name must exist');
    assert.ok('make' in asset, 'Make must exist');
    assert.ok('model' in asset, 'Model must exist');
    assert.ok('serialNumber' in asset, 'Serial Number must exist');
    assert.ok('installDate' in asset, 'Install Date must exist');
    assert.ok('warrantyEndDate' in asset, 'Warranty of Asset must exist');
    assert.ok('operatingSystem' in asset, 'Type of OS must exist');
    assert.ok('osVersion' in asset, 'OS Version must exist');
    assert.ok('remarks' in asset, 'Remarks must exist');

    // Verify system fields
    assert.ok(asset.assetId, 'Asset ID must exist');
    assert.ok(asset.status, 'Status must exist');
    assert.ok(asset.warrantyStatus, 'Derived Warranty Status must exist');
  });

  // 2. Filter by Category
  await t.test('GET /assets?category=Laptop filters only laptops', async () => {
    const res = await fetch(`${baseUrl}/assets?category=Laptop`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
    assert.ok(body.data.every(a => a.category === 'Laptop'));
  });

  // 3. Filter by Status
  await t.test('GET /assets?status=UNDER_MAINTENANCE filters maintenance items', async () => {
    const res = await fetch(`${baseUrl}/assets?status=UNDER_MAINTENANCE`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.every(a => a.status === 'UNDER_MAINTENANCE'));
  });

  // 4. Dynamic Warranty Status Filter
  await t.test('GET /assets?warrantyStatus=EXPIRING_SOON derives expiring equipment', async () => {
    const res = await fetch(`${baseUrl}/assets?warrantyStatus=EXPIRING_SOON`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.some(a => a.assetId === 'AAI-REG-PRT-2023-0003'));
  });

  // 5. Search by Asset Name
  await t.test('GET /assets?search=OptiPlex performs instant text search', async () => {
    const res = await fetch(`${baseUrl}/assets?search=OptiPlex`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.some(a => a.model.includes('OptiPlex')));
  });

  // 6. Search by Serial Number
  await t.test('GET /assets?search=DL-5420 locates equipment by OEM serial', async () => {
    const res = await fetch(`${baseUrl}/assets?search=DL-5420`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data[0].serialNumber, 'DL-5420-99482');
  });

  // 7. Search by Employee Custodian
  await t.test('GET /assets?search=Roshan locates assets held by staff member', async () => {
    const res = await fetch(`${baseUrl}/assets?search=Roshan`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 3);
    assert.ok(body.data.every(a => a.currentEmployeeName === 'Roshan R'));
  });

  // 8. Get Single Asset by ID
  await t.test('GET /assets/:id returns complete asset specification', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, 'AAI-REG-PC-2024-0001');
    assert.strictEqual(body.data.make, 'Dell');
  });

  // 9. Create Asset with Explicit Asset ID & All 13 Fields
  await t.test('POST /assets creates new asset with all 13 confirmed fields', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2026-9001',
        assetName: 'HP Z4 G5 Workstation',
        category: 'Desktop PC',
        make: 'HP',
        model: 'Z4 G5 Tower',
        serialNumber: 'HP-Z4-998811',
        installDate: '2026-02-01',
        warrantyStartDate: '2026-02-01',
        warrantyEndDate: '2029-02-01',
        operatingSystem: 'Red Hat Enterprise Linux',
        osVersion: '9.4 Workstation',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        remarks: 'High-performance radar simulation graphics unit',
        status: 'AVAILABLE',
        condition: 'EXCELLENT'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, 'AAI-REG-PC-2026-9001');
    assert.strictEqual(body.data.operatingSystem, 'Red Hat Enterprise Linux');
    assert.strictEqual(body.data.warrantyStatus, 'ACTIVE');
  });

  // 10. Auto-Generate Asset ID when not supplied
  await t.test('POST /assets auto-generates Asset ID when omitted', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'APC Smart-UPS 2200VA',
        category: 'UPS',
        make: 'APC',
        model: 'SMT2200I',
        serialNumber: 'APC-2200-8812',
        installDate: '2026-01-10',
        warrantyEndDate: '2028-01-10',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.data.assetId, /^AAI-REG-UPS-\d{4}-\d{4}$/);
  });

  // 11. Duplicate Serial Number Collision
  await t.test('POST /assets with duplicate serial number returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Duplicate Serial Machine',
        category: 'Laptop',
        make: 'Dell',
        model: 'Latitude',
        serialNumber: 'DL-5420-99482', // Existing serial
        installDate: '2026-01-01',
        warrantyEndDate: '2028-01-01',
        department: 'IT',
        floor: '1st Floor'
      })
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/);
  });

  // 12. Non-Admin Registration Forbidden
  await t.test('POST /assets by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        assetName: 'Unauthorized Asset',
        category: 'Laptop',
        make: 'Dell',
        model: 'Latitude',
        serialNumber: 'UNAUTH-SN-999',
        installDate: '2026-01-01',
        warrantyEndDate: '2028-01-01',
        department: 'IT',
        floor: '1st Floor'
      })
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 13. Update Asset
  await t.test('PUT /assets/:id updates condition and remarks', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2026-9001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        condition: 'GOOD',
        remarks: 'Updated after quarterly preventive check'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.condition, 'GOOD');
    assert.strictEqual(body.data.remarks, 'Updated after quarterly preventive check');
  });

  // 14. Retire Asset
  await t.test('PATCH /assets/:id/retire decommissions asset with audit reason', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2026-9001/retire`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        reason: 'Replaced by next-gen simulation cluster'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RETIRED');
    assert.match(body.data.remarks, /Replaced by next-gen/);
  });
});
