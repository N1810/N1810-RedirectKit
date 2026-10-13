import { describe, expect, it } from 'vitest';
import { RedirectGraph } from '../src/core/graph.js';
import type { RedirectRule } from '../src/core/types.js';

describe('Redirect Graph Engine', () => {
  it('detects simple two-node cycles (A -> B -> A)', () => {
    const rules: RedirectRule[] = [
      { source: '/alpha', destination: '/beta', permanent: true },
      { source: '/beta', destination: '/alpha', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const cycles = graph.detectCycles();

    expect(cycles.length).toBe(1);
    expect(cycles[0].nodes).toContain('/alpha');
    expect(cycles[0].nodes).toContain('/beta');
  });

  it('detects longer multi-node cycles (A -> B -> C -> A)', () => {
    const rules: RedirectRule[] = [
      { source: '/node-1', destination: '/node-2', permanent: true },
      { source: '/node-2', destination: '/node-3', permanent: true },
      { source: '/node-3', destination: '/node-1', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const cycles = graph.detectCycles();

    expect(cycles.length).toBe(1);
    expect(cycles[0].nodes.length).toBe(4); // ['/node-1', '/node-2', '/node-3', '/node-1']
  });

  it('detects multiple independent cycles', () => {
    const rules: RedirectRule[] = [
      { source: '/c1-a', destination: '/c1-b', permanent: true },
      { source: '/c1-b', destination: '/c1-a', permanent: true },
      { source: '/c2-x', destination: '/c2-y', permanent: true },
      { source: '/c2-y', destination: '/c2-x', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const cycles = graph.detectCycles();

    expect(cycles.length).toBe(2);
  });

  it('detects redirect chains with 2 hops (A -> B -> C)', () => {
    const rules: RedirectRule[] = [
      { source: '/start', destination: '/middle', permanent: true },
      { source: '/middle', destination: '/finish', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const chains = graph.detectChains();

    expect(chains.length).toBe(1);
    expect(chains[0].from).toBe('/start');
    expect(chains[0].to).toBe('/finish');
    expect(chains[0].hops).toBe(2);
    expect(chains[0].path).toEqual(['/start', '/middle', '/finish']);
  });

  it('detects long redirect chains with 3 hops (A -> B -> C -> D)', () => {
    const rules: RedirectRule[] = [
      { source: '/step-1', destination: '/step-2', permanent: true },
      { source: '/step-2', destination: '/step-3', permanent: true },
      { source: '/step-3', destination: '/step-4', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const chains = graph.detectChains();

    const maxChain = chains.find(c => c.from === '/step-1' && c.to === '/step-4');
    expect(maxChain).toBeDefined();
    expect(maxChain!.hops).toBe(3);
    expect(maxChain!.path).toEqual(['/step-1', '/step-2', '/step-3', '/step-4']);
  });

  it('does not report direct 1-hop redirects as chains', () => {
    const rules: RedirectRule[] = [
      { source: '/direct-1', destination: '/direct-target-1', permanent: true },
      { source: '/direct-2', destination: '/direct-target-2', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const chains = graph.detectChains();
    const cycles = graph.detectCycles();

    expect(chains.length).toBe(0);
    expect(cycles.length).toBe(0);
  });

  it('detects self-redirects correctly', () => {
    const rules: RedirectRule[] = [
      { source: '/itself', destination: '/itself', permanent: true },
      { source: '/slash-test/', destination: '/slash-test', permanent: true }
    ];

    const graph = new RedirectGraph(rules);
    const selfRedirects = graph.detectSelfRedirects(rules);

    expect(selfRedirects.length).toBe(2);
  });
});
