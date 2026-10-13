import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli/index.ts';

describe('RedirectKit CLI', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('prints help and exits with 0 on --help', async () => {
    const code = await runCli(['node', 'redirectkit', '--help']);
    expect(code).toBe(0);
  });

  it('prints version and exits with 0 on --version', async () => {
    const code = await runCli(['node', 'redirectkit', '--version']);
    expect(code).toBe(0);
  });

  it('validates clean redirect configuration with exit code 0', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'clean.json'),
      JSON.stringify([
        { source: '/old', destination: '/new', permanent: true }
      ])
    );

    const code = await runCli(['node', 'redirectkit', 'validate']);
    expect(code).toBe(0);
  });

  it('fails validate with exit code 1 when errors exist', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    // Self redirect error
    fs.writeFileSync(
      path.join(redirectsDir, 'invalid.json'),
      JSON.stringify([
        { source: '/loop', destination: '/loop', permanent: true }
      ])
    );

    const code = await runCli(['node', 'redirectkit', 'validate']);
    expect(code).toBe(1);
  });

  it('fails validate --strict when warnings (like chains) exist', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'chain.json'),
      JSON.stringify([
        { source: '/a', destination: '/b', permanent: true },
        { source: '/b', destination: '/c', permanent: true }
      ])
    );

    // Non-strict passes with warning
    const nonStrictCode = await runCli(['node', 'redirectkit', 'validate']);
    expect(nonStrictCode).toBe(0);

    // Strict fails
    const strictCode = await runCli(['node', 'redirectkit', 'validate', '--strict']);
    expect(strictCode).toBe(1);
  });

  it('lists redirects in JSON format with --format json', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'rules.json'),
      JSON.stringify([
        { source: '/first', destination: '/second', permanent: true }
      ])
    );

    const code = await runCli(['node', 'redirectkit', 'list', '--format', 'json']);
    expect(code).toBe(0);
  });

  it('checks a path simulation with check command', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'rules.json'),
      JSON.stringify([
        { source: '/alpha', destination: '/beta', permanent: true }
      ])
    );

    const code = await runCli(['node', 'redirectkit', 'check', '/alpha']);
    expect(code).toBe(0);
  });

  it('imports CSV and writes JSON safely', async () => {
    const csvPath = path.join(tempDir, 'imports.csv');
    fs.writeFileSync(
      csvPath,
      'source,destination,permanent\n/from-csv,/to-csv,true\n',
      'utf-8'
    );

    const outJson = path.join(tempDir, 'redirects', 'imported.json');
    const code = await runCli([
      'node',
      'redirectkit',
      'import',
      'imports.csv',
      '--out',
      outJson
    ]);

    expect(code).toBe(0);
    expect(fs.existsSync(outJson)).toBe(true);

    const loadedJson = JSON.parse(fs.readFileSync(outJson, 'utf-8'));
    expect(loadedJson.length).toBe(1);
    expect(loadedJson[0].source).toBe('/from-csv');
  });

  it('prevents accidental overwrite on import without --overwrite flag', async () => {
    const csvPath = path.join(tempDir, 'data.csv');
    fs.writeFileSync(csvPath, 'source,destination,permanent\n/a,/b,true\n');

    const outJson = path.join(tempDir, 'existing.json');
    fs.writeFileSync(outJson, '[]');

    // Should fail without --overwrite
    const failCode = await runCli([
      'node',
      'redirectkit',
      'import',
      'data.csv',
      '--out',
      outJson
    ]);
    expect(failCode).toBe(1);

    // Should succeed with --overwrite
    const okCode = await runCli([
      'node',
      'redirectkit',
      'import',
      'data.csv',
      '--out',
      outJson,
      '--overwrite'
    ]);
    expect(okCode).toBe(0);
  });

  it('exports redirects to CSV', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'rules.json'),
      JSON.stringify([
        { source: '/export-1', destination: '/target-1', permanent: true }
      ])
    );

    const outCsv = path.join(tempDir, 'exported.csv');
    const code = await runCli(['node', 'redirectkit', 'export', outCsv]);
    expect(code).toBe(0);
    expect(fs.existsSync(outCsv)).toBe(true);

    const content = fs.readFileSync(outCsv, 'utf-8');
    expect(content).toContain('/export-1,/target-1,true');
  });
});
