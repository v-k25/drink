// Account rules check (docs/accounts-plan.md). Runs app/account/rules.ts without a server, a database or a browser.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('app/account/rules.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const context = { exports: {}, console }
vm.runInNewContext(code, context)
const { normalizeIndianPhone, maskAddress, checkAddress, authErrorFrom, isSociferAccount, AUTH_MESSAGES, CODE_PATTERN, PHONE_CODES_ENABLED } = context.exports

// --- phone numbers: Indian mobiles only
for (const value of ['9876543210', '+91 98765 43210', '919876543210', '09876543210', '+91-98765-43210']) assert.equal(normalizeIndianPhone(value), '+919876543210', value)
for (const value of ['5876543210', '98765', '+1 415 555 0100', '+4498765432100', '98765432101']) assert.equal(normalizeIndianPhone(value), null, value)

// --- email and the phone switch (owner decision: email only for now)
assert.deepEqual({ ...checkAddress('email', '  Name@Example.COM ') }, { ok: true, address: 'name@example.com' })
assert.equal(checkAddress('email', 'not-an-email').ok, false)
assert.equal(PHONE_CODES_ENABLED, false)
assert.deepEqual({ ...checkAddress('phone', '9876543210') }, { ok: false, error: 'phone_off' })

// --- masking never shows the full address
assert.equal(maskAddress('phone', '+919876543210'), '+91 98••• ••210')
assert.equal(maskAddress('email', 'name@example.com'), 'na•••@example.com')

// --- codes
assert.ok(CODE_PATTERN.test('123456'))
for (const value of ['12345', '1234567', '12a456', '']) assert.ok(!CODE_PATTERN.test(value), value)

// --- Supabase errors map to plain messages
assert.equal(authErrorFrom(429, undefined), 'too_many')
assert.equal(authErrorFrom(429, 'over_email_send_rate_limit'), 'too_many')
assert.equal(authErrorFrom(422, 'otp_disabled'), 'no_account')
assert.equal(authErrorFrom(403, 'otp_expired'), 'code_expired')
assert.equal(authErrorFrom(500, 'unexpected_failure'), 'unavailable')
for (const message of Object.values(AUTH_MESSAGES)) assert.ok(message.length > 0 && message.length < 80, message)

// --- a login is only a Socifer account once create account has recorded consent (the project is shared with EkQuarter)
assert.equal(isSociferAccount({ consent: 'account-v1' }), true)
for (const value of [{}, null, undefined, { consent: true }]) assert.equal(isSociferAccount(value), false)

// --- create account must not silently sign an existing account in
const actions = fs.readFileSync('app/account/actions.ts', 'utf8')
const check = actions.indexOf('sociferAccountExists(checked.address)'), send = actions.indexOf("authFetch('/otp'")
assert.ok(check > 0 && check < send, 'create account checks for an existing account before any code is sent')
assert.ok(actions.includes("if (exists) return fail(retry, 'account_exists', 'address')"))
assert.ok(actions.includes("if (exists === null) return fail(retry, 'unavailable')"), 'a failed check sends nothing')
const migration = fs.readFileSync('supabase/migrations/20261104_socifer_account_exists.sql', 'utf8')
assert.ok(migration.includes('from public, anon, authenticated') && migration.includes('to service_role'), 'only the server can call the check')
assert.equal(authErrorFrom(422, 'otp_disabled'), 'no_account')

// --- no tokens reach the client: the form module must not import the session layer
const form = fs.readFileSync('app/account/auth-form.tsx', 'utf8')
assert.ok(!form.includes("from './session'"), 'auth-form must not import session.ts')
assert.ok(fs.readFileSync('app/account/session.ts', 'utf8').startsWith("import 'server-only'"))

console.log('account-check: PASS')
