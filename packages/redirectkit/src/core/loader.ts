import fs from 'node:fs';
import path from 'node:path';
import type {
  Diagnostic,
  LoadedRedirects,
  RedirectKitConfig,
  RedirectRule
} from './types.js';

/**
 * Checks if a relative or absolute path is safely contained within a base directory
 * to prevent directory traversal vulnerabilities.
 */
export function isPathSafe(targetPath: string, baseDir: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, targetPath);
  return (
    resolvedTarget === resolvedBase ||
    resolvedTarget.startsWith(resolvedBase + path.sep)
  );
}

/**
 * Loads and parses a JSON redirect file safely.
 */
export function loadJsonFile(
  filePath: string,
  displayPath?: string
): { rules: RedirectRule[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const rules: RedirectRule[] = [];
  const fileLabel = displayPath || filePath;

  if (!fs.existsSync(filePath)) {
    diagnostics.push({
      code: 'ERR_FILE_NOT_FOUND',
      severity: 'error',
      message: `Redirect configuration file not found: ${fileLabel}`,
      file: fileLabel
    });
    return { rules, diagnostics };
  }

  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    diagnostics.push({
      code: 'ERR_FILE_READ_FAILED',
      severity: 'error',
      message: `Failed to read file ${fileLabel}: ${err instanceof Error ? err.message : String(err)}`,
      file: fileLabel
    });
    return { rules, diagnostics };
  }

  // Handle empty file
  if (!content.trim()) {
    diagnostics.push({
      code: 'WARN_EMPTY_FILE',
      severity: 'warning',
      message: `Redirect configuration file is empty: ${fileLabel}`,
      file: fileLabel,
      suggestion: 'Add an array of redirect rules, e.g. [{"source": "/old", "destination": "/new", "permanent": true}]'
    });
    return { rules, diagnostics };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    diagnostics.push({
      code: 'ERR_MALFORMED_JSON',
      severity: 'error',
      message: `Malformed JSON in ${fileLabel}: ${err instanceof Error ? err.message : String(err)}`,
      file: fileLabel,
      suggestion: 'Ensure the file contains valid JSON syntax.'
    });
    return { rules, diagnostics };
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    'redirects' in parsed &&
    Array.isArray((parsed as { redirects: unknown[] }).redirects)
  ) {
    rawList = (parsed as { redirects: unknown[] }).redirects;
  } else {
    diagnostics.push({
      code: 'ERR_INVALID_FILE_STRUCTURE',
      severity: 'error',
      message: `File ${fileLabel} must export a JSON array of redirect rules or an object with a "redirects" array.`,
      file: fileLabel,
      suggestion: 'Wrap the redirect rules in an array: [ { "source": "/a", "destination": "/b", "permanent": true } ]'
    });
    return { rules, diagnostics };
  }

  for (let index = 0; index < rawList.length; index++) {
    const item = rawList[index];
    if (typeof item === 'object' && item !== null) {
      rules.push({
        ...(item as RedirectRule),
        _file: fileLabel,
        _index: index
      });
    } else {
      diagnostics.push({
        code: 'ERR_INVALID_RULE_TYPE',
        severity: 'error',
        message: `Item at index ${index} in ${fileLabel} is not a valid redirect object.`,
        file: fileLabel,
        index
      });
    }
  }

  return { rules, diagnostics };
}

/**
 * Discovers and loads all redirect files from the redirects directory according to configuration.
 */
export function loadRedirects(
  projectRoot: string = process.cwd(),
  config: RedirectKitConfig = {}
): LoadedRedirects {
  const rules: RedirectRule[] = [];
  const filesMap = new Map<string, RedirectRule[]>();
  const loadDiagnostics: Diagnostic[] = [];

  const rawDir = config.redirectsDir || 'redirects';

  // Guard against path traversal when resolving redirectsDir
  const redirectsDir = path.resolve(projectRoot, rawDir);
  if (!isPathSafe(redirectsDir, projectRoot)) {
    loadDiagnostics.push({
      code: 'ERR_PATH_TRAVERSAL',
      severity: 'error',
      message: `Configured redirects directory "${rawDir}" attempts to traverse outside project root.`,
      suggestion: 'Specify a path located within the project root directory.'
    });
    return { rules, files: filesMap, loadDiagnostics };
  }

  // Base redirects if provided inline
  if (config.baseRedirects && Array.isArray(config.baseRedirects)) {
    for (let i = 0; i < config.baseRedirects.length; i++) {
      const baseRule = {
        ...config.baseRedirects[i],
        _file: '<baseRedirects>',
        _index: i
      };
      rules.push(baseRule);
    }
    filesMap.set('<baseRedirects>', config.baseRedirects);
  }

  if (!fs.existsSync(redirectsDir)) {
    // If redirectsDir is default and does not exist, info/warn
    loadDiagnostics.push({
      code: 'INFO_DIRECTORY_NOT_FOUND',
      severity: 'info',
      message: `Redirects directory not found at: ${path.relative(projectRoot, redirectsDir) || '.'}`
    });
    return { rules, files: filesMap, loadDiagnostics };
  }

  // Find all JSON files in the directory
  const entries: string[] = [];
  function scan(dir: string) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.isFile() && item.name.endsWith('.json')) {
        entries.push(fullPath);
      }
    }
  }

  try {
    scan(redirectsDir);
  } catch (err) {
    loadDiagnostics.push({
      code: 'ERR_SCAN_DIRECTORY_FAILED',
      severity: 'error',
      message: `Failed to scan directory ${redirectsDir}: ${err instanceof Error ? err.message : String(err)}`
    });
    return { rules, files: filesMap, loadDiagnostics };
  }

  // Filter with include/exclude
  const includePatterns = config.include || ['*.json', '**/*.json'];
  const excludePatterns = config.exclude || ['node_modules/**'];

  // Sort entries for deterministic output
  entries.sort();

  for (const entry of entries) {
    const relToRoot = path.relative(projectRoot, entry).replace(/\\/g, '/');
    const relToDir = path.relative(redirectsDir, entry).replace(/\\/g, '/');

    // Check include
    const isIncluded = includePatterns.some(pat => {
      const cleanPat = pat.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
      if (cleanPat === '*' || cleanPat === '*.json') return relToDir.endsWith('.json');
      return relToDir.includes(cleanPat) || relToRoot.includes(cleanPat);
    });

    if (!isIncluded) {
      continue;
    }

    // Check exclude
    const isExcluded = excludePatterns.some(pat => {
      const cleanPat = pat.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
      return relToDir.includes(cleanPat) || relToRoot.includes(cleanPat);
    });

    if (isExcluded) {
      continue;
    }

    const { rules: fileRules, diagnostics: fileDiags } = loadJsonFile(entry, relToRoot);
    loadDiagnostics.push(...fileDiags);

    if (fileRules.length > 0) {
      filesMap.set(relToRoot, fileRules);
      rules.push(...fileRules);
    }
  }

  return {
    rules,
    files: filesMap,
    loadDiagnostics
  };
}

/**
 * Loads project configuration from redirectkit.config.json if present.
 */
export function loadProjectConfig(
  projectRoot: string = process.cwd(),
  customConfigPath?: string
): { config: RedirectKitConfig; diagnostic?: Diagnostic } {
  const targetPath = customConfigPath
    ? path.resolve(projectRoot, customConfigPath)
    : path.join(projectRoot, 'redirectkit.config.json');

  if (customConfigPath && !isPathSafe(targetPath, projectRoot)) {
    return {
      config: {},
      diagnostic: {
        code: 'ERR_PATH_TRAVERSAL',
        severity: 'error',
        message: `Custom config path "${customConfigPath}" traverses outside project root.`,
        file: customConfigPath
      }
    };
  }

  if (!fs.existsSync(targetPath)) {
    return { config: {} };
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(content);
    return { config: parsed as RedirectKitConfig };
  } catch (err) {
    return {
      config: {},
      diagnostic: {
        code: 'ERR_CONFIG_PARSE_FAILED',
        severity: 'error',
        message: `Failed to parse config file at ${path.relative(projectRoot, targetPath)}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        file: path.relative(projectRoot, targetPath),
        suggestion: 'Ensure redirectkit.config.json is valid JSON.'
      }
    };
  }
}
