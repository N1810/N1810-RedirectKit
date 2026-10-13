import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  RedirectKitValidationError,
  withRedirects
} from '../src/adapters/nextjs.js';

describe('Next.js Adapter (withRedirects)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirectkit-next-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('wraps a standard nextConfig object and preserves existing settings', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'marketing.json'),
      JSON.stringify([
        { source: '/promo', destination: '/deals', permanent: true }
      ])
    );

    const baseConfig = {
      reactStrictMode: true,
      env: { CUSTOM_VAR: 'hello' }
    };

    const enhanced = withRedirects(baseConfig, { projectRoot: tempDir }) as any;

    expect(enhanced.reactStrictMode).toBe(true);
    expect(enhanced.env.CUSTOM_VAR).toBe('hello');
    expect(typeof enhanced.redirects).toBe('function');

    const redirects = await enhanced.redirects();
    expect(redirects.length).toBe(1);
    expect(redirects[0]).toEqual({
      source: '/promo',
      destination: '/deals',
      permanent: true
    });
  });

  it('merges with existing user redirects() function cleanly', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'routes.json'),
      JSON.stringify([
        { source: '/from-kit', destination: '/to-kit', permanent: true }
      ])
    );

    const baseConfig = {
      async redirects() {
        return [
          {
            source: '/from-user',
            destination: '/to-user',
            permanent: false
          }
        ];
      }
    };

    const enhanced = withRedirects(baseConfig, { projectRoot: tempDir }) as any;
    const redirects = await enhanced.redirects();

    expect(redirects.length).toBe(2);
    expect(redirects[0].source).toBe('/from-user');
    expect(redirects[1].source).toBe('/from-kit');
  });

  it('supports functional next.config: (phase, context) => config', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'rules.json'),
      JSON.stringify([
        { source: '/rule', destination: '/dest', permanent: true }
      ])
    );

    const configFn = async (phase: string) => ({
      phase,
      output: 'standalone'
    });

    const wrappedFn = withRedirects(configFn as any, { projectRoot: tempDir }) as any;
    expect(typeof wrappedFn).toBe('function');

    const resolved = await wrappedFn('phase-production-build', { defaultConfig: {} });
    expect(resolved.phase).toBe('phase-production-build');
    expect(resolved.output).toBe('standalone');

    const redirects = await resolved.redirects();
    expect(redirects.length).toBe(1);
    expect(redirects[0].source).toBe('/rule');
  });

  it('supports Promise nextConfig', async () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    fs.writeFileSync(
      path.join(redirectsDir, 'rules.json'),
      JSON.stringify([
        { source: '/rule', destination: '/dest', permanent: true }
      ])
    );

    const promiseConfig = Promise.resolve({
      compress: true
    });

    const enhancedPromise = withRedirects(promiseConfig, { projectRoot: tempDir }) as Promise<any>;
    const resolved = await enhancedPromise;

    expect(resolved.compress).toBe(true);
    const redirects = await resolved.redirects();
    expect(redirects.length).toBe(1);
  });

  it('throws RedirectKitValidationError on invalid redirect rules', () => {
    const redirectsDir = path.join(tempDir, 'redirects');
    fs.mkdirSync(redirectsDir, { recursive: true });

    // Loop
    fs.writeFileSync(
      path.join(redirectsDir, 'loop.json'),
      JSON.stringify([
        { source: '/loop', destination: '/loop', permanent: true }
      ])
    );

    expect(() => {
      withRedirects({}, { projectRoot: tempDir });
    }).toThrow(RedirectKitValidationError);
  });

  it('does not mutate the original config object', () => {
    const baseConfig = Object.freeze({
      trailingSlash: true
    });

    // Should not throw frozen object mutation error
    expect(() => {
      withRedirects(baseConfig, { projectRoot: tempDir });
    }).not.toThrow();
  });
});
