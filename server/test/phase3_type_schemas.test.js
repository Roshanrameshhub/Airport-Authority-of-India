import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 3 Type-Specific Schemas & Configurations Test Suite', async (t) => {
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

  // 1. Verify seed assets contain type-specific configurations
  await t.test('GET /assets/:id retrieves computerConfig on workstation', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const asset = body.data;

    assert.ok(asset.computerConfig, 'computerConfig must exist on workstation');
    assert.strictEqual(asset.computerConfig.processor, 'Intel Core i7-10700');
    assert.strictEqual(asset.computerConfig.ramSizeGb, 16);
    assert.strictEqual(asset.computerConfig.storageType, 'NVMe SSD');
    assert.strictEqual(asset.computerConfig.storageCapacityGb, 512);
  });

  await t.test('GET /assets/:id retrieves displayConfig on monitor', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-MON-2024-0005`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const asset = body.data;

    assert.ok(asset.displayConfig, 'displayConfig must exist on monitor');
    assert.strictEqual(asset.displayConfig.screenSizeInches, 27);
    assert.strictEqual(asset.displayConfig.panelType, 'IPS Black');
    assert.ok(Array.isArray(asset.displayConfig.ports));
  });

  await t.test('GET /assets/:id retrieves powerConfig on UPS', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const asset = body.data;

    assert.ok(asset.powerConfig, 'powerConfig must exist on UPS');
    assert.strictEqual(asset.powerConfig.capacityVa, 1500);
    assert.strictEqual(asset.powerConfig.topology, 'Line-Interactive');
    assert.strictEqual(asset.powerConfig.estimatedBackupMinutes, 25);
  });

  // 2. Register new high-end workstation with computerConfig
  await t.test('POST /assets registers workstation with complete computerConfig', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-PC-2026-TWR-01',
        assetName: 'Lenovo ThinkStation P360 Tower',
        assetType: 'DESKTOP',
        category: 'Desktop PC',
        make: 'Lenovo',
        model: 'ThinkStation P360',
        serialNumber: 'LN-P360-99001',
        oldAssetId: 'AAI-SR-IT-CPU-701',
        supplier: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720269999',
        installDate: '2026-03-01',
        warrantyEndDate: '2029-03-01',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Radar Simulation Lab',
        status: 'AVAILABLE',
        condition: 'NEW',
        computerConfig: {
          processor: 'Intel Core i9-12900K',
          processorSpeed: '3.20 GHz (Up to 5.20 GHz)',
          ramSizeGb: 64,
          ramType: 'DDR5',
          ramSlots: 4,
          storageType: 'NVMe SSD',
          storageCapacityGb: 1024,
          storageModel: 'Samsung PM9A1 1TB NVMe',
          graphicsCard: 'NVIDIA RTX A4000 16GB',
          formFactor: 'Tower',
          operatingSystem: 'Windows 11 Pro for Workstations',
          osArchitecture: '64-bit'
        }
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.computerConfig.processor, 'Intel Core i9-12900K');
    assert.strictEqual(body.data.computerConfig.ramSizeGb, 64);
    assert.strictEqual(body.data.computerConfig.graphicsCard, 'NVIDIA RTX A4000 16GB');
  });

  // 3. Register Online UPS with powerConfig
  await t.test('POST /assets registers enterprise Online UPS with powerConfig', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-UPS-2026-ONL-01',
        assetName: 'Eaton 9PX 3000VA Online Double Conversion UPS',
        assetType: 'UPS',
        category: 'UPS',
        make: 'Eaton',
        model: '9PX3000IRT2U',
        serialNumber: 'ETN-9PX-3000-881',
        supplier: 'Broadline Computers',
        installDate: '2026-02-15',
        warrantyEndDate: '2029-02-15',
        department: 'Information Technology',
        floor: '2nd Floor, Admin Block',
        room: 'Server Room Main UPS Rack',
        status: 'AVAILABLE',
        condition: 'NEW',
        powerConfig: {
          capacityVa: 3000,
          capacityWatts: 2700,
          topology: 'Online Double Conversion',
          batteryType: 'Sealed Lead Acid (VRLA)',
          batteryQuantity: 6,
          estimatedBackupMinutes: 45
        }
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.powerConfig.capacityVa, 3000);
    assert.strictEqual(body.data.powerConfig.topology, 'Online Double Conversion');
  });

  // 4. Register Network Switch with networkConfig
  await t.test('POST /assets registers Layer 3 Network Switch with networkConfig', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-NET-2026-SW-01',
        assetName: 'Cisco Catalyst 9300 48-Port PoE+ Switch',
        assetType: 'NETWORK',
        category: 'Network Switch',
        make: 'Cisco',
        model: 'C9300-48P',
        serialNumber: 'FOC2441L0AA',
        supplier: 'Sky Star Technology Pvt Ltd',
        installDate: '2026-01-10',
        warrantyEndDate: '2029-01-10',
        department: 'Communication, Navigation & Surveillance',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Main Distribution Frame (MDF) Room',
        status: 'AVAILABLE',
        condition: 'NEW',
        networkConfig: {
          deviceSubtype: 'Layer 3 Distribution Switch',
          totalPorts: 48,
          portSpeed: '1 Gbps PoE+ / 10 Gbps Uplink',
          managementIp: '10.20.10.2',
          firmwareVersion: 'Cisco IOS-XE 17.9.4',
          isManaged: true
        }
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.networkConfig.totalPorts, 48);
    assert.strictEqual(body.data.networkConfig.managementIp, '10.20.10.2');
  });

  // 5. Update nested type-specific configuration
  await t.test('PUT /assets/:id updates nested RAM configuration', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2026-TWR-01`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        computerConfig: {
          processor: 'Intel Core i9-12900K',
          ramSizeGb: 128, // Upgraded from 64 to 128
          storageCapacityGb: 2048, // Upgraded from 1TB to 2TB
          storageType: 'NVMe SSD',
          operatingSystem: 'Windows 11 Pro for Workstations'
        },
        remarks: 'Upgraded RAM to 128GB and SSD to 2TB for 4K Radar rendering'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.computerConfig.ramSizeGb, 128);
    assert.strictEqual(body.data.computerConfig.storageCapacityGb, 2048);
    assert.match(body.data.remarks, /Upgraded RAM to 128GB/);
  });
});
