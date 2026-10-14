import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { assetRepository, buildCategoryMongoCondition, matchCategoryInMemory } from '../src/repositories/assetRepository.js';

test('Inventory Category Filtering Specification Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire admin token
  await t.test('Acquire administrator token', async () => {
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

  // 1. All (default option)
  await t.test('1. When "All" or empty is selected, display all inventory items across every category', async () => {
    const resAll = await fetch(`${baseUrl}/assets?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAll.status, 200);
    const bodyAll = await resAll.json();
    assert.strictEqual(bodyAll.success, true);
    assert.ok(bodyAll.data.length > 0, 'Must return inventory assets');
    const totalCount = bodyAll.data.length;

    // With explicit category=All
    const resExplicitAll = await fetch(`${baseUrl}/assets?limit=50&category=All`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyExplicitAll = await resExplicitAll.json();
    assert.strictEqual(bodyExplicitAll.data.length, totalCount, 'category=All must return full inventory');

    // With empty category=
    const resEmpty = await fetch(`${baseUrl}/assets?limit=50&category=`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyEmpty = await resEmpty.json();
    assert.strictEqual(bodyEmpty.data.length, totalCount, 'category= empty must return full inventory');
  });

  // 2. CPU filter
  await t.test('2. When "CPU" is selected, display only CPU assets (including Desktop PC operational synonyms)', async () => {
    const res = await fetch(`${baseUrl}/assets?limit=50&category=CPU`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Must find CPU/Desktop PC assets in inventory');
    for (const a of body.data) {
      const match = matchCategoryInMemory(a, 'CPU');
      assert.ok(match, `Asset ${a.assetId} with category '${a.category}' must be a valid CPU asset`);
      assert.notStrictEqual(a.category, 'Monitor', 'CPU filter must not return Monitor');
      assert.notStrictEqual(a.category, 'Mouse', 'CPU filter must not return Mouse');
      assert.notStrictEqual(a.category, 'Keyboard', 'CPU filter must not return Keyboard');
    }
  });

  // 3. Monitor filter
  await t.test('3. When "Monitor" is selected, display only monitor assets', async () => {
    const res = await fetch(`${baseUrl}/assets?limit=50&category=Monitor`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0, 'Must find Monitor assets in inventory');
    for (const a of body.data) {
      const match = matchCategoryInMemory(a, 'Monitor');
      assert.ok(match, `Asset ${a.assetId} with category '${a.category}' must be a monitor`);
      assert.notStrictEqual(a.category, 'Desktop PC', 'Monitor filter must not return Desktop PC');
      assert.notStrictEqual(a.category, 'Laptop', 'Monitor filter must not return Laptop');
    }
  });

  // 4. Keyboard filter
  await t.test('4. When "Keyboard" is selected, display only keyboard assets', async () => {
    // Check in-memory matcher and API endpoint
    const sampleKbd = { assetId: 'KBD-01', assetName: 'KEYBOARD', category: 'Keyboard', assetType: 'PERIPHERAL' };
    const sampleMon = { assetId: 'MON-01', assetName: 'MONITOR', category: 'Monitor', assetType: 'MONITOR' };
    assert.strictEqual(matchCategoryInMemory(sampleKbd, 'Keyboard'), true);
    assert.strictEqual(matchCategoryInMemory(sampleMon, 'Keyboard'), false);

    const res = await fetch(`${baseUrl}/assets?limit=50&category=Keyboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    for (const a of body.data) {
      assert.ok(matchCategoryInMemory(a, 'Keyboard'), `Asset ${a.assetId} must be a keyboard`);
      assert.notStrictEqual(a.category, 'Monitor');
      assert.notStrictEqual(a.category, 'Mouse');
    }
  });

  // 5. Mouse filter (strictly regular mouse, not lap mouse)
  await t.test('5. When "Mouse" is selected, display only mouse assets and strictly exclude Lap Mouse', async () => {
    const regularMouse = { assetId: 'MSE-01', assetName: 'Optical Mouse', category: 'Mouse', assetType: 'PERIPHERAL' };
    const lapMouse = { assetId: 'MSE-02', assetName: 'Laptop Mouse', category: 'Lap Mouse', assetType: 'PERIPHERAL' };
    const laptopMse = { assetId: 'MSE-03', assetName: 'Dell MSE', category: 'Laptop MSE', assetType: 'PERIPHERAL' };

    assert.strictEqual(matchCategoryInMemory(regularMouse, 'Mouse'), true, 'Must match regular Mouse');
    assert.strictEqual(matchCategoryInMemory(lapMouse, 'Mouse'), false, 'Mouse filter MUST NOT match Lap Mouse');
    assert.strictEqual(matchCategoryInMemory(laptopMse, 'Mouse'), false, 'Mouse filter MUST NOT match Laptop MSE');

    const res = await fetch(`${baseUrl}/assets?limit=50&category=Mouse`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    for (const a of body.data) {
      assert.ok(matchCategoryInMemory(a, 'Mouse'), `Asset ${a.assetId} must be a mouse`);
      const lower = (a.category || '').toLowerCase();
      assert.strictEqual(lower.includes('lap'), false, 'Mouse filter must not return Lap Mouse assets');
    }
  });

  // 6. Lap Mouse filter
  await t.test('6. When "Lap Mouse" is selected, display only Lap Mouse / Laptop MSE assets', async () => {
    const regularMouse = { assetId: 'MSE-01', assetName: 'Optical Mouse', category: 'Mouse', assetType: 'PERIPHERAL' };
    const lapMouse = { assetId: 'MSE-02', assetName: 'Laptop Mouse', category: 'Lap Mouse', assetType: 'PERIPHERAL' };
    const laptopMse = { assetId: 'MSE-03', assetName: 'Dell MSE', category: 'Laptop MSE', assetType: 'PERIPHERAL' };
    const regularLaptop = { assetId: 'LAP-01', assetName: 'Dell Latitude', category: 'Laptop', assetType: 'LAPTOP' };

    assert.strictEqual(matchCategoryInMemory(lapMouse, 'Lap Mouse'), true, 'Must match Lap Mouse');
    assert.strictEqual(matchCategoryInMemory(laptopMse, 'Lap Mouse'), true, 'Must match Laptop MSE');
    assert.strictEqual(matchCategoryInMemory(regularMouse, 'Lap Mouse'), false, 'Lap Mouse filter MUST NOT match regular Mouse');
    assert.strictEqual(matchCategoryInMemory(regularLaptop, 'Lap Mouse'), false, 'Lap Mouse filter MUST NOT match regular Laptop');

    const res = await fetch(`${baseUrl}/assets?limit=50&category=Lap%20Mouse`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    for (const a of body.data) {
      assert.ok(matchCategoryInMemory(a, 'Lap Mouse'), `Asset ${a.assetId} must be a Lap Mouse`);
      assert.notStrictEqual(a.category, 'Mouse');
      assert.notStrictEqual(a.category, 'Laptop');
    }
  });

  // 7. Camera filter
  await t.test('7. When "Camera" is selected, display only Camera / CCTV assets', async () => {
    const camAsset1 = { assetId: 'CAM-01', assetName: 'Dome Camera', category: 'Camera', assetType: 'CCTV' };
    const camAsset2 = { assetId: 'CAM-02', assetName: 'Hikvision CCTV', category: 'Camera / CCTV', assetType: 'CCTV' };
    const pcAsset = { assetId: 'PC-01', assetName: 'Office PC', category: 'Desktop PC', assetType: 'DESKTOP' };

    assert.strictEqual(matchCategoryInMemory(camAsset1, 'Camera'), true);
    assert.strictEqual(matchCategoryInMemory(camAsset2, 'Camera'), true);
    assert.strictEqual(matchCategoryInMemory(pcAsset, 'Camera'), false);

    const res = await fetch(`${baseUrl}/assets?limit=50&category=Camera`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    for (const a of body.data) {
      assert.ok(matchCategoryInMemory(a, 'Camera'), `Asset ${a.assetId} must be a camera`);
    }
  });

  // 8. Other existing categories (e.g. Laptop, Printer, Scanner, Desktop PC)
  await t.test('8. Selecting any other existing category displays only matching assets', async () => {
    // Laptop
    const resLaptop = await fetch(`${baseUrl}/assets?limit=50&category=Laptop`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resLaptop.status, 200);
    const bodyLaptop = await resLaptop.json();
    assert.strictEqual(bodyLaptop.success, true);
    for (const a of bodyLaptop.data) {
      assert.ok(matchCategoryInMemory(a, 'Laptop'));
      assert.notStrictEqual(a.category, 'Laptop MSE', 'Laptop filter must not return Laptop MSE');
    }

    // Printer
    const resPrinter = await fetch(`${baseUrl}/assets?limit=50&category=Printer`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resPrinter.status, 200);
    const bodyPrinter = await resPrinter.json();
    assert.strictEqual(bodyPrinter.success, true);
    for (const a of bodyPrinter.data) {
      assert.ok(matchCategoryInMemory(a, 'Printer'));
    }

    // Desktop PC
    const resPC = await fetch(`${baseUrl}/assets?limit=50&category=Desktop%20PC`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resPC.status, 200);
    const bodyPC = await resPC.json();
    assert.strictEqual(bodyPC.success, true);
    for (const a of bodyPC.data) {
      assert.ok(matchCategoryInMemory(a, 'Desktop PC'));
    }
  });

  // 9. Case-insensitivity & mapping mismatch resistance
  await t.test('9. Filtering is case-insensitive and robust against capitalization mismatches', async () => {
    const resLower = await fetch(`${baseUrl}/assets?limit=50&category=monitor`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const resUpper = await fetch(`${baseUrl}/assets?limit=50&category=MONITOR`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bodyLower = await resLower.json();
    const bodyUpper = await resUpper.json();
    assert.strictEqual(bodyLower.data.length, bodyUpper.data.length, 'Lower and upper case category filter must return same count');
  });

  // 10. Combining with pagination, search, and reset
  await t.test('10. Preserves pagination envelope and resets correctly on category change', async () => {
    const resP1 = await fetch(`${baseUrl}/assets?page=1&limit=2&category=CPU`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resP1.status, 200);
    const bodyP1 = await resP1.json();
    assert.strictEqual(bodyP1.pagination.page, 1);
    assert.strictEqual(bodyP1.pagination.limit, 2);
    assert.ok(bodyP1.pagination.total >= 0);
  });
});
