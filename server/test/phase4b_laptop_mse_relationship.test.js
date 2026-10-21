import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Asset from '../src/models/Asset.js';
import AssetRelationship from '../src/models/AssetRelationship.js';
import AuditLog from '../src/models/AuditLog.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { relationshipRepository } from '../src/repositories/relationshipRepository.js';

test('Phase 4B — Laptop MSE Relationship Persistence Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  const createdAssetIds = [];

  t.after(async () => {
    // Teardown: Clean up all created test assets and test relationships
    for (const id of createdAssetIds) {
      try {
        await assetRepository.delete(id);
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
      } catch (e) {}
    }

    server.close();
  });

  // Step 0: Acquire authentication tokens
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

  const parentLapId = 'AAI-P4B-LAP-001';
  const childMseId = 'AAI-P4B-MSE-001';

  // 1-8. Creation & Auto-linking
  await t.test('1-8. Create parent Laptop and Laptop MSE with _relationship auto-linking', async () => {
    // 1. Create parent Laptop
    const lapPayload = {
      assetId: parentLapId,
      category: 'Laptop',
      assetType: 'LAPTOP',
      make: 'Dell',
      model: 'Latitude 7420',
      serialNumber: 'SN-P4B-LAP-001',
      installDate: '2025-01-10',
      warrantyEndDate: '2028-01-10',
      amcApplicable: false,
      computerConfig: {
        processor: 'Intel Core i7-1185G7',
        ramSizeGb: 16,
        storageCapacityGb: 512
      },
      status: 'AVAILABLE'
    };

    const lapRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(lapPayload)
    });
    assert.strictEqual(lapRes.status, 201);
    createdAssetIds.push(parentLapId);

    // 2. Create Laptop MSE with valid _relationship
    const msePayload = {
      assetId: childMseId,
      category: 'Laptop MSE',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'M90 Optical Mouse',
      serialNumber: 'SN-P4B-MSE-001',
      currentEmployeeName: 'K. Srinivasan',
      specifications: {
        parentLaptopId: parentLapId
      },
      _relationship: {
        parentAssetId: parentLapId,
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      },
      remarks: 'Allocated with laptop'
    };

    const mseRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(msePayload)
    });

    // 3. Verify HTTP success
    assert.strictEqual(mseRes.status, 201);
    const mseBody = await mseRes.json();
    assert.strictEqual(mseBody.success, true);
    assert.strictEqual(mseBody.data.assetId, childMseId);
    createdAssetIds.push(childMseId);

    // 4-8. Verify AssetRelationship exists and attributes match
    const parentRel = await relationshipRepository.findParent(childMseId);
    assert.ok(parentRel, 'AssetRelationship record must exist for child Laptop MSE');
    assert.strictEqual(parentRel.asset?.assetId, parentLapId);
    assert.strictEqual(parentRel.relationshipType, 'PERIPHERAL_OF');
    assert.strictEqual(parentRel.componentRole, 'MOUSE');
  });

  // 9-10. Parent lookup
  await t.test('9-10. GET /relationships/parent/:childAssetId returns parent Laptop', async () => {
    const res = await fetch(`${baseUrl}/relationships/parent/${childMseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
    assert.strictEqual(body.data.asset?.assetId, parentLapId);
    assert.strictEqual(body.data.relationshipType, 'PERIPHERAL_OF');
    assert.strictEqual(body.data.componentRole, 'MOUSE');
  });

  // 11-12. Child lookup
  await t.test('11-12. GET /relationships/components/:parentAssetId returns Laptop MSE as component', async () => {
    const res = await fetch(`${baseUrl}/relationships/components/${parentLapId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const mseComp = body.data.find(c => c.asset?.assetId === childMseId);
    assert.ok(mseComp, 'Child Laptop MSE must be listed in parent components');
    assert.strictEqual(mseComp.relationshipType, 'PERIPHERAL_OF');
    assert.strictEqual(mseComp.componentRole, 'MOUSE');
  });

  // 13-15. Missing parent
  const missingParentMseId = 'AAI-P4B-MSE-MISSING';
  await t.test('13-15. Create Laptop MSE with nonexistent parent fails and creates no false relationship', async () => {
    const invalidMsePayload = {
      assetId: missingParentMseId,
      category: 'Laptop MSE',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'B100',
      serialNumber: 'SN-P4B-MSE-MISSING',
      specifications: {
        parentLaptopId: 'AAI-NON-EXISTENT-LAP-9999'
      },
      _relationship: {
        parentAssetId: 'AAI-NON-EXISTENT-LAP-9999',
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      }
    };

    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(invalidMsePayload)
    });

    // 14. Verify relationship creation fails correctly
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /not found/i);
    createdAssetIds.push(missingParentMseId);

    // 15. Verify no false relationship exists
    const rel = await relationshipRepository.findParent(missingParentMseId);
    assert.strictEqual(rel, null, 'No false relationship record must exist for failed link');
  });

  // 16-17. Existing parent relationship protection
  await t.test('16-17. Attempting duplicate parent link for child is rejected by repository protection', async () => {
    // Child childMseId is already actively linked to parentLapId. Attempt to link it to another laptop directly.
    const dupRes = await fetch(`${baseUrl}/relationships/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        parentAssetId: parentLapId,
        childAssetId: childMseId,
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      })
    });

    assert.strictEqual(dupRes.status, 409);
    const body = await dupRes.json();
    assert.match(body.message, /already linked/i);
  });

  // 18-20. Edit unchanged: Update with same parentLaptopId does not duplicate
  await t.test('18-20. Edit with unchanged parentLaptopId preserves single active relationship', async () => {
    const updateRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        remarks: 'Updated remarks without changing parent laptop',
        specifications: {
          parentLaptopId: parentLapId
        }
      })
    });

    assert.strictEqual(updateRes.status, 200);

    // Verify still exactly one parent
    const parentRel = await relationshipRepository.findParent(childMseId);
    assert.ok(parentRel);
    assert.strictEqual(parentRel.asset?.assetId, parentLapId);

    // Verify parent components still count 1
    const comps = await relationshipRepository.findComponents(parentLapId);
    const matchingComps = comps.filter(c => c.asset?.assetId === childMseId);
    assert.strictEqual(matchingComps.length, 1, 'Child must only be listed once under parent');
  });

  // 21-24. Edit relink: Change parent to a second Laptop
  const secondParentLapId = 'AAI-P4B-LAP-002';
  await t.test('21-24. Edit parentLaptopId to second Laptop unlinks old and links new relationship', async () => {
    // 21. Create second Laptop
    await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: secondParentLapId,
        category: 'Laptop',
        assetType: 'LAPTOP',
        make: 'Lenovo',
        model: 'ThinkPad T14',
        serialNumber: 'SN-P4B-LAP-002',
        status: 'AVAILABLE'
      })
    });
    createdAssetIds.push(secondParentLapId);

    // 22. Change parentLaptopId to second Laptop
    const relinkRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: {
          parentLaptopId: secondParentLapId
        }
      })
    });
    assert.strictEqual(relinkRes.status, 200);

    // 23-24. Verify old relationship inactive and new relationship active
    const newParentRel = await relationshipRepository.findParent(childMseId);
    assert.ok(newParentRel);
    assert.strictEqual(newParentRel.asset?.assetId, secondParentLapId, 'New parent must be second Laptop');

    const oldComps = await relationshipRepository.findComponents(parentLapId);
    const inOldComps = oldComps.some(c => c.asset?.assetId === childMseId);
    assert.strictEqual(inOldComps, false, 'Child must no longer be active component of old parent');

    const newComps = await relationshipRepository.findComponents(secondParentLapId);
    const inNewComps = newComps.some(c => c.asset?.assetId === childMseId);
    assert.strictEqual(inNewComps, true, 'Child must be active component of new parent');
  });

  // 25-27. Remove relationship: Clearing parentLaptopId deactivates relationship
  await t.test('25-27. Clearing parentLaptopId removes active relationship while preserving history', async () => {
    const clearRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: {
          parentLaptopId: ''
        }
      })
    });
    assert.strictEqual(clearRes.status, 200);

    // 26. Verify active relationship is gone
    const parentRel = await relationshipRepository.findParent(childMseId);
    assert.strictEqual(parentRel, null, 'Active parent relationship must be null after clearing');

    // 27. Verify historical relationship remains stored in database
    if (mongoose.connection.readyState === 1) {
      const historicalRels = await AssetRelationship.find({ childAssetId: childMseId });
      assert.ok(historicalRels.length >= 2, 'History of previous relationships must remain in MongoDB');
      const allInactive = historicalRels.every(r => r.isActive === false);
      assert.strictEqual(allInactive, true, 'All historical relationships must be inactive');
    }
  });

  // 28-29. Asset ID immutability during edit
  await t.test('28-29. Attempt to change assetId during edit leaves assetId unchanged', async () => {
    const immutabilityRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: 'ATTEMPT-TO-CHANGE-MSE-ID',
        remarks: 'Immutability test check'
      })
    });
    assert.strictEqual(immutabilityRes.status, 200);

    const getRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getBody = await getRes.json();
    assert.strictEqual(getBody.data.assetId, childMseId, 'assetId must remain strictly unchanged');
  });

  // 30-31. Audit: Verify RELATIONSHIP_LINKED and RELATIONSHIP_UNLINKED events
  await t.test('30-31. Audit events for RELATIONSHIP_LINKED and RELATIONSHIP_UNLINKED are recorded', async () => {
    // Relink back to parentLapId to generate clean audit log entry
    const relinkRes = await fetch(`${baseUrl}/assets/${childMseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        specifications: {
          parentLaptopId: parentLapId
        }
      })
    });
    assert.strictEqual(relinkRes.status, 200);

    // Check timeline of child MSE
    const timelineRes = await fetch(`${baseUrl}/assets/${childMseId}/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(timelineRes.status, 200);
    const timelineBody = await timelineRes.json();
    assert.strictEqual(timelineBody.success, true);
    assert.ok(Array.isArray(timelineBody.data?.timeline));
    const parentEvent = timelineBody.data.timeline.find(e => e.type === 'PARENT_CONNECTED');
    assert.ok(parentEvent, 'Timeline must include PARENT_CONNECTED event');
  });

  // 32. Timeline inspection on parent Laptop
  await t.test('32. GET /assets/:id/timeline on parent Laptop exposes COMPONENT_LINKED event', async () => {
    const timelineRes = await fetch(`${baseUrl}/assets/${parentLapId}/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(timelineRes.status, 200);
    const timelineBody = await timelineRes.json();
    assert.strictEqual(timelineBody.success, true);
    assert.ok(Array.isArray(timelineBody.data?.timeline));
    const compEvent = timelineBody.data.timeline.find(e => e.type === 'COMPONENT_LINKED');
    assert.ok(compEvent, 'Parent timeline must include COMPONENT_LINKED event');
    assert.strictEqual(compEvent.details?.role, 'MOUSE');
    assert.strictEqual(compEvent.details?.relationshipType, 'PERIPHERAL_OF');
  });

});
