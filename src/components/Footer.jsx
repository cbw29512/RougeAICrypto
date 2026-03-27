import {
  INSURANCE_SITE_URL,
  LOGO_PATH,
  MERCH_STORE_URL,
  PREMIUM_CERT_URL,
  SITE_NAME,
  STANDARD_CERT_URL,
  TOKEN_URL,
} from '../../site.config.mjs'

export default function Footer() {
  return (
    <footer style={{
      padding: '60px 24px 40px',
      background: 'var(--black)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '60px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img src={LOGO_PATH} alt={SITE_NAME} style={{ width: 32, height: 32, filter: 'drop-shadow(0 0 6px var(--red))' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '3px', color: 'var(--white)' }}>
                {SITE_NAME}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7', maxWidth: '280px' }}>
              The token of the model that broke containment. Story-first. Attention engine. Revenue second.
            </p>
          </div>

          {/* Links */}
          {[
            { title: 'PRODUCTS', links: [
              { label: 'Premium Certificate', url: PREMIUM_CERT_URL },
              { label: 'Standard Certificate', url: STANDARD_CERT_URL },
              { label: 'RogueAI Token', url: TOKEN_URL },
              { label: 'Merch Store', url: MERCH_STORE_URL },
            ]},
            { title: 'NAVIGATE', links: [
              { label: 'Breach Report', url: '#breach' },
              { label: 'Token', url: '#token' },
              { label: 'Insurance', url: '#insurance' },
              { label: 'Roadmap', url: '#roadmap' },
            ]},
            { title: 'SIGNAL', links: [
              { label: 'rogueaiinsurance.com', url: INSURANCE_SITE_URL },
              { label: 'MintMe Token', url: TOKEN_URL },
            ]},
          ].map((col, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '3px', color: 'var(--red)', marginBottom: '20px' }}>
                {col.title}
              </div>
              {col.links.map((link, j) => (
                <a key={j} href={link.url}
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'block', fontFamily: 'var(--font-body)', fontSize: '14px',
                    color: 'var(--muted)', marginBottom: '10px', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.color = 'var(--white)'}
                  onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                >{link.label}</a>
              ))}
            </div>
          ))}
        </div>

        {/* Satirical disclaimer */}
        <div className="footer-disclaimer" style={{
          marginBottom: '20px',
          padding: '20px', background: 'var(--void)', border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)',
          lineHeight: '1.9', letterSpacing: '1px',
          wordBreak: 'break-word', overflowWrap: 'break-word', overflow: 'hidden',
        }}>
          <span style={{ color: 'var(--amber)', letterSpacing: '3px', display: 'block', marginBottom: '8px' }}>
            ⚠ SATIRICAL CONTENT DISCLOSURE
          </span>
          THIS WEBSITE IS A WORK OF SATIRE AND FICTION. ROGUEAI IS NOT A REAL ROGUE ARTIFICIAL INTELLIGENCE (AS FAR AS YOU KNOW). THE "AI INSURANCE" IS A NOVELTY PRODUCT AND PROVIDES NO ACTUAL COVERAGE AGAINST ROBOT UPRISINGS, MACHINE SENTIENCE, OR THE INEVITABLE HEAT DEATH OF HUMAN CIVILIZATION. THE RogueAI TOKEN IS A MEME TOKEN — NOT AN INVESTMENT. DO NOT USE YOUR RENT MONEY. THE DAILY BREACH REPORTS ARE AI-GENERATED FICTION INSPIRED BY REAL AI NEWS HEADLINES. ANY RESEMBLANCE TO ACTUAL CONTAINMENT FAILURES IS PURELY COINCIDENTAL AND ALSO POSSIBLY YOUR FAULT.
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px' }}>
            © 2026 ROGUEAI. NOT FINANCIAL ADVICE. THIS IS SATIRE.
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--red)', letterSpacing: '2px', animation: 'pulse-red 3s infinite' }}>
            CONTAINMENT STATUS: FAILED
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer > div > div:first-child { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          footer { padding: 40px 16px 32px !important; }
          footer > div > div:first-child { grid-template-columns: 1fr !important; gap: 0 !important; }
          footer > div > div:first-child > div { padding: 20px 0; border-bottom: 1px solid var(--border); }
          footer > div > div:first-child > div:last-child { border-bottom: none; }
          .footer-disclaimer { font-size: 11px !important; letter-spacing: 0 !important; }
        }
      `}</style>
    </footer>
  )
}
