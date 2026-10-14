import InteractiveRedirectTester from './InteractiveRedirectTester';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3rem 0 4rem 0' }}>
        <div
          className="gradient-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}
        >
          <span>🚀</span> Production-Ready Next.js Redirect Engine
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem'
          }}
        >
          Manage Next.js Redirects <br />
          <span className="gradient-text">Without Config Chaos</span>
        </h1>

        <p
          style={{
            maxWidth: '700px',
            margin: '0 auto 2.5rem auto',
            fontSize: '1.2rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}
        >
          Split redirects into clean modular JSON files, detect redirect chains & cycles at build time,
          and seamlessly integrate with Next.js App Router and Pages Router.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="#interactive-tester" className="btn-primary">
            Explore Interactive Demo ↓
          </a>
          <a href="#quickstart" className="btn-secondary">
            View Setup Guide
          </a>
        </div>
      </section>

      {/* Feature Value Props Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>📁</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Modular Directory Architecture</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Never edit a 5,000-line monolithic <code>next.config.js</code> again. Organize rules by domain, campaign, or marketing squad in <code>redirects/*.json</code>.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>🛡️</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automated Chain & Cycle Guard</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Detects A ➔ B ➔ C chains and fatal infinite redirect loops at build time before deployment breaks your site ranking and SEO.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Zero Runtime Overhead</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Compiles directly down to native Next.js router rules. Runs natively at the edge on Vercel, Cloudflare, or standard Node.js servers.
          </p>
        </div>
      </section>

      {/* Interactive Live Testing Component */}
      <InteractiveRedirectTester />

      {/* Step-by-Step Installation & Quickstart */}
      <section id="quickstart" style={{ marginTop: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Get Started in 60 Seconds
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Drop into any Next.js 14 or 15 project with a single wrapper function.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {/* Step 1 */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                1
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Install Package</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Add RedirectKit to your package dependencies using your preferred package manager:
            </p>
            <div className="code-container">
              <code>pnpm add redirectkit</code>
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                2
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Wrap next.config.mjs</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Import <code>withRedirects</code> and export your Next config:
            </p>
            <div className="code-container">
              <pre>{`import { withRedirects } from 'redirectkit/next';

const nextConfig = {
  reactStrictMode: true
};

export default withRedirects(nextConfig);`}</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                3
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create Modular JSON Rules</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Store rules in <code>redirects/*.json</code>. Example <code>redirects/marketing.json</code>:
            </p>
            <div className="code-container">
              <pre>{`[
  {
    "source": "/summer-sale",
    "destination": "/deals/summer",
    "permanent": false
  }
]`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section id="architecture" style={{ marginTop: '5rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '1rem' }}>
              How RedirectKit Works Under the Hood
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              During <code>next build</code> or <code>next dev</code>, <strong>RedirectKit</strong> loads all JSON redirect definitions from your project directory, parses them with type checking, builds a directed dependency graph, checks for loops and multihop chains, and compiles them directly into Next.js native routing manifest.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ padding: '0.75rem 1rem', background: '#0a0d14', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                📂 redirects/*.json
              </div>
              <span style={{ color: '#6366f1' }}>➔</span>
              <div style={{ padding: '0.75rem 1rem', background: '#0a0d14', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                🛡️ Validation & DAG Graph
              </div>
              <span style={{ color: '#6366f1' }}>➔</span>
              <div style={{ padding: '0.75rem 1rem', background: '#0a0d14', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                ⚡ Next.js Manifest (Edge CDN)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
