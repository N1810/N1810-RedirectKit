# RedirectKit

[![npm version](https://img.shields.io/npm/v/redirectkit.svg)](https://www.npmjs.com/package/redirectkit)
[![CI](https://github.com/N1810/N1810-RedirectKit/actions/workflows/ci.yml/badge.svg)](https://github.com/N1810/N1810-RedirectKit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Production-Ready Next.js Redirect Manager** with declarative JSON files, validation, loop & chain detection, CLI, and CSV import/export.

Redirect lists inside `next.config.js` frequently grow into hundreds or thousands of unorganized lines. Managing them leads to subtle bugs: infinite redirect loops ($A \to B \to A$), SEO-damaging redirect chains ($A \to B \to C$), duplicate source routes, and broken regex patterns.

**RedirectKit** solves this by providing:
- 📁 **Organized JSON Files**: Split redirects by domain, feature, or campaign (e.g. `marketing.json`, `legacy.json`, `blog.json`).
- ⚡ **Zero Runtime Overhead**: Redirects are parsed, validated, and optimized at build time. No database, middleware penalty, or server daemon.
- 🛡️ **Comprehensive Validation Engine**: Detects 16+ common redirect defects including self-redirects, cycles, multi-hop chains, and mutually exclusive status flags.
- 🛠️ **Developer-Friendly CLI**: `validate`, `check`, `list`, `test`, `import`, and `export` commands with actionable suggestions.
- 📊 **Lossless CSV Import & Export**: Seamlessly collaborate with marketing and SEO teams.
- 🔒 **Full Next.js Compatibility**: Supports Next.js 13, 14, and 15 with full TypeScript type safety.

---

## Installation

```bash
# Using pnpm (recommended)
pnpm add redirectkit

# Using npm
npm install redirectkit

# Using yarn
yarn add redirectkit
```

---

## Quick Start

### 1. Organize your redirects into JSON files

Create a `redirects/` folder in your project root:

```
my-next-app/
├── redirects/
│   ├── marketing.json
│   ├── legacy.json
│   └── blog.json
├── next.config.mjs
└── package.json
```

**`redirects/marketing.json`**:
```json
[
  {
    "source": "/summer-sale",
    "destination": "/promotions/summer",
    "permanent": false
  },
  {
    "source": "/promo",
    "destination": "/offers",
    "permanent": true
  }
]
```

**`redirects/blog.json`**:
```json
[
  {
    "source": "/old-blog/:slug",
    "destination": "/blog/:slug",
    "permanent": true
  }
]
```

### 2. Wrap your `next.config`

In `next.config.mjs` (or `next.config.js`):

```javascript
import { withRedirects } from 'redirectkit/next';

const nextConfig = {
  // Your existing Next.js options (webpack, images, env, etc.)
  reactStrictMode: true,
};

export default withRedirects(nextConfig);
```

That's it! When you run `next build` or `next dev`, RedirectKit automatically reads your JSON files, validates them, and hands standard Next.js redirect objects to the framework engine.

---

## CLI Usage

RedirectKit comes with an interactive CLI:

```bash
# Validate all redirects (exit code 1 if errors found)
pnpm redirectkit validate

# Strict mode for CI (fails on warnings like redirect chains)
pnpm redirectkit validate --strict

# Simulate where a URL path redirects, step-by-step
pnpm redirectkit check /old-blog/my-post

# List all configured redirects
pnpm redirectkit list

# Run redirect rule tests
pnpm redirectkit test

# Import redirects from CSV
pnpm redirectkit import legacy-redirects.csv --out redirects/imported.json

# Export all project redirects to CSV
pnpm redirectkit export all-redirects.csv
```

---

## Configuration (`redirectkit.config.json`)

You can customize behavior with an optional `redirectkit.config.json` in your root:

```json
{
  "redirectsDir": "redirects",
  "include": ["**/*.json"],
  "exclude": ["node_modules/**"],
  "strict": false,
  "validation": {
    "allowChains": false,
    "allowCycles": false,
    "allowDuplicates": false,
    "maxChainLength": 1,
    "allowExternalDestinations": true
  }
}
```

---

## Validation Rules

RedirectKit validates against 16 key failure modes:

| Diagnostic Code | Severity | Description |
|---|---|---|
| `ERR_MISSING_SOURCE` | Error | Missing or empty `source` string |
| `ERR_MISSING_DESTINATION` | Error | Missing or empty `destination` string |
| `ERR_INVALID_SOURCE_PATTERN` | Error | Source does not begin with leading `/` |
| `ERR_INVALID_DESTINATION_PATTERN` | Error | Destination is not relative (`/...`) or valid URL (`https://...`) |
| `ERR_MUTUALLY_EXCLUSIVE_STATUS` | Error | Both `permanent` and `statusCode` defined (Next.js incompatible) |
| `ERR_MISSING_STATUS_OR_PERMANENT` | Error | Neither `permanent` nor `statusCode` specified |
| `ERR_INVALID_STATUS_CODE` | Error | Status code is not within HTTP redirect range (300–399) |
| `ERR_DUPLICATE_SOURCE` | Error | Identical source and condition defined in the same file |
| `ERR_CROSS_FILE_DUPLICATE` | Error | Duplicate redirect source collision across different files |
| `ERR_SELF_REDIRECT` | Error | Source redirects to itself ($A \to A$) |
| `ERR_CYCLE_DETECTED` | Error | Redirect cycle detected ($A \to B \to A$ or $A \to B \to C \to A$) |
| `WARN_CHAIN_DETECTED` | Warning | Multi-hop chain detected ($A \to B \to C$). Direct hop suggested. |
| `WARN_UNREACHABLE_RULE` | Warning | Rule shadowed by preceding unconditional rule on same path |
| `ERR_INVALID_CONDITION` | Error | Malformed `has` or `missing` condition structure |
| `ERR_MALFORMED_JSON` | Error | Syntax error inside redirect JSON configuration |
| `ERR_PATH_TRAVERSAL` | Error | Directory traversal attempt in configuration path |

---

## License

MIT © RedirectKit Contributors
