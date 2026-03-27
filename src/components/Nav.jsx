import { useState, useEffect } from 'react'
import { LOGO_PATH, SITE_NAME, TOKEN_URL } from '../../site.config.mjs'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'BREACH', href: '#breach' },
    { label: 'TOKEN', href: '#token' },
    { label: 'INSURANCE', href: '#insurance' },
    { label: 'MERCH', href: '#merch' },
    { label: 'CONSPIRACY', href: '#conspiracy' },
    { label: 'ROADMAP', href: '#roadmap' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      padding: '16px 32px',
      background: scrolled ? 'rgba(5,5,8,0.95)' : 'transparent',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      transition: 'all 0.3s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={LOGO_PATH} alt={SITE_NAME} style={{ width: 36, height: 36, filter: 'drop-shadow(0 0 8px var(--red))' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '3px', color: 'var(--white)' }}>
          {SITE_NAME}
        </span>
      </a>

      {/* Desktop links */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }} className="desktop-nav">
        {links.map(l => (
          <a key={l.label} href={l.href} style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px',
            color: 'var(--muted)', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.target.style.color = 'var(--red)'}
          onMouseLeave={e => e.target.style.color = 'var(--muted)'}
          >{l.label}</a>
        ))}
        <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px',
            color: 'var(--red)', border: '1px solid var(--red)', padding: '6px 16px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.background = 'var(--red)'; e.target.style.color = 'var(--black)' }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--red)' }}
        >BUY RogueAI</a>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="mobile-menu-btn"
        style={{
          display: 'none', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '8px', flexDirection: 'column',
          gap: '5px', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {[0,1,2].map(i => (
          <span key={i} style={{
            display: 'block', width: '22px', height: '1px',
            background: menuOpen ? 'var(--red)' : 'var(--white)',
            transition: 'all 0.2s',
            transform: menuOpen
              ? i === 0 ? 'rotate(45deg) translate(4px, 4px)'
              : i === 2 ? 'rotate(-45deg) translate(4px, -4px)'
              : 'scaleX(0)'
              : 'none',
          }} />
        ))}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '65px', left: 0, right: 0,
          background: 'rgba(5,5,8,0.98)', borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(10px)', padding: '24px 32px',
          display: 'flex', flexDirection: 'column', gap: '20px',
          zIndex: 999,
        }} className="mobile-dropdown">
          {links.map(l => (
            <a key={l.label} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '3px',
                color: 'var(--muted)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--red)'}
              onMouseLeave={e => e.target.style.color = 'var(--muted)'}
            >{l.label}</a>
          ))}
          <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '2px',
              color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 20px',
              textAlign: 'center', transition: 'all 0.2s', marginTop: '8px',
            }}
          >BUY RogueAI</a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
