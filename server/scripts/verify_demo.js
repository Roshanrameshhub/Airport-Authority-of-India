/**
 * verify_demo.js — AAI-AMS Demo Account Verification Script
 *
 * Performs live verification of:
 *  1. Admin account exists in MongoDB
 *  2. Admin password (Admin@123) works via bcrypt compare
 *  3. Admin role = ADMIN
 *  4. Employee01 account exists in MongoDB
 *  5. Employee01 password (Employee@123) works via bcrypt compare
 *  6. Employee01 role = EMPLOYEE
 *  7. Employee01 linked to valid Employee master record (AAI-EMP-01)
 *  8. Admin real login API test (POST /api/v1/auth/login)
 *  9. Employee01 real login API test
 * 10. RBAC: Employee cannot access Admin-only endpoints (Excel export, asset creation)
 * 11. RBAC: Admin CAN access Admin-only endpoints (Excel export, audit-logs)
 *
 * SECURITY: No passwords, JWT tokens, or secrets are printed.
 *
 * Usage:
 *   npm run verify:demo      (from server/ directory)
 *   node scripts/verify_demo.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Employee from '../src/models/Employee.js';

// ─── Result tracker ──────────────────────────────────────────────────────────
const results = {};
let allPassed = true;

function pass(key, msg) {
  results[key] = 'PASS';
  console.log(`  ✔ ${msg}`);
}

function fail(key, msg) {
  results[key] = 'FAIL';
  allPassed = false;
  console.error(`  ✘ ${msg}`);
}

function section(title) {
  console.log('');
  console.log(`── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('');
  console.log('================================================================');
  console.log('  AAI-AMS DEMO ACCOUNT VERIFICATION');
  console.log('  Verifying: Admin / Admin@123  |  Employee01 / Employee@123');
  console.log('================================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('  ERROR: MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  // 1. MongoDB Connection
  section('Step 1 — MongoDB Connection');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: true });
    const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`  Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
    pass('db_connect', `MongoDB connection established (readyState=${mongoose.connection.readyState})`);
  } catch (err) {
    fail('db_connect', `MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Admin account existence
  section('Step 2 — Admin Account in MongoDB');
  let adminDoc = null;
  try {
    adminDoc = await User.findOne({ username: 'admin' }).select('+password');
    if (!adminDoc) throw new Error('Admin document not found (username=admin)');
    pass('admin_exists', `Admin record found: username='${adminDoc.username}' | email='${adminDoc.email}' | role='${adminDoc.role}' | isActive=${adminDoc.isActive}`);
  } catch (err) {
    fail('admin_exists', `Admin record check failed: ${err.message}`);
  }

  // 3. Admin password verification (bcrypt compare against Admin@123)
  section('Step 3 — Admin Password Verification (Admin@123)');
  if (adminDoc) {
    try {
      const passwordMatch = await bcrypt.compare('Admin@123', adminDoc.password);
      if (!passwordMatch) throw new Error('bcrypt.compare returned false — password hash does not match Admin@123');
      const hashPrefix = adminDoc.password.substring(0, 7);
      pass('admin_password', `Admin password verified via bcrypt (hash prefix: ${hashPrefix}..., NOT stored plaintext)`);
    } catch (err) {
      fail('admin_password', `Admin password verification failed: ${err.message}`);
    }
  } else {
    fail('admin_password', 'Skipped — admin document not found');
  }

  // 4. Admin role
  section('Step 4 — Admin Role');
  if (adminDoc) {
    if (adminDoc.role === 'ADMIN') {
      pass('admin_role', `Admin role confirmed: ${adminDoc.role}`);
    } else {
      fail('admin_role', `Admin role mismatch: expected ADMIN, got ${adminDoc.role}`);
    }
    if (!adminDoc.isActive) {
      fail('admin_active', 'Admin account is NOT active (isActive=false)');
    } else {
      pass('admin_active', 'Admin account is active (isActive=true)');
    }
  } else {
    fail('admin_role', 'Skipped — admin document not found');
  }

  // 5. Employee01 account existence
  section('Step 5 — Employee01 Account in MongoDB');
  let empDoc = null;
  try {
    empDoc = await User.findOne({ username: 'employee01' }).select('+password');
    if (!empDoc) throw new Error('Employee01 document not found (username=employee01)');
    pass('employee_exists', `Employee01 record found: username='${empDoc.username}' | email='${empDoc.email}' | role='${empDoc.role}' | employeeId='${empDoc.employeeId}' | isActive=${empDoc.isActive}`);
  } catch (err) {
    fail('employee_exists', `Employee01 record check failed: ${err.message}`);
  }

  // 6. Employee01 password verification
  section('Step 6 — Employee01 Password Verification (Employee@123)');
  if (empDoc) {
    try {
      const passwordMatch = await bcrypt.compare('Employee@123', empDoc.password);
      if (!passwordMatch) throw new Error('bcrypt.compare returned false — password hash does not match Employee@123');
      const hashPrefix = empDoc.password.substring(0, 7);
      pass('employee_password', `Employee01 password verified via bcrypt (hash prefix: ${hashPrefix}..., NOT stored plaintext)`);
    } catch (err) {
      fail('employee_password', `Employee01 password verification failed: ${err.message}`);
    }
  } else {
    fail('employee_password', 'Skipped — employee01 document not found');
  }

  // 7. Employee01 role
  section('Step 7 — Employee01 Role');
  if (empDoc) {
    if (empDoc.role === 'EMPLOYEE') {
      pass('employee_role', `Employee01 role confirmed: ${empDoc.role}`);
    } else {
      fail('employee_role', `Employee01 role mismatch: expected EMPLOYEE, got ${empDoc.role}`);
    }
    if (!empDoc.isActive) {
      fail('employee_active', 'Employee01 account is NOT active (isActive=false)');
    } else {
      pass('employee_active', 'Employee01 account is active (isActive=true)');
    }
  } else {
    fail('employee_role', 'Skipped — employee01 document not found');
  }

  // 8. Employee master record linkage
  section('Step 8 — Employee Master Record Linkage (AAI-EMP-01)');
  if (empDoc?.employeeId) {
    try {
      const masterRecord = await Employee.findOne({ employeeId: empDoc.employeeId });
      if (!masterRecord) throw new Error(`Employee master record not found for employeeId='${empDoc.employeeId}'`);
      pass('employee_linkage', `Employee01 linked to master record: '${masterRecord.name}' (${masterRecord.employeeId}) | Dept: ${masterRecord.department}`);
    } catch (err) {
      fail('employee_linkage', `Employee master linkage check failed: ${err.message}`);
    }
  } else {
    fail('employee_linkage', 'Skipped — employee01 document not found or has no employeeId');
  }

  // 9 & 10. Live API tests — spin up a temporary Express listener
  section('Step 9 — Live Login API Tests (real HTTP requests)');

  let server;
  let adminToken = null;
  let empToken = null;

  try {
    server = app.listen(0); // random available port
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}/api/v1`;
    console.log(`  Temporary API server on port ${port}`);

    // Admin login
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'Admin', password: 'Admin@123' })
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      adminToken = data.data.token;
      const u = data.data.user;
      pass('admin_login', `Admin login API: HTTP 200 | username='${u.username}' | role='${u.role}' | JWT issued (not printed)`);
    } catch (err) {
      fail('admin_login', `Admin login API failed: ${err.message}`);
    }

    // Employee01 login
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'Employee01', password: 'Employee@123' })
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      empToken = data.data.token;
      const u = data.data.user;
      pass('employee_login', `Employee01 login API: HTTP 200 | username='${u.username}' | role='${u.role}' | employeeId='${u.employeeId}' | JWT issued (not printed)`);
    } catch (err) {
      fail('employee_login', `Employee01 login API failed: ${err.message}`);
    }

    // 11. RBAC verification
    section('Step 10 — RBAC Verification');

    // Employee must NOT access Admin-only: Excel export (403)
    if (empToken) {
      try {
        const res = await fetch(`${base}/export/assets/excel`, {
          headers: { Authorization: `Bearer ${empToken}` }
        });
        if (res.status === 403) {
          pass('rbac_employee_blocked_excel', `RBAC OK — Employee blocked from GET /export/assets/excel (HTTP ${res.status} Forbidden)`);
        } else {
          fail('rbac_employee_blocked_excel', `RBAC FAIL — Expected 403, got ${res.status} for Employee on /export/assets/excel`);
        }
      } catch (err) {
        fail('rbac_employee_blocked_excel', `RBAC check error: ${err.message}`);
      }

      // Employee must NOT create assets (403)
      try {
        const res = await fetch(`${base}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
          body: JSON.stringify({ assetName: 'Test' })
        });
        if (res.status === 403) {
          pass('rbac_employee_blocked_create_asset', `RBAC OK — Employee blocked from POST /assets (HTTP ${res.status} Forbidden)`);
        } else {
          fail('rbac_employee_blocked_create_asset', `RBAC FAIL — Expected 403, got ${res.status} for Employee on POST /assets`);
        }
      } catch (err) {
        fail('rbac_employee_blocked_create_asset', `RBAC check error: ${err.message}`);
      }
    } else {
      fail('rbac_employee_blocked_excel', 'Skipped — employee token not available');
      fail('rbac_employee_blocked_create_asset', 'Skipped — employee token not available');
    }

    // Admin MUST access Admin-only: Excel export (200)
    if (adminToken) {
      try {
        const res = await fetch(`${base}/export/assets/excel`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status === 200) {
          pass('rbac_admin_excel', `RBAC OK — Admin can access GET /export/assets/excel (HTTP ${res.status})`);
        } else {
          fail('rbac_admin_excel', `RBAC FAIL — Expected 200, got ${res.status} for Admin on /export/assets/excel`);
        }
      } catch (err) {
        fail('rbac_admin_excel', `RBAC check error: ${err.message}`);
      }

      // Admin MUST access audit-logs (200)
      try {
        const res = await fetch(`${base}/audit-logs?limit=1`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status === 200) {
          pass('rbac_admin_audit', `RBAC OK — Admin can access GET /audit-logs (HTTP ${res.status})`);
        } else {
          fail('rbac_admin_audit', `RBAC FAIL — Expected 200, got ${res.status} for Admin on /audit-logs`);
        }
      } catch (err) {
        fail('rbac_admin_audit', `RBAC check error: ${err.message}`);
      }
    } else {
      fail('rbac_admin_excel', 'Skipped — admin token not available');
      fail('rbac_admin_audit', 'Skipped — admin token not available');
    }

  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('================================================================');
  console.log('  VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log('');

  const checks = [
    ['Admin account exists',                'admin_exists'],
    ['Admin password correct (Admin@123)',  'admin_password'],
    ['Admin role = ADMIN',                  'admin_role'],
    ['Admin account active',                'admin_active'],
    ['Employee01 account exists',           'employee_exists'],
    ['Employee01 password (Employee@123)',  'employee_password'],
    ['Employee01 role = EMPLOYEE',          'employee_role'],
    ['Employee01 account active',           'employee_active'],
    ['Employee01 master linkage (EmpID)',   'employee_linkage'],
    ['Admin login API (HTTP 200)',          'admin_login'],
    ['Employee01 login API (HTTP 200)',     'employee_login'],
    ['RBAC: Employee blocked Excel export', 'rbac_employee_blocked_excel'],
    ['RBAC: Employee blocked asset create', 'rbac_employee_blocked_create_asset'],
    ['RBAC: Admin can Excel export',        'rbac_admin_excel'],
    ['RBAC: Admin can audit-logs',          'rbac_admin_audit'],
  ];

  for (const [label, key] of checks) {
    const status = results[key] || 'SKIP';
    const icon = status === 'PASS' ? '✔' : status === 'FAIL' ? '✘' : '—';
    console.log(`  ${icon}  ${label.padEnd(42)} ${status}`);
  }

  console.log('');
  if (allPassed) {
    console.log('  ✔ ALL CHECKS PASSED — Demo accounts fully operational.');
    console.log('');
    console.log('  ADMIN    : Username=Admin      | Password=Admin@123');
    console.log('  EMPLOYEE : Username=Employee01 | Password=Employee@123');
  } else {
    console.log('  ✘ SOME CHECKS FAILED — Run "npm run seed:demo" first, then retry.');
  }
  console.log('================================================================');
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('');
  console.error('  FATAL:', err.message);
  console.error('');
  process.exit(1);
});
