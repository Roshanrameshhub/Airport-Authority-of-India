import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveCategoryConfigs } from '../config/assetCategoryFormConfigs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryPagePath = path.resolve(__dirname, '../pages/EnterpriseInventory.jsx');

test('Enterprise Inventory Category Filtering Invariant Tests', async (t) => {
  const inventoryContent = fs.readFileSync(inventoryPagePath, 'utf8');

  // Helper matching the categoryOptions useMemo logic in EnterpriseInventory.jsx
  const buildCategoryOptions = (masterCategories = []) => {
    const required = ['CPU', 'Monitor', 'Camera', 'Keyboard', 'Mouse', 'Lap Mouse'];
    const requiredLower = new Set(required.map(r => r.toLowerCase()));
    const coveredKeys = new Set([
      ...requiredLower,
      'camera / cctv',
      'cctv',
      'laptop mse',
      'lap mse',
      'lapmouse'
    ]);

    const activeFormCats = getActiveCategoryConfigs().map(c => c.name);
    const standardCats = ['Desktop PC', 'Laptop', 'Network Switch', 'Online UPS', 'Printer', 'Scanner'];
    const allCandidates = [...masterCategories, ...activeFormCats, ...standardCats];

    const seen = new Set(requiredLower);
    const others = [];

    for (const cat of allCandidates) {
      if (!cat || typeof cat !== 'string') continue;
      const trimmed = cat.trim();
      const lower = trimmed.toLowerCase();
      if (!coveredKeys.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        others.push(trimmed);
      }
    }

    return [...required, ...others];
  };

  // 1. Dropdown options content and order
  await t.test('1. Dropdown options starts with CPU, Monitor, Camera, Keyboard, Mouse, Lap Mouse followed by other existing categories', () => {
    const options = buildCategoryOptions(['Desktop PC', 'Laptop', 'Printer']);

    // Check first 6 options
    assert.strictEqual(options[0], 'CPU');
    assert.strictEqual(options[1], 'Monitor');
    assert.strictEqual(options[2], 'Camera');
    assert.strictEqual(options[3], 'Keyboard');
    assert.strictEqual(options[4], 'Mouse');
    assert.strictEqual(options[5], 'Lap Mouse');

    // Check other existing categories are preserved
    assert.ok(options.includes('Laptop'), 'Must include existing category Laptop');
    assert.ok(options.includes('Printer'), 'Must include existing category Printer');
    assert.ok(options.includes('Scanner'), 'Must include existing category Scanner');
    assert.ok(options.includes('Desktop PC'), 'Must include existing category Desktop PC');
    assert.ok(options.includes('Network Switch'), 'Must include existing category Network Switch');
    assert.ok(options.includes('Online UPS'), 'Must include existing category Online UPS');

    // Ensure no duplicates
    const lowerSet = new Set();
    for (const opt of options) {
      const l = opt.toLowerCase();
      assert.strictEqual(lowerSet.has(l), false, `Duplicate option detected: ${opt}`);
      lowerSet.add(l);
    }
  });

  // 2. Select element definition in JSX
  await t.test('2. Select element contains <option value="">All</option> as default option', () => {
    assert.ok(
      inventoryContent.includes('<option value="">All</option>'),
      'Dropdown must contain <option value="">All</option>'
    );
    assert.ok(
      inventoryContent.includes('id="inv-filter-category"'),
      'Dropdown must preserve id="inv-filter-category"'
    );
  });

  // 3. Category change resets page to 1
  await t.test('3. Category change triggers page reset (handlePageReset)', () => {
    assert.ok(
      inventoryContent.includes('onChange={e => { setFilterCategory(e.target.value); handlePageReset(); }}'),
      'Category change handler must call setFilterCategory and handlePageReset'
    );
  });

  // 4. API query parameter passing
  await t.test('4. Selected category is passed to backend API and cleared when All is selected', () => {
    // In fetchAssets: category is only passed when non-empty and not 'all'
    assert.ok(
      inventoryContent.includes("if (filterCategory && filterCategory.toLowerCase() !== 'all') params.set('category', filterCategory);"),
      'fetchAssets must conditionally pass category to params'
    );

    // In handleExport: category is only passed when non-empty and not 'all'
    assert.ok(
      inventoryContent.includes("if (filterCategory && filterCategory.toLowerCase() !== 'all') params.append('category', filterCategory);"),
      'handleExport must conditionally append category to params'
    );
  });

  // 5. Initial category handling
  await t.test('5. Initial category from searchParams safely maps All to empty string', () => {
    assert.ok(
      inventoryContent.includes("useState(initCategory.toLowerCase() === 'all' ? '' : initCategory)"),
      'Initial filterCategory must normalize All to empty string'
    );
  });
});
