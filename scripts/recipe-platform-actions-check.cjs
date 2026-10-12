const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

let eligible = true, signedIn = true, published = true, failing = '', corruptStats = false
let saved = null, liked = false, review = null
const requests = []
const session = { eligibilityAccepted: async () => eligible, verifiedSession: async () => signedIn ? { user: { id: 'owner-A' }, access: 'verified-token' } : null }
const queries = { loadRecipe: async () => ({ state: 'ok', data: published ? { id: 'recipe' } : null }) }
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = async (url, init = {}) => {
  const parsed = new URL(url), table = parsed.pathname.split('/').pop(), method = init.method ?? 'GET'
  const payload = init.body ? JSON.parse(init.body) : null
  requests.push({ table, method, payload, query: parsed.searchParams, headers: init.headers })
  if (table === failing) return response({}, 500)
  if (table === 'profiles') return response({}, 201)
  if (table === 'saved_drinks') {
    if (method === 'POST') { saved ??= { drink_id: 'recipe', note: null }; return response({}, 201) }
    if (method === 'PATCH') { if (!saved) return response([]); saved.note = payload.note; return response([saved]) }
    if (method === 'DELETE') { saved = null; return response([]) }
    return response(saved ? [saved] : [])
  }
  if (table === 'drink_likes') { if (method === 'POST') liked = true; if (method === 'DELETE') liked = false; return response(liked ? [{ drink_id: 'recipe' }] : []) }
  if (table === 'drink_reviews') {
    if (method === 'PATCH') { if (!review) return response([]); review = { ...payload, moderation_status: 'pending' }; return response([review]) }
    if (method === 'POST') { review = { ...payload, moderation_status: 'pending' }; return response({}, 201) }
    if (method === 'DELETE') review = null
    return response(review ? [review] : [])
  }
  if (table === 'drink_social_stats') return response([{ likes: corruptStats ? 'invalid' : Number(liked), reviews: 0, average_rating: null }])
  return response([])
}
function load(file) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name === '../party-planner/session' ? session : name === './queries' ? queries : {}, fetch: fetchMock, process: { env: { SUPABASE_URL: 'https://mock.invalid', SUPABASE_ANON_KEY: 'anon-test' } }, AbortSignal, console: { error() {} }, encodeURIComponent }, { filename: file })
  return module.exports
}
async function main() {
  const a = load('app/find-my-drink/actions.ts'), c = load('app/find-my-drink/community.ts')
  signedIn = false; assert.equal((await a.setRecipeSaved('recipe', true)).unauthorized, true); assert.equal(requests.length, 0)
  signedIn = true; eligible = false; assert.equal((await a.setRecipeLiked('recipe', true)).ok, false); assert.equal(requests.length, 0)
  eligible = true; published = false; assert.equal((await a.submitRecipeComment('recipe', 'tip', 'Tip')).ok, false); assert.equal(requests.length, 0)
  published = true
  assert.equal((await a.setRecipeSaved('recipe', 'true')).ok, false)
  assert.equal((await a.updateRecipeNote('recipe', 'x'.repeat(501))).ok, false)
  assert.equal((await a.submitRecipeReview('recipe', 6, 'Review')).ok, false)
  assert.equal((await a.submitRecipeComment('recipe', 'invalid', 'Comment')).ok, false)
  assert.equal((await a.updateRecipeNote('recipe', 'Not saved')).ok, false)
  assert.equal((await a.setRecipeSaved('recipe', true)).ok, true)
  assert.equal((await a.updateRecipeNote('recipe', 'Private note')).ok, true)
  assert.equal((await a.setRecipeSaved('recipe', true)).ok, true); assert.equal(saved.note, 'Private note')
  assert.equal((await a.setRecipeLiked('recipe', true)).ok, true)
  assert.equal((await a.submitRecipeReview('recipe', 4, 'First')).ok, true)
  assert.equal((await a.submitRecipeReview('recipe', 5, 'Edited')).ok, true); assert.equal(review.body, 'Edited')
  failing = 'drink_reviews'; assert.equal((await a.submitRecipeReview('recipe', 3, 'Failed edit')).ok, false); assert.equal(review.body, 'Edited')
  failing = 'drink_comments'; assert.equal((await a.submitRecipeComment('recipe', 'tip', 'Useful')).ok, false)
  assert.equal(await c.loadCommunity('recipe'), null)
  failing = ''; assert.equal((await c.loadCommunity('recipe')).note, 'Private note')
  corruptStats = true; assert.equal(await c.loadCommunity('recipe'), null); corruptStats = false
  for (const req of requests.filter(req => req.payload && req.table !== 'profiles')) {
    assert.equal(Object.hasOwn(req.payload, 'user_id'), false)
    assert.equal(Object.hasOwn(req.payload, 'moderation_status'), false)
    assert.equal(req.headers.Authorization, 'Bearer verified-token')
  }
  const noteUpdate = requests.find(req => req.table === 'saved_drinks' && req.method === 'PATCH')
  assert.equal(noteUpdate.query.get('select'), 'drink_id,note')
  console.log('PASS: real actions/read helpers with mocked auth/REST — gates, bounds, private notes, idempotent save, review edit, failed writes and unavailable reads')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
