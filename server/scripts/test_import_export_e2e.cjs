const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\rosha\\.gemini\\antigravity-ide\\brain\\f758131a-8e56-4e14-8e3e-e57a4a6b175b';
const SAMPLE_DIR = 'c:\\Users\\rosha\\Downloads\\aai\\server\\sample_data';
const PORT = 9223;

const sampleFiles = [
  path.join(SAMPLE_DIR, 'Employee_Master.xlsx'),
  path.join(SAMPLE_DIR, 'Asset_Register.xlsx'),
  path.join(SAMPLE_DIR, 'Computer_Inventory.xlsx'),
  path.join(SAMPLE_DIR, 'Old_Asset_Register.xlsx')
];

async function getAdminToken() {
  const res = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
  });
  const data = await res.json();
  if (!data.success) throw new Error('Failed to login: ' + data.message);
  return data.data.token;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
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

async function runTest() {
  console.log('[E2E Test] Authenticating admin...');
  const token = await getAdminToken();
  console.log('[E2E Test] Admin authenticated successfully.');

  const tempUserDataDir = path.join(ARTIFACTS_DIR, 'scratch', 'edge_import_profile');
  fs.mkdirSync(tempUserDataDir, { recursive: true });

  console.log('[E2E Test] Launching Edge headless...');
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempUserDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,950',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      try {
        await wait(500);
        const version = await getJson(`http://127.0.0.1:${PORT}/json/version`);
        if (version) { connected = true; break; }
      } catch (e) {}
    }
    if (!connected) throw new Error('Could not connect to Edge debugging port');

    const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    const cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 1. Navigate to login to set localStorage token and theme
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await wait(800);
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('aai_ams_token', ${JSON.stringify(token)});
        localStorage.setItem('aai-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      `
    });

    // 2. Navigate to /import-export
    console.log('[E2E Test] Loading /import-export (Dark Theme)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/import-export' });
    await wait(1200);

    // Take screenshot of empty Step 1
    const ssEmpty = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step1_empty_upload_dark.png'), Buffer.from(ssEmpty.data, 'base64'));
    console.log('[E2E Test] Saved: step1_empty_upload_dark.png');

    // 3. Test File Selection: Set 4 sample files on the file input
    console.log('[E2E Test] Selecting 4 sample Excel files...');
    const doc = await cdp.send('DOM.getDocument');
    const inputNode = await cdp.send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#multi-file-upload-input'
    });

    if (!inputNode.nodeId) throw new Error('Could not find #multi-file-upload-input');

    await cdp.send('DOM.setFileInputFiles', {
      files: sampleFiles,
      nodeId: inputNode.nodeId
    });

    // Wait for client-side xlsx inspection and state update
    await wait(1200);

    // Take screenshot of Step 1 with 4 files selected
    const ssSelected = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step1_files_selected_dark.png'), Buffer.from(ssSelected.data, 'base64'));
    console.log('[E2E Test] Saved: step1_files_selected_dark.png');

    // Verify DOM state
    const evalQueueCount = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.card [style*="border-radius: var(--radius-md)"]').length`
    });
    console.log('[E2E Test] Selected file cards rendered in DOM:', evalQueueCount.result?.value);

    // 4. Click [ Process Files ]
    console.log('[E2E Test] Clicking [ Process Files ]...');
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-process-files')?.click();`
    });

    // Capture the live progress panel in action
    await wait(350);
    const ssProgress = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step1_processing_progress_dark.png'), Buffer.from(ssProgress.data, 'base64'));
    console.log('[E2E Test] Saved: step1_processing_progress_dark.png');

    // Wait for Step 2 (Connect & Map) to load
    await wait(2800);

    const ssStep2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step2_connect_map_dark.png'), Buffer.from(ssStep2.data, 'base64'));
    console.log('[E2E Test] Saved: step2_connect_map_dark.png');

    // 5. Click [ Review Clean Data ]
    console.log('[E2E Test] Clicking [ Review Clean Data ]...');
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-review-clean-data')?.click();`
    });

    // Wait for Step 3 (Review Clean Data) to render
    await wait(2500);

    const ssStep3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step3_review_clean_data_dark.png'), Buffer.from(ssStep3.data, 'base64'));
    console.log('[E2E Test] Saved: step3_review_clean_data_dark.png');

    // 6. Click [ Import Clean Data ] to open confirmation modal
    console.log('[E2E Test] Opening confirmation modal...');
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-import-clean-data')?.click();`
    });
    await wait(500);

    // 7. Click [ Confirm Import ] in modal
    console.log('[E2E Test] Executing Confirm Import...');
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-confirm-import-execute')?.click();`
    });

    // Wait for completion screen
    await wait(2500);

    const ssComplete = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step4_import_completed_dark.png'), Buffer.from(ssComplete.data, 'base64'));
    console.log('[E2E Test] Saved: step4_import_completed_dark.png');

    // 8. Now switch to Light Theme to verify Light Theme rendering!
    console.log('\n[E2E Test] Testing Light Theme...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('aai-theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
      `
    });
    await wait(400);

    // Click Import More Files to return to Step 1 in light mode
    await cdp.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('button'));
        const resetBtn = btns.find(b => b.textContent.includes('Import More Files'));
        if (resetBtn) resetBtn.click();
      `
    });
    await wait(800);

    // Select files again in light mode to verify light mode file selection
    const docLight = await cdp.send('DOM.getDocument');
    const inputNodeLight = await cdp.send('DOM.querySelector', {
      nodeId: docLight.root.nodeId,
      selector: '#multi-file-upload-input'
    });
    await cdp.send('DOM.setFileInputFiles', {
      files: sampleFiles.slice(0, 3),
      nodeId: inputNodeLight.nodeId
    });
    await wait(1000);

    const ssLight = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'step1_files_selected_light.png'), Buffer.from(ssLight.data, 'base64'));
    console.log('[E2E Test] Saved: step1_files_selected_light.png');

    // 9. Test View Required Columns Modal
    console.log('[E2E Test] Testing View Required Columns Modal...');
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-view-template-columns')?.click();`
    });
    await wait(600);

    const ssModal = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'modal_required_columns_light.png'), Buffer.from(ssModal.data, 'base64'));
    console.log('[E2E Test] Saved: modal_required_columns_light.png');

    cdp.close();
    console.log('\n[E2E Test] All end-to-end steps completed successfully!');
  } finally {
    try { edgeProc.kill(); } catch (e) {}
  }
}

runTest().catch(err => {
  console.error('[E2E Test Error]:', err);
  process.exit(1);
});
