import test from 'node:test';
import assert from 'node:assert';
import * as XLSX from 'xlsx';
import app from '../src/app.js';

test('Phase 10 End-to-End Enterprise Lifecycle & System Hardening Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';
  let createdAssetId = 'AAI-E2E-PC-2024-001';
  let createdSerialNumber = 'SN-E2E-99001';
  let serviceTicketId = '';
  let lastAssignmentId = '';

  t.after(() => {
    server.close();
  });

  // Milestone 1: Health Diagnostic & Security Headers Check
  await t.test('Milestone 1: Health Diagnostic & Security Headers Verification', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    // Verify security & rate-limiting headers
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(res.headers.get('x-ratelimit-limit'), 'RateLimit header must be present');

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'HEALTHY');
    assert.ok(body.data.memory, 'Memory diagnostics must be present');
    assert.ok(body.data.nodeVersion, 'Node runtime version must be present');
    assert.ok(body.data.uptime, 'Uptime must be reported');
  });

  // Milestone 2: User Authentication & Role Verification
  await t.test('Milestone 2: Multi-Role Authentication & JWT Token Issuance', async () => {
    // Admin login
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(adminRes.status, 200);
    const adminData = await adminRes.json();
    assert.strictEqual(adminData.success, true);
    assert.strictEqual(adminData.data.user.role, 'ADMIN');
    adminToken = adminData.data.token;
    assert.ok(adminToken, 'Admin JWT token must be generated');

    // Employee login
    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    assert.strictEqual(empRes.status, 200);
    const empData = await empRes.json();
    assert.strictEqual(empData.success, true);
    assert.strictEqual(empData.data.user.role, 'EMPLOYEE');
    assert.strictEqual(empData.data.user.employeeId, 'AAI-10842');
    employeeToken = empData.data.token;
    assert.ok(employeeToken, 'Employee JWT token must be generated');
  });

  // Milestone 3: Employee Master Directory Inspection
  await t.test('Milestone 3: Employee Master Directory Verification', async () => {
    const res = await fetch(`${baseUrl}/employees?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2, 'Should contain at least 2 seeded employees');

    const roshan = body.data.find(e => e.employeeId === 'AAI-10842');
    const amit = body.data.find(e => e.employeeId === 'AAI-10950');
    assert.ok(roshan, 'Employee Roshan R must exist');
    assert.ok(amit, 'Employee Amit Sharma must exist');
  });

  // Milestone 4: Asset Registration with 13 Confirmed Specification Fields
  await t.test('Milestone 4: Asset Registration with 13 Confirmed Handwritten Fields', async () => {
    const assetPayload = {
      assetId: createdAssetId,
      assetName: 'HP EliteDesk 800 G8 Workstation',
      category: 'Desktop PC / Workstation',
      make: 'HP',
      model: 'EliteDesk 800 G8 Tower',
      serialNumber: createdSerialNumber,
      installDate: '2024-01-15T00:00:00.000Z',
      warrantyStartDate: '2024-01-15T00:00:00.000Z',
      warrantyEndDate: '2027-01-14T00:00:00.000Z',
      operatingSystem: 'Windows 11 Pro for Workstations',
      osVersion: '23H2 (Build 22631.3880)',
      department: 'Communication, Navigation & Surveillance',
      floor: '2nd Floor, Technical Block',
      remarks: 'Primary surveillance workstation for radar maintenance'
    };

    const res = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(assetPayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, createdAssetId);
    assert.strictEqual(body.data.status, 'AVAILABLE');
    assert.strictEqual(body.data.serialNumber, createdSerialNumber);
    assert.strictEqual(body.data.warrantyStatus, 'ACTIVE');
  });

  // Milestone 5: Bulk Excel Spreadsheet Import Simulation
  await t.test('Milestone 5: Bulk Excel Import Validation and Ingestion', async () => {
    // Generate valid workbook buffer matching the 13 confirmed specification fields
    const headers = [
      'User Name', 'Designation', 'Department', 'Floor', 'Employee ID',
      'Asset Name', 'Make', 'Model', 'Serial Number', 'Operating System', 'Remarks'
    ];
    const data = [
      headers,
      [
        'Amit Sharma',
        'Junior Executive (CNS)',
        'Communication, Navigation & Surveillance',
        '2nd Floor',
        'AAI-10950',
        'E2E Lenovo ThinkCentre M70',
        'Lenovo',
        'M70q Gen 3',
        'SN-E2E-IMP-88001',
        'Windows 11 Pro',
        'Imported during Phase 10 verification'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk_Import');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'e2e_import.xlsx');

    // 1. Validate
    const valRes = await fetch(`${baseUrl}/import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    assert.strictEqual(valRes.status, 200);
    const valBody = await valRes.json();
    assert.strictEqual(valBody.success, true);
    assert.strictEqual(valBody.data.validCount, 1);
    assert.ok(valBody.data.importToken);

    // 2. Commit
    const commitRes = await fetch(`${baseUrl}/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        importToken: valBody.data.importToken,
        conflictStrategy: 'SKIP_EXISTING'
      })
    });
    assert.strictEqual(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.strictEqual(commitBody.success, true);
    assert.strictEqual(commitBody.data.importedCount, 1);
  });

  // Milestone 6: Initial Custody Assignment
  await t.test('Milestone 6: Custody Assignment of Asset to Custodian', async () => {
    const assignPayload = {
      assetId: createdAssetId,
      employeeId: 'AAI-10842',
      condition: 'EXCELLENT',
      transferReason: 'Initial operational deployment to CNS Technical Officer',
      remarks: 'Inspected and handed over with complete accessory kit'
    };

    const res = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(assignPayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assetId, createdAssetId);
    assert.strictEqual(body.data.employeeId, 'AAI-10842');
    lastAssignmentId = body.data.assignmentId || body.data._id;
    assert.ok(lastAssignmentId);

    // Verify asset status transitioned to ASSIGNED
    const assetRes = await fetch(`${baseUrl}/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetBody = await assetRes.json();
    assert.strictEqual(assetBody.data.status, 'ASSIGNED');
    assert.strictEqual(assetBody.data.currentEmployeeId, 'AAI-10842');
    assert.strictEqual(assetBody.data.currentEmployeeName, 'Roshan R');
  });

  // Milestone 7: Inter-Departmental Custody Transfer
  await t.test('Milestone 7: Inter-Departmental Custody Transfer', async () => {
    const transferPayload = {
      assetId: createdAssetId,
      toEmployeeId: 'AAI-10950',
      transferReason: 'Re-allocated to Junior Executive for shift operations',
      conditionAtReturn: 'EXCELLENT',
      conditionAtNewAssignment: 'EXCELLENT',
      remarks: 'Shift handover signed off by CNS Supervisor'
    };

    const res = await fetch(`${baseUrl}/assignments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(transferPayload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.newAssignment.employeeId, 'AAI-10950');
    assert.strictEqual(body.data.newAssignment.status, 'ACTIVE');

    // Verify previous assignment status is TRANSFERRED
    assert.strictEqual(body.data.previousAssignment.status, 'TRANSFERRED');

    // Verify Asset record reflects new custodian
    const assetRes = await fetch(`${baseUrl}/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetBody = await assetRes.json();
    assert.strictEqual(assetBody.data.currentEmployeeId, 'AAI-10950');
    assert.strictEqual(assetBody.data.currentEmployeeName, 'Amit Sharma');
    assert.strictEqual(assetBody.data.status, 'ASSIGNED');
  });

  // Milestone 8: IT Service Desk Ticket Logging & Maintenance Interlock
  await t.test('Milestone 8: IT Service Desk Fault Ticket & Maintenance Interlock', async () => {
    const ticketPayload = {
      assetId: createdAssetId,
      category: 'HARDWARE_FAULT',
      title: 'Power supply unit fan noise and sporadic thermal shutdown',
      description: 'PSU fan is making grinding noises under high GPU compute workload',
      severity: 'HIGH',
      phone: '+91 98401 23456'
    };

    // Raise ticket
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(ticketPayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    serviceTicketId = body.data.ticketId;
    assert.ok(serviceTicketId);

    // Assign technician to trigger IN_PROGRESS and automatic UNDER_MAINTENANCE interlock
    const assignTechRes = await fetch(`${baseUrl}/complaints/${serviceTicketId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ technicianName: 'Deepak Verma (Senior Hardware Engineer)' })
    });
    assert.strictEqual(assignTechRes.status, 200);

    // Verify Asset status machine moved to UNDER_MAINTENANCE
    const assetCheck = await fetch(`${baseUrl}/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetData = await assetCheck.json();
    assert.strictEqual(assetData.data.status, 'UNDER_MAINTENANCE');
  });

  // Milestone 9: Service Desk Ticket Resolution & Custody Restoration
  await t.test('Milestone 9: Ticket Resolution and Automatic Custody Restoration', async () => {
    const resolvePayload = {
      status: 'RESOLVED',
      resolutionNotes: 'Replaced faulty OEM 500W power supply unit and stress tested thermals for 4 hours.',
      partsReplaced: 'HP 500W Platinum PSU (Part #HP-PWR-500-G8)'
    };

    const res = await fetch(`${baseUrl}/complaints/${serviceTicketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(resolvePayload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'RESOLVED');

    // Verify Asset status machine restored asset to ASSIGNED because custodian was Amit Sharma
    const assetCheck = await fetch(`${baseUrl}/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetData = await assetCheck.json();
    assert.strictEqual(assetData.data.status, 'ASSIGNED');
    assert.strictEqual(assetData.data.currentEmployeeId, 'AAI-10950');
  });

  // Milestone 10: Asset Custody Return to General Pool
  await t.test('Milestone 10: Asset Custody Return back to Available Inventory Pool', async () => {
    const returnPayload = {
      assetId: createdAssetId,
      returnReason: 'Employee transferred to Regional HQ, asset returned to central IT pool',
      conditionAtReturn: 'GOOD',
      remarks: 'Returned in clean working order after PSU overhaul'
    };

    const res = await fetch(`${baseUrl}/assignments/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(returnPayload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Verify Asset status is AVAILABLE and custodian is unlinked
    const assetCheck = await fetch(`${baseUrl}/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const assetData = await assetCheck.json();
    assert.strictEqual(assetData.data.status, 'AVAILABLE');
    assert.strictEqual(assetData.data.currentEmployeeId, null);
  });

  // Milestone 11: Dynamic Multi-Criteria Excel and PDF Export Generation
  await t.test('Milestone 11: Dynamic Excel Export and PDF Handover Generation', async () => {
    // 1. Excel Export
    const excelRes = await fetch(`${baseUrl}/export/assets/excel?department=Communication,%20Navigation%20&%20Surveillance`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(excelRes.status, 200);
    assert.match(excelRes.headers.get('content-type'), /spreadsheetml/);
    const excelBuffer = await excelRes.arrayBuffer();
    assert.ok(excelBuffer.byteLength > 1000, 'Excel export must contain structured bytes');

    // 2. PDF Handover Slip
    const pdfRes = await fetch(`${baseUrl}/export/handover/asset/${createdAssetId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(pdfRes.status, 200);
    assert.match(pdfRes.headers.get('content-type'), /pdf/);
    const pdfBuffer = await pdfRes.arrayBuffer();
    assert.ok(pdfBuffer.byteLength > 500, 'PDF handover slip must generate binary stream');
  });

  // Milestone 12: Real-time Executive Dashboard Analytics
  await t.test('Milestone 12: Real-time Executive Dashboard & Predictive Warranty Queue', async () => {
    // 1. Stats
    const statsRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const statsBody = await statsRes.json();
    assert.strictEqual(statsBody.success, true);
    assert.ok(statsBody.data.assets.total >= 10, 'Total assets must account for created & seeded items');
    assert.ok(statsBody.data.warranties.active >= 1);
    assert.ok(statsBody.data.complaints.total >= 1);

    // 2. Category Distribution
    const catRes = await fetch(`${baseUrl}/dashboard/category-distribution`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(catRes.status, 200);
    const catBody = await catRes.json();
    assert.strictEqual(catBody.success, true);
    assert.ok(catBody.data.length >= 3, 'Categories must be distributed');

    // 3. Warranty Queue
    const wRes = await fetch(`${baseUrl}/dashboard/warranty-alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(wRes.status, 200);
    const wBody = await wRes.json();
    assert.strictEqual(wBody.success, true);
    assert.ok(Array.isArray(wBody.data));
  });

  // Milestone 13: Immutable Audit Trail Compliance Inspection
  await t.test('Milestone 13: Immutable Audit Trail Verification', async () => {
    // 1. Retrieve Audit Trail
    const auditRes = await fetch(`${baseUrl}/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.strictEqual(auditBody.success, true);
    assert.ok(auditBody.data.length >= 8, 'Must have recorded all lifecycle actions');

    const actions = auditBody.data.map(l => l.action);
    assert.ok(actions.includes('USER_LOGIN'), 'Audit trail must include USER_LOGIN');
    assert.ok(actions.includes('ASSET_CREATED'), 'Audit trail must include ASSET_CREATED');
    assert.ok(actions.includes('CUSTODY_ASSIGNED'), 'Audit trail must include CUSTODY_ASSIGNED');
    assert.ok(actions.includes('CUSTODY_TRANSFERRED'), 'Audit trail must include CUSTODY_TRANSFERRED');
    assert.ok(actions.includes('COMPLAINT_CREATED'), 'Audit trail must include COMPLAINT_CREATED');
    assert.ok(actions.includes('COMPLAINT_STATUS_UPDATED'), 'Audit trail must include COMPLAINT_STATUS_UPDATED');
    assert.ok(actions.includes('CUSTODY_RETURNED'), 'Audit trail must include CUSTODY_RETURNED');
    assert.ok(actions.includes('EXCEL_IMPORTED'), 'Audit trail must include EXCEL_IMPORTED');

    // 2. Retrieve Audit Summary
    const summaryRes = await fetch(`${baseUrl}/audit-logs/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(summaryRes.status, 200);
    const summaryBody = await summaryRes.json();
    assert.strictEqual(summaryBody.success, true);
    assert.ok(summaryBody.data.total >= 8);
    assert.strictEqual(summaryBody.data.totalFailed, 0, 'No unexpected failed events');
    assert.ok(summaryBody.data.byAction['ASSET_CREATED'] >= 1);
  });
});
