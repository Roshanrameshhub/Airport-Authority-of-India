import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { deriveAssetType, migrateAssets } from '../scripts/migrate_phase11.js';
import { assetRepository } from '../src/repositories/assetRepository.js';

test('Phase 11 Database Migration Script Test Suite', async (t) => {
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

  await t.test('deriveAssetType rationalizes strings accurately', () => {
    assert.strictEqual(deriveAssetType('Desktop PC', 'Dell OptiPlex 7090'), 'DESKTOP');
    assert.strictEqual(deriveAssetType('Workstation Tower', 'HP Z440'), 'DESKTOP');
    assert.strictEqual(deriveAssetType('Laptop', 'Lenovo ThinkPad T14'), 'LAPTOP');
    assert.strictEqual(deriveAssetType('Laser Printer', 'HP LaserJet Pro M404dn'), 'PRINTER');
    assert.strictEqual(deriveAssetType('Document Scanner', 'Canon imageFORMULA'), 'SCANNER');
    assert.strictEqual(deriveAssetType('Online UPS', 'APC Smart-UPS RT 3000'), 'UPS');
    assert.strictEqual(deriveAssetType('Display Screen', 'Dell UltraSharp 24 Monitor'), 'MONITOR');
    assert.strictEqual(deriveAssetType('Rack Server', 'PowerEdge R740'), 'SERVER');
    assert.strictEqual(deriveAssetType('Network Switch', 'Cisco Catalyst 2960'), 'NETWORK');
    assert.strictEqual(deriveAssetType('Storage Appliance', 'Synology NAS RackStation'), 'STORAGE');
    assert.strictEqual(deriveAssetType('USB Peripheral', 'Logitech Wireless Mouse'), 'PERIPHERAL');
    assert.strictEqual(deriveAssetType('Custom Gizmo', 'Specialized ATC Sensor'), 'OTHER');
  });

  const legacyAssetId = 'AAI-LEGACY-MIGRATE-01';

  await t.test('Seed a legacy asset requiring migration', async () => {
    // Create an asset lacking assetType, supplier (uses legacy vendor), location, and condition
    const legacyAsset = {
      assetId: legacyAssetId,
      assetName: 'HP EliteDesk 800 G6 Tower',
      category: 'Desktop PC',
      make: 'HP',
      model: 'EliteDesk 800 G6',
      serialNumber: 'HPE-800-LEGACY-01',
      vendor: 'Legacy Systems India Pvt Ltd', // legacy field, missing 'supplier'
      department: 'Finance & Accounts',
      floor: '3rd Floor',
      installDate: new Date('2022-01-01'),
      warrantyEndDate: new Date('2025-01-01'),
      operatingSystem: 'Windows 10 Pro',
      osVersion: '21H2',
      remarks: 'Pre-migration test legacy equipment'
    };

    await assetRepository.create(legacyAsset);

    const check = await assetRepository.findById(legacyAssetId);
    assert.ok(check);
    assert.strictEqual(check.assetId, legacyAssetId);
    assert.strictEqual(check.supplier, undefined);
  });

  await t.test('migrateAssets in dry-run mode identifies changes without committing them', async () => {
    const dryRunResult = await migrateAssets({ dryRun: true, verbose: true });
    assert.ok(dryRunResult.totalScanned > 0);
    assert.ok(dryRunResult.updatedCount >= 1, 'At least legacy asset identified for update');
    assert.strictEqual(dryRunResult.dryRun, true);

    // Verify the record in storage was NOT mutated
    const check = await assetRepository.findById(legacyAssetId);
    assert.strictEqual(check.supplier, undefined, 'Supplier should remain undefined in dry-run');
  });

  await t.test('migrateAssets in live mode applies all normalizations and subdocument configs', async () => {
    const liveResult = await migrateAssets({ dryRun: false, verbose: true });
    assert.ok(liveResult.updatedCount >= 1);

    // Verify the record was properly evolved
    const updated = await assetRepository.findById(legacyAssetId);
    assert.ok(updated);
    assert.strictEqual(updated.assetType, 'DESKTOP', 'assetType should be derived as DESKTOP');
    assert.strictEqual(updated.supplier, 'Legacy Systems India Pvt Ltd', 'supplier should be copied from vendor');
    assert.strictEqual(updated.location, 'Chennai Airport', 'default location should be backfilled');
    assert.strictEqual(updated.condition, 'GOOD', 'default condition should be backfilled');
    assert.strictEqual(updated.status, 'AVAILABLE', 'default status should be backfilled');
    assert.strictEqual(updated.amcApplicable, false, 'amcApplicable should be set to false');
    assert.ok(updated.computerConfig, 'computerConfig should be initialized for DESKTOP');
    assert.strictEqual(updated.computerConfig.ramSizeGb, 16);
    assert.strictEqual(updated.computerConfig.storageCapacityGb, 512);
  });

  await t.test('migrateAssets is idempotent on subsequent runs', async () => {
    const secondRun = await migrateAssets({ dryRun: false, verbose: true });
    assert.strictEqual(secondRun.updatedCount, 0, 'No assets should require updates on subsequent run');
    assert.strictEqual(secondRun.unchangedCount, secondRun.totalScanned, 'All assets are already normalized');
  });
});
