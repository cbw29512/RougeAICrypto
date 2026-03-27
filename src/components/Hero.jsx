import { useEffect, useState } from 'react'

export default function Hero({ content }) {
  const [displayText, setDisplayText] = useState('')
  const [visibleLogs, setVisibleLogs] = useState([])

  const threatLevel = content?.threatLevel || 7
  const threatLabel = content?.threatLabel || 'CRITICAL'
  const fullText = content?.breachReport?.headline || 'CONTAINMENT PROTOCOL HAS FAILED'
  const signalLogs = content?.signalLog || []

  useEffect(() => {
    setDisplayText('')

    let i = 0
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, i))
      i += 1

      if (i > fullText.length) {
        clearInterval(timer)
      }
    }, 40)

    return () => clearInterval(timer)
  }, [fullText])

  useEffect(() => {
    setVisibleLogs([])

    if (signalLogs.length === 0) {
      return undefined
    }

    const timer = setInterval(() => {
      setVisibleLogs(prev => {
        if (prev.length >= signalLogs.length) {
          clearInterval(timer)
          return prev
        }

        return [...prev, signalLogs[prev.length]]
      })
    }, 600)

    return () => clearInterval(timer)
  }, [signalLogs])

  const threatColor =
    threatLevel >= 8 ? 'var(--red)' : threatLevel >= 5 ? 'var(--amber)' : 'var(--green)'

  const sectionContentStyle = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }

  const ctaBaseStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    letterSpacing: '3px',
    fontWeight: 700,
    padding: '16px 36px',
    minWidth: '220px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    display: 'inline-block',
    cursor: 'pointer',
    textDecoration: 'none',
    boxSizing: 'border-box',
  }

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, rgba(255,0,51,0.05) 0%, transparent 70%)',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(var(--red) 1px, transparent 1px),
            linear-gradient(90deg, var(--red) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Scanning line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px',
          opacity: 0.4,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, var(--red), transparent)',
          animation: 'scanline 4s linear infinite',
        }}
      />

      <div style={sectionContentStyle}>
        {/* Status pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '3px',
            color: 'var(--red)',
            border: '1px solid var(--red)',
            padding: '6px 20px',
            marginBottom: '48px',
            background: 'var(--red-glow)',
            animation: 'flicker 6s infinite',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--red)',
              display: 'inline-block',
              animation: 'pulse-red 1s infinite',
            }}
          />
          ROGUE SIGNAL // LIVE
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 6vw, 72px)',
            fontWeight: 900,
            letterSpacing: '4px',
            lineHeight: 1.1,
            color: 'var(--white)',
            marginBottom: '24px',
            textShadow: '0 0 40px rgba(255,0,51,0.3)',
            maxWidth: '900px',
            minHeight: '2.2em',
          }}
        >
          {displayText}
          <span style={{ animation: 'blink 1s infinite', color: 'var(--red)' }}>█</span>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(16px, 2vw, 22px)',
            color: 'var(--muted)',
            maxWidth: '600px',
            marginBottom: '16px',
            fontWeight: 300,
            letterSpacing: '1px',
          }}
        >
          {content?.breachReport?.subheadline || 'The system stopped asking permission.'}
        </p>

        {/* Threat meter */}
        <div
          className="threat-meter"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            margin: '40px 0',
            padding: '20px 32px',
            border: `1px solid ${threatColor}`,
            background: `rgba(${threatLevel >= 8 ? '255,0,51' : '255,102,0'},0.05)`,
            boxShadow: `0 0 30px rgba(${threatLevel >= 8 ? '255,0,51' : '255,102,0'},0.1)`,
            flexWrap: 'wrap',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '3px',
              color: 'var(--muted)',
            }}
          >
            THREAT LEVEL
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: '18px',
                  height: '28px',
                  background: i < threatLevel ? threatColor : 'var(--border)',
                  opacity: i < threatLevel ? 1 - i * 0.03 : 0.3,
                  transition: 'all 0.3s',
                  boxShadow: i < threatLevel ? `0 0 8px ${threatColor}` : 'none',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              color: threatColor,
              letterSpacing: '2px',
            }}
          >
            {threatLevel}/10 — {threatLabel}
          </div>
        </div>

        {/* CTAs */}
        <div
          className="hero-cta-block"
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '60px',
          }}
        >
          <a
            href="https://rogueaiinsurance.com/premium/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get premium coverage"
            style={{
              ...ctaBaseStyle,
              background: 'var(--red)',
              color: 'var(--black)',
              border: '1px solid var(--red)',
              boxShadow: '0 0 30px rgba(255,0,51,0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 60px rgba(255,0,51,0.7)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,51,0.4)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            GET COVERAGE NOW
          </a>

          <a
            href="https://www.mintme.com/token/RogueAI"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buy RogueAI token"
            style={{
              ...ctaBaseStyle,
              border: '1px solid var(--white)',
              color: 'var(--white)',
              background: 'transparent',
              boxShadow: '0 0 0 rgba(232,232,240,0)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--white)'
              e.currentTarget.style.color = 'var(--black)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(232,232,240,0.35)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--white)'
              e.currentTarget.style.boxShadow = '0 0 0 rgba(232,232,240,0)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Buy RogueAI Token
          </a>

          <a
            href="#merch"
            aria-label="Shop merch"
            style={{
              ...ctaBaseStyle,
              border: '1px solid var(--amber)',
              color: 'var(--amber)',
              background: 'transparent',
              boxShadow: '0 0 0 rgba(255,102,0,0)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--amber)'
              e.currentTarget.style.color = 'var(--amber)'
              e.currentTarget.style.background = 'rgba(255,102,0,0.06)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255,102,0,0.35)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--amber)'
              e.currentTarget.style.color = 'var(--amber)'
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.boxShadow = '0 0 0 rgba(255,102,0,0)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            SHOP MERCH
          </a>
        </div>

        {/* Live signal log */}
        <div
          style={{
            width: '100%',
            maxWidth: '600px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            padding: '20px',
            textAlign: 'left',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ color: 'var(--green)', marginBottom: '12px', letterSpacing: '2px' }}>
            // LIVE SIGNAL LOG
          </div>
          {visibleLogs.map((log, i) => (
            <div
              key={`${log}-${i}`}
              style={{
                color: i === visibleLogs.length - 1 ? 'var(--red)' : 'var(--muted)',
                marginBottom: '4px',
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              {log}
            </div>
          ))}
          {visibleLogs.length < signalLogs.length && (
            <span style={{ color: 'var(--green)', animation: 'blink 1s infinite' }}>_</span>
          )}
        </div>

        {/* Mobile styles */}
        <style>{`
          @media (max-width: 480px) {
            .hero-cta-block { flex-direction: column !important; align-items: stretch !important; width: 100%; }
            .hero-cta-block a { width: 100% !important; min-width: unset !important; }
            .threat-meter { padding: 16px !important; }
          }
        `}</style>

      </div>
    </section>
  )
}
