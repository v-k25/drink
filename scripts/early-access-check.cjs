// Run: node scripts/early-access-check.cjs. No network or real credentials.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('app/early-access/actions.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
let calls = []
let responseStatus = 201
let reject = false
const context = {
  exports: {},
  process: { env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test-only' } },
  console: { error() {} },
  fetch: async (url, options) => {
    calls.push({ url, options })
    if (reject) throw new Error('offline')
    return { status: responseStatus, text: async () => 'test response' }
  },
}
vm.runInNewContext(code, context)
const submit = context.exports.submitEarlyAccess
const form = () => {
  const data = new FormData()
  for (const [key, value] of Object.entries({ email: ' PERSON@example.com ', interests: 'jaipur', consent: 'on', preference: 'both', cta_source: 'homepage' })) data.append(key, value)
  return data
}

async function check() {
  const invalid = await submit({}, new FormData())
  assert.equal(invalid.status, 'invalid')
  assert.ok(invalid.fieldErrors.email && invalid.fieldErrors.interests && invalid.fieldErrors.consent)
  assert.equal(calls.length, 0)
  const bot = form()
  bot.set('company', 'bot')
  assert.equal((await submit({}, bot)).status, 'success')
  assert.equal(calls.length, 0)
  assert.equal((await submit({}, form())).status, 'success')
  assert.equal(calls.length, 1)
  const { url, options } = calls[0]
  assert.equal(url, 'https://example.invalid/rest/v1/waitlist_subscribers')
  assert.equal(options.method, 'POST')
  assert.equal(options.headers.Prefer, 'return=minimal')
  assert.equal(options.cache, 'no-store')
  assert.deepEqual(JSON.parse(options.body), { email: 'person@example.com', source: 'early-access', cta_source: 'homepage', interests: ['jaipur'], preference: 'both', consent_version: 'early-access-v1' })
  for (const [status, expected] of [[409, 'duplicate'], [500, 'error']]) {
    responseStatus = status
    assert.equal((await submit({}, form())).status, expected)
  }
  reject = true
  assert.equal((await submit({}, form())).status, 'error')
  const noConsent = form()
  noConsent.delete('consent')
  calls = []
  assert.equal((await submit({}, noConsent)).status, 'invalid')
  assert.equal(calls.length, 0)
  console.log('PASS: validation, consent, honeypot, insert-only payload, success, duplicate, server error and network error; no live requests.')
}
check().catch(error => { console.error(error); process.exitCode = 1 })
