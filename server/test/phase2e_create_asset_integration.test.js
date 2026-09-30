import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import {
  ASSET_CATEGORY_FORM_CONFIGS,
  getActiveCategoryConfigs,
  getCategoryConfigByKey,
  getCategoryConfigById
} from '../../client/src/config/assetCategoryFormConfigs.js';
import {
  validateAssetCategoryForm,
  isValueEmpty
} from '../../client/src/utils/assetFormValidation.js';
import { buildAssetPayload } from '../../client/src/utils/assetFormPayloadAdapter.js';

test('Phase 2E: End-to-End Create Asset Integration & Category QA Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  // Acquire admin authentication token
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

  // =========================================================================
  // 1. ALL 23 CATEGORIES END-TO-END PIPELINE REGISTRATION & VERIFICATION
  // =========================================================================
  await t.test('1. Verify all 23 defined categories through end-to-end pipeline', async (tSub) => {
    const activeConfigs = getActiveCategoryConfigs();
    assert.strictEqual(activeConfigs.length, 23, 'Must have exactly 23 active category configurations');

    for (const cfg of activeConfigs) {
      await tSub.test(`Category ${cfg.id}: ${cfg.name} (${cfg.assetType})`, async () => {
        // Construct valid representative form data
        const formData = {};

        for (const field of cfg.fields) {
          if (!field.required) continue;

          if (field.type === 'number') {
            formData[field.key] = field.key === 'quantity' ? 1 : 16;
          } else if (field.type === 'date') {
            formData[field.key] = '2025-01-15';
          } else if (field.type === 'select') {
            if (field.source === 'make') formData[field.key] = 'Dell';
            else if (field.source === 'model') formData[field.key] = 'OptiPlex 7090';
            else if (field.source === 'technology') formData[field.key] = 'LED';
            else if (field.source === 'warrantyAmc') formData[field.key] = 'Warranty';
            else formData[field.key] = 'Standard';
          } else {
            // Text / Textarea
            if (field.target === 'assetId') {
              formData[field.key] = `AAI-E2E-${cfg.id}-001`;
            } else if (field.target === 'serialNumber') {
              formData[field.key] = `SN-E2E-${cfg.id}-999`;
            } else if (field.target === 'currentEmployeeName') {
              formData[field.key] = 'Roshan R';
            } else if (field.target === 'department') {
              formData[field.key] = 'Commercial & Cargo';
            } else if (field.target === 'location') {
              formData[field.key] = 'Terminal 2 Control Room';
            } else if (field.target === 'relationship.parentAssetId') {
              formData[field.key] = 'AAI-REG-LPT-2024-0002';
            } else {
              formData[field.key] = `Test ${field.label}`;
            }
          }
        }

        // Category-specific adjustments
        if (cfg.fields.some((f) => f.key === 'warrantyAmcType')) {
          formData.warrantyAmcType = 'Warranty';
          formData.warrantyAmcDate = '2028-01-15';
        }

        // Step 1: Validate flat form state using Phase 2B validator
        const valResult = validateAssetCategoryForm(cfg.key, formData);
        assert.strictEqual(valResult.valid, true, `Validation failed for ${cfg.name}: ${JSON.stringify(valResult.errors)}`);

        // Step 2: Build API payload using Phase 2B payload adapter
        const payload = buildAssetPayload(cfg.key, formData);
        assert.ok(payload, `Payload construction failed for ${cfg.name}`);
        assert.strictEqual(payload.category, cfg.category);
        assert.strictEqual(payload.assetType, cfg.assetType);

        // Step 3: POST /api/v1/assets
        const res = await fetch(`${baseUrl}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify(payload)
        });
        const body = await res.json();
        assert.strictEqual(res.status, 201, `POST failed for ${cfg.name} with ${res.status}: ${JSON.stringify(body)}`);
        assert.ok(body.data.assetId, 'Created asset must have an assetId');

        // Step 4: Verify database persistence via GET /assets/:id
        const getRes = await fetch(`${baseUrl}/assets/${body.data.assetId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(getRes.status, 200, `GET failed for ${body.data.assetId}`);
        const getBody = await getRes.json();
        assert.strictEqual(getBody.data.assetId, body.data.assetId);
        assert.strictEqual(getBody.data.assetType, cfg.assetType);
      });
    }
  });

  // =========================================================================
  // 2. CATEGORY #2 DISABLED & UNDEFINED GUARANTEE
  // =========================================================================
  await t.test('2. Category #2 remains undefined and disabled', async () => {
    const configById = getCategoryConfigById(2);
    assert.ok(configById);
    assert.strictEqual(configById.isDefined, false);
    assert.strictEqual(configById.enabled, false);

    const configByKey = getCategoryConfigByKey('UNDEFINED_2');
    assert.ok(configByKey);
    assert.strictEqual(configByKey.isDefined, false);
    assert.strictEqual(configByKey.enabled, false);

    // Active categories must NOT contain Category #2
    const activeConfigs = getActiveCategoryConfigs();
    assert.strictEqual(activeConfigs.some((c) => c.id === 2 || c.key === 'UNDEFINED_2'), false);

    // Validator rejects Category #2
    const valResult = validateAssetCategoryForm('UNDEFINED_2', {});
    assert.strictEqual(valResult.valid, false);
    assert.ok(valResult.errors._category);

    // Adapter rejects Category #2
    assert.throws(() => {
      buildAssetPayload('UNDEFINED_2', {});
    }, /undefined/i);
  });

  // =========================================================================
  // 3. REMARKS OPTIONALITY ACROSS ALL 23 CATEGORIES
  // =========================================================================
  await t.test('3. Remarks is universally optional across all 23 categories', async () => {
    const activeConfigs = getActiveCategoryConfigs();
    for (const cfg of activeConfigs) {
      const remarksField = cfg.fields.find((f) => f.key === 'remarks');
      assert.ok(remarksField, `Category ${cfg.name} must define a remarks field`);
      assert.strictEqual(remarksField.required, false, `Category ${cfg.name} remarks must be optional`);
      assert.strictEqual(remarksField.target, 'remarks');
    }
  });

  // =========================================================================
  // 4. REQUIRED-FIELD TESTING (ABSENCE, WHITESPACE, ZERO, FALSE)
  // =========================================================================
  await t.test('4. Required field validation rules: absence, whitespace, zero, false', async () => {
    // A. Missing required field fails
    const monitorIncomplete = {
      make: 'Dell',
      model: 'P2419H'
      // serialNumber omitted
    };
    const valMissing = validateAssetCategoryForm('MONITOR', monitorIncomplete);
    assert.strictEqual(valMissing.valid, false);
    assert.ok(valMissing.errors.serialNumber);

    // B. Whitespace-only required field fails
    const monitorWhitespace = {
      make: '   ',
      model: 'P2419H',
      serialNumber: 'SN-001',
      installDate: '2025-01-01',
      warrantyAmcType: 'None'
    };
    const valWhitespace = validateAssetCategoryForm('MONITOR', monitorWhitespace);
    assert.strictEqual(valWhitespace.valid, false);
    assert.ok(valWhitespace.errors.make);

    // C. Numeric 0 is valid and not treated as missing
    assert.strictEqual(isValueEmpty(0), false);
    assert.strictEqual(isValueEmpty('0'), false);

    // D. Boolean false is valid and not treated as missing
    assert.strictEqual(isValueEmpty(false), false);
  });

  // =========================================================================
  // 5. CATEGORY SWITCHING & STATE ISOLATION
  // =========================================================================
  await t.test('5. Category switching preserves state isolation and clears stale fields', async () => {
    // Transition 1: Laptop -> Monitor
    const laptopState = {
      make: 'Dell',
      model: 'Latitude',
      processor: 'Intel Core i7',
      ram: 16,
      hddSize: 512,
      os: 'Windows 11'
    };
    // If user switches to Monitor, stale laptop fields must NOT leak into Monitor payload
    const monitorState = {
      assetId: 'AAI-MON-SW-01',
      serialNumber: 'MON-SN-SW-01',
      make: 'Dell',
      model: 'P2419H',
      installDate: '2025-01-01',
      warrantyAmcType: 'None'
    };
    const monitorPayload = buildAssetPayload('MONITOR', monitorState);
    assert.strictEqual(monitorPayload.computerConfig, undefined, 'Monitor payload must not have computerConfig');
    assert.strictEqual(monitorPayload.assetType, 'MONITOR');

    // Transition 2: Monitor -> Projector
    const projectorState = {
      make: 'Epson',
      model: 'EB-X06',
      serialNumber: 'PRJ-SN-SW-02',
      location: 'Auditorium',
      installDate: '2025-01-01',
      quantity: 1
    };
    const projectorPayload = buildAssetPayload('PROJECTOR', projectorState);
    assert.strictEqual(projectorPayload.warrantyEndDate, undefined, 'Projector must not have warrantyEndDate');
    assert.strictEqual(projectorPayload.assetType, 'PROJECTOR');

    // Transition 3: Projector -> IP & MAC
    const ipMacState = {
      assetId: 'AAI-NET-SW-03',
      ipAddress: '192.168.1.55',
      macAddress: 'AA:BB:CC:DD:EE:55',
      hostname: 'AAI-SW-HOST',
      antivirus: 'Defender'
    };
    const ipMacPayload = buildAssetPayload('IP_AND_MAC', ipMacState);
    assert.strictEqual(ipMacPayload.make, undefined, 'IP & MAC must not have make');
    assert.strictEqual(ipMacPayload.model, undefined, 'IP & MAC must not have model');
    assert.strictEqual(ipMacPayload.networkConfig?.ipAddress, '192.168.1.55');

    // Transition 4: IP & MAC -> CPU
    const cpuState = {
      assetId: 'AAI-CPU-SW-04',
      serialNumber: 'CPU-SN-SW-04',
      make: 'HP',
      model: 'ProDesk 600',
      processor: 'Intel Core i5',
      speed: '3.2 GHz',
      ram: 16,
      ramType: 'DDR4',
      ramSlots: 4,
      hddSize: 512,
      hddMakeAndModel: 'Samsung NVMe',
      cdDrive: 'None',
      installDate: '2025-01-01',
      warrantyAmcType: 'None'
    };
    const cpuPayload = buildAssetPayload('CPU', cpuState);
    assert.strictEqual(cpuPayload.assetType, 'DESKTOP');
    assert.ok(cpuPayload.computerConfig);
    assert.strictEqual(cpuPayload.computerConfig.processor, 'Intel Core i5');
  });

  // =========================================================================
  // 6. WARRANTY AND AMC COVERAGE MODES
  // =========================================================================
  await t.test('6. Warranty and AMC transformation cases', async () => {
    // Case 1: Warranty mode
    const payloadW = buildAssetPayload('MONITOR', {
      assetId: 'AAI-W-01',
      serialNumber: 'SN-W-01',
      make: 'Dell',
      model: 'P2419H',
      installDate: '2025-01-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2028-01-01'
    });
    assert.strictEqual(payloadW.amcApplicable, false);
    assert.strictEqual(payloadW.warrantyEndDate, '2028-01-01');
    assert.strictEqual(payloadW.amcEndDate, undefined);

    // Case 2: AMC mode
    const payloadA = buildAssetPayload('MONITOR', {
      assetId: 'AAI-A-01',
      serialNumber: 'SN-A-01',
      make: 'Dell',
      model: 'P2419H',
      installDate: '2025-01-01',
      warrantyAmcType: 'AMC',
      warrantyAmcDate: '2026-06-30'
    });
    assert.strictEqual(payloadA.amcApplicable, true);
    assert.strictEqual(payloadA.amcEndDate, '2026-06-30');
    assert.strictEqual(payloadA.warrantyEndDate, undefined);

    // Case 3: None mode
    const payloadN = buildAssetPayload('MONITOR', {
      assetId: 'AAI-N-01',
      serialNumber: 'SN-N-01',
      make: 'Dell',
      model: 'P2419H',
      installDate: '2025-01-01',
      warrantyAmcType: 'None'
    });
    assert.strictEqual(payloadN.amcApplicable, false);
    assert.strictEqual(payloadN.warrantyEndDate, undefined);
    assert.strictEqual(payloadN.amcEndDate, undefined);

    // Case 4: Category without warranty fields (Projector)
    const payloadP = buildAssetPayload('PROJECTOR', {
      make: 'Epson',
      model: 'EB-X06',
      serialNumber: 'SN-P-01',
      location: 'Room 101',
      installDate: '2025-01-01',
      quantity: 1
    });
    assert.strictEqual(payloadP.warrantyEndDate, undefined);
    assert.strictEqual(payloadP.amcEndDate, undefined);
    assert.strictEqual(payloadP.amcApplicable, undefined);
  });

  // =========================================================================
  // 7. SERIAL NUMBER RULES & PROFILE EXEMPTIONS
  // =========================================================================
  await t.test('7. Serial number enforcement on physical assets and exemption on profiles', async () => {
    // Physical Monitor without serial -> Rejected
    const resMon = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        installDate: '2025-01-01'
      })
    });
    assert.strictEqual(resMon.status, 400, 'Physical Monitor without serial must return 400');

    // Physical Laptop without serial -> Rejected
    const resLap = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Laptop',
        assetType: 'LAPTOP',
        make: 'Dell',
        model: 'Latitude',
        installDate: '2025-01-01'
      })
    });
    assert.strictEqual(resLap.status, 400, 'Physical Laptop without serial must return 400');

    // Physical Printer with make/model but no serial -> Rejected
    const resPrt = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Printer',
        assetType: 'PRINTER',
        make: 'HP',
        model: 'LaserJet 1020',
        installDate: '2025-01-01'
      })
    });
    assert.strictEqual(resPrt.status, 400, 'Physical Printer without serial must return 400');

    // Network profile (New PTR IP) without physical make/model -> Accepted
    const resNewPtr = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Printing',
        assetType: 'PRINTER',
        networkConfig: { ipAddress: '10.20.14.210' }
      })
    });
    assert.strictEqual(resNewPtr.status, 201, 'New PTR IP network profile without serial must return 201');

    // Network profile (IP & MAC) -> Accepted
    const resIpMac = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Networking',
        assetType: 'NETWORK',
        networkConfig: { ipAddress: '10.20.14.211', macAddress: '00:11:22:33:44:55' }
      })
    });
    assert.strictEqual(resIpMac.status, 201, 'IP & MAC profile without serial must return 201');
  });

  // =========================================================================
  // 8. MASTER CATALOG INTEGRATION (MAKES, MODELS, TECHNOLOGIES)
  // =========================================================================
  await t.test('8. Master catalog integration endpoints respond accurately', async () => {
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // 1. Fetch Makes
    const makesRes = await fetch(`${baseUrl}/master/makes?isActive=true`, { headers: authHeaders });
    assert.strictEqual(makesRes.status, 200);
    const makesBody = await makesRes.json();
    assert.ok(Array.isArray(makesBody.data));
    assert.ok(makesBody.data.length > 0);

    // 2. Fetch Dependent Models for Dell
    const modelsRes = await fetch(`${baseUrl}/master/models?isActive=true&make=Dell`, { headers: authHeaders });
    assert.strictEqual(modelsRes.status, 200);
    const modelsBody = await modelsRes.json();
    assert.ok(Array.isArray(modelsBody.data));
    assert.ok(modelsBody.data.every((m) => m.make === 'Dell'));

    // 3. Fetch Technologies
    const techRes = await fetch(`${baseUrl}/master/technologies?isActive=true`, { headers: authHeaders });
    assert.strictEqual(techRes.status, 200);
    const techBody = await techRes.json();
    assert.ok(Array.isArray(techBody.data));
  });

  // =========================================================================
  // 9. ERROR HANDLING AND CONFLICT DETECTION
  // =========================================================================
  await t.test('9. Error handling: duplicate serial, invalid enum, and malformed date', async () => {
    const uniqueSerial = 'SN-DUP-TEST-2E-001';

    // First creation succeeds
    const res1 = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        serialNumber: uniqueSerial,
        installDate: '2025-01-01'
      })
    });
    assert.strictEqual(res1.status, 201);

    // Duplicate creation returns 409 Conflict
    const res2 = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        serialNumber: uniqueSerial,
        installDate: '2025-01-01'
      })
    });
    assert.strictEqual(res2.status, 409, 'Duplicate serial number must return 409 Conflict');
    const body2 = await res2.json();
    assert.strictEqual(body2.success, false);

    // Invalid status enum returns 400
    const resStatus = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        serialNumber: 'SN-INVALID-STATUS-01',
        status: 'UNRECOGNIZED_STATUS'
      })
    });
    assert.strictEqual(resStatus.status, 400);

    // Malformed date returns 400
    const resDate = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Dell',
        model: 'P2419H',
        serialNumber: 'SN-MALFORMED-DATE-01',
        installDate: 'not-a-valid-date-string'
      })
    });
    assert.strictEqual(resDate.status, 400);
  });

  // =========================================================================
  // 10. INVENTORY VISIBILITY & EDIT ASSET REGRESSION
  // =========================================================================
  await t.test('10. Newly created asset is visible in inventory and Edit Asset remains intact', async () => {
    const testAssetId = 'AAI-E2E-INV-001';
    const createRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        assetId: testAssetId,
        category: 'Monitor',
        assetType: 'MONITOR',
        make: 'Samsung',
        model: 'Odyssey G5',
        serialNumber: 'SN-INV-REFRESH-001',
        installDate: '2025-01-01',
        department: 'Operations',
        floor: 'Ground Floor'
      })
    });
    assert.strictEqual(createRes.status, 201);

    // Verify visibility in inventory query
    const listRes = await fetch(`${baseUrl}/assets?search=Odyssey`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.data.some((a) => a.assetId === testAssetId), 'Created asset must be visible in inventory search');

    // Verify Edit Asset PUT retains compatibility
    const editRes = await fetch(`${baseUrl}/assets/${testAssetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        department: 'ATC Radar Operations',
        floor: 'Level 3 Control Cab',
        remarks: 'Updated via Phase 2E regression test'
      })
    });
    assert.strictEqual(editRes.status, 200, 'PUT /assets/:id must return 200');
    const editBody = await editRes.json();
    assert.strictEqual(editBody.data.department, 'ATC Radar Operations');
    assert.strictEqual(editBody.data.floor, 'Level 3 Control Cab');
  });
});
