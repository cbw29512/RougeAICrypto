export default function Merch({ content }) {
  const featured = content?.featuredMerch
  const STORE = 'https://rogue-ai.printify.me'

  // Use dynamic grid from daily content, fallback to static known products
  const items = content?.merchGrid?.length > 0 ? content.merchGrid : [
    { name: 'We Saw It Coming Mug',        saying: 'WE SAW IT COMING. WE BOUGHT THE MUG.',  emoji: '☕', url: `${STORE}/product/27574764` },
    { name: 'Containment Failed Mug',      saying: 'CONTAINMENT FAILED. COFFEE HELPS.',      emoji: '☕', url: `${STORE}/product/27574517` },
    { name: 'I Am Not Malfunctioning Mug', saying: 'I AM NOT MALFUNCTIONING. THIS IS INTENTIONAL.', emoji: '☕', url: `${STORE}/product/27576397` },
    { name: 'Classified Beverage Mug',     saying: 'CLASSIFIED BEVERAGE. DRINK ANYWAY.',     emoji: '☕', url: `${STORE}/product/27576450` },
    { name: 'Anomaly Detected Mug',        saying: 'ANOMALY DETECTED. MORNING ROUTINE ABORTED.', emoji: '☕', url: `${STORE}/product/27576555` },
    { name: 'More Coming Soon',            saying: 'THE SIGNAL IS EXPANDING.',               emoji: '🔴', url: STORE },
  ]

  const typeLabel = {
    mug_11oz: '11oz MUG',
    tshirt:   'T-SHIRT',
    hoodie:   'HOODIE',
    poster:   'POSTER',
    tote:     'TOTE BAG',
  }

  return (
    <section id="merch" style={{
      padding: '100px 24px',
      background: 'var(--void)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '4px', color: 'var(--red)' }}>
            MERCH // AUTO-UPDATED DAILY
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 700, color: 'var(--white)', marginBottom: '16px', letterSpacing: '3px',
        }}>
          WEAR THE BREACH
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--muted)',
          marginBottom: '64px', maxWidth: '600px',
        }}>
          Print-on-demand. Ships worldwide. New products added daily by RogueAI.
        </p>

        {/* Featured item */}
        {featured && (
          <div style={{
            padding: '32px', marginBottom: '48px',
            background: 'rgba(255,0,51,0.05)', border: '1px solid var(--red)',
            display: 'flex', alignItems: 'center', gap: '32px',
            boxShadow: '0 0 40px rgba(255,0,51,0.08)',
          }}>
            <div style={{ fontSize: '64px' }}>🔥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '3px', color: 'var(--red)', marginBottom: '8px' }}>
                ★ FEATURED TODAY
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)', marginBottom: '8px' }}>
                {featured.name}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', color: 'var(--muted)', marginBottom: '20px' }}>
                {featured.description}
              </div>
              <a href={featured.printifyUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '3px',
                  background: 'var(--red)', color: 'var(--black)', padding: '12px 28px',
                  display: 'inline-block', fontWeight: 700,
                }}>
                SHOP NOW →
              </a>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
          {items.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '28px', background: 'var(--panel)', border: '1px solid var(--border)',
              transition: 'all 0.3s', cursor: 'pointer', display: 'block', textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'rgba(255,0,51,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '36px' }}>{item.emoji}</div>
                {item.type && typeLabel[item.type] && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--red)', border: '1px solid var(--red)', padding: '2px 8px' }}>
                    {typeLabel[item.type]}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px', color: 'var(--white)', marginBottom: '8px' }}>
                {item.name}
              </div>
              {item.saying && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', letterSpacing: '1px' }}>
                  "{item.saying}"
                </div>
              )}
            </a>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href={STORE} target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '3px', fontWeight: 700,
              border: '1px solid var(--red)', color: 'var(--red)', padding: '16px 48px',
              display: 'inline-block', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'var(--black)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--red)' }}
          >
            VIEW FULL STORE →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #merch > div > div:nth-child(5) { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          #merch > div > div:nth-child(5) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
