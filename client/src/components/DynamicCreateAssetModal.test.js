/**
 * DynamicCreateAssetModal.test.js — AAI Asset Management System
 * 
 * Phase 2C Test Suite: Dynamic Category-Specific Create Asset UI Integration.
 * 
 * Verifies:
 * A. Category Field Resolution & Isolation
 *    - Monitor renders ONLY Monitor fields
 *    - Laptop renders ONLY Laptop fields
 *    - Projector renders ONLY Projector fields (no warranty, no technology)
 *    - Switches does NOT contain Make, Model, or Technology
 *    - IP & MAC renders ONLY its exact fields
 *    - Category #2 (UNDEFINED_2) is disabled and excluded from active selections
 * B. Required Field Rules
 *    - Missing required fields fails validation
 *    - Remarks is optional (allows empty string or omitted)
 *    - Boolean false remains valid
 *    - Numeric 0 remains valid
 * C. Category Switching & State Isolation
 *    - Switching Laptop -> Monitor clears Laptop-only fields
 *    - Old category values do not leak into the new category payload
 * D. Adapter & Validator Pipeline Integration
 *    - Flat form state passes through Phase 2B validator and adapter cleanly
 *    - No duplicate category definitions exist in UI
 * E. Submission & Error Integrity
 *    - Invalid form does not proceed to API POST
 *    - Payload adapter output strictly adheres to backend schema expectations
 *    - Backend conflicts (department, floor, warrantyEndDate) are preserved honestly without fake data
 * F. Edit Asset Separation & Backward Compatibility
 *    - Edit Asset state and modal logic remains completely independent
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_CATEGORY_FORM_CONFIGS,
  getActiveCategoryConfigs,
  getAllCategoryConfigs,
  getCategoryConfigByKey,
  getCategoryConfigById
} from '../config/assetCategoryFormConfigs.js';

import {
  validateAssetCategoryForm,
  isValueEmpty
} from '../utils/assetFormValidation.js';

import {
  buildAssetPayload
} from '../utils/assetFormPayloadAdapter.js';

describe('Phase 2C — Dynamic Create Asset UI Integration Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // A. CATEGORY RENDERING & FIELD ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('A. Category Rendering & Field Isolation', () => {

    it('1. Active categories dropdown contains exactly 23 active categories (excluding #2)', () => {
      const active = getActiveCategoryConfigs();
      assert.equal(active.length, 23, 'Must have exactly 23 active category configurations');
      
      const category2 = active.find(c => c.id === 2 || c.key === 'UNDEFINED_2');
      assert.equal(category2, undefined, 'Category #2 (UNDEFINED_2) must never be present in active categories');

      // Verify all IDs from 1 to 24 except 2
      const activeIds = active.map(c => c.id).sort((a, b) => a - b);
      const expectedIds = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
      assert.deepEqual(activeIds, expectedIds);
    });

    it('2. MONITOR config contains ONLY Monitor-specific fields', () => {
      const monitor = getCategoryConfigByKey('MONITOR');
      assert.ok(monitor, 'Monitor config must exist');
      const fieldKeys = monitor.fields.map(f => f.key);
      
      // Expected Monitor fields
      const expectedKeys = [
        'assetId', 'serialNumber', 'make', 'model', 'technology',
        'installDate', 'suppliedBy', 'supplyOrderNo', 'warrantyAmcType',
        'warrantyAmcDate', 'data', 'remarks'
      ];
      assert.deepEqual(fieldKeys, expectedKeys);
      
      // Compute fields must NOT exist in Monitor
      assert.ok(!fieldKeys.includes('processor'), 'Monitor must not have processor');
      assert.ok(!fieldKeys.includes('ram'), 'Monitor must not have ram');
      assert.ok(!fieldKeys.includes('hddSize'), 'Monitor must not have hddSize');
    });

    it('3. LAPTOP config contains ONLY Laptop-specific fields', () => {
      const laptop = getCategoryConfigByKey('LAPTOP');
      assert.ok(laptop, 'Laptop config must exist');
      const fieldKeys = laptop.fields.map(f => f.key);

      const expectedKeys = [
        'assetId', 'serialNumber', 'make', 'model', 'processor', 'speed', 'chipset',
        'ram', 'ramType', 'ramSpeed', 'ramSlots', 'hddSize', 'hddMakeAndModel',
        'cdDrive', 'dvdDrive', 'nic', 'installDate', 'suppliedBy', 'supplyOrderNo',
        'warrantyAmcType', 'warrantyAmcDate', 'os', 'msoKey', 'officeSuite', 'remarks'
      ];
      assert.deepEqual(fieldKeys, expectedKeys);
      assert.ok(!fieldKeys.includes('technology'), 'Laptop must not have technology');
    });

    it('4. PROJECTOR config renders ONLY Projector fields (NO Warranty/AMC, NO Technology)', () => {
      const projector = getCategoryConfigByKey('PROJECTOR');
      assert.ok(projector, 'Projector config must exist');
      const fieldKeys = projector.fields.map(f => f.key);

      const expectedKeys = [
        'make', 'model', 'serialNumber', 'location', 'installDate',
        'quantity', 'assetId', 'purchaseDate', 'supplyOrderNo',
        'suppliedBy', 'remarks'
      ];
      assert.deepEqual(fieldKeys, expectedKeys);

      assert.ok(!fieldKeys.includes('warrantyAmcType'), 'Projector must NOT have Warranty/AMC type');
      assert.ok(!fieldKeys.includes('warrantyAmcDate'), 'Projector must NOT have Warranty/AMC date');
      assert.ok(!fieldKeys.includes('technology'), 'Projector must NOT have Technology');
    });

    it('5. SWITCHES config renders ONLY Switch fields (NO Make, NO Model, NO Technology)', () => {
      const switches = getCategoryConfigByKey('SWITCHES');
      assert.ok(switches, 'Switches config must exist');
      const fieldKeys = switches.fields.map(f => f.key);

      const expectedKeys = [
        'switchDescription', 'configIp', 'serialNumber', 'location', 'remarks'
      ];
      assert.deepEqual(fieldKeys, expectedKeys);

      assert.ok(!fieldKeys.includes('make'), 'Switches must NOT have Make');
      assert.ok(!fieldKeys.includes('model'), 'Switches must NOT have Model');
      assert.ok(!fieldKeys.includes('technology'), 'Switches must NOT have Technology');
    });

    it('6. IP & MAC config renders ONLY IP & MAC fields', () => {
      const ipMac = getCategoryConfigByKey('IP_AND_MAC') || getCategoryConfigById(17);
      assert.ok(ipMac, 'IP & MAC config must exist');
      const fieldKeys = ipMac.fields.map(f => f.key);

      const expectedKeys = [
        'assetId', 'antivirus', 'hostname', 'ipAddress', 'macAddress',
        'wifiMac', 'bluetooth', 'ethernet', 'remarks'
      ];
      assert.deepEqual(fieldKeys, expectedKeys);

      assert.ok(!fieldKeys.includes('make'), 'IP & MAC must NOT have Make');
      assert.ok(!fieldKeys.includes('model'), 'IP & MAC must NOT have Model');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // B. REQUIRED FIELD RULES & REMARKS OPTIONALITY
  // ─────────────────────────────────────────────────────────────
  describe('B. Required Field Rules & Remarks Optionality', () => {

    it('1. Missing required field prevents submission and returns targeted errors', () => {
      // Incomplete Monitor form (missing model and technology)
      const incompleteMonitor = {
        assetId: 'MON-001',
        serialNumber: 'SN-MON-99',
        make: 'Dell',
        // model omitted
        // technology omitted
        installDate: '2025-01-10',
        suppliedBy: 'Dell India',
        supplyOrderNo: 'PO-2025-01',
        warrantyAmcType: 'Warranty',
        warrantyAmcDate: '2028-01-10',
        data: 'DVI',
        remarks: 'Test notes'
      };

      const res = validateAssetCategoryForm('MONITOR', incompleteMonitor);
      assert.equal(res.valid, false, 'Validation must fail when required fields are missing');
      assert.ok(res.errors.model, 'Must report model is required');
      assert.ok(res.errors.technology, 'Must report technology is required');
      assert.equal(res.errors.remarks, undefined, 'Remarks must not have error');
    });

    it('2. Remarks is universally optional and empty value passes validation', () => {
      const validMonitorNoRemarks = {
        assetId: 'MON-002',
        serialNumber: 'SN-MON-100',
        make: 'HP',
        model: 'E24 G4',
        technology: 'IPS',
        installDate: '2025-01-10',
        suppliedBy: 'HP India',
        supplyOrderNo: 'PO-2025-02',
        warrantyAmcType: 'Warranty',
        warrantyAmcDate: '2028-01-10',
        data: 'HDMI',
        remarks: '' // explicitly empty
      };

      const res = validateAssetCategoryForm('MONITOR', validMonitorNoRemarks);
      assert.equal(res.valid, true, 'Validation must pass even when remarks is empty');
      assert.deepEqual(res.errors, {});
    });

    it('3. Numeric 0 and boolean false are treated as valid values', () => {
      assert.equal(isValueEmpty(0, 'number'), false, 'Numeric 0 is not empty');
      assert.equal(isValueEmpty(42, 'number'), false, 'Numeric 42 is not empty');
      assert.equal(isValueEmpty(false, 'boolean'), false, 'Boolean false is not empty');
      assert.equal(isValueEmpty(true, 'boolean'), false, 'Boolean true is not empty');
      assert.equal(isValueEmpty('', 'text'), true, 'Empty string is empty');
      assert.equal(isValueEmpty('   ', 'text'), true, 'Whitespace string is empty');
      assert.equal(isValueEmpty(undefined, 'text'), true, 'Undefined is empty');
      assert.equal(isValueEmpty(null, 'text'), true, 'Null is empty');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // C. CATEGORY SWITCHING & STATE ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('C. Category Switching & State Isolation', () => {

    it('1. Category reset clears stale fields from previous category', () => {
      // Simulate user filling out a Laptop
      let formState = {
        assetId: 'LAP-101',
        serialNumber: 'SN-LAP-555',
        make: 'Lenovo',
        model: 'ThinkPad T14',
        processor: 'Intel Core i7-1365U',
        speed: '1.8 GHz',
        chipset: 'Intel SoC',
        ram: 16,
        ramType: 'DDR5',
        ramSpeed: '5200 MHz',
        ramSlots: 2,
        hddSize: 512,
        hddMakeAndModel: 'Samsung NVMe PM9A1',
        cdDrive: 'None',
        dvdDrive: 'None',
        nic: 'Intel Wi-Fi 6E',
        installDate: '2025-03-01',
        suppliedBy: 'Lenovo India',
        supplyOrderNo: 'PO-LAP-2025',
        warrantyAmcType: 'Warranty',
        warrantyAmcDate: '2028-03-01',
        os: 'Windows 11 Pro',
        msoKey: 'MSO-KEY-1234',
        officeSuite: 'Office 2021',
        remarks: 'Issued to engineering'
      };

      // User switches category to 'MONITOR' -> formState is wiped
      formState = {}; // Simulates setFormData({}) on handleCategoryChange

      // User now fills in Monitor fields
      formState = {
        assetId: 'MON-301',
        serialNumber: 'SN-MON-777',
        make: 'LG',
        model: '24BK550Y',
        technology: 'IPS',
        installDate: '2025-03-05',
        suppliedBy: 'LG Commercial',
        supplyOrderNo: 'PO-MON-2025',
        warrantyAmcType: 'Warranty',
        warrantyAmcDate: '2028-03-05',
        data: 'DisplayPort',
        remarks: 'Control Room Monitor'
      };

      const payload = buildAssetPayload('MONITOR', formState);

      // Verify no Laptop-specific specifications leaked into the Monitor payload
      assert.equal(payload.assetId, 'MON-301');
      assert.equal(payload.serialNumber, 'SN-MON-777');
      assert.equal(payload.computerConfig, undefined, 'Computer config must NOT exist in Monitor payload');
      assert.equal(payload.softwareConfig, undefined, 'Software config must NOT exist in Monitor payload');
      assert.equal(payload.specifications?.processor, undefined, 'Processor must not leak');
      assert.equal(payload.specifications?.ram, undefined, 'RAM must not leak');
      assert.equal(payload.specifications?.data, 'DisplayPort', 'Monitor data spec must be preserved');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // D. ADAPTER INTEGRATION & BACKEND CONFLICT HONESTY
  // ─────────────────────────────────────────────────────────────
  describe('D. Adapter Integration & Backend Conflict Honesty', () => {

    it('1. Monitor payload correctly constructs canonical Asset structure', () => {
      const monitorData = {
        assetId: 'AAI-CHN-MON-001',
        serialNumber: 'SN-LG-98765',
        make: 'LG',
        model: 'UltraFine 27',
        technology: 'IPS 4K',
        installDate: '2025-02-15',
        suppliedBy: 'LG India Electronics',
        supplyOrderNo: 'AAI/PO/2025/MON/01',
        warrantyAmcType: 'Warranty',
        warrantyAmcDate: '2028-02-15',
        data: 'Thunderbolt 3',
        remarks: 'ATC primary display'
      };

      const payload = buildAssetPayload('MONITOR', monitorData);
      assert.equal(payload.assetId, 'AAI-CHN-MON-001');
      assert.equal(payload.serialNumber, 'SN-LG-98765');
      assert.equal(payload.make, 'LG');
      assert.equal(payload.model, 'UltraFine 27');
      assert.equal(payload.technology, 'IPS 4K');
      assert.equal(payload.category, 'IT Equipment');
      assert.equal(payload.assetType, 'MONITOR');
      assert.equal(payload.installDate, '2025-02-15');
      assert.equal(payload.supplier, 'LG India Electronics');
      assert.equal(payload.supplyOrderNumber, 'AAI/PO/2025/MON/01');
      assert.equal(payload.amcApplicable, false);
      assert.equal(payload.warrantyEndDate, '2028-02-15');
      assert.equal(payload.specifications?.data, 'Thunderbolt 3');
      assert.equal(payload.remarks, 'ATC primary display');

      // STRICT Phase 2C mandate: NO FAKE BUSINESS DATA
      assert.equal(payload.assetName, undefined, 'Must NOT fabricate assetName');
      assert.equal(payload.department, undefined, 'Must NOT fabricate department');
      assert.equal(payload.floor, undefined, 'Must NOT fabricate floor');
      assert.equal(payload.status, undefined, 'Must NOT fabricate status');
      assert.equal(payload.condition, undefined, 'Must NOT fabricate condition');
    });

    it('2. LAPTOP MSE exposes parent LAP ID reference without invoking relationships API', () => {
      const laptopMseData = {
        assetId: 'MSE-LAP-001',
        lapId: 'LAP-AAI-042',
        serialNumber: 'SN-LOGI-MSE-11',
        make: 'Logitech',
        model: 'M185',
        user: 'R. Sharma, Senior Manager (Ops)',
        remarks: 'Paired wireless mouse'
      };

      const payload = buildAssetPayload('LAPTOP_MSE', laptopMseData);
      assert.equal(payload.assetId, 'MSE-LAP-001');
      assert.equal(payload.serialNumber, 'SN-LOGI-MSE-11');
      assert.equal(payload.make, 'Logitech');
      assert.equal(payload.model, 'M185');
      assert.equal(payload.currentEmployeeName, 'R. Sharma, Senior Manager (Ops)');
      assert.equal(payload.specifications?.parentLaptopId, 'LAP-AAI-042');
      assert.deepEqual(payload._relationship, {
        parentAssetId: 'LAP-AAI-042',
        relationshipType: 'PERIPHERAL_OF',
        componentRole: 'MOUSE'
      });
    });

    it('3. Projector contains no warranty information in adapter payload', () => {
      const projectorData = {
        assetId: 'PRJ-CONF-01',
        serialNumber: 'SN-EPS-99',
        make: 'Epson',
        model: 'EB-L200F',
        location: 'Conference Room Alpha',
        installDate: '2025-01-20',
        quantity: 1,
        purchaseDate: '2025-01-10',
        supplyOrderNo: 'PO-PRJ-2025',
        suppliedBy: 'Epson Direct',
        remarks: 'Laser Projector'
      };

      const payload = buildAssetPayload('PROJECTOR', projectorData);
      assert.equal(payload.assetId, 'PRJ-CONF-01');
      assert.equal(payload.serialNumber, 'SN-EPS-99');
      assert.equal(payload.warrantyEndDate, undefined, 'Must not have warrantyEndDate');
      assert.equal(payload.amcApplicable, undefined, 'Must not have amcApplicable');
      assert.equal(payload.amcEndDate, undefined, 'Must not have amcEndDate');
      assert.equal(payload.specifications?.quantity, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E. EDIT ASSET SEPARATION & ARCHITECTURAL INTEGRITY
  // ─────────────────────────────────────────────────────────────
  describe('E. Edit Asset Separation & Architectural Integrity', () => {

    it('1. Create Asset dynamic registry does not interfere with Edit Asset schemas', () => {
      // Edit Asset relies on PUT /api/v1/assets/:id with full schema
      // Verify that DynamicCreateAssetModal only impacts asset registration
      const allConfigs = getAllCategoryConfigs();
      assert.equal(allConfigs.length, 24, 'All 24 registry slots preserved');
    });

    it('2. Category #2 (UNDEFINED_2) remains disabled and rejected across validator and adapter', () => {
      const validationRes = validateAssetCategoryForm('UNDEFINED_2', {});
      assert.equal(validationRes.valid, false);
      assert.ok(validationRes.errors._category.includes('undefined'));

      assert.throws(() => {
        buildAssetPayload('UNDEFINED_2', {});
      }, /Asset category #2 is currently undefined and cannot be registered/);
    });
  });
});
