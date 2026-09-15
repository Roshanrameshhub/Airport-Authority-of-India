import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { excelFieldService, CORE_LOCKED_FIELDS } from '../src/services/excelFieldService.js';
import { matchHeader } from '../src/services/columnMappingService.js';

test('Admin-Managed Excel Fields & Dynamic Template Pipeline Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire auth tokens
  await t.test('Acquire auth tokens (Admin and Non-Admin)', async () => {
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
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    employeeToken = empBody.data?.token || '';
  });

  // Scenario 1: Preserving 13 Confirmed Core Business Fields as Locked
  await t.test('1. System preserves 13 confirmed core business fields with LOCKED / SYSTEM REQUIRED status', async () => {
    const res = await fetch(`${baseUrl}/excel-fields`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.fields.length >= 13);
    assert.strictEqual(body.data.metrics.coreLockedFields, 13);

    const lockedFields = body.data.fields.filter(f => f.isLocked);
    assert.strictEqual(lockedFields.length, 13);

    // Verify presence of all 13 core field names
    const expected13 = [
      'userName', 'designation', 'department', 'floor', 'employeeId',
      'assetName', 'make', 'model', 'serialNumber', 'installDate',
      'warrantyEndDate', 'operatingSystem', 'remarks'
    ];
    expected13.forEach(expectedKey => {
      const found = lockedFields.find(f => f.fieldId === expectedKey);
      assert.ok(found, `Expected locked field '${expectedKey}' must be present`);
      assert.strictEqual(found.isLocked, true, `'${expectedKey}' must have isLocked=true`);
    });
  });

  // Scenario 2: Non-Admin access rejection
  await t.test('2. Non-Admin (Employee) is forbidden from managing Excel fields', async () => {
    if (employeeToken) {
      const res = await fetch(`${baseUrl}/excel-fields`, {
        headers: { Authorization: `Bearer ${employeeToken}` }
      });
      assert.strictEqual(res.status, 403);
    }
  });

  // Scenario 3: Admin CANNOT delete or redefine core locked fields
  await t.test('3. Admin is prevented from deleting or editing system locked core fields', async () => {
    // Attempt deleting 'serialNumber'
    const delRes = await fetch(`${baseUrl}/excel-fields/serialNumber`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 403);

    // Attempt modifying 'serialNumber'
    const putRes = await fetch(`${baseUrl}/excel-fields/serialNumber`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ displayName: 'Custom Serial' })
    });
    assert.strictEqual(putRes.status, 403);

    // Attempt disabling core field
    const patchRes = await fetch(`${baseUrl}/excel-fields/serialNumber/toggle`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ property: 'enabled', value: false })
    });
    assert.strictEqual(patchRes.status, 403);
  });

  // Scenario 4: Admin creates configurable fields
  let testFieldId = 'purchaseOrderNumber';
  await t.test('4. Admin can create custom fields with types (TEXT, NUMBER, SELECT)', async () => {
    // 4a. Create PO Number
    const poRes = await fetch(`${baseUrl}/excel-fields`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Purchase Order Number',
        fieldName: 'purchaseOrderNumber',
        dataType: 'TEXT',
        required: false,
        enabled: true,
        importEnabled: true,
        exportEnabled: true,
        description: 'AAI GEM or SAP PO Reference number',
        aliases: ['po no', 'po number', 'order ref', 'purchase order']
      })
    });
    assert.strictEqual(poRes.status, 201);
    const poBody = await poRes.json();
    assert.strictEqual(poBody.data.fieldId, 'purchaseOrderNumber');
    assert.strictEqual(poBody.data.isLocked, false);
    assert.ok(poBody.data.sortOrder >= 14);

    // 4b. Create SELECT field: Asset Condition with allowed values
    const condRes = await fetch(`${baseUrl}/excel-fields`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Operational State',
        fieldName: 'operationalState',
        dataType: 'SELECT',
        options: ['Critical Active', 'Standby Reserve', 'Decommission Pending'],
        required: false,
        enabled: true,
        importEnabled: true,
        exportEnabled: true,
        description: 'Operational readiness state'
      })
    });
    assert.strictEqual(condRes.status, 201);
    const condBody = await condRes.json();
    assert.strictEqual(condBody.data.dataType, 'SELECT');
    assert.strictEqual(condBody.data.options.length, 3);
  });

  // Scenario 5: Prevent duplicate field creation
  await t.test('5. Prevent duplicate custom field creation', async () => {
    const dupRes = await fetch(`${baseUrl}/excel-fields`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Purchase Order Number',
        fieldName: 'purchaseOrderNumber',
        dataType: 'TEXT'
      })
    });
    assert.strictEqual(dupRes.status, 409);
  });

  // Scenario 6: Admin edits and toggles custom fields
  await t.test('6. Admin can edit description and toggle import/export on custom fields', async () => {
    // Edit description
    const editRes = await fetch(`${baseUrl}/excel-fields/purchaseOrderNumber`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Updated PO description for audit tracking'
      })
    });
    assert.strictEqual(editRes.status, 200);
    const editBody = await editRes.json();
    assert.strictEqual(editBody.data.description, 'Updated PO description for audit tracking');

    // Toggle exportEnabled OFF
    const toggleRes = await fetch(`${baseUrl}/excel-fields/purchaseOrderNumber/toggle`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ property: 'exportEnabled', value: false })
    });
    assert.strictEqual(toggleRes.status, 200);
    const toggleBody = await toggleRes.json();
    assert.strictEqual(toggleBody.data.exportEnabled, false);
  });

  // Scenario 7: Dynamic Excel Template Generation reflects enabled import fields
  await t.test('7. Dynamic Excel Template reflects active import fields', async () => {
    const res = await fetch(`${baseUrl}/import/template`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0] || [];
    // Core fields must be present
    assert.ok(headers.includes('User Name'));
    assert.ok(headers.includes('Serial Number'));
    // Newly created custom field with importEnabled=true should be dynamically included
    assert.ok(headers.includes('Purchase Order Number'), 'Custom field should be present in generated template');
    assert.ok(headers.includes('Operational State'), 'Custom SELECT field should be present in generated template');
  });

  // Scenario 8: Intelligent header mapping maps custom fields and aliases
  await t.test('8. Column mapping engine accurately matches custom field aliases', async () => {
    const importFields = await excelFieldService.getImportFields();

    const match1 = matchHeader('PO No', importFields);
    assert.strictEqual(match1.canonicalKey, 'purchaseOrderNumber');
    assert.strictEqual(match1.confidence, 'HIGH_CONFIDENCE');

    const match2 = matchHeader('Order Ref', importFields);
    assert.strictEqual(match2.canonicalKey, 'purchaseOrderNumber');
    assert.strictEqual(match2.confidence, 'HIGH_CONFIDENCE');

    const match3 = matchHeader('Operational State', importFields);
    assert.strictEqual(match3.canonicalKey, 'operationalState');
    assert.strictEqual(match3.confidence, 'HIGH_CONFIDENCE');
  });

  // Scenario 9: Safe Delete vs Disable protection
  await t.test('9. Safe Delete vs Disable protection allows deleting unused field', async () => {
    // Check usage
    const usageRes = await fetch(`${baseUrl}/excel-fields/operationalState/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(usageRes.status, 200);
    const usageBody = await usageRes.json();
    assert.strictEqual(usageBody.data.canDirectDelete, true);

    // Delete unused field
    const delRes = await fetch(`${baseUrl}/excel-fields/operationalState`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);
    const delBody = await delRes.json();
    assert.strictEqual(delBody.data.deleted, true);
  });
});
