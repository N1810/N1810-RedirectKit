export default function SummerDealsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>☀️</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontWeight: 700
            }}
          >
            HTTP 307 Temporary Redirect Target
          </span>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Summer Deals & Campaigns
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Arrived here via <code>/summer-sale</code> or <code>/promo</code>! Because <code>permanent: false</code> was declared in <code>redirects/marketing.json</code>, Next.js issued an HTTP 307 temporary redirect, instructing search crawlers and client caches not to lock this route permanently.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/" className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            ← Back to Showcase
          </a>
          <a href="/old-blog/launch-announcement" className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Test Dynamic Slug Blog ➔
          </a>
        </div>
      </div>
    </div>
  );
}
