import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { assignmentRepository, ASSIGNMENT_SORT_ALLOWLIST } from '../src/repositories/assignmentRepository.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { relationshipRepository } from '../src/repositories/relationshipRepository.js';
import Asset from '../src/models/Asset.js';
import AssetAssignment from '../src/models/AssetAssignment.js';
import AssetRelationship from '../src/models/AssetRelationship.js';

test('Phase 7 — Assignment API Hardening, Pagination, Sort & Cascade Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';
  const testAssetIds = [];
  const testRelationshipIds = [];

  t.after(async () => {
    // Cleanup temporary test assets
    for (const id of testAssetIds) {
      try { await assetRepository.delete(id); } catch (e) {}
    }
    for (const id of testRelationshipIds) {
      try { await relationshipRepository.delete(id); } catch (e) {}
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Asset.deleteMany({ assetId: { $in: testAssetIds } });
        await AssetAssignment.deleteMany({ assetId: { $in: testAssetIds } });
        await AssetRelationship.deleteMany({ parentAssetId: { $in: testAssetIds } });
      } catch (e) {}
    }

    server.close();
  });

  // 1. Authentication Setup
  await t.test('1. Authentication Setup: Acquire Admin and Employee tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(adminRes.status, 200);
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;
    assert.ok(adminToken, 'Admin token acquired');

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    assert.strictEqual(empRes.status, 200);
    const empBody = await empRes.json();
    employeeToken = empBody.data.token;
    assert.ok(employeeToken, 'Employee token acquired');
  });

  // 2. Bounded Pagination Enforcement
  await t.test('2. Bounded Pagination: Default limit, custom limit, and max 100 limit capping', async () => {
    // Default limit should be 25
    const resDefault = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resDefault.status, 200);
    const bodyDefault = await resDefault.json();
    assert.strictEqual(bodyDefault.pagination?.limit, 25, 'Default limit must be 25');

    // Bounded limit: requesting 1000 should be capped at 100
    const resCap = await fetch(`${baseUrl}/assignments?limit=1000`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resCap.status, 200);
    const bodyCap = await resCap.json();
    assert.strictEqual(bodyCap.pagination?.limit, 100, 'Requested limit=1000 must be clamped to 100');

    // Non-numeric limit falls back to default 25
    const resNaN = await fetch(`${baseUrl}/assignments?limit=invalid`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resNaN.status, 200);
    const bodyNaN = await resNaN.json();
    assert.strictEqual(bodyNaN.pagination?.limit, 25, 'Non-numeric limit must fallback to 25');

    // Negative page falls back to 1
    const resNeg = await fetch(`${baseUrl}/assignments?page=-3`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resNeg.status, 200);
    const bodyNeg = await resNeg.json();
    assert.strictEqual(bodyNeg.pagination?.page, 1, 'Negative page must fallback to 1');
  });

  // 3. Sort Allowlist Security & Determinism
  await t.test('3. Sort Security: Sort allowlist enforcement and deterministic ordering', async () => {
    assert.ok(ASSIGNMENT_SORT_ALLOWLIST.includes('assignedDate'));
    assert.ok(ASSIGNMENT_SORT_ALLOWLIST.includes('assetId'));
    assert.ok(ASSIGNMENT_SORT_ALLOWLIST.includes('department'));
    assert.ok(ASSIGNMENT_SORT_ALLOWLIST.includes('status'));

    // Valid sort by assetId asc
    const resAsc = await fetch(`${baseUrl}/assignments?sortBy=assetId&sortOrder=asc&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAsc.status, 200);
    const bodyAsc = await resAsc.json();
    assert.ok(Array.isArray(bodyAsc.data));

    // Injection attempt: invalid sortBy fallback
    const resInjection = await fetch(`${baseUrl}/assignments?sortBy=__proto__&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resInjection.status, 200);
    const bodyInjection = await resInjection.json();
    assert.strictEqual(bodyInjection.success, true, 'Malicious sortBy must safely fall back');
  });

  // 4. Department and Field Filtering
  await t.test('4. Dedicated Filtering: Filter by department and status', async () => {
    const resDept = await fetch(`${baseUrl}/assignments?department=Communication%2C%20Navigation%20%26%20Surveillance&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resDept.status, 200);
    const bodyDept = await resDept.json();
    assert.ok(Array.isArray(bodyDept.data));
    for (const item of bodyDept.data) {
      assert.strictEqual(item.department, 'Communication, Navigation & Surveillance');
    }

    const resStatus = await fetch(`${baseUrl}/assignments?status=ACTIVE&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resStatus.status, 200);
    const bodyStatus = await resStatus.json();
    for (const item of bodyStatus.data) {
      assert.strictEqual(item.status, 'ACTIVE');
    }
  });

  // 5. Assignment Statistics Endpoint
  await t.test('5. Assignment Statistics: GET /api/v1/assignments/stats returns aggregation', async () => {
    const resStats = await fetch(`${baseUrl}/assignments/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resStats.status, 200);
    const bodyStats = await resStats.json();
    assert.strictEqual(bodyStats.success, true);
    assert.ok(typeof bodyStats.data?.total === 'number');
    assert.ok(typeof bodyStats.data?.active === 'number');
    assert.ok(typeof bodyStats.data?.transferred === 'number');
    assert.ok(typeof bodyStats.data?.returned === 'number');
    assert.ok(bodyStats.data.total >= bodyStats.data.active);
  });

  // 6. Cascade Execution in Transfer & Return
  await t.test('6. Cascade Execution: Transfer and Return with cascadeComponents control', async () => {
    const parentId = `AAI-P7-PC-${Date.now()}`;
    const childId = `AAI-P7-MON-${Date.now()}`;
    testAssetIds.push(parentId, childId);

    // Create parent PC
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentId,
        assetName: 'Phase 7 Host PC',
        category: 'Workstation',
        assetType: 'DESKTOP',
        make: 'Dell',
        model: 'OptiPlex 7090',
        serialNumber: `SN-P7-H-${Date.now()}`
      })
    });

    // Create child Monitor
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: childId,
        assetName: 'Phase 7 Display Monitor',
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        serialNumber: `SN-P7-M-${Date.now()}`
      })
    });

    // Link child to parent
    const linkRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentId,
        childAssetId: childId,
        relationshipType: 'COMPONENT_OF',
        componentRole: 'PRIMARY_DISPLAY'
      })
    });
    assert.strictEqual(linkRes.status, 201);
    const linkBody = await linkRes.json();
    testRelationshipIds.push(linkBody.data?._id || linkBody.data?.id);

    // Assign parent with cascadeComponents: true
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentId,
        employeeId: 'AAI-10950',
        cascadeComponents: true
      })
    });
    assert.strictEqual(assignRes.status, 201);

    // Verify both parent and child assigned to AAI-10950
    const parentA = await assetRepository.findById(parentId);
    const childA = await assetRepository.findById(childId);
    assert.strictEqual(parentA.status, 'ASSIGNED');
    assert.strictEqual(parentA.currentEmployeeId, 'AAI-10950');
    assert.strictEqual(childA.status, 'ASSIGNED');
    assert.strictEqual(childA.currentEmployeeId, 'AAI-10950');

    // Transfer parent with cascadeComponents: true to AAI-10842
    const transferRes = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentId,
        toEmployeeId: 'AAI-10842',
        transferReason: 'Phase 7 Cascade Transfer Test',
        cascadeComponents: true
      })
    });
    assert.strictEqual(transferRes.status, 200);

    const parentT = await assetRepository.findById(parentId);
    const childT = await assetRepository.findById(childId);
    assert.strictEqual(parentT.currentEmployeeId, 'AAI-10842');
    assert.strictEqual(childT.currentEmployeeId, 'AAI-10842');

    // Return parent with cascadeComponents: true back to pool
    const returnRes = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentId,
        returnReason: 'Phase 7 Cascade Return Test',
        cascadeComponents: true
      })
    });
    assert.strictEqual(returnRes.status, 200);

    const parentR = await assetRepository.findById(parentId);
    const childR = await assetRepository.findById(childId);
    assert.strictEqual(parentR.status, 'AVAILABLE');
    assert.strictEqual(parentR.currentEmployeeId, null);
    assert.strictEqual(childR.status, 'AVAILABLE');
    assert.strictEqual(childR.currentEmployeeId, null);
  });
});
