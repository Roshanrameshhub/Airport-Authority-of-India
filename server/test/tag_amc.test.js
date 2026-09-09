import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 11 Physical Asset Tagging (QR/Barcode) & Vendor AMC Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';
  const testAssetId = 'AAI-REG-PC-2024-0001';
  const testSerial = 'DL-7090-99481';

  t.after(() => {
    server.close();
  });

  // Setup: Acquire Authentication Tokens
  await t.test('Acquire authentication tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    assert.ok(adminToken);

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empData = await empRes.json();
    employeeToken = empData.data.token;
    assert.ok(employeeToken);
  });

  // 1. QR Code Data URL & SVG Generation
  await t.test('GET /tags/asset/:id/qr returns Base64 PNG data URL and SVG payload', async () => {
    const res = await fetch(`${baseUrl}/tags/asset/${testAssetId}/qr`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, testAssetId);
    assert.ok(body.data.qrDataUrl.startsWith('data:image/png;base64,'));
    assert.ok(body.data.qrSvg.includes('<svg'));
    assert.strictEqual(body.data.payload.assetId, testAssetId);
    assert.strictEqual(body.data.payload.serialNumber, testSerial);
  });

  // 2. Reject QR Code for non-existent asset
  await t.test('GET /tags/asset/:id/qr returns 404 for unknown asset', async () => {
    const res = await fetch(`${baseUrl}/tags/asset/NON-EXISTENT-999/qr`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  // 3. Single Asset Label PDF Generation
  await t.test('GET /tags/asset/:id/pdf generates printable 4x2 sticker label PDF stream', async () => {
    const res = await fetch(`${baseUrl}/tags/asset/${testAssetId}/pdf`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /pdf/);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'Label PDF buffer must not be empty');
  });

  // 4. Batch Asset Tag Sheet PDF Generation
  await t.test('POST /tags/batch/pdf generates multi-asset sticker sheet PDF', async () => {
    const res = await fetch(`${baseUrl}/tags/batch/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetIds: [testAssetId, 'AAI-REG-LAP-2024-0002']
      })
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /pdf/);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 2000, 'Batch sheet PDF must contain multiple asset tags');
  });

  // 5. Batch Tag RBAC: Employee blocked
  await t.test('POST /tags/batch/pdf by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/tags/batch/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ assetIds: [testAssetId] })
    });
    assert.strictEqual(res.status, 403);
  });

  // 6. Rapid Floor Audit Verification by Asset ID
  await t.test('GET /tags/verify/:identifier verifies equipment by Asset ID', async () => {
    const res = await fetch(`${baseUrl}/tags/verify/${testAssetId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.verified, true);
    assert.strictEqual(body.data.asset.assetId, testAssetId);
    assert.strictEqual(body.data.asset.serialNumber, testSerial);
  });

  // 7. Rapid Floor Audit Verification by Serial Number
  await t.test('GET /tags/verify/:identifier verifies equipment by Serial Number', async () => {
    const res = await fetch(`${baseUrl}/tags/verify/${testSerial}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.verified, true);
    assert.strictEqual(body.data.asset.assetId, testAssetId);
  });

  // 8. Reject scan verification on unregistered serial
  await t.test('GET /tags/verify/:identifier returns 404 for unknown serial', async () => {
    const res = await fetch(`${baseUrl}/tags/verify/UNKNOWN-SERIAL-404`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  // 9. List Vendor AMC Contracts
  await t.test('GET /amc returns list of vendor maintenance contracts with status', async () => {
    const res = await fetch(`${baseUrl}/amc`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2, 'Should contain seeded AMC contracts');
    const dellContract = body.data.find(c => c.contractNumber === 'AAI-AMC-DELL-2024');
    assert.ok(dellContract);
    assert.strictEqual(dellContract.supportTier, '24x7_CRITICAL_4HR');
  });

  // 10. Query AMC Renewal Alerts Queue
  await t.test('GET /amc/alerts returns contracts expiring within 30 days or expired', async () => {
    const res = await fetch(`${baseUrl}/amc/alerts`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 1, 'Must contain at least one alert for expiring/expired AMC');
    const hasExpiringOrExpired = body.data.every(c => c.status === 'EXPIRING_SOON' || c.status === 'EXPIRED');
    assert.strictEqual(hasExpiringOrExpired, true);
  });

  // 11. Create Vendor AMC Contract
  await t.test('POST /amc creates new maintenance agreement and logs audit trail', async () => {
    const amcPayload = {
      contractNumber: 'AAI-AMC-CISCO-RADAR-2024',
      vendorName: 'Cisco Systems India Pvt Ltd',
      serviceType: 'NETWORK_MAINTENANCE',
      startDate: '2024-01-01',
      endDate: '2027-12-31',
      supportTier: '24x7_CRITICAL_4HR',
      contactPerson: 'Vikram Sethi',
      contactPhone: '+91 1800 553 2447',
      contactEmail: 'aai.cisco@cisco.com',
      coveredCategories: ['Core Network Switch / Router'],
      annualCostINR: 650000,
      remarks: 'Primary surveillance radar backbone network SLA'
    };

    const res = await fetch(`${baseUrl}/amc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(amcPayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.contractNumber, 'AAI-AMC-CISCO-RADAR-2024');
    assert.strictEqual(body.data.status, 'ACTIVE');
  });

  // 12. Prevent Duplicate AMC Contract Number
  await t.test('POST /amc rejects duplicate contract number with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/amc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        contractNumber: 'AAI-AMC-CISCO-RADAR-2024',
        vendorName: 'Duplicate Vendor',
        startDate: '2024-01-01',
        endDate: '2025-01-01'
      })
    });
    assert.strictEqual(res.status, 409);
  });

  // 13. AMC RBAC: Employee blocked
  await t.test('POST /amc by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/amc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        contractNumber: 'AAI-AMC-EMP-FAIL',
        vendorName: 'Unauthorized Vendor',
        startDate: '2024-01-01',
        endDate: '2025-01-01'
      })
    });
    assert.strictEqual(res.status, 403);
  });
});
