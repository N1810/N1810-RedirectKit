# Getting Started with RedirectKit

RedirectKit is a production-grade redirect manager designed for Next.js applications. It replaces unwieldy redirect arrays in `next.config.js` with structured, validated JSON files, automated loop detection, and an ergonomic CLI.

---

## 1. Installation

Install RedirectKit in your Next.js project using `pnpm`:

```bash
pnpm add redirectkit
```

*(You can also use `npm install redirectkit` or `yarn add redirectkit`)*

---

## 2. Directory Setup

Create a `redirects/` folder in your project root. You can split redirects into logical files based on domain, team, or campaign:

```
my-project/
├── redirects/
│   ├── marketing.json
│   ├── legacy-urls.json
│   └── blog.json
├── next.config.mjs
└── package.json
```

---

## 3. Creating Redirect Rules

Define your redirects inside the JSON files.

### Example: `redirects/marketing.json`

```json
[
  {
    "source": "/spring-sale",
    "destination": "/promotions/spring",
    "permanent": false,
    "comment": "Temporary spring sale promotion"
  },
  {
    "source": "/black-friday",
    "destination": "/deals/black-friday",
    "permanent": false
  }
]
```

### Example: `redirects/legacy-urls.json`

```json
[
  {
    "source": "/old-about-us",
    "destination": "/about",
    "permanent": true
  },
  {
    "source": "/contact-us",
    "destination": "/contact",
    "permanent": true
  }
]
```

### Example: `redirects/blog.json`

```json
[
  {
    "source": "/old-blog/:slug",
    "destination": "/blog/:slug",
    "permanent": true
  }
]
```

---

## 4. Next.js Integration

Wrap your Next.js configuration using `withRedirects` from `redirectkit/next`:

```javascript
// next.config.mjs
import { withRedirects } from 'redirectkit/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Any existing Next.js options (webpack, images, env, rewrites) are preserved.
};

export default withRedirects(nextConfig);
```

### Existing Redirects Support

If you already have existing redirects inside your `next.config.js`, RedirectKit preserves them and merges them cleanly:

```javascript
import { withRedirects } from 'redirectkit/next';

const nextConfig = {
  async redirects() {
    return [
      {
        source: '/custom-runtime-redirect',
        destination: '/dashboard',
        permanent: false
      }
    ];
  }
};

export default withRedirects(nextConfig);
```

---

## 5. Validating Your Configuration

Run the RedirectKit CLI to validate all your redirect files before deploying:

```bash
pnpm redirectkit validate
```

If any errors exist (such as infinite redirect loops, duplicate sources, or malformed regex), RedirectKit provides line numbers, files, and suggested solutions.

---

## 6. Simulating a Redirect

To trace how a specific incoming request path will be handled:

```bash
pnpm redirectkit check /old-blog/hello-world
```

Output:
```
Simulation for: /old-blog/hello-world
Matched! Resulting destination: /blog/hello-world
Total Hops: 1

Hop Trace:
  1. /old-blog/hello-world ─(HTTP 308 (permanent))→ /blog/hello-world [redirects/blog.json]
```
