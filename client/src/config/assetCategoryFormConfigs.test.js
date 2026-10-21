import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_CATEGORY_FORM_CONFIGS,
  getActiveCategoryConfigs,
  getAllCategoryConfigs,
  getCategoryConfigByKey,
  getCategoryConfigById
} from './assetCategoryFormConfigs.js';

describe('Asset Category Form Configuration Registry (Phase 2A)', () => {
  it('1. Exactly 24 registry slots/definitions exist including undefined #2', () => {
    const all = getAllCategoryConfigs();
    assert.equal(all.length, 24, `Expected exactly 24 definitions, got ${all.length}`);
    const keys = Object.keys(ASSET_CATEGORY_FORM_CONFIGS);
    assert.equal(keys.length, 24, `Expected 24 keys in ASSET_CATEGORY_FORM_CONFIGS, got ${keys.length}`);
  });

  it('2. Exactly 23 definitions are active', () => {
    const active = getActiveCategoryConfigs();
    assert.equal(active.length, 23, `Expected exactly 23 active definitions, got ${active.length}`);
  });

  it('3. Category #2 is disabled and has no invented fields', () => {
    const cat2 = getCategoryConfigById(2);
    assert.ok(cat2, 'Category #2 must exist as a placeholder');
    assert.equal(cat2.isDefined, false, 'Category #2 must have isDefined === false');
    assert.equal(cat2.enabled, false, 'Category #2 must have enabled === false');
    assert.deepEqual(cat2.fields, [], 'Category #2 must have empty fields array');
  });

  it('4. All requested active categories exist with correct IDs (1..24)', () => {
    for (let i = 1; i <= 24; i++) {
      const cfg = getCategoryConfigById(i);
      assert.ok(cfg, `Category with id ${i} must exist`);
      assert.equal(cfg.id, i);
      if (i !== 2) {
        assert.equal(cfg.isDefined, true);
        assert.equal(cfg.enabled, true);
        assert.ok(cfg.fields.length > 0, `Active category #${i} must have fields`);
      }
    }
  });

  it('5. Every requested field exists in its correct category with exact field counts', () => {
    const expectedFieldCounts = {
      1: 27,  // ALL IN ONE PC: 26 + remarks
      2: 0,   // UNDEFINED
      3: 12,  // MONITOR: 11 + remarks
      4: 12,  // PRINTER: 11 + remarks
      5: 11,  // SCANNER: 10 + remarks
      6: 11,  // KEYBOARD: 10 + remarks
      7: 11,  // MOUSE: 10 + remarks
      8: 12,  // UPS: 11 + remarks
      9: 12,  // BIOMETRIC: 11 + remarks
      10: 7,  // CAMERA / CCTV: 6 + remarks
      11: 11, // TV & SERVER: 10 + remarks
      12: 25, // LAPTOP: 24 + remarks
      13: 5,  // SWITCHES: 4 + remarks
      14: 11, // HDD: 10 + remarks
      15: 12, // PODIUM: 11 + remarks
      16: 11, // PROJECTOR: 10 + remarks
      17: 9,  // IP & MAC: 8 + remarks
      18: 3,  // NEW PTR IP: 2 + remarks
      19: 26, // CPU: 25 + remarks
      20: 7,  // LAPTOP MSE: 6 + remarks
      21: 12, // SWITCH UPS: 11 + remarks
      22: 5,  // IT ACCESS: 4 + remarks
      23: 13, // TAB: 12 + remarks
      24: 11  // ACCESS POINT: 10 + remarks
    };

    for (const [idStr, expectedCount] of Object.entries(expectedFieldCounts)) {
      const id = Number(idStr);
      const cfg = getCategoryConfigById(id);
      assert.equal(
        cfg.fields.length,
        expectedCount,
        `Category #${id} (${cfg.name}) expected ${expectedCount} fields, got ${cfg.fields.length}`
      );
    }
  });

  it('6. Every non-remarks field has required === true', () => {
    const active = getActiveCategoryConfigs();
    for (const cat of active) {
      for (const field of cat.fields) {
        if (field.key !== 'remarks') {
          assert.equal(
            field.required,
            true,
            `Category #${cat.id} field '${field.label}' (${field.key}) must be required: true`
          );
        }
      }
    }
  });

  it('7. Remarks has required === false for every active category', () => {
    const active = getActiveCategoryConfigs();
    for (const cat of active) {
      const remarksField = cat.fields.find((f) => f.key === 'remarks');
      assert.ok(remarksField, `Category #${cat.id} (${cat.name}) must have a 'remarks' field`);
      assert.equal(
        remarksField.required,
        false,
        `Category #${cat.id} remarks field must be required: false`
      );
      assert.equal(remarksField.type, 'textarea');
    }
  });

  it('8. Every category has an asset ID field mapped conceptually to assetId where applicable', () => {
    // Categories that define an asset ID / alias
    const categoriesWithAssetId = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    for (const id of categoriesWithAssetId) {
      const cfg = getCategoryConfigById(id);
      const idField = cfg.fields.find((f) => f.target === 'assetId');
      assert.ok(idField, `Category #${id} (${cfg.name}) must have a field targeting 'assetId'`);
      assert.equal(idField.required, true);
    }
  });

  it('9. Serial fields map conceptually to serialNumber', () => {
    // Categories that request serial numbers
    const categoriesWithSerial = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24];
    for (const id of categoriesWithSerial) {
      const cfg = getCategoryConfigById(id);
      const snField = cfg.fields.find((f) => f.target === 'serialNumber');
      assert.ok(snField, `Category #${id} (${cfg.name}) must have a field targeting serialNumber`);
      assert.equal(snField.required, true);
    }
  });

  it('10. Make is catalog-backed wherever Make is requested', () => {
    const categoriesWithMake = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 19, 20, 21, 22, 23, 24];
    for (const id of categoriesWithMake) {
      const cfg = getCategoryConfigById(id);
      const makeField = cfg.fields.find((f) => f.key === 'make');
      assert.ok(makeField, `Category #${id} (${cfg.name}) must have a make field`);
      assert.equal(makeField.source, 'make');
      assert.equal(makeField.type, 'select');
      assert.equal(makeField.required, true);
    }
  });

  it('11. Model is catalog-backed wherever Model is requested', () => {
    const categoriesWithModel = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 19, 20, 21, 22, 23, 24];
    for (const id of categoriesWithModel) {
      const cfg = getCategoryConfigById(id);
      const modelField = cfg.fields.find((f) => f.key === 'model');
      assert.ok(modelField, `Category #${id} (${cfg.name}) must have a model field`);
      assert.equal(modelField.source, 'model');
      assert.equal(modelField.type, 'select');
      assert.equal(modelField.required, true);
    }
  });

  it('12. Technology is catalog-backed wherever Technology/Tech is requested', () => {
    const categoriesWithTech = [3, 4, 5, 6, 7, 8, 9, 15, 21, 23, 24];
    for (const id of categoriesWithTech) {
      const cfg = getCategoryConfigById(id);
      const techField = cfg.fields.find((f) => f.key === 'technology');
      assert.ok(techField, `Category #${id} (${cfg.name}) must have a technology field`);
      assert.equal(techField.source, 'technology');
      assert.equal(techField.type, 'select');
      assert.equal(techField.required, true);
    }
  });

  it('13. Warranty/AMC fields exist exactly where specified', () => {
    const categoriesWithWarranty = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 19, 21, 23, 24];
    for (const id of categoriesWithWarranty) {
      const cfg = getCategoryConfigById(id);
      const wField = cfg.fields.find((f) => f.key === 'warrantyAmcType');
      const wdField = cfg.fields.find((f) => f.key === 'warrantyAmcDate');
      assert.ok(wField, `Category #${id} (${cfg.name}) must have warrantyAmcType`);
      assert.ok(wdField, `Category #${id} (${cfg.name}) must have warrantyAmcDate`);
      assert.equal(wField.required, true);
      assert.equal(wdField.required, true);
    }
  });

  it('14. Special category configurations: LAPTOP MSE (#20) contains parent lapId relationship', () => {
    const lapMse = getCategoryConfigById(20);
    const lapIdField = lapMse.fields.find((f) => f.key === 'lapId');
    assert.ok(lapIdField, 'LAPTOP MSE must have lapId field');
    assert.equal(lapIdField.source, 'relationship');
    assert.equal(lapIdField.target, 'relationship.parentAssetId');
    assert.equal(lapIdField.required, true);
  });

  it('15. Lookup functions return correct results', () => {
    assert.equal(getCategoryConfigByKey('MONITOR')?.id, 3);
    assert.equal(getCategoryConfigById(4)?.key, 'PRINTER');
    assert.equal(getCategoryConfigByKey('INVALID_KEY'), null);
    assert.equal(getCategoryConfigById(999), null);
  });
});
