import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { importService } from '../src/services/importService.js';
import { extractSheetRows } from '../src/utils/excelParser.js';
import { reconcileAndCleanRows } from '../src/services/dataReconciliationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.join(__dirname, '../sample_data/simple_test');

if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

console.log('====================================================');
console.log('SIMPLE MULTIPLE EXCEL IMPORT TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. Generate the 4 Test Workbooks
// ----------------------------------------------------

// File 1: Employee_Master.xlsx
const file1Data = [
  ['Employee ID', 'User Name', 'Designation', 'Department'],
  ['EMP101', 'John Doe', 'Senior Executive', 'Information Technology'],
  ['EMP102', 'Jane Smith', 'Manager', 'Air Traffic Management'],
  ['EMP103', 'Robert Brown', 'Officer', 'Operations']
];

// File 2: Asset_Register.xlsx
const file2Data = [
  ['Serial Number', 'Asset Type', 'Make', 'Model', 'Floor', 'Employee ID'],
  ['ABC001', 'CPU', 'Dell', 'OptiPlex 7090', '2nd Floor', 'EMP101'], // In File 2, File 3, File 4
  ['XYZ999', 'Monitor', 'HP', 'E24 G4', '3rd Floor', 'EMP102'],      // In File 2 only
  ['UNASSIGNED-01', 'Laptop', 'Lenovo', 'ThinkPad L14', '1st Floor', ''], // Unassigned asset (no employee)
  ['CONF-001', 'Workstation', 'Dell', 'Precision 3650', 'Ground Floor', 'EMP103'] // Conflicting Make with File 4
];

// File 3: CPU_Details.xlsx
const file3Data = [
  ['CPU Code', 'Processor', 'RAM', 'Storage'],
  ['ABC001', 'Intel i5', '16GB', '512GB SSD'], // CPU Code = ABC001
  ['CONF-001', 'Intel i7', '32GB', '1TB NVMe']
];

// File 4: OS_Details.xlsx
const file4Data = [
  ['Serial Number', 'Operating System', 'Install Date', 'Warranty End', 'Make'],
  ['ABC001', 'Windows 11 Pro', '2024-01-10', '2027-01-10', 'Dell'], // Complementary data for ABC001
  ['CONF-001', 'Windows 11 Enterprise', '2024-02-15', '2027-02-15', 'HP'], // Conflicting Make: HP vs Dell
  ['UNASSIGNED-01', 'Ubuntu 22.04', '2024-03-01', '2026-03-01', 'Lenovo'] // Complementary for unassigned
];

const writeWorkbook = (data, filename) => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filePath = path.join(testDataDir, filename);
  XLSX.writeFile(wb, filePath);
  return {
    filePath,
    filename,
    buffer: fs.readFileSync(filePath),
    originalname: filename
  };
};

const file1 = writeWorkbook(file1Data, 'Employee_Master.xlsx');
const file2 = writeWorkbook(file2Data, 'Asset_Register.xlsx');
const file3 = writeWorkbook(file3Data, 'CPU_Details.xlsx');
const file4 = writeWorkbook(file4Data, 'OS_Details.xlsx');

console.log('✓ Generated 4 test workbooks in:', testDataDir);
console.log('  1. Employee_Master.xlsx (Staff master)');
console.log('  2. Asset_Register.xlsx  (Core asset register)');
console.log('  3. CPU_Details.xlsx     (Hardware specs with CPU Code)');
console.log('  4. OS_Details.xlsx      (Operating system, warranty, conflicting make)\n');

// ----------------------------------------------------
// 2. STEP 1: Process Uploaded Files
// ----------------------------------------------------
console.log('--- STEP 1: Processing Uploaded Files ---');

const mockFiles = [
  { originalname: file1.filename, buffer: file1.buffer },
  { originalname: file2.filename, buffer: file2.buffer },
  { originalname: file3.filename, buffer: file3.buffer },
  { originalname: file4.filename, buffer: file4.buffer }
];

const analysis = await importService.analyzeWorkbooks(mockFiles);
console.log(`✓ Analysis Complete. Import Token: ${analysis.importToken}`);
console.log(`  Discovered ${analysis.files.length} workbooks with ${analysis.metrics.sheetCount} worksheets.`);

// ----------------------------------------------------
// 3. STEP 2: Map Columns to 13 Canonical Fields + Specs
// ----------------------------------------------------
console.log('\n--- STEP 2: Column Mapping ---');

// Check automatic mappings detected for each file
analysis.files.forEach(f => {
  console.log(`  Workbook: ${f.fileName}`);
  f.sheets.forEach(sh => {
    sh.rawHeaders.forEach((header, colIdx) => {
      const mapped = sh.mappings[colIdx];
      console.log(`    "${header}" -> ${mapped || '(unmapped)'}`);
    });
  });
});

// Ensure CPU_Details has CPU Code -> serialNumber, and specs -> supportingInfo
const customMappings = {};
analysis.files.forEach(f => {
  customMappings[f.fileIndex] = {};
  f.sheets.forEach(sh => {
    customMappings[f.fileIndex][sh.sheetName] = { ...sh.mappings };
    if (f.fileName.includes('CPU_Details')) {
      sh.rawHeaders.forEach((header, colIdx) => {
        if (header.toLowerCase().includes('cpu code')) {
          customMappings[f.fileIndex][sh.sheetName][colIdx] = 'serialNumber';
        }
        if (['processor', 'ram', 'storage'].includes(header.toLowerCase())) {
          customMappings[f.fileIndex][sh.sheetName][colIdx] = 'supportingInfo';
        }
      });
    }
  });
});

await importService.updateColumnMappings(analysis.importToken, customMappings);
console.log('✓ Column mappings successfully confirmed.');

// ----------------------------------------------------
// 4. STEP 3: Match Records by Common Key (SERIAL)
// ----------------------------------------------------
console.log('\n--- STEP 3: Matching Records via Common Key (SERIAL) ---');

const reconcile = await importService.reconcileAndStage(analysis.importToken, { commonKey: 'SERIAL' });

console.log(`✓ Reconciled Metrics:`);
console.log(`  Total Source Rows:       ${reconcile.metrics.totalSourceRows}`);
console.log(`  Unique Assets:           ${reconcile.metrics.uniqueAssets}`);
console.log(`  Duplicates/Complementary: ${reconcile.metrics.duplicatesCount}`);
console.log(`  Conflicts Detected:      ${reconcile.metrics.conflictCount}`);
console.log(`  Invalid Rows Count:      ${reconcile.invalidRows?.length}`);
if (reconcile.invalidRows?.length > 0) {
  console.log('Invalid rows details:');
  reconcile.invalidRows.forEach(ir => {
    console.log(`  - MatchKey: ${ir.matchKey}, Errors: ${ir.errors.join(', ')}`);
  });
}
console.log(`  Unassigned Assets:       ${reconcile.stagedAssets.filter(a => a.status === 'AVAILABLE').length}`);

// ----------------------------------------------------
// 5. STEP 4: Review Clean 13-Column Dataset & Assertions
// ----------------------------------------------------
console.log('\n--- STEP 4: Review Clean Dataset & Validations ---');

// Check 1: Asset present in multiple files (ABC001)
const abcAsset = reconcile.stagedAssets.find(a => a.serialNumber === 'ABC001');
if (!abcAsset) {
  throw new Error('FAILED: ABC001 not found in staged assets!');
}
console.log('✓ Assertion 1: Asset present in multiple files (ABC001)');
console.log(`  - Serial:      ${abcAsset.serialNumber}`);
console.log(`  - Asset Name:  ${abcAsset.assetName}`);
console.log(`  - Make/Model:  ${abcAsset.make} ${abcAsset.model}`);
console.log(`  - OS:          ${abcAsset.operatingSystem}`);
console.log(`  - Remarks:     ${abcAsset.remarks}`);
console.log(`  - Merge Type:  ${abcAsset.mergeType}`);

if (!abcAsset.remarks.includes('Intel i5') || !abcAsset.remarks.includes('16GB')) {
  throw new Error('FAILED: Specs (Intel i5, 16GB) were not combined into Remarks for ABC001!');
}

// Check 2: Asset present in only one file (XYZ999)
const xyzAsset = reconcile.stagedAssets.find(a => a.serialNumber === 'XYZ999');
if (!xyzAsset) {
  throw new Error('FAILED: XYZ999 not found in staged assets!');
}
console.log('✓ Assertion 2: Asset present in only one file (XYZ999)');
console.log(`  - Serial:      ${xyzAsset.serialNumber}`);
console.log(`  - Asset Name:  ${xyzAsset.assetName}`);
console.log(`  - Make/Model:  ${xyzAsset.make} ${xyzAsset.model}`);

// Check 3: Unassigned asset (UNASSIGNED-01)
const unassignedAsset = reconcile.stagedAssets.find(a => a.serialNumber === 'UNASSIGNED-01');
if (!unassignedAsset) {
  throw new Error('FAILED: UNASSIGNED-01 not found in staged assets!');
}
console.log('✓ Assertion 3: Unassigned Asset (UNASSIGNED-01)');
console.log(`  - Serial:      ${unassignedAsset.serialNumber}`);
console.log(`  - Status:      ${unassignedAsset.status}`);
console.log(`  - Custodian:   ${unassignedAsset.custodian?.name || '(none)'}`);

if (unassignedAsset.status !== 'AVAILABLE') {
  throw new Error(`FAILED: Expected UNASSIGNED-01 status to be AVAILABLE, got: ${unassignedAsset.status}`);
}

// Check 4: Duplicate / Complementary asset
console.log('✓ Assertion 4: Duplicate/Complementary records combined into ONE logical asset');
const abcOccurrences = reconcile.stagedAssets.filter(a => a.serialNumber === 'ABC001');
if (abcOccurrences.length !== 1) {
  throw new Error(`FAILED: ABC001 should be exactly 1 asset record, found: ${abcOccurrences.length}`);
}
console.log(`  - Exactly 1 logical asset created for ABC001 across 3 files.`);

// Check 5: Conflicting record (CONF-001)
console.log('✓ Assertion 5: Conflict Detection for CONF-001');
const confAsset = reconcile.stagedAssets.find(a => a.serialNumber === 'CONF-001');
if (!confAsset) {
  throw new Error('FAILED: CONF-001 not found in staged assets!');
}
const conflictItem = reconcile.conflicts.find(c => c.serialNumber === 'CONF-001');
if (!conflictItem) {
  throw new Error('FAILED: Conflict for CONF-001 was not detected!');
}
console.log(`  - Conflict detected on field: "${conflictItem.field}"`);
console.log(`  - File 1 value: "${conflictItem.valueA}" vs File 2 value: "${conflictItem.valueB}"`);

// Resolve conflict: Admin chooses Dell (valueA)
console.log('\n--- Resolving Conflict (Choose Dell) ---');
const resolved = await importService.resolveConflicts(analysis.importToken, {
  conflictResolutions: [{ conflictId: conflictItem.conflictId, choice: 'USE_A' }]
});

const resolvedConfAsset = resolved.stagedAssets.find(a => a.serialNumber === 'CONF-001');
console.log(`✓ Resolved Make for CONF-001: ${resolvedConfAsset.make}`);
if (resolvedConfAsset.make !== 'Dell') {
  throw new Error(`FAILED: Expected CONF-001 make to be Dell after resolution, got ${resolvedConfAsset.make}`);
}

// ----------------------------------------------------
// 6. Verify 13 Columns Structure
// ----------------------------------------------------
console.log('\n--- Final Verification: Standard 13-Column Dataset ---');
const standard13Fields = [
  'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
  'Asset Name', 'Make', 'Model', 'Serial Number', 'Install Date',
  'Warranty End', 'Type of OS + Version', 'Remarks'
];

console.log('Required 13 Columns:');
standard13Fields.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

console.log('\nSample Final Cleaned Records:');
resolved.stagedAssets.forEach(a => {
  const os = [a.operatingSystem, a.osVersion].filter(Boolean).join(' ') || a.typeOfOsAndVersion || '—';
  console.log(`\n[Asset: ${a.serialNumber}] Status: ${a.status}`);
  console.log(`  1. User Name:     ${a.custodian?.name || '—'}`);
  console.log(`  2. Designation:   ${a.custodian?.designation || '—'}`);
  console.log(`  3. Department:    ${a.department || '—'}`);
  console.log(`  4. Floor:         ${a.floor || '—'}`);
  console.log(`  5. Employee ID:   ${a.custodian?.employeeId || '—'}`);
  console.log(`  6. Asset Name:    ${a.assetName || '—'}`);
  console.log(`  7. Make:          ${a.make || '—'}`);
  console.log(`  8. Model:         ${a.model || '—'}`);
  console.log(`  9. Serial Number: ${a.serialNumber || '—'}`);
  console.log(`  10. Install Date: ${a.installDate ? new Date(a.installDate).toISOString().split('T')[0] : '—'}`);
  console.log(`  11. Warranty End: ${a.warrantyEndDate || a.warrantyEnd ? new Date(a.warrantyEndDate || a.warrantyEnd).toISOString().split('T')[0] : '—'}`);
  console.log(`  12. OS + Version: ${os}`);
  console.log(`  13. Remarks:      ${a.remarks || '—'}`);
});

console.log('\n====================================================');
console.log('ALL TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
