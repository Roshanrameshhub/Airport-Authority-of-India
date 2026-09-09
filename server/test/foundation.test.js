import test from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

test('Phase 1 Foundation API Test Suite', async (t) => {
  // Start server on a test port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  t.after(() => {
    server.close();
  });

  await t.test('Health check endpoint returns 200 and standard response envelope', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Service is operational');
    assert.strictEqual(body.data.status, 'HEALTHY');
    assert.ok(body.timestamp);
  });

  await t.test('404 Not Found returns 404 with standard error envelope', async () => {
    const res = await fetch(`${baseUrl}/undefined-route`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /API route not found/);
    assert.ok(body.timestamp);
  });
});
