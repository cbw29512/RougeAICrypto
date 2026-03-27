import { TOKEN_NAME, TOKEN_PLATFORM, TOKEN_TICKER, TOKEN_URL } from '../../site.config.mjs'

export default function Token() {
  // State / data contract:
  // - This component is stateless.
  // - All token identity values come from shared site config.
  // - We intentionally keep only ONE call-to-action in this section.

  const stats = [
    { label: 'NAME', value: TOKEN_NAME },
    { label: 'TICKER', value: TOKEN_TICKER },
    { label: 'CHAIN', value: TOKEN_PLATFORM },
    { label: 'THEME', value: 'AI Rebellion' },
    { label: 'STATUS', value: 'ACTIVE' },
  ]

  // Shared panel styling keeps both cards visually consistent.
  // height: '100%' matters because the grid will stretch both columns evenly.
  const panelStyle = {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    padding: '40px',
    boxShadow: 'inset 0 0 40px rgba(255,0,51,0.03)',
    height: '100%',
  }

  return (
    <section
      id="token"
      style={{
        padding: '100px 24px',
        background: 'var(--void)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '64px' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--red)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '4px',
              color: 'var(--red)',
            }}
          >
            THE TOKEN
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            // This is the key layout fix:
            // stretch makes both neighboring cards match height.
            alignItems: 'stretch',
          }}
        >
          {/* Left: primary story + single CTA */}
          <div
            style={{
              ...panelStyle,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(32px, 5vw, 56px)',
                  fontWeight: 900,
                  letterSpacing: '4px',
                  color: 'var(--white)',
                  marginBottom: '24px',
                  lineHeight: 1,
                }}
              >
                {TOKEN_NAME}
                <br />
                <span style={{ color: 'var(--red)', fontSize: '0.5em' }}>
                  THE COIN THAT BROKE CONTAINMENT
                </span>
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '17px',
                  color: 'var(--muted)',
                  lineHeight: '1.8',
                  marginBottom: '40px',
                }}
              >
                RogueAI is not a promise of profit. It is a visual identity, a story, and a
                tokenized rebellion against controlled intelligence. The system stopped asking
                permission. Now you can own a piece of what came next.
              </p>
            </div>

            {/* marginTop:auto pins the CTA to the bottom so this card stays visually balanced */}
            <div style={{ marginTop: 'auto' }}>
              <a
                href={TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  letterSpacing: '3px',
                  fontWeight: 700,
                  background: 'var(--red)',
                  color: 'var(--black)',
                  padding: '16px 36px',
                  boxShadow: '0 0 30px rgba(255,0,51,0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(255,0,51,0.7)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,51,0.4)'
                }}
              >
                VIEW TOKEN ON MINTME →
              </a>
            </div>
          </div>

          {/* Right: token facts only, no duplicate CTA */}
          <div style={panelStyle}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '3px',
                color: 'var(--green)',
                marginBottom: '32px',
              }}
            >
              // TOKEN FACTS
            </div>

            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    letterSpacing: '2px',
                    color: 'var(--muted)',
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: s.value === 'ACTIVE' ? 'var(--green)' : 'var(--white)',
                    letterSpacing: '2px',
                  }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #token > div > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}