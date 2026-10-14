import './globals.css';

export const metadata = {
  title: 'RedirectKit — Next.js Enterprise Redirect Manager',
  description: 'Production-ready, type-safe, declarative redirect engine for Next.js applications.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top navigation */}
          <nav
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'rgba(10, 12, 16, 0.75)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '1rem 2rem'
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  ⇄
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                    RedirectKit
                  </span>
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      fontWeight: 600
                    }}
                  >
                    v0.1.0
                  </span>
                </div>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.95rem' }}>
                <a href="#interactive-tester" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                  Live Redirects
                </a>
                <a href="#quickstart" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                  Quick Start
                </a>
                <a href="#architecture" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                  Architecture
                </a>
                <a
                  href="https://github.com/N1810/N1810-RedirectKit"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  GitHub ↗
                </a>
              </div>
            </div>
          </nav>

          {/* Page Content */}
          <main style={{ flex: 1 }}>{children}</main>

          {/* Footer */}
          <footer
            style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '2.5rem 2rem',
              marginTop: '5rem',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.9rem'
            }}
          >
            <p>
              Built for Next.js 14 & 15. Powered by{' '}
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>RedirectKit</span> engine.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
