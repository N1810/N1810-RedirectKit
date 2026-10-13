import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPathSafe, loadProjectConfig, loadRedirects } from '../src/core/loader.js';
import { validateRedirects } from '../src/core/validator.js';
import type { RedirectRule } from '../src/core/types.js';

describe('Security & Regression Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-sec-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('detects and blocks path traversal in directory loader', () => {
    expect(isPathSafe('../../etc/passwd', tempDir)).toBe(false);
    expect(isPathSafe('../sibling-dir', tempDir)).toBe(false);
    expect(isPathSafe('subfolder/redirects', tempDir)).toBe(true);

    const loaded = loadRedirects(tempDir, { redirectsDir: '../../../system' });
    expect(loaded.loadDiagnostics.some(d => d.code === 'ERR_PATH_TRAVERSAL')).toBe(true);
    expect(loaded.rules.length).toBe(0);
  });

  it('blocks path traversal in custom config loading', () => {
    const { diagnostic } = loadProjectConfig(tempDir, '../../secret.json');
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.code).toBe('ERR_PATH_TRAVERSAL');
  });

  it('rejects unsafe destination protocols like javascript: or data:', () => {
    const rules: RedirectRule[] = [
      { source: '/xss', destination: 'javascript:alert(1)', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_DESTINATION_PATTERN')).toBe(true);
  });

  it('resilient against prototype pollution keys in JSON rule', () => {
    const rules: any[] = [
      JSON.parse('{"source": "/safe", "destination": "/dest", "permanent": true, "__proto__": {"polluted": true}}')
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(true);
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('handles extremely large inputs without crashing', () => {
    const longPath = '/' + 'a'.repeat(2000);
    const rules: RedirectRule[] = [
      { source: longPath, destination: '/target', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(true);
  });
});
