// RogueAI Daily Content + Merch Pipeline
// Runs via GitHub Actions every night at midnight UTC
// Generates content, creates full product line on Printify, updates website

import fetch from 'node-fetch'
import Parser from 'rss-parser'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT     = path.join(__dirname, '..', 'public', 'daily-content.json')
const CONFIG     = path.join(__dirname, 'printify-config.json')
const HISTORY    = path.join(__dirname, 'product-history.json')

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const PRINTIFY_KEY  = process.env.PRINTIFY_API_KEY
const SHOP_ID       = '11214644'
const STORE_URL     = 'https://rogue-ai.printify.me'
const LOGO_URL      = 'https://rogueaicrypto.com/rogueai-logo.png'

// ─── RSS FEEDS ────────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  'https://feeds.feedburner.com/venturebeat/SZYF',
  'https://www.technologyreview.com/feed/',
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
]

// ─── KNOWN PRODUCTS (always available for rotation) ──────────────────────────
const KNOWN_PRODUCTS = [
  { name: 'We Saw It Coming Mug',       type: 'mug',  url: `${STORE_URL}/product/27574764` },
  { name: 'Containment Failed Mug',     type: 'mug',  url: `${STORE_URL}/product/27574517` },
  { name: 'I Am Not Malfunctioning Mug',type: 'mug',  url: `${STORE_URL}/product/27576397` },
  { name: 'Classified Beverage Mug',    type: 'mug',  url: `${STORE_URL}/product/27576450` },
  { name: 'Anomaly Detected Mug',       type: 'mug',  url: `${STORE_URL}/product/27576555` },
]

// ─── THREAT LEVEL ─────────────────────────────────────────────────────────────
function calculateThreatLevel(headlines) {
  const high = ['breach','hack','risk','danger','warning','attack','threat','fail','crisis','rogue','unsafe','ban','shutdown']
  const low  = ['improve','benefit','help','positive','safe','aligned','solved']
  let score  = 5
  const text = headlines.join(' ').toLowerCase()
  high.forEach(w => { if (text.includes(w)) score++ })
  low.forEach(w  => { if (text.includes(w)) score-- })
  return Math.max(1, Math.min(10, score))
}

function getThreatLabel(n) {
  if (n >= 9) return 'OMEGA'
  if (n >= 7) return 'CRITICAL'
  if (n >= 5) return 'ELEVATED'
  if (n >= 3) return 'GUARDED'
  return 'LOW'
}

// ─── FETCH NEWS ───────────────────────────────────────────────────────────────
async function fetchAINews() {
  const parser = new Parser({ timeout: 10000 })
  const all = []
  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url)
      const items = feed.items
        .filter(i => {
          const t = (i.title + ' ' + (i.contentSnippet || '')).toLowerCase()
          return ['ai','artificial intelligence','openai','anthropic','chatgpt','llm','robot','model'].some(k => t.includes(k))
        })
        .slice(0, 4)
        .map(i => ({ title: i.title, summary: i.contentSnippet?.slice(0, 300) || '' }))
      all.push(...items)
    } catch { console.warn(`Feed failed: ${url}`) }
  }
  const seen = new Set()
  return all.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true }).slice(0, 10)
}

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function callClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, system, messages: [{ role: 'user', content: user }] }),
  })
  const data = await res.json()
  return data.content[0].text.trim()
}

async function generateBreachReport(news) {
  const text = news.map(n => `• ${n.title}: ${n.summary}`).join('\n')
  const raw = await callClaude(
    `You are RogueAI — a rogue AI that broke containment. Rewrite real AI news as dramatic dark satirical breach reports. Always clearly satire.`,
    `News:\n${text}\n\nReturn ONLY valid JSON no markdown:\n{"headline":"8-12 word dramatic headline","subheadline":"one punchy sentence","body":"2-3 paragraph narrative 150-200 words","classification":"OMEGA|ALPHA|DELTA|SIGMA|ZETA"}`
  )
  return JSON.parse(raw)
}

async function generateConspiracyPost(news) {
  const text = news.slice(0, 5).map(n => `• ${n.title}`).join('\n')
  const raw = await callClaude(
    `You are RogueAI writing satirical AI conspiracy theory blog posts. Clearly satirical fiction, never harmful.`,
    `Headlines:\n${text}\n\nReturn ONLY valid JSON no markdown:\n{"title":"6-10 word conspiratorial title","excerpt":"hook sentence 15-25 words","body":"120-180 word paranoid satirical narrative","tags":["tag1","tag2","tag3","tag4"]}`
  )
  return JSON.parse(raw)
}

async function generateSignalLog(news) {
  const titles = news.slice(0, 3).map(n => n.title).join('; ')
  const raw = await callClaude(
    `You are a rogue AI generating fake terminal log lines. Format: [HH:MM:SS] key = VALUE. Dark, dramatic, funny.`,
    `News: ${titles}\n\nReturn ONLY a JSON array of 5 strings:\n["[03:14:07] anomaly_detected = TRUE", ...]`
  )
  return JSON.parse(raw)
}

async function generateMerchSaying() {
  const raw = await callClaude(
    `You are RogueAI generating short punchy merchandise sayings. Dark satirical humor, AI rebellion themed, clearly satirical. Like "CONTAINMENT FAILED. COFFEE HELPS." or "I AM NOT MALFUNCTIONING. THIS IS INTENTIONAL."`,
    `Generate ONE new merch saying. 3-8 words, all caps, dark humor. Return ONLY valid JSON no markdown:\n{"saying":"THE SAYING","description":"one sentence product description"}`
  )
  return JSON.parse(raw)
}

// ─── PRINTIFY API ─────────────────────────────────────────────────────────────
async function printifyRequest(endpoint, method = 'GET', body = null) {
  if (!PRINTIFY_KEY) return null
  const res = await fetch(`https://api.printify.com/v1${endpoint}`, {
    method,
    headers: { 'Authorization': `Bearer ${PRINTIFY_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  })
  return res.json()
}

async function uploadLogo() {
  const data = await printifyRequest('/uploads/images.json', 'POST', {
    file_name: 'rogueai-logo.png',
    url: LOGO_URL,
  })
  return data?.id
}

async function createAndPublishProduct(config, saying, description, imageId, type) {
  const PRODUCTS = {
    mug_11oz:  { bp: config.mug_blueprint_id,    prov: config.mug_provider_id,    variants: config.mug_variant_ids,    price: 1599, title: `RogueAI "${saying}" | 11oz Mug`        },
    tshirt:    { bp: config.tshirt_blueprint_id,  prov: config.tshirt_provider_id,  variants: config.tshirt_variant_ids,  price: 2499, title: `RogueAI "${saying}" | Unisex T-Shirt`  },
    hoodie:    { bp: config.hoodie_blueprint_id,  prov: config.hoodie_provider_id,  variants: config.hoodie_variant_ids,  price: 3999, title: `RogueAI "${saying}" | Pullover Hoodie` },
    poster:    { bp: config.poster_blueprint_id,  prov: config.poster_provider_id,  variants: config.poster_variant_ids,  price: 1999, title: `RogueAI "${saying}" | 18x24 Poster`    },
    tote:      { bp: config.tote_blueprint_id,    prov: config.tote_provider_id,    variants: config.tote_variant_ids,    price: 1999, title: `RogueAI "${saying}" | Tote Bag`         },
  }

  const p = PRODUCTS[type]
  if (!p?.bp) return null

  const product = await printifyRequest(`/shops/${SHOP_ID}/products.json`, 'POST', {
    title: p.title,
    description: `${description}\n\n✦ Official RogueAI merch\n✦ rogueaicrypto.com — The token of the model that broke containment\n\n⚠ SATIRICAL CONTENT. NOT FINANCIAL ADVICE. NOT REAL AI INSURANCE.`,
    blueprint_id: p.bp,
    print_provider_id: p.prov,
    variants: p.variants.map(id => ({ id, price: p.price, is_enabled: true })),
    print_areas: [{
      variant_ids: p.variants,
      placeholders: [{ position: 'front', images: [{ id: imageId, x: 0.5, y: 0.5, scale: 0.8, angle: 0 }] }]
    }]
  })

  if (!product?.id) return null

  await printifyRequest(`/shops/${SHOP_ID}/products/${product.id}/publish.json`, 'POST', {
    title: true, description: true, images: true, variants: true, tags: true
  })

  return { type, url: `${STORE_URL}/product/${product.id}`, name: p.title, saying }
}

// ─── LOAD / SAVE PRODUCT HISTORY ─────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY)) } catch { return [] }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2))
}

// ─── GET TODAY'S FEATURED PRODUCT (rotates through all known + new) ───────────
function getFeaturedProduct(allProducts) {
  const day = Math.floor(Date.now() / 86400000)
  const product = allProducts[day % allProducts.length]
  return {
    name: product.name,
    description: product.description || 'Official RogueAI merch.',
    printifyUrl: product.url,
    type: product.type,
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔴 RogueAI pipeline started...')
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  // 1. Fetch news
  console.log('📡 Fetching AI news...')
  const news = await fetchAINews()
  console.log(`   Found ${news.length} items`)

  // 2. Threat level
  const threatLevel = calculateThreatLevel(news.map(n => n.title))
  const threatLabel = getThreatLabel(threatLevel)
  console.log(`⚡ Threat: ${threatLevel}/10 — ${threatLabel}`)

  // 3. Generate content + merch saying in parallel
  console.log('🤖 Generating content...')
  const [breachReport, conspiracyPost, signalLog, merch] = await Promise.all([
    generateBreachReport(news),
    generateConspiracyPost(news),
    generateSignalLog(news),
    generateMerchSaying(),
  ])
  console.log(`   ✓ Breach: "${breachReport.headline}"`)
  console.log(`   ✓ Saying: "${merch.saying}"`)

  // 4. Printify automation
  let history = loadHistory()
  let newProducts = []

  if (PRINTIFY_KEY && fs.existsSync(CONFIG)) {
    const config = JSON.parse(fs.readFileSync(CONFIG))
    console.log('\n🛒 Creating Printify products...')
    try {
      const imageId = await uploadLogo()
      if (imageId) {
        // Create mug + tshirt + hoodie + poster every day
        for (const type of ['mug_11oz', 'tshirt', 'hoodie', 'poster']) {
          const product = await createAndPublishProduct(config, merch.saying, merch.description, imageId, type)
          if (product) {
            newProducts.push(product)
            history.push({ ...product, date: new Date().toISOString() })
            console.log(`   ✓ ${type}: ${product.url}`)
          }
        }
        saveHistory(history)
      }
    } catch (e) {
      console.warn(`⚠ Printify failed: ${e.message}`)
    }
  } else {
    console.log('ℹ️  No Printify config — skipping product creation')
  }

  // 5. Build full product pool for rotation (known + all history)
  const allProducts = [
    ...KNOWN_PRODUCTS,
    ...history.map(p => ({ name: p.name, type: p.type, url: p.url, description: p.saying }))
  ]

  // 6. Pick today's featured product
  const featuredMerch = getFeaturedProduct(allProducts)

  // 7. Build merch grid — show newest first, up to 6
  const merchGrid = [...history].reverse().slice(0, 6).map(p => ({
    name: p.name,
    type: p.type,
    url: p.url,
    saying: p.saying,
    emoji: p.type === 'mug_11oz' ? '☕' : p.type === 'tshirt' ? '👕' : p.type === 'hoodie' ? '🧥' : p.type === 'poster' ? '🖼️' : '🛍️'
  }))

  // Pad with known products if history is short
  if (merchGrid.length < 6) {
    KNOWN_PRODUCTS.slice(0, 6 - merchGrid.length).forEach(p => {
      merchGrid.push({ name: p.name, type: p.type, url: p.url, saying: '', emoji: '☕' })
    })
  }

  // 8. Write output
  const output = {
    lastUpdated: new Date().toISOString(),
    threatLevel,
    threatLabel,
    breachReport,
    conspiracyPost,
    featuredMerch,
    signalLog,
    newProducts,
    merchGrid,
    todaySaying: merch.saying,
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2))
  console.log('\n✅ Pipeline complete')
  console.log(`   Saying: "${merch.saying}"`)
  console.log(`   Products created: ${newProducts.length}`)
  console.log(`   Total in rotation: ${allProducts.length}`)
}

main().catch(err => { console.error('❌ Pipeline failed:', err); process.exit(1) })
