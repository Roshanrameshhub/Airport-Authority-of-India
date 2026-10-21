import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import Employee from '../src/models/Employee.js';
import Asset from '../src/models/Asset.js';
import AssetAssignment from '../src/models/AssetAssignment.js';
import User from '../src/models/User.js';

test('AAI-AMS 9 Requirements Verification Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';

  t.after(() => {
    server.close();
  });

  // Login to acquire admin token
  await t.test('Acquire Admin authentication token', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminBody.data.token;
    assert.ok(adminToken);
  });

  // Requirement 1 & 2 & 8: Create Employee with 15 fields, optional fields omitted, alphanumeric IDs
  await t.test('Req 1, 2, 8: POST /employees accepts alphanumeric IDs, optional fields omitted, auto-generates employeeId if omitted', async () => {
    const uniqueName = `Test Staff ${Date.now()}`;
    const payload = {
      name: uniqueName,
      designation: 'Senior Executive',
      department: 'Airport Systems & Information Technology',
      employeeType: 'AAI',
      intercom: 'EXT-4421',
      floor: '3rd Floor',
      ipAddress: '10.20.30.40'
      // Note: employeeId, email, phone are omitted to test auto-generation and optionality
    };

    const res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201, `Failed with body: ${JSON.stringify(body)}`);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.employeeId, 'employeeId must be auto-generated');
    assert.match(body.data.employeeId, /^AAI-EMP-\d+$/);
    assert.strictEqual(body.data.intercom, 'EXT-4421');
    assert.strictEqual(body.data.ipAddress, '10.20.30.40');
  });

  // Requirement 2: Explicit alphanumeric employeeId (e.g. AAI-ENG-X77)
  await t.test('Req 2: POST /employees supports custom alphanumeric employeeId', async () => {
    const customId = `AAI-ENG-${Date.now().toString().slice(-4)}`;
    const payload = {
      employeeId: customId,
      name: 'Alphanumeric Specialist',
      designation: 'Technical Officer',
      department: 'CNS',
      intercom: 'CNS-991',
      ipAddress: '192.168.1.100'
    };

    const res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.employeeId, customId);
    assert.strictEqual(body.data.intercom, 'CNS-991');
  });

  // Requirement 7: Admin can create user login credentials for an employee
  await t.test('Req 7: POST /employees/:id/login allows Admin to create login credentials', async () => {
    const empId = `EMP-AUTH-${Date.now().toString().slice(-4)}`;
    // First create employee
    await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeId: empId,
        name: 'Login Test Employee',
        designation: 'Assistant Manager',
        department: 'Operations',
        createLoginAccount: false
      })
    });

    const username = `empuser_${Date.now()}`;
    const password = 'StrongPassword@123';

    const loginRes = await fetch(`${baseUrl}/employees/${empId}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username,
        password,
        role: 'EMPLOYEE'
      })
    });

    const loginBody = await loginRes.json();
    assert.strictEqual(loginRes.status, 201, `Failed to create login: ${JSON.stringify(loginBody)}`);
    assert.strictEqual(loginBody.success, true);
    assert.strictEqual(loginBody.data.username, username.toLowerCase());

    // Verify the newly created user can log in
    const authRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: username, password })
    });
    const authBody = await authRes.json();
    assert.strictEqual(authRes.status, 200, `User could not log in: ${JSON.stringify(authBody)}`);
    assert.ok(authBody.data.token, 'Token must be returned on valid login');
  });

  // Requirement 9: Assigned assets count matches authoritative active assignments
  await t.test('Req 9: Employee assignedAssetsCount reflects active assignments dynamically', async () => {
    const empId = `EMP-CNT-${Date.now().toString().slice(-4)}`;
    const empName = 'Count Test Employee';

    // Create employee
    const createRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeId: empId,
        name: empName,
        designation: 'Inspector',
        department: 'IT'
      })
    });
    assert.strictEqual(createRes.status, 201);

    // Initial count should be 0
    const getRes1 = await fetch(`${baseUrl}/employees/${empId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body1 = await getRes1.json();
    assert.strictEqual(body1.data.assignedAssetsCount, 0, 'Initial assignedAssetsCount must be 0');

    // Create an asset and assign it to the employee
    const assetId = `AST-CNT-${Date.now().toString().slice(-4)}`;
    const assetRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId,
        assetName: 'Count Verification Laptop',
        category: 'Laptop',
        assetType: 'LAPTOP',
        serialNumber: `SN-${Date.now().toString().slice(-5)}`
      })
    });
    assert.strictEqual(assetRes.status, 201);

    // Assign asset
    const assignRes = await fetch(`${baseUrl}/assignments/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetId,
        employeeId: empId,
        remarks: 'Assigned for testing count resolution'
      })
    });
    assert.strictEqual(assignRes.status, 201);

    // Check count: should now be authoritatively 1!
    const getRes2 = await fetch(`${baseUrl}/employees/${empId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body2 = await getRes2.json();
    assert.strictEqual(body2.data.assignedAssetsCount, 1, 'assignedAssetsCount must dynamically be 1 after assignment');

    // Check in the list endpoint as well
    const listRes = await fetch(`${baseUrl}/employees?search=${empId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listBody = await listRes.json();
    const listedEmp = listBody.data.find(e => e.employeeId === empId);
    assert.ok(listedEmp, 'Employee must be present in search list');
    assert.strictEqual(listedEmp.assignedAssetsCount, 1, 'Search list must authoritatively report 1 assigned asset');
  });
});
