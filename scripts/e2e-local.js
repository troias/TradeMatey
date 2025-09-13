import { spawn } from 'child_process';
import fetch from 'node-fetch';

async function waitFor(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timeout waiting for ' + url);
}

async function waitForContent(url, containsText, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const txt = await res.text();
        if (txt.includes(containsText) && !txt.includes('Loading...')) return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timeout waiting for content ' + containsText + ' at ' + url);
}

async function main() {
  console.log('Installing playwright browsers...');
  await new Promise((res, rej) => {
    const p = spawn('npx', ['playwright', 'install', '--with-deps'], { stdio: 'inherit', shell: true });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error('playwright install failed'))));
  });

  // Build and start a production server for deterministic assets/manifests.
  console.log('Building production bundle (this can take a minute)...');
  await new Promise((res, rej) => {
    const b = spawn('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
    b.on('close', (c) => (c === 0 ? res() : rej(new Error('build failed'))));
  });

  console.log('Starting production server (next start) on port 3000...');
  const dev = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
  });

  process.on('exit', () => dev.kill());

  console.log('Waiting for http://localhost:3000');
  await waitFor('http://localhost:3000');

  // Wait for the browse page to be compiled and render useful content. Next can
  // report it's listening while it still compiles server/app pages; ensure the
  // /client/browse-tradies page returns the expected heading before seeding.
  try {
    console.log('Waiting for /client/browse-tradies to be ready...');
    await waitForContent('http://localhost:3000/client/browse-tradies', 'Browse Tradies', 60000);
    console.log('/client/browse-tradies is ready');
  } catch (e) {
    console.warn('browse page did not become ready in time, continuing anyway:', String(e));
  }

  console.log('Seeding test data');
  const token = process.env.TEST_SEED_TOKEN;
  if (!token) throw new Error('TEST_SEED_TOKEN not set');
  const r = await fetch('http://localhost:3000/api/test-seed', { method: 'POST', headers: { 'x-test-seed-token': token } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('Seed failed: ' + t);
  }

  console.log('Running Playwright tests');
  const t = spawn('npx', ['playwright', 'test'], { stdio: 'inherit', shell: true });
  t.on('close', (code) => process.exit(code));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
