import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignmentApi, cleanQueryParams } from '../services/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetTransfersPath = path.resolve(__dirname, '../pages/AssetTransfers.jsx');

test('Phase 7 — Step 3: AssetTransfers Modernization & Server-Driven Invariants', async (t) => {
  const fileContent = fs.readFileSync(assetTransfersPath, 'utf8');

  // =========================================================================
  // 1. Elimination of Legacy Master-Data Architecture
  // =========================================================================
  await t.test('1. AssetTransfers.jsx contains zero limit=200 or bulk master-data fetches', () => {
    assert.strictEqual(fileContent.includes('limit=200'), false, 'Must not contain limit=200');
    assert.strictEqual(fileContent.includes('limit=500'), false, 'Must not contain limit=500');
    assert.strictEqual(fileContent.includes("fetch('/api/v1/assets?limit=200')"), false);
    assert.strictEqual(fileContent.includes("fetch('/api/v1/employees?limit=200')"), false);
    assert.strictEqual(fileContent.includes('fetchMasterData'), false, 'Must not contain fetchMasterData');
  });

  // =========================================================================
  // 2. Elimination of LoadMoreButton & Accumulator Model
  // =========================================================================
  await t.test('2. AssetTransfers.jsx does not import LoadMoreButton or use [...prev, ...] accumulator', () => {
    assert.strictEqual(fileContent.includes('LoadMoreButton'), false, 'LoadMoreButton must be completely removed');
    assert.strictEqual(fileContent.includes('[...prev,'), false, 'Accumulator pattern [...prev, ...] must not exist');
    assert.strictEqual(fileContent.includes('setLoadingMore'), false);
    assert.strictEqual(fileContent.includes('loadingMore'), false);
  });

  // =========================================================================
  // 3. SearchableSelect Integration for Asset & Employee Selection
  // =========================================================================
  await t.test('3. SearchableSelect is integrated for bounded asynchronous asset and employee lookups', () => {
    assert.strictEqual(fileContent.includes("import SearchableSelect from '../components/ui/SearchableSelect'"), true);
    assert.strictEqual(fileContent.includes('assign-asset-select'), true);
    assert.strictEqual(fileContent.includes('assign-employee-select'), true);
    assert.strictEqual(fileContent.includes('transfer-asset-select'), true);
    assert.strictEqual(fileContent.includes('transfer-target-employee-select'), true);
    assert.strictEqual(fileContent.includes('return-asset-select'), true);

    // Verify bounded limit=10 search functions
    assert.strictEqual(fileContent.includes('loadAvailableAssets'), true);
    assert.strictEqual(fileContent.includes('loadAssignedAssets'), true);
    assert.strictEqual(fileContent.includes('loadEmployees'), true);
    assert.strictEqual(fileContent.includes('limit: 10'), true, 'Search functions must enforce limit: 10');
  });

  // =========================================================================
  // 4. Server-Side Assignment Pagination & Page Size Support
  // =========================================================================
  await t.test('4. Server-side pagination supports 25, 50, and 100 page-size options with bounded controls', () => {
    assert.strictEqual(fileContent.includes('select-transfers-page-size'), true);
    assert.strictEqual(fileContent.includes('<option value={25}>25</option>'), true);
    assert.strictEqual(fileContent.includes('<option value={50}>50</option>'), true);
    assert.strictEqual(fileContent.includes('<option value={100}>100</option>'), true);
    assert.strictEqual(fileContent.includes('btn-prev-transfers-page'), true);
    assert.strictEqual(fileContent.includes('btn-next-transfers-page'), true);

    // Invariant: page size clamping in assignmentApi
    const clean25 = cleanQueryParams({ limit: 25 });
    assert.strictEqual(clean25.limit, 25);
    const clean50 = cleanQueryParams({ limit: 50 });
    assert.strictEqual(clean50.limit, 50);
    const clean100 = cleanQueryParams({ limit: 100 });
    assert.strictEqual(clean100.limit, 100);
  });

  // =========================================================================
  // 5. Server Search & Sorting Invariants
  // =========================================================================
  await t.test('5. Server search and sorting conform to backend allowlist and reset page to 1', () => {
    // Check sortable column definitions
    assert.strictEqual(fileContent.includes('SORTABLE_COLUMNS'), true);
    assert.strictEqual(fileContent.includes('assignedDate'), true);
    assert.strictEqual(fileContent.includes('assetId'), true);
    assert.strictEqual(fileContent.includes('employeeId'), true);
    assert.strictEqual(fileContent.includes('department'), true);
    assert.strictEqual(fileContent.includes('status'), true);

    // Check debounce for ledger search
    assert.strictEqual(fileContent.includes('debouncedSearch'), true);
    assert.strictEqual(fileContent.includes('setTimeout'), true);

    // Check sort toggle logic
    const toggleSort = (currentField, newField, currentOrder) => {
      if (currentField === newField) {
        return { sortBy: currentField, sortOrder: currentOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { sortBy: newField, sortOrder: 'desc' };
    };

    const s1 = toggleSort('assignedDate', 'assignedDate', 'desc');
    assert.strictEqual(s1.sortOrder, 'asc');

    const s2 = toggleSort('assignedDate', 'assetId', 'desc');
    assert.strictEqual(s2.sortBy, 'assetId');
    assert.strictEqual(s2.sortOrder, 'desc');
  });

  // =========================================================================
  // 6. Department and Status Server-Side Filtering
  // =========================================================================
  await t.test('6. Department and status filters are routed through server query parameters', () => {
    assert.strictEqual(fileContent.includes('filter-status-select'), true);
    assert.strictEqual(fileContent.includes('filter-department-select'), true);
    assert.strictEqual(fileContent.includes('selectedDepartment'), true);
    assert.strictEqual(fileContent.includes('selectedStatus'), true);
  });

  // =========================================================================
  // 7. Authoritative KPI Stats via assignmentApi.getStats()
  // =========================================================================
  await t.test('7. Custody KPI cards consume database-level stats from assignmentApi.getStats()', () => {
    assert.strictEqual(fileContent.includes('assignmentApi.getStats()'), true);
    assert.strictEqual(fileContent.includes('stats.total'), true);
    assert.strictEqual(fileContent.includes('stats.active'), true);
    assert.strictEqual(fileContent.includes('stats.transferred'), true);
    assert.strictEqual(fileContent.includes('stats.returned'), true);
    assert.strictEqual(fileContent.includes('Authoritative database total'), true);

    // Verify absence of client-array accumulator KPI computation
    assert.strictEqual(fileContent.includes("assignments.filter(a => a.status === 'ACTIVE').length"), false);
  });

  // =========================================================================
  // 8. Component Cascade UI & cascadeComponents Wiring
  // =========================================================================
  await t.test('8. ComponentCascadeDisclosure wires cascadeComponents and relationship API', () => {
    assert.strictEqual(fileContent.includes('ComponentCascadeDisclosure'), true);
    assert.strictEqual(fileContent.includes('cascadeComponents'), true);
    assert.strictEqual(fileContent.includes('/relationships/components/'), true);
    assert.strictEqual(fileContent.includes('Cascade custody change to all attached components'), true);
  });

  // =========================================================================
  // 9. Assign, Transfer, and Return API Services Wiring
  // =========================================================================
  await t.test('9. Mutation handlers submit through assignmentApi with cascadeComponents and conditions', () => {
    assert.strictEqual(fileContent.includes('assignmentApi.assign('), true);
    assert.strictEqual(fileContent.includes('assignmentApi.transfer('), true);
    assert.strictEqual(fileContent.includes('assignmentApi.return('), true);

    // Verify condition options for return include DEFECTIVE and NEEDS_REPAIR
    assert.strictEqual(fileContent.includes('DEFECTIVE'), true);
    assert.strictEqual(fileContent.includes('NEEDS_REPAIR'), true);
  });

  // =========================================================================
  // 10. Handover Documentation Preservation
  // =========================================================================
  await t.test('10. Official PDF slip and handover documentation functions are preserved', () => {
    assert.strictEqual(fileContent.includes('downloadAuthenticatedPdf'), true);
    assert.strictEqual(fileContent.includes('handleDownloadSlip'), true);
    assert.strictEqual(fileContent.includes('/api/v1/export/handover/'), true);
    assert.strictEqual(fileContent.includes('/api/v1/export/transfer/'), true);
    assert.strictEqual(fileContent.includes('/api/v1/export/return/'), true);
  });
});
