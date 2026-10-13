import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { fileURLToPath } from 'node:url';

console.log('📦 Running npm pack inspection and artifact validation...');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

// 1. Run npm pack --dry-run --json
let packOutput = '';
try {
  packOutput = execSync('npm pack --dry-run --json', {
    cwd: packageDir,
    encoding: 'utf-8'
  });
} catch (err) {
  console.error('Failed to run npm pack --dry-run:', err);
  process.exit(1);
}

const packData = JSON.parse(packOutput);
const fileList = packData[0]?.files?.map(f => f.path) || [];

console.log(`\nFiles included in tarball (${fileList.length} files):`);
for (const file of fileList) {
  console.log(`  - ${file}`);
}

// 2. Validate disallowed files are NOT present
const disallowedPrefixes = [
  'src/',
  'tests/',
  '.github/',
  '.turbo/',
  'coverage/',
  'scripts/',
  'node_modules/'
];

const disallowedFiles = [
  'tsconfig.json',
  'tsup.config.ts',
  'vitest.config.ts',
  '.eslintrc',
  '.prettierrc',
  '.env'
];

let violations = 0;
for (const file of fileList) {
  for (const prefix of disallowedPrefixes) {
    if (file.startsWith(prefix)) {
      console.error(`❌ Prohibited file prefix included in package: ${file}`);
      violations++;
    }
  }
  for (const disallowed of disallowedFiles) {
    if (path.basename(file) === disallowed) {
      console.error(`❌ Prohibited file included in package: ${file}`);
      violations++;
    }
  }
}

// 3. Validate required files ARE present
const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/next.js',
  'dist/next.d.ts',
  'dist/cli.js',
  'bin/redirectkit.js'
];

for (const required of requiredFiles) {
  const present = fileList.some(f => f.replace(/\\/g, '/') === required);
  if (!present) {
    console.error(`❌ Required file missing from package: ${required}`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n❌ Pack check failed with ${violations} violation(s).`);
  process.exit(1);
}

// 4. Test actual tarball creation and clean fixture extraction
console.log('\nCreating real tarball for installation smoke test...');
// `npm publish --dry-run` exports npm_config_dry_run=true, which would make this
// nested `npm pack` skip writing the tarball. Strip it so a real tarball is created.
const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) {
  if (key.toLowerCase() === 'npm_config_dry_run') delete cleanEnv[key];
}
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-pack-'));
const packJson = JSON.parse(
  execSync(`npm pack --json --dry-run=false --pack-destination "${packDir}"`, {
    cwd: packageDir,
    encoding: 'utf-8',
    env: cleanEnv
  })
);
const tarballName = packJson[0]?.filename;
const tarballPath = tarballName ? path.join(packDir, tarballName) : '';

if (!tarballName || !fs.existsSync(tarballPath)) {
  console.error(`Failed to find generated tarball: ${tarballName}`);
  process.exit(1);
}

console.log(`Tarball generated: ${tarballPath}`);

// Create clean temporary fixture directory
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-smoke-'));
try {
  console.log(`Installing tarball in clean fixture at ${fixtureDir}...`);
  fs.writeFileSync(
    path.join(fixtureDir, 'package.json'),
    JSON.stringify({
      name: 'fixture-test',
      type: 'module',
      dependencies: {
        redirectkit: `file:${tarballPath.replace(/\\/g, '/')}`
      }
    }),
    'utf-8'
  );

  // Install in fixture
  execSync('npm install --no-package-lock --dry-run=false', {
    cwd: fixtureDir,
    stdio: 'ignore',
    env: cleanEnv
  });

  // Test import from the installed package
  const testScript = `
    import { withRedirects, validateRedirects, simulateRedirect } from 'redirectkit';
    import { withRedirects as nextRedirects } from 'redirectkit/next';

    if (typeof withRedirects !== 'function' || typeof nextRedirects !== 'function') {
      throw new Error('withRedirects export not working');
    }
    const val = validateRedirects([
      { source: '/a', destination: '/b', permanent: true }
    ]);
    if (!val.valid) throw new Error('Validation failed');
    console.log('Fixture test: exports and runtime verified successfully!');
  `;

  fs.writeFileSync(path.join(fixtureDir, 'test.js'), testScript, 'utf-8');
  execSync('node test.js', { cwd: fixtureDir, stdio: 'inherit' });
  console.log('✔ Clean fixture installation test passed!');
} finally {
  // Clean up tarball and fixture
  try {
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }
}

console.log('\n✔ All npm package pack checks passed successfully!');
