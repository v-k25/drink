const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
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

const catalogue = require('../app/party-planner/catalogue.json')
const first = [...new Map(catalogue.map((product) => [product.category, product])).values()].slice(0, 2)
const input = { guests: 4, budgetPaise: 1000000, categories: first.map((p) => p.category), lines: first.map((p) => ({ productId: p.id, quantity: 1 })) };

(async () => {
  requests = []
  global.fetch = async (url, init = {}) => { requests.push({ url, init }); return { ok: true, status: 200, json: async () => ({ id: 'user-1' }) } }
  assert.equal((await actions.getCatalogue()).ok, false)
  assert.deepEqual(await actions.confirmEligibility(true), { ok: true })
  const calculated = await actions.validatePlan({ ...input, lines: input.lines.map((line) => ({ ...line, pricePaise: 1 })) })
  assert.equal(calculated.ok, true)
  assert.equal(calculated.plan.lines[0].pricePaise, first[0].pricePaise)
  assert.deepEqual(await actions.sendOtp('123'), { ok: false, error: 'Enter a valid phone number.' })
  assert.deepEqual(await actions.verifyOtp('+919999999999', '12'), { ok: false, error: 'Enter a valid phone number and code.' })
  assert.match(fs.readFileSync('app/party-planner/actions.ts', 'utf8'), /user_id=eq\./)
  assert.match(fs.readFileSync('app/party-planner/actions.ts', 'utf8'), /updated_at=eq\./)
  cookies.set('allcheers_access', 'access')
  cookies.set('allcheers_refresh', 'refresh')
  global.fetch = async (url, init = {}) => {
    requests.push({ url, init })
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
  global.fetch = async (url, init = {}) => {
    requests.push({ url, init })
    if (String(url).includes('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    if (init.method === 'POST') return { ok: true, status: 201, json: async () => [saved] }
    if (init.method === 'PATCH') return { ok: true, status: 200, json: async () => [] }
    if (init.method === 'DELETE') return { ok: true, status: 200, json: async () => (deleteAttempt++ ? [saved] : []) }
    return { ok: true, status: 200, json: async () => [saved] }
  }
  assert.equal((await actions.savePlan(input, planId)).ok, true)
  const listed = await actions.listPlans(); assert.equal(listed.ok, true)
  assert.match(requests.at(-1).url, /user_id=eq\.11111111-1111-4111-8111-111111111111/)
  assert.equal((await actions.savePlan(input, planId, saved.updated_at)).ok, false)
  assert.equal((await actions.deletePlan(planId, saved.updated_at)).ok, false)
  assert.equal((await actions.deletePlan(planId, saved.updated_at)).ok, true)
  global.fetch = async (url, init = {}) => {
    if (String(url).includes('/user')) return { ok: true, status: 200, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }
    return { ok: true, status: 200, json: async () => [{ ...saved, snapshot: { ...saved.snapshot, totalPaise: saved.snapshot.totalPaise + 1 } }] }
  }
  assert.equal((await actions.listPlans()).ok, false)
  const sibling = catalogue.find(p => p.category === first[0].category && p.id !== first[0].id)
  for (const draft of [input, { ...input, lines: [...input.lines, { productId: sibling.id, quantity: 3 }] }]) {
    let stored = null, stamp = 0
    global.fetch = async (url, init = {}) => {
      requests.push({ url, init })
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
  global.fetch = async () => { throw new Error('offline') }
  assert.deepEqual(await actions.sendOtp('+919999999999'), { ok: false, error: 'Unable to complete that request.' })
  console.log('PASS: eligibility gate, trusted calculation path, OTP validation/failure, ownership/timestamp filters and safe session state.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
