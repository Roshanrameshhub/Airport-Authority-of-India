import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 6 Component Relationships & Assembly Tracking Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire authentication tokens', async () => {
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

  // 1. Query components of parent workstation
  await t.test('GET /relationships/components/:assetId retrieves linked monitor and printer', async () => {
    const res = await fetch(`${baseUrl}/relationships/components/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 2);

    const monitorComp = body.data.find(c => c.componentRole === 'PRIMARY_DISPLAY');
    assert.ok(monitorComp);
    assert.strictEqual(monitorComp.asset.assetId, 'AAI-REG-MON-2024-0005');
  });

  // 2. Query parent of child component
  await t.test('GET /relationships/parent/:assetId retrieves parent PC for monitor', async () => {
    const res = await fetch(`${baseUrl}/relationships/parent/AAI-REG-MON-2024-0005`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
    assert.strictEqual(body.data.asset.assetId, 'AAI-REG-PC-2024-0001');
  });

  // 3. Link new component
  await t.test('POST /relationships/link links UPS to HP EliteDesk tower', async () => {
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-2023-0004',
        childAssetId: 'AAI-REG-UPS-2024-0009',
        relationshipType: 'BACKUP_FOR',
        componentRole: 'POWER_BACKUP',
        notes: 'APC 1500VA UPS providing backup power to admin workstation'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.parentAssetId, 'AAI-REG-PC-2023-0004');
    assert.strictEqual(body.data.childAssetId, 'AAI-REG-UPS-2024-0009');
  });

  // 4. Rejects self-linking
  await t.test('POST /relationships/link rejects linking an asset to itself', async () => {
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-2023-0004',
        childAssetId: 'AAI-REG-PC-2023-0004',
        relationshipType: 'COMPONENT_OF'
      })
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /cannot be linked to itself/);
  });

  // 5. Employee forbidden from linking
  await t.test('POST /relationships/link by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-2023-0004',
        childAssetId: 'AAI-REG-SCN-2023-0010'
      })
    });

    assert.strictEqual(res.status, 403);
  });

  // 6. Unlink component
  await t.test('POST /relationships/unlink deactivates relationship', async () => {
    const res = await fetch(`${baseUrl}/relationships/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-2023-0004',
        childAssetId: 'AAI-REG-UPS-2024-0009',
        reason: 'UPS relocated to server room'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, false);
  });

  // 7. Cascading assignment of workstation and linked display
  await t.test('POST /assignments/assign with cascadeComponents assigns parent and linked child', async () => {
    // Create new parent PC
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-CASCADE-01',
        assetName: 'Cascade Test Workstation',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'OptiPlex 7000',
        serialNumber: 'DL-CASC-PC-01',
        installDate: '2026-01-01',
        warrantyEndDate: '2029-01-01',
        department: 'Information Technology',
        floor: '2nd Floor',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });

    // Create new child Monitor
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'AAI-REG-MON-CASCADE-01',
        assetName: 'Cascade Test Monitor',
        category: 'Monitor',
        make: 'Dell',
        model: 'P2422H',
        serialNumber: 'DL-CASC-MON-01',
        installDate: '2026-01-01',
        warrantyEndDate: '2029-01-01',
        department: 'Information Technology',
        floor: '2nd Floor',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });

    // Link monitor to PC
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'AAI-REG-PC-CASCADE-01',
        childAssetId: 'AAI-REG-MON-CASCADE-01',
        componentRole: 'PRIMARY_DISPLAY'
      })
    });

    // Assign PC with cascadeComponents: true
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-CASCADE-01',
        employeeId: 'AAI-10842',
        cascadeComponents: true
      })
    });
    assert.strictEqual(assignRes.status, 201);

    // Verify parent PC is ASSIGNED to AAI-10842
    const pcRes = await fetch(`${baseUrl}/assets/AAI-REG-PC-CASCADE-01`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pcBody = await pcRes.json();
    assert.strictEqual(pcBody.data.status, 'ASSIGNED');
    assert.strictEqual(pcBody.data.currentEmployeeId, 'AAI-10842');

    // Verify child Monitor was automatically cascaded and is ASSIGNED to AAI-10842
    const monRes = await fetch(`${baseUrl}/assets/AAI-REG-MON-CASCADE-01`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const monBody = await monRes.json();
    assert.strictEqual(monBody.data.status, 'ASSIGNED');
    assert.strictEqual(monBody.data.currentEmployeeId, 'AAI-10842');
  });
});
