import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const BRANDING_MODES = new Set(['logo_plus_saying', 'saying_only'])
const PRODUCT_URL_RE = /^https?:\/\/.+\/product\/\d+(\/.+)?$/i

const PATHS = {
  reviewQueue: path.join(ROOT, 'content', 'review-queue.json'),
  publishQueue: path.join(ROOT, 'content', 'publish-queue.json'),
  merchCatalog: path.join(ROOT, 'content', 'merch-catalog.json'),
  productConfig: path.join(ROOT, 'content', 'product-config.json'),
}

function logInfo(message) {
  console.log(`[merch-validate] ${message}`)
}

function logError(message) {
  console.error(`[merch-validate] ERROR: ${message}`)
}

function readJsonFile(filePath, label) {
  try {
    // Read raw text first so empty-file and JSON syntax failures are obvious.
    const raw = fs.readFileSync(filePath, 'utf8')

    // Empty JSON files are invalid and must fail early.
    if (!raw.trim()) {
      throw new Error(`${label} is empty`)
    }

    // Parse into a normal JavaScript object for structural validation.
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} could not be read as valid JSON: ${error.message}`)
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
}

function requireString(value, label, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }

  // For bootstrap files we may allow empty strings, but candidate/live data should not be blank.
  if (!allowEmpty && !value.trim()) {
    throw new Error(`${label} must not be empty`)
  }
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }
}

function validateProductConfig(data) {
  requireObject(data, 'content/product-config.json')
  requireString(data.brand_name, 'content/product-config.json brand_name')
  requireArray(data.product_types, 'content/product-config.json product_types')

  // Keep the blueprint fixed so this stays reusable and predictable across stores.
  if (data.product_types.length !== 10) {
    throw new Error('content/product-config.json must contain exactly 10 product_types')
  }

  const seenKeys = new Set()
  const configMap = new Map()

  for (const item of data.product_types) {
    requireObject(item, 'content/product-config.json product_types[]')
    requireString(item.key, 'content/product-config.json product_types[].key')
    requireString(item.label, 'content/product-config.json product_types[].label')
    requireString(item.branding_mode, 'content/product-config.json product_types[].branding_mode')
    requireBoolean(item.enabled, 'content/product-config.json product_types[].enabled')

    if (!BRANDING_MODES.has(item.branding_mode)) {
      throw new Error(
        `content/product-config.json has invalid branding_mode "${item.branding_mode}" for key "${item.key}"`
      )
    }

    if (seenKeys.has(item.key)) {
      throw new Error(`content/product-config.json has duplicate product key "${item.key}"`)
    }

    seenKeys.add(item.key)
    configMap.set(item.key, item)
  }

  return configMap
}

function validateReviewQueue(data, configMap) {
  requireObject(data, 'content/review-queue.json')
  requireString(data.week_of, 'content/review-queue.json week_of', { allowEmpty: true })
  requireString(data.generated_at, 'content/review-queue.json generated_at', { allowEmpty: true })
  requireArray(data.candidates, 'content/review-queue.json candidates')

  const seenCandidateIds = new Set()
  const expectedKeys = [...configMap.keys()].sort()

  for (const candidate of data.candidates) {
    requireObject(candidate, 'content/review-queue.json candidates[]')
    requireString(candidate.id, 'content/review-queue.json candidates[].id')
    requireString(candidate.saying, 'content/review-queue.json candidates[].saying')
    requireString(candidate.status, 'content/review-queue.json candidates[].status')
    requireBoolean(candidate.approved, 'content/review-queue.json candidates[].approved')
    requireBoolean(candidate.published, 'content/review-queue.json candidates[].published')
    requireArray(candidate.products, 'content/review-queue.json candidates[].products')

    if (seenCandidateIds.has(candidate.id)) {
      throw new Error(`content/review-queue.json has duplicate candidate id "${candidate.id}"`)
    }
    seenCandidateIds.add(candidate.id)

    if (candidate.products.length !== 10) {
      throw new Error(`Candidate "${candidate.id}" must contain exactly 10 products`)
    }

    const seenProductTypes = new Set()

    for (const product of candidate.products) {
      requireObject(product, `Candidate "${candidate.id}" products[]`)
      requireString(product.product_type, `Candidate "${candidate.id}" products[].product_type`)
      requireString(product.branding_mode, `Candidate "${candidate.id}" products[].branding_mode`)
      requireString(product.preview_image, `Candidate "${candidate.id}" products[].preview_image`)

      const configItem = configMap.get(product.product_type)
      if (!configItem) {
        throw new Error(`Candidate "${candidate.id}" has unknown product_type "${product.product_type}"`)
      }

      if (seenProductTypes.has(product.product_type)) {
        throw new Error(`Candidate "${candidate.id}" has duplicate product_type "${product.product_type}"`)
      }
      seenProductTypes.add(product.product_type)

      if (product.branding_mode !== configItem.branding_mode) {
        throw new Error(
          `Candidate "${candidate.id}" product "${product.product_type}" branding_mode must be "${configItem.branding_mode}"`
        )
      }
    }

    const actualKeys = [...seenProductTypes].sort()
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Candidate "${candidate.id}" does not match the 10-product blueprint`)
    }
  }

  return new Map(data.candidates.map((item) => [item.id, item]))
}

function validatePublishQueue(data, reviewCandidates, reviewWeekOf) {
  requireObject(data, 'content/publish-queue.json')
  requireString(data.week_of, 'content/publish-queue.json week_of', { allowEmpty: true })
  requireArray(data.approved_ids, 'content/publish-queue.json approved_ids')

  if (data.week_of && reviewWeekOf && data.week_of !== reviewWeekOf) {
    throw new Error('content/publish-queue.json week_of must match content/review-queue.json week_of')
  }

  const seenIds = new Set()

  for (const approvedId of data.approved_ids) {
    requireString(approvedId, 'content/publish-queue.json approved_ids[]')

    if (seenIds.has(approvedId)) {
      throw new Error(`content/publish-queue.json has duplicate approved id "${approvedId}"`)
    }
    seenIds.add(approvedId)

    const candidate = reviewCandidates.get(approvedId)
    if (!candidate) {
      throw new Error(`Approved id "${approvedId}" does not exist in content/review-queue.json`)
    }

    if (!candidate.approved) {
      throw new Error(`Approved id "${approvedId}" is not marked approved in content/review-queue.json`)
    }
  }
}

function validateMerchCatalog(data, configMap) {
  requireObject(data, 'content/merch-catalog.json')
  requireString(data.generated_at, 'content/merch-catalog.json generated_at', { allowEmpty: true })
  requireArray(data.items, 'content/merch-catalog.json items')

  for (const item of data.items) {
    requireObject(item, 'content/merch-catalog.json items[]')
    requireString(item.id, 'content/merch-catalog.json items[].id')
    requireString(item.title, 'content/merch-catalog.json items[].title')
    requireString(item.saying, 'content/merch-catalog.json items[].saying')
    requireString(item.product_type, 'content/merch-catalog.json items[].product_type')
    requireString(item.branding_mode, 'content/merch-catalog.json items[].branding_mode')
    requireString(item.printify_product_url, 'content/merch-catalog.json items[].printify_product_url')

    const configItem = configMap.get(item.product_type)
    if (!configItem) {
      throw new Error(`content/merch-catalog.json has unknown product_type "${item.product_type}"`)
    }

    if (item.branding_mode !== configItem.branding_mode) {
      throw new Error(
        `content/merch-catalog.json item "${item.id}" branding_mode must be "${configItem.branding_mode}"`
      )
    }

    // Force exact product pages, not generic store links.
    if (!PRODUCT_URL_RE.test(item.printify_product_url)) {
      throw new Error(
        `content/merch-catalog.json item "${item.id}" must use an exact Printify product URL`
      )
    }

    // Catch duplicated catalog junk early.
    if (/^copy of\b/i.test(item.title)) {
      throw new Error(`content/merch-catalog.json item "${item.id}" title must not start with "Copy of"`)
    }
  }
}

function main() {
  try {
    for (const [label, filePath] of Object.entries(PATHS)) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${label}`)
      }
    }

    const productConfig = readJsonFile(PATHS.productConfig, 'content/product-config.json')
    const reviewQueue = readJsonFile(PATHS.reviewQueue, 'content/review-queue.json')
    const publishQueue = readJsonFile(PATHS.publishQueue, 'content/publish-queue.json')
    const merchCatalog = readJsonFile(PATHS.merchCatalog, 'content/merch-catalog.json')

    const configMap = validateProductConfig(productConfig)
    const reviewCandidates = validateReviewQueue(reviewQueue, configMap)
    validatePublishQueue(publishQueue, reviewCandidates, reviewQueue.week_of)
    validateMerchCatalog(merchCatalog, configMap)

    logInfo('Validated content/product-config.json')
    logInfo('Validated content/review-queue.json')
    logInfo('Validated content/publish-queue.json')
    logInfo('Validated content/merch-catalog.json')
    logInfo('Merch pipeline schema looks good.')
  } catch (error) {
    logError(error.message)
    process.exit(1)
  }
}

main()