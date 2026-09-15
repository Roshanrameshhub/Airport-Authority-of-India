import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import XlsxPopulate from 'xlsx-populate';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { auditRepository } from '../src/repositories/auditRepository.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('AAI-AMS Password-Protected Excel Workbook & Multi-File Pipeline Test Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/v1`;
        resolve();
      });
    });

    // Obtain admin token
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const body = await res.json();
    adminToken = body.data.token;
  });

  t.after(async () => {
    if (server) await new Promise((res) => server.close(res));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // Helper to create an encrypted Excel workbook buffer with real Agile encryption
  async function makeEncryptedWorkbookBuffer(sheetDataMap = {}, password = 'SecretPassword123') {
    const wb = await XlsxPopulate.fromBlankAsync();
    let isFirst = true;

    for (const [sheetName, rows] of Object.entries(sheetDataMap)) {
      let sheet;
      if (isFirst) {
        sheet = wb.sheet(0);
        sheet.name(sheetName);
        isFirst = false;
      } else {
        sheet = wb.addSheet(sheetName);
      }

      rows.forEach((row, rIdx) => {
        row.forEach((cellVal, cIdx) => {
          sheet.row(rIdx + 1).cell(cIdx + 1).value(cellVal);
        });
      });
    }

    return await wb.outputAsync({ password });
  }

  // Helper to create a normal unencrypted workbook buffer
  function makeNormalWorkbookBuffer(sheetDataMap = {}) {
    const wb = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(sheetDataMap)) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Test 1: Upload a password-protected workbook without password -> Detected as PASSWORD_REQUIRED
  let lockedToken = '';
  await t.test('1. Upload password-protected workbook detects encryption and requests password', async () => {
    const encBuf = await makeEncryptedWorkbookBuffer({
      'CPU': [
        ['Serial Number', 'Make', 'Model', 'Employee ID', 'User Name'],
        ['CPU-ENC-001', 'Dell', 'OptiPlex 7090', '10021410', 'Muruganandam V']
      ],
      'MON': [
        ['Serial Number', 'Make', 'Model', 'Employee ID', 'User Name'],
        ['MON-ENC-001', 'LG', '24MP88HV', '10021410', 'Muruganandam V']
      ]
    }, 'SecureAaiPass99');

    const formData = new FormData();
    formData.append('files', new Blob([encBuf]), 'AUGUST_INVENTORY_2026.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.importToken);
    lockedToken = body.data.importToken;

    const file = body.data.files[0];
    assert.strictEqual(file.fileName, 'AUGUST_INVENTORY_2026.xlsx');
    assert.strictEqual(file.isPasswordProtected, true);
    assert.strictEqual(file.isUnlocked, false);
    assert.strictEqual(file.status, 'PASSWORD_REQUIRED');
    assert.strictEqual(file.sheets.length, 0);
  });

  // Test 2: Attempt unlocking with incorrect password -> Returns 400 with 'Incorrect password. Please try again.'
  await t.test('2. Attempt unlocking with incorrect password returns 400 with helpful message', async () => {
    const res = await fetch(`${baseUrl}/import/unlock/${lockedToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fileIndex: 0,
        password: 'WrongPassword123'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Incorrect password. Please try again.');
  });

  // Test 3: Attempt unlocking with correct password -> Successfully unlocks and returns all worksheets
  await t.test('3. Unlocking with correct password decrypts workbook and detects all worksheets', async () => {
    const res = await fetch(`${baseUrl}/import/unlock/${lockedToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fileIndex: 0,
        password: 'SecureAaiPass99'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.allFilesUnlocked, true);

    const file = body.data.file;
    assert.strictEqual(file.isPasswordProtected, true);
    assert.strictEqual(file.isUnlocked, true);
    assert.strictEqual(file.status, 'UNLOCKED');
    assert.strictEqual(file.sheets.length, 2);
    assert.strictEqual(file.sheets[0].sheetName, 'CPU');
    assert.strictEqual(file.sheets[1].sheetName, 'MON');
    assert.strictEqual(file.sheets[0].suggestedAssetName, 'CPU');
    assert.strictEqual(file.sheets[1].suggestedAssetName, 'Monitor');
  });

  // Test 4: Multi-file upload with mixed normal and password-protected files
  let mixedToken = '';
  await t.test('4. Multi-file upload handles normal and password-protected files independently', async () => {
    // Normal file 1: Employee Master
    const normalBuf1 = makeNormalWorkbookBuffer({
      'USER DETAIL': [
        ['EMP CODE', 'USER NAME', 'DESIG', 'DEPT', 'FLOOR'],
        ['10099881', 'Anita Desai', 'JGM (ATM)', 'Air Traffic Management', '3rd Floor']
      ]
    });

    // Password-protected file 2: Encrypted hardware register
    const encBuf2 = await makeEncryptedWorkbookBuffer({
      'LAPTOP': [
        ['Serial Number', 'Make', 'Model', 'Employee ID'],
        ['LAP-ENC-501', 'HP', 'EliteBook 840', '10099881']
      ]
    }, 'LaptopSecret2026');

    // Normal file 3: IP register
    const normalBuf3 = makeNormalWorkbookBuffer({
      'IP & MAC': [
        ['Serial Number', 'IP Address', 'MAC Address'],
        ['LAP-ENC-501', '10.20.30.40', 'AA:BB:CC:DD:EE:FF']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([normalBuf1]), 'Employee_Master.xlsx');
    formData.append('files', new Blob([encBuf2]), 'Hardware_Encrypted.xlsx');
    formData.append('files', new Blob([normalBuf3]), 'Network_Details.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.files.length, 3);
    mixedToken = body.data.importToken;

    // File 1: Normal
    assert.strictEqual(body.data.files[0].fileName, 'Employee_Master.xlsx');
    assert.strictEqual(body.data.files[0].isPasswordProtected, false);
    assert.strictEqual(body.data.files[0].isUnlocked, true);
    assert.strictEqual(body.data.files[0].status, 'READY');
    assert.strictEqual(body.data.files[0].sheets[0].sheetName, 'USER DETAIL');

    // File 2: Password Protected & Locked
    assert.strictEqual(body.data.files[1].fileName, 'Hardware_Encrypted.xlsx');
    assert.strictEqual(body.data.files[1].isPasswordProtected, true);
    assert.strictEqual(body.data.files[1].isUnlocked, false);
    assert.strictEqual(body.data.files[1].status, 'PASSWORD_REQUIRED');
    assert.strictEqual(body.data.files[1].sheets.length, 0);

    // File 3: Normal
    assert.strictEqual(body.data.files[2].fileName, 'Network_Details.xlsx');
    assert.strictEqual(body.data.files[2].isPasswordProtected, false);
    assert.strictEqual(body.data.files[2].isUnlocked, true);
    assert.strictEqual(body.data.files[2].status, 'READY');
    assert.strictEqual(body.data.files[2].sheets[0].sheetName, 'IP & MAC');

    // Now unlock File 2 only!
    const unlockRes = await fetch(`${baseUrl}/import/unlock/${mixedToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fileIndex: 1,
        password: 'LaptopSecret2026'
      })
    });

    assert.strictEqual(unlockRes.status, 200);
    const unlockBody = await unlockRes.json();
    assert.strictEqual(unlockBody.data.allFilesUnlocked, true);
    assert.strictEqual(unlockBody.data.file.isUnlocked, true);
    assert.strictEqual(unlockBody.data.file.sheets[0].sheetName, 'LAPTOP');
  });

  // Test 5: Reconcile and commit the unlocked multi-file session into MongoDB
  await t.test('5. Reconcile and commit unlocked files producing clean 13-field records without storing password', async () => {
    // Reconcile
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${mixedToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ commonKey: 'EMPLOYEE_ID' })
    });

    assert.strictEqual(reconRes.status, 200);
    const reconBody = await reconRes.json();
    assert.strictEqual(reconBody.data.stagedAssets.length, 1);

    const asset = reconBody.data.stagedAssets[0];
    assert.strictEqual(asset.serialNumber, 'LAP-ENC-501');
    assert.strictEqual(asset.make, 'HP');
    assert.strictEqual(asset.model, 'EliteBook 840');
    assert.strictEqual(asset.employeeId, '10099881');
    assert.strictEqual(asset.userName, 'Anita Desai');
    assert.strictEqual(asset.designation, 'JGM (ATM)');
    assert.strictEqual(asset.department, 'Air Traffic Management');
    assert.strictEqual(asset.floor, '3rd Floor');
    assert.ok(asset.remarks.includes('IP: 10.20.30.40') || asset.remarks.includes('10.20.30.40'));

    // Commit
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken: mixedToken })
    });

    assert.strictEqual(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.strictEqual(commitBody.data.importedCount, 1);

    // Verify DB integrity
    const savedAsset = await assetRepository.findBySerialNumber('LAP-ENC-501');
    assert.ok(savedAsset);
    assert.strictEqual(savedAsset.make, 'HP');
    assert.strictEqual(savedAsset.currentEmployeeId, '10099881');

    // Verify password is NOT in audit logs
    const logs = await auditRepository.find({ action: 'MULTI_EXCEL_IMPORT_COMPLETED', limit: 5 });
    const logStr = JSON.stringify(logs);
    assert.strictEqual(logStr.includes('LaptopSecret2026'), false, 'Password must never be logged in audit logs');
    assert.strictEqual(logStr.includes('SecureAaiPass99'), false, 'Password must never be logged in audit logs');
  });
});
