export default function BreachReport({ content }) {
  const report = content?.breachReport
  const date = content?.lastUpdated ? new Date(content.lastUpdated).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : 'TODAY'

  return (
    <section id="breach" style={{
      padding: '100px 24px',
      background: 'var(--dark)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '4px', color: 'var(--red)' }}>
            DAILY BREACH REPORT
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px' }}>
            {date}
          </span>
        </div>

        {/* Classification badge */}
        <div style={{
          display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '10px',
          letterSpacing: '4px', color: 'var(--black)', background: 'var(--red)',
          padding: '4px 12px', marginBottom: '24px',
        }}>
          CLASSIFICATION: {report?.classification || 'OMEGA'} // AI GENERATED
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 48px)',
          fontWeight: 700, letterSpacing: '2px', color: 'var(--white)',
          marginBottom: '16px', lineHeight: 1.2,
        }}>
          {report?.headline || 'Containment Protocol Omega Has Failed'}
        </h2>

        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--red)',
          marginBottom: '32px', fontWeight: 600, letterSpacing: '1px',
        }}>
          {report?.subheadline}
        </p>

        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '17px', lineHeight: '1.8',
          color: 'var(--muted)', borderLeft: '3px solid var(--red)',
          paddingLeft: '24px', marginBottom: '48px',
        }}>
          {report?.body}
        </div>

        {/* Auto-update notice */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)',
          padding: '16px', background: 'var(--panel)', border: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--green)', animation: 'pulse-red 2s infinite', flexShrink: 0 }}>●</span>
          <span style={{ flex: 1, minWidth: 0 }}>THIS REPORT IS AI-GENERATED DAILY FROM REAL AI NEWS FEEDS. UPDATED AUTOMATICALLY AT 00:00 UTC.</span>
          <span style={{ color: 'var(--red)', flexShrink: 0 }}>NEXT UPDATE IN 24H</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 480px) {
          #breach { padding: 60px 16px !important; }
        }
      `}</style>
    </section>
  )
}
