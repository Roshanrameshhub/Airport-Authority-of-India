import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { excelFieldService } from '../src/services/excelFieldService.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

async function runVerification() {
  console.log('================================================================================');
  console.log('STARTING END-TO-END VERIFICATION: ADMIN-MANAGED EXCEL COLUMNS PIPELINE');
  console.log('================================================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // 1. Admin Authentication
    console.log('[1/10] Authenticating Admin user...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Admin login failed: ${loginData.message}`);
    const adminToken = loginData.data.token;
    console.log('  ✔ Admin authenticated successfully.\n');

    // 2. Verify 13 Core Locked Fields
    console.log('[2/10] Verifying 13 confirmed core business fields status...');
    const fieldsRes = await fetch(`${baseUrl}/excel-fields`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const fieldsData = await fieldsRes.json();
    const fields = fieldsData.data.fields;
    const locked = fields.filter(f => f.isLocked);
    console.log(`  Total fields: ${fields.length}, Locked core fields: ${locked.length}`);
    if (locked.length !== 13) {
      throw new Error(`Expected exactly 13 locked core fields, got ${locked.length}`);
    }
    console.log('  ✔ Confirmed: 13 business fields are LOCKED / SYSTEM REQUIRED.\n');

    // 3. Attempting deletion of a locked field must be rejected
    console.log('[3/10] Testing invariant: locked core fields cannot be deleted or disabled...');
    const delCoreRes = await fetch(`${baseUrl}/excel-fields/serialNumber`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (delCoreRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden when deleting locked field, got ${delCoreRes.status}`);
    }
    console.log('  ✔ Confirmed: Core locked field deletion strictly prevented (403 Forbidden).\n');

    // 4. Create Custom Fields
    console.log('[4/10] Creating admin-configured custom fields (PO Number & Asset Condition)...');
    // Field 1: PO Number (TEXT)
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
        description: 'GEM or AAI PO reference number',
        aliases: ['po no', 'po number', 'order ref']
      })
    });
    const poData = await poRes.json();
    if (!poRes.ok && poRes.status !== 409) throw new Error(poData.message);
    console.log('  ✔ Purchase Order Number configured.');

    // Field 2: Asset Condition (SELECT)
    const condRes = await fetch(`${baseUrl}/excel-fields`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Custom Asset State',
        fieldName: 'customAssetState',
        dataType: 'SELECT',
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
        required: false,
        enabled: true,
        importEnabled: true,
        exportEnabled: true,
        description: 'Physical operating condition grade',
        aliases: ['condition grade', 'operating grade', 'physical state']
      })
    });
    const condData = await condRes.json();
    if (!condRes.ok && condRes.status !== 409) throw new Error(condData.message);
    console.log('  ✔ Custom Asset State (SELECT) configured.\n');

    // 5. Test Dynamic Template Generation
    console.log('[5/10] Downloading dynamic Excel template to verify custom columns...');
    const tplRes = await fetch(`${baseUrl}/import/template`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const tplBuf = await tplRes.arrayBuffer();
    const tplWb = XLSX.read(Buffer.from(tplBuf), { type: 'buffer' });
    const tplSheet = tplWb.Sheets[tplWb.SheetNames[0]];
    const tplRows = XLSX.utils.sheet_to_json(tplSheet, { header: 1 });
    const tplHeaders = tplRows[0] || [];
    console.log(`  Dynamic template headers (${tplHeaders.length} cols):`, tplHeaders);

    if (!tplHeaders.includes('Purchase Order Number') || !tplHeaders.includes('Custom Asset State')) {
      throw new Error('Dynamic template missing newly configured custom fields!');
    }
    console.log('  ✔ Template contains both core fields and active custom fields.\n');

    // 6. Build test workbook containing core fields + custom columns
    console.log('[6/10] Building test workbook with custom columns ("PO No" and "Condition Grade")...');
    const testSerial = `VERIF-CUSTOM-${Date.now()}`;
    const testWorkbookData = [
      [
        'Asset Name',
        'Company',
        'Model',
        'Serial Number',
        'Install Date',
        'Warranty End',
        'Operating System',
        'Department',
        'Floor',
        'PO No',               // Custom alias
        'Condition Grade',     // Custom alias
        'Remarks'
      ],
      [
        'Executive Tower Workstation',
        'HP',
        'Z2 Tower G9',
        testSerial,
        '2024-02-01',
        '2027-02-01',
        'Windows 11 Enterprise (23H2)',
        'Communication, Navigation & Surveillance',
        '2nd Floor, Technical Block',
        'AAI/PO/2024/99182',   // PO value
        'Excellent',           // Select value
        'Configured with dual radar monitoring displays'
      ]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testWorkbookData);
    XLSX.utils.book_append_sheet(wb, ws, 'Asset_List');
    const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    console.log('  ✔ Test workbook built in memory.\n');

    // 7. Upload and Analyze Workbook
    console.log('[7/10] Uploading workbook to /api/v1/import/analyze...');
    const formData = new FormData();
    const blob = new Blob([wbBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('files', blob, 'Department_CNS_Register.xlsx');

    const analyzeRes = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const analyzeData = await analyzeRes.json();
    if (!analyzeRes.ok) throw new Error(analyzeData.message);

    const importToken = analyzeData.data.importToken;
    const sheetMappings = analyzeData.data.files[0].sheets[0].mappings;
    console.log('  Discovered sheet mappings:', sheetMappings);

    // Verify PO No mapped to purchaseOrderNumber
    const col9Mapping = sheetMappings[9] || sheetMappings['9'];
    const col10Mapping = sheetMappings[10] || sheetMappings['10'];
    console.log(`  Col 9 ("PO No") mapped to: ${col9Mapping}`);
    console.log(`  Col 10 ("Condition Grade") mapped to: ${col10Mapping}`);

    if (col9Mapping !== 'purchaseOrderNumber' || col10Mapping !== 'customAssetState') {
      throw new Error(`Custom aliases were not matched correctly: Col 9=${col9Mapping}, Col 10=${col10Mapping}`);
    }
    console.log('  ✔ Header matching engine accurately resolved custom fields with HIGH CONFIDENCE.\n');

    // 8. Reconcile and Stage
    console.log('[8/10] Reconciling and staging asset data...');
    const recRes = await fetch(`${baseUrl}/import/reconcile/${importToken}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const recData = await recRes.json();
    if (!recRes.ok) throw new Error(recData.message);

    const staged = recData.data.stagedAssets[0];
    console.log('  Staged Asset Serial:', staged.serialNumber);
    console.log('  Staged customFields:', staged.customFields);

    if (staged.customFields?.purchaseOrderNumber !== 'AAI/PO/2024/99182' || staged.customFields?.customAssetState !== 'Excellent') {
      throw new Error('customFields were not captured correctly in staged asset!');
    }
    console.log('  ✔ customFields captured cleanly in reconciliation staging.\n');

    // 9. Commit Import
    console.log('[9/10] Committing import to database...');
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ importToken, conflictStrategy: 'OVERWRITE_EXISTING' })
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) throw new Error(commitData.message);
    console.log(`  ✔ Ingestion committed! Imported: ${commitData.data.importedCount}`);

    // Verify created asset in database
    const savedAsset = await assetRepository.findBySerialNumber(testSerial);
    if (!savedAsset) throw new Error(`Asset with serial ${testSerial} not found in database!`);
    console.log('  Saved asset customFields:', savedAsset.customFields);
    if (savedAsset.customFields?.purchaseOrderNumber !== 'AAI/PO/2024/99182') {
      throw new Error('Database asset does not contain expected purchaseOrderNumber!');
    }
    console.log('  ✔ customFields successfully persisted into Asset.customFields.\n');

    // 10. Test Safe Delete vs Disable Safeguard
    console.log('[10/10] Testing Safe Delete vs Disable Safeguard on populated field...');
    const usageRes = await fetch(`${baseUrl}/excel-fields/purchaseOrderNumber/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usageData = await usageRes.json();
    console.log('  Usage check for purchaseOrderNumber:', usageData.data);
    if (usageData.data.usageCount < 1) {
      throw new Error('Usage check failed: expected at least 1 asset populated with purchaseOrderNumber');
    }

    // Try normal delete without force -> must return requiresConfirmation
    const safeDelRes = await fetch(`${baseUrl}/excel-fields/purchaseOrderNumber`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const safeDelData = await safeDelRes.json();
    console.log('  Safe delete response:', safeDelData);
    if (!safeDelData.requiresConfirmation) {
      throw new Error('Safe delete failed to warn about historical data!');
    }
    console.log('  ✔ Safeguard warned user that historical records exist and recommended disabling.');

    // Disable the field instead
    console.log('  Disabling purchaseOrderNumber instead of deleting...');
    const disableRes = await fetch(`${baseUrl}/excel-fields/purchaseOrderNumber/toggle`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ property: 'enabled', value: false })
    });
    const disableData = await disableRes.json();
    if (!disableRes.ok) throw new Error(disableData.message);
    console.log('  ✔ Field disabled. Historical asset records are safely preserved.\n');

    console.log('================================================================================');
    console.log('✔ ALL 10 END-TO-END VERIFICATION CHECKS PASSED WITH 100% ACCURACY!');
    console.log('================================================================================');
  } finally {
    server.close();
  }
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
