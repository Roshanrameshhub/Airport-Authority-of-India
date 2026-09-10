/**
 * test_auth_api.js
 * Automated verification script for Employee and Admin authentication & RBAC flows.
 * IMPORTANT: No passwords, tokens, secrets, or connection strings are printed.
 */

async function runTests() {
  const baseUrl = 'http://localhost:5000/api/v1';

  console.log('=== Starting Real Authentication & RBAC Verification Tests ===');

  // Test 1: Employee login using username
  console.log('\n[TEST 1] Testing Employee login with username...');
  const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: 'employee',
      password: 'AAIEmployee@2026!'
    })
  });

  const empLoginData = await empLoginRes.json();
  if (!empLoginRes.ok || !empLoginData.data?.token) {
    throw new Error(`Test 1 Failed: Status ${empLoginRes.status}, Message: ${empLoginData.message}`);
  }

  const empToken = empLoginData.data.token;
  const empUser = empLoginData.data.user;

  console.log('  Status: ' + empLoginRes.status + ' OK');
  console.log('  Token received: YES (sanitized/redacted)');
  console.log('  User username: ' + empUser.username);
  console.log('  User email: ' + empUser.email);
  console.log('  User role: ' + empUser.role);
  console.log('  Associated Employee ID: ' + empUser.employeeId);

  if (empUser.role !== 'EMPLOYEE') {
    throw new Error(`Expected role EMPLOYEE but got ${empUser.role}`);
  }
  if (empUser.employeeId !== 'AAI-10842') {
    throw new Error(`Expected employeeId AAI-10842 but got ${empUser.employeeId}`);
  }
  console.log('✔ [TEST 1 PASSED] Employee username login returned valid session and profile.');

  // Test 2: Employee login using email
  console.log('\n[TEST 2] Testing Employee login with email...');
  const empEmailLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: 'employee@aai.local',
      password: 'AAIEmployee@2026!'
    })
  });
  const empEmailLoginData = await empEmailLoginRes.json();
  if (!empEmailLoginRes.ok || !empEmailLoginData.data?.token) {
    throw new Error(`Test 2 Failed: Status ${empEmailLoginRes.status}, Message: ${empEmailLoginData.message}`);
  }
  console.log('  Status: ' + empEmailLoginRes.status + ' OK');
  console.log('  Token received: YES (sanitized/redacted)');
  console.log('✔ [TEST 2 PASSED] Employee email login returned valid session.');

  // Test 3: Authenticated /auth/me with Employee token
  console.log('\n[TEST 3] Testing /auth/me with Employee Bearer token...');
  const empMeRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  const empMeData = await empMeRes.json();
  const meUser = empMeData.data?.user;
  if (!empMeRes.ok || meUser?.role !== 'EMPLOYEE') {
    throw new Error(`Test 3 Failed: Status ${empMeRes.status}`);
  }
  console.log('  Status: ' + empMeRes.status + ' OK');
  console.log('  Profile resolved role: ' + meUser.role);
  console.log('✔ [TEST 3 PASSED] Employee session authenticated successfully.');

  // Test 4: Employee accessing Employee-only route
  console.log('\n[TEST 4] Testing Employee route access (/auth/employee-only)...');
  const empRouteRes = await fetch(`${baseUrl}/auth/employee-only`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log('  Status: ' + empRouteRes.status + ' OK');
  if (empRouteRes.status !== 200) {
    throw new Error(`Test 4 Failed: Expected 200 but got ${empRouteRes.status}`);
  }
  console.log('✔ [TEST 4 PASSED] Employee route access granted.');

  // Test 5: RBAC Enforcement - Employee accessing Admin-only route
  console.log('\n[TEST 5] Testing RBAC restriction: Employee accessing /auth/admin-only...');
  const empAdminRouteRes = await fetch(`${baseUrl}/auth/admin-only`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log('  Status: ' + empAdminRouteRes.status + ' (Expected 403 Forbidden)');
  if (empAdminRouteRes.status !== 403) {
    throw new Error(`Test 5 Failed: Expected 403 Forbidden but got ${empAdminRouteRes.status}`);
  }
  console.log('✔ [TEST 5 PASSED] RBAC successfully blocked employee from admin route.');

  // Test 6: RBAC Enforcement - Employee accessing Excel export
  console.log('\n[TEST 6] Testing RBAC restriction: Employee accessing /export/assets/excel...');
  const empExportRes = await fetch(`${baseUrl}/export/assets/excel`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log('  Status: ' + empExportRes.status + ' (Expected 403 Forbidden)');
  if (empExportRes.status !== 403) {
    throw new Error(`Test 6 Failed: Expected 403 Forbidden but got ${empExportRes.status}`);
  }
  console.log('✔ [TEST 6 PASSED] RBAC successfully blocked employee from admin Excel export.');

  // Test 7: Verify Admin account is unaffected and working
  console.log('\n[TEST 7] Testing Admin login to verify Admin account is intact...');
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: 'admin',
      password: 'AAIAdmin@2026!'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.data?.token) {
    throw new Error(`Test 7 Failed: Status ${adminLoginRes.status}, Message: ${adminLoginData.message}`);
  }
  const adminToken = adminLoginData.data.token;
  console.log('  Status: ' + adminLoginRes.status + ' OK');
  console.log('  Admin role: ' + adminLoginData.data.user.role);

  const adminAccessRes = await fetch(`${baseUrl}/auth/admin-only`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('  Admin access to /auth/admin-only status: ' + adminAccessRes.status);
  if (adminAccessRes.status !== 200) {
    throw new Error(`Admin route check failed with status ${adminAccessRes.status}`);
  }
  console.log('✔ [TEST 7 PASSED] Admin credentials and RBAC access are completely intact.');

  console.log('\n================================================================');
  console.log('ALL AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY (7/7)');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err.message);
  process.exit(1);
});
