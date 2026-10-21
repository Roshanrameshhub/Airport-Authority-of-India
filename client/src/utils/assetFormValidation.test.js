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
    assert.equal(isValueEmpty('abc', 'number'), true);

    // Boolean checks
    assert.equal(isValueEmpty(false, 'boolean'), false, 'false must be valid for booleans');
    assert.equal(isValueEmpty(true, 'boolean'), false);
  });

  it('2. Missing required Make produces validation error where Make exists (e.g. Monitor)', () => {
    const res = validateAssetCategoryForm('MONITOR', {
      assetId: 'MON-01',
      serialNumber: 'SN-01',
      // make is missing!
      model: 'P2419H',
      technology: 'IPS',
      installDate: '2025-01-01',
      suppliedBy: 'Dell',
      supplyOrderNo: 'SO-123',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2028-01-01',
      data: 'HDMI'
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.make, 'Must have Make error');
    assert.equal(res.errors.make, 'Make is required');
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

  it('4. Missing required Technology produces an error where Technology exists (e.g. Printer)', () => {
    const res = validateAssetCategoryForm('PRINTER', {
      assetId: 'PTR-01',
      serialNumber: 'SN-02',
      make: 'HP',
      model: 'LaserJet Pro',
      // technology missing
      installDate: '2025-01-01',
      suppliedBy: 'HP',
      supplyOrderNo: 'SO-456',
      warrantyAmcType: 'Warranty',
      warrantyAmcDate: '2028-01-01',
      toner: 'HP 88A'
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.technology, 'Must report technology error');
    assert.equal(res.errors.technology, 'Technology is required');
  });

  it('5. Missing Warranty/AMC produces an error where Warranty/AMC exists (e.g. UPS)', () => {
    const res = validateAssetCategoryForm('UPS', {
      assetId: 'UPS-01',
      serialNumber: 'SN-03',
      make: 'APC',
      model: 'Smart-UPS 1000',
      capacity: 1000,
      technology: 'Line-Interactive',
      installDate: '2025-01-01',
      suppliedBy: 'Schneider',
      supplyOrderNo: 'SO-789'
      // warrantyAmcType and warrantyAmcDate missing
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.warrantyAmcType);
    assert.ok(res.errors.warrantyAmcDate);
  });

  it('6. Projector does NOT require Warranty/AMC', () => {
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
});
