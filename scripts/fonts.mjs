/**
 * RogueAI Font Manager
 * ====================
 * Downloads and registers a curated set of computer-generated / techy fonts
 * from Google Fonts for use with node-canvas image generation.
 *
 * Usage:
 *   node scripts/fonts.mjs --download-only   (CI step: just download TTFs)
 *   import { registerAllFonts, pickRandomFont } from './fonts.mjs'  (runtime)
 *
 * Full path: C:\Users\divcl\OneDrive\Desktop\RougeAICrypto\scripts\fonts.mjs
 * GitHub:    cbw29512/RougeAICrypto/scripts/fonts.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = path.join(__dirname, '..', 'fonts')

// ─────────────────────────────────────────────
// CURATED FONT LIST
// Each font has a distinct computer-generated / techy vibe.
// The pipeline picks one at random each day for variety.
// ─────────────────────────────────────────────

const FONT_CATALOG = [
  {
    family: 'Share Tech Mono',
    file: 'ShareTechMono-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/sharetechmono/ShareTechMono-Regular.ttf',
    vibe: 'clean terminal readout',
  },
  {
    family: 'Fira Code',
    file: 'FiraCode-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/firacode/FiraCode%5Bwght%5D.ttf',
    file_is_variable: true,
    vibe: 'dev IDE monospace',
  },
  {
    family: 'VT323',
    file: 'VT323-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf',
    vibe: 'retro CRT / green screen',
  },
  {
    family: 'Orbitron',
    file: 'Orbitron-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/orbitron/Orbitron%5Bwght%5D.ttf',
    file_is_variable: true,
    vibe: 'futuristic sci-fi HUD',
  },
  {
    family: 'Audiowide',
    file: 'Audiowide-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/audiowide/Audiowide-Regular.ttf',
    vibe: 'wide tech display',
  },
  {
    family: 'Press Start 2P',
    file: 'PressStart2P-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf',
    vibe: '8-bit pixel console',
  },
  {
    family: 'Major Mono Display',
    file: 'MajorMonoDisplay-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/majormonodisplay/MajorMonoDisplay-Regular.ttf',
    vibe: 'brutalist mono uppercase',
  },
  {
    family: 'Space Mono',
    file: 'SpaceMono-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/spacemono/SpaceMono-Bold.ttf',
    vibe: 'space-age monospace',
  },
]

// ─────────────────────────────────────────────
// DOWNLOAD
// ─────────────────────────────────────────────

async function downloadFont(font) {
  const dest = path.join(FONTS_DIR, font.file)

  if (fs.existsSync(dest)) {
    const stat = fs.statSync(dest)
    if (stat.size > 1000) {
      console.log(`[FONTS] Already have ${font.family} (${stat.size} bytes)`)
      return true
    }
  }

  console.log(`[FONTS] Downloading ${font.family} from ${font.url}`)

  try {
    const res = await fetch(font.url, {
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'RogueAI-Font-Downloader/1.0' },
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    if (buffer.length < 1000) {
      throw new Error(`File too small (${buffer.length} bytes) — probably not a real font`)
    }

    fs.writeFileSync(dest, buffer)
    console.log(`[FONTS] Saved ${font.family} (${buffer.length} bytes)`)
    return true
  } catch (err) {
    console.error(`[FONTS] Failed to download ${font.family}: ${err.message}`)
    return false
  }
}

export async function downloadAllFonts() {
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true })
  }

  console.log(`[FONTS] Font directory: ${FONTS_DIR}`)
  console.log(`[FONTS] Downloading ${FONT_CATALOG.length} fonts...\n`)

  const results = await Promise.allSettled(FONT_CATALOG.map(downloadFont))
  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value).length
  const failed = results.length - succeeded

  console.log(`\n[FONTS] Download complete: ${succeeded} succeeded, ${failed} failed`)

  if (succeeded === 0) {
    throw new Error('No fonts downloaded — image generation will fail')
  }

  return succeeded
}

// ─────────────────────────────────────────────
// REGISTER (call after canvas is imported)
// ─────────────────────────────────────────────

export function registerAllFonts(registerFont) {
  if (!fs.existsSync(FONTS_DIR)) {
    console.warn('[FONTS] Font directory missing — falling back to system fonts')
    return []
  }

  const registered = []

  for (const font of FONT_CATALOG) {
    const fontPath = path.join(FONTS_DIR, font.file)

    if (!fs.existsSync(fontPath)) {
      console.warn(`[FONTS] Missing: ${font.file} — skipping`)
      continue
    }

    try {
      registerFont(fontPath, { family: font.family })
      registered.push(font)
      console.log(`[FONTS] Registered: ${font.family} (${font.vibe})`)
    } catch (err) {
      console.warn(`[FONTS] Failed to register ${font.family}: ${err.message}`)
    }
  }

  console.log(`[FONTS] ${registered.length}/${FONT_CATALOG.length} fonts ready`)
  return registered
}

// ─────────────────────────────────────────────
// RANDOM PICKER
// ─────────────────────────────────────────────

export function pickRandomFont(registeredFonts) {
  if (!registeredFonts || registeredFonts.length === 0) {
    console.warn('[FONTS] No registered fonts — using sans-serif fallback')
    return { family: 'sans-serif', vibe: 'system fallback' }
  }

  // Seed by day-of-year so the same font is used for all products in one run
  // but changes each day
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  )
  const index = dayOfYear % registeredFonts.length
  const picked = registeredFonts[index]

  console.log(`[FONTS] Today's font: ${picked.family} (${picked.vibe})`)
  return picked
}

// ─────────────────────────────────────────────
// CLI MODE: node scripts/fonts.mjs --download-only
// ─────────────────────────────────────────────

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMainModule) {
  downloadAllFonts()
    .then((count) => {
      console.log(`[FONTS] Ready (${count} fonts available)`)
      process.exit(0)
    })
    .catch((err) => {
      console.error(`[FONTS] FATAL: ${err.message}`)
      process.exit(1)
    })
}
