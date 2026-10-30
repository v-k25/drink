// Test-only upstream for production browser checks. Never connects to Supabase.
// Satisfies catalogue-server.ts (expected origin + an "sb_secret_" key) and serves
// planner_products from the local catalogue.json fixture. Phone sign-in and saved plans
// are retired, so every other upstream call is refused.
const EXPECTED_ORIGIN = 'https://ojptrukzildmkilwponx.supabase.co'
process.env.SUPABASE_URL = EXPECTED_ORIGIN
process.env.SUPABASE_ANON_KEY = 'test-only'
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-only'
const originalFetch = global.fetch
const respond = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
let rows
const catalogueRows = () => rows ??= require('../../../app/party-planner/catalogue.json')
  .map(p => ({ id: p.id, category: p.category, name: p.name, brand: p.brand, size_ml: p.sizeMl, price_paise: p.pricePaise }))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
global.fetch = async (url, options = {}) => {
  const address = String(url)
  if (!address.startsWith(EXPECTED_ORIGIN)) {
    if (address.includes('.supabase.co')) throw new Error('Real Supabase blocked in browser test')
    return originalFetch(url, options)
  }
  const method = (options.method || 'GET').toUpperCase()
  if (method === 'GET' && new URL(address).pathname === '/rest/v1/planner_products') {
    const all = catalogueRows()
    const [start, end] = String(options.headers?.Range ?? '0-999').split('-').map(Number)
    const page = all.slice(start, end + 1)
    if (!page.length) return respond([], 416)
    return respond(page, 206, { 'content-range': `${start}-${start + page.length - 1}/${all.length}` })
  }
  return respond({}, 403)
}
