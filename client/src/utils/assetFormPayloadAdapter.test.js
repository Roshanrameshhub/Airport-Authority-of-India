import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetPayload } from './assetFormPayloadAdapter.js';

describe('Asset Form Payload Adapter (Phase 2B)', () => {
  it('1. Valid Monitor payload correctly maps aliases and specifications', () => {
    const form = {
      assetId: 'MON-101',
      serialNumber: 'SN-MON-99',
      make: 'Dell',
      model: 'UltraSharp U2422H',
      technology: 'IPS Black',
      installDate: '2024-05-10',
      suppliedBy: 'Dell India',
      supplyOrderNo: 'GEM-2024-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2027-05-10',
      data: 'DisplayPort 1.4 + HDMI 2.0',
      remarks: 'Primary ATC monitor'
    };

    const payload = buildAssetPayload('MONITOR', form);

    assert.equal(payload.assetId, 'MON-101');
    assert.equal(payload.serialNumber, 'SN-MON-99');
    assert.equal(payload.make, 'Dell');
    assert.equal(payload.model, 'UltraSharp U2422H');
    assert.equal(payload.technology, 'IPS Black');
    assert.equal(payload.installDate, '2024-05-10');
    assert.equal(payload.supplier, 'Dell India');
    assert.equal(payload.vendor, 'Dell India');
    assert.equal(payload.supplyOrderNumber, 'GEM-2024-01');
    assert.equal(payload.amcApplicable, false);
    assert.equal(payload.warrantyEndDate, '2027-05-10');
    assert.equal(payload.specifications?.data, 'DisplayPort 1.4 + HDMI 2.0');
    assert.equal(payload.remarks, 'Primary ATC monitor');
    assert.equal(payload.category, 'IT Equipment');
    assert.equal(payload.assetType, 'MONITOR');
  });

  it('2. Valid Laptop payload structures computerConfig and softwareConfig', () => {
    const form = {
      assetId: 'LAP-202',
      serialNumber: 'SN-LAP-88',
      make: 'Lenovo',
      model: 'ThinkPad T14',
      processor: 'Intel Core i7-1365U',
      speed: '2.80 GHz',
      chipset: 'Intel SoC',
      ram: 16,
      ramType: 'DDR5',
      ramSpeed: '5200 MHz',
      ramSlots: 2,
      hddSize: 512,
      hddMakeAndModel: 'Kioxia 512GB NVMe',
      cdDrive: 'None',
      dvdDrive: 'None',
      nic: 'Gigabit Ethernet + Wi-Fi 6E',
      installDate: '2024-06-01',
      suppliedBy: 'Lenovo Commercial',
      supplyOrderNo: 'GEM-LPT-99',
      warrantyAmcType: 'AMC',
      warrantyAmcDate: '2026-06-01',
      os: 'Windows 11 Pro',
      msoKey: 'XXXXX-YYYYY-ZZZZZ',
      officeSuite: 'MS Office 2021',
      remarks: 'Admin laptop'
    };

    const payload = buildAssetPayload('LAPTOP', form);

    assert.equal(payload.assetId, 'LAP-202');
    assert.equal(payload.serialNumber, 'SN-LAP-88');
    assert.equal(payload.make, 'Lenovo');
    assert.equal(payload.model, 'ThinkPad T14');
    assert.equal(payload.category, 'IT Equipment');
    assert.equal(payload.assetType, 'LAPTOP');

    // computerConfig checks
    assert.ok(payload.computerConfig);
    assert.equal(payload.computerConfig.processor, 'Intel Core i7-1365U');
    assert.equal(payload.computerConfig.processorSpeed, '2.80 GHz');
    assert.equal(payload.computerConfig.ramSizeGb, 16);
    assert.equal(payload.computerConfig.ramType, 'DDR5');
    assert.equal(payload.computerConfig.ramSlots, 2);
    assert.equal(payload.computerConfig.storageCapacityGb, 512);
    assert.equal(payload.computerConfig.storageModel, 'Kioxia 512GB NVMe');
    assert.equal(payload.computerConfig.opticalDrive, 'None');
    assert.equal(payload.computerConfig.operatingSystem, 'Windows 11 Pro');

    // softwareConfig checks
    assert.ok(payload.softwareConfig);
    assert.equal(payload.softwareConfig.osKey, 'XXXXX-YYYYY-ZZZZZ');
    assert.equal(payload.softwareConfig.officeSuite, 'MS Office 2021');

    // specifications checks (unsupported fields)
    assert.ok(payload.specifications);
    assert.equal(payload.specifications.chipset, 'Intel SoC');
    assert.equal(payload.specifications.ramSpeed, '5200 MHz');
    assert.equal(payload.specifications.nic, 'Gigabit Ethernet + Wi-Fi 6E');

    // AMC check
    assert.equal(payload.amcApplicable, true);
    assert.equal(payload.amcEndDate, '2026-06-01');
    assert.equal(payload.warrantyEndDate, undefined);
  });

  it('3. Valid CPU payload structures all technical specs and office suite keys', () => {
    const form = {
      assetId: 'CPU-303',
      serialNumber: 'SN-CPU-77',
      make: 'HP',
      model: 'ProDesk 600 G6',
      processor: 'Intel Core i5-10500',
      speed: '3.10 GHz',
      chipset: 'Intel Q470',
      ram: '8', // string number should be parsed to Number
      ramType: 'DDR4',
      ramSpeed: '2666 MHz',
      ramSlots: '4',
      hddSize: '1024',
      hddMakeAndModel: 'WD Blue 1TB HDD',
      cdDrive: 'DVD-RW',
      nic: 'Intel I219-LM',
      speaker: 'Internal 2W',
      installDate: '2023-01-15',
      suppliedBy: 'Broadline',
      supplyOrderNo: 'SO-CPU-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2026-01-15',
      os: 'Windows 10 Enterprise',
      msoKey: 'OS-KEY-111',
      officeSuite: 'Office Standard',
      officeSuiteKey: 'OFF-KEY-222'
    };

    const payload = buildAssetPayload('CPU', form);

    assert.equal(payload.assetId, 'CPU-303');
    assert.equal(payload.computerConfig.ramSizeGb, 8);
    assert.equal(payload.computerConfig.ramSlots, 4);
    assert.equal(payload.computerConfig.storageCapacityGb, 1024);
    assert.equal(payload.softwareConfig.osKey, 'OS-KEY-111');
    assert.equal(payload.softwareConfig.officeKey, 'OFF-KEY-222');
    assert.equal(payload.specifications.speaker, 'Internal 2W');
    assert.equal(payload.specifications.nic, 'Intel I219-LM');
  });

  it('4. Valid Projector payload contains no warranty fields', () => {
    const form = {
      make: 'Sony',
      model: 'VPL-CWZ10',
      serialNumber: 'SN-SNY-12',
      location: 'CNS Auditorium',
      installDate: '2024-02-01',
      quantity: 1,
      assetId: 'PRJ-404',
      purchaseDate: '2024-01-20',
      supplyOrderNo: 'SO-PRJ-01',
      suppliedBy: 'Sony India',
      remarks: 'Ceiling mounted'
    };

    const payload = buildAssetPayload('PROJECTOR', form);

    assert.equal(payload.assetId, 'PRJ-404');
    assert.equal(payload.make, 'Sony');
    assert.equal(payload.model, 'VPL-CWZ10');
    assert.equal(payload.serialNumber, 'SN-SNY-12');
    assert.equal(payload.location, 'CNS Auditorium');
    assert.equal(payload.installDate, '2024-02-01');
    assert.equal(payload.purchaseDate, '2024-01-20');
    assert.equal(payload.specifications?.quantity, 1);
    // Projector must NOT have any warranty fields
    assert.equal(payload.amcApplicable, undefined);
    assert.equal(payload.warrantyEndDate, undefined);
    assert.equal(payload.amcEndDate, undefined);
  });

  it('5. Valid Switches payload maps switch description to assetName and config IP to managementIp', () => {
    const form = {
      switchDescription: 'Cisco Catalyst 2960-X 48 Port',
      configIp: '10.20.1.254',
      serialNumber: 'FCW2140A0B1',
      location: 'Main Comm Center Rack 4'
    };

    const payload = buildAssetPayload('SWITCHES', form);

    assert.equal(payload.assetName, 'Cisco Catalyst 2960-X 48 Port');
    assert.equal(payload.serialNumber, 'FCW2140A0B1');
    assert.equal(payload.location, 'Main Comm Center Rack 4');
    assert.equal(payload.networkConfig?.managementIp, '10.20.1.254');
    assert.equal(payload.assetType, 'SWITCH');
  });

  it('6. Valid IP & MAC payload maps networkConfig and specifications', () => {
    const form = {
      assetId: 'NET-PROF-01',
      antivirus: 'Quick Heal Endpoint Security 7.0',
      hostname: 'AAI-MAA-CNS-01',
      ipAddress: '10.20.14.50',
      macAddress: '00:1A:2B:3C:4D:5E',
      wifiMac: '00:1A:2B:3C:4D:5F',
      bluetooth: '00:1A:2B:3C:4D:60',
      ethernet: 'GbE Intel 82579LM'
    };

    const payload = buildAssetPayload('IP_AND_MAC', form);

    assert.equal(payload.assetId, 'NET-PROF-01');
    assert.equal(payload.softwareConfig?.antivirus, 'Quick Heal Endpoint Security 7.0');
    assert.equal(payload.computerConfig?.hostname, 'AAI-MAA-CNS-01');
    assert.equal(payload.networkConfig?.ipAddress, '10.20.14.50');
    assert.equal(payload.networkConfig?.macAddress, '00:1A:2B:3C:4D:5E');
    assert.equal(payload.specifications?.wifiMac, '00:1A:2B:3C:4D:5F');
    assert.equal(payload.specifications?.bluetooth, '00:1A:2B:3C:4D:60');
    assert.equal(payload.specifications?.ethernet, 'GbE Intel 82579LM');
  });

  it('7. Valid New PTR IP payload maps IP address to networkConfig', () => {
    const form = {
      assetId: 'AAI-REG-PRT-2023-0003',
      ipAddress: '10.20.14.200'
    };

    const payload = buildAssetPayload('NEW_PTR_IP', form);

    assert.equal(payload.assetId, 'AAI-REG-PRT-2023-0003');
    assert.equal(payload.networkConfig?.ipAddress, '10.20.14.200');
    assert.equal(payload.assetType, 'PRINTER');
  });

  it('8. LAPTOP MSE exposes parent laptop reference without creating a relationship', () => {
    const form = {
      assetId: 'MSE-505',
      lapId: 'AAI-REG-LPT-2024-0002',
      serialNumber: 'MS-SN-991',
      make: 'Logitech',
      model: 'M90',
      user: 'Roshan R'
    };

    const payload = buildAssetPayload('LAPTOP_MSE', form);

    assert.equal(payload.assetId, 'MSE-505');
    assert.equal(payload.serialNumber, 'MS-SN-991');
    assert.equal(payload.make, 'Logitech');
    assert.equal(payload.model, 'M90');
    assert.equal(payload.currentEmployeeName, 'Roshan R');
    // Check relationship intermediate representation
    assert.ok(payload._relationship);
    assert.equal(payload._relationship.parentAssetId, 'AAI-REG-LPT-2024-0002');
    assert.equal(payload._relationship.relationshipType, 'PERIPHERAL_OF');
    assert.equal(payload._relationship.componentRole, 'MOUSE');
    // Check snapshot in specifications
    assert.equal(payload.specifications?.parentLaptopId, 'AAI-REG-LPT-2024-0002');
  });

  it('9. UPS maps technology to both root and powerConfig.topology, and capacity to capacityVa', () => {
    const form = {
      assetId: 'UPS-606',
      serialNumber: 'SN-UPS-11',
      make: 'Eaton',
      model: '5P 1500',
      capacity: '1500',
      technology: 'Line-Interactive',
      installDate: '2024-01-01',
      suppliedBy: 'Eaton India',
      supplyOrderNo: 'SO-UPS-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2027-01-01'
    };

    const payload = buildAssetPayload('UPS', form);

    assert.equal(payload.assetId, 'UPS-606');
    assert.equal(payload.technology, 'Line-Interactive');
    assert.equal(payload.powerConfig?.capacityVa, 1500);
    assert.equal(payload.powerConfig?.topology, 'Line-Interactive');
  });

  it('10. Warranty mapping for None does not invent a warranty date', () => {
    const form = {
      assetId: 'MON-707',
      serialNumber: 'SN-MON-77',
      make: 'BenQ',
      model: 'GW2480',
      technology: 'IPS',
      installDate: '2020-01-01',
      suppliedBy: 'Local Dealer',
      supplyOrderNo: 'SO-OLD-01',
      warrantyAmcType: 'None',
      warrantyAmcDate: '',
      data: 'HDMI'
    };

    const payload = buildAssetPayload('MONITOR', form);

    assert.equal(payload.amcApplicable, false);
    assert.equal(payload.warrantyEndDate, undefined);
    assert.equal(payload.amcEndDate, undefined);
  });

  it('11. Category #2 is rejected', () => {
    assert.throws(
      () => buildAssetPayload('UNDEFINED_2', {}),
      /undefined/i
    );
    assert.throws(
      () => buildAssetPayload(2, {}),
      /undefined/i
    );
  });

  it('12. Unknown category is rejected', () => {
    assert.throws(
      () => buildAssetPayload('UNKNOWN_CATEGORY', {}),
      /Invalid or unknown/i
    );
  });

  it('13. Original formData object remains unchanged after payload construction', () => {
    const original = Object.freeze({
      assetId: 'MSE-808',
      serialNumber: 'SN-MSE-88',
      make: 'HP',
      model: '150 Mouse',
      technology: 'Optical',
      installDate: '2025-01-01',
      suppliedBy: 'HP',
      supplyOrderNo: 'SO-HP-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2026-01-01',
      remarks: 'Basic optical mouse'
    });

    const payload = buildAssetPayload('MOUSE', original);

    assert.equal(payload.assetId, 'MSE-808');
    assert.equal(original.assetId, 'MSE-808');
  });
});
