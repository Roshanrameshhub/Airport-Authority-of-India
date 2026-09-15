const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\rosha\\.gemini\\antigravity-ide\\brain\\f758131a-8e56-4e14-8e3e-e57a4a6b175b';
const SAMPLE_DIR = 'c:\\Users\\rosha\\Downloads\\aai\\server\\sample_data';
const PORT = 9225;

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
  return data.data.token;
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class SimpleCDP {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 1; this.callbacks = new Map(); }
  async connect() {
    const WS = globalThis.WebSocket;
    this.ws = new WS(this.wsUrl);
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = e => {
      const msg = JSON.parse(e.data);
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
  close() { if (this.ws) this.ws.close(); }
}

async function inspect() {
  const token = await getAdminToken();
  const tempDir = path.join(ARTIFACTS_DIR, 'scratch', 'edge_inspect_profile');
  fs.mkdirSync(tempDir, { recursive: true });

  const proc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,900',
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
    if (!connected) throw new Error('Could not connect to Edge');

    const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const cdp = new SimpleCDP(targets[0].webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await wait(800);
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('aai_ams_token', ${JSON.stringify(token)});
        localStorage.setItem('aai-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      `
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:5173/import-export' });
    await wait(2000);

    const doc = await cdp.send('DOM.getDocument');
    const inputNode = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#multi-file-upload-input' });
    await cdp.send('DOM.setFileInputFiles', { files: sampleFiles, nodeId: inputNode.nodeId });
    await wait(1000);

    // Process files
    await cdp.send('Runtime.evaluate', { expression: `document.getElementById('btn-process-files')?.click();` });
    await wait(3000);

    // Review Clean Data (Step 3)
    await cdp.send('Runtime.evaluate', { expression: `document.getElementById('btn-review-clean-data')?.click();` });
    await wait(2500);

    // Inspect layout in Step 3
    const layoutReport = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const selList = [
            'html',
            'body',
            '#root',
            '.app-container',
            '.app-body-layout',
            '.app-sidebar',
            '.app-main',
            '.page-body',
            '.page-body > div'
          ];

          const results = [];
          for (const s of selList) {
            const el = document.querySelector(s);
            if (!el) {
              results.push({ sel: s, found: false });
              continue;
            }
            const cs = window.getComputedStyle(el);
            results.push({
              sel: s,
              found: true,
              clientHeight: el.clientHeight,
              scrollHeight: el.scrollHeight,
              offsetHeight: el.offsetHeight,
              overflowY: cs.overflowY,
              overflowX: cs.overflowX,
              height: cs.height,
              maxHeight: cs.maxHeight,
              minHeight: cs.minHeight,
              position: cs.position,
              flex: cs.flex,
              display: cs.display
            });
          }

          // Also check window.innerHeight vs document.documentElement.scrollHeight
          return {
            windowInnerHeight: window.innerHeight,
            windowScrollY: window.scrollY,
            htmlScrollHeight: document.documentElement.scrollHeight,
            bodyScrollHeight: document.body.scrollHeight,
            elements: results
          };
        })()
      `,
      returnByValue: true
    });

    console.log('LAYOUT REPORT:');
    console.log(JSON.stringify(layoutReport.result.value, null, 2));

    // Try scrolling window down by 500px and check if it scrolled
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 500);`
    });
    await wait(200);

    const scrollCheck = await cdp.send('Runtime.evaluate', {
      expression: `({ windowScrollY: window.scrollY, htmlScrollTop: document.documentElement.scrollTop, bodyScrollTop: document.body.scrollTop })`,
      returnByValue: true
    });
    console.log('SCROLL CHECK AFTER window.scrollTo(0, 500):', scrollCheck.result.value);

    // Also check if any element has scrollable overflow
    const scrollableAncestors = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const scrollables = [];
          const all = document.querySelectorAll('*');
          for (const el of all) {
            if (el.scrollHeight > el.clientHeight + 10) {
              const cs = window.getComputedStyle(el);
              scrollables.push({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                clientHeight: el.clientHeight,
                scrollHeight: el.scrollHeight,
                overflowY: cs.overflowY
              });
            }
          }
          return scrollables;
        })()
      `,
      returnByValue: true
    });
    console.log('ALL ELEMENTS WITH scrollHeight > clientHeight:');
    console.log(JSON.stringify(scrollableAncestors.result.value, null, 2));

    cdp.close();
  } finally {
    try { proc.kill(); } catch (e) {}
  }
}

inspect().catch(err => {
  console.error('[Inspect Error]:', err);
  process.exit(1);
});
