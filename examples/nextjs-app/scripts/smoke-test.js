import { spawn } from 'node:child_process';

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

console.log('🚀 Starting Next.js production server for HTTP smoke testing on port', PORT);

const server = spawn('pnpm', ['start', '--port', String(PORT)], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
  detached: process.platform !== 'win32'
});

server.stdout.on('data', data => {
  const line = data.toString();
  if (line.includes('Ready') || line.includes('started')) {
    // console.log('[Next.js]', line.trim());
  }
});

server.stderr.on('data', _data => {
  // console.error('[Next.js err]', data.toString().trim());
});

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(BASE_URL);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Next.js server failed to become ready within timeout.');
}

async function runTests() {
  try {
    await waitForServer();
    console.log('✔ Next.js server is ready. Executing HTTP redirect smoke tests...\n');

    const tests = [
      {
        name: 'Permanent legacy redirect (/old-about -> /about)',
        path: '/old-about',
        expectedStatus: 308,
        expectedLocation: '/about'
      },
      {
        name: 'Temporary promotional redirect (/summer-sale -> /deals/summer)',
        path: '/summer-sale',
        expectedStatus: 307,
        expectedLocation: '/deals/summer'
      },
      {
        name: 'Permanent shortcut redirect (/promo -> /deals/summer)',
        path: '/promo',
        expectedStatus: 308,
        expectedLocation: '/deals/summer'
      },
      {
        name: 'Dynamic parameterized redirect (/old-blog/:slug -> /blog/:slug)',
        path: '/old-blog/revolutionizing-next-redirects',
        expectedStatus: 308,
        expectedLocation: '/blog/revolutionizing-next-redirects'
      },
      {
        name: 'Query parameter preservation (/old-about?ref=newsletter)',
        path: '/old-about?ref=newsletter',
        expectedStatus: 308,
        expectedLocation: '/about?ref=newsletter'
      },
      {
        name: 'Merged native Next.js custom redirect (/from-custom-next-config)',
        path: '/from-custom-next-config',
        expectedStatus: 307,
        expectedLocation: '/about'
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      const url = `${BASE_URL}${test.path}`;
      const res = await fetch(url, { redirect: 'manual' });
      const status = res.status;
      const location = res.headers.get('location');

      const statusOk = status === test.expectedStatus;
      const locationOk = location === test.expectedLocation;

      if (statusOk && locationOk) {
        console.log(`  ✔ [PASS] ${test.name}`);
        console.log(`     HTTP ${status} -> Location: ${location}`);
        passed++;
      } else {
        console.error(`  ✖ [FAIL] ${test.name}`);
        console.error(`     Expected HTTP ${test.expectedStatus} -> Location: ${test.expectedLocation}`);
        console.error(`     Received HTTP ${status} -> Location: ${location}`);
        failed++;
      }
    }

    console.log(`\nSmoke Test Summary: ${passed} passed, ${failed} failed.`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Smoke tests failed with error:', err);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down Next.js test server...');
    if (server.pid) {
      if (process.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', String(server.pid), '/T', '/F']);
        } catch {
          // ignore
        }
      } else {
        try {
          process.kill(-server.pid, 'SIGTERM');
        } catch {
          server.kill('SIGTERM');
        }
      }
    }
    process.exit(process.exitCode ? Number(process.exitCode) : 0);
  }
}

runTests();
