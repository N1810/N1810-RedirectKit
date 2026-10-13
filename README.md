# RedirectKit

[![npm version](https://img.shields.io/npm/v/redirectkit.svg)](https://www.npmjs.com/package/redirectkit)
[![CI](https://github.com/N1810/N1810-RedirectKit/actions/workflows/ci.yml/badge.svg)](https://github.com/N1810/N1810-RedirectKit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Production-Ready Next.js Redirect Manager** — Organize redirects in modular JSON files, catch loops and chains with automated validation, simulate paths with an interactive CLI, and import/export CSVs.

---

## 🌟 Key Features

- **📁 Clean Organization**: Replace massive redirect lists in `next.config.js` with structured JSON files in `redirects/` (e.g. `marketing.json`, `legacy.json`, `blog.json`).
- **🛡️ 16-Point Validation Engine**: Detects loops ($A \to B \to A$), cycles ($A \to B \to C \to A$), SEO-damaging chains ($A \to B \to C$), duplicate sources across files, and invalid Next.js properties.
- **⚡ Zero Runtime Overhead**: All resolution and validation happen strictly at build time. No runtime server dependencies, middleware penalties, or databases.
- **🛠️ Ergonomic CLI**: Validate configurations in CI (`redirectkit validate --strict`), simulate URLs (`redirectkit check /url`), list rules, and test redirect integrity.
- **📊 Lossless CSV Support**: Import and export redirects via RFC-4180 CSVs for seamless collaboration with SEO and marketing teams.
- **🔌 Native Next.js Integration**: Preserves your existing `next.config.js` options and seamlessly merges existing custom redirects.

---

## 📦 Project Structure

```
redirectkit/
├── packages/
│   └── redirectkit/           # Core npm package
│       ├── src/
│       │   ├── core/          # Loader, graph engine, matcher, validator
│       │   ├── adapters/      # Next.js adapter (withRedirects)
│       │   ├── cli/           # Interactive CLI binary
│       │   └── import-export/ # CSV import & export engine
│       ├── tests/             # Comprehensive Vitest suite
│       └── package.json
├── examples/
│   └── nextjs-app/            # Live Next.js 15 production example app
├── docs/                      # Extended documentation
│   ├── getting-started.md
│   ├── configuration.md
│   └── troubleshooting.md
└── .github/workflows/ci.yml   # Multi-Node CI workflow (18, 20, 22)
```

---

## 🚀 Quick Start

### 1. Install RedirectKit

```bash
pnpm add redirectkit
```

### 2. Add Redirects in `redirects/`

Create `redirects/marketing.json`:

```json
[
  {
    "source": "/old-promo",
    "destination": "/deals/summer",
    "permanent": true
  },
  {
    "source": "/flash-sale",
    "destination": "/deals/flash",
    "permanent": false
  }
]
```

Create `redirects/blog.json`:

```json
[
  {
    "source": "/old-blog/:slug",
    "destination": "/blog/:slug",
    "permanent": true
  }
]
```

### 3. Wrap your `next.config.mjs`

```javascript
import { withRedirects } from 'redirectkit/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withRedirects(nextConfig);
```

---

## 🛠️ CLI Commands

```bash
# Validate all redirects (exit code 1 if errors found)
pnpm redirectkit validate

# Strict mode for CI (fails on warnings such as chains)
pnpm redirectkit validate --strict

# Simulate where a path redirects
pnpm redirectkit check /old-blog/launch-announcement

# List all configured redirects
pnpm redirectkit list

# Run redirect rule health checks
pnpm redirectkit test

# Import redirects from a CSV file
pnpm redirectkit import legacy-redirects.csv --out redirects/imported.json

# Export all project redirects to CSV
pnpm redirectkit export all-redirects.csv
```

---

## 🧪 Testing & Verification

Run all workspace test suites:

```bash
# Unit & integration tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Package tarball & artifact verification
pnpm pack:check

# Next.js production build & HTTP smoke tests
pnpm example:build
pnpm --filter nextjs-app smoke
```

---

## 📄 License

MIT © RedirectKit Contributors