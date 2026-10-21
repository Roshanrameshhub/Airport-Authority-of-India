import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Asset from '../src/models/Asset.js';
import AssetRelationship from '../src/models/AssetRelationship.js';
import AssetAssignment from '../src/models/AssetAssignment.js';
import AuditLog from '../src/models/AuditLog.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { relationshipRepository } from '../src/repositories/relationshipRepository.js';
import { assignmentRepository } from '../src/repositories/assignmentRepository.js';
import { auditRepository } from '../src/repositories/auditRepository.js';

test('Phase 4C — Peripheral Relationship & Custody/Transfer Integration Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  const createdAssetIds = [];

  t.after(async () => {
    // Teardown: Clean up all created test assets, relationships, and assignments
    for (const id of createdAssetIds) {
      try {
        await (assetRepository.hardDelete ? assetRepository.hardDelete(id) : assetRepository.delete(id));
      } catch (e) {}
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Asset.deleteMany({ assetId: { $in: createdAssetIds } });
        await AssetRelationship.deleteMany({
          $or: [
            { parentAssetId: { $in: createdAssetIds } },
            { childAssetId: { $in: createdAssetIds } }
          ]
        });
        await AssetAssignment.deleteMany({ assetId: { $in: createdAssetIds } });
        await AuditLog.deleteMany({ entityId: { $in: createdAssetIds } });
      } catch (e) {}
    }

    server.close();
  });

  // Step 0: Acquire admin authentication token
  await t.test('Acquire admin authentication token', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(adminRes.status, 200);
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;
    assert.ok(adminToken, 'Admin token should be acquired');
  });

  // Test assets
  const parentLapId = 'AAI-P4C-LAP-TEST';
  const childMseId = 'AAI-P4C-MSE-TEST';
  const childKbdId = 'AAI-P4C-KBD-TEST';
  const unrelatedAssetId = 'AAI-P4C-UNREL-TEST';
  const connAssetId = 'AAI-P4C-CONN-TEST';
  const bkpAssetId = 'AAI-P4C-BKP-TEST';
  const compParentId = 'AAI-P4C-COMP-PC-TEST';
  const compChildId = 'AAI-P4C-COMP-MON-TEST';

  createdAssetIds.push(
    parentLapId,
    childMseId,
    childKbdId,
    unrelatedAssetId,
    connAssetId,
    bkpAssetId,
    compParentId,
    compChildId
  );

  // 1. Create parent Laptop
  await t.test('1. Create parent Laptop', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        assetName: 'Phase 4C Test Parent Laptop',
        category: 'Laptop',
        make: 'Dell',
        model: 'Latitude 5430',
        serialNumber: 'SN-P4C-LAP-001',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'EXCELLENT'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, parentLapId);
    assert.strictEqual(body.data.status, 'AVAILABLE');
  });

  // 2. Create Laptop MSE
  await t.test('2. Create Laptop MSE', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: childMseId,
        assetName: 'Phase 4C Test Laptop MSE',
        category: 'Laptop MSE',
        make: 'Dell',
        model: 'MS116 Optical Mouse',
        serialNumber: 'SN-P4C-MSE-001',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, childMseId);
    assert.strictEqual(body.data.status, 'AVAILABLE');
  });

  // 3. Create PERIPHERAL_OF relationship
  await t.test('3. Create PERIPHERAL_OF relationship', async () => {
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentLapId,
        childAssetId: childMseId,
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE',
        notes: 'Phase 4C standard mouse accessory'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.parentAssetId, parentLapId);
    assert.strictEqual(body.data.childAssetId, childMseId);
    assert.strictEqual(body.data.relationshipType, 'PERIPHERAL_OF');
    assert.strictEqual(body.data.componentRole, 'MOUSE');
    assert.strictEqual(body.data.isActive, true);
  });

  // 4. Assign Laptop to Employee A (AAI-10950)
  await t.test('4. Assign Laptop to Employee A', async () => {
    const res = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        employeeId: 'AAI-10950',
        condition: 'EXCELLENT',
        transferReason: 'Phase 4C Assignment to Amit Sharma'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 5. Verify Laptop custodian = Employee A
  await t.test('5. Verify Laptop custodian = Employee A', async () => {
    const asset = await assetRepository.findById(parentLapId);
    assert.strictEqual(asset.status, 'ASSIGNED');
    assert.strictEqual(asset.currentEmployeeId, 'AAI-10950');
  });

  // 6. Verify Laptop MSE custodian = Employee A
  await t.test('6. Verify Laptop MSE custodian = Employee A', async () => {
    const childAsset = await assetRepository.findById(childMseId);
    assert.strictEqual(childAsset.status, 'ASSIGNED', 'Laptop MSE status must be ASSIGNED');
    assert.strictEqual(childAsset.currentEmployeeId, 'AAI-10950', 'Laptop MSE custodian must be Employee A');
  });

  // 7. Verify child assignment record exists
  await t.test('7. Verify child assignment record exists for cascaded child', async () => {
    const childAsg = await assignmentRepository.findCurrentAssignment(childMseId);
    assert.ok(childAsg, 'Child assignment record must exist');
    assert.strictEqual(childAsg.assetId, childMseId);
    assert.strictEqual(childAsg.employeeId, 'AAI-10950');
    assert.strictEqual(childAsg.status, 'ACTIVE');
  });

  // 8. Transfer Laptop A -> B (AAI-10842)
  await t.test('8. Transfer Laptop A -> B', async () => {
    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        toEmployeeId: 'AAI-10842',
        transferReason: 'Phase 4C Transfer to Roshan R',
        conditionAtReturn: 'EXCELLENT',
        conditionAtNewAssignment: 'EXCELLENT'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 9. Verify Laptop = B
  await t.test('9. Verify Laptop = Employee B', async () => {
    const asset = await assetRepository.findById(parentLapId);
    assert.strictEqual(asset.status, 'ASSIGNED');
    assert.strictEqual(asset.currentEmployeeId, 'AAI-10842');
  });

  // 10. Verify Laptop MSE = B
  await t.test('10. Verify Laptop MSE = Employee B', async () => {
    const childAsset = await assetRepository.findById(childMseId);
    assert.strictEqual(childAsset.status, 'ASSIGNED');
    assert.strictEqual(childAsset.currentEmployeeId, 'AAI-10842', 'Laptop MSE custodian must be updated to Employee B');
  });

  // 11. Verify historical assignment remains
  await t.test('11. Verify historical assignment remains intact', async () => {
    const history = await assignmentRepository.findHistoryByAsset(childMseId);
    assert.strictEqual(history.length, 2, 'Child should have 2 historical assignment records (previous + current)');
    const prev = history.find(h => h.status === 'TRANSFERRED');
    const curr = history.find(h => h.status === 'ACTIVE');
    assert.ok(prev, 'Previous transferred assignment must exist');
    assert.strictEqual(prev.employeeId, 'AAI-10950');
    assert.ok(curr, 'Current active assignment must exist');
    assert.strictEqual(curr.employeeId, 'AAI-10842');
  });

  // 12. Verify relationship remains active after transfer
  await t.test('12. Verify relationship remains active after transfer', async () => {
    const rel = await relationshipRepository.findParent(childMseId);
    assert.ok(rel, 'Relationship must exist');
    assert.strictEqual(rel.asset.assetId, parentLapId);
    assert.strictEqual(rel.relationshipType, 'PERIPHERAL_OF');
  });

  // 13. Return Laptop
  await t.test('13. Return Laptop to IT Store Pool', async () => {
    const res = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        returnReason: 'Phase 4C Return to IT inventory pool',
        conditionAtReturn: 'GOOD'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 14. Verify Laptop follows existing return semantics
  await t.test('14. Verify Laptop follows existing return semantics', async () => {
    const asset = await assetRepository.findById(parentLapId);
    assert.strictEqual(asset.status, 'AVAILABLE');
    assert.strictEqual(asset.currentEmployeeId, null);
  });

  // 15. Verify Laptop MSE follows corresponding return semantics
  await t.test('15. Verify Laptop MSE follows corresponding return semantics', async () => {
    const childAsset = await assetRepository.findById(childMseId);
    assert.strictEqual(childAsset.status, 'AVAILABLE', 'Child status must return to AVAILABLE');
    assert.strictEqual(childAsset.currentEmployeeId, null, 'Child currentEmployeeId must be null');
    const curr = await assignmentRepository.findCurrentAssignment(childMseId);
    assert.strictEqual(curr, null, 'Child should have no ACTIVE assignment after return');
  });

  // 16. Verify relationship remains active after return
  await t.test('16. Verify relationship remains active after return', async () => {
    const rel = await relationshipRepository.findParent(childMseId);
    assert.ok(rel, 'Relationship must still exist and be active');
    assert.strictEqual(rel.asset.assetId, parentLapId);
  });

  // 17. Create a second peripheral
  await t.test('17. Create a second peripheral (Keyboard)', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: childKbdId,
        assetName: 'Phase 4C Test Keyboard',
        category: 'Peripherals',
        make: 'Dell',
        model: 'KB216 Wired Keyboard',
        serialNumber: 'SN-P4C-KBD-001',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(res.status, 201);

    const linkRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentLapId,
        childAssetId: childKbdId,
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'KEYBOARD'
      })
    });
    assert.strictEqual(linkRes.status, 201);
  });

  // 18. Verify multiple eligible peripherals cascade
  await t.test('18. Verify multiple eligible peripherals cascade simultaneously', async () => {
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        employeeId: 'AAI-10950',
        condition: 'GOOD',
        transferReason: 'Multi-peripheral assignment test'
      })
    });
    assert.strictEqual(assignRes.status, 201);

    const mse = await assetRepository.findById(childMseId);
    const kbd = await assetRepository.findById(childKbdId);

    assert.strictEqual(mse.status, 'ASSIGNED');
    assert.strictEqual(mse.currentEmployeeId, 'AAI-10950');
    assert.strictEqual(kbd.status, 'ASSIGNED');
    assert.strictEqual(kbd.currentEmployeeId, 'AAI-10950');
  });

  // 19. Verify unrelated asset does NOT change
  await t.test('19. Verify unrelated asset does NOT change', async () => {
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: unrelatedAssetId,
        assetName: 'Phase 4C Unrelated Standalone Asset',
        category: 'Peripherals',
        make: 'HP',
        model: 'LaserJet 1020',
        serialNumber: 'SN-P4C-UNREL-001',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'GOOD'
      })
    });

    const unrelated = await assetRepository.findById(unrelatedAssetId);
    assert.strictEqual(unrelated.status, 'AVAILABLE');
    assert.strictEqual(unrelated.currentEmployeeId, null);
  });

  // 20. Verify CONNECTED_TO does not accidentally cascade
  await t.test('20. Verify CONNECTED_TO does not accidentally cascade', async () => {
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: connAssetId,
        assetName: 'Connected Switch Asset',
        category: 'Network Rack',
        make: 'Cisco',
        model: 'Catalyst 2960',
        serialNumber: 'SN-P4C-CONN-001',
        department: 'Information Technology',
        floor: 'Server Room',
        status: 'AVAILABLE',
        condition: 'GOOD'
      })
    });

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentLapId,
        childAssetId: connAssetId,
        relationshipType: 'CONNECTED_TO',
        componentRole: 'SWITCH'
      })
    });

    // Transfer parent Laptop to AAI-10842
    await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        toEmployeeId: 'AAI-10842',
        transferReason: 'Transfer testing non-cascade'
      })
    });

    // CONNECTED_TO child must NOT have cascaded; remains AVAILABLE
    const connChild = await assetRepository.findById(connAssetId);
    assert.strictEqual(connChild.status, 'AVAILABLE', 'CONNECTED_TO child must remain AVAILABLE');
    assert.strictEqual(connChild.currentEmployeeId, null);
  });

  // 21. Verify BACKUP_FOR does not accidentally cascade
  await t.test('21. Verify BACKUP_FOR does not accidentally cascade', async () => {
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: bkpAssetId,
        assetName: 'Backup Server Asset',
        category: 'Server',
        make: 'Dell',
        model: 'PowerEdge R740',
        serialNumber: 'SN-P4C-BKP-001',
        department: 'Information Technology',
        floor: 'Data Center',
        status: 'AVAILABLE',
        condition: 'GOOD'
      })
    });

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentLapId,
        childAssetId: bkpAssetId,
        relationshipType: 'BACKUP_FOR',
        componentRole: 'BACKUP'
      })
    });

    // Return parent Laptop
    await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: parentLapId,
        returnReason: 'Return testing backup non-cascade'
      })
    });

    // BACKUP_FOR child must remain AVAILABLE and untouched
    const bkpChild = await assetRepository.findById(bkpAssetId);
    assert.strictEqual(bkpChild.status, 'AVAILABLE', 'BACKUP_FOR child must remain AVAILABLE');
    assert.strictEqual(bkpChild.currentEmployeeId, null);
  });

  // 22. Verify COMPONENT_OF existing behavior still works
  await t.test('22. Verify COMPONENT_OF existing behavior still works', async () => {
    // Create Workstation
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: compParentId,
        assetName: 'Workstation Parent',
        category: 'Desktop PC',
        make: 'HP',
        model: 'Z4 G4',
        serialNumber: 'SN-P4C-COMP-PC-01',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'EXCELLENT'
      })
    });

    // Create Monitor
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: compChildId,
        assetName: 'Monitor Child',
        category: 'Monitor',
        make: 'HP',
        model: 'E24 G4',
        serialNumber: 'SN-P4C-COMP-MON-01',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'EXCELLENT'
      })
    });

    // Link COMPONENT_OF
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: compParentId,
        childAssetId: compChildId,
        relationshipType: 'COMPONENT_OF',
        componentRole: 'PRIMARY_DISPLAY'
      })
    });

    // Assign with cascadeComponents: true
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: compParentId,
        employeeId: 'AAI-10950',
        cascadeComponents: true
      })
    });
    assert.strictEqual(assignRes.status, 201);

    const monAssigned = await assetRepository.findById(compChildId);
    assert.strictEqual(monAssigned.status, 'ASSIGNED');
    assert.strictEqual(monAssigned.currentEmployeeId, 'AAI-10950');

    // Transfer
    const transferRes = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: compParentId,
        toEmployeeId: 'AAI-10842',
        transferReason: 'Component transfer test'
      })
    });
    assert.strictEqual(transferRes.status, 200);

    const monTransferred = await assetRepository.findById(compChildId);
    assert.strictEqual(monTransferred.status, 'ASSIGNED');
    assert.strictEqual(monTransferred.currentEmployeeId, 'AAI-10842');

    // Return
    const returnRes = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: compParentId,
        returnReason: 'Component return test'
      })
    });
    assert.strictEqual(returnRes.status, 200);

    const monReturned = await assetRepository.findById(compChildId);
    assert.strictEqual(monReturned.status, 'AVAILABLE');
    assert.strictEqual(monReturned.currentEmployeeId, null);
  });

  // 23. Verify audit behavior
  await t.test('23. Verify audit behavior for parent and cascaded children', async () => {
    if (mongoose.connection.readyState === 1) {
      const childAuditLogs = await AuditLog.find({
        entityId: childMseId,
        entityType: 'ASSIGNMENT'
      });
      assert.ok(childAuditLogs.length >= 1, 'Child asset must have audit logs recorded');
      const hasAssigned = childAuditLogs.some(l => l.action === 'CUSTODY_ASSIGNED');
      assert.strictEqual(hasAssigned, true, 'Child CUSTODY_ASSIGNED audit event must exist');
    }
  });

  // 24. Verify no duplicate relationship documents
  await t.test('24. Verify no duplicate relationship documents', async () => {
    if (mongoose.connection.readyState === 1) {
      const rels = await AssetRelationship.find({
        parentAssetId: parentLapId,
        childAssetId: childMseId
      });
      assert.strictEqual(rels.length, 1, 'Exactly one relationship record must exist between parent and child');
    }
  });

  // 25. Verify no duplicate assignment corruption
  await t.test('25. Verify no duplicate assignment corruption', async () => {
    if (mongoose.connection.readyState === 1) {
      const activeAsgs = await AssetAssignment.find({
        assetId: childMseId,
        status: 'ACTIVE'
      });
      assert.strictEqual(activeAsgs.length, 0, 'No ACTIVE assignments should remain after return');
    }
  });

  // 26. Verify cleanup
  await t.test('26. Verify test data cleanup', async () => {
    for (const id of createdAssetIds) {
      try {
        await (assetRepository.hardDelete ? assetRepository.hardDelete(id) : assetRepository.delete(id));
      } catch (e) {}
    }
    if (mongoose.connection.readyState === 1) {
      await Asset.deleteMany({ assetId: { $in: createdAssetIds } });
      await AssetRelationship.deleteMany({
        $or: [
          { parentAssetId: { $in: createdAssetIds } },
          { childAssetId: { $in: createdAssetIds } }
        ]
      });
      await AssetAssignment.deleteMany({ assetId: { $in: createdAssetIds } });
      await AuditLog.deleteMany({ entityId: { $in: createdAssetIds } });
    }
    const checkParent = await assetRepository.findById(parentLapId);
    assert.strictEqual(checkParent, null, 'Cleaned up parent should not exist');
  });
});
