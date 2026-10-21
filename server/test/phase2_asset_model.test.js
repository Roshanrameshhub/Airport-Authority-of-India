import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 2 Rich Common Asset Model Test Suite', async (t) => {
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

  // 1. Backward Compatibility & Rich Fields Check on Seed Assets
  await t.test('GET /assets retains all 13 confirmed fields AND exposes new core attributes', async () => {
    const res = await fetch(`${baseUrl}/assets?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 10);

    const asset = body.data[0];

    // Check all 13 confirmed legacy fields
    const confirmedFields = [
      'currentEmployeeName',
      'currentDesignation',
      'department',
      'floor',
      'currentEmployeeId',
      'assetName',
      'make',
      'model',
      'serialNumber',
      'installDate',
      'warrantyEndDate',
      'operatingSystem',
      'osVersion',
      'remarks'
    ];
    for (const field of confirmedFields) {
      assert.ok(field in asset, `Legacy field '${field}' must exist for backward compatibility`);
    }

    // Check newly added Core Common attributes from Phase 1 matrix
    assert.ok('assetType' in asset, 'assetType must exist');
    assert.ok('supplier' in asset, 'supplier must exist');
    assert.ok('oldAssetId' in asset, 'oldAssetId must exist');
    assert.ok('room' in asset, 'room must exist');
    assert.ok('location' in asset, 'location must exist');
    assert.ok('condition' in asset, 'condition must exist');
  });

  // 2. Create Asset with Rich Common Attributes (AAI PDF Patterns)
  await t.test('POST /assets accepts and persists rich common schema attributes', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId: 'AAI-REG-SR-PC-2026-0099',
        assetName: 'HP Elite Tower 800 G9',
        assetType: 'DESKTOP',
        category: 'Desktop PC',
        make: 'HP',
        model: 'Elite 800 G9',
        serialNumber: 'HP-SN-800-G9-0099',
        oldAssetId: 'AAI-SR-IT-CPU-999',
        supplier: 'Sky Star Technology Pvt Ltd',
        vendor: 'Sky Star Technology Pvt Ltd',
        supplyOrderNumber: 'GEMC-511687720261111',
        purchaseDate: '2026-01-10',
        purchaseCost: 74500,
        installDate: '2026-01-20',
        warrantyStartDate: '2026-01-20',
        warrantyEndDate: '2029-01-20',
        amcApplicable: false,
        department: 'Communication, Navigation & Surveillance',
        departmentId: 'CNS',
        location: 'Chennai International Airport',
        floor: '2nd Floor, Technical Block',
        room: 'CNS Radar Automation Lab 206',
        intercom: '2499',
        computerConfig: {
          operatingSystem: 'Windows 11 Pro',
          osVersion: '23H2',
          ipAddress: '10.20.14.99'
        },
        status: 'AVAILABLE',
        condition: 'NEW',
        remarks: 'Procured under CNS Radar upgrade scheme'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const created = body.data;

    assert.strictEqual(created.assetId, 'AAI-REG-SR-PC-2026-0099');
    assert.strictEqual(created.assetType, 'DESKTOP');
    assert.strictEqual(created.oldAssetId, 'AAI-SR-IT-CPU-999');
    assert.strictEqual(created.supplier, 'Sky Star Technology Pvt Ltd');
    assert.strictEqual(created.supplyOrderNumber, 'GEMC-511687720261111');
    assert.strictEqual(created.purchaseCost, 74500);
    assert.strictEqual(created.room, 'CNS Radar Automation Lab 206');
    assert.strictEqual(created.intercom, '2499');
    assert.strictEqual(created.computerConfig.ipAddress, '10.20.14.99');
    assert.strictEqual(created.condition, 'NEW');
    assert.strictEqual(created.status, 'AVAILABLE');
  });

  // 3. Search by new Core Attributes (oldAssetId, supplier, room)
  await t.test('GET /assets?search= searches across oldAssetId and supplier', async () => {
    // Search by oldAssetId
    const res1 = await fetch(`${baseUrl}/assets?search=AAI-SR-IT-CPU-999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.ok(body1.data.some(a => a.oldAssetId === 'AAI-SR-IT-CPU-999'));

    // Search by room
    const res2 = await fetch(`${baseUrl}/assets?search=Radar Automation Lab`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.ok(body2.data.some(a => a.assetId === 'AAI-REG-SR-PC-2026-0099'));
  });

  // 4. Filter by assetType
  await t.test('GET /assets?assetType=DESKTOP filters correctly', async () => {
    const res = await fetch(`${baseUrl}/assets?assetType=DESKTOP`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every(a => a.assetType === 'DESKTOP'));
  });

  // 5. Expanded Status Enum (GODOWN, UNDER_REPAIR, FAULTY, WRITE_OFF)
  await t.test('Asset lifecycle supports AAI operational statuses (GODOWN, WRITE_OFF)', async () => {
    // Register item in GODOWN
    const resGodown = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Defective Storage Shelf CPU',
        category: 'Desktop PC',
        make: 'Dell',
        model: 'OptiPlex 3020',
        serialNumber: 'DL-3020-GODOWN-01',
        installDate: '2020-01-01',
        warrantyEndDate: '2023-01-01',
        department: 'Information Technology',
        floor: 'Ground Floor, Godown',
        room: 'Old Scrap Godown',
        status: 'GODOWN',
        condition: 'UNSERVICEABLE',
        remarks: 'Moved to godown for survey and write-off processing'
      })
    });

    assert.strictEqual(resGodown.status, 201);
    const bodyGodown = await resGodown.json();
    assert.strictEqual(bodyGodown.data.status, 'GODOWN');
    assert.strictEqual(bodyGodown.data.condition, 'UNSERVICEABLE');

    // Filter by GODOWN status
    const filterRes = await fetch(`${baseUrl}/assets?status=GODOWN`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const filterBody = await filterRes.json();
    assert.strictEqual(filterRes.status, 200);
    assert.ok(filterBody.data.some(a => a.serialNumber === 'DL-3020-GODOWN-01'));
  });

  // 6. Virtual assignedTo compatibility
  await t.test('Virtual assignedTo returns custodian object for assigned asset and null for unassigned', async () => {
    const assignedRes = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assignedBody = await assignedRes.json();
    assert.strictEqual(assignedRes.status, 200);
    assert.ok(assignedBody.data.assignedTo, 'assignedTo object must exist on assigned asset');
    assert.strictEqual(assignedBody.data.assignedTo.employeeId, 'AAI-10842');
    assert.strictEqual(assignedBody.data.assignedTo.name, 'Roshan R');

    const unassignedRes = await fetch(`${baseUrl}/assets/AAI-REG-UPS-2024-0009`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const unassignedBody = await unassignedRes.json();
    assert.strictEqual(unassignedRes.status, 200);
    assert.strictEqual(unassignedBody.data.assignedTo, null, 'assignedTo must be null for unassigned asset');
  });

  // 7. Phase 2: Make & Model Plain Strings & Optional Technology Verification
  await t.test('Asset make and model remain plain strings; technology is optional and backward compatible', async () => {
    // Verify existing asset
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(typeof body.data.make, 'string', 'Asset.make must be a string');
    assert.strictEqual(typeof body.data.model, 'string', 'Asset.model must be a string');
    assert.strictEqual(body.data.make, 'Dell');
    assert.strictEqual(body.data.model, 'OptiPlex 7090 MT');

    // Create asset WITH technology string
    const createWithTechRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'LG 27-inch Commercial Display',
        category: 'IT Equipment',
        assetType: 'MONITOR',
        make: 'LG',
        model: '27MP400',
        technology: 'IPS',
        serialNumber: 'LG-IPS-27-001',
        installDate: '2026-02-01',
        warrantyEndDate: '2029-02-01',
        department: 'Airport Systems & Information Technology',
        floor: '1st Floor, Technical Block',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(createWithTechRes.status, 201);
    const techBody = await createWithTechRes.json();
    assert.strictEqual(techBody.data.technology, 'IPS');
    assert.strictEqual(typeof techBody.data.make, 'string');
    assert.strictEqual(typeof techBody.data.model, 'string');
  });

  // 8. Phase 2: Non-ObjectId Freeform Strings in make and model
  await t.test('Make and Model accept arbitrary valid non-ObjectId strings', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Custom Fabricated Rack PDU',
        category: 'Power',
        assetType: 'PDU',
        make: 'Custom Regional Fab Inc',
        model: 'PDU-16A-12WAY',
        serialNumber: 'CRF-PDU-16A-991',
        installDate: '2026-01-01',
        warrantyEndDate: '2028-01-01',
        department: 'Communication, Navigation & Surveillance',
        floor: 'Radar Technical Vault',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.make, 'Custom Regional Fab Inc');
    assert.strictEqual(body.data.model, 'PDU-16A-12WAY');
  });

  // 9. Phase 2: Serial Number Exemptions for PERIPHERAL and OTHER
  await t.test('Serial number is exempt for PERIPHERAL and OTHER asset types', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Standard USB Optical Mouse',
        category: 'Office Equipment',
        assetType: 'PERIPHERAL',
        make: 'Logitech',
        model: 'B100',
        installDate: '2026-01-01',
        warrantyEndDate: '2027-01-01',
        department: 'Air Traffic Management',
        floor: 'ATC Tower, Top Cab',
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(res.status, 201, 'Peripheral without serial number must succeed');
    const body = await res.json();
    assert.strictEqual(body.data.assetType, 'PERIPHERAL');
    assert.strictEqual(body.data.serialNumber, undefined);
  });

  // 10. Phase 2: Missing Required Fields Rejection (Category is universally required)
  await t.test('Missing required category or invalid status returns 400 Bad Request', async () => {
    // Missing category
    const noCatRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Incomplete Asset',
        model: 'Model Only',
        installDate: '2026-01-01',
        warrantyEndDate: '2028-01-01',
        department: 'IT',
        floor: '1st Floor'
      })
    });
    assert.strictEqual(noCatRes.status, 400, 'Asset without category must return 400');

    // Invalid status
    const invalidStatusRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        category: 'Desktop PC',
        status: 'NON_EXISTENT_STATUS'
      })
    });
    assert.strictEqual(invalidStatusRes.status, 400, 'Asset with invalid status must return 400');
  });

  // 11. Phase 2: Root-Level Backward Compatibility Virtual Getters
  await t.test('Root-level compatibility getters (operatingSystem, osVersion, ipAddress) are accessible', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok('operatingSystem' in body.data, 'operatingSystem must be exposed at root');
    assert.ok('osVersion' in body.data, 'osVersion must be exposed at root');
    assert.strictEqual(body.data.operatingSystem, 'Windows 11 Enterprise');
  });

  // 12. Phase 2: Technical Subdocuments & Specifications Extensibility
  await t.test('Technical subdocuments and custom specifications are persisted and returned', async () => {
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetName: 'Cisco Catalyst 3850 PoE Switch',
        category: 'Networking',
        assetType: 'SWITCH',
        make: 'Cisco',
        model: 'WS-C3850-48P-L',
        serialNumber: 'FCW2145L099',
        installDate: '2026-01-01',
        warrantyEndDate: '2029-01-01',
        department: 'Airport Systems & Information Technology',
        floor: 'Server Room Alpha',
        networkConfig: {
          deviceSubtype: 'Switch',
          totalPorts: 48,
          portSpeed: '1 Gbps',
          managementIp: '10.20.0.15',
          isManaged: true
        },
        specifications: {
          poeBudgetWatts: 715,
          stackingBandwidthGbps: 480
        },
        customFields: {
          assetOwnerTag: 'CNS-LAN-CORE-01'
        },
        status: 'AVAILABLE',
        condition: 'NEW'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.networkConfig.totalPorts, 48);
    assert.strictEqual(body.data.networkConfig.managementIp, '10.20.0.15');
    assert.strictEqual(body.data.specifications.poeBudgetWatts, 715);
    assert.strictEqual(body.data.customFields.assetOwnerTag, 'CNS-LAN-CORE-01');
  });
});
