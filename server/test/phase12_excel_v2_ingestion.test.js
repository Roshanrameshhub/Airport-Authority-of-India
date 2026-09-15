import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('Phase 12 Excel Multi-Attribute Ingestion & Schema V2 Mapping Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  await t.test('Acquire administrator token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    adminToken = body.data.token;
    assert.ok(adminToken, 'Admin token acquired');
  });

  // Helper to create multipart form-data payload in pure Node
  const createMultipartFormData = (buffer, filename, fieldName = 'files') => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';
    
    let postData = Buffer.concat([
      Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}` +
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`
      ),
      buffer,
      Buffer.from(`${crlf}--${boundary}--${crlf}`)
    ]);

    return {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${adminToken}`
      },
      body: postData
    };
  };

  let importToken = '';
  const testPcSerial = 'V2-INGEST-PC-0099';
  const testMonSerial = 'V2-INGEST-MON-0099';

  await t.test('Analyze workbook with rich AAI Phase 12 columns', async () => {
    // Construct real-world AAI inventory sheet
    const wb = XLSX.utils.book_new();
    const data = [
      [
        'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
        'Asset Name', 'Make', 'Model', 'Serial Number', 'Old Asset Tag',
        'Asset Type', 'Supplier Name', 'PO Number', 'Purchase Cost',
        'Room No', 'Intercom', 'IP Address', 'MAC Address',
        'Under AMC', 'AMC Contract ID', 'Processor', 'RAM (GB)', 'Storage (GB)',
        'Screen Size (Inches)', 'Install Date', 'Warranty End', 'Remarks'
      ],
      [
        'Senthil Kumar', 'Senior Manager (CNS)', 'CNS Department', '2nd Floor', 'AAI-20104',
        'Dell OptiPlex 7000 MT', 'Dell', 'OptiPlex 7000', testPcSerial, 'AAI-CHN-2019-881',
        'DESKTOP', 'Dell India Pvt Ltd', 'GEMC-5116899', '72500',
        'Room 204', 'Ext 441', '10.20.14.88', '00:1A:2B:3C:4D:EE',
        'true', 'AMC-2024-DELL-01', 'Intel Core i7-12700', '32', '1024',
        '', '2023-01-15', '2026-01-15', 'Primary radar processing workstation'
      ],
      [
        'Senthil Kumar', 'Senior Manager (CNS)', 'CNS Department', '2nd Floor', 'AAI-20104',
        'Dell Professional P2422H', 'Dell', 'P2422H', testMonSerial, 'AAI-CHN-2019-882',
        'MONITOR', 'Dell India Pvt Ltd', 'GEMC-5116899', '14500',
        'Room 204', 'Ext 441', '', '',
        'true', 'AMC-2024-DELL-01', '', '', '',
        '24', '2023-01-15', '2026-01-15', 'Radar monitoring visual display'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Hardware_Inventory');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const multipart = createMultipartFormData(buffer, 'AAI_Rich_Hardware.xlsx');
    const res = await fetch(`${baseUrl}/import/analyze`, {
      method: 'POST',
      headers: multipart.headers,
      body: multipart.body
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.importToken);
    importToken = body.data.importToken;

    const sheet = body.data.files[0].sheets[0];
    assert.strictEqual(sheet.sheetName, 'Hardware_Inventory');

    // Verify canonical mappings detected
    const mappings = Object.values(sheet.mappings);
    assert.ok(mappings.includes('oldAssetId'), 'oldAssetId should be auto-mapped');
    assert.ok(mappings.includes('supplier'), 'supplier should be auto-mapped');
    assert.ok(mappings.includes('supplyOrderNumber'), 'supplyOrderNumber should be auto-mapped');
    assert.ok(mappings.includes('purchaseCost'), 'purchaseCost should be auto-mapped');
    assert.ok(mappings.includes('room'), 'room should be auto-mapped');
    assert.ok(mappings.includes('intercom'), 'intercom should be auto-mapped');
    assert.ok(mappings.includes('ipAddress'), 'ipAddress should be auto-mapped');
    assert.ok(mappings.includes('macAddress'), 'macAddress should be auto-mapped');
    assert.ok(mappings.includes('amcApplicable'), 'amcApplicable should be auto-mapped');
    assert.ok(mappings.includes('processor'), 'processor should be auto-mapped');
    assert.ok(mappings.includes('ramSizeGb'), 'ramSizeGb should be auto-mapped');
    assert.ok(mappings.includes('storageCapacityGb'), 'storageCapacityGb should be auto-mapped');
    assert.ok(mappings.includes('screenSizeInches'), 'screenSizeInches should be auto-mapped');
  });

  await t.test('Reconcile and validate staged records', async () => {
    const res = await fetch(`${baseUrl}/import/reconcile/${importToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.metrics.readyCount, 2);
  });

  await t.test('Commit import and verify rich attributes & configs persisted', async () => {
    const res = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ importToken, conflictStrategy: 'OVERWRITE_EXISTING' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.importedCount, 2);

    // Verify PC asset record
    const pcAsset = await assetRepository.findBySerialNumber(testPcSerial);
    assert.ok(pcAsset, 'PC Asset should be created');
    assert.strictEqual(pcAsset.oldAssetId, 'AAI-CHN-2019-881');
    assert.strictEqual(pcAsset.supplier, 'Dell India Pvt Ltd');
    assert.strictEqual(pcAsset.supplyOrderNumber, 'GEMC-5116899');
    assert.strictEqual(pcAsset.purchaseCost, 72500);
    assert.strictEqual(pcAsset.room, 'Room 204');
    assert.strictEqual(pcAsset.intercom, 'Ext 441');
    assert.strictEqual(pcAsset.ipAddress, '10.20.14.88');
    assert.strictEqual(pcAsset.macAddress, '00:1A:2B:3C:4D:EE');
    assert.strictEqual(pcAsset.amcApplicable, true);
    assert.strictEqual(pcAsset.amcContractId, 'AMC-2024-DELL-01');
    assert.ok(pcAsset.computerConfig, 'PC computerConfig should be populated');
    assert.strictEqual(pcAsset.computerConfig.processor, 'Intel Core i7-12700');
    assert.strictEqual(pcAsset.computerConfig.ramSizeGb, 32);
    assert.strictEqual(pcAsset.computerConfig.storageCapacityGb, 1024);

    // Verify Monitor asset record
    const monAsset = await assetRepository.findBySerialNumber(testMonSerial);
    assert.ok(monAsset, 'Monitor Asset should be created');
    assert.strictEqual(monAsset.oldAssetId, 'AAI-CHN-2019-882');
    assert.strictEqual(monAsset.supplier, 'Dell India Pvt Ltd');
    assert.strictEqual(monAsset.purchaseCost, 14500);
    assert.ok(monAsset.displayConfig, 'Monitor displayConfig should be populated');
    assert.strictEqual(monAsset.displayConfig.screenSizeInches, 24);
  });
});
