/**
 * Smoke test — verifies the server starts and responds to /health.
 * Runs without external services (no Anthropic key needed for health check).
 *
 * Usage: ANTHROPIC_API_KEY=test-key node test/smoke.js
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 9876; // avoid conflicts with dev server
const TIMEOUT_MS = 10000;

function request(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      request('/health')
        .then(resolve)
        .catch(() => {
          if (Date.now() - start > TIMEOUT_MS) {
            reject(new Error('Server did not start within timeout'));
          } else {
            setTimeout(check, 200);
          }
        });
    };
    check();
  });
}

async function run() {
  console.log('Starting server...');

  const server = spawn('node', [path.join(__dirname, '..', 'server.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ANTHROPIC_API_KEY: 'sk-test-not-a-real-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d));
  server.stderr.on('data', (d) => (serverOutput += d));

  // Fail fast if the process exits unexpectedly
  const exitPromise = new Promise((_, reject) => {
    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Server exited with code ${code}\n${serverOutput}`));
      }
    });
  });

  let failed = false;

  try {
    // Wait for server to be ready
    await Promise.race([waitForServer(), exitPromise]);

    // Test 1: GET /health returns 200
    console.log('Test 1: GET /health');
    const health = await request('/health');
    assert(health.status === 200, `Expected 200, got ${health.status}`);
    const json = JSON.parse(health.body);
    assert(json.status === 'ok', `Expected status "ok", got "${json.status}"`);
    assert(json.timestamp, 'Missing timestamp');
    console.log('  PASS — 200 OK, status: ok');

    // Test 2: GET /api/public-stats returns 200
    console.log('Test 2: GET /api/public-stats');
    const stats = await request('/api/public-stats');
    assert(stats.status === 200, `Expected 200, got ${stats.status}`);
    const statsJson = JSON.parse(stats.body);
    assert(statsJson.status === 'ok', `Expected status "ok", got "${statsJson.status}"`);
    assert(typeof statsJson.messages === 'number', 'Missing messages count');
    console.log('  PASS — 200 OK, stats returned');

    // Test 3: GET / serves index.html
    console.log('Test 3: GET / (static file serving)');
    const index = await request('/');
    assert(index.status === 200, `Expected 200, got ${index.status}`);
    assert(index.body.includes('<!DOCTYPE html') || index.body.includes('<html'), 'Expected HTML content');
    console.log('  PASS — 200 OK, HTML served');

    // Test 4: GET /nonexistent returns 404
    console.log('Test 4: GET /nonexistent (404)');
    const notFound = await request('/nonexistent');
    assert(notFound.status === 404, `Expected 404, got ${notFound.status}`);
    console.log('  PASS — 404 returned');

    console.log('\nAll smoke tests passed!');
  } catch (err) {
    console.error(`\nFAILED: ${err.message}`);
    failed = true;
  } finally {
    server.kill('SIGTERM');
    // Clean up the test database
    const fs = require('fs');
    const dbPath = path.join(__dirname, '..', 'interview.db');
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch {}
    }
  }

  process.exit(failed ? 1 : 0);
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

run();
