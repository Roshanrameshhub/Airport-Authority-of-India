import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAssetCategoryForm, isValueEmpty } from './assetFormValidation.js';

describe('Asset Form Validation (Phase 2B)', () => {
  it('1. isValueEmpty correctly identifies empty and valid values', () => {
    assert.equal(isValueEmpty(undefined), true);
    assert.equal(isValueEmpty(null), true);
    assert.equal(isValueEmpty(''), true);
    assert.equal(isValueEmpty('   '), true);
    assert.equal(isValueEmpty('valid text'), false);

    // Number checks
    assert.equal(isValueEmpty(0, 'number'), false, '0 must be valid for numbers');
    assert.equal(isValueEmpty(42, 'number'), false);
    assert.equal(isValueEmpty('0', 'number'), false);
    assert.equal(isValueEmpty('', 'number'), true);
    assert.equal(isValueEmpty('8GB', 'number'), false);

    // Boolean checks
    assert.equal(isValueEmpty(false, 'boolean'), false, 'false must be valid for booleans');
    assert.equal(isValueEmpty(true, 'boolean'), false);
  });

  it('2. Missing/blank fields are allowed and pass validation (e.g. Monitor with empty Make)', () => {
    const res = validateAssetCategoryForm('MONITOR', {
      assetId: 'MON-01',
      serialNumber: 'SN-01',
      // make is omitted/blank!
      model: 'P2419H',
      technology: 'IPS',
      installDate: '2025-01-01',
      suppliedBy: 'Dell',
      supplyOrderNo: 'SO-123',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2028-01-01',
      data: 'HDMI'
    });
    assert.equal(res.valid, true);
    assert.equal(res.errors.make, undefined);
  });

  it('3. Missing required Make does NOT produce an error for Switches (which has no Make)', () => {
    const res = validateAssetCategoryForm('SWITCHES', {
      switchDescription: '24-Port Gigabit Switch',
      configIp: '192.168.1.1',
      serialNumber: 'SW-998',
      location: 'Server Room Rack 1'
    });
    assert.equal(res.valid, true);
    assert.equal(res.errors.make, undefined);
  });

  it('4. Allows alphanumeric, decimal, and fractional values in numeric/quantitative fields (e.g. 8GB, 512GB SSD, 1/2, 1.5)', () => {
    const resDecimal = validateAssetCategoryForm('UPS', {
      assetId: 'UPS-01',
      capacity: '1500.5' // decimal value
    });
    assert.equal(resDecimal.valid, true);
    assert.equal(resDecimal.errors.capacity, undefined);

    const resFraction = validateAssetCategoryForm('ALL_IN_ONE_PC', {
      ram: '1/2' // fractional value
    });
    assert.equal(resFraction.valid, true);
    assert.equal(resFraction.errors.ram, undefined);

    const resAlphanumeric = validateAssetCategoryForm('ALL_IN_ONE_PC', {
      ram: '8GB',
      hddSize: '512GB SSD'
    });
    assert.equal(resAlphanumeric.valid, true);
    assert.equal(resAlphanumeric.errors.ram, undefined);
    assert.equal(resAlphanumeric.errors.hddSize, undefined);
  });

  it('5. Allows manual typing and validates date format when entered', () => {
    const resValid = validateAssetCategoryForm('ALL_IN_ONE_PC', {
      installDate: '2025-01-01'
    });
    assert.equal(resValid.valid, true);
    assert.equal(resValid.errors.installDate, undefined);

    const resInvalidDate = validateAssetCategoryForm('ALL_IN_ONE_PC', {
      installDate: 'not-a-date'
    });
    assert.equal(resInvalidDate.valid, false);
    assert.ok(resInvalidDate.errors.installDate);
  });

  it('6. Projector does NOT require Warranty/AMC and allows blank fields', () => {
    const res = validateAssetCategoryForm('PROJECTOR', {
      make: 'Epson',
      model: 'EB-X06',
      serialNumber: 'SN-PROJ-01',
      location: 'Conference Room 1',
      installDate: '2025-01-10',
      quantity: 1,
      assetId: 'PRJ-01',
      purchaseDate: '2025-01-05',
      supplyOrderNo: 'SO-999',
      suppliedBy: 'Broadline'
    });
    assert.equal(res.valid, true);
    assert.equal(res.errors.warrantyAmcType, undefined);
    assert.equal(res.errors.warrantyAmcDate, undefined);
  });

  it('7. Remarks may be empty or omitted without validation error', () => {
    const baseData = {
      assetId: 'KBD-01',
      serialNumber: 'SN-KBD-01',
      make: 'Logitech',
      model: 'K120',
      technology: 'Membrane',
      installDate: '2025-01-01',
      suppliedBy: 'Vendor',
      supplyOrderNo: 'SO-001',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2026-01-01'
    };

    // Test with remarks omitted
    assert.equal(validateAssetCategoryForm('KEYBOARD', baseData).valid, true);
    // Test with remarks = ''
    assert.equal(validateAssetCategoryForm('KEYBOARD', { ...baseData, remarks: '' }).valid, true);
    // Test with remarks = '   '
    assert.equal(validateAssetCategoryForm('KEYBOARD', { ...baseData, remarks: '   ' }).valid, true);
    // Test with remarks = undefined
    assert.equal(validateAssetCategoryForm('KEYBOARD', { ...baseData, remarks: undefined }).valid, true);
    // Test with remarks = null
    assert.equal(validateAssetCategoryForm('KEYBOARD', { ...baseData, remarks: null }).valid, true);
  });

  it('8. Category #2 is rejected with explicit explanation', () => {
    const resKey = validateAssetCategoryForm('UNDEFINED_2', {});
    assert.equal(resKey.valid, false);
    assert.ok(resKey.errors._category.includes('undefined'));

    const resId = validateAssetCategoryForm(2, {});
    assert.equal(resId.valid, false);
    assert.ok(resId.errors._category.includes('undefined'));
  });

  it('9. Unknown category is rejected', () => {
    const res = validateAssetCategoryForm('NON_EXISTENT_CATEGORY', {});
    assert.equal(res.valid, false);
    assert.ok(res.errors._category);
  });

  it('10. Original formData object remains unchanged after validation', () => {
    const original = Object.freeze({
      assetId: 'MSE-01',
      serialNumber: 'SN-01',
      make: 'Dell',
      model: 'MS116',
      technology: 'Optical',
      installDate: '2025-01-01',
      suppliedBy: 'Dell',
      supplyOrderNo: 'SO-01',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2026-01-01'
    });
    const res = validateAssetCategoryForm('MOUSE', original);
    assert.equal(res.valid, true);
    assert.equal(original.assetId, 'MSE-01');
  });

  it('11. Accepts valid alphanumeric values in text fields without restrictive errors', () => {
    const res = validateAssetCategoryForm('MONITOR', {
      assetId: 'AAI-MON-2026-X99',
      serialNumber: 'SN#123-ABC/456',
      model: 'UltraSharp-U2415-RevA01',
      supplyOrderNo: 'GEMC-511687720241092'
    });
    assert.equal(res.valid, true);
    assert.equal(Object.keys(res.errors).length, 0);
  });
});
