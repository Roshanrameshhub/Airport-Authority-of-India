import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import officecrypto from 'officecrypto-tool';
import app from '../src/app.js';
import { CANONICAL_FIELDS, matchHeader, cleanHeaderText } from '../src/services/columnMappingService.js';
import { extractSheetRows, inspectWorkbook, parseExcelBuffer } from '../src/utils/excelParser.js';
import { reconcileAndCleanRows, areValuesConflicting, normalizeMake } from '../src/services/dataReconciliationService.js';
import { exportService } from '../src/services/exportService.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('AAI-AMS Phase 4: Excel Import & Export Alignment Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  // Helper to create workbook buffers
  const makeWorkbookBuffer = (sheetDataMap) => {
    const wb = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(sheetDataMap)) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  };

  // Auth setup
  await t.test('Acquire Admin authentication token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    adminToken = body.data.token;
    assert.ok(adminToken);
  });

  // ------------------------------------------------------------
  // TEST 1 — Existing import regression
  // ------------------------------------------------------------
  await t.test('TEST 1: Existing import regression — single file validation continues working', async () => {
    const headers = [
      'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
      'Asset Name', 'Make / Company', 'Model', 'Serial Number',
      'Install Date', 'Warranty End Date', 'Type of OS', 'Remarks'
    ];
    const data = [
      headers,
      [
        'Muruganandam V', 'Senior Manager', 'Information Technology',
        '2nd Floor, Admin Block', 'AAI-10021', 'Dell OptiPlex 7090', 'Dell',
        'OptiPlex 7090', 'SN-P4-REG-001', '2024-02-01', '2027-02-01',
        'Windows 11 Pro', 'Regression test unit'
      ]
    ];

    const buf = makeWorkbookBuffer({ 'Sheet1': data });
    const formData = new FormData();
    formData.append('file', new Blob([buf]), 'regression_single.xlsx');

    const res = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.validCount, 1);
    assert.strictEqual(body.data.invalidCount, 0);
  });

  // ------------------------------------------------------------
  // TEST 2 — Make mapping
  // ------------------------------------------------------------
  await t.test('TEST 2: Make mapping — headers correctly map to canonical "make"', async () => {
    const testHeaders = ['Make', 'MAKE', 'Make / Company', 'Brand', 'brand name', 'Manufacturer', 'OEM', 'Vendor'];
    for (const hdr of testHeaders) {
      const match = matchHeader(hdr);
      assert.strictEqual(match.canonicalKey, 'make', `Header "${hdr}" should map to canonical key "make"`);
      assert.strictEqual(match.confidence, 'HIGH_CONFIDENCE');
    }
  });

  // ------------------------------------------------------------
  // TEST 3 — Model mapping
  // ------------------------------------------------------------
  await t.test('TEST 3: Model mapping — headers correctly map to canonical "model"', async () => {
    const testHeaders = ['Model', 'MODEL', 'Model No', 'Model Number', 'model name', 'Equipment Model', 'Machine Model', 'Hardware Model', 'type/model'];
    for (const hdr of testHeaders) {
      const match = matchHeader(hdr);
      assert.strictEqual(match.canonicalKey, 'model', `Header "${hdr}" should map to canonical key "model"`);
      assert.strictEqual(match.confidence, 'HIGH_CONFIDENCE');
    }
  });

  // ------------------------------------------------------------
  // TEST 4 — Technology mapping
  // ------------------------------------------------------------
  await t.test('TEST 4: Technology mapping — headers correctly map to canonical "technology"', async () => {
    const testHeaders = ['Technology', 'TECHNOLOGY', 'Tech', 'Technology Type', 'Display Technology', 'Storage Technology', 'Printing Technology'];
    for (const hdr of testHeaders) {
      const match = matchHeader(hdr);
      assert.strictEqual(match.canonicalKey, 'technology', `Header "${hdr}" should map to canonical key "technology"`);
      assert.strictEqual(match.confidence, 'HIGH_CONFIDENCE');
    }
    assert.ok(CANONICAL_FIELDS.technology, 'CANONICAL_FIELDS must contain technology');
    assert.strictEqual(CANONICAL_FIELDS.technology.key, 'technology');
    assert.strictEqual(CANONICAL_FIELDS.technology.label, 'Technology');
  });

  // ------------------------------------------------------------
  // TEST 5 — Multi-sheet preservation
  // ------------------------------------------------------------
  await t.test('TEST 5: Multi-sheet preservation — make, model, technology survive multi-sheet reconciliation', async () => {
    const multiSheetBuf = makeWorkbookBuffer({
      'CPU': [
        ['SERIAL NO', 'MAKE', 'MODEL', 'DEPARTMENT', 'FLOOR'],
        ['SN-P4-MS-001', 'Dell', 'OptiPlex 7090 MT', 'CNS', '2nd Floor']
      ],
      'IP & MAC': [
        ['SERIAL NO', 'IP ADDRESS', 'MAC ADDRESS', 'TECHNOLOGY'],
        ['SN-P4-MS-001', '10.10.10.45', 'AA:BB:CC:DD:EE:01', 'NVMe SSD']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([multiSheetBuf]), 'p4_multisheet.xlsx');

    // 1. Analyze
    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    assert.strictEqual(anaRes.status, 200);
    const anaBody = await anaRes.json();
    const token = anaBody.data.importToken;
    assert.ok(token);

    // 2. Reconcile
    const recRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.data.stagedAssets.length, 1);

    const merged = recBody.data.stagedAssets[0];
    assert.strictEqual(merged.serialNumber, 'SN-P4-MS-001');
    assert.strictEqual(merged.make, 'Dell');
    assert.strictEqual(merged.model, 'OptiPlex 7090 MT');
    assert.strictEqual(merged.technology, 'NVMe SSD');
    assert.strictEqual(merged.ipAddress, '10.10.10.45');
  });

  // ------------------------------------------------------------
  // TEST 6 — Blank field handling
  // ------------------------------------------------------------
  await t.test('TEST 6: Blank field handling — incoming blanks do not destroy existing values during UPDATE', async () => {
    // 1. Create baseline asset directly in repository
    const baselineSerial = 'SN-P4-BLANK-001';
    await assetRepository.create({
      assetId: 'AAI-P4-TST-0001',
      assetName: 'Baseline Workstation',
      category: 'Desktop PC',
      assetType: 'DESKTOP',
      make: 'Dell',
      model: 'OptiPlex 7090 MT',
      technology: 'NVMe SSD',
      serialNumber: baselineSerial,
      department: 'Information Technology',
      floor: '2nd Floor',
      installDate: new Date('2024-01-15'),
      warrantyStartDate: new Date('2024-01-15'),
      warrantyEndDate: new Date('2027-01-15')
    });

    // 2. Upload workbook with blank model and blank technology for the same serial
    const updateBuf = makeWorkbookBuffer({
      'UpdateSheet': [
        ['SERIAL NO', 'MAKE', 'MODEL', 'TECHNOLOGY', 'REMARKS'],
        [baselineSerial, 'Dell', '', '', 'Updating remarks only']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([updateBuf]), 'blank_update.xlsx');

    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const anaBody = await anaRes.json();
    const token = anaBody.data.importToken;

    await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 3. Commit with UPDATE_EXISTING strategy
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        importToken: token,
        conflictStrategy: 'UPDATE_EXISTING'
      })
    });
    assert.strictEqual(commitRes.status, 200);

    // 4. Verify existing asset retains original valid model and technology
    const updated = await assetRepository.findBySerialNumber(baselineSerial);
    assert.strictEqual(updated.make, 'Dell');
    assert.strictEqual(updated.model, 'OptiPlex 7090 MT', 'Valid existing model must NOT be erased by blank incoming cell');
    assert.strictEqual(updated.technology, 'NVMe SSD', 'Valid existing technology must NOT be erased by blank incoming cell');
  });

  // ------------------------------------------------------------
  // TEST 7 — Legacy workbook compatibility
  // ------------------------------------------------------------
  await t.test('TEST 7: Legacy workbook compatibility — workbook without technology imports successfully', async () => {
    const legacyBuf = makeWorkbookBuffer({
      'LegacySheet': [
        ['SERIAL NUMBER', 'MAKE', 'MODEL', 'ASSET NAME', 'DEPARTMENT', 'FLOOR'],
        ['SN-P4-LEG-001', 'HP', 'ProDesk 400', 'Desktop PC', 'Finance', '1st Floor']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([legacyBuf]), 'legacy_no_tech.xlsx');

    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const anaBody = await anaRes.json();
    const token = anaBody.data.importToken;

    const recRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const recBody = await recRes.json();
    assert.strictEqual(recBody.data.stagedAssets.length, 1);
    assert.strictEqual(recBody.data.stagedAssets[0].make, 'HP');
    assert.strictEqual(recBody.data.stagedAssets[0].model, 'ProDesk 400');
    assert.strictEqual(recBody.data.stagedAssets[0].technology, '', 'Empty technology defaults safely to empty string');
  });

  // ------------------------------------------------------------
  // TEST 8 — Unknown catalog values
  // ------------------------------------------------------------
  await t.test('TEST 8: Unknown catalog values — unknown make/model/technology strings import cleanly', async () => {
    const unknownBuf = makeWorkbookBuffer({
      'CustomData': [
        ['SERIAL NUMBER', 'MAKE', 'MODEL', 'TECHNOLOGY', 'ASSET NAME', 'DEPARTMENT', 'FLOOR'],
        ['SN-P4-UNK-001', 'OldBrandXYZ', 'CustomModel999', 'ProprietaryFiberTech', 'Custom Controller', 'CNS', 'Technical Block']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([unknownBuf]), 'unknown_catalog.xlsx');

    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const anaBody = await anaRes.json();
    const token = anaBody.data.importToken;

    const recRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const recBody = await recRes.json();
    assert.strictEqual(recBody.data.stagedAssets.length, 1);
    const staged = recBody.data.stagedAssets[0];
    assert.strictEqual(staged.make, 'OldBrandXYZ', 'Unknown make preserved without catalog rejection');
    assert.strictEqual(staged.model, 'CustomModel999', 'Unknown model preserved without catalog rejection');
    assert.strictEqual(staged.technology, 'ProprietaryFiberTech', 'Unknown technology preserved without catalog rejection');

    // Commit to database
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ importToken: token, conflictStrategy: 'SKIP_EXISTING' })
    });
    assert.strictEqual(commitRes.status, 200);

    const saved = await assetRepository.findBySerialNumber('SN-P4-UNK-001');
    assert.ok(saved);
    assert.strictEqual(saved.make, 'OldBrandXYZ');
    assert.strictEqual(saved.model, 'CustomModel999');
    assert.strictEqual(saved.technology, 'ProprietaryFiberTech');
  });

  // ------------------------------------------------------------
  // TEST 9 — Commit modes
  // ------------------------------------------------------------
  await t.test('TEST 9: Commit modes — SKIP_EXISTING skips and preserves existing values', async () => {
    // Re-attempt importing the same serial with different values using SKIP_EXISTING
    const dupBuf = makeWorkbookBuffer({
      'DupSheet': [
        ['SERIAL NUMBER', 'MAKE', 'MODEL', 'TECHNOLOGY', 'ASSET NAME', 'DEPARTMENT', 'FLOOR'],
        ['SN-P4-UNK-001', 'BrandChanged', 'ModelChanged', 'TechChanged', 'Different Name', 'CNS', 'Technical Block']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([dupBuf]), 'dup_skip.xlsx');

    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const anaBody = await anaRes.json();
    const token = anaBody.data.importToken;

    await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ importToken: token, conflictStrategy: 'SKIP_EXISTING' })
    });
    assert.strictEqual(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.strictEqual(commitBody.data.skippedCount, 1);
    assert.strictEqual(commitBody.data.importedCount, 0);

    // Existing asset must remain unchanged
    const current = await assetRepository.findBySerialNumber('SN-P4-UNK-001');
    assert.strictEqual(current.make, 'OldBrandXYZ');
    assert.strictEqual(current.model, 'CustomModel999');
    assert.strictEqual(current.technology, 'ProprietaryFiberTech');
  });

  // ------------------------------------------------------------
  // TEST 10 — Export headers
  // ------------------------------------------------------------
  await t.test('TEST 10: Export headers — contains Make / Company, Model, and Technology in Asset Identity', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0];
    assert.ok(headers.includes('Make / Company'), 'Export must include "Make / Company"');
    assert.ok(headers.includes('Model'), 'Export must include "Model"');
    assert.ok(headers.includes('Technology'), 'Export must include "Technology"');

    // Confirm relative ordering: Make, Model, Technology
    const makeIdx = headers.indexOf('Make / Company');
    const modelIdx = headers.indexOf('Model');
    const techIdx = headers.indexOf('Technology');
    assert.strictEqual(modelIdx, makeIdx + 1, 'Model must follow Make / Company');
    assert.strictEqual(techIdx, modelIdx + 1, 'Technology must follow Model');
  });

  // ------------------------------------------------------------
  // TEST 11 — Export value correctness
  // ------------------------------------------------------------
  await t.test('TEST 11: Export value correctness — values match Asset.make, Asset.model, Asset.technology', async () => {
    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0];
    const snIdx = headers.indexOf('Serial Number');
    const makeIdx = headers.indexOf('Make / Company');
    const modelIdx = headers.indexOf('Model');
    const techIdx = headers.indexOf('Technology');

    // Find row for SN-P4-UNK-001
    const targetRow = rows.find(r => r[snIdx] === 'SN-P4-UNK-001');
    assert.ok(targetRow, 'Row for SN-P4-UNK-001 should be present in export');
    assert.strictEqual(targetRow[makeIdx], 'OldBrandXYZ');
    assert.strictEqual(targetRow[modelIdx], 'CustomModel999');
    assert.strictEqual(targetRow[techIdx], 'ProprietaryFiberTech');
  });

  // ------------------------------------------------------------
  // TEST 12 — Empty technology
  // ------------------------------------------------------------
  await t.test('TEST 12: Empty technology — assets without technology export empty cell, not placeholder', async () => {
    // Create asset without technology
    await assetRepository.create({
      assetId: 'AAI-P4-NOTECH-0001',
      assetName: 'Standard Office Monitor',
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'BenQ',
      model: 'GW2480',
      technology: '',
      serialNumber: 'SN-P4-NOTECH-01',
      department: 'Operations',
      floor: 'Ground Floor',
      installDate: new Date('2024-03-01'),
      warrantyStartDate: new Date('2024-03-01'),
      warrantyEndDate: new Date('2027-03-01')
    });

    const res = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0];
    const snIdx = headers.indexOf('Serial Number');
    const techIdx = headers.indexOf('Technology');

    const row = rows.find(r => r[snIdx] === 'SN-P4-NOTECH-01');
    assert.ok(row);
    assert.strictEqual(row[techIdx] || '', '', 'Empty technology must export as empty, not placeholder');
  });

  // ------------------------------------------------------------
  // TEST 13 — Password-protected workbook regression
  // ------------------------------------------------------------
  await t.test('TEST 13: Password-protected workbook regression — encrypted workbook unlocks and analyzes', async () => {
    // Generate valid workbook buffer
    const plainBuf = makeWorkbookBuffer({
      'SecureInventory': [
        ['SERIAL NO', 'MAKE', 'MODEL', 'TECHNOLOGY', 'DEPARTMENT', 'FLOOR'],
        ['SN-P4-ENC-001', 'Dell', 'Precision 3650', 'NVMe SSD', 'CNS', '2nd Floor']
      ]
    });

    const testPassword = 'AAISecretPassword2026';
    const encryptedBuf = await officecrypto.encrypt(plainBuf, { password: testPassword });

    const formData = new FormData();
    formData.append('files', new Blob([encryptedBuf]), 'protected_p4.xlsx');

    // 1. Analyze should flag password required
    const anaRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    assert.strictEqual(anaRes.status, 200);
    const anaBody = await anaRes.json();
    const file = anaBody.data.files[0];
    assert.strictEqual(file.isPasswordProtected, true);
    assert.strictEqual(file.isUnlocked, false);
    const token = anaBody.data.importToken;

    // 2. Unlock with correct password
    const unlockRes = await fetch(`${baseUrl}/import/unlock/${token}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileIndex: 0,
        password: testPassword
      })
    });
    assert.strictEqual(unlockRes.status, 200);
    const unlockBody = await unlockRes.json();
    assert.strictEqual(unlockBody.data.file.isUnlocked, true);
    assert.strictEqual(unlockBody.data.file.sheets.length, 1);
    assert.strictEqual(unlockBody.data.file.sheets[0].sheetName, 'SecureInventory');
  });

  // ------------------------------------------------------------
  // TEST 14 — Real workbook structure
  // ------------------------------------------------------------
  await t.test('TEST 14: Real workbook structure — real AAI sheet detection and mapping', async () => {
    const aaiWorkbookBuf = makeWorkbookBuffer({
      'USER DETAIL': [
        ['S.NO', 'EMP CODE', 'USER NAME', 'DESIG', 'DEPT', 'FLOOR'],
        ['1', '10021410', 'Muruganandam V', 'Senior Manager', 'Information Technology', '2nd Floor']
      ],
      'CPU': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL', 'TECHNOLOGY'],
        ['1', '10021410', 'CPU-MUR-P4', 'Dell', 'OptiPlex 7090', 'Intel vPro']
      ],
      'MON': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL', 'TECHNOLOGY'],
        ['1', '10021410', 'MON-MUR-P4', 'LG', '24MP400', 'IPS']
      ],
      'KBD': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '10021410', 'KBD-MUR-P4', 'Logitech', 'K120']
      ],
      'MSE': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '10021410', 'MSE-MUR-P4', 'Logitech', 'B100']
      ],
      'UPS': [
        ['S.NO', 'SERIAL NO', 'MAKE', 'MODEL', 'TECHNOLOGY'],
        ['1', 'UPS-MUR-P4', 'APC', 'Back-UPS 600VA', 'Line-Interactive']
      ],
      'OLD': [
        ['OBSOLETE ITEM', 'YEAR'],
        ['Old Switch', '2012']
      ]
    });

    const inspection = inspectWorkbook(aaiWorkbookBuf, 'AAI_CHENNAI_P4.xlsx');
    assert.strictEqual(inspection.sheetNames.length, 7);

    const cpuSheet = inspection.sheets.find(s => s.sheetName === 'CPU');
    assert.ok(cpuSheet);
    assert.strictEqual(cpuSheet.defaultUse, true);
    assert.strictEqual(cpuSheet.suggestedAssetName, 'CPU');

    const monSheet = inspection.sheets.find(s => s.sheetName === 'MON');
    assert.ok(monSheet);
    assert.strictEqual(monSheet.suggestedAssetName, 'Monitor');

    const oldSheet = inspection.sheets.find(s => s.sheetName === 'OLD');
    assert.ok(oldSheet);
    assert.strictEqual(oldSheet.defaultUse, false, 'OLD sheet should default to ignored');
  });

  // ------------------------------------------------------------
  // TEST 15 — Phase regression
  // ------------------------------------------------------------
  await t.test('TEST 15: Phase regression — Asset make and model remain strings, technology is optional string', async () => {
    const created = await assetRepository.create({
      assetId: 'AAI-P4-REG-0099',
      assetName: 'Phase Compatibility Test Unit',
      category: 'Desktop PC',
      assetType: 'DESKTOP',
      make: 'Dell',
      model: 'OptiPlex 7090',
      technology: 'NVMe SSD',
      serialNumber: 'SN-P4-PHASEREG-01',
      department: 'Information Technology',
      floor: '2nd Floor',
      installDate: new Date('2024-01-15'),
      warrantyStartDate: new Date('2024-01-15'),
      warrantyEndDate: new Date('2027-01-15')
    });

    assert.strictEqual(typeof created.make, 'string');
    assert.strictEqual(typeof created.model, 'string');
    assert.strictEqual(typeof created.technology, 'string');
    assert.strictEqual(created.make, 'Dell');
    assert.strictEqual(created.model, 'OptiPlex 7090');
    assert.strictEqual(created.technology, 'NVMe SSD');
  });
});
