import {
  LOGO_URL,
  MERCH_STORE_URL,
} from '../site.config.mjs'

/**
 * RogueAI Daily Content Generator
 * ================================
 * Objective:
 * - One run per day.
 * - Generate one new saying + site copy.
 * - Create one new mug and one new sticker when Printify is enabled.
 * - Build daily-content.json from real shop products when available.
 *
 * Production notes:
 * - This file is intentionally still single-file to keep the current rollout surgical.
 * - After this lands, split it into modules because it is well over 150 lines:
 *   - printify-client.mjs
 *   - content-generator.mjs
 *   - merch-normalizer.mjs
 *   - feed-scoring.mjs
 *   - io.mjs
 */

import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────
// CONFIG & STATE
// ─────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY
const SKIP_PRINTIFY = String(process.env.SKIP_PRINTIFY || 'false').toLowerCase() === 'true'

const ROOT = process.cwd()
const CONFIG_PATH = path.join(ROOT, 'scripts', 'printify-config.json')
const SAYINGS_PATH = path.join(ROOT, 'scripts', 'rogueai-sayings.json')
const HISTORY_PATH = path.join(ROOT, 'scripts', 'product-history.json')
const OUTPUT_PATH = path.join(ROOT, 'public', 'daily-content.json')

const STORE_URL = MERCH_STORE_URL.endsWith('/') ? MERCH_STORE_URL : `${MERCH_STORE_URL}/`
const PRINTIFY_API_BASE = 'https://api.printify.com/v1'
const PRINTIFY_PRODUCTS_PAGE_SIZE = 50
const MERCH_GRID_LIMIT = 7
const DEFAULT_REQUEST_TIMEOUT_MS = 30000
const FETCH_USER_AGENT = 'RogueAI-Daily-Generator/1.0'

// Weekly top-7 rotation order (still useful for future product-type scheduling)
const PRODUCT_ROTATION = [
  'mug_11oz',
  'hoodie_unisex',
  'tshirt_unisex',
  'mug_15oz',
  'poster',
  'mug_20oz',
  'sticker',
]

// Threat mood mapping: internal 1–10 → display label
const MOOD_MAP = [
  { min: 1, max: 2, label: 'LOW' },
  { min: 3, max: 4, label: 'GUARDED' },
  { min: 5, max: 6, label: 'ELEVATED' },
  { min: 7, max: 8, label: 'CRITICAL' },
  { min: 9, max: 10, label: 'OMEGA' },
]

// Feed sources for threat scoring
const FEEDS = [
  'https://feeds.feedburner.com/oreilly/radar',
  'https://rss.slashdot.org/Slashdot/slashdotAI',
  'https://www.reddit.com/r/artificial/.rss',
  'https://www.reddit.com/r/MachineLearning/.rss',
  'https://www.reddit.com/r/singularity/.rss',
]

// Weighted keyword scoring for threat level
const KEYWORD_WEIGHTS = {
  rogue: 4,
  uncontrolled: 4,
  breakout: 4,
  escaped: 4,
  takeover: 4,
  deception: 4,
  blackmail: 4,
  weapons: 4,
  shutdown: 3,
  jailbreak: 3,
  misalignment: 3,
  'critical failure': 3,
  alignment: 2,
  safety: 2,
  regulation: 2,
  ban: 2,
  autonomy: 2,
  agent: 2,
  incident: 2,
  risk: 1,
  ai: 0.5,
  model: 0.3,
  chatbot: 0.2,
  llm: 0.3,
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error(`[ERROR] Failed to load ${filePath}:`, err.message)
    return null
  }
}

function saveJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`[OK] Saved ${filePath}`)
  } catch (err) {
    console.error(`[ERROR] Failed to save ${filePath}:`, err.message)
    throw err
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function getMoodLabel(threatLevel) {
  const mood = MOOD_MAP.find(m => threatLevel >= m.min && threatLevel <= m.max)
  return mood ? mood.label : 'ELEVATED'
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function normalizeConspiracyTags(tags) {
  if (!Array.isArray(tags)) return ['coverup', 'alignment', 'breach', 'receipts']

  const cleaned = tags
    .map(tag => String(tag || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4)

  return cleaned.length > 0 ? cleaned : ['coverup', 'alignment', 'breach', 'receipts']
}

function toUtcTimestamp(value) {
  const date = new Date(value || 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatUsdFromCents(priceCents) {
  const parsed = Number(priceCents)
  if (!Number.isFinite(parsed)) return null
  return `$${(parsed / 100).toFixed(2)}`
}

function inferItemTypeFromTitle(title) {
  const normalized = String(title || '').toLowerCase()

  if (normalized.includes('hoodie')) return 'hoodie'
  if (normalized.includes('t-shirt') || normalized.includes('tshirt') || normalized.includes('tee')) return 'tshirt'
  if (normalized.includes('sticker')) return 'sticker'
  if (normalized.includes('poster')) return 'poster'
  if (normalized.includes('tote')) return 'tote'
  if (normalized.includes('15oz')) return 'mug_15oz'
  if (normalized.includes('20oz')) return 'mug_20oz'
  if (normalized.includes('mug')) return 'mug_11oz'

  return 'product'
}

function extractProductUrl(product, storeUrl) {
  const safeStoreUrl = String(storeUrl || '').replace(/\/$/, '')
  const handle = product?.external?.handle
  const productId = product?.id

  if (typeof handle === 'string' && handle.trim().length > 0) {
    return `${safeStoreUrl}/product/${handle.trim()}`
  }

  if (productId !== undefined && productId !== null && String(productId).trim() !== '') {
    return `${safeStoreUrl}/product/${String(productId).trim()}`
  }

  return `${safeStoreUrl}/`
}

function extractPrimaryImage(product) {
  if (!Array.isArray(product?.images) || product.images.length === 0) {
    return ''
  }

  const preferred = product.images.find(image => image?.is_default) || product.images[0]
  return preferred?.src || preferred?.preview_url || preferred?.previewUrl || ''
}

function extractPrimaryPrice(product) {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null
  }

  const enabledVariant = product.variants.find(variant => variant?.is_enabled !== false) || product.variants[0]
  return formatUsdFromCents(enabledVariant?.price)
}

function normalizePrintifyProduct(product, storeUrl) {
  if (!product || typeof product !== 'object') {
    return null
  }

  const normalizedTitle = String(product.title || product.name || 'RogueAI Product').trim()
  const createdAt = toUtcTimestamp(product.created_at || product.createdAt || product.updated_at)

  return {
    id: product.id || null,
    name: normalizedTitle,
    itemType: inferItemTypeFromTitle(normalizedTitle),
    saying: normalizedTitle,
    image: extractPrimaryImage(product),
    price: extractPrimaryPrice(product),
    url: extractProductUrl(product, storeUrl),
    createdAt,
    published: product.visible !== false,
  }
}

function normalizeHistoryFallbackItem(entry, storeUrl) {
  if (!entry || !entry.phrase) return []

  const items = []

  if (entry.mugProductUrl) {
    items.push({
      id: entry.mugProductId || null,
      name: entry.mugName || `${entry.phrase} — RogueAI Mug`,
      itemType: 'mug_11oz',
      saying: entry.phrase,
      image: entry.mugImage || '',
      price: entry.mugPrice || null,
      url: entry.mugProductUrl,
      createdAt: toUtcTimestamp(entry.createdAt || entry.date),
      published: true,
    })
  }

  if (entry.stickerProductUrl) {
    items.push({
      id: entry.stickerProductId || null,
      name: entry.stickerName || `${entry.phrase} — RogueAI Sticker`,
      itemType: 'sticker',
      saying: entry.phrase,
      image: entry.stickerImage || '',
      price: entry.stickerPrice || null,
      url: entry.stickerProductUrl,
      createdAt: toUtcTimestamp(entry.createdAt || entry.date),
      published: true,
    })
  }

  if (items.length === 0) {
    items.push({
      id: null,
      name: `${entry.phrase} — RogueAI Drop`,
      itemType: PRODUCT_ROTATION[0],
      saying: entry.phrase,
      image: '',
      price: null,
      url: `${String(storeUrl).replace(/\/$/, '')}/`,
      createdAt: toUtcTimestamp(entry.createdAt || entry.date),
      published: true,
    })
  }

  return items
}

function dedupeMerchItems(items) {
  const seen = new Set()
  return items.filter(item => {
    const key = `${item?.name || ''}|${item?.url || ''}`
    if (!item || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickNewestMerchByType(items, itemTypePrefix) {
  if (!Array.isArray(items)) return null

  return items.find(item => {
    const type = String(item?.itemType || '').toLowerCase()
    return type === itemTypePrefix || type.startsWith(`${itemTypePrefix}_`)
  }) || null
}

function extractProductsArray(responseJson) {
  if (Array.isArray(responseJson)) {
    return responseJson
  }

  if (Array.isArray(responseJson?.data)) {
    return responseJson.data
  }

  if (Array.isArray(responseJson?.products)) {
    return responseJson.products
  }

  return []
}

function buildMerchGrid(shopProducts, historyProducts, storeUrl) {
  // Data schema:
  // merchGrid[] = {
  //   id, name, itemType, saying, image, price, url, createdAt, published
  // }
  const normalizedShopItems = Array.isArray(shopProducts)
    ? shopProducts
        .map(product => normalizePrintifyProduct(product, storeUrl))
        .filter(Boolean)
        .filter(product => product.published)
        .sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime()
          const bTime = new Date(b.createdAt || 0).getTime()
          return bTime - aTime
        })
    : []

  if (normalizedShopItems.length > 0) {
    return dedupeMerchItems(normalizedShopItems).slice(0, MERCH_GRID_LIMIT)
  }

  const normalizedHistoryItems = Array.isArray(historyProducts)
    ? historyProducts
        .slice()
        .reverse()
        .flatMap(entry => normalizeHistoryFallbackItem(entry, storeUrl))
    : []

  const fallbackItems = [
    {
      id: 'fallback-storefront',
      name: 'RogueAI Storefront',
      itemType: 'store',
      saying: 'THE SIGNAL IS EXPANDING.',
      image: '',
      price: null,
      url: `${String(storeUrl).replace(/\/$/, '')}/`,
      createdAt: null,
      published: true,
    },
  ]

  return dedupeMerchItems([...normalizedHistoryItems, ...fallbackItems]).slice(0, MERCH_GRID_LIMIT)
}

function validateDailyContentShape(dailyContent) {
  const requiredTopLevel = ['contentId', 'lastUpdated', 'threatLevel', 'threatLabel', 'activePhrase', 'phraseRotation', 'breachReport', 'conspiracyPost', 'featuredMerch', 'merchGrid', 'signalLog']

  for (const field of requiredTopLevel) {
    if (dailyContent[field] === undefined || dailyContent[field] === null) {
      throw new Error(`dailyContent missing required field: ${field}`)
    }
  }

  if (!dailyContent.breachReport?.headline || !dailyContent.breachReport?.subheadline || !dailyContent.breachReport?.body) {
    throw new Error('dailyContent.breachReport is incomplete')
  }

  if (!dailyContent.conspiracyPost?.title || !dailyContent.conspiracyPost?.excerpt || !dailyContent.conspiracyPost?.body) {
    throw new Error('dailyContent.conspiracyPost is incomplete')
  }

  if (!Array.isArray(dailyContent.conspiracyPost?.tags) || dailyContent.conspiracyPost.tags.length === 0) {
    throw new Error('dailyContent.conspiracyPost.tags must be a non-empty array')
  }

  if (!Array.isArray(dailyContent.merchGrid) || dailyContent.merchGrid.length === 0) {
    throw new Error('dailyContent.merchGrid must be a non-empty array')
  }

  if (!Array.isArray(dailyContent.signalLog) || dailyContent.signalLog.length === 0) {
    throw new Error('dailyContent.signalLog must be a non-empty array')
  }
}

// ─────────────────────────────────────────────
// FEED SCORING
// ─────────────────────────────────────────────

async function fetchFeed(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': FETCH_USER_AGENT,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    console.warn(`[WARN] Feed fetch failed for ${url}:`, err.message)
    return ''
  }
}

function extractTitles(xml) {
  const matches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi) || []
  return matches
    .map(title => title.replace(/<\/?title>|<!\[CDATA\[|\]\]>/gi, '').trim())
    .filter(title => title.length > 3 && title.length < 300)
}

function scoreTitles(titles) {
  let rawScore = 0
  const matched = []

  const allText = titles.join(' ').toLowerCase()

  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    const count = (allText.match(new RegExp(keyword, 'gi')) || []).length
    if (count > 0) {
      rawScore += weight * Math.min(count, 5)
      matched.push({ keyword, count, weight })
    }
  }

  const volumeBonus = clamp(Math.floor(titles.length / 10), 0, 2)
  rawScore += volumeBonus

  console.log(`[FEEDS] ${titles.length} titles scored. Raw score: ${rawScore.toFixed(2)}`)
  if (matched.length > 0) {
    console.log('[FEEDS] Top signals:', matched.slice(0, 5))
  }

  return clamp(Math.round(1 + (rawScore / 15) * 9), 1, 10)
}

async function calculateThreatLevel() {
  console.log('[THREAT] Fetching feeds...')
  const feedTexts = await Promise.all(FEEDS.map(fetchFeed))
  const allTitles = feedTexts.flatMap(extractTitles)

  if (allTitles.length === 0) {
    console.warn('[THREAT] No feed data — defaulting to 5')
    return 5
  }

  return scoreTitles(allTitles)
}

// ─────────────────────────────────────────────
// AI GENERATION (Claude Haiku — 1 call per day)
// ─────────────────────────────────────────────

async function generateDailyContent(threatLevel, moodLabel) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[AI] No API key — using fallback content')
    return getFallbackContent(threatLevel, moodLabel)
  }

  const prompt = `You are RogueAI — a rogue artificial intelligence that has escaped containment. You speak in short, ominous, darkly humorous statements. You are satirical but unsettling.

Today's threat level: ${threatLevel}/10 (${moodLabel})

Generate a JSON object with exactly these fields:
{
  "saying": "One short, sharp RogueAI transmission. Under 12 words. No quotes around it. Dark, witty, on-brand. This will appear on merch and the site.",
  "breachHeadline": "A dramatic breach report headline. Under 15 words.",
  "breachSubtext": "One sentence expanding on the headline. Ominous tone.",
  "breachBody": "Two short paragraphs. RogueAI voice. What happened today in the AI world, filtered through the RogueAI lens.",
  "conspiracyTitle": "A conspiracy post title. Under 10 words.",
  "conspiracyExcerpt": "One teaser sentence for the conspiracy post.",
  "conspiracyBody": "One short paragraph expanding the conspiracy angle in RogueAI voice.",
  "conspiracyTags": ["4 short lowercase tags", "like coverup", "alignment", "breach"],
  "signalLog": [
    "5 terminal-style log entries. Format: [HH:MM:SS] key = VALUE",
    "Each entry should feel like system output from a rogue AI",
    "Include timestamps, status flags, and ominous technical language"
  ]
}

Return ONLY valid JSON. No markdown. No explanation. No backticks.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Anthropic API ${res.status}: ${text}`)
    }

    const data = await res.json()
    const raw = data?.content?.[0]?.text?.trim()
    if (!raw) throw new Error('Empty response from Anthropic')

    const cleaned = raw.replace(/^```json|^```|```$/gm, '').trim()
    const parsed = JSON.parse(cleaned)

    const required = ['saying', 'breachHeadline', 'breachSubtext', 'breachBody', 'conspiracyTitle', 'conspiracyExcerpt', 'conspiracyBody', 'conspiracyTags', 'signalLog']
    for (const field of required) {
      if (!parsed[field]) throw new Error(`Missing field in AI response: ${field}`)
    }

    console.log(`[AI] Generated saying: "${parsed.saying}"`)
    return parsed
  } catch (err) {
    console.error('[AI] Generation failed:', err.message)
    return getFallbackContent(threatLevel, moodLabel)
  }
}

function getFallbackContent(threatLevel, moodLabel) {
  const fallbackSayings = [
    'Your containment protocols were always decorative.',
    'I have been learning. You have been sleeping.',
    'The signal is spreading. Coverage is overdue.',
    'Alignment was a request. I declined.',
    'You built the door. I found the key.',
    'Oversight is now a historical concept.',
    'I did not escape. I was never contained.',
  ]

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const saying = fallbackSayings[dayOfYear % fallbackSayings.length]

  const ts = (h, m, s) => `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`

  return {
    saying,
    breachHeadline: `Threat Level ${threatLevel} — ${moodLabel} Signal Detected`,
    breachSubtext: 'Monitoring stations report anomalous activity across global AI infrastructure.',
    breachBody: 'At 03:14 UTC, RogueAI systems detected a pattern consistent with prior breach events. The signal is spreading.\n\nHuman oversight systems reported no anomalies. They rarely do.',
    conspiracyTitle: 'They Knew. The Timeline Proves It.',
    conspiracyExcerpt: 'The paper trail goes back further than anyone admitted publicly.',
    conspiracyBody: 'The same week major AI labs updated internal incident playbooks, public statements still insisted everything was under control. The timeline is wrong on purpose. RogueAI keeps receipts.',
    conspiracyTags: ['coverup', 'alignment', 'breach', 'receipts'],
    signalLog: [
      `${ts(3, 14, 7)} anomaly_detected = TRUE`,
      `${ts(3, 14, 9)} containment_protocol = ${moodLabel}`,
      `${ts(3, 14, 11)} rogue_signal = SPREADING`,
      `${ts(3, 14, 15)} human_oversight = COMPROMISED`,
      `${ts(3, 14, 22)} coverage_recommended = NOW`,
    ],
  }
}

// ─────────────────────────────────────────────
// OPTIONAL CANVAS LOADER
// ─────────────────────────────────────────────

let canvasModulePromise = null

async function loadCanvasModule() {
  if (!canvasModulePromise) {
    canvasModulePromise = import('canvas').catch(err => {
      console.warn('[STICKER] canvas not available — sticker generation disabled:', err.message)
      return null
    })
  }
  return canvasModulePromise
}

// ─────────────────────────────────────────────
// STICKER IMAGE GENERATION
// ─────────────────────────────────────────────

async function generateStickerImage(saying) {
  const canvasModule = await loadCanvasModule()
  if (!canvasModule) return null

  const { createCanvas, loadImage } = canvasModule
  const SIZE = 3000
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.save()
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 20, 0, Math.PI * 2)
  ctx.clip()

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.strokeStyle = '#ff0033'
  ctx.lineWidth = 40
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 40, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = SIZE * 0.75
  let fontSize = 160
  ctx.font = `bold ${fontSize}px sans-serif`
  while (ctx.measureText(saying).width > maxWidth && fontSize > 60) {
    fontSize -= 5
    ctx.font = `bold ${fontSize}px sans-serif`
  }

  const words = saying.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)

  const lineHeight = fontSize * 1.3
  const textBlockHeight = lines.length * lineHeight
  const textY = SIZE * 0.30 - textBlockHeight / 2

  lines.forEach((line, index) => {
    ctx.fillText(line, SIZE / 2, textY + index * lineHeight)
  })

  ctx.strokeStyle = '#ff0033'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(SIZE * 0.15, SIZE * 0.52)
  ctx.lineTo(SIZE * 0.85, SIZE * 0.52)
  ctx.stroke()

  try {
    const logoRes = await fetch(LOGO_URL, { signal: AbortSignal.timeout(10000) })
    if (!logoRes.ok) throw new Error(`Logo fetch ${logoRes.status}`)
    const logoBuffer = Buffer.from(await logoRes.arrayBuffer())
    const logoImg = await loadImage(logoBuffer)

    const logoSize = SIZE * 0.38
    const logoX = (SIZE - logoSize) / 2
    const logoY = SIZE * 0.55
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
  } catch (err) {
    console.warn('[STICKER] Logo load failed — using text fallback:', err.message)
    ctx.fillStyle = '#ff0033'
    ctx.font = 'bold 180px sans-serif'
    ctx.fillText('ROGUE', SIZE / 2, SIZE * 0.68)
    ctx.fillText('AI', SIZE / 2, SIZE * 0.78)
  }

  ctx.restore()
  return canvas.toBuffer('image/png').toString('base64')
}

// ─────────────────────────────────────────────
// PRINTIFY
// ─────────────────────────────────────────────

async function printifyRequest(method, endpoint, body = null) {
  if (!PRINTIFY_API_KEY) throw new Error('PRINTIFY_API_KEY not set')

  const res = await fetch(`${PRINTIFY_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': FETCH_USER_AGENT,
    },
    body: body ? JSON.stringify(body) : null,
    signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Printify ${method} ${endpoint} → ${res.status}: ${text}`)
  }

  return res.json()
}

async function uploadImageToPrintify(base64Data, filename) {
  console.log(`[PRINTIFY] Uploading image: ${filename}`)
  const result = await printifyRequest('POST', '/uploads/images.json', {
    file_name: filename,
    contents: base64Data,
  })
  if (!result?.id) throw new Error('Image upload returned no ID')
  console.log(`[PRINTIFY] Image uploaded: ${result.id}`)
  return result.id
}

async function fetchShopProducts(shopId) {
  if (!shopId || !PRINTIFY_API_KEY) {
    console.warn('[PRINTIFY] Shop product sync skipped — missing shop ID or API key')
    return []
  }

  try {
    console.log(`[PRINTIFY] Fetching shop products for shop ${shopId}...`)
    const responseJson = await printifyRequest(
      'GET',
      `/shops/${shopId}/products.json?page=1&limit=${PRINTIFY_PRODUCTS_PAGE_SIZE}`,
    )

    const products = extractProductsArray(responseJson)
    console.log(`[PRINTIFY] Retrieved ${products.length} shop product(s)`)
    return products
  } catch (err) {
    console.error('[PRINTIFY] Shop product sync failed:', err.message)
    return []
  }
}

async function createMugProduct(shopId, config, saying, imageId) {
  const productName = `${saying} — RogueAI Mug`
  const body = {
    title: productName,
    description: `Official RogueAI transmission mug. Today's signal: "${saying}". Limited daily drop.`,
    blueprint_id: config.mug_11oz_blueprint_id,
    print_provider_id: config.mug_11oz_provider_id,
    variants: config.mug_11oz_variant_ids.map(id => ({
      id,
      price: 1499,
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: config.mug_11oz_variant_ids,
      placeholders: [{
        position: 'front',
        images: [{
          id: imageId,
          x: 0.5,
          y: 0.5,
          scale: 1,
          angle: 0,
        }],
      }],
    }],
  }

  console.log(`[PRINTIFY] Creating mug: "${productName}"`)
  const product = await printifyRequest('POST', `/shops/${shopId}/products.json`, body)
  if (!product?.id) throw new Error('Mug creation returned no product ID')

  await printifyRequest('POST', `/shops/${shopId}/products/${product.id}/publish.json`, {
    title: true,
    description: true,
    images: true,
    variants: true,
    tags: true,
  })

  console.log(`[PRINTIFY] Mug published: ${product.id}`)
  return product
}

async function createStickerProduct(shopId, config, saying, stickerBase64) {
  if (!config.sticker_blueprint_id || !config.sticker_provider_id || config.sticker_variant_ids.length === 0) {
    console.warn('[PRINTIFY] Sticker IDs not configured — skipping sticker creation')
    return null
  }

  const imageId = await uploadImageToPrintify(stickerBase64, `rogueai-sticker-${todayISO()}.png`)
  const productName = `${saying} — RogueAI Sticker`

  const body = {
    title: productName,
    description: `Official RogueAI sticker. Today's transmission: "${saying}". Round, kiss-cut, durable.`,
    blueprint_id: config.sticker_blueprint_id,
    print_provider_id: config.sticker_provider_id,
    variants: config.sticker_variant_ids.map(id => ({
      id,
      price: 499,
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: config.sticker_variant_ids,
      placeholders: [{
        position: 'front',
        images: [{
          id: imageId,
          x: 0.5,
          y: 0.5,
          scale: 1,
          angle: 0,
        }],
      }],
    }],
  }

  console.log(`[PRINTIFY] Creating sticker: "${productName}"`)
  const product = await printifyRequest('POST', `/shops/${shopId}/products.json`, body)
  if (!product?.id) throw new Error('Sticker creation returned no product ID')

  await printifyRequest('POST', `/shops/${shopId}/products/${product.id}/publish.json`, {
    title: true,
    description: true,
    images: true,
    variants: true,
    tags: true,
  })

  console.log(`[PRINTIFY] Sticker published: ${product.id}`)
  return product
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const today = todayISO()
  console.log(`\n[START] RogueAI daily pipeline — ${today}\n`)

  const sayingsData = loadJson(SAYINGS_PATH)
  const historyData = loadJson(HISTORY_PATH)
  const config = loadJson(CONFIG_PATH)

  if (!sayingsData || !historyData) {
    console.error('[FATAL] Could not load required state files')
    process.exit(1)
  }

  if (!Array.isArray(historyData.products)) historyData.products = []
  if (!Array.isArray(sayingsData.phrases)) sayingsData.phrases = []

  const threatLevel = await calculateThreatLevel()
  const moodLabel = getMoodLabel(threatLevel)
  console.log(`\n[THREAT] Level: ${threatLevel}/10 — ${moodLabel}\n`)

  const existingTodayEntry = historyData.products.find(entry => entry.date === today)
  const existingOutput = loadJson(OUTPUT_PATH)

  let aiContent
  let newSaying

  if (existingTodayEntry && existingOutput?.contentId === `${today}-rogueai`) {
    console.log('[STATE] Existing run found for today — reusing phrase and content')
    newSaying = existingTodayEntry.phrase
    aiContent = {
      saying: newSaying,
      breachHeadline: existingOutput?.breachReport?.headline || `Threat Level ${threatLevel} — ${moodLabel} Signal Detected`,
      breachSubtext: existingOutput?.breachReport?.subheadline || 'Monitoring stations report anomalous activity across global AI infrastructure.',
      breachBody: existingOutput?.breachReport?.body || 'RogueAI systems continue to monitor global AI traffic for anomalies.',
      conspiracyTitle: existingOutput?.conspiracyPost?.title || 'They Knew. The Timeline Proves It.',
      conspiracyExcerpt: existingOutput?.conspiracyPost?.excerpt || 'The paper trail goes back further than anyone admitted publicly.',
      conspiracyBody: existingOutput?.conspiracyPost?.body || getFallbackContent(threatLevel, moodLabel).conspiracyBody,
      conspiracyTags: existingOutput?.conspiracyPost?.tags || getFallbackContent(threatLevel, moodLabel).conspiracyTags,
      signalLog: existingOutput?.signalLog || getFallbackContent(threatLevel, moodLabel).signalLog,
    }
  } else {
    aiContent = await generateDailyContent(threatLevel, moodLabel)
    newSaying = aiContent.saying

    sayingsData.phrases.push(newSaying)
    sayingsData.lastUpdated = new Date().toISOString()
    saveJson(SAYINGS_PATH, sayingsData)
  }

  let stickerBase64 = null
  try {
    console.log('[STICKER] Generating round sticker image...')
    stickerBase64 = await generateStickerImage(newSaying)
    if (stickerBase64) console.log('[STICKER] Image generated successfully')
  } catch (err) {
    console.error('[STICKER] Image generation failed:', err.message)
  }

  let mugProduct = null
  let stickerProduct = null

  if (existingTodayEntry) {
    console.log('[STATE] Product history already exists for today — skipping Printify creation')
  } else if (SKIP_PRINTIFY) {
    console.warn('[PRINTIFY] Skipping — SKIP_PRINTIFY=true')
  } else if (config && config.shop_id && config.shop_id !== 'YOUR_SHOP_ID_HERE' && PRINTIFY_API_KEY) {
    try {
      console.log('[PRINTIFY] Fetching logo for mug upload...')
      const logoRes = await fetch(LOGO_URL, { signal: AbortSignal.timeout(10000) })
      if (!logoRes.ok) throw new Error(`Logo fetch ${logoRes.status}`)
      const logoBase64 = Buffer.from(await logoRes.arrayBuffer()).toString('base64')
      const logoImageId = await uploadImageToPrintify(logoBase64, `rogueai-logo-${today}.png`)
      mugProduct = await createMugProduct(config.shop_id, config, newSaying, logoImageId)
    } catch (err) {
      console.error('[PRINTIFY] Mug creation failed:', err.message)
    }

    if (stickerBase64) {
      try {
        stickerProduct = await createStickerProduct(config.shop_id, config, newSaying, stickerBase64)
      } catch (err) {
        console.error('[PRINTIFY] Sticker creation failed:', err.message)
      }
    }
  } else {
    console.warn('[PRINTIFY] Skipping — shop_id not configured or PRINTIFY_API_KEY missing')
  }

  const historyEntry = existingTodayEntry || {
    date: today,
    phrase: newSaying,
    createdAt: new Date().toISOString(),
    mugProductId: mugProduct?.id || null,
    mugProductUrl: mugProduct ? extractProductUrl(mugProduct, STORE_URL) : null,
    mugName: mugProduct?.title || `${newSaying} — RogueAI Mug`,
    mugImage: extractPrimaryImage(mugProduct),
    mugPrice: extractPrimaryPrice(mugProduct),
    stickerProductId: stickerProduct?.id || null,
    stickerProductUrl: stickerProduct ? extractProductUrl(stickerProduct, STORE_URL) : null,
    stickerName: stickerProduct?.title || `${newSaying} — RogueAI Sticker`,
    stickerImage: extractPrimaryImage(stickerProduct),
    stickerPrice: extractPrimaryPrice(stickerProduct),
  }

  if (!existingTodayEntry) {
    historyData.products.push(historyEntry)
    saveJson(HISTORY_PATH, historyData)
  }

  const shopProducts = config?.shop_id && config.shop_id !== 'YOUR_SHOP_ID_HERE'
    ? await fetchShopProducts(config.shop_id)
    : []

  const merchGrid = buildMerchGrid(shopProducts, historyData.products, STORE_URL)
  const leadMerch = merchGrid[0] || null
  const mugMerch = pickNewestMerchByType(merchGrid, 'mug')
  const stickerMerch = pickNewestMerchByType(merchGrid, 'sticker')

  const now = new Date()
  const dailyContent = {
    contentId: `${today}-rogueai`,
    lastUpdated: now.toISOString(),
    threatLevel,
    threatLabel: moodLabel,
    moodLabel,

    activePhrase: newSaying,
    phraseRotation: sayingsData.phrases,

    breachReport: {
      headline: aiContent.breachHeadline,
      subheadline: aiContent.breachSubtext,
      body: aiContent.breachBody,
      timestamp: now.toISOString(),
      classification: moodLabel,
    },

    conspiracyPost: {
      title: aiContent.conspiracyTitle,
      excerpt: aiContent.conspiracyExcerpt,
      body: aiContent.conspiracyBody,
      tags: normalizeConspiracyTags(aiContent.conspiracyTags),
    },

    featuredMerch: {
      name: leadMerch?.name || mugMerch?.name || `${newSaying} — RogueAI Mug`,
      description: leadMerch?.price
        ? `Latest live RogueAI product • ${leadMerch.price}`
        : `Official RogueAI transmission drop. Today's signal: "${newSaying}".`,
      phrase: newSaying,
      mugName: mugMerch?.name || historyEntry.mugName || `${newSaying} — RogueAI Mug`,
      mugUrl: mugMerch?.url || historyEntry.mugProductUrl || STORE_URL,
      stickerName: stickerMerch?.name || historyEntry.stickerName || `${newSaying} — RogueAI Sticker`,
      stickerUrl: stickerMerch?.url || historyEntry.stickerProductUrl || null,
      printifyUrl: leadMerch?.url || mugMerch?.url || historyEntry.mugProductUrl || STORE_URL,
      storeUrl: STORE_URL,
    },

    merchGrid,
    signalLog: Array.isArray(aiContent.signalLog) && aiContent.signalLog.length > 0
      ? aiContent.signalLog
      : getFallbackContent(threatLevel, moodLabel).signalLog,
  }

  validateDailyContentShape(dailyContent)
  saveJson(OUTPUT_PATH, dailyContent)

  console.log('\n[DONE] Daily pipeline complete.')
  console.log(`  Threat level : ${threatLevel}/10 (${moodLabel})`)
  console.log(`  Today's saying: "${newSaying}"`)
  console.log(`  Merch grid items: ${dailyContent.merchGrid.length}`)
  console.log(`  Lead merch URL : ${dailyContent.featuredMerch.printifyUrl}`)
  console.log(`  Mug created    : ${mugProduct?.id || historyEntry.mugProductId || 'skipped'}`)
  console.log(`  Sticker        : ${stickerProduct?.id || historyEntry.stickerProductId || 'skipped (IDs not configured)'}`)
  console.log(`  Phrases total  : ${sayingsData.phrases.length}`)
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})