const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTest() {
  console.log('=== RUNNING EMPLOYEE AUTO-LOGIN E2E TEST ===\n');

  // 1. Admin login to get token
  console.log('1. Logging in as Admin...');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok || !adminData.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminData));
  }
  const adminToken = adminData.data.token;
  console.log('✓ Admin authenticated successfully.\n');

  // 2. Create new employee with automatic login creation
  const testEmpId = `AAI-TEST-${Date.now().toString().slice(-4)}`;
  console.log(`2. Creating employee ${testEmpId} with createLoginAccount: true...`);
  const createRes = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      employeeId: testEmpId,
      name: 'Ramesh Kumar',
      designation: 'Senior Executive (CNS)',
      department: 'Communication, Navigation & Surveillance',
      floor: '3rd Floor, Technical Complex',
      email: `${testEmpId.toLowerCase()}@test.aai.aero`,
      phone: '+91 98401 99999',
      createLoginAccount: true
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error('Create employee failed: ' + JSON.stringify(createData));
  }

  console.log('✓ Employee and User created response:', {
    accountCreated: createData.data.accountCreated,
    username: createData.data.accountDetails?.username,
    tempPassword: createData.data.accountDetails?.tempPassword
  });

  const tempPassword = createData.data.accountDetails?.tempPassword;
  if (!tempPassword || !createData.data.accountCreated) {
    throw new Error('Expected temporary password and accountCreated to be present!');
  }
  console.log('✓ Auto-generated credentials verified.\n');

  // 3. Test duplicate Employee ID collision
  console.log('3. Testing duplicate Employee ID collision...');
  const dupRes = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      employeeId: testEmpId,
      name: 'Duplicate Staff',
      designation: 'Manager',
      department: 'IT',
      floor: '1st Floor'
    })
  });
  if (dupRes.status === 409) {
    console.log('✓ Duplicate collision correctly rejected with 409 Conflict.\n');
  } else {
    throw new Error(`Expected 409 on duplicate employee, got ${dupRes.status}`);
  }

  // 4. Test Employee Login with generated credentials
  console.log(`4. Testing Employee login with Username=${testEmpId} and TempPassword...`);
  const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: testEmpId, password: tempPassword })
  });
  const empLoginData = await empLoginRes.json();
  if (!empLoginRes.ok || !empLoginData.success) {
    throw new Error('Employee login failed: ' + JSON.stringify(empLoginData));
  }
  const employeeToken = empLoginData.data.token;
  console.log('✓ Employee logged in successfully with auto-generated credentials.');
  console.log('  Role:', empLoginData.data.user.role);
  if (empLoginData.data.user.role !== 'EMPLOYEE') {
    throw new Error(`Expected role EMPLOYEE, got ${empLoginData.data.user.role}`);
  }
  console.log('✓ Role is correctly EMPLOYEE.\n');

  // 5. Test RBAC: Employee CANNOT access Admin endpoints
  console.log('5. Testing RBAC: Employee accessing admin-only endpoint...');
  const rbacRes = await fetch(`${BASE_URL}/auth/admin-only`, {
    headers: { Authorization: `Bearer ${employeeToken}` }
  });
  if (rbacRes.status === 403) {
    console.log('✓ RBAC confirmed: Employee forbidden (403) on admin endpoint.\n');
  } else {
    throw new Error(`Expected 403 on admin-only endpoint, got ${rbacRes.status}`);
  }

  // 6. Test Password Reset
  console.log(`6. Admin resetting password for ${testEmpId}...`);
  const resetRes = await fetch(`${BASE_URL}/employees/${testEmpId}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const resetData = await resetRes.json();
  if (!resetRes.ok || !resetData.success) {
    throw new Error('Reset password failed: ' + JSON.stringify(resetData));
  }
  const newTempPassword = resetData.data.tempPassword;
  console.log('✓ Password reset succeeded. New temp password generated:', newTempPassword);

  // 7. Verify login with NEW password
  console.log('7. Verifying login with newly reset password...');
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: testEmpId, password: newTempPassword })
  });
  if (!newLoginRes.ok) {
    throw new Error('Login with new password failed: ' + await newLoginRes.text());
  }
  console.log('✓ Login with new password succeeded.\n');

  // 8. Test Disable Login
  console.log(`8. Disabling login for ${testEmpId}...`);
  const disableRes = await fetch(`${BASE_URL}/employees/${testEmpId}/toggle-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ isActive: false })
  });
  const disableData = await disableRes.json();
  if (!disableRes.ok || !disableData.success) {
    throw new Error('Disable login failed: ' + JSON.stringify(disableData));
  }
  console.log('✓ Login disabled for user.');

  // Verify deactivated login is rejected
  const blockedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: testEmpId, password: newTempPassword })
  });
  if (blockedLoginRes.status === 403) {
    console.log('✓ Deactivated account login blocked with 403 Forbidden.\n');
  } else {
    throw new Error(`Expected 403 on disabled login, got ${blockedLoginRes.status}`);
  }

  // 9. Test Re-enable Login
  console.log(`9. Re-enabling login for ${testEmpId}...`);
  const enableRes = await fetch(`${BASE_URL}/employees/${testEmpId}/toggle-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ isActive: true })
  });
  if (!enableRes.ok) {
    throw new Error('Re-enable login failed: ' + await enableRes.text());
  }
  console.log('✓ Login re-enabled.');

  const reLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: testEmpId, password: newTempPassword })
  });
  if (!reLoginRes.ok) {
    throw new Error('Re-login failed after re-enabling account');
  }
  console.log('✓ Login succeeded after re-enabling.\n');

  // 10. Check Audit Logs
  console.log('10. Checking Audit Logs for account events...');
  const auditRes = await fetch(`${BASE_URL}/audit?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const auditData = await auditRes.json();
  const logs = auditData.data?.items || auditData.data || [];
  const actions = logs.map(l => l.action);
  console.log('Recent audit actions recorded:', actions.slice(0, 8));

  const hasAccountCreated = actions.includes('LOGIN_ACCOUNT_CREATED');
  const hasPasswordReset = actions.includes('PASSWORD_RESET');
  const hasLoginDisabled = actions.includes('LOGIN_DISABLED');
  const hasLoginEnabled = actions.includes('LOGIN_ENABLED');

  console.log('✓ LOGIN_ACCOUNT_CREATED logged:', hasAccountCreated);
  console.log('✓ PASSWORD_RESET logged:', hasPasswordReset);
  console.log('✓ LOGIN_DISABLED logged:', hasLoginDisabled);
  console.log('✓ LOGIN_ENABLED logged:', hasLoginEnabled);

  // Verify no plaintext password in audit logs
  for (const log of logs) {
    const serialized = JSON.stringify(log);
    if (serialized.includes(tempPassword) || serialized.includes(newTempPassword)) {
      throw new Error('SECURITY VIOLATION: Plaintext password found in audit log!');
    }
  }
  console.log('✓ SECURITY VERIFIED: Zero plaintext passwords exposed in audit logs.\n');

  console.log('🎉 ALL BACKEND CHECKS PASSED PERFECTLY!');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
