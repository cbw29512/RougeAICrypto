// RogueAI Printify Setup Script
// Run this ONCE to discover blueprint IDs and configure the automation
// Usage: PRINTIFY_API_KEY=your_token node scripts/setup-printify.js

import fetch from 'node-fetch'
import fs from 'fs'

const TOKEN = process.env.PRINTIFY_API_KEY
const SHOP_ID = '11214644'

if (!TOKEN) {
  console.error('❌ Set PRINTIFY_API_KEY environment variable first')
  process.exit(1)
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

async function findBlueprints() {
  console.log('🔍 Fetching your existing products to get blueprint IDs...\n')

  const res = await fetch(`https://api.printify.com/v1/shops/${SHOP_ID}/products.json`, { headers })
  const data = await res.json()

  if (!data.data?.length) {
    console.error('❌ No products found. Make sure your token is correct.')
    process.exit(1)
  }

  console.log('✅ Found your existing products:\n')
  const config = {}
  for (const p of data.data) {
    console.log(`  ${p.title}`)
    console.log(`    blueprint_id: ${p.blueprint_id}`)
    console.log(`    print_provider_id: ${p.print_provider_id}`)
    console.log()
    // Use first mug as template
    if (!config.mug_blueprint_id) {
      config.mug_blueprint_id = p.blueprint_id
      config.mug_provider_id = p.print_provider_id
    }
  }

  // Now fetch variants for the mug blueprint
  console.log(`\n🔍 Fetching variants for blueprint ${config.mug_blueprint_id}...\n`)
  const vRes = await fetch(
    `https://api.printify.com/v1/catalog/blueprints/${config.mug_blueprint_id}/print_providers/${config.mug_provider_id}/variants.json`,
    { headers }
  )
  const vData = await vRes.json()

  if (vData.variants?.length) {
    config.mug_variant_ids = vData.variants.slice(0, 3).map(v => v.id)
    console.log(`✅ Mug variants: ${config.mug_variant_ids.join(', ')}`)
  }

  // Save config
  fs.writeFileSync('scripts/printify-config.json', JSON.stringify(config, null, 2))
  console.log('\n✅ Config saved to scripts/printify-config.json')
  console.log('🚀 You can now run the full pipeline!')
}

findBlueprints().catch(console.error)
