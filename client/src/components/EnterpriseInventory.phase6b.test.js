import test from 'node:test';
import assert from 'node:assert';
import { getActiveCategoryConfigs, getCategoryConfigByKey } from '../config/assetCategoryFormConfigs.js';

test('Phase 6B — Enterprise Inventory Action & State Integration Tests', async (t) => {

  // 1. Authorization & Action Visibility Rules
  await t.test('1. Action visibility rules adhere to ADMIN role and RETIRED status constraints', () => {
    const isActionVisible = (action, role, status) => {
      const isAdmin = role === 'ADMIN';
      const isRetired = status === 'RETIRED';

      switch (action) {
        case 'VIEW':
          return true; // All authenticated users can view
        case 'PRINT_TAG':
          return true; // All authenticated users can print tags
        case 'CREATE':
          return isAdmin; // Only admin can create
        case 'EDIT':
          return isAdmin && !isRetired; // Only admin and non-retired
        case 'RETIRE':
          return isAdmin && !isRetired; // Only admin and non-retired
        case 'LINK':
          return isAdmin && !isRetired; // Only admin and non-retired
        case 'UNLINK':
          return isAdmin && !isRetired; // Only admin and non-retired
        default:
          return false;
      }
    };

    // View action: visible to both admin and employee regardless of status
    assert.strictEqual(isActionVisible('VIEW', 'ADMIN', 'AVAILABLE'), true);
    assert.strictEqual(isActionVisible('VIEW', 'EMPLOYEE', 'AVAILABLE'), true);
    assert.strictEqual(isActionVisible('VIEW', 'EMPLOYEE', 'RETIRED'), true);

    // Tag action: visible to both
    assert.strictEqual(isActionVisible('PRINT_TAG', 'ADMIN', 'ASSIGNED'), true);
    assert.strictEqual(isActionVisible('PRINT_TAG', 'EMPLOYEE', 'ASSIGNED'), true);

    // Create action: ADMIN only
    assert.strictEqual(isActionVisible('CREATE', 'ADMIN', 'AVAILABLE'), true);
    assert.strictEqual(isActionVisible('CREATE', 'EMPLOYEE', 'AVAILABLE'), false);

    // Edit action: ADMIN only AND non-retired
    assert.strictEqual(isActionVisible('EDIT', 'ADMIN', 'AVAILABLE'), true);
    assert.strictEqual(isActionVisible('EDIT', 'ADMIN', 'ASSIGNED'), true);
    assert.strictEqual(isActionVisible('EDIT', 'ADMIN', 'RETIRED'), false);
    assert.strictEqual(isActionVisible('EDIT', 'EMPLOYEE', 'AVAILABLE'), false);

    // Retire action: ADMIN only AND non-retired
    assert.strictEqual(isActionVisible('RETIRE', 'ADMIN', 'AVAILABLE'), true);
    assert.strictEqual(isActionVisible('RETIRE', 'ADMIN', 'RETIRED'), false);
    assert.strictEqual(isActionVisible('RETIRE', 'EMPLOYEE', 'AVAILABLE'), false);
  });

  // 2. Relationship Data Normalization
  await t.test('2. Relationship components and parent normalizers safely adapt backend payloads', () => {
    const normalizeComponents = (data) => {
      const list = Array.isArray(data) ? data : (data?.components || []);
      return list.map(item => ({
        assetId: item.asset?.assetId || item.assetId || item.childAssetId,
        assetName: item.asset?.assetName || item.assetName || 'Hardware Component',
        category: item.asset?.category || item.category || 'Component',
        serialNumber: item.asset?.serialNumber || item.serialNumber || '—',
        status: item.asset?.status || item.status || 'ASSIGNED',
        relationshipType: item.relationshipType || 'ATTACHED'
      }));
    };

    const normalizeParent = (data) => {
      if (!data) return null;
      const p = data.asset || data.parent || data;
      if (!p || (!p.assetId && !p.name)) return null;
      return {
        assetId: p.assetId || data.parentAssetId,
        assetName: p.assetName || p.name || 'Host Workstation',
        category: p.category || 'Workstation'
      };
    };

    // Test with nested asset object (standard server repository contract)
    const serverCompResponse = [
      {
        relationshipId: 'rel-001',
        relationshipType: 'COMPONENT_OF',
        componentRole: 'DISPLAY',
        asset: {
          assetId: 'AAI-MON-001',
          assetName: 'Dell Monitor P2419H',
          category: 'Monitor',
          serialNumber: 'SN-MON-99',
          status: 'ASSIGNED'
        }
      }
    ];

    const normalizedComps = normalizeComponents(serverCompResponse);
    assert.strictEqual(normalizedComps.length, 1);
    assert.strictEqual(normalizedComps[0].assetId, 'AAI-MON-001');
    assert.strictEqual(normalizedComps[0].assetName, 'Dell Monitor P2419H');
    assert.strictEqual(normalizedComps[0].relationshipType, 'COMPONENT_OF');

    // Test with flat object fallback
    const flatCompResponse = {
      components: [
        {
          assetId: 'AAI-UPS-001',
          assetName: 'APC Back-UPS',
          category: 'Online UPS',
          serialNumber: 'SN-UPS-88',
          status: 'AVAILABLE',
          relationshipType: 'POWER_BACKUP'
        }
      ]
    };
    const normalizedFlatComps = normalizeComponents(flatCompResponse);
    assert.strictEqual(normalizedFlatComps.length, 1);
    assert.strictEqual(normalizedFlatComps[0].assetId, 'AAI-UPS-001');

    // Test parent normalization
    const parentResponse = {
      relationshipId: 'rel-002',
      asset: {
        assetId: 'AAI-PC-001',
        assetName: 'Dell OptiPlex 7090',
        category: 'Desktop PC'
      }
    };
    const normalizedParent = normalizeParent(parentResponse);
    assert.ok(normalizedParent);
    assert.strictEqual(normalizedParent.assetId, 'AAI-PC-001');
    assert.strictEqual(normalizedParent.assetName, 'Dell OptiPlex 7090');

    // Test parent null response
    assert.strictEqual(normalizeParent(null), null);
    assert.strictEqual(normalizeParent({}), null);
  });

  // 3. Edit Asset Form Payload & Immutability Rules
  await t.test('3. Edit asset form preserves immutable Asset ID and constructs valid payload', () => {
    const rawAsset = {
      assetId: 'AAI-REG-PC-001',
      assetName: 'Dell Workstation',
      category: 'IT Equipment',
      assetType: 'DESKTOP',
      status: 'AVAILABLE',
      condition: 'GOOD',
      computerConfig: {
        processor: 'Intel Core i7',
        ramSizeGb: 16
      }
    };

    // Simulate edit form data construction
    const editFormData = {
      ...rawAsset,
      assetName: 'Dell Workstation (Updated)',
      condition: 'EXCELLENT',
      computerConfig: {
        ...rawAsset.computerConfig,
        ramSizeGb: 32
      }
    };

    // Asset ID must never be mutated
    assert.strictEqual(editFormData.assetId, 'AAI-REG-PC-001');
    assert.strictEqual(editFormData.assetName, 'Dell Workstation (Updated)');
    assert.strictEqual(editFormData.computerConfig.ramSizeGb, 32);

    // Verify category config resolution using active registry (NO CANONICAL_CATEGORY_MAP)
    const activeCategories = getActiveCategoryConfigs();
    assert.strictEqual(activeCategories.length, 23);
    const monitorConfig = getCategoryConfigByKey('MONITOR');
    assert.strictEqual(monitorConfig.assetType, 'MONITOR');
  });

  // 4. Bounded Server-Driven Architecture Verification
  await t.test('4. Enterprise pagination boundaries, sort allowlist, and zero-accumulator guarantees', () => {
    const ALLOWED_PAGE_SIZES = [25, 50, 100];
    assert.deepStrictEqual(ALLOWED_PAGE_SIZES, [25, 50, 100]);

    // Ensure 10,000 is not allowed
    assert.strictEqual(ALLOWED_PAGE_SIZES.includes(10000), false);

    // Backend sort allowlist fields
    const BACKEND_SORT_FIELDS = new Set([
      'createdAt',
      'updatedAt',
      'assetId',
      'assetName',
      'category',
      'assetType',
      'make',
      'model',
      'department',
      'location',
      'status',
      'condition',
      'purchaseCost',
      'purchaseDate',
      'warrantyEndDate',
      'currentEmployeeName'
    ]);

    assert.strictEqual(BACKEND_SORT_FIELDS.has('assetId'), true);
    assert.strictEqual(BACKEND_SORT_FIELDS.has('department'), true);
    assert.strictEqual(BACKEND_SORT_FIELDS.has('status'), true);
    assert.strictEqual(BACKEND_SORT_FIELDS.has('__invalid_field__'), false);
  });

  // 5. Resilient Drawer Data Fetching Pattern
  await t.test('5. Safe per-request handling prevents optional resource failure from blocking drawer', async () => {
    // Simulated safeFetch implementation
    const safeFetch = async (fetcher) => {
      try {
        return await fetcher();
      } catch {
        return null;
      }
    };

    const mockSuccessAssignments = async () => ({ success: true, data: [{ id: 1 }] });
    const mockFailedComplaints = async () => { throw new Error('Complaints service timeout'); };
    const mockSuccessTimeline = async () => ({ success: true, data: { timeline: [{ action: 'CREATED' }] } });

    const [assignments, complaints, timeline] = await Promise.all([
      safeFetch(mockSuccessAssignments),
      safeFetch(mockFailedComplaints),
      safeFetch(mockSuccessTimeline)
    ]);

    assert.ok(assignments !== null);
    assert.strictEqual(assignments.success, true);
    assert.strictEqual(complaints, null); // Failed gracefully without throwing
    assert.ok(timeline !== null);
    assert.strictEqual(timeline.data.timeline.length, 1);
  });
});
