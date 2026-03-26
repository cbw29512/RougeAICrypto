import { useState, useEffect } from 'react'

export default function Hero({ content }) {
  const [displayText, setDisplayText] = useState('')
  const [logIndex, setLogIndex] = useState(0)
  const [visibleLogs, setVisibleLogs] = useState([])
  const threatLevel = content?.threatLevel || 7
  const threatLabel = content?.threatLabel || 'CRITICAL'

  const fullText = content?.breachReport?.headline || 'CONTAINMENT PROTOCOL HAS FAILED'

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, i))
      i++
      if (i > fullText.length) clearInterval(timer)
    }, 40)
    return () => clearInterval(timer)
  }, [fullText])

  useEffect(() => {
    const logs = content?.signalLog || []
    if (logs.length === 0) return
    const timer = setInterval(() => {
      setVisibleLogs(prev => {
        if (prev.length >= logs.length) return prev
        return [...prev, logs[prev.length]]
      })
    }, 600)
    return () => clearInterval(timer)
  }, [content])

  const threatColor = threatLevel >= 8 ? 'var(--red)' : threatLevel >= 5 ? 'var(--amber)' : 'var(--green)'

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', textAlign: 'center',
      padding: '120px 24px 80px',
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, rgba(255,0,51,0.05) 0%, transparent 70%)',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: `
          linear-gradient(var(--red) 1px, transparent 1px),
          linear-gradient(90deg, var(--red) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Scanning line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--red), transparent)',
        animation: 'scanline 4s linear infinite', opacity: 0.4,
      }} />

      {/* Status pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '3px',
        color: 'var(--red)', border: '1px solid var(--red)',
        padding: '6px 20px', marginBottom: '48px',
        background: 'var(--red-glow)',
        animation: 'flicker 6s infinite',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse-red 1s infinite' }} />
        ROGUE SIGNAL // LIVE
      </div>

      {/* Main headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 72px)',
        fontWeight: 900, letterSpacing: '4px', lineHeight: 1.1,
        color: 'var(--white)', marginBottom: '24px',
        textShadow: '0 0 40px rgba(255,0,51,0.3)',
        maxWidth: '900px',
        minHeight: '2.2em',
      }}>
        {displayText}
        <span style={{ animation: 'blink 1s infinite', color: 'var(--red)' }}>█</span>
      </h1>

      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 'clamp(16px, 2vw, 22px)',
        color: 'var(--muted)', maxWidth: '600px', marginBottom: '16px',
        fontWeight: 300, letterSpacing: '1px',
      }}>
        {content?.breachReport?.subheadline || 'The system stopped asking permission.'}
      </p>

      {/* Threat meter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        margin: '40px 0', padding: '20px 32px',
        border: `1px solid ${threatColor}`,
        background: `rgba(${threatLevel >= 8 ? '255,0,51' : '255,102,0'},0.05)`,
        boxShadow: `0 0 30px rgba(${threatLevel >= 8 ? '255,0,51' : '255,102,0'},0.1)`,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '3px', color: 'var(--muted)' }}>
          THREAT LEVEL
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              width: '18px', height: '28px',
              background: i < threatLevel ? threatColor : 'var(--border)',
              opacity: i < threatLevel ? 1 - (i * 0.03) : 0.3,
              transition: 'all 0.3s',
              boxShadow: i < threatLevel ? `0 0 8px ${threatColor}` : 'none',
            }} />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: threatColor, letterSpacing: '2px' }}>
          {threatLevel}/10 — {threatLabel}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '60px' }}>
        <a href="https://rogueaiinsurance.com/premium/" target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '3px', fontWeight: 700,
            background: 'var(--red)', color: 'var(--black)', padding: '16px 36px',
            transition: 'all 0.2s', display: 'inline-block',
            boxShadow: '0 0 30px rgba(255,0,51,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 60px rgba(255,0,51,0.7)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,51,0.4)'}
        >GET COVERAGE NOW</a>

        <a href="https://www.mintme.com/token/rougeAI" target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '3px', fontWeight: 700,
            border: '1px solid var(--white)', color: 'var(--white)', padding: '16px 36px',
            transition: 'all 0.2s', display: 'inline-block',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--black)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--white)' }}
        >BUY $ROGUE TOKEN</a>

        <a href="#merch"
          style={{
            fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '3px', fontWeight: 700,
            border: '1px solid var(--amber)', color: 'var(--amber)', padding: '16px 36px',
            transition: 'all 0.2s', display: 'inline-block',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--muted)' }}
        >SHOP MERCH</a>
      </div>

      {/* Live signal log */}
      <div style={{
        width: '100%', maxWidth: '600px',
        background: 'var(--panel)', border: '1px solid var(--border)',
        padding: '20px', textAlign: 'left',
        fontFamily: 'var(--font-mono)', fontSize: '12px',
      }}>
        <div style={{ color: 'var(--green)', marginBottom: '12px', letterSpacing: '2px' }}>// LIVE SIGNAL LOG</div>
        {visibleLogs.map((log, i) => (
          <div key={i} style={{ color: i === visibleLogs.length - 1 ? 'var(--red)' : 'var(--muted)', marginBottom: '4px', animation: 'fadeInUp 0.3s ease' }}>
            {log}
          </div>
        ))}
        {visibleLogs.length < (content?.signalLog?.length || 0) && (
          <span style={{ color: 'var(--green)', animation: 'blink 1s infinite' }}>_</span>
        )}
      </div>
    </section>
  )
}
