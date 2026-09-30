import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import mongoose from 'mongoose';
import Asset from '../src/models/Asset.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('Phase 5B — Inventory API, Performance & Scalability Hardening Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';
  const testAssetIds = [];

  t.after(async () => {
    // Cleanup temporary test assets
    for (const id of testAssetIds) {
      try {
        await assetRepository.delete(id);
      } catch (e) {}
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Asset.deleteMany({ assetId: { $in: testAssetIds } });
      } catch (e) {}
    }

    server.close();
  });

  // Acquire tokens
  await t.test('1. Authentication Setup: Acquire Admin and Employee tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminBody.data.token;
    assert.ok(adminToken, 'Admin token acquired');

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee01', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;
    assert.ok(employeeToken, 'Employee token acquired');
  });

  // 2. Pagination Safety & Max Limit Hardening
  await t.test('2. Pagination Safety: Default limit and bounds enforcement', async () => {
    // Default limit
    const resDefault = await fetch(`${baseUrl}/assets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resDefault.status, 200);
    const bodyDefault = await resDefault.json();
    assert.strictEqual(bodyDefault.success, true);
    assert.strictEqual(bodyDefault.pagination.limit, 10);
    assert.strictEqual(bodyDefault.pagination.page, 1);

    // Limit 20
    const res20 = await fetch(`${baseUrl}/assets?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body20 = await res20.json();
    assert.strictEqual(body20.pagination.limit, 20);

    // Limit 100
    const res100 = await fetch(`${baseUrl}/assets?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body100 = await res100.json();
    assert.strictEqual(body100.pagination.limit, 100);

    // Limit 101 capped at 100
    const res101 = await fetch(`${baseUrl}/assets?limit=101`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body101 = await res101.json();
    assert.strictEqual(body101.pagination.limit, 100, 'Limit 101 must be capped at 100');

    // Limit 10000 capped at 100
    const res10k = await fetch(`${baseUrl}/assets?limit=10000`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body10k = await res10k.json();
    assert.strictEqual(body10k.pagination.limit, 100, 'Limit 10000 must be capped at 100');

    // Limit 500000 capped at 100
    const res500k = await fetch(`${baseUrl}/assets?limit=500000`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body500k = await res500k.json();
    assert.strictEqual(body500k.pagination.limit, 100, 'Limit 500000 must be capped at 100');

    // Invalid non-numeric limit resolves safely to default 10
    const resInvalid = await fetch(`${baseUrl}/assets?limit=notANumber`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyInvalid = await resInvalid.json();
    assert.strictEqual(bodyInvalid.pagination.limit, 10);

    // Negative limit resolves safely to default 10
    const resNeg = await fetch(`${baseUrl}/assets?limit=-15`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyNeg = await resNeg.json();
    assert.strictEqual(bodyNeg.pagination.limit, 10);

    // Zero limit resolves safely to default 10
    const resZero = await fetch(`${baseUrl}/assets?limit=0`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyZero = await resZero.json();
    assert.strictEqual(bodyZero.pagination.limit, 10);

    // Invalid page resolves safely to 1
    const resPage = await fetch(`${baseUrl}/assets?page=-3`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyPage = await resPage.json();
    assert.strictEqual(bodyPage.pagination.page, 1);
  });

  // 3. Sort Security & Determinism
  await t.test('3. Sort Security: Allowlist and deterministic secondary ordering', async () => {
    // Valid sortBy field
    const resValid = await fetch(`${baseUrl}/assets?sortBy=purchaseCost&sortOrder=asc&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.strictEqual(bodyValid.success, true);
    assert.ok(Array.isArray(bodyValid.data));

    // Arbitrary unallowlisted sortBy field must not crash and safely falls back
    const maliciousSorts = ['__proto__', '$where', 'password', 'invalidColumn123'];
    for (const sortKey of maliciousSorts) {
      const resInj = await fetch(`${baseUrl}/assets?sortBy=${encodeURIComponent(sortKey)}&limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(resInj.status, 200, `Sort with "${sortKey}" should return 200 safely`);
      const bodyInj = await resInj.json();
      assert.strictEqual(bodyInj.success, true);
    }
  });

  // 4. Search + IP Filter Collision Resolution
  await t.test('4. Query Conjunction: search + ipAddress independent filtering', async () => {
    // Setup test asset with specific IP
    const testAssetId = 'AAI-TEST-IP-5B-01';
    testAssetIds.push(testAssetId);

    const createRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: testAssetId,
        assetName: 'Phase 5B Collision Probe Workstation',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'Precision 3660',
        serialNumber: 'SN-P5B-COLL-01',
        department: 'Information Technology',
        floor: '2nd Floor',
        status: 'AVAILABLE',
        condition: 'NEW',
        networkConfig: {
          ipAddress: '10.99.88.77',
          macAddress: 'AA:BB:CC:DD:EE:FF'
        }
      })
    });
    assert.strictEqual(createRes.status, 201);

    // Case 1: Matching search + Matching IP -> MUST MATCH
    const res1 = await fetch(`${baseUrl}/assets?search=Collision%20Probe&ipAddress=10.99.88.77`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body1 = await res1.json();
    assert.strictEqual(body1.success, true);
    assert.ok(body1.data.length >= 1);
    assert.ok(body1.data.some(a => a.assetId === testAssetId));

    // Case 2: Matching search + Non-matching IP -> MUST NOT MATCH
    const res2 = await fetch(`${baseUrl}/assets?search=Collision%20Probe&ipAddress=192.168.99.99`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body2 = await res2.json();
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.data.some(a => a.assetId === testAssetId), false, 'Should not match when IP differs');

    // Case 3: Non-matching search + Matching IP -> MUST NOT MATCH
    const res3 = await fetch(`${baseUrl}/assets?search=NonExistentSearchTermXYZ&ipAddress=10.99.88.77`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body3 = await res3.json();
    assert.strictEqual(body3.success, true);
    assert.strictEqual(body3.data.some(a => a.assetId === testAssetId), false, 'Should not match when search differs');

    // Case 4: Search-only still functions
    const resSearchOnly = await fetch(`${baseUrl}/assets?search=Collision%20Probe`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodySearchOnly = await resSearchOnly.json();
    assert.ok(bodySearchOnly.data.some(a => a.assetId === testAssetId));

    // Case 5: IP-only still functions
    const resIpOnly = await fetch(`${baseUrl}/assets?ipAddress=10.99.88.77`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyIpOnly = await resIpOnly.json();
    assert.ok(bodyIpOnly.data.some(a => a.assetId === testAssetId));
  });

  // 5. Archived Asset Role-Governed Visibility
  await t.test('5. Archived Assets: ADMIN explicit visibility vs. EMPLOYEE strict exclusion', async () => {
    // Create an asset and retire/archive it
    const testArchiveId = 'AAI-TEST-ARCHIVE-5B';
    testAssetIds.push(testArchiveId);

    const createRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: testArchiveId,
        assetName: 'Archived Equipment 5B',
        category: 'Laptop',
        make: 'Lenovo',
        model: 'ThinkPad X1',
        serialNumber: 'SN-P5B-ARCH-01',
        department: 'Human Resources',
        floor: 'Ground Floor',
        status: 'AVAILABLE',
        condition: 'FAIR'
      })
    });
    assert.strictEqual(createRes.status, 201);

    // Archive the asset via soft-delete endpoint
    const archiveRes = await fetch(`${baseUrl}/assets/${testArchiveId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(archiveRes.status, 200);

    // 1. ADMIN without isArchived param -> MUST NOT include archived asset
    const adminDefault = await fetch(`${baseUrl}/assets?search=Archived%20Equipment%205B`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyAdminDefault = await adminDefault.json();
    assert.strictEqual(bodyAdminDefault.data.some(a => a.assetId === testArchiveId), false);

    // 2. ADMIN with isArchived=false -> MUST NOT include archived asset
    const adminFalse = await fetch(`${baseUrl}/assets?search=Archived%20Equipment%205B&isArchived=false`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyAdminFalse = await adminFalse.json();
    assert.strictEqual(bodyAdminFalse.data.some(a => a.assetId === testArchiveId), false);

    // 3. ADMIN with isArchived=true -> MUST find the archived asset
    const adminTrue = await fetch(`${baseUrl}/assets?search=Archived%20Equipment%205B&isArchived=true`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyAdminTrue = await adminTrue.json();
    assert.ok(bodyAdminTrue.data.some(a => a.assetId === testArchiveId), 'ADMIN with isArchived=true must find archived asset');

    // 4. EMPLOYEE without isArchived param -> MUST NOT include archived asset
    const empDefault = await fetch(`${baseUrl}/assets?search=Archived%20Equipment%205B`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const bodyEmpDefault = await empDefault.json();
    assert.strictEqual(bodyEmpDefault.data.some(a => a.assetId === testArchiveId), false);

    // 5. EMPLOYEE with isArchived=true -> MUST STILL EXCLUDE archived asset
    const empTrue = await fetch(`${baseUrl}/assets?search=Archived%20Equipment%205B&isArchived=true`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const bodyEmpTrue = await empTrue.json();
    assert.strictEqual(bodyEmpTrue.data.some(a => a.assetId === testArchiveId), false, 'EMPLOYEE must never see archived assets even with isArchived=true');
  });

  // 6. Dashboard Aggregation Output Compatibility
  await t.test('6. Dashboard Aggregations: Native MongoDB pipeline compatibility', async () => {
    // Category distribution
    const catRes = await fetch(`${baseUrl}/dashboard/category-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(catRes.status, 200);
    const catBody = await catRes.json();
    assert.strictEqual(catBody.success, true);
    assert.ok(Array.isArray(catBody.data));
    if (catBody.data.length > 0) {
      const entry = catBody.data[0];
      assert.ok('category' in entry);
      assert.ok('count' in entry);
      assert.ok('assigned' in entry);
      assert.ok('available' in entry);
      assert.ok('maintenance' in entry);
      assert.ok('percentage' in entry);
      assert.strictEqual(typeof entry.percentage, 'number');
    }

    // Department distribution
    const deptRes = await fetch(`${baseUrl}/dashboard/department-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deptRes.status, 200);
    const deptBody = await deptRes.json();
    assert.strictEqual(deptBody.success, true);
    assert.ok(Array.isArray(deptBody.data));
    if (deptBody.data.length > 0) {
      const entry = deptBody.data[0];
      assert.ok('department' in entry);
      assert.ok('assetCount' in entry);
      assert.ok('assignedCount' in entry);
      assert.ok('availableCount' in entry);
      assert.ok('maintenanceCount' in entry);
      assert.ok('employeeCount' in entry);
    }

    // Status distribution
    const statusRes = await fetch(`${baseUrl}/dashboard/status-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.success, true);
    assert.ok(Array.isArray(statusBody.data));
    if (statusBody.data.length > 0) {
      const entry = statusBody.data[0];
      assert.ok('status' in entry);
      assert.ok('count' in entry);
      assert.ok('percentage' in entry);
    }

    // Vendor distribution
    const vendorRes = await fetch(`${baseUrl}/dashboard/vendor-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(vendorRes.status, 200);
    const vendorBody = await vendorRes.json();
    assert.strictEqual(vendorBody.success, true);
    assert.ok(Array.isArray(vendorBody.data));
    if (vendorBody.data.length > 0) {
      const entry = vendorBody.data[0];
      assert.ok('vendorName' in entry);
      assert.ok('assetCount' in entry);
      assert.ok('totalCostINR' in entry);
      assert.ok('percentage' in entry);
    }

    // Asset type distribution
    const typeRes = await fetch(`${baseUrl}/dashboard/type-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(typeRes.status, 200);
    const typeBody = await typeRes.json();
    assert.strictEqual(typeBody.success, true);
    assert.ok(Array.isArray(typeBody.data));
    if (typeBody.data.length > 0) {
      const entry = typeBody.data[0];
      assert.ok('assetType' in entry);
      assert.ok('count' in entry);
      assert.ok('percentage' in entry);
    }
  });

  // 7. Export Filter Alignment
  await t.test('7. Export Filter Forwarding: Generates filtered Excel sheet', async () => {
    const exportRes = await fetch(
      `${baseUrl}/export/assets/excel?category=Laptop&make=Dell&status=ASSIGNED`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert.strictEqual(exportRes.status, 200);
    assert.strictEqual(
      exportRes.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const buffer = await exportRes.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'Excel buffer must contain generated workbook data');
  });
});
