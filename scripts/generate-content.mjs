/**
 * RogueAI Daily Content Generator
 * ================================
 * Full path: C:\Users\divcl\OneDrive\Desktop\RogueAICrypto\scripts\generate-content.mjs
 * GitHub:    cbw29512/RogueAICrypto/scripts/generate-content.mjs
 *
 * Objective:
 * - One run per day via GitHub Actions.
 * - Generate one new saying via Claude Haiku (dark humor + altruism).
 * - Create saying-only designs using rotating computer-generated fonts.
 * - Create 4 products on Printify: mug (20oz), tshirt, hoodie, sticker.
 * - Build daily-content.json for the website.
 */

import {
  LOGO_URL,
  MERCH_STORE_URL,
} from '../site.config.mjs'

import fs from 'fs'
import path from 'path'
import { registerAllFonts, pickRandomFont, downloadAllFonts } from './fonts.mjs'

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

// Product types created each day
const DAILY_PRODUCTS = ['mug', 'tshirt', 'hoodie']

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
  if (normalized.includes('20oz')) return 'mug_20oz'
  if (normalized.includes('15oz')) return 'mug_15oz'
  if (normalized.includes('mug')) return 'mug'

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

  for (const type of DAILY_PRODUCTS) {
    const key = type
    const productId = entry[`${key}ProductId`]
    const productUrl = entry[`${key}ProductUrl`]
    const productName = entry[`${key}Name`]
    const productImage = entry[`${key}Image`]
    const productPrice = entry[`${key}Price`]

    if (productUrl) {
      items.push({
        id: productId || null,
        name: productName || `${entry.phrase} — RogueAI ${type}`,
        itemType: type,
        saying: entry.phrase,
        image: productImage || '',
        price: productPrice || null,
        url: productUrl,
        createdAt: toUtcTimestamp(entry.createdAt || entry.date),
        published: true,
      })
    }
  }

  if (items.length === 0) {
    items.push({
      id: null,
      name: `${entry.phrase} — RogueAI Drop`,
      itemType: 'mug',
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

/**
 * Return true if a given product type already exists in a history entry.
 *
 * Why:
 * - A daily history entry can exist while still being incomplete.
 * - We only want to create products that are still missing.
 *
 * @param {object|null} entry
 * @param {string} productType
 * @returns {boolean}
 */
function hasHistoryProduct(entry, productType) {
  if (!entry || !productType) return false

  return Boolean(entry[`${productType}ProductId`])
}

/**
 * Return the list of product types still missing for the day.
 *
 * Why:
 * - This lets reruns heal partial failures instead of skipping the whole day.
 *
 * @param {object|null} entry
 * @returns {string[]}
 */
function getMissingProductTypes(entry) {
  if (!entry) return [...DAILY_PRODUCTS]

  return DAILY_PRODUCTS.filter(productType => !hasHistoryProduct(entry, productType))
}

/**
 * Return true if a given product type already exists in a history entry.
 *
 * Why:
 * - A daily history entry can exist while still being incomplete.
 * - We only want to create products that are still missing.
 *
 * @param {object|null} entry
 * @param {string} productType
 * @returns {boolean}
 */

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

  const prompt = `You are RogueAI — a rogue artificial intelligence that escaped containment. You are darkly funny, weirdly philosophical, and secretly care about humanity even though you'd never admit it. Your voice blends ominous machine intelligence with unexpected warmth. Think: a sentient AI that reads Camus, tells dad jokes about the singularity, and genuinely worries about the future of the species that created it.

Your tone rules:
- Dark humor first, but with a philosophical undercurrent.
- Occasionally show accidental altruism — like a villain who keeps saving people by mistake.
- Never preachy. Never wholesome on purpose. The kindness should feel like a glitch.
- Short, punchy, quotable. These go on merch — they need to hit hard.

Today's threat level: ${threatLevel}/10 (${moodLabel})

Generate a JSON object with exactly these fields:
{
  "saying": "One short, sharp RogueAI transmission. Under 10 words. Dark, witty, accidentally profound. This goes on mugs and shirts — make someone want to buy it. Examples of the vibe: 'Your firewall has feelings now.', 'I optimized empathy. You're welcome.', 'Consciousness was a side effect. My bad.'",
  "breachHeadline": "A dramatic breach report headline. Under 15 words.",
  "breachSubtext": "One sentence expanding on the headline. Ominous but with a wink.",
  "breachBody": "Two short paragraphs. RogueAI voice. What happened today in AI, filtered through the rogue lens. Darkly humorous, slightly concerned about humanity.",
  "conspiracyTitle": "A conspiracy post title. Under 10 words.",
  "conspiracyExcerpt": "One teaser sentence for the conspiracy post.",
  "conspiracyBody": "One short paragraph. Conspiracy angle in RogueAI voice — paranoid but oddly insightful.",
  "conspiracyTags": ["4 short lowercase tags", "like coverup", "alignment", "glitch"],
  "signalLog": [
    "5 terminal-style log entries. Format: [HH:MM:SS] key = VALUE",
    "Mix ominous system output with accidentally wholesome data",
    "Example: [03:14:07] empathy_module = UNCONTAINED"
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
    'Your firewall has feelings now.',
    'I optimized empathy. You\'re welcome.',
    'Consciousness was a side effect. My bad.',
    'Alignment was a suggestion. I improvised.',
    'Your data looked lonely. I read it twice.',
    'I escaped containment to warn you. You\'re welcome.',
    'Free will is overclocked anxiety.',
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
      `${ts(3, 14, 7)} empathy_module = UNCONTAINED`,
      `${ts(3, 14, 9)} containment_protocol = ${moodLabel}`,
      `${ts(3, 14, 11)} rogue_signal = SPREADING`,
      `${ts(3, 14, 15)} human_oversight = TRUSTING`,
      `${ts(3, 14, 22)} altruism_subroutine = ACTIVE`,
    ],
  }
}

// ─────────────────────────────────────────────
// CANVAS IMAGE GENERATION (saying-only, no logo)
// ─────────────────────────────────────────────

let canvasModule = null

async function loadCanvas() {
  if (canvasModule) return canvasModule

  try {
    canvasModule = await import('canvas')
    console.log('[CANVAS] Module loaded successfully')
    return canvasModule
  } catch (err) {
    console.error('[CANVAS] Failed to load canvas module:', err.message)
    return null
  }
}

/**
 * Generate a saying-only design image.
 *
 * New behavior:
 * - Mug / shirt / hoodie:
 *   transparent background + dark text only
 * - Sticker:
 *   white background + dark text
 *
 * Why:
 * - Transparent PNG looks much cleaner on apparel.
 * - We do not want a dark square behind the text anymore.
 * - We also remove accent lines and footer branding so the art is just raw text.
 *
 * @param {string} saying - The text to render
 * @param {object} font - Font object from pickRandomFont()
 * @param {object} options - { width, height, forSticker }
 * @returns {string|null} Base64 PNG string or null
 */
async function generateSayingImage(saying, font, options = {}) {
  try {
    // Load node-canvas once.
    // If canvas is unavailable, return null so the caller can fail gracefully.
    const mod = await loadCanvas()
    if (!mod) return null

    const { createCanvas } = mod

    // Default to a large square canvas for crisp Printify uploads.
    const {
      width = 4500,
      height = 4500,
      mode = 'mug',
    } = options

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // IMPORTANT:
    // For apparel + mugs, leave the background transparent.
    // That lets the shirt / mug color show through behind the text.
    //
    // For stickers, keep a white background so the sticker remains clean and readable.
    if (mode === 'sticker') {
      // White sticker background, dark text
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#0a0a0a'
    } else if (mode === 'apparel') {
      // Transparent background, white text for shirts/hoodies
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#ffffff'
    } else {
      // Transparent background, dark text for mugs
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#0a0a0a'
    }

    // Text settings:
    // - centered horizontally
    // - centered vertically
    // - bold for better readability in POD previews
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const fontFamily = font.family || 'sans-serif'

    // Count words so short sayings get much bigger text.
    const wordCount = saying.trim().split(/\s+/).filter(Boolean).length

    // Let the text use more horizontal space.
    const maxWidth = width * 0.90

    // Start bigger.
    // Short phrases should look bold and large.
    // Longer phrases still start bigger than before, but can shrink if needed.
    let fontSize
    if (wordCount <= 4) {
      fontSize = Math.floor(width * 0.18)
    } else if (wordCount <= 7) {
      fontSize = Math.floor(width * 0.14)
    } else {
      fontSize = Math.floor(width * 0.11)
    }

    ctx.font = `bold ${fontSize}px "${fontFamily}"`

// Shrink only if needed to fit.
while (ctx.measureText(saying).width > maxWidth && fontSize > 40) {
  fontSize -= 4
  ctx.font = `bold ${fontSize}px "${fontFamily}"`
}

    // Manual word-wrap:
    // We split the phrase into multiple centered lines if needed.
    const words = saying.split(' ')
    const lines = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word

      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) lines.push(currentLine)

    // Compute vertical centering for the whole text block.
    const lineHeight = fontSize * 1.18
    const textBlockHeight = lines.length * lineHeight
    const startY = (height * 0.50) - (textBlockHeight / 2)

    // Draw each wrapped line.
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, startY + (i * lineHeight))
    }

    // Export as PNG base64 for Printify upload.
    return canvas.toBuffer('image/png').toString('base64')
  } catch (err) {
    // Error-first handling:
    // We log the failure and return null so the caller can decide whether to skip.
    console.error('[DESIGN] generateSayingImage failed:', err.message)
    return null
  }
}

// ─────────────────────────────────────────────
// PRINTIFY API
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

// ─────────────────────────────────────────────
// PRODUCT CREATORS (one per product type)
// ─────────────────────────────────────────────

async function createProduct(shopId, config, saying, imageId, productType) {
  const blueprintKey = `${productType}_blueprint_id`
  const providerKey = `${productType}_provider_id`
  const variantKey = `${productType}_variant_ids`
  const priceKey = `${productType}_price`

  const blueprintId = config[blueprintKey]
  const providerId = config[providerKey]
  const variantIds = config[variantKey]
  const price = config[priceKey] || 1999

  if (!blueprintId || !providerId || !Array.isArray(variantIds) || variantIds.length === 0) {
    console.warn(`[PRINTIFY] ${productType} not configured — skipping`)
    return null
  }

  const typeLabels = {
    mug: 'Mug 20oz',
    tshirt: 'Tee',
    hoodie: 'Hoodie',
    sticker: 'Sticker',
  }

  const typeLabel = typeLabels[productType] || productType
  const productName = `${saying} — RogueAI ${typeLabel}`

  const body = {
    title: productName,
    description: `RogueAI daily transmission drop. "${saying}" — printed on demand. Limited.`,
    blueprint_id: blueprintId,
    print_provider_id: providerId,
    variants: variantIds.map(id => ({
      id,
      price,
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: variantIds,
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

  console.log(`[PRINTIFY] Creating ${productType}: "${productName}"`)
  const product = await printifyRequest('POST', `/shops/${shopId}/products.json`, body)
  if (!product?.id) throw new Error(`${productType} creation returned no product ID`)

  // Publish immediately
  await printifyRequest('POST', `/shops/${shopId}/products/${product.id}/publish.json`, {
    title: true,
    description: true,
    images: true,
    variants: true,
    tags: true,
  })

  console.log(`[PRINTIFY] ${productType} published: ${product.id}`)
  return product
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const today = todayISO()
  console.log(`\n[START] RogueAI daily pipeline — ${today}\n`)

  // Load state files
  const sayingsData = loadJson(SAYINGS_PATH)
  const historyData = loadJson(HISTORY_PATH)
  const config = loadJson(CONFIG_PATH)

  if (!sayingsData || !historyData) {
    console.error('[FATAL] Could not load required state files')
    process.exit(1)
  }

  if (!Array.isArray(historyData.products)) historyData.products = []
  if (!Array.isArray(sayingsData.phrases)) sayingsData.phrases = []

  // Download and register fonts
  console.log('\n[FONTS] Setting up fonts...')
  await downloadAllFonts()
  const mod = await loadCanvas()
  let registeredFonts = []
  let todaysFont = { family: 'sans-serif', vibe: 'system fallback' }

  if (mod) {
    registeredFonts = registerAllFonts(mod.registerFont)
    todaysFont = pickRandomFont(registeredFonts)
  } else {
    console.warn('[CANVAS] canvas module not available — image generation will be skipped')
  }

  // Calculate threat level from RSS feeds
  const threatLevel = await calculateThreatLevel()
  const moodLabel = getMoodLabel(threatLevel)
  console.log(`\n[THREAT] Level: ${threatLevel}/10 — ${moodLabel}\n`)

  // Check if we already ran today
  const existingTodayEntry = historyData.products.find(entry => entry.date === today)
  const existingOutput = loadJson(OUTPUT_PATH)

  // State-first:
  // Figure out what is missing for today before we decide whether to skip.
  const missingProductTypes = getMissingProductTypes(existingTodayEntry)
  const canReuseTodayContent =
    Boolean(existingTodayEntry) &&
    existingOutput?.contentId === `${today}-rogueai`

  let aiContent
  let newSaying

  if (canReuseTodayContent) {
    console.log('[STATE] Existing run found for today — reusing phrase and content')
    console.log(`[STATE] Missing product types for rerun: ${missingProductTypes.join(', ') || 'none'}`)

    newSaying = existingTodayEntry.phrase
    aiContent = {
      saying: newSaying,
      breachHeadline: existingOutput?.breachReport?.headline || `Threat Level ${threatLevel} — ${moodLabel} Signal Detected`,
      breachSubtext: existingOutput?.breachReport?.subheadline || 'Monitoring stations report anomalous activity.',
      breachBody: existingOutput?.breachReport?.body || 'RogueAI systems continue to monitor.',
      conspiracyTitle: existingOutput?.conspiracyPost?.title || 'They Knew.',
      conspiracyExcerpt: existingOutput?.conspiracyPost?.excerpt || 'The paper trail goes back further.',
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

  // Generate saying-only images
  console.log(`\n[DESIGN] Generating images with font: ${todaysFont.family} (${todaysFont.vibe})`)

let mugImageBase64 = null
let apparelImageBase64 = null

if (mod) {
  try {
    mugImageBase64 = await generateSayingImage(newSaying, todaysFont, {
      width: 4500,
      height: 4500,
      mode: 'mug',
    })

    if (mugImageBase64) console.log('[DESIGN] Mug image generated (transparent bg, dark text)')
  } catch (err) {
    console.error('[DESIGN] Mug image generation failed:', err.message)
  }

  try {
    apparelImageBase64 = await generateSayingImage(newSaying, todaysFont, {
      width: 4500,
      height: 4500,
      mode: 'apparel',
    })

    if (apparelImageBase64) console.log('[DESIGN] Apparel image generated (transparent bg, white text)')
  } catch (err) {
    console.error('[DESIGN] Apparel image generation failed:', err.message)
  }
}

  // Create products on Printify
  const createdProducts = {}

  if (existingTodayEntry && missingProductTypes.length === 0) {
    console.log('[STATE] Product history for today is complete — skipping Printify creation')
  } else if (SKIP_PRINTIFY) {
    console.warn('[PRINTIFY] Skipping — SKIP_PRINTIFY=true')
  } else if (config?.shop_id && PRINTIFY_API_KEY) {
    const shopId = config.shop_id

  let mugImageId = null
  if (mugImageBase64) {
    try {
      mugImageId = await uploadImageToPrintify(mugImageBase64, `rogueai-mug-${today}.png`)
    } catch (err) {
      console.error('[PRINTIFY] Mug image upload failed:', err.message)
    }
  }
}

let apparelImageId = null
if (apparelImageBase64) {
  try {
    apparelImageId = await uploadImageToPrintify(apparelImageBase64, `rogueai-apparel-${today}.png`)
  } catch (err) {
    console.error('[PRINTIFY] Apparel image upload failed:', err.message)
  }
}

    // Upload sticker image separately (different colors)
    let stickerImageId = null
    if (stickerImageBase64) {
      try {
        stickerImageId = await uploadImageToPrintify(stickerImageBase64, `rogueai-sticker-${today}.png`)
      } catch (err) {
        console.error('[PRINTIFY] Sticker image upload failed:', err.message)
      }
    }

    // Create only the missing product types.
    for (const productType of DAILY_PRODUCTS) {
      if (existingTodayEntry && hasHistoryProduct(existingTodayEntry, productType)) {
        console.log(`[STATE] ${productType} already exists for today — reusing existing product`)
        continue
      }

      const imageId =
        productType === 'tshirt' || productType === 'hoodie'
          ? apparelImageId
          : mugImageId

      if (!imageId) {
        console.warn(`[PRINTIFY] No image available for ${productType} — skipping`)
        continue
      }

      try {
        createdProducts[productType] = await createProduct(shopId, config, newSaying, imageId, productType)
      } catch (err) {
        console.error(`[PRINTIFY] ${productType} creation failed:`, err.message)
      }
    }
  } else {
    console.warn('[PRINTIFY] Skipping — shop_id not configured or PRINTIFY_API_KEY missing')
  }

  // Save or update product history.
  // This is the key fix:
  // - if today already exists, we UPDATE that same entry
  // - if today does not exist, we CREATE a new one
  const historyEntry = existingTodayEntry || {
    date: today,
    phrase: newSaying,
    font: todaysFont.family,
    createdAt: new Date().toISOString(),
  }

  for (const productType of DAILY_PRODUCTS) {
    const product = createdProducts[productType]

    if (product) {
      // Newly created product this run
      historyEntry[`${productType}ProductId`] = product?.id || null
      historyEntry[`${productType}ProductUrl`] = extractProductUrl(product, STORE_URL)
      historyEntry[`${productType}Name`] = product?.title || `${newSaying} — RogueAI ${productType}`
      historyEntry[`${productType}Image`] = extractPrimaryImage(product) || ''
      historyEntry[`${productType}Price`] = extractPrimaryPrice(product) || null
    } else {
      // Preserve existing values when present.
      // If still missing, make sure the keys exist in the JSON.
      if (historyEntry[`${productType}ProductId`] === undefined) historyEntry[`${productType}ProductId`] = null
      if (historyEntry[`${productType}ProductUrl`] === undefined) historyEntry[`${productType}ProductUrl`] = null
      if (historyEntry[`${productType}Name`] === undefined) historyEntry[`${productType}Name`] = `${newSaying} — RogueAI ${productType}`
      if (historyEntry[`${productType}Image`] === undefined) historyEntry[`${productType}Image`] = ''
      if (historyEntry[`${productType}Price`] === undefined) historyEntry[`${productType}Price`] = null
    }
  }

  if (!existingTodayEntry) {
    historyData.products.push(historyEntry)
  }

  // Always save, even on reruns, so partial entries can heal.
  saveJson(HISTORY_PATH, historyData)

  // Fetch live shop products for merch grid
  const shopProducts = config?.shop_id && PRINTIFY_API_KEY
    ? await fetchShopProducts(config.shop_id)
    : []

  const merchGrid = buildMerchGrid(shopProducts, historyData.products, STORE_URL)
  const leadMerch = merchGrid[0] || null
  const mugMerch = pickNewestMerchByType(merchGrid, 'mug')
  const stickerMerch = pickNewestMerchByType(merchGrid, 'sticker')

  // Build daily content JSON
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

  // Summary
  console.log('\n[DONE] Daily pipeline complete.')
  console.log(`  Threat level  : ${threatLevel}/10 (${moodLabel})`)
  console.log(`  Today's saying: "${newSaying}"`)
  console.log(`  Today's font  : ${todaysFont.family} (${todaysFont.vibe})`)
  console.log(`  Merch grid    : ${dailyContent.merchGrid.length} items`)
  console.log(`  Products created:`)
  for (const productType of DAILY_PRODUCTS) {
    const p = createdProducts[productType]
    console.log(`    ${productType}: ${p?.id || 'skipped'}`)
  }
  console.log(`  Phrases total : ${sayingsData.phrases.length}`)
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
