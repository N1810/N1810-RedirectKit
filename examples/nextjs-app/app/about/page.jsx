export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🎯</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontWeight: 700
            }}
          >
            HTTP 308 Permanent Redirect Target
          </span>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          About RedirectKit
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You successfully arrived here! If you navigated via <code>/old-about</code>, Next.js intercepted the request at the edge and redirected you cleanly to <code>/about</code> according to <code>redirects/legacy.json</code>.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/" className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            ← Back to Showcase
          </a>
          <a href="/summer-sale" className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Test /summer-sale ➔
          </a>
        </div>
      </div>
    </div>
  );
}
