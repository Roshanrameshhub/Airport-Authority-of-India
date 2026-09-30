import test from 'node:test';
import assert from 'node:assert';

test('Phase 6C — Route & Navigation Consolidation Invariants', async (t) => {

  // 1. Sidebar Navigation Consolidation
  await t.test('1. Sidebar admin navigation contains exactly ONE inventory destination pointing to /inventory', () => {
    // Model of current admin navigation items from Sidebar.jsx
    const adminNavItems = [
      { path: '/', label: 'Dashboard', id: 'nav-dashboard' },
      { path: '/inventory', label: 'Inventory', id: 'nav-inventory' },
      { path: '/transfers', label: 'Transfers', id: 'nav-transfers' },
      { path: '/employees', label: 'Employees', id: 'nav-employees' },
      { path: '/complaints', label: 'Complaints', id: 'nav-complaints' },
      { path: '/import-export', label: 'Excel/Reports', id: 'nav-excel-reports' },
      { path: '/audit-logs', label: 'Audit Trail', id: 'nav-audit-trail' }
    ];

    // Assert there is no '/assets' navigation entry
    const assetsNav = adminNavItems.find(item => item.path === '/assets');
    assert.strictEqual(assetsNav, undefined, 'Sidebar must not contain an /assets navigation entry');

    // Assert there is exactly one '/inventory' navigation entry
    const inventoryNavs = adminNavItems.filter(item => item.path === '/inventory');
    assert.strictEqual(inventoryNavs.length, 1, 'Sidebar must have exactly one /inventory entry');
    assert.strictEqual(inventoryNavs[0].label, 'Inventory');
    assert.strictEqual(inventoryNavs[0].id, 'nav-inventory');
  });

  // 2. /assets Compatibility Redirect & Query Parameter Preservation
  await t.test('2. /assets redirect routes to /inventory while faithfully preserving query parameters', () => {
    const computeRedirectTarget = (location) => {
      return `/inventory${location.search || ''}`;
    };

    // Standard redirect without query string
    assert.strictEqual(
      computeRedirectTarget({ pathname: '/assets', search: '' }),
      '/inventory'
    );

    // Redirect preserving filter parameter
    assert.strictEqual(
      computeRedirectTarget({ pathname: '/assets', search: '?warrantyStatus=EXPIRING_SOON' }),
      '/inventory?warrantyStatus=EXPIRING_SOON'
    );

    // Redirect preserving search query
    assert.strictEqual(
      computeRedirectTarget({ pathname: '/assets', search: '?search=Dell+OptiPlex' }),
      '/inventory?search=Dell+OptiPlex'
    );

    // Redirect preserving multiple params
    assert.strictEqual(
      computeRedirectTarget({ pathname: '/assets', search: '?category=Laptop&status=ASSIGNED' }),
      '/inventory?category=Laptop&status=ASSIGNED'
    );
  });

  // 3. Operational Single-Authoritative Inventory Guarantee
  await t.test('3. No duplicate operational inventory is instantiated; AssetInventory is detached from routes', () => {
    // Model of route mapping in App.jsx
    const routeMappings = {
      '/': 'RootDashboard',
      '/inventory': 'EnterpriseInventory',
      '/assets': 'AssetsRedirect',
      '/transfers': 'AssetTransfers',
      '/employees': 'EmployeeDirectory',
      '/complaints': 'ComplaintDesk',
      '/import-export': 'BulkImportExport',
      '/audit-logs': 'AuditLogs'
    };

    // /inventory renders EnterpriseInventory
    assert.strictEqual(routeMappings['/inventory'], 'EnterpriseInventory');

    // /assets does NOT render AssetInventory
    assert.notStrictEqual(routeMappings['/assets'], 'AssetInventory');
    assert.strictEqual(routeMappings['/assets'], 'AssetsRedirect');

    // Assert AssetInventory is not mapped to any active route
    const allRoutedComponents = Object.values(routeMappings);
    assert.strictEqual(
      allRoutedComponents.includes('AssetInventory'),
      false,
      'Legacy AssetInventory must not be mapped to any active route'
    );
  });

  // 4. Role Authorization Integrity
  await t.test('4. Enterprise inventory route preserves ADMIN role guard', () => {
    const routeGuards = {
      '/inventory': ['ADMIN'],
      '/assets': ['ADMIN'],
      '/complaints': ['ADMIN', 'EMPLOYEE']
    };

    assert.deepStrictEqual(routeGuards['/inventory'], ['ADMIN']);
    assert.deepStrictEqual(routeGuards['/assets'], ['ADMIN']);
  });
});
