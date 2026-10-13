import type { Diagnostic, RedirectRule } from '../core/types.js';

/**
 * Parses an RFC-4180 compliant CSV string into a 2D array of string cells.
 * Correctly handles quotes, escaped quotes (""), commas, and newlines.
 */
export function parseRawCsv(content: string): { rows: string[][]; errors: string[] } {
  const rows: string[][] = [];
  const errors: string[] = [];

  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let line = 1;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
        if (char === '\n') line++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        // Skip CR, handle LF next
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        line++;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        line++;
      } else {
        currentCell += char;
      }
    }
  }

  if (inQuotes) {
    errors.push(`Unclosed quote encountered before end of file at line ${line}.`);
  }

  // Push final cell and row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return { rows, errors };
}

/**
 * Escapes a cell value for CSV output according to RFC-4180.
 */
export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses a CSV string into RedirectRules, with comprehensive row-by-row error validation.
 */
export function parseCsv(
  csvContent: string,
  fileName: string = 'import.csv'
): { rules: RedirectRule[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const rules: RedirectRule[] = [];

  const { rows, errors: rawErrors } = parseRawCsv(csvContent);

  for (const err of rawErrors) {
    diagnostics.push({
      code: 'ERR_MALFORMED_CSV',
      severity: 'error',
      message: err,
      file: fileName
    });
  }

  if (rows.length === 0) {
    diagnostics.push({
      code: 'WARN_EMPTY_CSV',
      severity: 'warning',
      message: `CSV file "${fileName}" is empty.`,
      file: fileName
    });
    return { rules, diagnostics };
  }

  // Parse header
  const header = rows[0].map(h => h.trim().toLowerCase());
  const sourceIndex = header.indexOf('source');
  const destIndex = header.indexOf('destination');
  const permIndex = header.indexOf('permanent');
  const statusIndex = header.indexOf('statuscode');
  const commentIndex = header.indexOf('comment');

  if (sourceIndex === -1 || destIndex === -1) {
    diagnostics.push({
      code: 'ERR_INVALID_CSV_HEADER',
      severity: 'error',
      message: `CSV must contain "source" and "destination" columns in the header row. Found: [${header.join(', ')}]`,
      file: fileName,
      suggestion: 'Ensure the first line is e.g. "source,destination,permanent"'
    });
    return { rules, diagnostics };
  }

  // Process rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1; // 1-indexed line number in file

    const source = row[sourceIndex]?.trim();
    const destination = row[destIndex]?.trim();

    if (!source) {
      diagnostics.push({
        code: 'ERR_INVALID_CSV_ROW',
        severity: 'error',
        message: `Row ${rowNum}: Missing "source" value.`,
        file: fileName,
        index: r - 1
      });
      continue;
    }

    if (!destination) {
      diagnostics.push({
        code: 'ERR_INVALID_CSV_ROW',
        severity: 'error',
        message: `Row ${rowNum}: Missing "destination" value for source "${source}".`,
        file: fileName,
        index: r - 1
      });
      continue;
    }

    const rule: RedirectRule = {
      source,
      destination,
      _file: fileName,
      _index: r - 1
    };

    const permVal = permIndex !== -1 ? row[permIndex]?.trim() : '';
    const statusVal = statusIndex !== -1 ? row[statusIndex]?.trim() : '';

    if (permVal && statusVal) {
      diagnostics.push({
        code: 'ERR_MUTUALLY_EXCLUSIVE_STATUS',
        severity: 'error',
        message: `Row ${rowNum}: Cannot specify both "permanent" and "statusCode" for "${source}".`,
        file: fileName,
        index: r - 1
      });
      continue;
    }

    if (statusVal) {
      const code = parseInt(statusVal, 10);
      if (isNaN(code) || code < 300 || code > 399) {
        diagnostics.push({
          code: 'ERR_INVALID_STATUS_CODE',
          severity: 'error',
          message: `Row ${rowNum}: Invalid statusCode "${statusVal}". Must be an integer between 300 and 399.`,
          file: fileName,
          index: r - 1
        });
        continue;
      }
      rule.statusCode = code;
    } else if (permVal) {
      const lower = permVal.toLowerCase();
      if (['true', '1', 'yes'].includes(lower)) {
        rule.permanent = true;
      } else if (['false', '0', 'no'].includes(lower)) {
        rule.permanent = false;
      } else {
        diagnostics.push({
          code: 'ERR_INVALID_CSV_BOOLEAN',
          severity: 'error',
          message: `Row ${rowNum}: Invalid boolean value "${permVal}" for permanent column. Expected true or false.`,
          file: fileName,
          index: r - 1
        });
        continue;
      }
    } else {
      // Default to permanent: true if neither specified in CSV
      rule.permanent = true;
    }

    if (commentIndex !== -1 && row[commentIndex]) {
      rule.comment = row[commentIndex].trim();
    }

    rules.push(rule);
  }

  return { rules, diagnostics };
}

/**
 * Exports redirect rules to an RFC-4180 CSV string.
 */
export function exportToCsv(rules: RedirectRule[]): string {
  const headers = ['source', 'destination', 'permanent', 'statusCode', 'comment'];
  const lines: string[] = [headers.join(',')];

  for (const rule of rules) {
    const row = [
      escapeCsvCell(rule.source),
      escapeCsvCell(rule.destination),
      rule.permanent !== undefined ? escapeCsvCell(rule.permanent) : '',
      rule.statusCode !== undefined ? escapeCsvCell(rule.statusCode) : '',
      escapeCsvCell(rule.comment || '')
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n') + '\n';
}
