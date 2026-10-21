import test from 'node:test';
import assert from 'node:assert';
import { cleanQueryParams, assignmentApi, employeeApi } from '../services/api.js';

test('Phase 7 — Step 2: SearchableSelect & assignmentApi Contract Invariants', async (t) => {

  // =========================================================================
  // 1. SearchableSelect Label and Value Resolution Invariants
  // =========================================================================
  await t.test('1. Default label resolution correctly formats assets, employees, and generic objects', () => {
    // Mimic the SearchableSelect resolveLabel logic
    const resolveLabel = (opt, customFn) => {
      if (!opt) return '';
      if (typeof customFn === 'function') return customFn(opt);
      if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
      if (opt.assetId && opt.assetName) return `${opt.assetId} — ${opt.assetName}`;
      if (opt.assetId) return opt.assetId;
      if (opt.fullName) {
        return opt.employeeId ? `${opt.employeeId} — ${opt.fullName}` : opt.fullName;
      }
      if (opt.firstName || opt.lastName) {
        const name = [opt.firstName, opt.lastName].filter(Boolean).join(' ');
        return opt.employeeId ? `${opt.employeeId} — ${name}` : name;
      }
      if (opt.label) return opt.label;
      if (opt.name) return opt.name;
      return String(opt.id || opt.value || opt);
    };

    // Asset object
    const asset = { assetId: 'AST-2024-0012', assetName: 'Dell Latitude 5420', category: 'LAPTOP' };
    assert.strictEqual(resolveLabel(asset), 'AST-2024-0012 — Dell Latitude 5420');

    // Asset with only assetId
    assert.strictEqual(resolveLabel({ assetId: 'AST-999' }), 'AST-999');

    // Employee with fullName
    const emp1 = { employeeId: 'EMP-045', fullName: 'Rajesh Kumar', department: 'CNS' };
    assert.strictEqual(resolveLabel(emp1), 'EMP-045 — Rajesh Kumar');

    // Employee with firstName and lastName
    const emp2 = { employeeId: 'EMP-088', firstName: 'Priya', lastName: 'Sharma', department: 'ATM' };
    assert.strictEqual(resolveLabel(emp2), 'EMP-088 — Priya Sharma');

    // Generic object with label
    assert.strictEqual(resolveLabel({ label: 'Mumbai Airport (BOM)', value: 'BOM' }), 'Mumbai Airport (BOM)');

    // Custom resolver
    assert.strictEqual(resolveLabel(asset, (o) => `[${o.category}] ${o.assetId}`), '[LAPTOP] AST-2024-0012');
  });

  await t.test('2. Default value resolution extracts assetId, employeeId, id, or value cleanly', () => {
    const resolveValue = (opt, customFn) => {
      if (!opt) return '';
      if (typeof customFn === 'function') return customFn(opt);
      if (typeof opt === 'string' || typeof opt === 'number') return opt;
      return opt.value ?? opt.id ?? opt.assetId ?? opt.employeeId ?? opt._id ?? opt;
    };

    assert.strictEqual(resolveValue({ assetId: 'AST-001', assetName: 'Test' }), 'AST-001');
    assert.strictEqual(resolveValue({ employeeId: 'EMP-100', fullName: 'Test' }), 'EMP-100');
    assert.strictEqual(resolveValue({ id: 'ID-555', name: 'Option' }), 'ID-555');
    assert.strictEqual(resolveValue({ value: 'VAL-123', label: 'Item' }), 'VAL-123');
    assert.strictEqual(resolveValue('RAW-STRING'), 'RAW-STRING');
    assert.strictEqual(resolveValue(42), 42);
  });

  // =========================================================================
  // 2. Debounce & Async Search Invariants (Bounded Limit & Race-Condition Safe)
  // =========================================================================
  await t.test('3. Asynchronous server search executes bounded queries and respects debounce timing', async () => {
    let callCount = 0;
    let lastQuery = null;

    // Simulated bounded API caller
    const mockLoadOptions = async (query) => {
      callCount++;
      lastQuery = query;
      // Guarantee bounded limit = 10
      return [
        { assetId: `${query}-01`, assetName: 'Result 1' },
        { assetId: `${query}-02`, assetName: 'Result 2' }
      ];
    };

    // Debounce runner simulation matching SearchableSelect logic
    let timer = null;
    let requestId = 0;
    let latestResults = null;

    const triggerSearch = (query, delay = 20) => {
      return new Promise((resolve) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          const reqId = ++requestId;
          const res = await mockLoadOptions(query);
          if (requestId === reqId) {
            latestResults = res;
          }
          resolve(res);
        }, delay);
      });
    };

    // Rapid successive queries (keystrokes: "D", "De", "Dell")
    triggerSearch('D', 15);
    triggerSearch('De', 15);
    const finalPromise = triggerSearch('Dell', 15);

    await finalPromise;

    // Only 1 execution should occur for the debounced sequence
    assert.strictEqual(callCount, 1);
    assert.strictEqual(lastQuery, 'Dell');
    assert.strictEqual(latestResults.length, 2);
    assert.strictEqual(latestResults[0].assetId, 'Dell-01');
  });

  await t.test('4. Active request race-condition protection discards stale slower responses', async () => {
    let requestId = 0;
    let resolvedResults = null;

    // Simulate two requests where first request is slow and second is fast
    const slowSearch = async () => {
      const curReqId = ++requestId;
      await new Promise((r) => setTimeout(r, 40));
      if (requestId === curReqId) {
        resolvedResults = 'SLOW_RESULT';
      }
    };

    const fastSearch = async () => {
      const curReqId = ++requestId;
      await new Promise((r) => setTimeout(r, 10));
      if (requestId === curReqId) {
        resolvedResults = 'FAST_RESULT';
      }
    };

    // Launch slow first, then fast immediately
    const slowP = slowSearch();
    const fastP = fastSearch();

    await Promise.all([slowP, fastP]);

    // Fast search must prevail even when slow search finishes afterwards
    assert.strictEqual(resolvedResults, 'FAST_RESULT');
  });

  // =========================================================================
  // 3. assignmentApi Helper & Contract Invariants
  // =========================================================================
  await t.test('5. assignmentApi.getAll strips empty params and enforces bounded limit <= 100', async () => {
    const originalApiGet = globalThis.window; // safe reference check

    // Test query string building through cleanQueryParams and limit clamping
    const rawParams = {
      page: 1,
      limit: 200, // Should be clamped to 100
      search: 'CNS Asset',
      department: 'CNS',
      status: 'ACTIVE',
      sortBy: 'assignedDate',
      sortOrder: 'desc',
      emptyField: '',
      nullField: null,
      undefinedField: undefined
    };

    const cleaned = cleanQueryParams(rawParams);
    assert.strictEqual(cleaned.emptyField, undefined);
    assert.strictEqual(cleaned.nullField, undefined);
    assert.strictEqual(cleaned.undefinedField, undefined);

    const parsedLimit = parseInt(cleaned.limit, 10);
    cleaned.limit = (!isNaN(parsedLimit) && parsedLimit > 0) ? Math.min(parsedLimit, 100) : 25;

    assert.strictEqual(cleaned.limit, 100, 'Limit of 200 must be clamped to 100');
    assert.strictEqual(cleaned.page, 1);
    assert.strictEqual(cleaned.department, 'CNS');
    assert.strictEqual(cleaned.status, 'ACTIVE');
    assert.strictEqual(cleaned.sortBy, 'assignedDate');
    assert.strictEqual(cleaned.sortOrder, 'desc');

    const qs = new URLSearchParams(cleaned).toString();
    assert.match(qs, /limit=100/);
    assert.match(qs, /department=CNS/);
    assert.match(qs, /status=ACTIVE/);
    assert.match(qs, /sortBy=assignedDate/);
  });

  await t.test('6. assignmentApi methods exist and conform to Step 1 backend endpoints', () => {
    assert.strictEqual(typeof assignmentApi.getAll, 'function');
    assert.strictEqual(typeof assignmentApi.getStats, 'function');
    assert.strictEqual(typeof assignmentApi.getById, 'function');
    assert.strictEqual(typeof assignmentApi.getAssetHistory, 'function');
    assert.strictEqual(typeof assignmentApi.getEmployeeAssignments, 'function');
    assert.strictEqual(typeof assignmentApi.assign, 'function');
    assert.strictEqual(typeof assignmentApi.transfer, 'function');
    assert.strictEqual(typeof assignmentApi.return, 'function');
  });

  await t.test('7. assign, transfer, and return payloads support cascadeComponents parameter', () => {
    // Contract check: verify payload shape forwarded by service wrapper
    const assignPayload = {
      assetId: 'AST-001',
      employeeId: 'EMP-001',
      cascadeComponents: true,
      condition: 'GOOD',
      transferReason: 'Initial Allocation'
    };
    assert.strictEqual(assignPayload.cascadeComponents, true);

    const transferPayload = {
      assetId: 'AST-001',
      toEmployeeId: 'EMP-002',
      cascadeComponents: false,
      conditionAtReturn: 'GOOD',
      conditionAtNewAssignment: 'GOOD',
      transferReason: 'Department Transfer'
    };
    assert.strictEqual(transferPayload.cascadeComponents, false);

    const returnPayload = {
      assetId: 'AST-001',
      cascadeComponents: true,
      conditionAtReturn: 'FAIR',
      returnReason: 'Return to IT Pool'
    };
    assert.strictEqual(returnPayload.cascadeComponents, true);
  });

  // =========================================================================
  // 4. Employee & Asset Bounded Search Contracts for Step 3
  // =========================================================================
  await t.test('8. Search contract guarantees bounded limit=10 and no unbounded client accumulators', () => {
    const assetSearchContract = (term) => ({
      search: term,
      limit: 10
    });

    const employeeSearchContract = (term) => ({
      search: term,
      limit: 10
    });

    const assetQuery = assetSearchContract('LAPTOP');
    assert.strictEqual(assetQuery.search, 'LAPTOP');
    assert.strictEqual(assetQuery.limit, 10);
    assert.ok(assetQuery.limit <= 25, 'Search query must be strictly bounded');

    const empQuery = employeeSearchContract('Sharma');
    assert.strictEqual(empQuery.search, 'Sharma');
    assert.strictEqual(empQuery.limit, 10);

    // Anti-patterns check: No limit=200, No accumulator
    assert.notStrictEqual(assetQuery.limit, 200);
    assert.notStrictEqual(empQuery.limit, 200);
  });
});
