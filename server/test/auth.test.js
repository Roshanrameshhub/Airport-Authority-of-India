import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 2 Authentication and Authorization Test Suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/auth`;

  let adminToken = '';
  let employeeToken = '';

  t.after(() => {
    server.close();
  });

  // 1. Valid Admin Login
  await t.test('POST /login with valid Admin credentials', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token, 'Token must be returned');
    assert.strictEqual(body.data.user.role, 'ADMIN');
    assert.strictEqual(body.data.user.username, 'admin');
    adminToken = body.data.token;
  });

  // 2. Valid Employee Login
  await t.test('POST /login with valid Employee credentials', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'roshan.r', password: 'Employee@123' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.role, 'EMPLOYEE');
    assert.strictEqual(body.data.user.employeeId, 'AAI-10842');
    employeeToken = body.data.token;
  });

  // 3. Invalid Password
  await t.test('POST /login with invalid password returns 401', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin', password: 'WrongPassword' })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Invalid credentials/);
  });

  // 4. Unknown User
  await t.test('POST /login with unknown user returns 401', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'nonexistent.user', password: 'Password123' })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 5. Validation Failure
  await t.test('POST /login with missing password returns 400 validation error', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin' })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.errors, 'Zod errors array should be present');
  });

  // 6. Protected Route Without Token
  await t.test('GET /me without Authorization header returns 401', async () => {
    const res = await fetch(`${baseUrl}/me`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 7. Protected Route With Valid Token
  await t.test('GET /me with Admin Bearer token returns 200 and profile', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.role, 'ADMIN');
  });

  // 8. RBAC: Admin accessing admin-only endpoint
  await t.test('GET /admin-only with Admin token returns 200', async () => {
    const res = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.accessGranted, true);
  });

  // 9. RBAC: Employee accessing admin-only endpoint (Must be 403 Forbidden)
  await t.test('GET /admin-only with Employee token returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Access denied/);
  });

  // 10. RBAC: Employee accessing employee-only endpoint
  await t.test('GET /employee-only with Employee token returns 200', async () => {
    const res = await fetch(`${baseUrl}/employee-only`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 11. RBAC: Admin accessing employee-only endpoint (Must be 403 Forbidden)
  await t.test('GET /employee-only with Admin token returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/employee-only`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 12. User Registration
  await t.test('POST /register creates a new user and returns 201', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'amit.sharma',
        name: 'Amit Sharma',
        email: 'amit.sharma@aai.aero',
        password: 'Password@123',
        role: 'EMPLOYEE',
        employeeId: 'AAI-10950',
        designation: 'Junior Executive (ATC)',
        department: 'Air Traffic Management'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.username, 'amit.sharma');
  });

  // 13. Duplicate Registration Collision
  await t.test('POST /register with duplicate username returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'amit.sharma',
        name: 'Amit Sharma Duplicate',
        email: 'another.amit@aai.aero',
        password: 'Password@123',
        role: 'EMPLOYEE'
      })
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });
});
