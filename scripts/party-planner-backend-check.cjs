const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
process.env.SUPABASE_URL = 'https://ojptrukzildmkilwponx.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-key'
process.env.NODE_ENV = 'production'

const original = Module._extensions['.ts']
const cookies = new Map()
let requests = []
const cookieJar = { get: (name) => cookies.has(name) ? { name, value: cookies.get(name) } : undefined, set: (name, value, options) => { cookies.set(name, value); cookieJar.last = { name, value, options } } }
const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'next/headers') return { cookies: async () => cookieJar }
  if (id === 'server-only') return {}
  return originalRequire.apply(this, arguments)
}
Module._extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
}
const actions = require('../app/party-planner/actions.ts')
const session = require('../app/party-planner/session.ts')
Module._extensions['.ts'] = original
Module.prototype.require = originalRequire

const payload = require('../output/jaipur-replacement-1311/planner-products-payload.json')
const catalogue = payload.map(({ id, category, name, brand, size_ml, price_paise }) => ({ id, category, name, brand, sizeMl: size_ml, pricePaise: price_paise }))
assert.equal(catalogue.length, 1311)
const first = [...new Map(catalogue.map((product) => [product.category, product])).values()].slice(0, 2)
const input = { guests: 4, budgetPaise: 1000000, categories: first.map((p) => p.category), lines: first.map((p) => ({ productId: p.id, quantity: 1 })) };
const mockedPricePaise = first[0].pricePaise + 1
assert.ok(Number.isSafeInteger(mockedPricePaise))
assert.equal(mockedPricePaise, first[0].pricePaise + 1, 'mocked database price differs safely from the prepared fixture')
const catalogueRows = catalogue.map(({ id, category, name, brand, sizeMl, pricePaise }) => ({ id, category, name, brand, size_ml: sizeMl, price_paise: id === first[0].id ? mockedPricePaise : pricePaise }))
let handler = async () => ({ ok: true, status: 200, json: async () => [] })
const catalogueResponse = (url, init) => {
  if (!String(url).includes('/rest/v1/planner_products?')) return null
  const [start, end] = String(init.headers.Range).split('-').map(Number)
  const rows = catalogueRows.slice(start, end + 1)
  return { ok: true, status: rows.length === catalogueRows.length ? 200 : 206, headers: { get: (name) => name === 'content-range' ? `${start}-${start + rows.length - 1}/${catalogueRows.length}` : null }, json: async () => rows }
}
global.fetch = async (url, init = {}) => {
  requests.push({ url, init })
  return catalogueResponse(url, init) ?? handler(url, init)
}

(async () => {
  requests = []
  assert.equal((await actions.getCatalogue()).ok, false)
  assert.equal(requests.length, 0, 'eligibility gate reads no catalogue')
  assert.deepEqual(await actions.confirmEligibility(true), { ok: true })
  const loaded = await actions.getCatalogue()
  assert.equal(loaded.ok, true)
  assert.equal(loaded.products.find((product) => product.id === first[0].id).pricePaise, mockedPricePaise, 'getCatalogue uses the mocked database price')
  const calculated = await actions.validatePlan({ ...input, lines: input.lines.map((line) => ({ ...line, pricePaise: 1 })) })
  assert.equal(calculated.ok, true)
  assert.equal(requests.filter(({ url }) => String(url).includes('/rest/v1/planner_products?')).length, 4, 'catalogue is read through paginated GETs')
  assert.equal(calculated.plan.lines[0].pricePaise, mockedPricePaise, 'validatePlan uses the mocked database price')
  const retired = await actions.validatePlan({ ...input, lines: [{ productId: 'retired-product', quantity: 1 }] })
  assert.deepEqual(retired, { ok: false, error: 'Choose distinct known products and include every selected category.' }, 'missing historical product ID is unavailable for a new plan')
  assert.deepEqual(await actions.sendOtp('123'), { ok: false, error: 'Enter a valid phone number.' })
  assert.deepEqual(await actions.verifyOtp('+919999999999', '12'), { ok: false, error: 'Enter a valid phone number and code.' })
  assert.match(fs.readFileSync('app/party-planner/actions.ts', 'utf8'), /user_id=eq\./)
  assert.match(fs.readFileSync('app/party-planner/actions.ts', 'utf8'), /updated_at=eq\./)
  cookies.set('allcheers_access', 'access')
  cookies.set('allcheers_refresh', 'refresh')
  handler = async (url, init = {}) => {
    if (String(url).endsWith('/verify')) return { ok: true, status: 200, json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }) }
    if (String(url).endsWith('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    return { ok: true, status: 200, json: async () => [] }
  }
  assert.deepEqual(await actions.verifyOtp('+919999999999', '123456'), { ok: true })
  assert.equal(cookies.get('allcheers_access'), 'new-access')
  assert.equal(cookieJar.last.options.httpOnly, true)
  assert.equal(cookieJar.last.options.secure, true)
  assert.deepEqual(await session.getSessionState(), { signedIn: true })
  assert.equal(typeof cookies.get('allcheers_access'), 'string')
  const planId = '22222222-2222-4222-8222-222222222222'
  const saved = { id: planId, updated_at: '2026-09-14T10:00:00.000Z', snapshot: calculated.plan }
  let deleteAttempt = 0
  handler = async (url, init = {}) => {
    if (String(url).includes('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    if (init.method === 'POST') return { ok: true, status: 201, json: async () => [saved] }
    if (init.method === 'PATCH') return { ok: true, status: 200, json: async () => [] }
    if (init.method === 'DELETE') return { ok: true, status: 200, json: async () => (deleteAttempt++ ? [saved] : []) }
    return { ok: true, status: 200, json: async () => [saved] }
  }
  const createdFromDb = await actions.savePlan(input, planId)
  assert.equal(createdFromDb.ok, true)
  assert.equal(createdFromDb.record.snapshot.lines[0].pricePaise, mockedPricePaise, 'savePlan stores the mocked database price')
  const listed = await actions.listPlans(); assert.equal(listed.ok, true)
  assert.match(requests.at(-1).url, /user_id=eq\.11111111-1111-4111-8111-111111111111/)
  assert.equal((await actions.savePlan(input, planId, saved.updated_at)).ok, false)
  assert.equal((await actions.deletePlan(planId, saved.updated_at)).ok, false)
  assert.equal((await actions.deletePlan(planId, saved.updated_at)).ok, true)
  handler = async (url, init = {}) => {
    if (String(url).includes('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    return { ok: true, status: 200, json: async () => [{ ...saved, snapshot: { ...saved.snapshot, totalPaise: saved.snapshot.totalPaise + 1 } }] }
  }
  assert.equal((await actions.listPlans()).ok, false)
  const sibling = catalogue.find(p => p.category === first[0].category && p.id !== first[0].id)
  for (const draft of [input, { ...input, lines: [...input.lines, { productId: sibling.id, quantity: 3 }] }]) {
    let stored = null, stamp = 0
    handler = async (url, init = {}) => {
      if (String(url).endsWith('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
      if (init.method === 'POST' && stored) return { ok: false, status: 409, json: async () => [] }
      if (init.method === 'POST' || init.method === 'PATCH') {
        const body = JSON.parse(init.body)
        if (init.method === 'PATCH' && !String(url).includes(encodeURIComponent(stored.updated_at))) return { ok: true, status: 200, json: async () => [] }
        stored = { id: planId, updated_at: `2026-09-17T10:00:0${stamp++}.000Z`, snapshot: body.snapshot }
      }
      return { ok: true, status: 200, json: async () => stored ? [stored] : [] }
    }
    const created = await actions.savePlan(draft, planId); assert.equal(created.ok, true)
    assert.equal(created.record.snapshot.lines.length, draft.lines.length)
    assert.equal((await actions.savePlan(draft, planId)).ok, true, 'identical insert retry')
    assert.equal((await actions.listPlans()).plans[0].snapshot.lines.length, draft.lines.length)
    const edited = { ...draft, lines: draft.lines.map((line, index) => index ? line : { ...line, quantity: 5 }) }
    assert.equal((await actions.savePlan(edited, planId)).ok, false, 'conflicting insert retry')
    assert.equal((await actions.savePlan(edited, planId, created.record.updated_at)).ok, true)
    assert.equal((await actions.savePlan(edited, planId, created.record.updated_at)).ok, false, 'stale edit')
    const untampered = structuredClone(stored.snapshot)
    for (const corrupt of [s => { s.totalPaise++ }, s => { s.lines[0].quantity++ }, s => { s.lines.push(s.lines[0]) }, s => { s.extra = true }, s => { s.lines[0].subtotalPaise++ }]) {
      stored.snapshot = structuredClone(untampered); corrupt(stored.snapshot)
      assert.equal((await actions.listPlans()).ok, false, 'tampered snapshot rejected')
    }
  }
  handler = async () => { throw new Error('offline') }
  assert.deepEqual(await actions.sendOtp('+919999999999'), { ok: false, error: 'Unable to complete that request.' })
  let writes = 0
  const failedRead = catalogueRows.pop()
  const historical = { id: planId, updated_at: '2026-09-18T10:00:00.000Z', snapshot: { ...calculated.plan, lines: [{ ...calculated.plan.lines[0], id: 'retired-product' }, ...calculated.plan.lines.slice(1)] } }
  requests = []
  handler = async (url) => String(url).includes('/user')
    ? { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    : { ok: true, status: 200, json: async () => [historical] }
  const historicalListed = await actions.listPlans()
  assert.equal(historicalListed.ok, true, 'historical snapshot remains valid without a current catalogue product')
  assert.equal(historicalListed.plans[0].snapshot.lines[0].id, 'retired-product')
  assert.equal(requests.some(({ url }) => String(url).includes('/rest/v1/planner_products?')), false, 'listPlans does not read an unavailable catalogue')
  assert.deepEqual(await actions.getCatalogue(), { ok: false, error: 'Unable to complete that request.' })
  handler = async (url, init = {}) => {
    if (init.method === 'POST' || init.method === 'PATCH') writes++
    return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
  }
  assert.deepEqual(await actions.savePlan(input, planId), { ok: false, error: 'Unable to complete that request.' })
  assert.equal(writes, 0, 'catalogue failure performs no plan write')
  catalogueRows.push(failedRead)
  console.log('PASS: eligibility gate, trusted calculation path, OTP validation/failure, ownership/timestamp filters and safe session state.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
