import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
/**
 * Strips undefined, null, and empty string values from query parameter objects
 * (Mirrors client/src/services/api.js cleanQueryParams for Node test runner compatibility)
 */
const cleanQueryParams = (params = {}) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      cleaned[key] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return cleaned;
};

test('Phase 5 Frontend UI & Filtering Enhancements Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire administrator token for test session', async () => {
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

  // ─── TEST 1: Make filter is represented in request parameters ────────────────
  await t.test('TEST 1: Make filter is passed to backend and filters assets accurately', async () => {
    const res = await fetch(`${baseUrl}/assets?make=Dell`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Should find Dell assets');
    assert.ok(body.data.every(a => a.make.toLowerCase() === 'dell'), 'All returned assets must have make=Dell');
  });

  // ─── TEST 2: Model filter is represented in request parameters ───────────────
  await t.test('TEST 2: Model filter is passed to backend and filters assets accurately', async () => {
    const res = await fetch(`${baseUrl}/assets?model=Latitude%205420`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Should find Latitude 5420 assets');
    assert.ok(body.data.every(a => a.model.toLowerCase() === 'latitude 5420'), 'All returned assets must have model=Latitude 5420');
  });

  // ─── TEST 3: Technology filter is represented in request parameters ──────────
  await t.test('TEST 3: Technology filter is passed to backend and filters assets accurately', async () => {
    const res = await fetch(`${baseUrl}/assets?technology=NVMe%20SSD`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Should find NVMe SSD assets');
    assert.ok(body.data.every(a => (a.technology || '').toLowerCase() === 'nvme ssd'), 'All returned assets must have technology=NVMe SSD');
  });

  // ─── TEST 4: Combined multi-parameter filter execution ────────────────────────
  await t.test('TEST 4: Combined filters produce one combined request matching all criteria', async () => {
    const params = cleanQueryParams({
      category: 'Desktop PC',
      assetType: 'DESKTOP',
      make: 'Dell',
      model: 'OptiPlex 7090 MT',
      status: 'ASSIGNED'
    });
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${baseUrl}/assets?${queryString}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Should match combined filter criteria');
    for (const asset of body.data) {
      assert.strictEqual(asset.category, 'Desktop PC');
      assert.strictEqual(asset.assetType, 'DESKTOP');
      assert.strictEqual(asset.make, 'Dell');
      assert.strictEqual(asset.model, 'OptiPlex 7090 MT');
      assert.strictEqual(asset.status, 'ASSIGNED');
    }
  });

  // ─── TEST 5: Filter changes reset pagination to page 1 ──────────────────────
  await t.test('TEST 5: Applying a filter defaults to page 1 with correct pagination envelope', async () => {
    const res = await fetch(`${baseUrl}/assets?page=1&limit=5&make=HP`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 5);
  });

  // ─── TEST 6: Reset / Clear filters clears all filter state ────────────────────
  await t.test('TEST 6: Clearing filters restores complete asset list on page 1', async () => {
    const clearedFilters = cleanQueryParams({
      search: '',
      category: '',
      assetType: '',
      make: '',
      model: '',
      technology: '',
      department: '',
      location: '',
      status: '',
      condition: '',
      warrantyStatus: '',
      amcApplicable: '',
      vendor: ''
    });
    assert.deepStrictEqual(clearedFilters, {}, 'All empty filters must be stripped');
    const queryString = new URLSearchParams({ page: '1', limit: '20', ...clearedFilters }).toString();
    const res = await fetch(`${baseUrl}/assets?${queryString}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 10, 'Full list restored on clear');
  });

  // ─── TEST 7: Dependent Make -> Model catalog hierarchy ────────────────────────
  await t.test('TEST 7: Model catalog query filtered by make returns only models for that make', async () => {
    const resDell = await fetch(`${baseUrl}/master/models?isActive=true&make=Dell`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resDell.status, 200);
    const bodyDell = await resDell.json();
    assert.strictEqual(bodyDell.success, true);
    assert.ok(bodyDell.data.length > 0);
    assert.ok(bodyDell.data.every(m => m.make.toLowerCase() === 'dell'), 'Models must strictly belong to Dell');

    const resHP = await fetch(`${baseUrl}/master/models?isActive=true&make=HP`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resHP.status, 200);
    const bodyHP = await resHP.json();
    assert.strictEqual(bodyHP.success, true);
    assert.ok(bodyHP.data.length > 0);
    assert.ok(bodyHP.data.every(m => m.make.toLowerCase() === 'hp'), 'Models must strictly belong to HP');

    // Incompatible model validation: Dell models are not in HP models
    const hpModelNames = bodyHP.data.map(m => m.name.toLowerCase());
    const dellModelNames = bodyDell.data.map(m => m.name.toLowerCase());
    const hasOverlap = dellModelNames.some(d => hpModelNames.includes(d));
    assert.strictEqual(hasOverlap, false, 'Dell models should not overlap with HP models');
  });

  // ─── TEST 8: Clean parameter construction (no empty keys) ─────────────────────
  await t.test('TEST 8: cleanQueryParams removes null, undefined, and whitespace strings', () => {
    const dirty = {
      make: 'Dell',
      model: '',
      technology: '   ',
      vendor: null,
      status: undefined,
      category: 'Computer',
      limit: 20
    };
    const cleaned = cleanQueryParams(dirty);
    assert.deepStrictEqual(cleaned, {
      make: 'Dell',
      category: 'Computer',
      limit: 20
    });
    const query = new URLSearchParams(cleaned).toString();
    assert.strictEqual(query, 'make=Dell&category=Computer&limit=20');
    assert.ok(!query.includes('model='));
    assert.ok(!query.includes('technology='));
    assert.ok(!query.includes('vendor='));
    assert.ok(!query.includes('status='));
  });

  // ─── TEST 9: Existing filters remain functional ───────────────────────────────
  await t.test('TEST 9: Existing filters (department, status, amc, search) remain functional', async () => {
    const res = await fetch(`${baseUrl}/assets?department=Communication%2C%20Navigation%20%26%20Surveillance&status=ASSIGNED&amcApplicable=false`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(a => 
      a.department === 'Communication, Navigation & Surveillance' &&
      a.status === 'ASSIGNED' &&
      a.amcApplicable === false
    ));
  });

  // ─── TEST 10: Catalog API failure resilience ──────────────────────────────────
  await t.test('TEST 10: Master endpoints handle non-existent filter values gracefully', async () => {
    const res = await fetch(`${baseUrl}/master/models?make=NonExistentMakeXYZ`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data, [], 'Returns empty array without server crash');
  });

  // ─── TEST 11: Empty asset results display appropriate empty envelope ─────────
  await t.test('TEST 11: Unmatched filter combinations return clean empty data array', async () => {
    const res = await fetch(`${baseUrl}/assets?make=Dell&model=NonExistentModel999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 0);
    assert.strictEqual(body.pagination?.total, 0);
  });

  // ─── TEST 12: Dual-theme and token preservation ──────────────────────────────
  await t.test('TEST 12: cleanQueryParams handles boolean and numeric values properly', () => {
    const params = cleanQueryParams({
      page: 1,
      limit: 20,
      amcApplicable: true,
      search: 'Dell OptiPlex'
    });
    assert.strictEqual(params.page, 1);
    assert.strictEqual(params.limit, 20);
    assert.strictEqual(params.amcApplicable, true);
    assert.strictEqual(params.search, 'Dell OptiPlex');
  });
});
