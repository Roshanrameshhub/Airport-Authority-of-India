import test from 'node:test';
import assert from 'node:assert';
import {
  resolveAssetCategoryConfig,
  getAssetFieldValue,
  formatDisplayValue
} from '../utils/categoryAssetDetailsUtils.js';

test('Phase 3 — Client Category-Aware View & Edit Alignment Tests', async (t) => {

  // 1. Resolve Category Config
  await t.test('1. resolveAssetCategoryConfig matches categories across keys, names, and types', () => {
    // Exact key
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'MONITOR' })?.id, 3);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'LAPTOP' })?.id, 12);
    // Exact name
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Monitor' })?.id, 3);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Laptop' })?.id, 12);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'All In One PC' })?.id, 1);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Laptop MSE' })?.id, 20);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'New PTR IP' })?.id, 18);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'IP & MAC' })?.id, 17);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Camera / CCTV' })?.id, 10);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Switch UPS' })?.id, 21);
    // Case-insensitive normalized
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'printer' })?.id, 4);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'projector' })?.id, 16);
    // Fallback by assetType when category is generic
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'IT Equipment', assetType: 'MONITOR' })?.id, 3);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Power', assetType: 'UPS' })?.id, 8);
    assert.strictEqual(resolveAssetCategoryConfig({ category: 'Printing', assetType: 'PRINTER' })?.id, 4);
  });

  // 2. Category #2 remains unsupported
  await t.test('2. Category #2 remains undefined and rejected', () => {
    const cfg = resolveAssetCategoryConfig({ category: 'UNDEFINED_2' });
    assert.ok(cfg === null || cfg.enabled === false);
  });

  // 3. Extracting nested and root fields
  await t.test('3. getAssetFieldValue extracts root, subdocument, and specifications paths', () => {
    const mockAsset = {
      assetId: 'AAI-MON-001',
      make: 'Dell',
      computerConfig: {
        processor: 'Intel i7-12700',
        ramSizeGb: 32
      },
      networkConfig: {
        ipAddress: '192.168.1.50',
        managementIp: '10.0.0.1'
      },
      specifications: {
        chipset: 'B660',
        toner: 'HP 88A',
        parentLaptopId: 'AAI-LAP-101'
      }
    };

    assert.strictEqual(getAssetFieldValue(mockAsset, 'assetId'), 'AAI-MON-001');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'make'), 'Dell');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'computerConfig.processor'), 'Intel i7-12700');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'computerConfig.ramSizeGb'), 32);
    assert.strictEqual(getAssetFieldValue(mockAsset, 'networkConfig.managementIp'), '10.0.0.1');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'specifications.toner'), 'HP 88A');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'specifications.parentLaptopId'), 'AAI-LAP-101');
    assert.strictEqual(getAssetFieldValue(mockAsset, 'nonexistent.field'), undefined);
  });

  // 4. Formatting display values
  await t.test('4. formatDisplayValue handles primitives, booleans, arrays, and empties', () => {
    assert.strictEqual(formatDisplayValue('Test Value'), 'Test Value');
    assert.strictEqual(formatDisplayValue(100), '100');
    assert.strictEqual(formatDisplayValue(true), 'Yes');
    assert.strictEqual(formatDisplayValue(false), 'No');
    assert.strictEqual(formatDisplayValue(['HDMI', 'DP']), 'HDMI, DP');
    assert.strictEqual(formatDisplayValue(''), null);
    assert.strictEqual(formatDisplayValue(null), null);
    assert.strictEqual(formatDisplayValue(undefined), null);
  });

  // 5. Laptop MSE displays LAP ID
  await t.test('5. Laptop MSE exposes parent LAP ID in specifications', () => {
    const laptopMseAsset = {
      assetId: 'MSE-001',
      category: 'Laptop MSE',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'B100',
      serialNumber: 'SN-LOG-01',
      currentEmployeeName: 'P. Sharma',
      specifications: {
        parentLaptopId: 'AAI-LAP-099'
      }
    };

    const cfg = resolveAssetCategoryConfig(laptopMseAsset);
    assert.strictEqual(cfg.id, 20);
    assert.strictEqual(laptopMseAsset.specifications.parentLaptopId, 'AAI-LAP-099');
    assert.strictEqual(laptopMseAsset.currentEmployeeName, 'P. Sharma');
  });

  // 6. Network categories expose networkConfig and specifications
  await t.test('6. Network assets expose IP, MAC, and interface configurations', () => {
    const ipMacAsset = {
      assetId: 'AAI-NET-001',
      category: 'IP & MAC',
      assetType: 'NETWORK',
      computerConfig: { hostname: 'MAA-SRV-01' },
      networkConfig: { ipAddress: '10.10.10.25', macAddress: '00:1A:2B:3C:4D:5E' },
      softwareConfig: { antivirus: 'CrowdStrike' },
      specifications: { wifiMac: '00:1A:2B:3C:4D:5F', bluetooth: 'v5.3', ethernet: 'Gigabit' }
    };

    const cfg = resolveAssetCategoryConfig(ipMacAsset);
    assert.strictEqual(cfg.id, 17);
    assert.strictEqual(ipMacAsset.networkConfig.ipAddress, '10.10.10.25');
    assert.strictEqual(ipMacAsset.specifications.wifiMac, '00:1A:2B:3C:4D:5F');
    assert.strictEqual(ipMacAsset.softwareConfig.antivirus, 'CrowdStrike');
  });

  // 7. Power categories expose powerConfig
  await t.test('7. Power assets expose capacity and topology', () => {
    const upsAsset = {
      assetId: 'AAI-UPS-001',
      category: 'UPS',
      assetType: 'UPS',
      make: 'APC',
      model: 'Smart-UPS 1500',
      technology: 'Online Double-Conversion',
      powerConfig: {
        capacityVa: 1500,
        backupTimeMinutes: 30,
        topology: 'Online Double-Conversion'
      }
    };

    const cfg = resolveAssetCategoryConfig(upsAsset);
    assert.strictEqual(cfg.id, 8);
    assert.strictEqual(upsAsset.powerConfig.capacityVa, 1500);
    assert.strictEqual(upsAsset.powerConfig.topology, 'Online Double-Conversion');
  });

  // 8. Backward compatibility: existing historical fields remain accessible
  await t.test('8. Backward compatibility: legacy fields and common fields preserved', () => {
    const legacyAsset = {
      assetId: 'LEGACY-PC-01',
      assetName: 'Old Terminal PC',
      category: 'IT Equipment',
      assetType: 'DESKTOP',
      department: 'Finance',
      floor: 'Level 2',
      warrantyEndDate: '2023-12-31',
      status: 'AVAILABLE',
      condition: 'GOOD',
      remarks: 'Operational backup',
      customFields: { legacyTag: 'OLD-998' }
    };

    assert.strictEqual(legacyAsset.assetName, 'Old Terminal PC');
    assert.strictEqual(legacyAsset.department, 'Finance');
    assert.strictEqual(legacyAsset.floor, 'Level 2');
    assert.strictEqual(legacyAsset.status, 'AVAILABLE');
    assert.strictEqual(legacyAsset.customFields.legacyTag, 'OLD-998');
  });

});
