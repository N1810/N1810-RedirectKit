import { RedirectGraph, normalizePath } from './graph.js';
import type {
  Diagnostic,
  RedirectKitConfig,
  RedirectRule,
  RouteHas,
  ValidationOptions,
  ValidationResult,
  ValidationStats
} from './types.js';

/**
 * Creates a unique deterministic hash/signature for condition sets (has & missing).
 */
function getConditionSignature(has?: RouteHas[], missing?: RouteHas[]): string {
  const formatHas = (items?: RouteHas[]) => {
    if (!items || items.length === 0) return '';
    return items
      .map(h => {
        if (h.type === 'host') return `host:${h.value}`;
        return `${h.type}:${h.key}=${h.value ?? '*'}`;
      })
      .sort()
      .join('&');
  };

  const hasStr = formatHas(has);
  const missStr = formatHas(missing);
  return `has:[${hasStr}]|miss:[${missStr}]`;
}

/**
 * Validates a single Next.js redirect condition (has or missing).
 */
function validateCondition(
  item: unknown,
  fieldName: 'has' | 'missing',
  rule: RedirectRule
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (typeof item !== 'object' || item === null) {
    diagnostics.push({
      code: 'ERR_INVALID_CONDITION',
      severity: 'error',
      message: `Invalid condition in "${fieldName}": each entry must be an object.`,
      file: rule._file,
      index: rule._index,
      rule,
      suggestion: 'Provide an object like { "type": "header", "key": "x-custom" }.'
    });
    return diagnostics;
  }

  const cond = item as Record<string, unknown>;
  const validTypes = ['header', 'cookie', 'query', 'host'];

  if (!cond.type || typeof cond.type !== 'string' || !validTypes.includes(cond.type)) {
    diagnostics.push({
      code: 'ERR_INVALID_CONDITION_TYPE',
      severity: 'error',
      message: `Condition in "${fieldName}" has invalid type "${String(cond.type)}". Supported types: ${validTypes.join(', ')}.`,
      file: rule._file,
      index: rule._index,
      rule
    });
    return diagnostics;
  }

  if (cond.type === 'host') {
    if (!cond.value || typeof cond.value !== 'string') {
      diagnostics.push({
        code: 'ERR_INVALID_CONDITION_HOST',
        severity: 'error',
        message: `Condition of type "host" in "${fieldName}" requires a non-empty string "value".`,
        file: rule._file,
        index: rule._index,
        rule
      });
    }
  } else {
    // header, cookie, query require "key"
    if (!cond.key || typeof cond.key !== 'string') {
      diagnostics.push({
        code: 'ERR_INVALID_CONDITION_KEY',
        severity: 'error',
        message: `Condition of type "${cond.type}" in "${fieldName}" requires a non-empty string "key".`,
        file: rule._file,
        index: rule._index,
        rule
      });
    }
  }

  return diagnostics;
}

/**
 * Validates source path syntax.
 */
function validateSourcePattern(source: string, rule: RedirectRule): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!source.startsWith('/')) {
    diagnostics.push({
      code: 'ERR_INVALID_SOURCE_PATTERN',
      severity: 'error',
      message: `Source path "${source}" must start with a leading slash ("/") according to Next.js requirements.`,
      file: rule._file,
      index: rule._index,
      rule,
      suggestion: `Change "${source}" to "/${source.replace(/^(\.\/|\/)+/, '')}".`
    });
  }

  // Check for unmatched parentheses in regex patterns
  let openParen = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (source[i] === '(') openParen++;
    if (source[i] === ')') openParen--;
    if (openParen < 0) break;
  }

  if (openParen !== 0) {
    diagnostics.push({
      code: 'ERR_INVALID_SOURCE_REGEX',
      severity: 'error',
      message: `Source pattern "${source}" contains unclosed or mismatched parentheses in custom regex pattern.`,
      file: rule._file,
      index: rule._index,
      rule,
      suggestion: 'Ensure all parentheses in regex groups are properly matched.'
    });
  }

  return diagnostics;
}

/**
 * Validates destination path or URL syntax.
 */
function validateDestinationPattern(
  destination: string,
  rule: RedirectRule,
  allowExternal: boolean = true
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const isExternal = /^(?:https?:)?\/\//i.test(destination);

  if (isExternal) {
    if (!allowExternal) {
      diagnostics.push({
        code: 'ERR_EXTERNAL_DESTINATION_DISALLOWED',
        severity: 'error',
        message: `External destination "${destination}" is not permitted by project validation policy.`,
        file: rule._file,
        index: rule._index,
        rule
      });
      return diagnostics;
    }

    // Check valid URL format
    if (!destination.startsWith('//')) {
      try {
        new URL(destination);
      } catch {
        diagnostics.push({
          code: 'ERR_INVALID_DESTINATION_URL',
          severity: 'error',
          message: `Destination URL "${destination}" is malformed.`,
          file: rule._file,
          index: rule._index,
          rule,
          suggestion: 'Provide a valid RFC-compliant URL (e.g. "https://example.com/page").'
        });
      }
    }
  } else {
    // Internal path must start with '/'
    if (!destination.startsWith('/')) {
      diagnostics.push({
        code: 'ERR_INVALID_DESTINATION_PATTERN',
        severity: 'error',
        message: `Destination "${destination}" must start with a leading slash ("/") or be an absolute URL (https://...).`,
        file: rule._file,
        index: rule._index,
        rule,
        suggestion: `Change "${destination}" to "/${destination}".`
      });
    }
  }

  return diagnostics;
}

/**
 * Main validation function for RedirectKit rules.
 */
export function validateRedirects(
  rules: RedirectRule[],
  options: {
    config?: RedirectKitConfig;
    initialDiagnostics?: Diagnostic[];
  } = {}
): ValidationResult {
  const diagnostics: Diagnostic[] = [...(options.initialDiagnostics || [])];
  const config = options.config || {};
  const validationOpts: ValidationOptions = {
    allowChains: false,
    allowCycles: false,
    allowDuplicates: false,
    maxChainLength: 1,
    allowExternalDestinations: true,
    ...config.validation
  };

  const isStrict = config.strict ?? false;

  // Track sources by signature to find duplicates and cross-file collisions
  const sourceMap = new Map<string, { rule: RedirectRule; index: number; file?: string }>();
  // Track all rules with identical source to check reachable conditions
  const rulesBySource = new Map<string, Array<{ rule: RedirectRule; index: number; file?: string }>>();

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // 1. Missing source
    if (!rule.source || typeof rule.source !== 'string' || rule.source.trim() === '') {
      diagnostics.push({
        code: 'ERR_MISSING_SOURCE',
        severity: 'error',
        message: `Redirect rule at index ${i} is missing a required "source" string.`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: 'Specify a valid source path, e.g. "/old-path".'
      });
      continue;
    }

    // 2. Missing destination
    if (!rule.destination || typeof rule.destination !== 'string' || rule.destination.trim() === '') {
      diagnostics.push({
        code: 'ERR_MISSING_DESTINATION',
        severity: 'error',
        message: `Redirect rule for source "${rule.source}" is missing a required "destination" string.`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: 'Specify a valid destination path or URL, e.g. "/new-path".'
      });
      continue;
    }

    // 3. Source syntax
    diagnostics.push(...validateSourcePattern(rule.source.trim(), rule));

    // 4. Destination syntax
    diagnostics.push(
      ...validateDestinationPattern(
        rule.destination.trim(),
        rule,
        validationOpts.allowExternalDestinations
      )
    );

    // 5. Next.js mutually exclusive properties: permanent vs statusCode
    const hasPermanent = typeof rule.permanent === 'boolean';
    const hasStatusCode = typeof rule.statusCode === 'number';

    if (hasPermanent && hasStatusCode) {
      diagnostics.push({
        code: 'ERR_MUTUALLY_EXCLUSIVE_STATUS',
        severity: 'error',
        message: `Rule for source "${rule.source}" specifies both "permanent: ${rule.permanent}" and "statusCode: ${rule.statusCode}". Next.js does not allow both.`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: 'Remove either "permanent" or "statusCode", but not both.'
      });
    } else if (!hasPermanent && !hasStatusCode) {
      diagnostics.push({
        code: 'ERR_MISSING_STATUS_OR_PERMANENT',
        severity: 'error',
        message: `Rule for source "${rule.source}" must specify either "permanent: true|false" or a valid redirect "statusCode".`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: 'Set "permanent: true" for 308 permanent redirect or "permanent: false" for 307 temporary redirect.'
      });
    }

    // Validate statusCode value if present
    if (hasStatusCode) {
      const code = rule.statusCode!;
      if (!Number.isInteger(code) || code < 300 || code > 399) {
        diagnostics.push({
          code: 'ERR_INVALID_STATUS_CODE',
          severity: 'error',
          message: `Invalid redirect statusCode ${code} for source "${rule.source}". HTTP redirect status codes must be between 300 and 399.`,
          file: rule._file,
          index: rule._index ?? i,
          rule,
          suggestion: 'Use a standard redirect status code like 301, 302, 307, or 308.'
        });
      }
    }

    // Validate conditions: has & missing
    if (rule.has) {
      if (!Array.isArray(rule.has)) {
        diagnostics.push({
          code: 'ERR_INVALID_CONDITION',
          severity: 'error',
          message: `The "has" property for source "${rule.source}" must be an array of condition objects.`,
          file: rule._file,
          index: rule._index ?? i,
          rule
        });
      } else {
        for (const item of rule.has) {
          diagnostics.push(...validateCondition(item, 'has', rule));
        }
      }
    }

    if (rule.missing) {
      if (!Array.isArray(rule.missing)) {
        diagnostics.push({
          code: 'ERR_INVALID_CONDITION',
          severity: 'error',
          message: `The "missing" property for source "${rule.source}" must be an array of condition objects.`,
          file: rule._file,
          index: rule._index ?? i,
          rule
        });
      } else {
        for (const item of rule.missing) {
          diagnostics.push(...validateCondition(item, 'missing', rule));
        }
      }
    }

    // 6. Duplicate detection & unreachable rules
    const condSig = getConditionSignature(rule.has, rule.missing);
    const fullKey = `${normalizePath(rule.source)}@@${condSig}`;

    if (sourceMap.has(fullKey)) {
      const firstEntry = sourceMap.get(fullKey)!;
      const isCrossFile = firstEntry.file && rule._file && firstEntry.file !== rule._file;

      diagnostics.push({
        code: isCrossFile ? 'ERR_CROSS_FILE_DUPLICATE' : 'ERR_DUPLICATE_SOURCE',
        severity: validationOpts.allowDuplicates ? 'warning' : 'error',
        message: isCrossFile
          ? `Duplicate redirect source "${rule.source}" found across separate files (${firstEntry.file} and ${rule._file || 'unknown'}).`
          : `Duplicate redirect source "${rule.source}" with identical conditions found in the same configuration.`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: `Consolidate or remove the duplicate redirect rule.`
      });
    } else {
      sourceMap.set(fullKey, { rule, index: i, file: rule._file });
    }

    // Track for unreachable rule check
    const normalizedSource = normalizePath(rule.source);
    if (!rulesBySource.has(normalizedSource)) {
      rulesBySource.set(normalizedSource, []);
    }
    const previousRules = rulesBySource.get(normalizedSource)!;

    // If a previous rule has NO conditions (unconditional) and identical source, this subsequent rule is unreachable
    const unconditionalPrevious = previousRules.find(
      p => (!p.rule.has || p.rule.has.length === 0) && (!p.rule.missing || p.rule.missing.length === 0)
    );
    if (unconditionalPrevious) {
      diagnostics.push({
        code: 'WARN_UNREACHABLE_RULE',
        severity: 'warning',
        message: `Redirect rule for source "${rule.source}" is unreachable because a preceding unconditional rule already handles all requests to this path (defined at ${unconditionalPrevious.file || 'index ' + unconditionalPrevious.index}).`,
        file: rule._file,
        index: rule._index ?? i,
        rule,
        suggestion: 'Place conditional rules before unconditional fallback rules, or remove the shadowed rule.'
      });
    }

    previousRules.push({ rule, index: i, file: rule._file });
  }

  // 7. Graph Analysis: Self-redirects, Cycles, Chains
  const graph = new RedirectGraph(rules);

  // Self redirects
  const selfRedirects = graph.detectSelfRedirects(rules);
  for (const sr of selfRedirects) {
    diagnostics.push({
      code: 'ERR_SELF_REDIRECT',
      severity: 'error',
      message: `Self-redirect detected: "${sr.source}" redirects to itself ("${sr.destination}").`,
      file: sr._file,
      index: sr._index,
      rule: sr,
      suggestion: 'Remove or update the destination to avoid an immediate redirect loop.'
    });
  }

  // Cycles
  const cycles = graph.detectCycles();
  for (const cycle of cycles) {
    const cycleDesc = cycle.nodes.join(' -> ');
    diagnostics.push({
      code: 'ERR_CYCLE_DETECTED',
      severity: validationOpts.allowCycles ? 'warning' : 'error',
      message: `Redirect loop/cycle detected: ${cycleDesc}`,
      file: cycle.rules[0]?._file,
      index: cycle.rules[0]?._index,
      rule: cycle.rules[0],
      suggestion: `Break the cycle by removing or retargeting one of the redirect steps in ${cycleDesc}.`
    });
  }

  // Chains
  const chains = graph.detectChains();
  for (const chain of chains) {
    if (chain.hops > (validationOpts.maxChainLength ?? 1)) {
      const chainDesc = chain.path.join(' -> ');
      diagnostics.push({
        code: 'WARN_CHAIN_DETECTED',
        severity: validationOpts.allowChains ? 'info' : isStrict ? 'error' : 'warning',
        message: `Redirect chain detected with ${chain.hops} hops: ${chainDesc}`,
        file: chain.rules[0]?._file,
        index: chain.rules[0]?._index,
        rule: chain.rules[0],
        suggestion: `Redirect directly from "${chain.from}" to "${chain.to}" to eliminate intermediary hops, boost speed, and preserve SEO link equity.`
      });
    }
  }

  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const info = diagnostics.filter(d => d.severity === 'info');

  const filesSet = new Set<string>();
  for (const r of rules) {
    if (r._file) filesSet.add(r._file);
  }

  const stats: ValidationStats = {
    totalRules: rules.length,
    filesCount: filesSet.size,
    chainsCount: chains.length,
    cyclesCount: cycles.length,
    errorCount: errors.length,
    warningCount: warnings.length
  };

  const valid = isStrict ? errors.length === 0 && warnings.length === 0 : errors.length === 0;

  return {
    valid,
    diagnostics,
    errors,
    warnings,
    info,
    stats
  };
}
