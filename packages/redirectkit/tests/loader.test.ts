import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadJsonFile, loadProjectConfig, loadRedirects } from '../src/core/loader.js';

describe('Redirect Loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-loader-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('loads valid redirect files from directory', () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'marketing.json'),
      JSON.stringify([
        { source: '/promo', destination: '/deals', permanent: true }
      ])
    );

    fs.writeFileSync(
      path.join(redirectsDir, 'legacy.json'),
      JSON.stringify([
        { source: '/old-about', destination: '/about', permanent: true }
      ])
    );

    const loaded = loadRedirects(tempDir, { redirectsDir: 'redirects' });
    expect(loaded.rules.length).toBe(2);
    expect(loaded.files.size).toBe(2);
    expect(loaded.loadDiagnostics.length).toBe(0);

    const promoRule = loaded.rules.find(r => r.source === '/promo');
    expect(promoRule).toBeDefined();
    expect(promoRule?._file).toContain('marketing.json');
    expect(promoRule?._index).toBe(0);
  });

  it('merges baseRedirects if provided', () => {
    const loaded = loadRedirects(tempDir, {
      baseRedirects: [
        { source: '/base-1', destination: '/target-1', permanent: true }
      ]
    });

    expect(loaded.rules.length).toBe(1);
    expect(loaded.rules[0].source).toBe('/base-1');
    expect(loaded.rules[0]._file).toBe('<baseRedirects>');
  });

  it('handles non-existent redirects directory gracefully', () => {
    const loaded = loadRedirects(tempDir, { redirectsDir: 'missing-dir' });
    expect(loaded.rules.length).toBe(0);
    expect(loaded.loadDiagnostics.some(d => d.code === 'INFO_DIRECTORY_NOT_FOUND')).toBe(true);
  });

  it('reports error on malformed JSON file', () => {
    const testFile = path.join(tempDir, 'broken.json');
    fs.writeFileSync(testFile, 'INVALID_JSON_CONTENT {{{', 'utf-8');

    const { rules, diagnostics } = loadJsonFile(testFile, 'broken.json');
    expect(rules.length).toBe(0);
    expect(diagnostics.some(d => d.code === 'ERR_MALFORMED_JSON')).toBe(true);
  });

  it('reports warning on empty JSON file', () => {
    const testFile = path.join(tempDir, 'empty.json');
    fs.writeFileSync(testFile, '   ', 'utf-8');

    const { rules, diagnostics } = loadJsonFile(testFile, 'empty.json');
    expect(rules.length).toBe(0);
    expect(diagnostics.some(d => d.code === 'WARN_EMPTY_FILE')).toBe(true);
  });

  it('reports error on invalid JSON structure (not array or redirects key)', () => {
    const testFile = path.join(tempDir, 'structure.json');
    fs.writeFileSync(testFile, JSON.stringify({ someKey: 'hello' }), 'utf-8');

    const { rules, diagnostics } = loadJsonFile(testFile, 'structure.json');
    expect(rules.length).toBe(0);
    expect(diagnostics.some(d => d.code === 'ERR_INVALID_FILE_STRUCTURE')).toBe(true);
  });

  it('loads project config from redirectkit.config.json', () => {
    const configPath = path.join(tempDir, 'redirectkit.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        strict: true,
        redirectsDir: 'custom-redirects',
        validation: { allowChains: false }
      })
    );

    const { config, diagnostic } = loadProjectConfig(tempDir);
    expect(diagnostic).toBeUndefined();
    expect(config.strict).toBe(true);
    expect(config.redirectsDir).toBe('custom-redirects');
  });

  it('blocks directory traversal attempts in redirectsDir', () => {
    const loaded = loadRedirects(tempDir, { redirectsDir: '../../outside' });
    expect(loaded.rules.length).toBe(0);
    expect(loaded.loadDiagnostics.some(d => d.code === 'ERR_PATH_TRAVERSAL')).toBe(true);
  });
});
