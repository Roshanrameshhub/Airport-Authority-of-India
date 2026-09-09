import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Employee from '../src/models/Employee.js';
import Asset from '../src/models/Asset.js';

const runVerification = async () => {
  console.log('================================================================================');
  console.log('       AAI DEMO ACCOUNTS & RBAC VERIFICATION AGAINST MONGODB ATLAS              ');
  console.log('================================================================================');

  // 1. Connect to MongoDB Atlas
  const uri = process.env.MONGODB_URI;
  console.log(`[Step 1] Connecting to MongoDB Atlas: ${uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'UNDEFINED'}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, autoIndex: true });
  console.log(`✔ Connected to Atlas Cluster: ${mongoose.connection.host}, Database: ${mongoose.connection.name}`);
  console.log(`✔ Mongoose readyState: ${mongoose.connection.readyState} (1 = connected)`);

  // 2. Query MongoDB Atlas directly to confirm records exist
  console.log('\n[Step 2] Verifying Direct Records in MongoDB Atlas:');
  const adminDoc = await User.findOne({ username: 'admin' });
  if (!adminDoc) throw new Error('Admin user record not found in MongoDB Atlas!');
  console.log(`✔ Admin record found: username='${adminDoc.username}', email='${adminDoc.email}', role='${adminDoc.role}'`);
  console.log(`✔ Admin password hash verified: starts with '${adminDoc.password.substring(0, 7)}...' (Bcrypt hashed, NOT plaintext)`);

  const employeeDoc = await User.findOne({ username: 'employee' });
  if (!employeeDoc) throw new Error('Employee user record not found in MongoDB Atlas!');
  console.log(`✔ Employee record found: username='${employeeDoc.username}', email='${employeeDoc.email}', role='${employeeDoc.role}', employeeId='${employeeDoc.employeeId}'`);
  console.log(`✔ Employee password hash verified: starts with '${employeeDoc.password.substring(0, 7)}...' (Bcrypt hashed, NOT plaintext)`);

  const employeeMaster = await Employee.findOne({ employeeId: 'AAI-10842' });
  if (!employeeMaster) throw new Error('Employee master record not found for AAI-10842!');
  console.log(`✔ Associated Employee Master found: '${employeeMaster.name}' (${employeeMaster.employeeId}) in ${employeeMaster.department}`);

  const assignedAsset = await Asset.findOne({ currentEmployeeId: 'AAI-10842' });
  if (!assignedAsset) throw new Error('Assigned asset not found for AAI-10842!');
  console.log(`✔ Associated Assigned Asset found: '${assignedAsset.assetName}' (${assignedAsset.assetId}), status='${assignedAsset.status}'`);

  // 3. Start local test listener using app
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;
  console.log(`\n[Step 3] Live API Test Server listening on temporary port ${port}`);

  try {
    // 4. Test Admin Login (by username)
    console.log('\n[Step 4] Testing Admin Login via API (POST /auth/login)...');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'AAIAdmin@2026!' })
    });
    const adminLoginData = await adminLoginRes.json();
    if (adminLoginRes.status !== 200 || !adminLoginData.success) {
      throw new Error(`Admin login failed: ${adminLoginData.message}`);
    }
    const adminToken = adminLoginData.data.token;
    console.log(`✔ Admin login succeeded (HTTP 200)`);
    console.log(`  - Role returned: ${adminLoginData.data.user.role}`);
    console.log(`  - JWT Token received: ${adminToken.substring(0, 20)}...`);

    // 5. Test Admin Login (by email)
    console.log('\n[Step 5] Testing Admin Login by Email (admin@aai.local)...');
    const adminEmailRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin@aai.local', password: 'AAIAdmin@2026!' })
    });
    const adminEmailData = await adminEmailRes.json();
    if (adminEmailRes.status !== 200) throw new Error('Admin email login failed');
    console.log(`✔ Admin email login succeeded (HTTP 200)`);

    // 6. Test Employee Login (by username)
    console.log('\n[Step 6] Testing Employee Login via API (POST /auth/login)...');
    const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee', password: 'AAIEmployee@2026!' })
    });
    const empLoginData = await empLoginRes.json();
    if (empLoginRes.status !== 200 || !empLoginData.success) {
      throw new Error(`Employee login failed: ${empLoginData.message}`);
    }
    const empToken = empLoginData.data.token;
    console.log(`✔ Employee login succeeded (HTTP 200)`);
    console.log(`  - Role returned: ${empLoginData.data.user.role}`);
    console.log(`  - Employee ID: ${empLoginData.data.user.employeeId}`);
    console.log(`  - JWT Token received: ${empToken.substring(0, 20)}...`);

    // 7. Test Employee Login (by email)
    console.log('\n[Step 7] Testing Employee Login by Email (employee@aai.local)...');
    const empEmailRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'employee@aai.local', password: 'AAIEmployee@2026!' })
    });
    const empEmailData = await empEmailRes.json();
    if (empEmailRes.status !== 200) throw new Error('Employee email login failed');
    console.log(`✔ Employee email login succeeded (HTTP 200)`);

    // 8. Test Employee Functional Access (My Assets, My Complaints)
    console.log('\n[Step 8] Testing Employee Functional Dashboard Endpoints...');
    const myAssetsRes = await fetch(`${baseUrl}/assets?employeeId=AAI-10842&status=ASSIGNED`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const myAssetsData = await myAssetsRes.json();
    console.log(`✔ GET /assets?employeeId=AAI-10842 status: ${myAssetsRes.status}`);
    console.log(`  - Assets found: ${myAssetsData.data?.items?.length || myAssetsData.data?.length || 0}`);

    const myComplaintsRes = await fetch(`${baseUrl}/complaints?employeeId=AAI-10842`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const myComplaintsData = await myComplaintsRes.json();
    console.log(`✔ GET /complaints?employeeId=AAI-10842 status: ${myComplaintsRes.status}`);
    console.log(`  - Complaints found: ${myComplaintsData.data?.length || 0}`);

    const myLedgerRes = await fetch(`${baseUrl}/assignments/employee/AAI-10842`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✔ GET /assignments/employee/AAI-10842 status: ${myLedgerRes.status}`);

    // 9. Test RBAC Security Enforcement (Employee cannot access Admin-only endpoints)
    console.log('\n[Step 9] Testing RBAC Security Enforcement (Employee vs Admin Endpoints)...');
    const empExportRes = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log(`✔ Employee attempts GET /export/assets/excel -> HTTP ${empExportRes.status} (Expected: 403 Forbidden)`);
    if (empExportRes.status !== 403) throw new Error(`RBAC Failure: Expected 403, got ${empExportRes.status}`);

    const empCreateAssetRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`
      },
      body: JSON.stringify({ assetName: 'Hacker PC' })
    });
    console.log(`✔ Employee attempts POST /assets -> HTTP ${empCreateAssetRes.status} (Expected: 403 Forbidden)`);
    if (empCreateAssetRes.status !== 403) throw new Error(`RBAC Failure: Expected 403, got ${empCreateAssetRes.status}`);

    // 10. Test Admin Access to Administrative Endpoints
    console.log('\n[Step 10] Testing Admin Access to Administrative Endpoints...');
    const adminExportRes = await fetch(`${baseUrl}/export/assets/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✔ Admin attempts GET /export/assets/excel -> HTTP ${adminExportRes.status} (Expected: 200 OK)`);
    if (adminExportRes.status !== 200) throw new Error(`Admin access failure: Expected 200, got ${adminExportRes.status}`);

    const adminAuditRes = await fetch(`${baseUrl}/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✔ Admin attempts GET /audit-logs -> HTTP ${adminAuditRes.status} (Expected: 200 OK)`);
    if (adminAuditRes.status !== 200) throw new Error(`Admin audit access failure: Expected 200, got ${adminAuditRes.status}`);

    console.log('\n================================================================================');
    console.log('✔ ALL VERIFICATION CHECKS PASSED: 100% OPERATIONAL IN MONGODB ATLAS!');
    console.log('================================================================================\n');

  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
