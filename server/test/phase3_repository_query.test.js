import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('Phase 3 Asset Repository & Query Service Layer Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire administrator token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    adminToken = body.data.token;
    assert.ok(adminToken, 'Admin token acquired');
  });

  // ─── TEST GROUP 1: Existing Search Regression ─────────────────────────────
  await t.test('Test Group 1: Search regression across name, serial, and technology', async () => {
    const res = await fetch(`${baseUrl}/assets?search=OptiPlex`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(a => 
      a.assetName.toLowerCase().includes('optiplex') || 
      a.model.toLowerCase().includes('optiplex')
    ));
  });

  // ─── TEST GROUP 2: Existing Pagination Regression ─────────────────────────
  await t.test('Test Group 2: Pagination returns correct page, limit, total, totalPages', async () => {
    const res = await fetch(`${baseUrl}/assets?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 2);
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 2);
    assert.ok(body.pagination.total >= 10);
    assert.strictEqual(body.pagination.totalPages, Math.ceil(body.pagination.total / 2));
    assert.strictEqual(body.pagination.hasNext, true);
    assert.strictEqual(body.pagination.hasPrev, false);
  });

  // ─── TEST GROUP 3: Existing Sorting Regression ────────────────────────────
  await t.test('Test Group 3: Sorting ordering operates on specified fields', async () => {
    const resAsc = await fetch(`${baseUrl}/assets?sortBy=assetId&sortOrder=asc&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyAsc = await resAsc.json();
    assert.strictEqual(resAsc.status, 200);
    assert.ok(bodyAsc.data.length >= 2);
    for (let i = 0; i < bodyAsc.data.length - 1; i++) {
      assert.ok(bodyAsc.data[i].assetId.localeCompare(bodyAsc.data[i + 1].assetId) <= 0);
    }
  });

  // ─── TEST GROUP 4: Make Filter ────────────────────────────────────────────
  await t.test('Test Group 4: Make filter isolates specified manufacturer (Dell, HP)', async () => {
    // Filter Dell
    const dellRes = await fetch(`${baseUrl}/assets?make=Dell`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(dellRes.status, 200);
    const dellBody = await dellRes.json();
    assert.ok(dellBody.data.length > 0);
    assert.ok(dellBody.data.every(a => a.make.toLowerCase() === 'dell'));

    // Filter HP
    const hpRes = await fetch(`${baseUrl}/assets?make=HP`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(hpRes.status, 200);
    const hpBody = await hpRes.json();
    assert.ok(hpBody.data.length > 0);
    assert.ok(hpBody.data.every(a => a.make.toLowerCase() === 'hp'));
  });

  // ─── TEST GROUP 5: Model Filter ───────────────────────────────────────────
  await t.test('Test Group 5: Model filter isolates specific equipment model', async () => {
    const res = await fetch(`${baseUrl}/assets?model=OptiPlex%207090%20MT`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(a => a.model.toLowerCase() === 'optiplex 7090 mt'));
  });

  // ─── TEST GROUP 6: Technology Filter ──────────────────────────────────────
  await t.test('Test Group 6: Technology filter isolates specific technology', async () => {
    // Register an asset with a distinct technology to verify query filter
    const createRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Enterprise NVMe Storage Array',
        category: 'IT Equipment',
        assetType: 'STORAGE',
        make: 'Samsung',
        model: 'PM9A3 NVMe',
        technology: 'NVMe SSD',
        serialNumber: 'NVME-SAM-9901',
        installDate: '2026-01-01',
        warrantyEndDate: '2029-01-01',
        department: 'Airport Systems & Information Technology',
        floor: 'Data Center',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(createRes.status, 201);

    const queryRes = await fetch(`${baseUrl}/assets?technology=NVMe%20SSD`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(queryRes.status, 200);
    const queryBody = await queryRes.json();
    assert.ok(queryBody.data.length > 0);
    assert.ok(queryBody.data.every(a => a.technology.toLowerCase() === 'nvme ssd'));
  });

  // ─── TEST GROUP 7: Combined Filters ───────────────────────────────────────
  await t.test('Test Group 7: Combined category + assetType + make + status AND evaluation', async () => {
    const res = await fetch(`${baseUrl}/assets?category=Desktop%20PC&assetType=DESKTOP&make=Dell&status=ASSIGNED`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(a => 
      (a.category === 'Desktop PC' || a.category === 'IT Equipment') &&
      a.assetType === 'DESKTOP' &&
      a.make.toLowerCase() === 'dell' &&
      a.status === 'ASSIGNED'
    ));
  });

  // ─── TEST GROUP 8: Case-Insensitive Filter Behavior ───────────────────────
  await t.test('Test Group 8: Case variations (Dell, dell, DELL) return equivalent results', async () => {
    const resUpper = await fetch(`${baseUrl}/assets?make=DELL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const resLower = await fetch(`${baseUrl}/assets?make=dell`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const resMixed = await fetch(`${baseUrl}/assets?make=Dell`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const bodyUpper = await resUpper.json();
    const bodyLower = await resLower.json();
    const bodyMixed = await resMixed.json();

    assert.strictEqual(bodyUpper.data.length, bodyMixed.data.length);
    assert.strictEqual(bodyLower.data.length, bodyMixed.data.length);
  });

  // ─── TEST GROUP 9: Empty Filters Baseline ─────────────────────────────────
  await t.test('Test Group 9: Empty filters return standard baseline dataset', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.pagination.total >= 10);
  });

  // ─── TEST GROUP 10: Unknown Filter Values ─────────────────────────────────
  await t.test('Test Group 10: Non-matching filter returns zero items without crashing', async () => {
    const res = await fetch(`${baseUrl}/assets?make=NonExistingBrandXYZ999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 0);
    assert.strictEqual(body.pagination.total, 0);
  });

  // ─── TEST GROUP 11: Pagination + Filtering Combined ───────────────────────
  await t.test('Test Group 11: Filtering combined with pagination limits correctly', async () => {
    const res = await fetch(`${baseUrl}/assets?make=Dell&page=1&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.length, 1);
    assert.ok(body.pagination.total >= 1);
  });

  // ─── TEST GROUP 12: In-Memory Repository Direct Query Verification ────────
  await t.test('Test Group 12: In-memory repository direct query verification', async () => {
    // Query directly on assetRepository to verify in-memory behavior
    const result = await assetRepository.find({
      make: 'Dell',
      limit: 5
    });
    assert.ok(result.items.length > 0);
    assert.ok(result.items.every(a => (a.make || '').toLowerCase() === 'dell'));

    const techResult = await assetRepository.find({
      technology: 'NVMe SSD'
    });
    assert.ok(techResult.items.length > 0);
    assert.ok(techResult.items.every(a => (a.technology || '').toLowerCase() === 'nvme ssd'));

    const noMatch = await assetRepository.find({
      make: 'NoSuchBrandRandom'
    });
    assert.strictEqual(noMatch.items.length, 0);
    assert.strictEqual(noMatch.total, 0);
  });
});
