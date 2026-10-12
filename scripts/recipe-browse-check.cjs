#!/usr/bin/env node
// Focused read-only check for the Phase 1 Supabase recipe browse/detail routes.
//
// Requires a completed production build. Starts the production server on a
// loopback port and asserts, over plain HTTP (no browser, no new dependencies):
//   1. The eligibility gate precedes content on BOTH routes (list and detail).
//   2. With an eligibility cookie, the listing renders the honest state against
//      the live database (read-only anonymous REST via the running server) and
//      never surfaces legacy or draft recipe names.
//   3. Detail requests for ineligible ids return 404.
//
// The live read checks the reviewed launch recipes across the real collection
// pages. Synthetic eligible rows exercise filter combinations, recommendations,
// pagination and fail-closed REST handling without database writes.
'use strict'

const { spawn } = require('node:child_process')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert')

const root = path.join(__dirname, '..')
const port = 3126
const origin = `http://127.0.0.1:${port}`
const ELIGIBLE_COOKIE = 'allcheers_eligible=1'
// A legacy published row that must never surface in the recipe UI.
const LEGACY_NAME = 'Negroni'

function get(pathname, cookie) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${origin}${pathname}`, { headers: cookie ? { Cookie: cookie } : {} }, response => {
      let body = ''
      response.on('data', chunk => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode, body }))
    })
    request.on('error', reject)
    request.setTimeout(30000, () => request.destroy(new Error(`timeout fetching ${pathname}`)))
  })
}

// Content after <body>: head metadata (title/description) must not leak recipe
// content into the page body before the gate.
const bodyOnly = html => {
  const index = html.indexOf('<body')
  return index === -1 ? html : html.slice(index)
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await get('/')
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw new Error('production server did not become ready')
}

let server = null
let logs = ''

// ---------------------------------------------------------------------------
// Unit section: the real queries.ts over synthetic eligible data.
// ---------------------------------------------------------------------------

// Load the real app/find-my-drink/queries.ts (TypeScript) by transpiling it
// with the repo's own TypeScript package and stubbing its only import
// ('server-only', which throws outside server components). No copy of the
// logic is made — the assertions below run the actual source.
function loadQueriesModule() {
  const ts = require('typescript')
  const Module = require('module')
  const evidence = path.join(root, 'tmp', 'recipe-browse')
  fs.mkdirSync(evidence, { recursive: true })
  const stubPath = path.join(evidence, 'stub-server-only.cjs')
  fs.writeFileSync(stubPath, 'module.exports = {}\n')
  const source = fs.readFileSync(path.join(root, 'app', 'find-my-drink', 'queries.ts'), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const resolveFilename = Module._resolveFilename
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'server-only') return stubPath
    return resolveFilename.call(this, request, ...rest)
  }
  try {
    const mod = new Module('find-my-drink-queries', module)
    mod.filename = stubPath
    mod.paths = Module._nodeModulePaths(path.join(root, 'app', 'find-my-drink'))
    mod._compile(output, path.join(root, 'app', 'find-my-drink', 'queries.js'))
    return mod.exports
  } finally {
    Module._resolveFilename = resolveFilename
  }
}

// A minimal independent implementation of the documented filter semantics
// ("OR within the type facet, AND across facets and search"), used to verify
// the production facet counts against a straightforward reading of the spec.
function manualCount(all, { q, types, drinkType, method, maxIngredients: max }) {
  return all.filter(candidate =>
    (!q || candidate.name.toLowerCase().includes(q.toLowerCase()) || candidate.ingredients.some(ingredient => ingredient.toLowerCase().includes(q.toLowerCase()))) &&
    (drinkType === 'all' || candidate.alcoholType === drinkType) &&
    (types.length === 0 || types.includes(candidate.baseSpirit)) &&
    (method === null || candidate.preparationMethod === method) &&
    (max === null || candidate.ingredients.length <= max),
  ).length
}

function syntheticRow(overrides) {
  return {
    id: 'id', name: 'Name', description: null, category: null, baseSpirit: 'vodka',
    alcoholType: 'cocktail', ingredients: ['2 oz vodka'], preparation: ['Stir.'],
    glassware: null, garnish: null, abv: null, featured: false,
    sourceName: 'drinknation', sourceUrl: 'https://example.test/recipe',
    sourceRetrievedAt: '2026-01-01T00:00:00Z', contentOrigin: 'allcheers_original_from_facts',
    ingredientDetails: [{ raw: '2 oz vodka', name: 'vodka', amount: '2', unit: 'oz' }], recipeYield: null, servings: null,
    preparationMethod: 'build', prepTimeMin: null, iceType: null, allergens: null, hasCaffeine: null,
    ...overrides,
  }
}

// The raw PostgREST JSON shape the fetch stubs must return (snake_case columns
// plus status/editorial_ready) — toRecipeRow validates this raw shape.
function rawRow(overrides) {
  return {
    id: 'id', name: 'Name', status: 'published', editorial_ready: true,
    description: null, category: null, base_spirit: 'vodka', alcohol_type: 'cocktail',
    ingredients: ['2 oz vodka'], preparation: ['Stir.'], glassware: null, garnish: null,
    abv: null, featured: false, source_name: 'drinknation', source_url: 'https://example.test/recipe',
    source_retrieved_at: '2026-01-01T00:00:00Z', content_origin: 'allcheers_original_from_facts',
    ingredient_details: [{ raw: '2 oz vodka', name: 'vodka', amount: '2', unit: 'oz' }], recipe_yield: null, servings: null,
    preparation_method: null, prep_time_min: null, ice_type: null, allergens: null, has_caffeine: null, recipe_quality_issues: [],
    ...overrides,
  }
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: name => headers[name.toLowerCase()] ?? null },
  }
}

// Assert every captured drinks-read URL carries the identical frozen eligible
// filter (the single strongest check that list/detail/count/related reads can
// never serve legacy or draft rows).
function assertEligibleParams(url) {
  const params = new URL(url).searchParams
  assert.equal(params.get('status'), 'eq.published', 'every read must filter status=eq.published')
  assert.equal(params.get('editorial_ready'), 'is.true', 'every read must filter editorial_ready=is.true')
  assert.equal(params.get('alcohol_type'), 'in.(cocktail,mocktail)', 'every read must filter the alcohol_type vocabulary')
  for (const column of ['source_name', 'source_url', 'source_retrieved_at', 'content_origin']) {
    assert.equal(params.get(column), 'not.is.null', `every read must require non-null ${column}`)
  }
  assert.equal(params.get('recipe_quality_issues'), 'eq.{}', 'every read must require an exactly empty quality-issues array')
}

async function unitChecks() {
  const { buildListingData, loadRecipes, loadRecipe, loadRelated } = loadQueriesModule()

  // A 26-row eligible catalogue: enough to exercise two keyset pages and the
  // rails, with mixed spirits, types, ingredient counts and featured flags.
  const all = [
    ...Array.from({ length: 14 }, (_, i) => syntheticRow({ id: `vodka-${i}`, name: `Vodka Sour ${i}`, baseSpirit: 'vodka', alcoholType: 'cocktail', ingredients: Array.from({ length: 2 + (i % 5) }, (_, j) => `${j + 10} ml vodka part ${j}`), featured: i === 0 })),
    ...Array.from({ length: 5 }, (_, i) => syntheticRow({ id: `gin-${i}`, name: `Gin Fizz ${i}`, baseSpirit: 'gin', alcoholType: 'cocktail', ingredients: Array.from({ length: 1 + (i % 6) }, (_, j) => `${j + 10} ml gin part ${j}`) })),
    ...Array.from({ length: 4 }, (_, i) => syntheticRow({ id: `rum-${i}`, name: `Rum Punch ${i}`, baseSpirit: 'rum', alcoholType: 'cocktail', ingredients: Array.from({ length: 3 + i }, (_, j) => `${j + 10} ml rum part ${j}`) })),
    ...Array.from({ length: 3 }, (_, i) => syntheticRow({ id: `whiskey-${i}`, name: `Whiskey Highball ${i}`, baseSpirit: 'whiskey', alcoholType: 'cocktail', ingredients: Array.from({ length: 6 + i }, (_, j) => `${j + 10} ml whiskey part ${j}`) })),
    ...Array.from({ length: 6 }, (_, i) => syntheticRow({ id: `mocktail-${i}`, name: `Citrus Cooler ${i}`, baseSpirit: null, alcoholType: 'mocktail', ingredients: Array.from({ length: i < 2 ? 2 : 4 }, (_, j) => `${j + 10} ml citrus part ${j}`), featured: i === 1 })),
  ]
  assert.equal(all.length, 32, 'the fixture must exceed the page size plus recommendations')
  const originalRows = JSON.stringify(all)
  const base = { q: '', types: [], drinkType: 'all', method: null, maxIngredients: null }
  const data1 = buildListingData(all, base, null)
  assert.equal(data1.eligibleTotal, 32)
  assert.equal(data1.total, 32)
  assert.equal(data1.recommendations.length, 3)
  assert.deepEqual(data1.recommendations.slice(0, 2).map(row => row.id), ['mocktail-1', 'vodka-0'], 'featured matches lead, then stable names')
  assert.equal(data1.pageRows.length, 24)
  assert.equal(data1.shownTotal, 27)
  assert.ok(data1.nextCursor)
  const data2 = buildListingData(all, base, data1.nextCursor)
  assert.equal(data2.pageRows.length, 5)
  assert.equal(data2.recommendations.length, 0, 'later pages do not repeat recommendations')
  assert.equal(data2.shownTotal, 32)
  assert.equal(data2.nextCursor, null)
  const combined = [...data1.recommendations, ...data1.pageRows, ...data2.pageRows].map(row => row.id)
  assert.equal(new Set(combined).size, 32, 'recommendations and all pages have no duplicates or gaps')
  assert.deepEqual([...combined].sort(), all.map(row => row.id).sort())

  for (const drinkType of ['all', 'mocktail', 'cocktail']) {
    for (const types of [[], ['vodka'], ['gin', 'rum']]) {
      for (const q of ['', 'fizz', 'citrus', 'vodka', 'no-such-recipe']) {
        for (const maxIngredients of [null, 3, 5]) {
          for (const method of [null, 'build', 'shake']) {
            const filters = { q, types, drinkType, method, maxIngredients }
            const data = buildListingData(all, filters, null)
            assert.equal(data.total, manualCount(all, filters), JSON.stringify(filters))
            const displayed = [...data.recommendations, ...data.pageRows]
            assert.equal(new Set(displayed.map(row => row.id)).size, displayed.length, 'zero initial duplicates')
            assert.ok(displayed.every(row => manualCount([row], filters) === 1), 'EVERY suggestion and browse row respects EVERY active filter')
            assert.equal(data.matchingRows.length, data.total)
            assert.ok(data.matchingRows.every(row => manualCount([row], filters) === 1))
            for (const chip of data.typeChips) assert.equal(chip.count, manualCount(all, { ...filters, drinkType: chip.value }))
            for (const chip of data.spiritChips) assert.equal(chip.count, manualCount(all, { ...filters, types: [...new Set([...types, chip.name])] }))
            for (const chip of data.methodChips) assert.equal(chip.count, manualCount(all, { ...filters, method: chip.name }))
            for (const chip of data.maxChips) assert.equal(chip.count, manualCount(all, { ...filters, maxIngredients: chip.value }))
            if (!data.total) { assert.equal(data.nextCursor, null); assert.equal(data.recommendations.length, 0) }
          }
        }
      }
    }
  }
  const excluded = all.find(row => row.baseSpirit === 'gin')
  const filtered = { ...base, types: ['vodka'] }
  const after = buildListingData(all, filtered, { name: excluded.name, id: excluded.id })
  const initial = buildListingData(all, filtered, null).recommendations.map(row => row.id)
  assert.deepEqual(after.pageRows.map(row => row.id), all.filter(row => row.baseSpirit === 'vodka' && !initial.includes(row.id) && row.name.localeCompare(excluded.name) > 0).sort((a, b) => a.name.localeCompare(b.name)).map(row => row.id), 'stale cursor stays within active filters and after its named row')

  assert.equal(JSON.stringify(all), originalRows, 'listing assembly must not mutate eligible source rows')
  const restored = buildListingData(all, { ...base, picks: ['vodka-13', 'unknown', 'vodka-13'] }, null)
  assert.deepEqual(restored.recommendations.map(row => row.id), ['vodka-13'], 'safe selected IDs restore only unique eligible matches')
  const excludedRestore = buildListingData(all, { ...base, drinkType: 'mocktail', picks: ['vodka-13', 'unknown'] }, null)
  assert.ok(excludedRestore.recommendations.every(row => row.alcoholType === 'mocktail'), 'restored choices never loosen active filters')

  // --- Read paths: identical eligible filter and fail-closed behavior. ---
  const originalFetch = global.fetch
  const savedUrl = process.env.SUPABASE_URL
  const savedKey = process.env.SUPABASE_ANON_KEY
  process.env.SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  const requestedUrls = []
  global.fetch = async url => { requestedUrls.push(String(url)); return jsonResponse(200, [], { 'content-range': '*/0' }) }
  try {
    // Missing credentials fail closed before any request.
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    assert.equal((await loadRecipes()).state, 'unavailable', 'missing credentials must fail closed')
    assert.equal(requestedUrls.length, 0, 'missing credentials must not reach the network')
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    // The listing read carries the identical eligible filter.
    const ok = await loadRecipes()
    assert.equal(ok.state, 'ok', 'a valid empty payload must read ok')
    assert.equal(requestedUrls.length, 1, 'exactly one listing request expected')
    assertEligibleParams(requestedUrls[0])

    // The detail read carries the identical eligible filter and a quoted id.
    requestedUrls.length = 0
    const detail = await loadRecipe('negroni')
    assert.equal(detail.state, 'ok')
    assert.equal(detail.data, null, 'an absent id must read ok with null (upstream 404)')
    assertEligibleParams(requestedUrls[0])
    assert.equal(new URL(requestedUrls[0]).searchParams.get('id'), 'eq.negroni', 'the detail id must not gain literal quotation marks')
    requestedUrls.length = 0
    await loadRecipe('a"b')
    assert.equal(new URL(requestedUrls[0]).searchParams.get('id'), 'eq.a"b', 'URLSearchParams must retain the literal id in one parameter')

    // The related read carries the identical eligible filter, the stored
    // column predicate and excludes the current recipe.
    requestedUrls.length = 0
    const related = await loadRelated(all[0], 4)
    assert.equal(related.state, 'ok')
    assertEligibleParams(requestedUrls[0])
    assert.equal(new URL(requestedUrls[0]).searchParams.get('base_spirit'), 'eq.vodka', 'the related filter must retain the stored value without literal quotes')
    assert.ok(/id=neq\./.test(requestedUrls[0]), 'the related read must exclude the current recipe')
    assert.equal(related.data.length, 0, 'an empty related payload slices to zero')

    // 42703 / editorial_ready errors map to the honest not-ready state.
    global.fetch = async url => jsonResponse(400, { code: '42703', message: 'column "editorial_ready" does not exist' })
    assert.equal((await loadRecipes()).state, 'not-ready', 'a 42703 response must map to not-ready')
    global.fetch = async url => jsonResponse(400, { message: 'Could not find the "editorial_ready" column of "drinks" in the schema cache' })
    assert.equal((await loadRecipes()).state, 'not-ready', 'an editorial_ready schema-cache error must map to not-ready')

    // Every other error fails closed.
    global.fetch = async url => jsonResponse(500, { message: 'internal error' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'a server error must fail closed')
    global.fetch = async url => { throw new Error('network down') }
    assert.equal((await loadRecipes()).state, 'unavailable', 'a network error must fail closed')
    global.fetch = async url => jsonResponse(200, { unexpected: 'shape' }, { 'content-range': '*/1' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'an unexpected payload must fail closed')

    // A truncated read fails closed (a partial catalogue would misstate counts).
    const truncatedRow = rawRow({ id: 'only', name: 'Only' })
    global.fetch = async url => jsonResponse(200, [truncatedRow], { 'content-range': '0-0/30' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'a truncated read must fail closed')

    // An eligible total above the design bound fails closed.
    global.fetch = async url => jsonResponse(200, [truncatedRow], { 'content-range': '0-0/5000' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'an eligible total above the design bound must fail closed')

    // Rows failing the eligible predicate in full fail closed — including the
    // legacy published shape (published but not ready / unclassified /
    // NULL provenance) and drafts, even if the REST filter were bypassed.
    const legacyRow = rawRow({ id: 'legacy', name: 'Negroni', editorial_ready: false, base_spirit: null, alcohol_type: null, source_name: '', source_url: '', source_retrieved_at: '', content_origin: '' })
    const draftRow = rawRow({ id: 'draft', name: 'Draft', status: 'draft' })
    for (const [label, bad] of [['legacy', legacyRow], ['draft', draftRow]]) {
      global.fetch = async url => jsonResponse(200, [bad], { 'content-range': '0-0/1' })
      assert.equal((await loadRecipes()).state, 'unavailable', `a ${label} row must fail the read closed`)
    }
    global.fetch = async url => jsonResponse(200, [rawRow({ id: 'bad', name: 'Bad', alcohol_type: null })], { 'content-range': '0-0/1' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'an unclassified NULL alcohol_type row must fail the read closed')
    global.fetch = async url => jsonResponse(200, [rawRow({ id: 'bad', name: 'Bad', ingredients: ['2 oz', null] })], { 'content-range': '0-0/1' })
    assert.equal((await loadRecipes()).state, 'unavailable', 'a row with a non-string ingredient must fail the read closed')

    // A valid populated payload maps to typed rows with the stored fields.
    requestedUrls.length = 0
    global.fetch = async url => { requestedUrls.push(String(url)); return jsonResponse(200, [rawRow({ id: 'ok-1', name: 'Valid', base_spirit: 'gin', alcohol_type: 'cocktail', abv: 40, featured: true })], { 'content-range': '0-0/1' }) }
    const populated = await loadRecipes()
    assert.equal(populated.state, 'ok', 'a valid populated payload must read ok')
    assert.equal(populated.data.length, 1)
    assert.equal(populated.data[0].id, 'ok-1')
    assert.equal(populated.data[0].baseSpirit, 'gin')
    assert.equal(populated.data[0].abv, 40)
    assert.deepEqual(populated.data[0].ingredientDetails[0], { raw: '2 oz vodka', name: 'vodka', amount: '2', unit: 'oz' })
    assert.equal(populated.data[0].allergens, null, 'unknown allergens must remain unknown')
    assert.equal(populated.data[0].hasCaffeine, null, 'unknown caffeine must remain unknown')
    assertEligibleParams(requestedUrls[0])

    // Public eligibility rejects unreviewed flags, empty ingredients and empty method.
    for (const [label, bad] of [
      ['quality flags', { recipe_quality_issues: ['ambiguous'] }],
      ['empty ingredients', { ingredients: [] }],
      ['empty steps', { preparation: [] }],
      ['null quality flags', { recipe_quality_issues: null }],
    ]) {
      global.fetch = async url => jsonResponse(200, [rawRow({ id: `bad-${label}`, ...bad })], { 'content-range': '0-0/1' })
      assert.equal((await loadRecipes()).state, 'unavailable', `${label} must fail closed`)
    }
  } finally {
    global.fetch = originalFetch
    if (savedUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = savedUrl
    if (savedKey === undefined) delete process.env.SUPABASE_ANON_KEY
    else process.env.SUPABASE_ANON_KEY = savedKey
  }
  console.log('PASS: unit — identical eligible filter on every read, facet counts under other filters, stable keyset pagination, filtered deduplicated choices, safe restored picks, fail-closed reads.')
}

async function main() {
  assert.ok(fs.existsSync(path.join(root, '.env.local')), '.env.local is required for the live read check')
  assert.ok(fs.existsSync(path.join(root, '.next', 'BUILD_ID')), 'a completed production build (.next) is required; run pnpm build first')

  // Unit section first: no server needed; a failure exits before the live run.
  await unitChecks()

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', chunk => { logs += chunk })
  server.stderr.on('data', chunk => { logs += chunk })
  await waitForServer()

  // 1. Gate first on the listing.
  const gate = await get('/find-my-drink')
  assert.equal(gate.status, 200, 'the listing route must respond 200 behind the gate')
  const gateBody = bodyOnly(gate.body)
  assert.ok(gateBody.includes('One quick check'), 'the gate must render before listing content')
  assert.ok(!gateBody.includes('Curated cocktail and mocktail recipes'), 'listing content must not render before the gate')
  assert.ok(!gateBody.includes(LEGACY_NAME), 'no recipe names may surface before the gate')
  assert.ok(!gateBody.includes('Nothing is published here yet'), 'the library state must not render before the gate')

  // 2. Gate first on the detail route too.
  const gateDetail = await get('/find-my-drink/negroni')
  assert.equal(gateDetail.status, 200, 'the detail route must respond 200 behind the gate')
  assert.ok(bodyOnly(gateDetail.body).includes('One quick check'), 'the gate must render before detail content')
  assert.ok(!bodyOnly(gateDetail.body).includes(LEGACY_NAME), 'no recipe names may surface before the gate')

  // 3. Eligible listing with an eligibility cookie: honest state, no legacy/draft rows.
  const listing = await get('/find-my-drink', ELIGIBLE_COOKIE)
  assert.equal(listing.status, 200, 'the listing must respond 200 once eligible')
  const listingBody = bodyOnly(listing.body)
  assert.ok(listingBody.includes('Find a recipe'), 'the listing title must render once eligible')
  const launch = JSON.parse(fs.readFileSync(path.join(root, 'output/recipe-launch/remote-before.json'), 'utf8')).rows
  let allPages = listingBody
  const next = listingBody.match(/href="([^"]*cursor=[^"]*)"/)
  if (next) {
    const more = await get(next[1].replaceAll('&amp;', '&'), ELIGIBLE_COOKIE)
    assert.equal(more.status, 200)
    allPages += bodyOnly(more.body)
  }
  for (const row of launch) assert.ok(allPages.includes(`/find-my-drink/${row.id}?from=`), `reviewed recipe ${row.id} must surface across the collection pages`)
  assert.ok(!listingBody.includes('Nothing is published here yet'), 'published launch recipes must replace the empty state')
  assert.ok(!listingBody.includes('href="/find-my-drink/negroni"'), 'the excluded legacy id must never surface')

  // 4. Detail requests for ineligible ids return 404.
  const legacyDetail = await get('/find-my-drink/negroni', ELIGIBLE_COOKIE)
  assert.equal(legacyDetail.status, 404, 'a legacy published row must 404 on the detail route')
  const bogusDetail = await get('/find-my-drink/this-recipe-does-not-exist', ELIGIBLE_COOKIE)
  assert.equal(bogusDetail.status, 404, 'an unknown id must 404 on the detail route')
  const weirdDetail = await get('/find-my-drink/x%22)or(status.eq.draft)', ELIGIBLE_COOKIE)
  assert.equal(weirdDetail.status, 404, 'a malformed id must 404 without leaking drafts')

  const publishedDetail = await get('/find-my-drink/dn-cape-codder', ELIGIBLE_COOKIE)
  assert.equal(publishedDetail.status, 200, 'a reviewed published recipe must render')
  assert.ok(bodyOnly(publishedDetail.body).includes('Cape Codder'), 'published detail must show its recipe')
  assert.ok(!bodyOnly(publishedDetail.body).includes('Community features are temporarily unavailable'), 'live public community reads must succeed')
  const draftDetail = await get('/find-my-drink/dn-mojito', ELIGIBLE_COOKIE)
  assert.equal(draftDetail.status, 404, 'unreviewed imported drafts must remain hidden')
  console.log('PASS: recipe browse/detail gate-first, six published launch recipes, eligible detail and legacy/draft/unknown 404s.')
  if (/temporarily unavailable/.test(listingBody)) {
    console.log('NOTE: the listing reported an unavailable state; the live read may have failed (network or DB).')
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error('FAIL:', error && error.message ? error.message : error)
    if (error && error.stack) console.error(error.stack)
    process.exitCode = 1
  })
  .finally(() => {
    if (server) {
      server.kill()
      server.unref()
      const evidence = path.join(root, 'tmp', 'recipe-browse')
      fs.mkdirSync(evidence, { recursive: true })
      fs.writeFileSync(path.join(evidence, 'production-server.log'), logs)
    }
  })
