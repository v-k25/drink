// Test-only upstream for production browser checks. Never sends SMS or connects to Supabase.
process.env.SUPABASE_URL = 'https://planner-test.invalid'
process.env.SUPABASE_ANON_KEY = 'test-only'
const originalFetch = global.fetch
const records = new Map()
// Opt-in historical records for the isolated saved-compatibility browser run.
// These are complete, internally consistent snapshots; app validSaved is not bypassed.
if (process.env.PLANNER_INVENTORY_SAVED_EDGES === '1') {
  const beer = require('../../../app/party-planner/catalogue.json').filter(p => p.category === 'Beer')
  for (const [index, kind] of ['size', 'missing'].entries()) {
    const products = [beer[0], { ...beer[1], ...(kind === 'size' ? { sizeMl: beer[1].sizeMl + 100 } : { id: 'historic-unavailable-beer', name: 'Historic unavailable Beer' }) }]
    const lines = products.map((product, i) => ({ ...product, quantity: i + 2, subtotalPaise: product.pricePaise * (i + 2) }))
    const totalPaise = lines.reduce((total, line) => total + line.subtotalPaise, 0)
    const id = `33333333-3333-4333-8333-33333333333${index}`
    records.set(id, { id, updated_at: '2026-09-01T10:00:00.000Z', snapshot: { guests: 41 + index, budgetPaise: 100000, city: 'Jaipur', lines, totalPaise, remainingPaise: 100000 - totalPaise } })
  }
}
let revision = 0
const userId = '11111111-1111-4111-8111-111111111111'
const respond = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
global.fetch = async (url, options = {}) => {
  const address = String(url)
  if (!address.startsWith(process.env.SUPABASE_URL)) {
    if (address.includes('.supabase.co')) throw new Error('Real Supabase blocked in browser test')
    return originalFetch(url, options)
  }
  const parsed = new URL(address)
  const headers = new Headers(options.headers)
  const body = options.body ? JSON.parse(options.body) : {}
  if (parsed.pathname === '/auth/v1/otp') return respond({})
  if (parsed.pathname === '/auth/v1/verify') return body.token === '123456' ? respond({ access_token: 'test-access', refresh_token: 'test-refresh' }) : respond({ error: 'Invalid code' }, 400)
  if (parsed.pathname === '/auth/v1/token') return respond({ access_token: 'test-access', refresh_token: 'test-refresh' })
  if (parsed.pathname === '/auth/v1/user') return headers.get('authorization') === 'Bearer test-access' ? respond({ id: userId }) : respond({}, 401)
  if (parsed.pathname === '/auth/v1/logout') return respond({})
  if (parsed.pathname !== '/rest/v1/party_plans' || headers.get('authorization') !== 'Bearer test-access') return respond({}, 403)
  const id = parsed.searchParams.get('id')?.replace(/^eq\./, '')
  const expected = parsed.searchParams.get('updated_at')?.replace(/^eq\./, '')
  if (options.method === 'POST') {
    if (records.has(body.id)) return respond({}, 409)
    const record = { id: body.id, updated_at: new Date(Date.UTC(2026, 8, 15, 0, 0, ++revision)).toISOString(), snapshot: body.snapshot }
    records.set(body.id, record)
    return respond([record], 201)
  }
  if (!parsed.searchParams.get('user_id')?.includes(userId)) return respond([], 200)
  const record = records.get(id)
  if (options.method === 'PATCH') {
    if (!record || record.updated_at !== expected) return respond([])
    const next = { ...record, snapshot: body.snapshot, updated_at: new Date(Date.UTC(2026, 8, 15, 0, 0, ++revision)).toISOString() }
    records.set(id, next); return respond([next])
  }
  if (options.method === 'DELETE') {
    if (!record || record.updated_at !== expected) return respond([])
    records.delete(id); return respond([record])
  }
  return respond(id ? (record ? [record] : []) : [...records.values()])
}
