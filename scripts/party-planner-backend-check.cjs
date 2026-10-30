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
  assert.equal(cookieJar.last.name, 'allcheers_eligible')
  assert.equal(cookieJar.last.options.httpOnly, true)
  assert.equal(cookieJar.last.options.secure, true)
  assert.deepEqual(Object.keys(actions).sort(), ['acceptEligibilityForm', 'confirmEligibility', 'getCatalogue', 'validatePlan'], 'no sign-in actions remain')
  assert.deepEqual(Object.keys(session).sort(), ['eligibilityAccepted', 'setEligibility'], 'no session token helpers remain')
  const failedRead = catalogueRows[catalogueRows.length - 1]
  catalogueRows[catalogueRows.length - 1] = { ...failedRead, price_paise: 0 } // malformed row: catalogue must fail closed
  assert.deepEqual(await actions.getCatalogue(), { ok: false, error: 'Unable to complete that request.' })
  catalogueRows[catalogueRows.length - 1] = failedRead
  console.log('PASS: eligibility gate, trusted calculation path, catalogue fails closed, secure eligibility cookie, no sign-in surface.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
