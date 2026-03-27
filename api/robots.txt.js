import { SITE_ORIGIN } from '../site.config.mjs'

export default function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(`User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
  } catch (error) {
    console.error('[robots] failed to render robots.txt', error)
    res.status(500).send('User-agent: *\nDisallow: /')
  }
}
