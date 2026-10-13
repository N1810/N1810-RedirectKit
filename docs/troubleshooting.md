# RedirectKit Troubleshooting & Diagnostic Guide

This guide helps resolve common diagnostics and questions when using RedirectKit.

---

## 1. Diagnostics & Error Codes

### `ERR_CYCLE_DETECTED` (Redirect Loop)
- **Cause**: A set of redirect rules routes back to a starting path, e.g. `/a` $\to$ `/b` $\to$ `/a` or `/x` $\to$ `/y` $\to$ `/z` $\to$ `/x`. Browsers will abort with `ERR_TOO_MANY_REDIRECTS`.
- **Solution**: Break the loop by changing the destination of one of the rules or removing the circular edge. Run `pnpm redirectkit check /a` to trace the loop.

### `WARN_CHAIN_DETECTED` (Redirect Chain)
- **Cause**: Multi-hop redirection, e.g. `/step-1` $\to$ `/step-2` and `/step-2` $\to$ `/step-3`.
- **Impact**: Each hop increases round-trip latency, slows down PageSpeed scores, and diffuses SEO PageRank/link equity.
- **Solution**: Update `/step-1` to redirect directly to `/step-3`.

### `ERR_MUTUALLY_EXCLUSIVE_STATUS`
- **Cause**: A rule defines both `"permanent": true|false` and `"statusCode": 301|308`.
- **Impact**: Next.js throws a runtime error if both are provided.
- **Solution**: Remove either `permanent` or `statusCode`. Next.js uses `permanent: true` for 308 redirects and `permanent: false` for 307 redirects.

### `ERR_CROSS_FILE_DUPLICATE`
- **Cause**: The same source path (with identical conditions) is defined in multiple files (e.g. `marketing.json` and `legacy.json`).
- **Solution**: Decide which file owns the rule and remove the duplicate entry from the other file.

### `WARN_UNREACHABLE_RULE`
- **Cause**: An unconditional redirect rule for `/path` is followed later in the configuration by a conditional rule for `/path`.
- **Explanation**: Next.js evaluates redirect rules in sequence. Since the first rule matches all requests to `/path`, the second rule will never be triggered.
- **Solution**: Move the more specific conditional rule before the general unconditional rule.

---

## 2. CI/CD Failures

If your CI pipeline fails on redirect validation:
1. Check if `--strict` mode is enabled. In strict mode, warnings (such as redirect chains) will cause the build to exit with code 1.
2. Run `pnpm redirectkit validate` locally to inspect the exact errors and line numbers.

---

## 3. Dynamic Parameters & Middleware Limitations

- **Pattern Limitations**: Next.js pattern matching (`:slug`, `:path*`) is supported. However, redirect rules that rely on dynamic server logic (such as cookies determined at edge runtime or database checks) should be handled inside `middleware.ts`.
- **Middleware Precedence**: Next.js executes middleware before `next.config.js` redirects. If you have custom redirect logic inside `middleware.ts`, it may take precedence over RedirectKit rules.
