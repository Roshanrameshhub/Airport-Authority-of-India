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

test('Phase 4D — Relationship Integrity & Lifecycle Governance Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  const createdAssetIds = [];

  t.after(async () => {
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

  const helperCreateAsset = async (assetId, category = 'Desktop PC', extra = {}) => {
    createdAssetIds.push(assetId);
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId,
        assetName: `Asset ${assetId}`,
        category,
        make: 'Dell',
        model: 'OptiPlex',
        department: 'Information Technology',
        floor: 'IT Store / Pool',
        status: 'AVAILABLE',
        condition: 'GOOD',
        ...extra
      })
    });
    const body = await res.json();
    return { status: res.status, body };
  };

  // 1. Authentication
  await t.test('1. Authentication', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    adminToken = body.data.token;
    assert.ok(adminToken, 'Admin token acquired');
  });

  // 2. Normal relationship creation
  await t.test('2. Normal relationship creation', async () => {
    await helperCreateAsset('P4D-NORM-P', 'Desktop PC');
    await helperCreateAsset('P4D-NORM-C', 'Monitor');

    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-NORM-P',
        childAssetId: 'P4D-NORM-C',
        relationshipType: 'COMPONENT_OF',
        componentRole: 'PRIMARY_DISPLAY'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isActive, true);
  });

  // 3. Self-link rejection
  await t.test('3. Self-link rejection', async () => {
    await helperCreateAsset('P4D-SELF', 'Desktop PC');
    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-SELF',
        childAssetId: 'P4D-SELF',
        relationshipType: 'COMPONENT_OF'
      })
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /cannot be linked to itself/i);
  });

  // 4. One-parent rule
  await t.test('4. One-parent rule (a child cannot have two active parents)', async () => {
    await helperCreateAsset('P4D-PARENT-1', 'Desktop PC');
    await helperCreateAsset('P4D-PARENT-2', 'Desktop PC');
    await helperCreateAsset('P4D-CHILD-1', 'Monitor');

    const res1 = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-PARENT-1',
        childAssetId: 'P4D-CHILD-1',
        relationshipType: 'COMPONENT_OF'
      })
    });
    assert.strictEqual(res1.status, 201);

    const res2 = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-PARENT-2',
        childAssetId: 'P4D-CHILD-1',
        relationshipType: 'COMPONENT_OF'
      })
    });
    assert.strictEqual(res2.status, 409);
    const body2 = await res2.json();
    assert.match(body2.message, /already linked to parent/i);
  });

  // 5. Two-node cycle rejection (A -> B, attempt B -> A fails)
  await t.test('5. Two-node cycle rejection', async () => {
    await helperCreateAsset('P4D-CYC2-A', 'Desktop PC');
    await helperCreateAsset('P4D-CYC2-B', 'Peripherals');

    const linkRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-CYC2-A',
        childAssetId: 'P4D-CYC2-B',
        relationshipType: 'COMPONENT_OF'
      })
    });
    assert.strictEqual(linkRes.status, 201);

    const cycleRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-CYC2-B',
        childAssetId: 'P4D-CYC2-A',
        relationshipType: 'COMPONENT_OF'
      })
    });
    assert.strictEqual(cycleRes.status, 409);
    const cycleBody = await cycleRes.json();
    assert.match(cycleBody.message, /circular relationship detected/i);
  });

  // 6. Three-node cycle rejection (A -> B, B -> C, attempt C -> A fails)
  await t.test('6. Three-node cycle rejection', async () => {
    await helperCreateAsset('P4D-CYC3-A', 'Desktop PC');
    await helperCreateAsset('P4D-CYC3-B', 'Network Rack');
    await helperCreateAsset('P4D-CYC3-C', 'Peripherals');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC3-A', childAssetId: 'P4D-CYC3-B' })
    });
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC3-B', childAssetId: 'P4D-CYC3-C' })
    });

    const cycleRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC3-C', childAssetId: 'P4D-CYC3-A' })
    });
    assert.strictEqual(cycleRes.status, 409);
    const cycleBody = await cycleRes.json();
    assert.match(cycleBody.message, /circular relationship detected/i);
  });

  // 7. Longer multi-hop cycle rejection (A -> B -> C -> D, attempt D -> A fails)
  await t.test('7. Longer multi-hop cycle rejection', async () => {
    await helperCreateAsset('P4D-CYC4-A', 'Desktop PC');
    await helperCreateAsset('P4D-CYC4-B', 'Network Rack');
    await helperCreateAsset('P4D-CYC4-C', 'Server');
    await helperCreateAsset('P4D-CYC4-D', 'Peripherals');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC4-A', childAssetId: 'P4D-CYC4-B' })
    });
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC4-B', childAssetId: 'P4D-CYC4-C' })
    });
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC4-C', childAssetId: 'P4D-CYC4-D' })
    });

    const cycleRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-CYC4-D', childAssetId: 'P4D-CYC4-A' })
    });
    assert.strictEqual(cycleRes.status, 409);
    const cycleBody = await cycleRes.json();
    assert.match(cycleBody.message, /circular relationship detected/i);
  });

  // 8. Valid non-cycle chain
  await t.test('8. Valid non-cycle chain (A -> B -> C -> D succeeds without cycle)', async () => {
    const parentA = await relationshipRepository.findParent('P4D-CYC4-D');
    assert.strictEqual(parentA.asset.assetId, 'P4D-CYC4-C');
    const parentB = await relationshipRepository.findParent('P4D-CYC4-C');
    assert.strictEqual(parentB.asset.assetId, 'P4D-CYC4-B');
    const parentC = await relationshipRepository.findParent('P4D-CYC4-B');
    assert.strictEqual(parentC.asset.assetId, 'P4D-CYC4-A');
  });

  // 9. Inactive historical relationship ignored by cycle detection
  await t.test('9. Inactive historical relationship ignored by cycle detection', async () => {
    await helperCreateAsset('P4D-HIST-A', 'Desktop PC');
    await helperCreateAsset('P4D-HIST-B', 'Network Rack');
    await helperCreateAsset('P4D-HIST-C', 'Peripherals');

    // Link A -> B
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-HIST-A', childAssetId: 'P4D-HIST-B' })
    });
    // Link B -> C
    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-HIST-B', childAssetId: 'P4D-HIST-C' })
    });

    // Unlink B -> C
    await fetch(`${baseUrl}/relationships/unlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-HIST-B', childAssetId: 'P4D-HIST-C', reason: 'Unlinked for test' })
    });

    // Now link C -> A. Since B -> C is inactive, no active cycle exists from A back to C!
    const linkRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-HIST-C', childAssetId: 'P4D-HIST-A' })
    });
    // However, A is parent of B, but B cannot reach C because B->C is inactive.
    // Wait, can A reach C? A -> B (active), B has no active children. So path A -> ... -> C is broken!
    // Therefore C -> A is valid and does not form an active cycle.
    assert.strictEqual(linkRes.status, 201, 'Inactive edge must not cause false cycle error');
  });

  // 10. Archived parent cannot receive new relationship
  await t.test('10. Archived parent cannot receive new relationship', async () => {
    await helperCreateAsset('P4D-ARCH-P', 'Desktop PC');
    await helperCreateAsset('P4D-ARCH-C1', 'Monitor');

    // Archive parent via DELETE
    await fetch(`${baseUrl}/assets/P4D-ARCH-P`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-ARCH-P', childAssetId: 'P4D-ARCH-C1' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /archived/i);
  });

  // 11. Archived child cannot receive new relationship
  await t.test('11. Archived child cannot receive new relationship', async () => {
    await helperCreateAsset('P4D-ARCH-P2', 'Desktop PC');
    await helperCreateAsset('P4D-ARCH-C2', 'Monitor');

    // Archive child via DELETE
    await fetch(`${baseUrl}/assets/P4D-ARCH-C2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-ARCH-P2', childAssetId: 'P4D-ARCH-C2' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /archived/i);
  });

  // 12. Retired parent cannot receive new relationship
  await t.test('12. Retired parent cannot receive new relationship', async () => {
    await helperCreateAsset('P4D-RET-P', 'Desktop PC');
    await helperCreateAsset('P4D-RET-C1', 'Monitor');

    // Retire parent via PATCH /retire
    await fetch(`${baseUrl}/assets/P4D-RET-P/retire`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Decommissioned workstation' })
    });

    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-RET-P', childAssetId: 'P4D-RET-C1' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /retired|decommissioned/i);
  });

  // 13. Retired child cannot receive new relationship
  await t.test('13. Retired child cannot receive new relationship', async () => {
    await helperCreateAsset('P4D-RET-P2', 'Desktop PC');
    await helperCreateAsset('P4D-RET-C2', 'Monitor');

    // Retire child via PATCH /retire
    await fetch(`${baseUrl}/assets/P4D-RET-C2/retire`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Burned out display' })
    });

    const res = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-RET-P2', childAssetId: 'P4D-RET-C2' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /retired|decommissioned/i);
  });

  // 14. Archive parent invalidates active relationship
  await t.test('14. Archive parent invalidates active relationship', async () => {
    await helperCreateAsset('P4D-INVAL-PAR-P', 'Desktop PC');
    await helperCreateAsset('P4D-INVAL-PAR-C', 'Monitor');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-INVAL-PAR-P', childAssetId: 'P4D-INVAL-PAR-C' })
    });

    // Delete parent (archives it)
    const delRes = await fetch(`${baseUrl}/assets/P4D-INVAL-PAR-P`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    // Verify relationship is deactivated
    const parentOfC = await relationshipRepository.findParent('P4D-INVAL-PAR-C');
    assert.strictEqual(parentOfC, null, 'Active parent must be null after parent archival');
  });

  // 15. Archive child invalidates active relationship
  await t.test('15. Archive child invalidates active relationship', async () => {
    await helperCreateAsset('P4D-INVAL-CHD-P', 'Desktop PC');
    await helperCreateAsset('P4D-INVAL-CHD-C', 'Monitor');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-INVAL-CHD-P', childAssetId: 'P4D-INVAL-CHD-C' })
    });

    // Delete child (archives it)
    const delRes = await fetch(`${baseUrl}/assets/P4D-INVAL-CHD-C`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    const components = await relationshipRepository.findComponents('P4D-INVAL-CHD-P');
    assert.strictEqual(components.length, 0, 'Parent must have 0 active components after child archival');
  });

  // 16. Retirement parent invalidates active relationship
  await t.test('16. Retirement parent invalidates active relationship', async () => {
    await helperCreateAsset('P4D-INVAL-RET-P', 'Desktop PC');
    await helperCreateAsset('P4D-INVAL-RET-C', 'Monitor');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-INVAL-RET-P', childAssetId: 'P4D-INVAL-RET-C' })
    });

    const retRes = await fetch(`${baseUrl}/assets/P4D-INVAL-RET-P/retire`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Lifecycle retirement test' })
    });
    assert.strictEqual(retRes.status, 200);

    const parentOfC = await relationshipRepository.findParent('P4D-INVAL-RET-C');
    assert.strictEqual(parentOfC, null, 'Active parent must be null after parent retirement');
  });

  // 17. Retirement child invalidates active relationship
  await t.test('17. Retirement child invalidates active relationship', async () => {
    await helperCreateAsset('P4D-INVAL-RC-P', 'Desktop PC');
    await helperCreateAsset('P4D-INVAL-RC-C', 'Monitor');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ parentAssetId: 'P4D-INVAL-RC-P', childAssetId: 'P4D-INVAL-RC-C' })
    });

    const retRes = await fetch(`${baseUrl}/assets/P4D-INVAL-RC-C/retire`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Child decommission' })
    });
    assert.strictEqual(retRes.status, 200);

    const components = await relationshipRepository.findComponents('P4D-INVAL-RC-P');
    assert.strictEqual(components.length, 0, 'Parent must have 0 active components after child retirement');
  });

  // 18. isActive=false preserved as history
  await t.test('18. isActive=false preserved as history in MongoDB', async () => {
    if (mongoose.connection.readyState === 1) {
      const doc = await AssetRelationship.findOne({
        parentAssetId: 'P4D-INVAL-PAR-P',
        childAssetId: 'P4D-INVAL-PAR-C'
      });
      assert.ok(doc, 'Historical relationship document must still exist');
      assert.strictEqual(doc.isActive, false, 'Document must have isActive = false');
    }
  });

  // 19. unlinkedDate populated
  await t.test('19. unlinkedDate populated upon invalidation', async () => {
    if (mongoose.connection.readyState === 1) {
      const doc = await AssetRelationship.findOne({
        parentAssetId: 'P4D-INVAL-PAR-P',
        childAssetId: 'P4D-INVAL-PAR-C'
      });
      assert.ok(doc.unlinkedDate, 'unlinkedDate must be populated with a valid Date');
    }
  });

  // 20. Relationship audit generated
  await t.test('20. Relationship audit generated for invalidation', async () => {
    if (mongoose.connection.readyState === 1) {
      const logs = await AuditLog.find({
        action: 'RELATIONSHIP_UNLINKED',
        entityId: 'P4D-INVAL-PAR-C'
      });
      assert.ok(logs.length >= 1, 'Audit log must record RELATIONSHIP_UNLINKED');
      const invalidationLog = logs.find(l => l.details?.source === 'LIFECYCLE_INVALIDATION');
      assert.ok(invalidationLog, 'Audit log must have source: LIFECYCLE_INVALIDATION');
    }
  });

  // 21. Laptop MSE Phase 4B regression (create Laptop MSE, verify auto-link)
  await t.test('21. Laptop MSE Phase 4B regression: Creation auto-linking', async () => {
    await helperCreateAsset('P4D-REG-LAP-01', 'Laptop');
    const { status, body } = await helperCreateAsset('P4D-REG-MSE-01', 'Laptop MSE', {
      specifications: { parentLaptopId: 'P4D-REG-LAP-01' }
    });
    assert.strictEqual(status, 201);

    const parent = await relationshipRepository.findParent('P4D-REG-MSE-01');
    assert.ok(parent);
    assert.strictEqual(parent.asset.assetId, 'P4D-REG-LAP-01');
    assert.strictEqual(parent.relationshipType, 'PERIPHERAL_OF');
    assert.strictEqual(parent.componentRole, 'MOUSE');
  });

  // 22. Laptop MSE relink regression
  await t.test('22. Laptop MSE Phase 4B regression: Relinking to new parent', async () => {
    await helperCreateAsset('P4D-REG-LAP-02', 'Laptop');
    const updateRes = await fetch(`${baseUrl}/assets/P4D-REG-MSE-01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: { parentLaptopId: 'P4D-REG-LAP-02' }
      })
    });
    assert.strictEqual(updateRes.status, 200);

    const parent = await relationshipRepository.findParent('P4D-REG-MSE-01');
    assert.strictEqual(parent.asset.assetId, 'P4D-REG-LAP-02');
  });

  // 23. Laptop MSE clear regression
  await t.test('23. Laptop MSE Phase 4B regression: Clearing relationship', async () => {
    const updateRes = await fetch(`${baseUrl}/assets/P4D-REG-MSE-01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: { parentLaptopId: null }
      })
    });
    assert.strictEqual(updateRes.status, 200);

    const parent = await relationshipRepository.findParent('P4D-REG-MSE-01');
    assert.strictEqual(parent, null);
  });

  // 24. Laptop MSE timeline regression
  await t.test('24. Laptop MSE timeline regression', async () => {
    const timelineRes = await fetch(`${baseUrl}/assets/P4D-REG-MSE-01/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(timelineRes.status, 200);
    const body = await timelineRes.json();
    assert.ok(body.data.timeline);
  });

  // 25. Phase 4C assignment regression
  await t.test('25. Phase 4C assignment regression', async () => {
    await helperCreateAsset('P4D-CAS-LAP', 'Laptop');
    await helperCreateAsset('P4D-CAS-MSE', 'Laptop MSE');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-CAS-LAP',
        childAssetId: 'P4D-CAS-MSE',
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      })
    });

    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'P4D-CAS-LAP',
        employeeId: 'AAI-10950'
      })
    });
    assert.strictEqual(assignRes.status, 201);

    const lap = await assetRepository.findById('P4D-CAS-LAP');
    const mse = await assetRepository.findById('P4D-CAS-MSE');
    assert.strictEqual(lap.currentEmployeeId, 'AAI-10950');
    assert.strictEqual(mse.currentEmployeeId, 'AAI-10950');
  });

  // 26. Phase 4C transfer regression
  await t.test('26. Phase 4C transfer regression', async () => {
    const transferRes = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'P4D-CAS-LAP',
        toEmployeeId: 'AAI-10842',
        transferReason: 'Phase 4D regression test'
      })
    });
    assert.strictEqual(transferRes.status, 200);

    const lap = await assetRepository.findById('P4D-CAS-LAP');
    const mse = await assetRepository.findById('P4D-CAS-MSE');
    assert.strictEqual(lap.currentEmployeeId, 'AAI-10842');
    assert.strictEqual(mse.currentEmployeeId, 'AAI-10842');
  });

  // 27. Phase 4C return regression
  await t.test('27. Phase 4C return regression', async () => {
    const returnRes = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'P4D-CAS-LAP',
        returnReason: 'Phase 4D return regression'
      })
    });
    assert.strictEqual(returnRes.status, 200);

    const lap = await assetRepository.findById('P4D-CAS-LAP');
    const mse = await assetRepository.findById('P4D-CAS-MSE');
    assert.strictEqual(lap.status, 'AVAILABLE');
    assert.strictEqual(mse.status, 'AVAILABLE');
    assert.strictEqual(lap.currentEmployeeId, null);
    assert.strictEqual(mse.currentEmployeeId, null);
  });

  // 28. Relationship remains active during normal custody changes
  await t.test('28. Relationship remains active during normal custody changes', async () => {
    const rel = await relationshipRepository.findParent('P4D-CAS-MSE');
    assert.ok(rel, 'Relationship must still be active after return');
    assert.strictEqual(rel.asset.assetId, 'P4D-CAS-LAP');
  });

  // 29. CONNECTED_TO behavior according to inspected cycle policy
  await t.test('29. CONNECTED_TO cycle policy: cycle prevention applies across active directed relationships', async () => {
    await helperCreateAsset('P4D-CONN-A', 'Network Rack');
    await helperCreateAsset('P4D-CONN-B', 'Network Rack');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-CONN-A',
        childAssetId: 'P4D-CONN-B',
        relationshipType: 'CONNECTED_TO',
        componentRole: 'NETWORK_UPLINK'
      })
    });

    const cycleRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-CONN-B',
        childAssetId: 'P4D-CONN-A',
        relationshipType: 'CONNECTED_TO',
        componentRole: 'NETWORK_UPLINK'
      })
    });
    assert.strictEqual(cycleRes.status, 409);
    const body = await cycleRes.json();
    assert.match(body.message, /circular relationship detected/i);
  });

  // 30. BACKUP_FOR behavior according to inspected cycle policy
  await t.test('30. BACKUP_FOR cycle policy: cycle prevention applies across active directed relationships', async () => {
    await helperCreateAsset('P4D-BKP-A', 'Server');
    await helperCreateAsset('P4D-BKP-B', 'Server');

    await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-BKP-A',
        childAssetId: 'P4D-BKP-B',
        relationshipType: 'BACKUP_FOR',
        componentRole: 'OTHER'
      })
    });

    const cycleRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: 'P4D-BKP-B',
        childAssetId: 'P4D-BKP-A',
        relationshipType: 'BACKUP_FOR',
        componentRole: 'OTHER'
      })
    });
    assert.strictEqual(cycleRes.status, 409);
    const body = await cycleRes.json();
    assert.match(body.message, /circular relationship detected/i);
  });

  // 31. No duplicate relationship documents
  await t.test('31. No duplicate relationship documents', async () => {
    if (mongoose.connection.readyState === 1) {
      const rels = await AssetRelationship.find({
        parentAssetId: 'P4D-CAS-LAP',
        childAssetId: 'P4D-CAS-MSE'
      });
      assert.strictEqual(rels.length, 1, 'Only one relationship document should exist');
    }
  });

  // 32. Complete cleanup
  await t.test('32. Complete cleanup', async () => {
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
    const checkLap = await assetRepository.findById('P4D-CAS-LAP');
    assert.strictEqual(checkLap, null, 'Cleaned up asset must not exist');
  });
});
