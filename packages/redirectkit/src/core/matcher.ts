import type { CheckResult, HopTrace, RedirectRule, RouteHas } from './types.js';

export interface MatchContext {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  query?: Record<string, string>;
  host?: string;
  maxHops?: number;
}

/**
 * Converts a Next.js route source pattern to a RegExp and extracted parameter keys.
 */
export function compileSourcePattern(source: string): {
  regex: RegExp;
  paramKeys: string[];
} {
  const paramKeys: string[] = [];

  // Replace Next.js parameter syntax:
  // :param* -> zero or more segments
  // :param+ -> one or more segments
  // :param? -> optional segment
  // :param  -> single segment
  // (regex) -> custom regex

  // Escape special regex chars except colons, parens, asterisks, plus, question marks
  let pattern = source;

  // Handle wildcard :param*
  pattern = pattern.replace(/:([a-zA-Z0-9_]+)\*/g, (_, key) => {
    paramKeys.push(key);
    return `(?<${key}>.*)`;
  });

  // Handle repeated :param+
  pattern = pattern.replace(/:([a-zA-Z0-9_]+)\+/g, (_, key) => {
    paramKeys.push(key);
    return `(?<${key}>.+)`;
  });

  // Handle optional :param?
  pattern = pattern.replace(/\/:([a-zA-Z0-9_]+)\?/g, (_, key) => {
    paramKeys.push(key);
    return `(?:/(?<${key}>[^/]+))?`;
  });

  // Handle single :param
  pattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    paramKeys.push(key);
    return `(?<${key}>[^/]+)`;
  });

  const fullRegex = new RegExp(`^${pattern}$`);
  return { regex: fullRegex, paramKeys };
}

/**
 * Checks whether request context satisfies all conditions in `has` and `missing`.
 */
export function evaluateConditions(
  rule: RedirectRule,
  context: MatchContext
): boolean {
  const checkSingle = (cond: RouteHas): boolean => {
    if (cond.type === 'host') {
      if (!context.host) return false;
      return cond.value ? context.host === cond.value : true;
    }

    if (cond.type === 'header') {
      const val = context.headers?.[cond.key.toLowerCase()];
      if (val === undefined) return false;
      return cond.value !== undefined ? val === cond.value : true;
    }

    if (cond.type === 'cookie') {
      const val = context.cookies?.[cond.key];
      if (val === undefined) return false;
      return cond.value !== undefined ? val === cond.value : true;
    }

    if (cond.type === 'query') {
      const val = context.query?.[cond.key];
      if (val === undefined) return false;
      return cond.value !== undefined ? val === cond.value : true;
    }

    return false;
  };

  if (rule.has && rule.has.length > 0) {
    for (const h of rule.has) {
      if (!checkSingle(h)) return false;
    }
  }

  if (rule.missing && rule.missing.length > 0) {
    for (const m of rule.missing) {
      if (checkSingle(m)) return false;
    }
  }

  return true;
}

/**
 * Interpolates captured parameters into destination string.
 */
export function interpolateDestination(
  destinationTemplate: string,
  params: Record<string, string>
): string {
  let result = destinationTemplate;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`:${key}\\*?`, 'g'), value);
    }
  }
  return result;
}

/**
 * Finds the first matching rule for a given path and context.
 */
export function matchRule(
  path: string,
  rules: RedirectRule[],
  context: MatchContext = {}
): { rule: RedirectRule; resolvedDestination: string } | null {
  for (const rule of rules) {
    if (!rule.source || !rule.destination) continue;

    // Condition check
    if (!evaluateConditions(rule, context)) continue;

    // Exact literal match
    if (rule.source === path) {
      return { rule, resolvedDestination: rule.destination };
    }

    // Pattern match
    try {
      const { regex } = compileSourcePattern(rule.source);
      const match = regex.exec(path);
      if (match) {
        const groups = match.groups || {};
        const dest = interpolateDestination(rule.destination, groups);
        return { rule, resolvedDestination: dest };
      }
    } catch {
      // If regex compilation fails, skip
    }
  }

  return null;
}

/**
 * Simulates the redirect flow for a path through the ruleset,
 * tracing each hop and detecting loops.
 */
export function simulateRedirect(
  initialPath: string,
  rules: RedirectRule[],
  context: MatchContext = {}
): CheckResult {
  const maxHops = context.maxHops ?? 10;
  const trace: HopTrace[] = [];
  const seenPaths = new Set<string>();

  let currentPath = initialPath;
  let loopDetected = false;

  const limitations = [
    'Static evaluation does not execute Next.js Middleware (`middleware.ts`).',
    'Dynamic rewrite rules or server runtime headers may alter final destinations in production.',
    'External destination URLs are treated as terminal destinations and are not traversed.'
  ];

  while (trace.length < maxHops) {
    if (seenPaths.has(currentPath)) {
      loopDetected = true;
      break;
    }
    seenPaths.add(currentPath);

    // If destination is external, terminate trace
    if (/^(?:https?:)?\/\//i.test(currentPath)) {
      break;
    }

    const matched = matchRule(currentPath, rules, context);
    if (!matched) {
      break;
    }

    trace.push({
      source: currentPath,
      destination: matched.resolvedDestination,
      permanent: matched.rule.permanent,
      statusCode: matched.rule.statusCode,
      file: matched.rule._file,
      rule: matched.rule
    });

    currentPath = matched.resolvedDestination;
  }

  if (trace.length >= maxHops && !loopDetected) {
    loopDetected = true;
  }

  return {
    originalPath: initialPath,
    finalDestination: trace.length > 0 ? currentPath : null,
    matched: trace.length > 0,
    hops: trace.length,
    trace,
    loopDetected,
    limitations
  };
}
