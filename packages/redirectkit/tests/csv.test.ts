import { describe, expect, it } from 'vitest';
import { exportToCsv, parseCsv } from '../src/import-export/csv.js';
import type { RedirectRule } from '../src/core/types.js';

describe('CSV Import & Export Engine', () => {
  it('parses standard CSV with source, destination, and permanent boolean', () => {
    const csv = `source,destination,permanent,comment
/old-page,/new-page,true,"Primary redirect"
/old-blog/:slug,/blog/:slug,false,"Temporary migration"`;

    const { rules, diagnostics } = parseCsv(csv);
    expect(diagnostics.length).toBe(0);
    expect(rules.length).toBe(2);

    expect(rules[0].source).toBe('/old-page');
    expect(rules[0].destination).toBe('/new-page');
    expect(rules[0].permanent).toBe(true);
    expect(rules[0].comment).toBe('Primary redirect');

    expect(rules[1].source).toBe('/old-blog/:slug');
    expect(rules[1].destination).toBe('/blog/:slug');
    expect(rules[1].permanent).toBe(false);
  });

  it('correctly parses quoted cells with commas and escaped quotes', () => {
    const raw = `source,destination,permanent,comment
/complex,"/dest,with,commas",true,"Quote with ""escaped"" quotes and , commas"`;

    const { rules, diagnostics } = parseCsv(raw);
    expect(diagnostics.length).toBe(0);
    expect(rules.length).toBe(1);
    expect(rules[0].destination).toBe('/dest,with,commas');
    expect(rules[0].comment).toBe('Quote with "escaped" quotes and , commas');
  });

  it('reports error on missing source or destination column in header', () => {
    const invalidHeader = `from_url,to_url,permanent\n/a,/b,true`;
    const { rules, diagnostics } = parseCsv(invalidHeader);

    expect(rules.length).toBe(0);
    expect(diagnostics.some(d => d.code === 'ERR_INVALID_CSV_HEADER')).toBe(true);
  });

  it('reports row numbers on validation errors in CSV rows', () => {
    const csv = `source,destination,permanent,statusCode
/valid-1,/dest-1,true,
,/dest-2,true,
/valid-3,,true,
/conflict,/dest-3,true,301
/bad-status,/dest-4,,999
/bad-bool,/dest-5,maybe,`;

    const { rules, diagnostics } = parseCsv(csv);
    expect(rules.length).toBe(1); // only the first row is valid

    const rowErrors = diagnostics.filter(d => d.severity === 'error');
    expect(rowErrors.length).toBe(5);

    // Row 3 (source missing)
    expect(rowErrors.some(e => e.message.includes('Row 3'))).toBe(true);
    // Row 4 (destination missing)
    expect(rowErrors.some(e => e.message.includes('Row 4'))).toBe(true);
    // Row 5 (both permanent and statusCode)
    expect(rowErrors.some(e => e.message.includes('Row 5'))).toBe(true);
    // Row 6 (invalid statusCode)
    expect(rowErrors.some(e => e.message.includes('Row 6'))).toBe(true);
    // Row 7 (invalid boolean)
    expect(rowErrors.some(e => e.message.includes('Row 7'))).toBe(true);
  });

  it('performs lossless round-trip serialization and deserialization', () => {
    const originalRules: RedirectRule[] = [
      {
        source: '/alpha',
        destination: '/beta',
        permanent: true,
        comment: 'Standard 308 redirect'
      },
      {
        source: '/gamma/:id',
        destination: '/delta/:id',
        permanent: false,
        comment: 'Temporary 307'
      },
      {
        source: '/epsilon',
        destination: '/zeta',
        statusCode: 301,
        comment: 'Explicit 301'
      }
    ];

    const exported = exportToCsv(originalRules);
    const { rules: importedRules, diagnostics } = parseCsv(exported);

    expect(diagnostics.length).toBe(0);
    expect(importedRules.length).toBe(originalRules.length);

    for (let i = 0; i < originalRules.length; i++) {
      expect(importedRules[i].source).toBe(originalRules[i].source);
      expect(importedRules[i].destination).toBe(originalRules[i].destination);
      expect(importedRules[i].permanent).toBe(originalRules[i].permanent);
      expect(importedRules[i].statusCode).toBe(originalRules[i].statusCode);
      expect(importedRules[i].comment).toBe(originalRules[i].comment);
    }
  });
});
