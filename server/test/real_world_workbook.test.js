import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { employeeRepository } from '../src/repositories/employeeRepository.js';
import { assignmentRepository } from '../src/repositories/assignmentRepository.js';
import { auditRepository } from '../src/repositories/auditRepository.js';

test('AAI-AMS Real-World Multi-Worksheet Excel Import Test Suite', async (t) => {
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
  await t.test('Login as Admin', async () => {
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

  let importToken = '';
  let analysisData = null;

  await t.test('Step 1: Inspect multi-worksheet AAI workbook and verify purpose detection', async () => {
    // Construct real-world multi-worksheet workbook
    const workbookBuf = makeWorkbookBuffer({
      'USER DETAIL': [
        ['S.NO', 'EMP CODE', 'USER NAME', 'DESIG', 'DEPT', 'FLOOR'],
        ['1', '10021410', 'Muruganandam V', 'Senior Manager', 'Information Technology', '2nd Floor'],
        ['2', '10021420', 'Anitha S', 'Assistant Manager', 'CNS', '1st Floor']
      ],
      'CPU': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL', 'OS TYPE', 'OS VERSION'],
        ['1', '10021410', 'CPU-MUR-001', 'Dell', 'OptiPlex 7090', 'Windows 11', '23H2'],
        ['2', '10021420', 'CPU-ANI-002', 'HP', 'ProDesk 600', 'Windows 10', '22H2']
      ],
      'MON': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '10021410', 'MON-MUR-001', 'LG', '24MP400']
      ],
      'KBD': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '10021410', 'KBD-MUR-001', 'Logitech', 'K120']
      ],
      'MSE': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '10021410', 'MSE-MUR-001', 'Logitech', 'B100']
      ],
      'UPS': [
        ['S.NO', 'EMP CODE', 'USER NAME', 'SERIAL NO', 'MAKE', 'MODEL'],
        ['1', '', '', 'UPS-SPARE-001', 'APC', 'Back-UPS 600VA']
      ],
      'LAPTOP': [
        ['S.NO', 'EMP CODE', 'SERIAL NO', 'MAKE', 'MODEL', 'WARRANTY END'],
        ['1', '10021420', 'LAP-ANI-001', 'Lenovo', 'ThinkPad T14', '2027-12-31']
      ],
      'IP & MAC': [
        ['S.NO', 'SERIAL NO', 'IP ADDRESS', 'MAC ADDRESS', 'PROCESSOR', 'RAM'],
        ['1', 'CPU-MUR-001', '10.10.10.20', 'AA:BB:CC:DD:EE:FF', 'Intel i7-11700', '16 GB'],
        // Also introduce conflicting model for CPU-ANI-002 to test conflict handling
        ['2', 'CPU-ANI-002', '10.10.10.30', '11:22:33:44:55:66', 'Intel i5-10500', '8 GB']
      ],
      'CONFLICTS': [
        ['SERIAL NO', 'MODEL'],
        ['CPU-ANI-002', 'ProDesk 800']
      ],
      'OLD DATA': [
        ['S.NO', 'OBSOLETE ITEM', 'YEAR'],
        ['1', 'Legacy CRT', '2010']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([workbookBuf]), 'AAI_CHENNAI_INVENTORY_2026.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    analysisData = body.data;
    importToken = analysisData.importToken;

    assert.strictEqual(analysisData.files.length, 1);
    const sheets = analysisData.files[0].sheets;
    assert.strictEqual(sheets.length, 10);

    // Verify detected purposes and default selections
    const userDetailSheet = sheets.find(s => s.sheetName === 'USER DETAIL');
    assert.strictEqual(userDetailSheet.detectedPurpose, 'Employee information');
    assert.strictEqual(userDetailSheet.isEmployeeSheet, true);

    const cpuSheet = sheets.find(s => s.sheetName === 'CPU');
    assert.strictEqual(cpuSheet.detectedPurpose, 'CPU assets');
    assert.strictEqual(cpuSheet.suggestedAssetName, 'CPU');

    const monSheet = sheets.find(s => s.sheetName === 'MON');
    assert.strictEqual(monSheet.detectedPurpose, 'Monitor assets');
    assert.strictEqual(monSheet.suggestedAssetName, 'Monitor');

    const kbdSheet = sheets.find(s => s.sheetName === 'KBD');
    assert.strictEqual(kbdSheet.detectedPurpose, 'Keyboard assets');
    assert.strictEqual(kbdSheet.suggestedAssetName, 'Keyboard');

    const mseSheet = sheets.find(s => s.sheetName === 'MSE');
    assert.strictEqual(mseSheet.detectedPurpose, 'Mouse assets');
    assert.strictEqual(mseSheet.suggestedAssetName, 'Mouse');

    const upsSheet = sheets.find(s => s.sheetName === 'UPS');
    assert.strictEqual(upsSheet.detectedPurpose, 'UPS assets');
    assert.strictEqual(upsSheet.suggestedAssetName, 'UPS');

    const laptopSheet = sheets.find(s => s.sheetName === 'LAPTOP');
    assert.strictEqual(laptopSheet.detectedPurpose, 'Laptop assets');
    assert.strictEqual(laptopSheet.suggestedAssetName, 'Laptop');

    const ipMacSheet = sheets.find(s => s.sheetName === 'IP & MAC');
    assert.strictEqual(ipMacSheet.detectedPurpose, 'Network & IP details');
    assert.strictEqual(ipMacSheet.isComplementarySheet, true);

    const oldDataSheet = sheets.find(s => s.sheetName === 'OLD DATA');
    assert.strictEqual(oldDataSheet.detectedPurpose, 'Legacy / Unknown');
    assert.strictEqual(oldDataSheet.defaultUse, false);

    // Verify S.NO is ignored by default
    const snoIdx = userDetailSheet.rawHeaders.indexOf('S.NO');
    assert.ok(!userDetailSheet.mappings[snoIdx], 'S.NO should not be mapped to any standard asset field');
  });

  await t.test('Step 2: Confirm selected sheets (ignoring OLD DATA) and map columns', async () => {
    // Admin marks OLD DATA as false, all other 9 sheets as true
    const selectedSheets = {
      '0': {
        'USER DETAIL': { isSelected: true },
        'CPU': { isSelected: true, suggestedAssetName: 'CPU' },
        'MON': { isSelected: true, suggestedAssetName: 'Monitor' },
        'KBD': { isSelected: true, suggestedAssetName: 'Keyboard' },
        'MSE': { isSelected: true, suggestedAssetName: 'Mouse' },
        'UPS': { isSelected: true, suggestedAssetName: 'UPS' },
        'LAPTOP': { isSelected: true, suggestedAssetName: 'Laptop' },
        'IP & MAC': { isSelected: true },
        'CONFLICTS': { isSelected: true, suggestedAssetName: 'CPU' },
        'OLD DATA': { isSelected: false }
      }
    };

    const mapRes = await fetch(`${baseUrl}/import/mappings/${importToken}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        mappings: {
          '0': {
            'CONFLICTS': {
              '0': 'serialNumber',
              '1': 'model'
            }
          }
        },
        selectedSheets
      })
    });

    assert.strictEqual(mapRes.status, 200);
    const mapBody = await mapRes.json();
    assert.strictEqual(mapBody.success, true);
  });

  let reconcileData = null;

  await t.test('Step 3: Reconcile and Connect using Employee ID and Serial Number', async () => {
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${importToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        commonKey: 'EMPLOYEE_ID',
        selectedSheets: {
          '0': {
            'OLD DATA': false
          }
        }
      })
    });

    assert.strictEqual(reconRes.status, 200);
    const reconBody = await reconRes.json();
    assert.strictEqual(reconBody.success, true);
    reconcileData = reconBody.data;

    // Verify metrics
    assert.strictEqual(reconcileData.metrics.employeesFound, 2); // Muruganandam V, Anitha S
    assert.ok(reconcileData.metrics.assetsFound >= 6); // CPU-MUR-001, CPU-ANI-002, MON-MUR-001, KBD-MUR-001, MSE-MUR-001, UPS-SPARE-001, LAP-ANI-001
    assert.strictEqual(reconcileData.metrics.availableCount, 1); // UPS-SPARE-001 is AVAILABLE

    // Verify unassigned asset has no invented custodian
    const upsAsset = reconcileData.stagedAssets.find(a => a.serialNumber === 'UPS-SPARE-001');
    assert.ok(upsAsset);
    assert.strictEqual(upsAsset.status, 'AVAILABLE');
    assert.strictEqual(upsAsset.custodian, null);
    assert.strictEqual(upsAsset.employeeId, '');
    assert.strictEqual(upsAsset.userName, '');

    // Verify employee Muruganandam V has multiple DISTINCT assets
    const murAssets = reconcileData.stagedAssets.filter(a => a.employeeId === '10021410');
    assert.strictEqual(murAssets.length, 4);
    const assetNames = murAssets.map(a => a.assetName).sort();
    assert.deepStrictEqual(assetNames, ['CPU', 'Keyboard', 'Monitor', 'Mouse']);

    // Verify complementary data from IP & MAC sheet merged into CPU-MUR-001 remarks
    const murCpu = murAssets.find(a => a.serialNumber === 'CPU-MUR-001');
    assert.ok(murCpu);
    assert.strictEqual(murCpu.make, 'Dell');
    assert.strictEqual(murCpu.model, 'OptiPlex 7090');
    assert.ok(murCpu.remarks.includes('10.10.10.20') || murCpu.remarks.includes('AA:BB:CC:DD:EE:FF'));

    // Verify conflict detected for CPU-ANI-002 between ProDesk 600 vs ProDesk 800
    assert.ok(reconcileData.conflicts.length >= 1);
    const modelConflict = reconcileData.conflicts.find(c => c.serialNumber === 'CPU-ANI-002' && c.field === 'model');
    assert.ok(modelConflict, 'Conflict should be raised for CPU-ANI-002 model');
    assert.strictEqual(modelConflict.isResolved, false);
  });

  await t.test('Resolve conflict for CPU-ANI-002 model', async () => {
    const modelConflict = reconcileData.conflicts.find(c => c.serialNumber === 'CPU-ANI-002' && c.field === 'model');
    assert.ok(modelConflict);

    const resolveRes = await fetch(`${baseUrl}/import/resolve/${importToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        conflictResolutions: [
          { conflictId: modelConflict.conflictId, choice: 'USE_A', manualValue: 'ProDesk 600' }
        ],
        employeeResolutions: []
      })
    });

    assert.strictEqual(resolveRes.status, 200);
    const resolveBody = await resolveRes.json();
    assert.strictEqual(resolveBody.success, true);
    assert.strictEqual(resolveBody.data.metrics.needsReviewCount, 0);
  });

  await t.test('Commit clean data into MongoDB and verify database integrity', async () => {
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        importToken,
        conflictStrategy: 'UPDATE_EXISTING'
      })
    });

    assert.strictEqual(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.strictEqual(commitBody.success, true);
    assert.ok(commitBody.data.importedCount >= 6);

    // Verify Asset database records
    const cpuMur = await assetRepository.findBySerialNumber('CPU-MUR-001');
    assert.ok(cpuMur);
    assert.strictEqual(cpuMur.assetName, 'CPU');
    assert.strictEqual(cpuMur.make, 'Dell');
    assert.strictEqual(cpuMur.model, 'OptiPlex 7090');
    assert.strictEqual(cpuMur.status, 'ASSIGNED');
    assert.strictEqual(cpuMur.computerConfig?.operatingSystem, 'Windows 11 Pro');
    assert.strictEqual(cpuMur.computerConfig?.osVersion, '23H2');

    const monMur = await assetRepository.findBySerialNumber('MON-MUR-001');
    assert.ok(monMur);
    assert.strictEqual(monMur.assetName, 'Monitor');
    assert.strictEqual(monMur.make, 'LG');
    assert.strictEqual(monMur.status, 'ASSIGNED');

    const kbdMur = await assetRepository.findBySerialNumber('KBD-MUR-001');
    assert.ok(kbdMur);
    assert.strictEqual(kbdMur.assetName, 'Keyboard');

    const mseMur = await assetRepository.findBySerialNumber('MSE-MUR-001');
    assert.ok(mseMur);
    assert.strictEqual(mseMur.assetName, 'Mouse');

    // Verify unassigned UPS is strictly AVAILABLE with no custodian
    const upsSpare = await assetRepository.findBySerialNumber('UPS-SPARE-001');
    assert.ok(upsSpare);
    assert.strictEqual(upsSpare.status, 'AVAILABLE');
    assert.ok(!upsSpare.custodian, 'Custodian should be null or undefined');
    assert.ok(!upsSpare.currentEmployeeId, 'currentEmployeeId should be null or undefined');

    // Verify Employee database records: Only 1 employee created for Muruganandam V
    const empMur = await employeeRepository.findByEmployeeId('10021410');
    assert.ok(empMur);
    assert.strictEqual(empMur.name, 'Muruganandam V');
    assert.strictEqual(empMur.designation, 'Senior Manager');
    assert.strictEqual(empMur.department, 'Information Technology');

    // Verify assignments for Muruganandam V
    const activeAssignments = await assignmentRepository.findByEmployee('10021410', { status: 'ACTIVE' });
    assert.strictEqual(activeAssignments.length, 4);

    // Verify audit log was recorded
    const auditLogs = await auditRepository.find({ limit: 10 });
    const importLog = auditLogs.items.find(l => l.action.includes('IMPORT'));
    assert.ok(importLog);
  });
});
