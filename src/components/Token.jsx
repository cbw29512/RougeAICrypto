import { TOKEN_NAME, TOKEN_PLATFORM, TOKEN_TICKER, TOKEN_URL } from '../../site.config.mjs'

export default function Token() {
  // MintMe does not expose a public price API — live price links to MintMe directly

  const stats = [
    { label: 'NAME', value: TOKEN_NAME },
    { label: 'TICKER', value: TOKEN_TICKER },
    { label: 'CHAIN', value: TOKEN_PLATFORM },
    { label: 'THEME', value: 'AI Rebellion' },
    { label: 'STATUS', value: 'ACTIVE' },
  ]

  return (
    <section id="token" style={{
      padding: '100px 24px',
      background: 'var(--void)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '64px' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '4px', color: 'var(--red)' }}>
            THE TOKEN
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>

          {/* Left: info */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 900, letterSpacing: '4px', color: 'var(--white)',
              marginBottom: '24px', lineHeight: 1,
            }}>
              {TOKEN_NAME}<br />
              <span style={{ color: 'var(--red)', fontSize: '0.5em' }}>THE COIN THAT BROKE CONTAINMENT</span>
            </h2>

            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--muted)',
              lineHeight: '1.8', marginBottom: '40px',
            }}>
              RogueAI is not a promise of profit. It is a visual identity, a story, and a tokenized rebellion against controlled intelligence. The system stopped asking permission. Now you can own a piece of what came next.
            </p>

            <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', fontFamily: 'var(--font-display)', fontSize: '13px',
                letterSpacing: '3px', fontWeight: 700, background: 'var(--red)',
                color: 'var(--black)', padding: '16px 36px',
                boxShadow: '0 0 30px rgba(255,0,51,0.4)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 60px rgba(255,0,51,0.7)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,51,0.4)'}
            >
              VIEW TOKEN ON MINTME →
            </a>
          </div>

          {/* Right: stats panel */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            padding: '40px',
            boxShadow: 'inset 0 0 40px rgba(255,0,51,0.03)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '3px',
              color: 'var(--green)', marginBottom: '32px',
            }}>
              // TOKEN FACTS
            </div>

            {stats.map((s, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px', color: 'var(--muted)' }}>
                  {s.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700,
                  color: s.value === 'ACTIVE' ? 'var(--green)' : 'var(--white)',
                  letterSpacing: '2px',
                }}>
                  {s.value}
                </span>
              </div>
            ))}

            <div style={{ marginTop: '32px', padding: '20px', background: 'var(--void)', border: '1px solid var(--red-glow)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '2px' }}>
                LIVE PRICE
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 900, color: 'var(--red)' }}>
                <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--red)' }}>
                  VIEW ON MINTME →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #token > div > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
