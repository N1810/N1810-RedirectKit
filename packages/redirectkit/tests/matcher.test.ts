import { describe, expect, it } from 'vitest';
import { matchRule, simulateRedirect } from '../src/core/matcher.js';
import type { RedirectRule } from '../src/core/types.js';

describe('Redirect Matcher and Simulator', () => {
  it('matches exact literal routes', () => {
    const rules: RedirectRule[] = [
      { source: '/about-us', destination: '/about', permanent: true }
    ];

    const match = matchRule('/about-us', rules);
    expect(match).not.toBeNull();
    expect(match?.resolvedDestination).toBe('/about');
  });

  it('matches dynamic parameters (:slug)', () => {
    const rules: RedirectRule[] = [
      { source: '/blog/:slug', destination: '/posts/:slug', permanent: true }
    ];

    const match = matchRule('/blog/hello-world', rules);
    expect(match).not.toBeNull();
    expect(match?.resolvedDestination).toBe('/posts/hello-world');
  });

  it('matches wildcard parameters (:path*)', () => {
    const rules: RedirectRule[] = [
      { source: '/docs/:path*', destination: '/knowledge-base/:path*', permanent: true }
    ];

    const match = matchRule('/docs/getting-started/quickstart', rules);
    expect(match).not.toBeNull();
    expect(match?.resolvedDestination).toBe('/knowledge-base/getting-started/quickstart');
  });

  it('evaluates conditions correctly (has header)', () => {
    const rules: RedirectRule[] = [
      {
        source: '/app',
        destination: '/app/mobile',
        permanent: false,
        has: [{ type: 'header', key: 'x-device-type', value: 'mobile' }]
      },
      {
        source: '/app',
        destination: '/app/desktop',
        permanent: false
      }
    ];

    // Request with mobile header
    const mobileMatch = matchRule('/app', rules, {
      headers: { 'x-device-type': 'mobile' }
    });
    expect(mobileMatch?.resolvedDestination).toBe('/app/mobile');

    // Request without mobile header
    const desktopMatch = matchRule('/app', rules, {
      headers: { 'x-device-type': 'desktop' }
    });
    expect(desktopMatch?.resolvedDestination).toBe('/app/desktop');
  });

  it('evaluates missing condition', () => {
    const rules: RedirectRule[] = [
      {
        source: '/beta',
        destination: '/signup',
        permanent: false,
        missing: [{ type: 'cookie', key: 'auth_token' }]
      }
    ];

    // User without cookie -> redirected to signup
    const unauth = matchRule('/beta', rules, { cookies: {} });
    expect(unauth?.resolvedDestination).toBe('/signup');

    // User with cookie -> no match
    const authed = matchRule('/beta', rules, { cookies: { auth_token: 'secret' } });
    expect(authed).toBeNull();
  });

  it('simulates multi-hop redirect chains accurately', () => {
    const rules: RedirectRule[] = [
      { source: '/v1/users', destination: '/v2/users', permanent: true },
      { source: '/v2/users', destination: '/api/users', permanent: true },
      { source: '/api/users', destination: '/users', permanent: true }
    ];

    const sim = simulateRedirect('/v1/users', rules);
    expect(sim.matched).toBe(true);
    expect(sim.hops).toBe(3);
    expect(sim.finalDestination).toBe('/users');
    expect(sim.loopDetected).toBe(false);
  });

  it('detects infinite loop during simulation and prevents freeze', () => {
    const rules: RedirectRule[] = [
      { source: '/loop-1', destination: '/loop-2', permanent: true },
      { source: '/loop-2', destination: '/loop-1', permanent: true }
    ];

    const sim = simulateRedirect('/loop-1', rules);
    expect(sim.matched).toBe(true);
    expect(sim.loopDetected).toBe(true);
  });

  it('returns matched=false when no rule applies', () => {
    const rules: RedirectRule[] = [
      { source: '/pricing', destination: '/plans', permanent: true }
    ];

    const sim = simulateRedirect('/unrelated', rules);
    expect(sim.matched).toBe(false);
    expect(sim.finalDestination).toBeNull();
    expect(sim.hops).toBe(0);
  });
});
