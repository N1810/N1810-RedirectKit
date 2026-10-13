/**
 * Core type definitions for RedirectKit
 */

export type RouteHas =
  | { type: 'header' | 'cookie' | 'query'; key: string; value?: string }
  | { type: 'host'; value: string };

export interface RedirectRule {
  /** Source path pattern (e.g. '/old-path', '/blog/:slug') */
  source: string;
  /** Destination path or external URL */
  destination: string;
  /** Whether the redirect is permanent (HTTP 308/301). Mutually exclusive with statusCode */
  permanent?: boolean;
  /** Custom HTTP status code (301, 302, 307, 308). Mutually exclusive with permanent */
  statusCode?: number;
  /** Whether basePath should be included */
  basePath?: false;
  /** Whether locale should be included */
  locale?: false;
  /** Conditions that must match for the redirect to trigger */
  has?: RouteHas[];
  /** Conditions that must NOT match for the redirect to trigger */
  missing?: RouteHas[];
  /** Optional identifier for the rule */
  id?: string;
  /** Optional comment or documentation */
  comment?: string;
  /** Internal metadata: source file where the rule was defined */
  _file?: string;
  /** Internal metadata: 0-indexed position within the file */
  _index?: number;
}

export interface ValidationOptions {
  /** If false, generates a warning/error when A -> B -> C chains exist. Defaults to false */
  allowChains?: boolean;
  /** If false, reports errors on cycles (A -> B -> A). Defaults to false */
  allowCycles?: boolean;
  /** If false, reports errors on duplicate source patterns. Defaults to false */
  allowDuplicates?: boolean;
  /** Maximum acceptable chain length before warning. Defaults to 1 (direct redirect) */
  maxChainLength?: number;
  /** Whether external URLs (e.g. https://example.com) are allowed as destinations. Defaults to true */
  allowExternalDestinations?: boolean;
}

export interface RedirectKitConfig {
  /** Directory containing redirect JSON files, relative to project root. Defaults to "redirects" */
  redirectsDir?: string;
  /** File patterns to include. Defaults to ["**\/*.json"] */
  include?: string[];
  /** File patterns to exclude. Defaults to ["node_modules/**"] */
  exclude?: string[];
  /** Base redirects to always include */
  baseRedirects?: RedirectRule[];
  /** Fine-grained validation options */
  validation?: ValidationOptions;
  /** If true, treats warnings as errors and causes validation/build failure. Defaults to false */
  strict?: boolean;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  /** Unique error/warning code (e.g. ERR_SELF_REDIRECT, WARN_CHAIN_DETECTED) */
  code: string;
  /** Severity level */
  severity: DiagnosticSeverity;
  /** Human-readable message explaining the issue */
  message: string;
  /** File where the rule originates, if applicable */
  file?: string;
  /** 0-indexed position of the rule in the file, if applicable */
  index?: number;
  /** The rule object triggering this diagnostic */
  rule?: RedirectRule;
  /** Suggested fix or mitigation */
  suggestion?: string;
}

export interface ValidationStats {
  totalRules: number;
  filesCount: number;
  chainsCount: number;
  cyclesCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ValidationResult {
  /** True if there are 0 errors (and in strict mode, 0 warnings) */
  valid: boolean;
  /** All diagnostics */
  diagnostics: Diagnostic[];
  /** Diagnostics with severity 'error' */
  errors: Diagnostic[];
  /** Diagnostics with severity 'warning' */
  warnings: Diagnostic[];
  /** Diagnostics with severity 'info' */
  info: Diagnostic[];
  /** Summary statistics */
  stats: ValidationStats;
}

export interface RedirectCycle {
  /** Path nodes in the detected cycle, e.g. ['/a', '/b', '/c', '/a'] */
  nodes: string[];
  /** Associated redirect rules */
  rules: RedirectRule[];
}

export interface RedirectChain {
  /** Initial source path */
  from: string;
  /** Final destination path */
  to: string;
  /** Number of hops (e.g. A -> B -> C is 2 hops) */
  hops: number;
  /** Path sequence, e.g. ['/a', '/b', '/c'] */
  path: string[];
  /** Associated rules in sequence */
  rules: RedirectRule[];
}

export interface LoadedRedirects {
  /** All loaded and flattened redirect rules with _file and _index */
  rules: RedirectRule[];
  /** Map of filename to rules loaded from that file */
  files: Map<string, RedirectRule[]>;
  /** Diagnostics encountered during loading (e.g. malformed JSON, missing files) */
  loadDiagnostics: Diagnostic[];
}

export interface HopTrace {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
  file?: string;
  rule: RedirectRule;
}

export interface CheckResult {
  /** Input URL path tested */
  originalPath: string;
  /** Resolved final URL or path, or null if no redirect matched */
  finalDestination: string | null;
  /** Whether any redirect matched */
  matched: boolean;
  /** Number of hops taken */
  hops: number;
  /** Step-by-step trace of matched rules */
  trace: HopTrace[];
  /** Whether an infinite loop was detected during simulation */
  loopDetected: boolean;
  /** Diagnostic explanations or caveats regarding dynamic headers/rewrites */
  limitations: string[];
}
