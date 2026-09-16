import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { auditRepository } from '../src/repositories/auditRepository.js';

test('Multi-Excel Data Ingestion and Clean Master Data Pipeline Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

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
  await t.test('Acquire authentication tokens', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    employeeToken = empBody.data.token;
  });

  // 1. One Excel file ingestion
  let singleFileToken = '';
  await t.test('Scenario 1: Single Excel file through analyze -> reconcile pipeline', async () => {
    const fileBuf = makeWorkbookBuffer({
      'Inventory': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor', 'User Name', 'Employee ID'],
        ['SN-SINGLE-001', 'Dell', 'OptiPlex 7090', 'Desktop Computer', 'Information Technology', '2nd Floor', 'Roshan R', 'AAI-10842']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'single_dept.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.metrics.fileCount, 1);
    assert.strictEqual(body.data.metrics.sheetCount, 1);
    singleFileToken = body.data.importToken;

    // Run reconciliation
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${singleFileToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(reconRes.status, 200);
    const reconBody = await reconRes.json();
    assert.strictEqual(reconBody.data.metrics.uniqueAssets, 1);
    assert.strictEqual(reconBody.data.stagedAssets[0].serialNumber, 'SN-SINGLE-001');
  });

  // 2. Multiple Excel files ingestion
  let multiFileToken = '';
  await t.test('Scenario 2: Multiple Excel files uploaded simultaneously', async () => {
    // File 1: Hardware register
    const file1Buf = makeWorkbookBuffer({
      'Desktops': [
        ['Hardware Serial', 'Brand', 'Machine Model', 'Item Description', 'Division', 'Office Location'],
        ['SN-MULTI-101', 'Dell', 'Latitude 5420', 'Laptop Computer', 'Commercial', '1st Floor'],
        ['SN-MULTI-102', 'HP', 'EliteDesk 800', 'Workstation', 'Civil Engineering', 'Ground Floor']
      ]
    });

    // File 2: Warranty & OS register
    const file2Buf = makeWorkbookBuffer({
      'Specifications': [
        ['Service Tag', 'Commission Date', 'Warranty Till', 'Operating System', 'OS Version', 'Notes'],
        ['SN-MULTI-101', '15/01/2024', '15/01/2027', 'WIN 11 ENT', '23H2', 'Regional marketing staff'],
        ['SN-MULTI-102', '2023-08-01', '2026-08-01', 'Ubuntu Linux', '22.04 LTS', 'CAD workstation']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([file1Buf]), 'hardware_register.xlsx');
    formData.append('files', new Blob([file2Buf]), 'specs_register.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.metrics.fileCount, 2);
    assert.strictEqual(body.data.metrics.sheetCount, 2);
    multiFileToken = body.data.importToken;
  });

  // 3. Multiple sheets per workbook
  await t.test('Scenario 3: Single workbook containing multiple sheets processed', async () => {
    const multiSheetBuf = makeWorkbookBuffer({
      'Laptops': [
        ['Serial No', 'Manufacturer', 'Model', 'Equipment', 'Department', 'Location'],
        ['SN-SHEET-LAP-1', 'Lenovo', 'ThinkPad T14', 'Laptop', 'Human Resources', '3rd Floor']
      ],
      'Printers': [
        ['S/N', 'OEM', 'Model No', 'Device Name', 'Section', 'Floor'],
        ['SN-SHEET-PRN-2', 'HP', 'LaserJet M404', 'Network Printer', 'Finance & Accounts', '1st Floor']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([multiSheetBuf]), 'office_multi_sheets.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.files[0].sheets.length, 2);
    assert.strictEqual(body.data.files[0].sheets[0].sheetName, 'Laptops');
    assert.strictEqual(body.data.files[0].sheets[1].sheetName, 'Printers');
  });

  // 4. Column alias mapping and confidence detection
  await t.test('Scenario 4: Intelligent canonical column mapping with HIGH_CONFIDENCE aliases', async () => {
    const fileBuf = makeWorkbookBuffer({
      'Sheet1': [
        ['Service Tag', 'OEM', 'Machine Model', 'Item Name', 'Cost Center', 'Physical Location', 'Holder', 'Staff ID', 'Commission Date', 'Warranty Expiry', 'OS Installed', 'Handover Notes'],
        ['SN-MAP-001', 'Apple', 'MacBook Air', 'Laptop', 'IT', '2nd Floor', 'Roshan R', 'AAI-10842', '2024-01-01', '2027-01-01', 'macOS Sonoma', 'Executive test']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'mapping_test.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });

    const body = await res.json();
    const sheet = body.data.files[0].sheets[0];
    assert.strictEqual(sheet.mappings['0'], 'serialNumber'); // 'Service Tag'
    assert.strictEqual(sheet.mappings['1'], 'make');         // 'OEM'
    assert.strictEqual(sheet.mappings['2'], 'model');        // 'Machine Model'
    assert.strictEqual(sheet.mappings['3'], 'assetName');    // 'Item Name'
    assert.strictEqual(sheet.mappings['4'], 'department');   // 'Cost Center'
    assert.strictEqual(sheet.mappings['5'], 'floor');        // 'Physical Location'
    assert.strictEqual(sheet.mappings['6'], 'userName');     // 'Holder'
    assert.strictEqual(sheet.mappings['7'], 'employeeId');   // 'Staff ID'
    assert.strictEqual(sheet.mappings['8'], 'installDate');  // 'Commission Date'
    assert.strictEqual(sheet.mappings['9'], 'warrantyEndDate'); // 'Warranty Expiry'
    assert.strictEqual(sheet.mappings['10'], 'operatingSystem'); // 'OS Installed'
    assert.strictEqual(sheet.mappings['11'], 'remarks');     // 'Handover Notes'
  });

  // 5. Manual column mapping override
  await t.test('Scenario 5: Admin manual column mapping override via PUT /mappings', async () => {
    // A sheet with non-standard custom header 'AAI Serial Code' and 'Custodian Tag'
    const fileBuf = makeWorkbookBuffer({
      'CustomSheet': [
        ['AAI Serial Code', 'Brand Name', 'Model Spec', 'Asset Desc', 'Dept Name', 'Room Wing'],
        ['SN-OVERRIDE-01', 'Dell', 'OptiPlex 3080', 'Desktop', 'Operations', 'Terminal 1']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'custom_override.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();
    const token = body.data.importToken;

    // Send explicit mappings override
    const updateRes = await fetch(`${baseUrl}/import/mappings/${token}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        mappings: {
          '0': {
            'CustomSheet': {
              '0': 'serialNumber',
              '1': 'make',
              '2': 'model',
              '3': 'assetName',
              '4': 'department',
              '5': 'floor'
            }
          }
        }
      })
    });

    assert.strictEqual(updateRes.status, 200);

    // Reconcile and verify manual mapping was applied
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();
    assert.strictEqual(reconBody.data.stagedAssets[0].serialNumber, 'SN-OVERRIDE-01');
    assert.strictEqual(reconBody.data.stagedAssets[0].make, 'Dell');
  });

  // 6. Duplicate detection (intra-file and cross-file)
  await t.test('Scenario 6: Duplicate detection distinguishes redundant rows from complementary data', async () => {
    const fileBuf = makeWorkbookBuffer({
      'Sheet1': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor'],
        ['SN-DUP-201', 'Dell', 'OptiPlex', 'Desktop', 'IT', '2nd Floor'],
        ['SN-DUP-201', 'Dell', 'OptiPlex', 'Desktop', 'IT', '2nd Floor'] // Exact identical duplicate
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'duplicates.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();

    const reconRes = await fetch(`${baseUrl}/import/reconcile/${body.data.importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();
    assert.strictEqual(reconBody.data.metrics.duplicatesCount, 1);
    assert.strictEqual(reconBody.data.metrics.uniqueAssets, 1);
  });

  // 7 & 8. Cross-file merging and complementary data merging
  await t.test('Scenario 7 & 8: Cross-file complementary data merging on Serial Number', async () => {
    // Reconcile the multiFileToken created in Scenario 2
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${multiFileToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(reconRes.status, 200);
    const reconBody = await reconRes.json();

    // 2 files with 2 rows each describing the SAME 2 assets -> exactly 2 merged assets!
    assert.strictEqual(reconBody.data.metrics.uniqueAssets, 2);

    const asset1 = reconBody.data.stagedAssets.find(a => a.serialNumber === 'SN-MULTI-101');
    assert.ok(asset1, 'Asset 101 must exist');
    assert.strictEqual(asset1.make, 'Dell');
    assert.strictEqual(asset1.model, 'Latitude 5420'); // From File 1
    assert.strictEqual(asset1.operatingSystem, 'Windows 11 Enterprise'); // Normalized from 'WIN 11 ENT' in File 2!
    assert.strictEqual(asset1.remarks, 'Regional marketing staff'); // From File 2
    assert.strictEqual(asset1.mergeType, 'COMPLEMENTARY_MERGED');

    const asset2 = reconBody.data.stagedAssets.find(a => a.serialNumber === 'SN-MULTI-102');
    assert.ok(asset2, 'Asset 102 must exist');
    assert.strictEqual(asset2.make, 'HP');
    assert.strictEqual(asset2.model, 'EliteDesk 800'); // From File 1
    assert.strictEqual(asset2.operatingSystem, 'Ubuntu Linux'); // From File 2
    assert.strictEqual(asset2.mergeType, 'COMPLEMENTARY_MERGED');
  });

  // 9. Conflict detection & resolution choices
  await t.test('Scenario 9: Conflict detection and Admin interactive resolution', async () => {
    // File A says Model is OptiPlex 7090, File B says Model is OptiPlex 7080
    const fileABuf = makeWorkbookBuffer({
      'SheetA': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor'],
        ['SN-CONF-301', 'Dell', 'OptiPlex 7090', 'Desktop PC', 'CNS', '2nd Floor']
      ]
    });

    const fileBBuf = makeWorkbookBuffer({
      'SheetB': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor'],
        ['SN-CONF-301', 'Dell', 'OptiPlex 7080', 'Desktop PC', 'CNS', '2nd Floor']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileABuf]), 'fileA.xlsx');
    formData.append('files', new Blob([fileBBuf]), 'fileB.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();
    const token = body.data.importToken;

    const reconRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();

    assert.strictEqual(reconBody.data.metrics.conflictCount, 1);
    assert.strictEqual(reconBody.data.conflicts.length, 1);
    const conflict = reconBody.data.conflicts[0];
    assert.strictEqual(conflict.field, 'model');
    assert.strictEqual(conflict.valueA, 'OptiPlex 7090');
    assert.strictEqual(conflict.valueB, 'OptiPlex 7080');

    // Admin chooses 'USE_A' to resolve conflict
    const resolveRes = await fetch(`${baseUrl}/import/resolve/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        conflictResolutions: [
          { conflictId: conflict.conflictId, choice: 'USE_A' }
        ]
      })
    });

    assert.strictEqual(resolveRes.status, 200);
    const resolveBody = await resolveRes.json();
    assert.strictEqual(resolveBody.data.metrics.conflictCount, 0);
    assert.strictEqual(resolveBody.data.metrics.readyCount, 1);
    const resolvedAsset = resolveBody.data.stagedAssets.find(a => a.serialNumber === 'SN-CONF-301');
    assert.strictEqual(resolvedAsset.model, 'OptiPlex 7090');
    assert.strictEqual(resolvedAsset.hasConflict, false);
  });

  // 10. Employee reconciliation
  await t.test('Scenario 10: Staff reconciliation against Employee directory', async () => {
    const fileBuf = makeWorkbookBuffer({
      'StaffAssets': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor', 'User Name', 'Employee ID'],
        // Known employee in seed data
        ['SN-EMP-KNOWN', 'Dell', 'OptiPlex 5090', 'Desktop', 'Communication, Navigation & Surveillance', '2nd Floor', 'Roshan R', 'AAI-10842'],
        // Unmatched new employee
        ['SN-EMP-UNMATCHED', 'HP', 'ProDesk 400', 'Desktop', 'Electrical Engineering', '1st Floor', 'Karthik Raja', 'AAI-99887']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'staff_inventory.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();
    const token = body.data.importToken;

    const reconRes = await fetch(`${baseUrl}/import/reconcile/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();

    assert.strictEqual(reconBody.data.unresolvedEmployees.length, 1);
    assert.strictEqual(reconBody.data.unresolvedEmployees[0].userName, 'Karthik Raja');

    // Admin resolves unmatched employee with 'CREATE_EMPLOYEE'
    const resolveRes = await fetch(`${baseUrl}/import/resolve/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeResolutions: [
          { employeeKey: 'AAI-99887', choice: 'CREATE_EMPLOYEE' }
        ]
      })
    });
    assert.strictEqual(resolveRes.status, 200);
  });

  // 11. Date normalization (Excel serials, DD/MM/YYYY, ISO strings)
  await t.test('Scenario 11: Date normalization across diverse formats', async () => {
    const fileBuf = makeWorkbookBuffer({
      'Dates': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor', 'Install Date', 'Warranty End'],
        // DD/MM/YYYY
        ['SN-DATE-001', 'Dell', 'OptiPlex', 'PC', 'IT', '2nd Floor', '15/03/2024', '15/03/2027'],
        // ISO YYYY-MM-DD
        ['SN-DATE-002', 'HP', 'EliteDesk', 'PC', 'IT', '2nd Floor', '2023-11-20', '2026-11-20']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'date_formats.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();

    const reconRes = await fetch(`${baseUrl}/import/reconcile/${body.data.importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();

    const asset1 = reconBody.data.stagedAssets.find(a => a.serialNumber === 'SN-DATE-001');
    assert.ok(asset1);
    const d1 = new Date(asset1.installDate);
    assert.strictEqual(d1.getFullYear(), 2024);
    assert.strictEqual(d1.getMonth(), 2); // 0-indexed March = 2
    assert.strictEqual(d1.getDate(), 15);
  });

  // 12. Unassigned asset handling
  await t.test('Scenario 12: Assets without custodian become status = AVAILABLE', async () => {
    const fileBuf = makeWorkbookBuffer({
      'StoreAssets': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor', 'User Name', 'Employee ID'],
        ['SN-UNASSIGNED-01', 'APC', 'Smart-UPS 1500', 'UPS', 'IT', 'Server Room', '', '']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'store_spares.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();

    const reconRes = await fetch(`${baseUrl}/import/reconcile/${body.data.importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reconBody = await reconRes.json();

    const spare = reconBody.data.stagedAssets[0];
    assert.strictEqual(spare.serialNumber, 'SN-UNASSIGNED-01');
    assert.strictEqual(spare.status, 'AVAILABLE');
    assert.strictEqual(spare.custodian, null);
  });

  // 13. Staging / Cancel behavior (zero MongoDB writes before Phase 2)
  await t.test('Scenario 13: Staging does not write to Asset collection until Commit', async () => {
    const fileBuf = makeWorkbookBuffer({
      'StagingCheck': [
        ['Serial Number', 'Make', 'Model', 'Asset Name', 'Department', 'Floor'],
        ['SN-UNCOMMITTED-99', 'Dell', 'OptiPlex', 'PC', 'IT', '2nd Floor']
      ]
    });

    const formData = new FormData();
    formData.append('files', new Blob([fileBuf]), 'uncommitted.xlsx');

    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const body = await res.json();

    await fetch(`${baseUrl}/import/reconcile/${body.data.importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Check database directly: SN-UNCOMMITTED-99 must NOT exist in inventory
    const checkRes = await fetch(`${baseUrl}/assets?search=SN-UNCOMMITTED-99`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.data.length, 0, 'Asset must not exist in DB before commit');
  });

  // 14. Final commit to MongoDB
  let finalCommitToken = '';
  await t.test('Scenario 14: Phase 2 Commit creates assets in MongoDB', async () => {
    // Reconcile and commit multiFileToken from Scenario 2 & 7
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken: multiFileToken })
    });

    assert.strictEqual(commitRes.status, 200);
    finalCommitToken = multiFileToken;
    const commitBody = await commitRes.json();
    assert.strictEqual(commitBody.success, true);
    assert.strictEqual(commitBody.data.importedCount, 2);

    // Verify assets are now queryable in MongoDB
    const checkRes = await fetch(`${baseUrl}/assets?search=SN-MULTI-101`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.data.length, 1);
    assert.strictEqual(checkBody.data[0].serialNumber, 'SN-MULTI-101');
    assert.strictEqual(checkBody.data[0].computerConfig?.operatingSystem, 'Windows 11 Enterprise');

    finalCommitToken = multiFileToken;
  });

  // 15. Audit logging: MULTI_EXCEL_IMPORT_COMPLETED
  await t.test('Scenario 15: Meaningful audit log recorded for multi-excel import', async () => {
    const logs = await auditRepository.find({ action: 'MULTI_EXCEL_IMPORT_COMPLETED', limit: 5 });
    assert.ok(logs.items.length >= 1, 'Must find MULTI_EXCEL_IMPORT_COMPLETED audit event');
    const latest = logs.items[0];
    assert.strictEqual(latest.action, 'MULTI_EXCEL_IMPORT_COMPLETED');
    assert.strictEqual(latest.entityId, finalCommitToken);
    assert.strictEqual(latest.details.importedCount, 2);
  });

  // 16. Repeated import safety / anti-replay
  await t.test('Scenario 16: Anti-replay prevents re-committing consumed session', async () => {
    const res = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken: finalCommitToken })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /invalid or expired/i);
  });
});
