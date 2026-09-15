import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { assignmentRepository } from '../src/repositories/assignmentRepository.js';
import { relationshipRepository } from '../src/repositories/relationshipRepository.js';
import { generateAssetIdAsync, generateAssignmentIdAsync } from '../src/utils/idGenerator.js';

test('Phase 16 Production Hardening & Enterprise Integrity Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire authentication credentials', async () => {
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
      body: JSON.stringify({ credential: 'employee01', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;
  });

  await t.test('1. Security: Unauthenticated registration is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'hacker',
        password: 'Password123!',
        email: 'hacker@evil.com',
        name: 'Hacker',
        role: 'ADMIN'
      })
    });
    assert.strictEqual(res.status, 401, 'Should reject unauthenticated registration');
  });

  await t.test('2. Security: Employee role registration is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        username: 'newadmin',
        password: 'Password123!',
        email: 'newadmin@aai.local',
        name: 'New Admin',
        role: 'ADMIN'
      })
    });
    assert.strictEqual(res.status, 403, 'Should forbid employee from registering users');
  });

  await t.test('3. Security / ReDoS: Special characters in search query do not crash server', async () => {
    const maliciousInputs = ['[', '(', '.*', '+', '?', '\\', '[[[', '((((('];
    for (const input of maliciousInputs) {
      const res = await fetch(`${baseUrl}/assets?search=${encodeURIComponent(input)}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, `Search for "${input}" should return 200 without regex crash`);
    }
  });

  await t.test('4. Governance: Direct status overwrite via generic PUT /assets/:id is rejected with 400', async () => {
    // Create test asset
    const createRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Lifecycle Protected PC',
        category: 'Desktop PC',
        make: 'Lenovo',
        model: 'ThinkCentre M70',
        serialNumber: 'SN-LIFECYCLE-991',
        installDate: '2024-01-01',
        warrantyEndDate: '2027-01-01',
        department: 'Information Technology',
        floor: '1st Floor'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createdAsset = (await createRes.json()).data;
    assert.strictEqual(createdAsset.status, 'AVAILABLE');

    // Attempt direct generic update of status
    const updateRes = await fetch(`${baseUrl}/assets/${createdAsset.assetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RETIRED'
      })
    });
    assert.strictEqual(updateRes.status, 400, 'Direct status overwrite should return 400');
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.success, false);
    assert.match(updateBody.message, /Direct status overwrite/);
  });

  await t.test('5. Governance: Dedicated PATCH /assets/:id/lifecycle transitions valid status', async () => {
    const asset = await assetRepository.findBySerialNumber('SN-LIFECYCLE-991');
    assert.ok(asset);

    const patchRes = await fetch(`${baseUrl}/assets/${asset.assetId}/lifecycle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        targetStatus: 'UNDER_MAINTENANCE',
        reason: 'Scheduled radar display calibration',
        remarks: 'Transferred to workshop'
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.success, true);
    assert.strictEqual(patchBody.data.status, 'UNDER_MAINTENANCE');
  });

  await t.test('6. Governance: Invalid lifecycle transition is rejected with 400', async () => {
    const asset = await assetRepository.findBySerialNumber('SN-LIFECYCLE-991');
    assert.strictEqual(asset.status, 'UNDER_MAINTENANCE');

    // Attempt invalid transition: UNDER_MAINTENANCE cannot transition straight to ASSIGNED without becoming AVAILABLE
    const patchRes = await fetch(`${baseUrl}/assets/${asset.assetId}/lifecycle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        targetStatus: 'ASSIGNED',
        reason: 'Illegal transition'
      })
    });
    assert.strictEqual(patchRes.status, 400);
    const patchBody = await patchRes.json();
    assert.match(patchBody.message, /Invalid lifecycle transition/);
  });

  await t.test('7. Data Integrity: Symmetrical Component Cascading across Assign, Transfer, and Return', async () => {
    // 1. Create workstation and monitor
    const parentRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetName: 'Cascade Workstation',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'Precision 3650',
        serialNumber: 'SN-CASCADE-PC-01',
        installDate: '2024-01-01',
        warrantyEndDate: '2027-01-01',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor'
      })
    });
    const parentAsset = (await parentRes.json()).data;

    const childRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetName: 'Cascade Attached Monitor',
        category: 'Monitor',
        make: 'Dell',
        model: 'U2419H',
        serialNumber: 'SN-CASCADE-MON-01',
        installDate: '2024-01-01',
        warrantyEndDate: '2027-01-01',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor'
      })
    });
    const childAsset = (await childRes.json()).data;

    // 2. Link child to parent
    const linkRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentAsset.assetId,
        childAssetId: childAsset.assetId,
        relationshipType: 'ATTACHED_COMPONENT'
      })
    });
    assert.strictEqual(linkRes.status, 201);

    // 3. Assign parent workstation to employee01 (Amit Sharma: AAI-10950) with cascadeComponents
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentAsset.assetId,
        employeeId: 'AAI-10950',
        cascadeComponents: true
      })
    });
    assert.strictEqual(assignRes.status, 201);

    // Verify child was also assigned to AAI-10950
    const childAfterAssign = await assetRepository.findById(childAsset.assetId);
    assert.strictEqual(childAfterAssign.status, 'ASSIGNED');
    assert.strictEqual(childAfterAssign.currentEmployeeId, 'AAI-10950');

    // 4. Transfer parent workstation from AAI-10950 to AAI-10842 (Roshan R)
    const transferRes = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentAsset.assetId,
        toEmployeeId: 'AAI-10842',
        transferReason: 'Cascaded station transfer'
      })
    });
    assert.strictEqual(transferRes.status, 200);

    // Verify child was also transferred to AAI-10842
    const childAfterTransfer = await assetRepository.findById(childAsset.assetId);
    assert.strictEqual(childAfterTransfer.status, 'ASSIGNED');
    assert.strictEqual(childAfterTransfer.currentEmployeeId, 'AAI-10842');

    // 5. Return parent workstation to IT Store
    const returnRes = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentAsset.assetId,
        returnReason: 'Workstation decommissioned to pool'
      })
    });
    assert.strictEqual(returnRes.status, 200);

    // Verify child was also returned to AVAILABLE pool
    const childAfterReturn = await assetRepository.findById(childAsset.assetId);
    assert.strictEqual(childAfterReturn.status, 'AVAILABLE');
    assert.strictEqual(childAfterReturn.currentEmployeeId, null);
  });

  await t.test('8. Concurrency: Atomic sequence generator produces collision-free IDs', async () => {
    const promises = Array.from({ length: 15 }, () => generateAssetIdAsync('PC'));
    const generatedIds = await Promise.all(promises);
    const uniqueIds = new Set(generatedIds);
    assert.strictEqual(uniqueIds.size, 15, 'All concurrently generated Asset IDs must be unique');

    const asgPromises = Array.from({ length: 15 }, () => generateAssignmentIdAsync());
    const generatedAsgIds = await Promise.all(asgPromises);
    const uniqueAsgIds = new Set(generatedAsgIds);
    assert.strictEqual(uniqueAsgIds.size, 15, 'All concurrently generated Assignment IDs must be unique');
  });
});
