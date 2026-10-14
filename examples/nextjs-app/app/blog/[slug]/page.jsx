export default async function BlogPostPage({ params }) {
  const { slug } = await params;

  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          background: 'rgba(99, 102, 241, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📰</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#818cf8',
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontWeight: 700
            }}
          >
            Dynamic Wildcard Match
          </span>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Blog Post: <span style={{ color: '#38bdf8' }}>{slug}</span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          This page caught the dynamic route parameter from <code>/old-blog/{slug}</code>. Parameter mapping (<code>:slug</code>) was extracted and preserved automatically by RedirectKit and Next.js router.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/" className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            ← Back to Showcase
          </a>
        </div>
      </div>
    </div>
  );
}
