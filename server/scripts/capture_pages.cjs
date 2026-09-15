const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\rosha\\.gemini\\antigravity-ide\\brain\\f758131a-8e56-4e14-8e3e-e57a4a6b175b';
const PORT = 9222;

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
    // Dynamic import ws or use WebSocket in Node 22+
    const WS = globalThis.WebSocket;
    if (!WS) throw new Error('WebSocket not available in globalThis');
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

async function capture() {
  console.log('[Capture] Authenticating admin...');
  const token = await getAdminToken();
  console.log('[Capture] Obtained token:', token.substring(0, 15) + '...');

  const tempUserDataDir = path.join(ARTIFACTS_DIR, 'scratch', 'edge_temp_profile');
  fs.mkdirSync(tempUserDataDir, { recursive: true });

  console.log('[Capture] Launching Edge headless with remote debugging...');
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempUserDataDir}`,
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
        if (version) {
          connected = true;
          break;
        }
      } catch (e) {}
    }
    if (!connected) throw new Error('Could not connect to Edge debugging port');

    const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Navigate to origin first to set localStorage
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await wait(1000);

    const pages = [
      { name: 'login', path: '/login' },
      { name: 'dashboard', path: '/' },
      { name: 'assets', path: '/assets' }
    ];

    for (const theme of ['dark', 'light']) {
      console.log(`\n[Capture] Setting theme to ${theme}...`);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('aai_ams_token', ${JSON.stringify(token)});
          localStorage.setItem('aai-theme', ${JSON.stringify(theme)});
          document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
          document.body.setAttribute('data-theme', ${JSON.stringify(theme)});
        `
      });

      for (const p of pages) {
        console.log(`[Capture] Loading ${p.name} (${theme})...`);
        await cdp.send('Page.navigate', { url: `http://localhost:5173${p.path}` });
        await wait(1500);

        // Ensure theme attribute is applied on html/body
        await cdp.send('Runtime.evaluate', {
          expression: `
            document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
            document.body.setAttribute('data-theme', ${JSON.stringify(theme)});
          `
        });
        await wait(300);

        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const outPath = path.join(ARTIFACTS_DIR, `screenshot_${p.name}_${theme}.png`);
        fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
        console.log(`[Capture] Saved: screenshot_${p.name}_${theme}.png`);
      }
    }

    cdp.close();
    console.log('\n[Capture] All screenshots captured successfully!');
  } finally {
    try { edgeProc.kill(); } catch (e) {}
  }
}

capture().catch(err => {
  console.error('[Capture Error]:', err);
  process.exit(1);
});
