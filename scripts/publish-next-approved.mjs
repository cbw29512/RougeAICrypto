import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const REVIEW_QUEUE_PATH = path.join(ROOT, 'content', 'review-queue.json')
const PUBLISH_QUEUE_PATH = path.join(ROOT, 'content', 'publish-queue.json')

function logInfo(message) {
  console.log(`[publish-next-approved] ${message}`)
}

function logError(message) {
  console.error(`[publish-next-approved] ERROR: ${message}`)
}

function readJsonFile(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')

    if (!raw.trim()) {
      throw new Error(`${label} is empty`)
    }

    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} could not be read: ${error.message}`)
  }
}

function getNextApprovedCandidate(reviewQueue, publishQueue) {
  // State logic first:
  // - publishQueue.approved_ids controls publish order
  // - reviewQueue.candidates holds the actual records
  // - the next item is the first approved id whose candidate exists and is not published
  for (const approvedId of publishQueue.approved_ids) {
    const candidate = reviewQueue.candidates.find((item) => item.id === approvedId)

    if (!candidate) {
      throw new Error(`Approved id "${approvedId}" does not exist in review-queue.json`)
    }

    if (!candidate.published) {
      return candidate
    }
  }

  return null
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Candidate is missing or invalid')
  }

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    throw new Error('Candidate id is missing')
  }

  if (typeof candidate.saying !== 'string' || !candidate.saying.trim()) {
    throw new Error(`Candidate "${candidate.id}" is missing saying text`)
  }

  if (!Array.isArray(candidate.products)) {
    throw new Error(`Candidate "${candidate.id}" is missing products array`)
  }

  if (candidate.products.length !== 10) {
    throw new Error(`Candidate "${candidate.id}" must contain exactly 10 products`)
  }
}

function main() {
  try {
    logInfo('Loading queue files...')

    const reviewQueue = readJsonFile(REVIEW_QUEUE_PATH, 'content/review-queue.json')
    const publishQueue = readJsonFile(PUBLISH_QUEUE_PATH, 'content/publish-queue.json')

    if (!Array.isArray(reviewQueue.candidates)) {
      throw new Error('content/review-queue.json candidates must be an array')
    }

    if (!Array.isArray(publishQueue.approved_ids)) {
      throw new Error('content/publish-queue.json approved_ids must be an array')
    }

    const nextCandidate = getNextApprovedCandidate(reviewQueue, publishQueue)

    // Safe first version:
    // We are NOT publishing yet.
    // We are only proving that the queue logic works correctly.
    if (!nextCandidate) {
      logInfo('No approved unpublished candidate found.')
      return
    }

    validateCandidate(nextCandidate)

    logInfo(`Next approved candidate: ${nextCandidate.id}`)
    logInfo(`Saying: ${nextCandidate.saying}`)
    logInfo(`Products queued: ${nextCandidate.products.length}`)
    logInfo('Dry run only. No Printify publish has happened yet.')
  } catch (error) {
    logError(error.message)
    process.exit(1)
  }
}

main()