import type { RedirectChain, RedirectCycle, RedirectRule } from './types.js';

/**
 * Normalizes a URL path for static graph analysis.
 * - Strips trailing slashes (except root '/')
 * - Trims whitespace
 */
export function normalizePath(p: string): string {
  if (!p) return '';
  const trimmed = p.trim();
  if (trimmed === '/') return '/';
  // If external URL, don't strip trailing slash aggressively
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Determines whether a route is a literal static path
 * (does not contain Next.js pattern placeholders like :param, *, +, ? or regex).
 */
export function isLiteralPath(pattern: string): boolean {
  if (!pattern) return false;
  // External URLs are not internal routes
  if (/^(?:https?:)?\/\//i.test(pattern)) return false;
  return !/[:*+?()]/.test(pattern);
}

interface GraphEdge {
  to: string;
  rule: RedirectRule;
}

/**
 * Builds and analyzes a directed graph of static literal redirect paths.
 */
export class RedirectGraph {
  private adjacency = new Map<string, GraphEdge[]>();
  private allNodes = new Set<string>();

  constructor(rules: RedirectRule[] = []) {
    this.build(rules);
  }

  /**
   * Builds the graph from rules.
   * Only includes rules where source is a literal static path.
   */
  public build(rules: RedirectRule[]): void {
    this.adjacency.clear();
    this.allNodes.clear();

    for (const rule of rules) {
      if (!rule.source || !rule.destination) continue;
      // If the rule has conditions (has/missing), static loop analysis may not strictly apply,
      // but unconditional or default rules definitely do.
      if (!isLiteralPath(rule.source)) continue;

      const from = normalizePath(rule.source);
      const to = normalizePath(rule.destination);

      this.allNodes.add(from);
      if (isLiteralPath(to)) {
        this.allNodes.add(to);
      }

      if (!this.adjacency.has(from)) {
        this.adjacency.set(from, []);
      }
      this.adjacency.get(from)!.push({ to, rule });
    }
  }

  /**
   * Detects self-redirects (e.g. /a -> /a).
   */
  public detectSelfRedirects(rules: RedirectRule[]): RedirectRule[] {
    const selfRedirects: RedirectRule[] = [];
    for (const rule of rules) {
      if (!rule.source || !rule.destination) continue;
      if (normalizePath(rule.source) === normalizePath(rule.destination)) {
        selfRedirects.push(rule);
      }
    }
    return selfRedirects;
  }

  /**
   * Detects redirect cycles (e.g. A -> B -> A, A -> B -> C -> A)
   * using DFS cycle detection.
   */
  public detectCycles(): RedirectCycle[] {
    const cycles: RedirectCycle[] = [];
    const visited = new Map<string, 0 | 1 | 2>(); // 0: unvisited, 1: visiting, 2: visited
    const parentEdge = new Map<string, { from: string; rule: RedirectRule }>();
    const seenCycleSignatures = new Set<string>();

    for (const node of this.allNodes) {
      visited.set(node, 0);
    }

    const dfs = (current: string, currentPath: string[]) => {
      visited.set(current, 1);
      const edges = this.adjacency.get(current) || [];

      for (const edge of edges) {
        // Self loops are handled by detectSelfRedirects separately
        if (edge.to === current) continue;

        if (!this.allNodes.has(edge.to)) continue;

        const state = visited.get(edge.to) ?? 0;

        if (state === 1) {
          // Found cycle!
          const cyclePath: string[] = [];
          const cycleRules: RedirectRule[] = [edge.rule];

          const cycleStartIndex = currentPath.indexOf(edge.to);
          if (cycleStartIndex !== -1) {
            const subPath = currentPath.slice(cycleStartIndex);
            cyclePath.push(...subPath, edge.to);

            // Reconstruct rules in sequence
            for (let i = 0; i < subPath.length - 1; i++) {
              const u = subPath[i];
              const v = subPath[i + 1];
              const uEdges = this.adjacency.get(u) || [];
              const matched = uEdges.find(e => e.to === v);
              if (matched) cycleRules.unshift(matched.rule);
            }

            // Canonical signature to avoid duplicate cycles from different start nodes
            const normalizedNodes = cyclePath.slice(0, -1);
            const minIndex = normalizedNodes.indexOf(
              [...normalizedNodes].sort()[0]
            );
            const rotated = [
              ...normalizedNodes.slice(minIndex),
              ...normalizedNodes.slice(0, minIndex)
            ];
            const sig = rotated.join(' -> ');

            if (!seenCycleSignatures.has(sig)) {
              seenCycleSignatures.add(sig);
              cycles.push({
                nodes: cyclePath,
                rules: cycleRules
              });
            }
          }
        } else if (state === 0) {
          parentEdge.set(edge.to, { from: current, rule: edge.rule });
          dfs(edge.to, [...currentPath, edge.to]);
        }
      }

      visited.set(current, 2);
    };

    for (const node of this.allNodes) {
      if ((visited.get(node) ?? 0) === 0) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  /**
   * Detects redirect chains (e.g. A -> B -> C where hops >= 2).
   */
  public detectChains(): RedirectChain[] {
    const chains: RedirectChain[] = [];
    const seenChains = new Set<string>();

    for (const startNode of this.allNodes) {
      const edges = this.adjacency.get(startNode) || [];
      for (const firstEdge of edges) {
        if (firstEdge.to === startNode) continue; // self loop

        const pathNodes = [startNode, firstEdge.to];
        const pathRules = [firstEdge.rule];
        const visitedInPath = new Set<string>(pathNodes);

        let curr = firstEdge.to;

        while (this.adjacency.has(curr) && (this.adjacency.get(curr)?.length ?? 0) > 0) {
          const nextEdges = this.adjacency.get(curr)!;
          // Pick the first non-cyclical edge
          const nextEdge = nextEdges.find(e => !visitedInPath.has(e.to));
          if (!nextEdge) break;

          pathNodes.push(nextEdge.to);
          pathRules.push(nextEdge.rule);
          visitedInPath.add(nextEdge.to);
          curr = nextEdge.to;
        }

        if (pathNodes.length >= 3) {
          const sig = `${pathNodes[0]} -> ${pathNodes[pathNodes.length - 1]}`;
          if (!seenChains.has(sig)) {
            seenChains.add(sig);
            chains.push({
              from: pathNodes[0],
              to: pathNodes[pathNodes.length - 1],
              hops: pathNodes.length - 1,
              path: pathNodes,
              rules: pathRules
            });
          }
        }
      }
    }

    return chains;
  }
}
