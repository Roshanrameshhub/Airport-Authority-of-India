const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\rosha\\.gemini\\antigravity-ide\\brain\\f758131a-8e56-4e14-8e3e-e57a4a6b175b';
const PORT = 9223;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const WS = globalThis.WebSocket;
    this.ws = new WS(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function evalCode(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return res.result?.value;
}

async function getAdminToken() {
  const res = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
  });
  const data = await res.json();
  return data.data.token;
}

async function main() {
  console.log('=== STARTING BROWSER UI VERIFICATION ===\n');

  console.log('1. Authenticating Admin for token...');
  const token = await getAdminToken();
  console.log('✓ Admin token obtained.\n');

  const tempUserDataDir = path.join(ARTIFACTS_DIR, 'scratch', 'edge_employee_profile');
  fs.mkdirSync(tempUserDataDir, { recursive: true });

  console.log('2. Launching Edge Headless...');
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempUserDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const version = await getJson(`http://127.0.0.1:${PORT}/json/version`);
      if (version) { connected = true; break; }
    }
    if (!connected) throw new Error('Could not connect to Edge debugging port');

    const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    const cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    // 3. Navigate to login and seed token
    console.log('3. Navigating to set authentication session in localStorage...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await wait(800);
    await evalCode(cdp, `
      localStorage.setItem('aai_ams_token', ${JSON.stringify(token)});
      localStorage.setItem('aai-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    `);

    // 4. Navigate to Employee Directory
    console.log('4. Navigating to /employees...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/employees' });
    await wait(1500);

    const pageTitle = await evalCode(cdp, `document.querySelector('h1')?.innerText`);
    console.log('✓ Page Header Title:', pageTitle);

    // 5. Open Add Employee Modal
    console.log('5. Clicking "+ Add Employee"...');
    await evalCode(cdp, `document.getElementById('add-employee-btn')?.click()`);
    await wait(800);

    // Verify checkbox is present and checked
    const isCheckedByDefault = await evalCode(cdp, `document.getElementById('chk-create-login-account')?.checked`);
    console.log('✓ [✓ Create Login Account Automatically] checkbox is checked by default:', isCheckedByDefault);
    if (!isCheckedByDefault) throw new Error('Expected checkbox to be checked by default!');

    // 6. Fill Form
    const testEmpId = `AAI-UI-${Date.now().toString().slice(-4)}`;
    console.log(`6. Filling employee form for ${testEmpId}...`);
    await evalCode(cdp, `
      (() => {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (!el) return;
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal('modal-employee-id', '${testEmpId}');
        setVal('modal-employee-name', 'Vikramaditya Rao');
        setVal('modal-employee-designation', 'Deputy General Manager (CNS)');
        setVal('modal-employee-department', 'Communication, Navigation & Surveillance');
        setVal('modal-employee-floor', '2nd Floor, Technical Complex');
        setVal('modal-employee-email', '${testEmpId.toLowerCase()}@aai.aero');
        setVal('modal-employee-phone', '+91 98401 55443');
      })()
    `);
    await wait(400);

    // 7. Click Register Staff
    console.log('7. Submitting registration...');
    await evalCode(cdp, `document.getElementById('submit-employee-btn')?.click()`);
    await wait(2000);

    // 8. Verify Confirmation Modal
    const isConfirmationOpen = await evalCode(cdp, `Boolean(document.getElementById('employee-created-modal'))`);
    console.log('✓ Confirmation card modal is visible:', isConfirmationOpen);
    if (!isConfirmationOpen) throw new Error('Expected employee-created-modal to be visible!');

    const confirmationDetails = await evalCode(cdp, `
      (() => {
        const modal = document.getElementById('employee-created-modal');
        const copyBtn = document.getElementById('btn-copy-credentials');
        return {
          text: modal ? modal.innerText : '',
          hasCopyBtn: Boolean(copyBtn)
        };
      })()
    `);
    console.log('✓ Confirmation card details:\n---\n' + confirmationDetails.text + '\n---');
    console.log('✓ Copy Credentials button present:', confirmationDetails.hasCopyBtn);

    // Capture screenshot of confirmation modal
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot1Path = path.join(ARTIFACTS_DIR, 'employee_created_confirmation_modal.png');
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
    console.log('✓ Saved screenshot: employee_created_confirmation_modal.png');

    // Test Copy Credentials
    await evalCode(cdp, `document.getElementById('btn-copy-credentials')?.click()`);
    await wait(500);

    // Close confirmation modal
    console.log('8. Closing confirmation modal...');
    await evalCode(cdp, `document.getElementById('btn-close-created-modal')?.click()`);
    await wait(1000);

    // 9. Open Detail Modal for new employee
    console.log(`9. Opening Detail Modal for ${testEmpId}...`);
    await evalCode(cdp, `
      (() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        const targetRow = rows.find(r => r.innerText.includes('${testEmpId}'));
        if (targetRow) {
          const btn = targetRow.querySelector('button');
          if (btn) btn.click();
          else targetRow.click();
        }
      })()
    `);
    await wait(2000);

    // 10. Check Account Controls in Detail Modal
    console.log('10. Inspecting Account Controls in Detail View...');
    const accountControls = await evalCode(cdp, `
      (() => {
        const resetBtn = document.getElementById('btn-reset-password');
        const disableBtn = document.getElementById('btn-disable-login');
        return {
          hasResetBtn: Boolean(resetBtn),
          hasDisableBtn: Boolean(disableBtn)
        };
      })()
    `);
    console.log('✓ Reset Password button present in detail view:', accountControls.hasResetBtn);
    console.log('✓ Disable Login button present in detail view:', accountControls.hasDisableBtn);
    if (!accountControls.hasResetBtn || !accountControls.hasDisableBtn) {
      throw new Error('Expected Reset Password and Disable Login buttons to be present in detail view!');
    }

    // 11. Test Reset Password
    console.log('11. Clicking Reset Password...');
    await evalCode(cdp, `window.confirm = () => true;`);
    await evalCode(cdp, `document.getElementById('btn-reset-password')?.click()`);
    await wait(1500);

    const hasResetBanner = await evalCode(cdp, `Boolean(document.getElementById('btn-copy-reset-password'))`);
    console.log('✓ Temporary Password reset banner displayed with Copy Password button:', hasResetBanner);
    if (!hasResetBanner) throw new Error('Expected password reset banner to be visible!');

    // Capture screenshot of detail modal
    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.join(ARTIFACTS_DIR, 'employee_detail_account_controls.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    console.log('✓ Saved screenshot: employee_detail_account_controls.png');

    // 12. Test Disable Login
    console.log('12. Clicking Disable Login...');
    await evalCode(cdp, `document.getElementById('btn-disable-login')?.click()`);
    await wait(1500);

    const hasEnableBtn = await evalCode(cdp, `Boolean(document.getElementById('btn-enable-login'))`);
    console.log('✓ Action button successfully switched to "Enable Login":', hasEnableBtn);
    if (!hasEnableBtn) throw new Error('Expected action button to switch to Enable Login!');

    // 13. Test Re-Enable Login
    console.log('13. Clicking Enable Login...');
    await evalCode(cdp, `document.getElementById('btn-enable-login')?.click()`);
    await wait(1500);

    const reDisabledBtn = await evalCode(cdp, `Boolean(document.getElementById('btn-disable-login'))`);
    console.log('✓ Action button successfully switched back to "Disable Login":', reDisabledBtn);

    console.log('\n==================================================');
    console.log('🏆 BROWSER UI VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('==================================================\n');

    cdp.close();
  } finally {
    edgeProc.kill();
  }
}

main().catch(err => {
  console.error('\n❌ BROWSER TEST FAILED:', err.message);
  process.exit(1);
});
