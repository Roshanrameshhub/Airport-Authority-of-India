import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import Asset from '../src/models/Asset.js';
import { createAssetSchema, updateAssetSchema } from '../src/validations/assetValidation.js';

test('Phase 2D: Backend Schema & Validation Alignment Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire admin token
  await t.test('Acquire administrator token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    adminToken = body.data.token;
    assert.ok(adminToken);
  });

  // 1. Minimal valid Monitor payload accepted
  await t.test('1. Minimal valid Monitor payload accepted', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Dell',
      model: 'P2419H',
      serialNumber: 'MON-P2D-001',
      installDate: '2025-01-15',
      warrantyEndDate: '2028-01-15'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.make, 'Dell');
    assert.strictEqual(body.data.model, 'P2419H');
    assert.strictEqual(body.data.status, 'AVAILABLE');
    assert.strictEqual(body.data.condition, 'GOOD');
  });

  // 2. Minimal valid Laptop payload accepted
  await t.test('2. Minimal valid Laptop payload accepted', async () => {
    const payload = {
      category: 'Laptop',
      assetType: 'LAPTOP',
      make: 'Lenovo',
      model: 'ThinkPad T14',
      serialNumber: 'LPT-P2D-002',
      installDate: '2025-02-10',
      warrantyEndDate: '2028-02-10'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetType, 'LAPTOP');
  });

  // 3. Minimal valid CPU payload accepted
  await t.test('3. Minimal valid CPU payload accepted', async () => {
    const payload = {
      category: 'IT Equipment',
      assetType: 'DESKTOP',
      make: 'HP',
      model: 'EliteDesk 800 G6',
      serialNumber: 'CPU-P2D-003',
      installDate: '2025-03-01',
      warrantyEndDate: '2028-03-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
  });

  // 4. Minimal valid Projector payload accepted
  await t.test('4. Minimal valid Projector payload accepted', async () => {
    const payload = {
      category: 'Projector',
      assetType: 'PROJECTOR',
      make: 'Epson',
      model: 'EB-X06',
      serialNumber: 'PRJ-P2D-004',
      location: 'Conference Room 1',
      installDate: '2025-04-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetType, 'PROJECTOR');
  });

  // 5. Minimal valid Switches payload accepted
  await t.test('5. Minimal valid Switches payload accepted', async () => {
    const payload = {
      category: 'Networking',
      assetType: 'SWITCH',
      assetName: 'Cisco Catalyst 2960X',
      serialNumber: 'SW-P2D-005',
      location: 'Server Room Rack 2',
      networkConfig: {
        managementIp: '192.168.10.1'
      }
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetName, 'Cisco Catalyst 2960X');
    assert.strictEqual(body.data.networkConfig?.managementIp, '192.168.10.1');
  });

  // 6. Minimal valid Camera/CCTV payload accepted
  await t.test('6. Minimal valid Camera/CCTV payload accepted', async () => {
    const payload = {
      category: 'Surveillance',
      assetType: 'CCTV',
      make: 'Hikvision',
      model: 'DS-2CD2143G0-I',
      serialNumber: 'CAM-P2D-006',
      location: 'Main Terminal Entry Gate'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetType, 'CCTV');
  });

  // 7. Minimal valid IP & MAC payload accepted
  await t.test('7. Minimal valid IP & MAC payload accepted', async () => {
    const payload = {
      category: 'Networking',
      assetType: 'NETWORK',
      networkConfig: {
        ipAddress: '10.20.14.50',
        macAddress: '00:1A:2B:3C:4D:5E'
      },
      softwareConfig: {
        antivirus: 'Quick Heal Endpoint Security 7.0'
      },
      specifications: {
        wifiMac: '00:1A:2B:3C:4D:5F',
        bluetooth: '00:1A:2B:3C:4D:60'
      }
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetType, 'NETWORK');
    assert.strictEqual(body.data.networkConfig?.ipAddress, '10.20.14.50');
  });

  // 8. Minimal valid New PTR IP payload accepted
  await t.test('8. Minimal valid New PTR IP payload accepted', async () => {
    const payload = {
      category: 'Printing',
      assetType: 'PRINTER',
      networkConfig: {
        ipAddress: '10.20.14.200'
      }
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.assetType, 'PRINTER');
    assert.strictEqual(body.data.networkConfig?.ipAddress, '10.20.14.200');
  });

  // 9. Minimal valid Laptop MSE payload accepted
  await t.test('9. Minimal valid Laptop MSE payload accepted', async () => {
    const payload = {
      category: 'Office Equipment',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'M90',
      serialNumber: 'MSE-P2D-009',
      currentEmployeeName: 'Roshan R',
      specifications: {
        parentLaptopId: 'AAI-REG-LPT-2024-0002'
      }
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.data.specifications?.parentLaptopId, 'AAI-REG-LPT-2024-0002');
  });

  // 10. Department may be absent when category does not define it
  await t.test('10. Department may be absent when category does not define it', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Acer',
      model: 'V226HQL',
      serialNumber: 'MON-P2D-010',
      installDate: '2025-01-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.department, '');
  });

  // 11. Department is accepted when supplied
  await t.test('11. Department is accepted when supplied', async () => {
    const payload = {
      category: 'Biometric',
      assetType: 'BIOMETRIC',
      make: 'Mantra',
      model: 'MFS100',
      serialNumber: 'BIO-P2D-011',
      department: 'Commercial & Cargo',
      installDate: '2025-01-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.department, 'Commercial & Cargo');
  });

  // 12. Floor may be absent
  await t.test('12. Floor may be absent', async () => {
    const payload = {
      category: 'Scanner',
      assetType: 'SCANNER',
      make: 'Canon',
      model: 'LiDE 300',
      serialNumber: 'SCN-P2D-012',
      installDate: '2025-01-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.floor, '');
  });

  // 13. Floor is accepted when supplied
  await t.test('13. Floor is accepted when supplied', async () => {
    const payload = {
      category: 'Scanner',
      assetType: 'SCANNER',
      make: 'Epson',
      model: 'Perfection V39',
      serialNumber: 'SCN-P2D-013',
      floor: '3rd Floor, Operations Block',
      installDate: '2025-01-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.floor, '3rd Floor, Operations Block');
  });

  // 14. Warranty payload with warrantyEndDate accepted
  await t.test('14. Warranty payload with warrantyEndDate accepted', async () => {
    const payload = {
      category: 'UPS',
      assetType: 'UPS',
      make: 'APC',
      model: 'Back-UPS 600',
      serialNumber: 'UPS-P2D-014',
      amcApplicable: false,
      installDate: '2025-01-01',
      warrantyEndDate: '2027-01-01'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.amcApplicable, false);
    assert.ok(body.data.warrantyEndDate);
  });

  // 15. AMC payload with amcEndDate accepted
  await t.test('15. AMC payload with amcEndDate accepted', async () => {
    const payload = {
      category: 'UPS',
      assetType: 'UPS',
      make: 'Numeric',
      model: 'Digital 1000',
      serialNumber: 'UPS-P2D-015',
      amcApplicable: true,
      amcContractId: 'AMC-NUM-2025',
      amcEndDate: '2026-12-31'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.amcApplicable, true);
    assert.ok(body.data.amcEndDate);
    assert.strictEqual(body.data.warrantyEndDate, null);
  });

  // 16. None warranty mode accepted without warrantyEndDate
  await t.test('16. None warranty mode accepted without warrantyEndDate', async () => {
    const payload = {
      category: 'Keyboard',
      assetType: 'PERIPHERAL',
      make: 'Logitech',
      model: 'K120',
      serialNumber: 'KB-P2D-016',
      amcApplicable: false
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.warrantyEndDate, null);
  });

  // 17. Category without warranty fields accepted without warrantyEndDate
  await t.test('17. Category without warranty fields accepted without warrantyEndDate', async () => {
    const payload = {
      category: 'Surveillance',
      assetType: 'CCTV',
      make: 'CP Plus',
      model: 'CP-UNC',
      serialNumber: 'CCTV-P2D-017',
      location: 'Perimeter Wall South'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.warrantyEndDate, null);
  });

  // 18. Projector accepted without warranty fields
  await t.test('18. Projector accepted without warranty fields', async () => {
    const payload = {
      category: 'Projector',
      assetType: 'PROJECTOR',
      make: 'BenQ',
      model: 'MS550',
      serialNumber: 'PRJ-P2D-018',
      location: 'Briefing Hall B'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.warrantyEndDate, null);
  });

  // 19. Status omission behaves according to verified existing defaults
  await t.test('19. Status omission behaves according to verified existing defaults', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Samsung',
      model: 'F24T350',
      serialNumber: 'MON-P2D-019'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.status, 'AVAILABLE', 'Omitted status must default to AVAILABLE');
  });

  // 20. Condition omission behaves according to verified existing defaults
  await t.test('20. Condition omission behaves according to verified existing defaults', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'ViewSonic',
      model: 'VA2432',
      serialNumber: 'MON-P2D-020'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.condition, 'GOOD', 'Omitted condition must default to GOOD');
  });

  // 21. Physical Monitor without serial is still rejected
  await t.test('21. Physical Monitor without serial is still rejected', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Dell',
      model: 'P2419H'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status >= 400, true, 'Monitor without serial number must be rejected');
  });

  // 22. Physical Laptop without serial is still rejected
  await t.test('22. Physical Laptop without serial is still rejected', async () => {
    const payload = {
      category: 'Laptop',
      assetType: 'LAPTOP',
      make: 'Dell',
      model: 'Latitude 5420'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status >= 400, true, 'Laptop without serial number must be rejected');
  });

  // 23. NETWORK profile without serial is accepted if safely exempted
  await t.test('23. NETWORK profile without serial is accepted if safely exempted', async () => {
    const payload = {
      category: 'Networking',
      assetType: 'NETWORK',
      networkConfig: {
        ipAddress: '172.16.0.1'
      }
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201, 'NETWORK profile without serial must succeed');
  });

  // 24. Existing asset with assetName remains valid
  await t.test('24. Existing asset with assetName remains valid', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.assetName, 'Dell OptiPlex 7090 MT Workstation');
  });

  // 25. Existing asset with department remains valid
  await t.test('25. Existing asset with department remains valid', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.department, 'Communication, Navigation & Surveillance');
  });

  // 26. Existing asset with floor remains valid
  await t.test('26. Existing asset with floor remains valid', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.floor, '2nd Floor, Technical Block');
  });

  // 27. Existing asset with warrantyEndDate remains valid
  await t.test('27. Existing asset with warrantyEndDate remains valid', async () => {
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(body.data.warrantyEndDate);
  });

  // 28. Existing Edit payload remains valid
  await t.test('28. Existing Edit payload remains valid', async () => {
    const editPayload = {
      department: 'Aviation Safety Directorate',
      floor: '2nd Floor, Terminal Annex',
      remarks: 'Updated via Phase 2D Edit compatibility test'
    };
    const res = await fetch(`${baseUrl}/assets/AAI-REG-PC-2024-0001`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(editPayload)
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.department, 'Aviation Safety Directorate');
    assert.strictEqual(body.data.floor, '2nd Floor, Terminal Annex');
  });

  // 29. Invalid status is still rejected
  await t.test('29. Invalid status is still rejected', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Dell',
      model: 'P2419H',
      serialNumber: 'MON-P2D-029',
      status: 'INVALID_STATUS_VALUE'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 400, 'Invalid status must be rejected with 400');
  });

  // 30. Invalid condition is still rejected
  await t.test('30. Invalid condition is still rejected', async () => {
    const payload = {
      category: 'Monitor',
      assetType: 'MONITOR',
      make: 'Dell',
      model: 'P2419H',
      serialNumber: 'MON-P2D-030',
      condition: 'INVALID_CONDITION_VALUE'
    };
    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 400, 'Invalid condition must be rejected with 400');
  });
});
