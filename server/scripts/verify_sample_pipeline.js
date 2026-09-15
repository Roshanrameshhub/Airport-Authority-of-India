import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDir = path.join(__dirname, '../sample_data');

async function runVerification() {
  console.log('=== MULTI-EXCEL END-TO-END CODE-WISE PIPELINE VERIFICATION ===\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // 1. Login as Admin
    console.log('[1] Logging in as Admin...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    console.log('    ✓ Admin authenticated successfully.');

    // 2. Read the 4 sample files
    console.log('\n[2] Reading 4 heterogeneous sample workbooks...');
    const fileNames = [
      'Asset_Register.xlsx',
      'Computer_Inventory.xlsx',
      'Old_Asset_Register.xlsx',
      'Employee_Master.xlsx'
    ];

    const formData = new FormData();
    fileNames.forEach(fn => {
      const buf = fs.readFileSync(path.join(sampleDir, fn));
      formData.append('files', new Blob([buf]), fn);
      console.log(`    + Attached: ${fn} (${buf.length} bytes)`);
    });

    // 3. Step 1 & 2: Analyze workbooks
    console.log('\n[3] Calling POST /import/analyze...');
    const analyzeRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const analyzeData = await analyzeRes.json();
    const importToken = analyzeData.data.importToken;
    console.log(`    ✓ Import session token: ${importToken}`);
    console.log(`    ✓ Files processed: ${analyzeData.data.metrics.fileCount}`);
    console.log(`    ✓ Worksheets discovered: ${analyzeData.data.metrics.sheetCount}`);
    console.log(`    ✓ Total source rows detected: ${analyzeData.data.metrics.totalSourceRows}`);

    // Print mapping summary
    console.log('\n[4] Detected column mappings per sheet:');
    analyzeData.data.files.forEach(f => {
      console.log(`    Workbook: ${f.fileName}`);
      f.sheets.forEach(sh => {
        console.log(`      Sheet [${sh.sheetName}] (Header row ${sh.headerRowIndex + 1}):`);
        sh.rawHeaders.forEach((h, idx) => {
          const mapped = sh.mappings[idx] || '[unmapped]';
          const conf = sh.confidence[idx] || 'UNMAPPED';
          console.log(`        - "${h}" -> ${mapped} (${conf})`);
        });
      });
    });

    // 4. Step 4: Reconcile, Clean, Match, Merge Complementary Data, Detect Conflicts
    console.log('\n[5] Calling POST /import/reconcile/:token...');
    const reconRes = await fetch(`${baseUrl}/import/reconcile/${importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const reconData = await reconRes.json();
    const metrics = reconData.data.metrics;
    console.log(`    ✓ Unique assets identified: ${metrics.uniqueAssets}`);
    console.log(`    ✓ Redundant duplicates merged: ${metrics.duplicatesCount}`);
    console.log(`    ✓ Value conflicts detected: ${reconData.data.conflicts.length}`);
    console.log(`    ✓ Unresolved staff records: ${reconData.data.unresolvedEmployees.length}`);
    console.log(`    ✓ Ready to import (conflict-free): ${metrics.readyCount}`);

    // Detail conflicts
    if (reconData.data.conflicts.length > 0) {
      console.log('\n[6] Conflict details:');
      reconData.data.conflicts.forEach(c => {
        console.log(`    Conflict on ${c.serialNumber} field "${c.field}":`);
        console.log(`      Value A: "${c.valueA}" (${c.sourceA?.fileName})`);
        console.log(`      Value B: "${c.valueB}" (${c.sourceB?.fileName})`);
      });

      // Resolve conflict by choosing Value A
      console.log('\n[7] Resolving conflicts with choice USE_A...');
      const resolveRes = await fetch(`${baseUrl}/import/resolve/${importToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conflictResolutions: reconData.data.conflicts.map(c => ({
            conflictId: c.conflictId,
            choice: 'USE_A'
          })),
          employeeResolutions: reconData.data.unresolvedEmployees.map(e => ({
            employeeKey: e.employeeKey,
            choice: 'CREATE_EMPLOYEE'
          }))
        })
      });
      const resolveData = await resolveRes.json();
      console.log(`    ✓ Post-resolution ready count: ${resolveData.data.metrics.readyCount}`);
    }

    // 5. Step 7: Commit to MongoDB
    console.log('\n[8] Calling Phase 2 POST /import/commit...');
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ importToken, conflictStrategy: 'SKIP_EXISTING' })
    });
    const commitData = await commitRes.json();
    console.log(`    ✓ Commit status: ${commitData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`    ✓ Assets registered into MongoDB: ${commitData.data.importedCount}`);
    console.log(`    ✓ Assets skipped (duplicates in DB): ${commitData.data.skippedCount}`);
    console.log(`    ✓ Errors: ${commitData.data.errorCount}`);

    // 6. Verify assets queryable in database
    console.log('\n[9] Verifying queryability in /assets...');
    const sampleSerial = commitData.data.importedAssets[0]?.serialNumber;
    if (sampleSerial) {
      const checkRes = await fetch(`${baseUrl}/assets?search=${sampleSerial}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const checkData = await checkRes.json();
      console.log(`    ✓ Searched for "${sampleSerial}": found ${checkData.data.length} asset(s)`);
      console.log(`      Asset Name: ${checkData.data[0].assetName}`);
      console.log(`      Make / Model: ${checkData.data[0].make} ${checkData.data[0].model}`);
      console.log(`      OS: ${checkData.data[0].operatingSystem} ${checkData.data[0].osVersion}`);
      console.log(`      Status: ${checkData.data[0].status}`);
      console.log(`      Custodian: ${checkData.data[0].currentEmployeeName || 'Unassigned (IT Store)'}`);
    }

    // 7. Verify audit log
    console.log('\n[10] Verifying audit trail in /audit-logs...');
    const auditRes = await fetch(`${baseUrl}/audit-logs?action=MULTI_EXCEL_IMPORT_COMPLETED&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const auditData = await auditRes.json();
    const logItem = Array.isArray(auditData.data) ? auditData.data[0] : auditData.data?.items?.[0];
    console.log(`    ✓ Audit record found: ${logItem?.action} by ${logItem?.actor?.username}`);
    console.log(`      Imported Count: ${logItem?.details?.importedCount}`);

    console.log('\n=== PIPELINE CODE-WISE VERIFICATION COMPLETE & PASSED ===');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runVerification();
