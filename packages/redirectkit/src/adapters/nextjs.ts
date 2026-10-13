import { loadProjectConfig, loadRedirects } from '../core/loader.js';
import type { RedirectKitConfig, RedirectRule } from '../core/types.js';
import { validateRedirects } from '../core/validator.js';

export interface NextRedirect {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
  basePath?: false;
  locale?: false;
  has?: Array<{ type: string; key?: string; value?: string }>;
  missing?: Array<{ type: string; key?: string; value?: string }>;
}

export interface NextConfigObject {
  redirects?: () => Promise<NextRedirect[]> | NextRedirect[];
  [key: string]: unknown;
}

export type NextConfigFn = (
  phase: string,
  context: { defaultConfig: NextConfigObject }
) => NextConfigObject | Promise<NextConfigObject>;

export type NextConfigInput =
  | NextConfigObject
  | Promise<NextConfigObject>
  | NextConfigFn;

export interface WithRedirectsOptions extends RedirectKitConfig {
  /** Project root directory to look for redirects. Defaults to process.cwd() */
  projectRoot?: string;
  /** Custom path to config file */
  configFile?: string;
}

/**
 * Custom error thrown when redirect validation fails.
 */
export class RedirectKitValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown[]
  ) {
    super(message);
    this.name = 'RedirectKitValidationError';
  }
}

/**
 * Strips internal RedirectKit tracking properties before handing rules to Next.js.
 */
function cleanRedirectRule(rule: RedirectRule): NextRedirect {
  const clean: NextRedirect = {
    source: rule.source,
    destination: rule.destination
  };

  if (typeof rule.permanent === 'boolean') {
    clean.permanent = rule.permanent;
  }
  if (typeof rule.statusCode === 'number') {
    clean.statusCode = rule.statusCode;
  }
  if (rule.basePath === false) {
    clean.basePath = false;
  }
  if (rule.locale === false) {
    clean.locale = false;
  }
  if (rule.has && rule.has.length > 0) {
    clean.has = rule.has;
  }
  if (rule.missing && rule.missing.length > 0) {
    clean.missing = rule.missing;
  }

  return clean;
}

/**
 * Loads and validates RedirectKit redirects for Next.js.
 */
export function getRedirectKitNextRedirects(
  options: WithRedirectsOptions = {}
): NextRedirect[] {
  const projectRoot = options.projectRoot || process.cwd();

  // Load config file
  const { config: fileConfig, diagnostic: configDiag } = loadProjectConfig(
    projectRoot,
    options.configFile
  );

  const mergedConfig: RedirectKitConfig = {
    ...fileConfig,
    ...options,
    validation: {
      ...fileConfig.validation,
      ...options.validation
    }
  };

  const initialDiagnostics = configDiag ? [configDiag] : [];

  // Load redirects
  const loaded = loadRedirects(projectRoot, mergedConfig);
  initialDiagnostics.push(...loaded.loadDiagnostics);

  // Validate
  const result = validateRedirects(loaded.rules, {
    config: mergedConfig,
    initialDiagnostics
  });

  if (!result.valid) {
    const errorDetails = result.errors
      .map(
        e =>
          `  - [${e.code}] ${e.message}${e.file ? ` (${e.file}${e.index !== undefined ? `:${e.index}` : ''})` : ''}${
            e.suggestion ? `\n    Suggestion: ${e.suggestion}` : ''
          }`
      )
      .join('\n');

    throw new RedirectKitValidationError(
      `RedirectKit found ${result.errors.length} validation error(s):\n${errorDetails}`,
      result.errors
    );
  }

  // Print warnings if any
  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.warn(
        `[RedirectKit Warning] ${w.message}${w.file ? ` (${w.file})` : ''}`
      );
    }
  }

  return loaded.rules.map(cleanRedirectRule);
}

/**
 * Higher-order Next.js configuration wrapper.
 * Integrates RedirectKit rules seamlessly with Next.js next.config.
 */
export function withRedirects(
  nextConfigInput: NextConfigInput = {},
  options: WithRedirectsOptions = {}
): unknown {
  // If input is a function (e.g. phase, { defaultConfig })
  if (typeof nextConfigInput === 'function') {
    return async (
      phase: string,
      context: { defaultConfig: NextConfigObject }
    ): Promise<NextConfigObject> => {
      const resolved = await nextConfigInput(phase, context);
      return applyWithRedirects(resolved || {}, options);
    };
  }

  // If input is a Promise
  if (
    nextConfigInput &&
    typeof (nextConfigInput as Promise<NextConfigObject>).then === 'function'
  ) {
    return (async () => {
      const resolved = await (nextConfigInput as Promise<NextConfigObject>);
      return applyWithRedirects(resolved || {}, options);
    })();
  }

  // Regular NextConfig object
  return applyWithRedirects(nextConfigInput as NextConfigObject, options);
}

/**
 * Internal helper to attach redirects to a resolved NextConfig object without mutating it.
 */
function applyWithRedirects(
  config: NextConfigObject,
  options: WithRedirectsOptions
): NextConfigObject {
  const kitRedirects = getRedirectKitNextRedirects(options);
  const originalRedirectsFn = config.redirects;

  const newConfig: NextConfigObject = {
    ...config,
    async redirects(): Promise<NextRedirect[]> {
      let existingRedirects: NextRedirect[] = [];
      if (typeof originalRedirectsFn === 'function') {
        const res = await originalRedirectsFn();
        if (Array.isArray(res)) {
          existingRedirects = res;
        }
      }

      // Merge existing with RedirectKit redirects
      return [...existingRedirects, ...kitRedirects];
    }
  };

  return newConfig;
}
