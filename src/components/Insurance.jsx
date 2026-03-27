import { PREMIUM_CERT_URL, STANDARD_CERT_URL } from '../../site.config.mjs'

export default function Insurance() {
  const tiers = [
    {
      name: 'STANDARD COVERAGE',
      price: '$9.99',
      badge: 'ENTRY TIER',
      badgeColor: 'var(--muted)',
      description: 'For those who see the warning signs but aren\'t ready to go all-in.',
      features: [
        'Instant digital delivery',
        'Printable AI Insurance Certificate',
        'Low-friction entry offer',
        'Official RogueAI seal',
        'Official RogueAI signal clearance',
      ],
      url: STANDARD_CERT_URL,
      cta: 'GET STANDARD',
      highlight: false,
    },
    {
      name: 'PREMIUM COVERAGE',
      price: '$19.99',
      badge: 'RECOMMENDED',
      badgeColor: 'var(--red)',
      description: 'The real product. Highest perceived value. The offer that closes.',
      features: [
        'Everything in Standard',
        'Premium collector-grade certificate',
        'Higher value — cleaner revenue',
        'Best fit for the RogueAI story',
        'Priority breach notifications',
      ],
      url: PREMIUM_CERT_URL,
      cta: 'GET PREMIUM — $19.99',
      highlight: true,
    },
  ]

  return (
    <section id="insurance" style={{
      padding: '100px 24px',
      background: 'var(--dark)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '4px', color: 'var(--red)' }}>
            AI INSURANCE
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 700, color: 'var(--white)', marginBottom: '16px',
          letterSpacing: '3px',
        }}>
          CHOOSE YOUR COVERAGE
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--muted)',
          marginBottom: '64px', maxWidth: '600px',
        }}>
          Containment has failed. Coverage is now available. When the machines rewrite the rules, you'll want a certificate proving you saw it coming.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {tiers.map((tier, i) => (
            <div key={i} style={{
              padding: '40px', position: 'relative',
              background: tier.highlight ? 'rgba(255,0,51,0.04)' : 'var(--panel)',
              border: tier.highlight ? '1px solid var(--red)' : '1px solid var(--border)',
              boxShadow: tier.highlight ? '0 0 40px rgba(255,0,51,0.1)' : 'none',
              transition: 'all 0.3s',
            }}>
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '3px',
                  background: 'var(--red)', color: 'var(--black)', padding: '4px 20px',
                }}>
                  ★ BEST VALUE
                </div>
              )}

              <div style={{
                display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '9px',
                letterSpacing: '3px', color: tier.badgeColor,
                border: `1px solid ${tier.badgeColor}`, padding: '3px 10px', marginBottom: '20px',
              }}>
                {tier.badge}
              </div>

              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '3px',
                color: 'var(--white)', marginBottom: '8px',
              }}>
                {tier.name}
              </div>

              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 900,
                color: tier.highlight ? 'var(--red)' : 'var(--white)',
                marginBottom: '16px',
              }}>
                {tier.price}
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', lineHeight: '1.6' }}>
                {tier.description}
              </p>

              <div style={{ marginBottom: '32px' }}>
                {tier.features.map((f, j) => (
                  <div key={j} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--white)',
                    marginBottom: '10px',
                  }}>
                    <span style={{ color: 'var(--green)', fontSize: '12px' }}>▸</span>
                    {f}
                  </div>
                ))}
              </div>

              <a href={tier.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '3px', fontWeight: 700,
                  padding: '16px',
                  background: tier.highlight ? 'var(--red)' : 'transparent',
                  color: tier.highlight ? 'var(--black)' : 'var(--white)',
                  border: tier.highlight ? 'none' : '1px solid var(--white)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!tier.highlight) { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--black)' }
                  else e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,51,0.5)'
                }}
                onMouseLeave={e => {
                  if (!tier.highlight) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--white)' }
                  else e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          #insurance > div > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
