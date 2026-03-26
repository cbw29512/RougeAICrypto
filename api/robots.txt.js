export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send(`User-agent: *
Allow: /
Sitemap: https://www.rogueaicrypto.com/sitemap.xml`)
}
