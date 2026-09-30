import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import Asset from '../src/models/Asset.js';

test('Phase 3 — Asset Detail & Edit Alignment Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire admin and employee tokens
  await t.test('Acquire authentication tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(adminRes.status, 200);
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;
    assert.ok(adminToken);

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee01', password: 'Employee@123' })
    });
    assert.strictEqual(empRes.status, 200);
    const empBody = await empRes.json();
    employeeToken = empBody.data.token;
    assert.ok(employeeToken);
  });

  // 1. View common asset fields
  await t.test('1. View common asset fields via GET /assets/:id', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const asset = body.data;
    assert.strictEqual(asset.assetId, 'AAI-REG-PC-2024-0001');
    assert.ok(asset.make);
    assert.ok(asset.model);
    assert.ok(asset.category);
    assert.ok(asset.assetType);
    assert.ok(asset.serialNumber);
    assert.ok(asset.status);
    assert.ok(asset.condition);
  });

  // 2. View category-specific fields: Computer Configuration
  await t.test('2. View computerConfig on compute equipment', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    const asset = body.data;
    assert.ok(asset.computerConfig);
    assert.ok(asset.computerConfig.processor);
    assert.ok(asset.computerConfig.ramSizeGb);
    assert.ok(asset.computerConfig.storageCapacityGb);
  });

  // 3. View powerConfig on Power assets
  await t.test('3. View powerConfig on UPS equipment', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    const asset = body.data;
    assert.ok(asset.powerConfig);
    assert.strictEqual(asset.assetType, 'UPS');
    assert.ok(asset.powerConfig.capacityVa);
    assert.ok(asset.powerConfig.topology);
  });

  // 4. View networkConfig on Network assets
  await t.test('4. View networkConfig on Network equipment', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    const asset = body.data;
    assert.ok(asset.networkConfig);
    assert.ok(asset.networkConfig.ipAddress);
    assert.ok(asset.networkConfig.macAddress);
  });

  // 5. Create category-aware asset with specifications & verify persistence
  let createdMonitorId = '';
  await t.test('5. Create asset with category-specific specifications and retrieve it', async () => {
    const payload = {
      assetId: 'AAI-P3-MON-001',
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Dell',
      model: 'UltraSharp U2422H',
      technology: 'IPS LED',
      serialNumber: 'SN-P3-MON-001',
      installDate: '2025-02-01',
      warrantyEndDate: '2028-02-01',
      supplier: 'Dell India',
      supplyOrderNumber: 'PO-DEL-2025-01',
      amcApplicable: false,
      displayConfig: {
        screenSizeInches: 23.8,
        resolution: '1920x1080',
        panelType: 'IPS'
      },
      specifications: {
        data: 'DisplayPort 1.4 Cable'
      }
    };

    const postRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(postRes.status, 201);
    const postBody = await postRes.json();
    createdMonitorId = postBody.data.assetId;
    assert.strictEqual(createdMonitorId, 'AAI-P3-MON-001');

    // Retrieve and verify
    const getRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.data.specifications?.data, 'DisplayPort 1.4 Cable');
    assert.strictEqual(getBody.data.displayConfig?.panelType, 'IPS');
  });

  // 6. Edit existing asset via PUT /assets/:id
  await t.test('6. Edit existing asset specifications safely via PUT /assets/:id', async () => {
    const updatePayload = {
      model: 'UltraSharp U2422HE (Hub Edition)',
      technology: 'IPS Black',
      specifications: {
        data: 'USB-C to DisplayPort 1.4 Cable',
        panelGrade: 'A+'
      },
      displayConfig: {
        screenSizeInches: 24,
        resolution: '1920x1080',
        panelType: 'IPS Black'
      },
      remarks: 'Updated monitor panel configuration during Phase 3 QA'
    };

    const putRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(updatePayload)
    });
    assert.strictEqual(putRes.status, 200);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.success, true);
    assert.strictEqual(putBody.data.model, 'UltraSharp U2422HE (Hub Edition)');
    assert.strictEqual(putBody.data.technology, 'IPS Black');
    assert.strictEqual(putBody.data.specifications?.data, 'USB-C to DisplayPort 1.4 Cable');
    assert.strictEqual(putBody.data.specifications?.panelGrade, 'A+');
    assert.strictEqual(putBody.data.displayConfig?.panelType, 'IPS Black');
    assert.strictEqual(putBody.data.remarks, 'Updated monitor panel configuration during Phase 3 QA');
  });

  // 7. Immutability of Asset ID
  await t.test('7. Asset ID is not altered when editing an asset', async () => {
    const updateWithNewId = {
      assetId: 'ATTEMPT-TO-OVERWRITE-ID',
      model: 'UltraSharp U2422HE'
    };

    const putRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(updateWithNewId)
    });
    // Even if sent, the assetId query param remains the identifier
    const getRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getBody = await getRes.json();
    assert.strictEqual(getBody.data.assetId, createdMonitorId);
  });

  // 8. Laptop MSE creation and LAP ID in specifications
  let createdLaptopMseId = '';
  await t.test('8. Laptop MSE retains parent LAP ID in specifications and user in employee name', async () => {
    const msePayload = {
      assetId: 'AAI-P3-MSE-001',
      category: 'Laptop MSE',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'M90 Optical Mouse',
      serialNumber: 'SN-P3-MSE-001',
      currentEmployeeName: 'K. V. Ramanathan',
      specifications: {
        parentLaptopId: 'AAI-REG-LAP-2024-0003'
      },
      remarks: 'Allocated with laptop'
    };

    const postRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(msePayload)
    });
    assert.strictEqual(postRes.status, 201);
    const postBody = await postRes.json();
    createdLaptopMseId = postBody.data.assetId;

    const getRes = await fetch(`${baseUrl}/assets/${createdLaptopMseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getBody = await getRes.json();
    assert.strictEqual(getBody.data.specifications?.parentLaptopId, 'AAI-REG-LAP-2024-0003');
    assert.strictEqual(getBody.data.currentEmployeeName, 'K. V. Ramanathan');

    // Update parent laptop ID
    const putRes = await fetch(`${baseUrl}/assets/${createdLaptopMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: {
          parentLaptopId: 'AAI-REG-LAP-2024-0099'
        },
        currentEmployeeName: 'Dr. S. Radhakrishnan'
      })
    });
    assert.strictEqual(putRes.status, 200);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.data.specifications?.parentLaptopId, 'AAI-REG-LAP-2024-0099');
    assert.strictEqual(putBody.data.currentEmployeeName, 'Dr. S. Radhakrishnan');
  });

  // 9. Rejection of duplicate serial number on update
  await t.test('9. Rejection of duplicate serial number on update', async () => {
    // Attempt to set monitor serial number to an existing asset's serial number
    const duplicateRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        serialNumber: 'DL-7090-99481' // Serial of seeded asset AAI-REG-PC-2024-0001
      })
    });
    // Should be rejected by duplicate check or MongoDB unique index
    assert.ok(duplicateRes.status === 400 || duplicateRes.status === 409 || duplicateRes.status === 500);
  });

  // 10. Direct status overwrite via generic update is forbidden
  await t.test('10. Direct status overwrite via generic update is rejected with 400', async () => {
    const invalidStatusRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'ASSIGNED' // Direct change from AVAILABLE to ASSIGNED without assignment operation
      })
    });
    assert.strictEqual(invalidStatusRes.status, 400);
    const body = await invalidStatusRes.json();
    assert.ok(body.message.includes('Direct status overwrite'));
  });

  // 11. Role governance: Employee cannot edit asset
  await t.test('11. Employee role cannot edit asset specifications (403 Forbidden)', async () => {
    const empEditRes = await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({ model: 'Hacked Model' })
    });
    assert.strictEqual(empEditRes.status, 403);
  });

  // 12. Cleanup created test records
  await t.test('12. Clean up test assets', async () => {
    if (createdMonitorId) {
      await fetch(`${baseUrl}/assets/${createdMonitorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (createdLaptopMseId) {
      await fetch(`${baseUrl}/assets/${createdLaptopMseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  });

});
