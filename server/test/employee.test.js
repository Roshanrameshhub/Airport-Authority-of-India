import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 3 Master Data and Employee Management Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // Login to acquire tokens
  await t.test('Acquire authentication tokens for Admin and Employee', async () => {
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminBody.data.token;

    const empRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    const empBody = await empRes.json();
    assert.strictEqual(empRes.status, 200);
    employeeToken = empBody.data.token;
  });

  // 1. Get Departments
  await t.test('GET /master/departments returns list of AAI departments', async () => {
    const res = await fetch(`${baseUrl}/master/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 8);
    const itDept = body.data.find(d => d.code === 'IT');
    assert.ok(itDept, 'IT department must be present');
  });

  // 2. Create Department (Admin Only)
  await t.test('POST /master/departments by Admin creates new department', async () => {
    const res = await fetch(`${baseUrl}/master/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Vigilance & Security',
        code: 'VIG',
        floor: 'Ground Floor, Terminal 1',
        description: 'Airport security and vigilance cell'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.code, 'VIG');
  });

  // 3. Create Department (Forbidden for Employee)
  await t.test('POST /master/departments by Employee returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/master/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized Department',
        code: 'UNAUTH',
        floor: '1st Floor'
      })
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 4. Get Categories
  await t.test('GET /master/categories returns asset equipment categories', async () => {
    const res = await fetch(`${baseUrl}/master/categories`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.some(c => c.code === 'PC'));
    assert.ok(body.data.some(c => c.code === 'PRINTER'));
  });

  // 5. Get Employees (Paginated)
  await t.test('GET /employees returns paginated list of staff', async () => {
    const res = await fetch(`${baseUrl}/employees?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.pagination.page, 1);
    assert.ok(body.pagination.total >= 5);
  });

  // 6. Search Employees
  await t.test('GET /employees?search=Roshan filters staff by query', async () => {
    const res = await fetch(`${baseUrl}/employees?search=Roshan`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.some(e => e.employeeId === 'AAI-10842'));
    assert.strictEqual(body.data.every(e => e.name.includes('Roshan')), true);
  });

  // 7. Filter Employees by Department
  await t.test('GET /employees?department=Finance & Accounts filters accurately', async () => {
    const res = await fetch(`${baseUrl}/employees?department=Finance & Accounts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.every(e => e.department === 'Finance & Accounts'));
  });

  // 8. Get Single Employee By ID
  await t.test('GET /employees/:id returns single employee details', async () => {
    const res = await fetch(`${baseUrl}/employees/AAI-10842`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.employeeId, 'AAI-10842');
    assert.strictEqual(body.data.name, 'Roshan R');
  });

  // 9. Create Employee (Admin)
  await t.test('POST /employees creates new staff member', async () => {
    const res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeId: 'AAI-10999',
        name: 'Kavitha Raman',
        designation: 'Manager (Commercial)',
        department: 'Commercial & Land Management',
        floor: 'Ground Floor, Admin Wing',
        email: 'kavitha.r@aai.aero',
        phone: '+91 98401 77665'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.employeeId, 'AAI-10999');
    assert.strictEqual(body.data.name, 'Kavitha Raman');
  });

  // 10. Duplicate Employee Collision
  await t.test('POST /employees with duplicate employeeId returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeId: 'AAI-10999',
        name: 'Kavitha Duplicate',
        designation: 'Assistant',
        department: 'Commercial & Land Management',
        floor: 'Ground Floor'
      })
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already registered/);
  });

  // 11. Create Employee (Forbidden for Employee)
  await t.test('POST /employees by Employee role returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        employeeId: 'AAI-10888',
        name: 'Unauthorized Staff',
        designation: 'Tester',
        department: 'IT',
        floor: '2nd Floor'
      })
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 12. Update Employee
  await t.test('PUT /employees/:id updates staff designation and floor', async () => {
    const res = await fetch(`${baseUrl}/employees/AAI-10999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        designation: 'Senior Manager (Commercial)',
        floor: '1st Floor, Executive Block'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.designation, 'Senior Manager (Commercial)');
    assert.strictEqual(body.data.floor, '1st Floor, Executive Block');
  });

  // 13. Soft Delete / Deactivate Employee
  await t.test('DELETE /employees/:id deactivates employee without destroying record', async () => {
    const res = await fetch(`${baseUrl}/employees/AAI-10999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Verify deactivated employee is excluded from default active list
    const checkRes = await fetch(`${baseUrl}/employees?search=Kavitha`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.data.length, 0, 'Deactivated employee should be excluded from active search');
  });
});
