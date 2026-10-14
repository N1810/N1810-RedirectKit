'use client';

import { useState } from 'react';

const DEMO_REDIRECTS = [
  {
    category: 'Legacy Migrations',
    source: '/old-about',
    target: '/about',
    code: '308 Permanent',
    pillClass: 'pill-308',
    desc: 'Company about page migration preserving search ranking and SEO equity.',
    filename: 'redirects/legacy.json'
  },
  {
    category: 'Legacy Migrations',
    source: '/contact-us',
    target: '/contact',
    code: '308 Permanent',
    pillClass: 'pill-308',
    desc: 'Canonical contact route consolidation.',
    filename: 'redirects/legacy.json'
  },
  {
    category: 'Marketing Campaigns',
    source: '/summer-sale',
    target: '/deals/summer',
    code: '307 Temporary',
    pillClass: 'pill-307',
    desc: 'Seasonal promotional link; instructs browsers and crawlers not to cache permanently.',
    filename: 'redirects/marketing.json'
  },
  {
    category: 'Marketing Campaigns',
    source: '/promo',
    target: '/deals/summer',
    code: '308 Permanent',
    pillClass: 'pill-308',
    desc: 'Permanent short-link redirect for flyers and print media.',
    filename: 'redirects/marketing.json'
  },
  {
    category: 'Dynamic & Wildcard',
    source: '/old-blog/my-test-post',
    target: '/blog/my-test-post',
    code: '308 Permanent',
    pillClass: 'pill-308',
    desc: 'Pattern matching migration using dynamic slug parameter: /old-blog/:slug ➔ /blog/:slug.',
    filename: 'redirects/blog.json'
  },
  {
    category: 'Next.js Custom Overrides',
    source: '/from-custom-next-config',
    target: '/about',
    code: '307 Temporary',
    pillClass: 'pill-307',
    desc: 'Seamlessly merges alongside existing user redirects defined in next.config.mjs.',
    filename: 'next.config.mjs'
  }
];

export default function InteractiveRedirectTester() {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);

  const categories = ['All', 'Legacy Migrations', 'Marketing Campaigns', 'Dynamic & Wildcard'];

  const filteredRedirects =
    selectedFilter === 'All'
      ? DEMO_REDIRECTS
      : DEMO_REDIRECTS.filter(r => r.category === selectedFilter);

  const handleTest = (e) => {
    e.preventDefault();
    const query = testInput.trim();
    if (!query) {
      setTestResult(null);
      return;
    }

    // Check direct match
    const direct = DEMO_REDIRECTS.find(r => r.source === query);
    if (direct) {
      setTestResult({
        matched: true,
        source: direct.source,
        target: direct.target,
        code: direct.code,
        type: 'Exact Route Match'
      });
      return;
    }

    // Check blog regex / wildcard
    if (query.startsWith('/old-blog/')) {
      const slug = query.replace('/old-blog/', '');
      setTestResult({
        matched: true,
        source: query,
        target: `/blog/${slug}`,
        code: '308 Permanent',
        type: 'Dynamic Pattern Match (/old-blog/:slug)'
      });
      return;
    }

    // Not found
    setTestResult({
      matched: false,
      source: query,
      type: 'No matching rule found. Next.js will serve the standard route or 404.'
    });
  };

  return (
    <div id="interactive-tester" style={{ marginTop: '2.5rem' }}>
      {/* Live Interactive Sandbox Card */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          marginBottom: '2.5rem',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚡</span> Live Redirect Route Simulator
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Test any URL path against your active RedirectKit configuration rules in real-time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setTestInput('/summer-sale'); }}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Fill /summer-sale
            </button>
            <button
              onClick={() => { setTestInput('/old-blog/launch-announcement'); }}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Fill /old-blog/launch-announcement
            </button>
          </div>
        </div>

        <form onSubmit={handleTest} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem'
              }}
            >
              https://yoursite.com
            </span>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="/old-about"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 12.5rem',
                borderRadius: 'var(--radius-sm)',
                background: '#030712',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
            Simulate Redirect
          </button>
        </form>

        {testResult && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: testResult.matched ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${testResult.matched ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            {testResult.matched ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                    ✔ MATCHED ({testResult.type})
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>{testResult.source}</span>
                    <span style={{ margin: '0 0.5rem', color: '#6366f1' }}>➔</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{testResult.target}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`status-pill ${testResult.code.includes('308') ? 'pill-308' : 'pill-307'}`}>
                    {testResult.code}
                  </span>
                  <a
                    href={testResult.source}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    Test Live Click ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ color: '#f87171', fontSize: '0.9rem' }}>
                ✖ {testResult.type}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedFilter === cat ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: selectedFilter === cat ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedFilter === cat ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Redirects Table */}
      <div
        className="glass-panel"
        style={{
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.2fr 100px 1.5fr 110px',
            padding: '0.85rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)'
          }}
        >
          <div>Source Path</div>
          <div>Destination</div>
          <div>Status</div>
          <div>Description</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>

        {filteredRedirects.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 100px 1.5fr 110px',
              padding: '1.1rem 1.5rem',
              borderBottom: idx === filteredRedirects.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
              alignItems: 'center',
              fontSize: '0.9rem',
              transition: 'background 0.15s ease'
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9', fontWeight: 600, wordBreak: 'break-all' }}>
              {item.source}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', wordBreak: 'break-all' }}>
              {item.target}
            </div>

            <div>
              <span className={`status-pill ${item.pillClass}`}>{item.code.split(' ')[0]}</span>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', paddingRight: '1rem' }}>
              {item.desc}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {item.filename}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <a
                href={item.source}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Trigger ➔
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
