import { describe, expect, it } from 'vitest';
import { validateRedirects } from '../src/core/validator.js';
import type { RedirectRule } from '../src/core/types.js';

describe('Redirect Validator', () => {
  it('passes for valid redirect rules', () => {
    const rules: RedirectRule[] = [
      { source: '/old', destination: '/new', permanent: true },
      { source: '/temp', destination: '/somewhere', permanent: false },
      { source: '/legacy', destination: '/modern', statusCode: 301 },
      { source: '/blog/:slug', destination: '/posts/:slug', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.stats.totalRules).toBe(4);
  });

  it('fails when source or destination is missing or empty', () => {
    const rules: RedirectRule[] = [
      { source: '', destination: '/valid', permanent: true },
      { source: '/valid-source', destination: '', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_MISSING_SOURCE')).toBe(true);
    expect(result.errors.some(e => e.code === 'ERR_MISSING_DESTINATION')).toBe(true);
  });

  it('fails when source does not start with a leading slash', () => {
    const rules: RedirectRule[] = [
      { source: 'invalid-path', destination: '/valid', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_SOURCE_PATTERN')).toBe(true);
  });

  it('fails when regex pattern in source has mismatched parentheses', () => {
    const rules: RedirectRule[] = [
      { source: '/posts/(\\d+', destination: '/posts', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_SOURCE_REGEX')).toBe(true);
  });

  it('fails when destination is relative without leading slash', () => {
    const rules: RedirectRule[] = [
      { source: '/old', destination: 'relative/new', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_DESTINATION_PATTERN')).toBe(true);
  });

  it('allows external destination when permitted', () => {
    const rules: RedirectRule[] = [
      { source: '/external', destination: 'https://example.com/target', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(true);
  });

  it('rejects external destination when disallowed by validation options', () => {
    const rules: RedirectRule[] = [
      { source: '/external', destination: 'https://example.com/target', permanent: true }
    ];

    const result = validateRedirects(rules, {
      config: { validation: { allowExternalDestinations: false } }
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_EXTERNAL_DESTINATION_DISALLOWED')).toBe(true);
  });

  it('detects mutually exclusive permanent and statusCode', () => {
    const rules: RedirectRule[] = [
      { source: '/both', destination: '/dest', permanent: true, statusCode: 301 }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_MUTUALLY_EXCLUSIVE_STATUS')).toBe(true);
  });

  it('detects missing both permanent and statusCode', () => {
    const rules: RedirectRule[] = [
      { source: '/neither', destination: '/dest' }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_MISSING_STATUS_OR_PERMANENT')).toBe(true);
  });

  it('detects invalid statusCode out of 300..399 range', () => {
    const rules: RedirectRule[] = [
      { source: '/bad-status', destination: '/dest', statusCode: 200 }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_STATUS_CODE')).toBe(true);
  });

  it('detects duplicate redirect sources with identical conditions', () => {
    const rules: RedirectRule[] = [
      { source: '/duplicate', destination: '/target-1', permanent: true, _file: 'a.json' },
      { source: '/duplicate', destination: '/target-2', permanent: true, _file: 'a.json' }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_DUPLICATE_SOURCE')).toBe(true);
  });

  it('detects duplicate redirect sources across separate files', () => {
    const rules: RedirectRule[] = [
      { source: '/duplicate-cross', destination: '/dest-1', permanent: true, _file: 'marketing.json' },
      { source: '/duplicate-cross', destination: '/dest-2', permanent: true, _file: 'legacy.json' }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_CROSS_FILE_DUPLICATE')).toBe(true);
  });

  it('detects self-redirects', () => {
    const rules: RedirectRule[] = [
      { source: '/loop-self', destination: '/loop-self', permanent: true }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_SELF_REDIRECT')).toBe(true);
  });

  it('warns about unreachable rules when unconditional precedes conditional or duplicate', () => {
    const rules: RedirectRule[] = [
      { source: '/blog', destination: '/posts', permanent: true },
      {
        source: '/blog',
        destination: '/mobile-posts',
        permanent: true,
        has: [{ type: 'header', key: 'user-agent', value: 'mobile' }]
      }
    ];

    const result = validateRedirects(rules);
    expect(result.warnings.some(w => w.code === 'WARN_UNREACHABLE_RULE')).toBe(true);
  });

  it('validates condition formats for has/missing', () => {
    const rules: RedirectRule[] = [
      {
        source: '/cond-test',
        destination: '/ok',
        permanent: true,
        has: [
          // Missing key
          { type: 'header' } as any,
          // Missing value for host
          { type: 'host' } as any
        ]
      }
    ];

    const result = validateRedirects(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_CONDITION_KEY')).toBe(true);
    expect(result.errors.some(e => e.code === 'ERR_INVALID_CONDITION_HOST')).toBe(true);
  });

  it('fails in strict mode when warnings are present', () => {
    const rules: RedirectRule[] = [
      { source: '/a', destination: '/b', permanent: true },
      { source: '/b', destination: '/c', permanent: true }
    ];

    // Non-strict: valid=true with warning about chain
    const nonStrict = validateRedirects(rules, { config: { strict: false } });
    expect(nonStrict.valid).toBe(true);
    expect(nonStrict.warnings.length).toBeGreaterThan(0);

    // Strict: valid=false because of warning
    const strict = validateRedirects(rules, { config: { strict: true } });
    expect(strict.valid).toBe(false);
  });
});
