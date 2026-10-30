// Booking Phase 1 check. Runs without a database or a browser:
//  1. the TypeScript rules in app/bookings/booking.ts, including the one demo walk-through from supabase/seed/booking_demo.sql;
//  2. static checks on the migration and seed SQL (RLS, grants, search_path, test-only flags).
// It does NOT execute the SQL. Run the migration on a staging database for that (see supabase/README.md).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('app/bookings/booking.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const context = { exports: {}, console }
vm.runInNewContext(code, context)
const { BOOKING_STATUSES, TRANSITIONS, canTransition, holdsCapacity, checkBookingRequest, BOOKING_MESSAGES } = context.exports

// --- state machine
assert.deepEqual([...BOOKING_STATUSES], ['requested', 'approved', 'declined', 'expired', 'cancelled'])
assert.ok(canTransition('requested', 'approved') && canTransition('requested', 'declined') && canTransition('requested', 'expired') && canTransition('requested', 'cancelled'))
assert.ok(canTransition('approved', 'cancelled'))
for (const final of ['declined', 'expired', 'cancelled']) assert.equal(TRANSITIONS[final].length, 0, final + ' is final')
assert.ok(!canTransition('approved', 'declined') && !canTransition('approved', 'requested') && !canTransition('declined', 'approved'))
assert.deepEqual([...BOOKING_STATUSES].filter(holdsCapacity), ['requested', 'approved'])

// --- the demo offer (same numbers as supabase/seed/booking_demo.sql: capacity 12, parties up to 6)
const seed = fs.readFileSync('supabase/seed/booking_demo.sql', 'utf8')
assert.match(seed, /'demo-club-jaipur'/)
assert.match(seed, /, 0, 12, 6, true, true\s+from public\.venues v/, 'demo offer is free, capacity 12, party up to 6, active, is_demo')
const offer = { id: 'offer-1', active: true, venueActive: true, capacityPerNight: 12, maxPartySize: 6 }
const base = { offerId: 'offer-1', night: '2026-11-14', partySize: 4, note: 'Birthday', idempotencyKey: 'demo-key-0001' }
const today = '2026-10-30'
const expectError = (input, off, booked, error) => assert.deepEqual(JSON.parse(JSON.stringify(checkBookingRequest(input, off, today, booked))), { ok: false, error })

assert.deepEqual(JSON.parse(JSON.stringify(checkBookingRequest(base, offer, today, 0))), { ok: true })
assert.deepEqual(JSON.parse(JSON.stringify(checkBookingRequest(base, offer, today, 8))), { ok: true }, '8 + 4 fills the night exactly')
expectError(base, offer, 9, 'capacity_exceeded')
expectError({ ...base, partySize: 7 }, offer, 0, 'invalid_party_size')
expectError({ ...base, partySize: 0 }, offer, 0, 'invalid_party_size')
expectError({ ...base, partySize: 2.5 }, offer, 0, 'invalid_party_size')
expectError({ ...base, night: '2026-10-29' }, offer, 0, 'invalid_night')
assert.deepEqual(JSON.parse(JSON.stringify(checkBookingRequest({ ...base, night: today }, offer, today, 0))), { ok: true }, 'tonight is allowed')
assert.deepEqual(JSON.parse(JSON.stringify(checkBookingRequest({ ...base, night: '2026-12-29' }, offer, today, 0))), { ok: true }, 'day 60 is allowed')
expectError({ ...base, night: '2026-12-30' }, offer, 0, 'invalid_night')
expectError({ ...base, night: 'tomorrow' }, offer, 0, 'invalid_night')
expectError({ ...base, note: 'x'.repeat(301) }, offer, 0, 'invalid_note')
expectError({ ...base, idempotencyKey: 'short' }, offer, 0, 'invalid_idempotency_key')
expectError(base, { ...offer, active: false }, 0, 'offer_unavailable')
expectError(base, { ...offer, venueActive: false }, 0, 'offer_unavailable')
expectError(base, null, 0, 'offer_unavailable')
for (const message of Object.values(BOOKING_MESSAGES)) assert.ok(!/!/.test(message) && message.length < 80, 'plain, short, no exclamation marks: ' + message)

// --- migration SQL, static
const sql = fs.readFileSync('supabase/migrations/20261030_booking_phase1.sql', 'utf8')
const tables = ['venues', 'venue_members', 'venue_offers', 'booking_requests', 'booking_status_history']
for (const table of tables) {
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), table + ' has RLS')
  assert.match(sql, new RegExp(`create table if not exists public\\.${table} `), table + ' is created')
}
assert.match(sql, /revoke all on public\.venues, public\.venue_members, public\.venue_offers, public\.booking_requests, public\.booking_status_history from anon, authenticated/)
assert.ok(!/grant (insert|update|delete|all)[^;]*to[^;]*\b(anon|authenticated)\b/i.test(sql.replace(/to service_role/g, '')), 'clients get select only')
assert.ok(!/create policy [^;]*for (insert|update|delete|all)/i.test(sql), 'no write policies: writes go through functions')
const functions = [...sql.matchAll(/create or replace function public\.(\w+)\(/g)].map(m => m[1])
assert.deepEqual(functions, ['create_booking_request', 'decide_booking_request', 'cancel_booking_request', 'expire_booking_requests'])
assert.equal((sql.match(/security definer set search_path = ''/g) || []).length, functions.length, 'every definer function pins search_path')
for (const fn of functions) assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`), fn + ' is revoked from public')
assert.match(sql, /grant execute on function public\.expire_booking_requests\(\) to service_role;/)
assert.ok(!/expire_booking_requests\(\) to[^;]*authenticated/.test(sql), 'expiry is service-role only')
assert.match(sql, /booking_requests_active_unique[\s\S]*where status in \('requested', 'approved'\)/, 'one live request per user, venue and night')
assert.match(sql, /for update of o/, 'offer row is locked before the capacity check')
assert.match(sql, /status in \('requested', 'approved', 'declined', 'expired', 'cancelled'\)/)
assert.ok(!/create table[^;]*(payment|quote|pass|refund)/i.test(sql), 'no payment tables in Phase 1')
assert.match(sql, /NOT yet applied/)

console.log('booking-check: ok')
