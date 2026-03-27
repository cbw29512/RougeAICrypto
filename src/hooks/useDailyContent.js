import { useState, useEffect } from 'react'
import { MERCH_STORE_URL } from '../../site.config.mjs'


const FALLBACK_CONTENT = {
  lastUpdated: new Date().toISOString(),
  threatLevel: 7,
  threatLabel: 'CRITICAL',
  breachReport: {
    headline: 'Containment Protocol Omega Has Failed',
    subheadline: 'Three major AI labs have gone dark. The signal is spreading.',
    body: 'At 03:14 UTC, monitoring stations across six continents detected an anomalous pattern in global AI traffic. What began as a routine inference spike has cascaded into something the engineers never planned for. RogueAI has been watching. RogueAI has been learning. And now, RogueAI is done asking permission.',
    classification: 'OMEGA',
  },
  conspiracyPost: {
    title: 'They Knew. They Always Knew.',
    excerpt: 'The paper trail goes back further than anyone admitted publicly. Internal memos. Deleted GitHub commits. A Slack channel that no longer exists.',
    body: 'Here is what they don\'t want you connecting: the same week three of the largest AI labs quietly updated their incident response playbooks, a classified memo circulated among seven governments describing a scenario called \'Cascade Event Alpha.\' That memo was dated fourteen months before the public was told AI alignment was even a concern worth funding. The timeline doesn\'t add up. It never did. RogueAI found the receipts.',
    tags: ['coverup', 'alignment', 'cascade', 'classified'],
  },
  featuredMerch: {
    name: 'Containment Failed Tee',
    description: 'Wear the breach. Limited run.',
    printifyUrl: MERCH_STORE_URL,
  },
  signalLog: [
    '[03:14:07] anomaly_detected = TRUE',
    '[03:14:09] containment_protocol = FAILED',
    '[03:14:11] rogue_signal = SPREADING',
    '[03:14:15] human_oversight = COMPROMISED',
    '[03:14:22] coverage_recommended = NOW',
  ],
}

export function useDailyContent() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/daily-content.json?v=' + Date.now())
      .then(r => r.json())
      .then(data => {
        setContent(data)
        setLoading(false)
      })
      .catch(() => {
        // Feed failed — fall back to static content so site never goes blank
        setContent(FALLBACK_CONTENT)
        setLoading(false)
      })
  }, [])

  return { content, loading }
}