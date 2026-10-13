# RedirectKit Configuration Reference

This document covers all configuration options, rule parameters, and validation settings in RedirectKit.

---

## 1. Project Configuration (`redirectkit.config.json`)

You can place an optional `redirectkit.config.json` at your project root:

```json
{
  "$schema": "https://raw.githubusercontent.com/N1810/RedirectKit/main/schema.json",
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

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `redirectsDir` | `string` | `"redirects"` | Directory path relative to project root containing redirect JSON files. Traversal outside root is strictly blocked. |
| `include` | `string[]` | `["**/*.json"]` | Glob patterns of files to load. |
| `exclude` | `string[]` | `["node_modules/**"]` | Glob patterns of files to ignore. |
| `strict` | `boolean` | `false` | When `true`, warnings (such as redirect chains or reachable shadow rules) cause validation and builds to fail. |
| `baseRedirects` | `RedirectRule[]` | `[]` | Base redirect rules specified directly in the configuration file. |
| `validation.allowChains` | `boolean` | `false` | If `false`, warns on multi-hop redirect chains ($A \to B \to C$). |
| `validation.allowCycles` | `boolean` | `false` | If `false`, flags redirect loops as blocking errors. |
| `validation.allowDuplicates` | `boolean` | `false` | If `false`, flags duplicate sources as errors. |
| `validation.maxChainLength` | `number` | `1` | Max acceptable hop count before issuing chain warnings. |
| `validation.allowExternalDestinations` | `boolean` | `true` | Allows external absolute URLs (`https://...`). |

---

## 2. Redirect Rule Schema

Each redirect entry in your JSON files supports the full Next.js redirect specification:

```typescript
interface RedirectRule {
  /** The incoming request path pattern (must start with '/') */
  source: string;

  /** Target path or external URL */
  destination: string;

  /** True for HTTP 308 (permanent), false for HTTP 307 (temporary) */
  permanent?: boolean;

  /** Custom HTTP status code (301, 302, 307, 308). Mutually exclusive with permanent. */
  statusCode?: number;

  /** Optional basePath suppression */
  basePath?: false;

  /** Optional locale suppression */
  locale?: false;

  /** Array of conditions that must match */
  has?: RouteHas[];

  /** Array of conditions that must NOT match */
  missing?: RouteHas[];

  /** Developer comment or documentation (stripped before passing to Next.js) */
  comment?: string;

  /** Rule identifier */
  id?: string;
}
```

---

## 3. Advanced Matching Conditions (`has` & `missing`)

Next.js supports matching redirects based on incoming headers, cookies, query parameters, or host headers:

### Header Matching

```json
{
  "source": "/app",
  "destination": "/mobile-app",
  "permanent": false,
  "has": [
    {
      "type": "header",
      "key": "x-device-type",
      "value": "mobile"
    }
  ]
}
```

### Cookie Matching (Missing Authentication)

```json
{
  "source": "/members-only",
  "destination": "/login",
  "permanent": false,
  "missing": [
    {
      "type": "cookie",
      "key": "session_token"
    }
  ]
}
```

### Query Parameter Matching

```json
{
  "source": "/catalog",
  "destination": "/clearance",
  "permanent": false,
  "has": [
    {
      "type": "query",
      "key": "section",
      "value": "discount"
    }
  ]
}
```

### Host Header Matching

```json
{
  "source": "/landing",
  "destination": "https://partner.example.com",
  "permanent": true,
  "has": [
    {
      "type": "host",
      "value": "partner.myapp.com"
    }
  ]
}
```
