const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\rosha\\.gemini\\antigravity-ide\\brain\\f758131a-8e56-4e14-8e3e-e57a4a6b175b';
const PORT = 9224;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  const adminRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'admin', password: 'Admin@123' })
  });
  const adminData = await adminRes.json();
  const token = adminData.data.token;

  const profileDir = path.join(ARTIFACTS_DIR, 'scratch', 'edge_snap_profile');
  fs.mkdirSync(profileDir, { recursive: true });

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    for (let i = 0; i < 20; i++) {
      await wait(400);
      const v = await getJson(`http://127.0.0.1:${PORT}/json/version`);
      if (v) break;
    }

    const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new globalThis.WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const callbacks = new Map();
    let idCounter = 1;
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && callbacks.has(m.id)) {
        callbacks.get(m.id)(m.result);
        callbacks.delete(m.id);
      }
    };
    function send(method, params = {}) {
      return new Promise(res => {
        const id = idCounter++;
        callbacks.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');

    await send('Page.navigate', { url: 'http://localhost:5173/login' });
    await wait(800);

    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('aai_ams_token', ${JSON.stringify(token)});
        localStorage.setItem('aai-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      `
    });

    await send('Page.navigate', { url: 'http://localhost:5173/employees' });
    await wait(1500);

    await send('Runtime.evaluate', {
      expression: `document.getElementById('add-employee-btn')?.click()`
    });
    await wait(800);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(ARTIFACTS_DIR, 'add_employee_modal_with_auto_login.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log('Successfully saved add_employee_modal_with_auto_login.png');

    ws.close();
  } finally {
    edgeProc.kill();
  }
}

run();
