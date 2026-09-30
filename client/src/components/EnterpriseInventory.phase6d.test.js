import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientSrcDir = path.resolve(__dirname, '..');

test('Phase 6D — Legacy Inventory Cleanup & Final Hardening Invariants', async (t) => {

  // 1. AssetInventory.jsx Physical Removal
  await t.test('1. AssetInventory.jsx has been safely removed from client/src/pages', () => {
    const legacyFilePath = path.join(clientSrcDir, 'pages', 'AssetInventory.jsx');
    assert.strictEqual(
      fs.existsSync(legacyFilePath),
      false,
      'AssetInventory.jsx must no longer exist in client/src/pages'
    );
  });

  // 2. Zero Active Imports of Legacy AssetInventory or Its Symbols
  await t.test('2. No active JavaScript or JSX files import AssetInventory or legacy symbols', () => {
    const checkDir = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          checkDir(fullPath);
        } else if (/\.(js|jsx)$/.test(file.name) && !file.name.includes('.test.')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            /from\s+['"][^'"]*AssetInventory['"]/.test(content),
            false,
            `File ${file.name} must not import from AssetInventory`
          );
          assert.strictEqual(
            content.includes('CANONICAL_CATEGORY_MAP'),
            false,
            `File ${file.name} must not use legacy CANONICAL_CATEGORY_MAP`
          );
          assert.strictEqual(
            content.includes('getAssetTypesForCategory'),
            false,
            `File ${file.name} must not use legacy getAssetTypesForCategory`
          );
        }
      }
    };

    checkDir(clientSrcDir);
  });

  // 3. Single Authoritative Operational Inventory Destination in Sidebar
  await t.test('3. Sidebar navigation defines exactly ONE primary inventory destination (/inventory)', () => {
    const sidebarContent = fs.readFileSync(path.join(clientSrcDir, 'components', 'Sidebar.jsx'), 'utf8');
    
    // Check for /inventory
    assert.ok(
      sidebarContent.includes("path: '/inventory'"),
      "Sidebar must contain an entry for '/inventory'"
    );

    // Check absence of /assets navigation entry
    assert.strictEqual(
      sidebarContent.includes("path: '/assets'"),
      false,
      "Sidebar must NOT contain a navigation entry for '/assets'"
    );

    // Check absence of Boxes icon import
    assert.strictEqual(
      /\bBoxes\b/.test(sidebarContent),
      false,
      "Sidebar must not import unused legacy Boxes icon"
    );
  });

  // 4. App Routing Single Inventory Page & Compatibility Redirect
  await t.test('4. App.jsx maps /inventory to EnterpriseInventory and /assets to AssetsRedirect', () => {
    const appContent = fs.readFileSync(path.join(clientSrcDir, 'App.jsx'), 'utf8');

    // EnterpriseInventory is the only inventory page import
    assert.ok(
      appContent.includes("import EnterpriseInventory from './pages/EnterpriseInventory'"),
      "App.jsx must import EnterpriseInventory"
    );
    assert.strictEqual(
      appContent.includes('AssetInventory'),
      false,
      "App.jsx must not reference AssetInventory"
    );

    // Route for /inventory
    assert.ok(
      appContent.includes('path="/inventory"'),
      "App.jsx must define route for /inventory"
    );
    assert.ok(
      appContent.includes('<EnterpriseInventory />'),
      "Route /inventory must render EnterpriseInventory"
    );

    // Route for /assets
    assert.ok(
      appContent.includes('path="/assets"'),
      "App.jsx must define compatibility route for /assets"
    );
    assert.ok(
      appContent.includes('<AssetsRedirect />'),
      "Route /assets must render AssetsRedirect"
    );
    assert.ok(
      appContent.includes('location.search'),
      "AssetsRedirect must preserve search query string"
    );
  });

  // 5. Internal Links Consolidated to /inventory
  await t.test('5. Internal dashboard and bulk import links point to /inventory', () => {
    const dashboardContent = fs.readFileSync(path.join(clientSrcDir, 'pages', 'Dashboard.jsx'), 'utf8');
    const bulkImportContent = fs.readFileSync(path.join(clientSrcDir, 'pages', 'BulkImportExport.jsx'), 'utf8');

    // Dashboard links
    assert.strictEqual(
      dashboardContent.includes('to="/assets"'),
      false,
      'Dashboard must not contain links to /assets'
    );
    assert.ok(
      dashboardContent.includes('to="/inventory"'),
      'Dashboard must contain links to /inventory'
    );
    assert.ok(
      dashboardContent.includes('to="/inventory?warrantyStatus=EXPIRING_SOON"'),
      'Dashboard warranty action center must link to /inventory?warrantyStatus=EXPIRING_SOON'
    );

    // BulkImportExport link
    assert.strictEqual(
      bulkImportContent.includes('to="/assets"'),
      false,
      'BulkImportExport must not contain links to /assets'
    );
    assert.ok(
      bulkImportContent.includes('to="/inventory"'),
      'BulkImportExport must link to /inventory'
    );
  });

  // 6. Enterprise Inventory Fully Equipped with Migrated Capabilities
  await t.test('6. EnterpriseInventory retains all Phase 6B operational actions', () => {
    const enterpriseContent = fs.readFileSync(path.join(clientSrcDir, 'pages', 'EnterpriseInventory.jsx'), 'utf8');

    assert.ok(enterpriseContent.includes('DynamicCreateAssetModal'), 'Retains DynamicCreateAssetModal');
    assert.ok(enterpriseContent.includes('CategoryFieldEditor'), 'Retains CategoryFieldEditor');
    assert.ok(enterpriseContent.includes('CategoryAssetDetails'), 'Retains CategoryAssetDetails');
    assert.ok(enterpriseContent.includes('verificationApi'), 'Retains verificationApi');
    assert.ok(enterpriseContent.includes('downloadAuthenticatedPdf'), 'Retains downloadAuthenticatedPdf');
    assert.ok(enterpriseContent.includes('useSearchParams'), 'Retains useSearchParams for query hydration');
    assert.ok(enterpriseContent.includes('handleRetireAsset'), 'Retains asset retirement');
    assert.ok(enterpriseContent.includes('handleOpenTagModal'), 'Retains physical tag QR generation');
    assert.ok(enterpriseContent.includes('handleLinkSubmit'), 'Retains component relationship linking');
    assert.ok(enterpriseContent.includes('handleUnlink'), 'Retains component relationship unlinking');
  });
});
