# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-13

### Added
- Core modular JSON redirect loader with path-traversal protection.
- Directed graph analysis engine detecting self-redirects, 2-node cycles, multi-node cycles, and multi-hop chains.
- Robust validation engine covering 16+ redirect defect types, Next.js mutually exclusive flags, and cross-file collisions.
- Pattern matcher with support for `:param`, `:param*`, `:param+`, `:param?`, regex routes, and `has`/`missing` conditions.
- RFC-4180 compliant CSV import and export with lossless serialization and line-number error reporting.
- Next.js configuration adapter (`withRedirects` from `redirectkit/next`) preserving original NextConfig options and merging custom redirects.
- Interactive developer CLI (`redirectkit validate`, `list`, `check`, `test`, `import`, `export`) with colorized diagnostics.
- Comprehensive automated test suite with Vitest.
- Working Next.js 15 production example application with automated HTTP redirect smoke testing.
- npm tarball verification and fixture smoke testing scripts.
- GitHub Actions CI workflow covering Node.js 18, 20, and 22.
