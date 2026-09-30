import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 1 Master Data & Catalog Architecture Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // ─── 1. Authentication & Token Acquisition ────────────────────────────────
  await t.test('Acquire both Admin and Employee JWT tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200, 'Admin login must succeed');
    adminToken = adminBody.data.token;
    assert.ok(adminToken, 'Admin token acquired');

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee01', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200, 'Employee login must succeed');
    employeeToken = empBody.data.token;
    assert.ok(employeeToken, 'Employee token acquired');
  });

  // ─── 2. Auth Protection on Master Endpoints ───────────────────────────────
  await t.test('Master catalog endpoints reject unauthenticated requests (401)', async () => {
    const makesRes = await fetch(`${baseUrl}/master/makes`);
    assert.strictEqual(makesRes.status, 401, 'GET /master/makes requires authentication');

    const modelsRes = await fetch(`${baseUrl}/master/models`);
    assert.strictEqual(modelsRes.status, 401, 'GET /master/models requires authentication');

    const techRes = await fetch(`${baseUrl}/master/technologies`);
    assert.strictEqual(techRes.status, 401, 'GET /master/technologies requires authentication');
  });

  // ─── 3. Read Access for Authenticated Users ──────────────────────────────
  await t.test('Authenticated users can fetch full list of Makes (Brands)', async () => {
    const res = await fetch(`${baseUrl}/master/makes`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 10, 'Expected at least 10 seeded makes');
    assert.ok(body.data.some(m => m.name === 'Dell'), 'Dell must be seeded');
    assert.ok(body.data.some(m => m.name === 'HP'), 'HP must be seeded');
    assert.ok(body.data.some(m => m.name === 'APC'), 'APC must be seeded');
    assert.ok(body.data.some(m => m.name === 'Cisco'), 'Cisco must be seeded');
  });

  await t.test('Authenticated users can fetch full list of Models', async () => {
    const res = await fetch(`${baseUrl}/master/models`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 15, 'Expected at least 15 seeded models');
    assert.ok(body.data.some(m => m.name === 'OptiPlex 7090 MT' && m.make === 'Dell'));
    assert.ok(body.data.some(m => m.name === 'ThinkPad T14' && m.make === 'Lenovo'));
    assert.ok(body.data.some(m => m.name === 'Catalyst 2960' && m.make === 'Cisco'));
  });

  await t.test('Authenticated users can fetch full list of Technologies', async () => {
    const res = await fetch(`${baseUrl}/master/technologies`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 10, 'Expected at least 10 seeded technologies');
    assert.ok(body.data.some(t => t.name === 'IPS'));
    assert.ok(body.data.some(t => t.name === 'Laser'));
    assert.ok(body.data.some(t => t.name === 'Line-Interactive'));
    assert.ok(body.data.some(t => t.name === 'Managed L2'));
  });

  // ─── 4. Dependent Cascading Filter Queries ────────────────────────────────
  await t.test('Filter Makes by Category (Power -> APC, Microtek)', async () => {
    const res = await fetch(`${baseUrl}/master/makes?category=Power`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const names = body.data.map(m => m.name);
    assert.ok(names.includes('APC'), 'Power makes should include APC');
    assert.ok(names.includes('Microtek'), 'Power makes should include Microtek');
    assert.strictEqual(names.includes('Apple'), false, 'Apple should not be in Power category');
  });

  await t.test('Filter Makes by Asset Type (PRINTER -> HP, Canon, Epson)', async () => {
    const res = await fetch(`${baseUrl}/master/makes?assetType=PRINTER`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const names = body.data.map(m => m.name);
    assert.ok(names.includes('HP'));
    assert.ok(names.includes('Canon'));
    assert.ok(names.includes('Epson'));
    assert.strictEqual(names.includes('Cisco'), false);
  });

  await t.test('Filter Models by Make and Asset Type (Dell + LAPTOP -> Latitude)', async () => {
    const res = await fetch(`${baseUrl}/master/models?make=Dell&assetType=LAPTOP`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
    body.data.forEach(m => {
      assert.strictEqual(m.make, 'Dell');
      assert.strictEqual(m.assetType, 'LAPTOP');
    });
  });

  await t.test('Filter Technologies by Category and Asset Type', async () => {
    const res = await fetch(`${baseUrl}/master/technologies?category=Power`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const names = body.data.map(t => t.name);
    assert.ok(names.includes('Line-Interactive'));
    assert.ok(names.includes('Online Double-Conversion'));
    assert.strictEqual(names.includes('Laser'), false);

    const monRes = await fetch(`${baseUrl}/master/technologies?assetType=MONITOR`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const monBody = await monRes.json();
    const monTechs = monBody.data.map(t => t.name);
    assert.ok(monTechs.includes('IPS'));
    assert.ok(monTechs.includes('LED'));
  });

  // ─── 5. RBAC Protection on Master Data Mutations ──────────────────────────
  await t.test('Non-Admin (Employee) is forbidden from creating master records (403)', async () => {
    const makeRes = await fetch(`${baseUrl}/master/makes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ name: 'Unauthorized Make' })
    });
    assert.strictEqual(makeRes.status, 403, 'Employee cannot create Make');

    const modelRes = await fetch(`${baseUrl}/master/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ name: 'Unauthorized Model', make: 'Dell' })
    });
    assert.strictEqual(modelRes.status, 403, 'Employee cannot create Model');

    const techRes = await fetch(`${baseUrl}/master/technologies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ name: 'Unauthorized Technology' })
    });
    assert.strictEqual(techRes.status, 403, 'Employee cannot create Technology');
  });

  // ─── 6. Admin Master Data Lifecycle (Create, Validate, Duplicate, Update, Delete) ─
  let createdMakeId = '';
  let createdModelId = '';
  let createdTechId = '';

  await t.test('Admin Make CRUD with validation and duplicate prevention', async () => {
    // Missing required name
    const invalidRes = await fetch(`${baseUrl}/master/makes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ description: 'No Name' })
    });
    assert.strictEqual(invalidRes.status, 400, 'Make with missing name must return 400');

    // Valid create
    const createRes = await fetch(`${baseUrl}/master/makes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Acer',
        code: 'ACER',
        categories: ['IT Equipment'],
        assetTypes: ['DESKTOP', 'LAPTOP'],
        description: 'Acer Inc. Personal Computers'
      })
    });
    assert.strictEqual(createRes.status, 201, 'Admin can create Make');
    const createBody = await createRes.json();
    assert.strictEqual(createBody.data.name, 'Acer');
    createdMakeId = createBody.data._id;
    assert.ok(createdMakeId);

    // Duplicate create prevention
    const dupRes = await fetch(`${baseUrl}/master/makes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'acer', // case-insensitive test
        code: 'ACER2'
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate make name must return 409 Conflict');

    // Update make
    const updateRes = await fetch(`${baseUrl}/master/makes/${createdMakeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        description: 'Updated Acer Inc. Description'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.data.description, 'Updated Acer Inc. Description');

    // Delete (deactivate) make
    const deleteRes = await fetch(`${baseUrl}/master/makes/${createdMakeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  await t.test('Admin Model CRUD with validation and duplicate prevention', async () => {
    // Missing required make
    const invalidRes = await fetch(`${baseUrl}/master/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Model Without Make' })
    });
    assert.strictEqual(invalidRes.status, 400);

    // Valid create
    const createRes = await fetch(`${baseUrl}/master/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'TravelMate P2',
        make: 'Acer',
        category: 'IT Equipment',
        assetType: 'LAPTOP',
        description: 'Business laptop'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    assert.strictEqual(createBody.data.name, 'TravelMate P2');
    createdModelId = createBody.data._id;

    // Duplicate create
    const dupRes = await fetch(`${baseUrl}/master/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'travelmate p2',
        make: 'acer',
        assetType: 'LAPTOP'
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate model for make must return 409');

    // Update model
    const updateRes = await fetch(`${baseUrl}/master/models/${createdModelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        description: 'Updated TravelMate P2 specs'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.data.description, 'Updated TravelMate P2 specs');

    // Delete model
    const deleteRes = await fetch(`${baseUrl}/master/models/${createdModelId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  await t.test('Admin Technology CRUD with validation and duplicate prevention', async () => {
    // Missing required name
    const invalidRes = await fetch(`${baseUrl}/master/technologies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ category: 'IT Equipment' })
    });
    assert.strictEqual(invalidRes.status, 400);

    // Valid create
    const createRes = await fetch(`${baseUrl}/master/technologies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Quantum Dot OLED',
        category: 'IT Equipment',
        assetTypes: ['MONITOR'],
        description: 'QD-OLED display panel'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    assert.strictEqual(createBody.data.name, 'Quantum Dot OLED');
    createdTechId = createBody.data._id;

    // Duplicate create
    const dupRes = await fetch(`${baseUrl}/master/technologies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Quantum Dot OLED',
        category: 'IT Equipment'
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate technology must return 409');

    // Update technology
    const updateRes = await fetch(`${baseUrl}/master/technologies/${createdTechId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        description: 'Next-gen QD-OLED display panel'
      })
    });
    assert.strictEqual(updateRes.status, 200);

    // Delete technology
    const deleteRes = await fetch(`${baseUrl}/master/technologies/${createdTechId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteRes.status, 200);
  });

  // ─── 7. Backward Compatibility: Asset String Make & Model ────────────────
  await t.test('Existing Asset retains plain string make and model and optional technology', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.make, 'Dell');
    assert.strictEqual(body.data.model, 'OptiPlex 7090 MT');
    assert.strictEqual(typeof body.data.make, 'string');
    assert.strictEqual(typeof body.data.model, 'string');
  });
});
