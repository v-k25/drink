const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

process.env.SUPABASE_URL = 'https://ojptrukzildmkilwponx.supabase.co'
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
const original = Module._extensions['.ts']
const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'server-only') return {}
  return originalRequire.apply(this, arguments)
}
Module._extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
}
const { readCatalogue } = require('../app/party-planner/catalogue-server.ts')
Module._extensions['.ts'] = original
Module.prototype.require = originalRequire

const categoryCounts = {
  Beers: 107, 'Blended Scotch': 51, Brandy: 22, Champagne: 10, Gin: 84, Liqueurs: 38, 'Made in India Whisky': 228,
  'Ready to Drink': 23, 'Red Wine': 168, 'Rose Wine': 27, Rum: 92, Sake: 7, 'Single Malts': 88, 'Sparkling Wine': 39,
  Tequila: 47, Vodka: 152, 'White Wine': 92, 'World Whisky': 36,
}
const makeRows = () => Object.entries(categoryCounts).flatMap(([category, count], categoryIndex) => Array.from({ length: count }, (_, index) => ({
  id: `p${String(categoryIndex).padStart(2, '0')}-${String(index).padStart(4, '0')}`,
  category, name: `Product ${categoryIndex}-${index}`, brand: 'Brand', size_ml: 750, price_paise: 99900,
}))).sort((a, b) => a.id.localeCompare(b.id))
const response = (rows, start, total = 1311, status = 206, headers = {}) => ({
  status,
  headers: { get: (name) => name === 'content-range' ? `${start}-${start + rows.length - 1}/${total}` : headers[name] ?? null },
  json: async () => rows,
})
const pagedResponse = (all) => async (url, init) => {
  const [start, end] = String(init.headers.Range).split('-').map(Number)
  return response(all.slice(start, end + 1), start, all.length)
}

;(async () => {
  const all = makeRows()
  const readerSource = fs.readFileSync('app/party-planner/catalogue-server.ts', 'utf8')
  assert.doesNotMatch(readerSource, /catalogue\.json|planner_products_candidate/)
  assert.match(readerSource, /\/rest\/v1\/planner_products/)
  let calls = []
  global.fetch = async (url, init) => {
    calls.push({ url, init })
    const start = [0, 500, 1000][calls.length - 1]
    return response(all.slice(start, Math.min(start + 500, all.length)), start, all.length)
  }
  const products = await readCatalogue()
  assert.equal(products.length, 1311)
  assert.equal(calls.length, 3)
  assert.equal(calls[0].init.headers.apikey, 'sb_secret_test')
  assert.equal(calls[0].init.headers.Authorization, undefined)
  assert.match(calls[0].init.headers.Prefer, /count=exact/)
  assert.equal(calls[0].init.headers.Range, '0-999')
  assert.equal(calls[0].init.redirect, 'error')

  const expectFailure = async (setup) => { global.fetch = setup; await assert.rejects(readCatalogue, /Unable to load the Jaipur catalogue/) }
  let requestsAfterWrongHost = 0
  process.env.SUPABASE_URL = 'https://attacker.example'
  global.fetch = async () => { requestsAfterWrongHost++ }
  await assert.rejects(readCatalogue, /Unable to load the Jaipur catalogue/)
  assert.equal(requestsAfterWrongHost, 0)
  process.env.SUPABASE_URL = 'https://ojptrukzildmkilwponx.supabase.co'
  delete process.env.SUPABASE_SECRET_KEY
  await assert.rejects(readCatalogue, /Unable to load the Jaipur catalogue/)
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  await expectFailure(async (url, init) => {
    assert.equal(init.redirect, 'error')
    assert.equal(init.headers.apikey, 'sb_secret_test')
    throw new TypeError('redirect rejected')
  })
  await expectFailure(async () => response(all.slice(0, 500), 0, 1311, 500))
  await expectFailure(async () => response([{ ...all[0] }, { ...all[0] }], 0, 1311))
  await expectFailure(async () => response(all.slice(0, 500), 0, 1310))
  await expectFailure(async () => response(all.slice(0, 500), 0, 1311, 500))
  assert.equal(calls[0].init.cache, undefined)
  assert.deepEqual(calls[0].init.next, { revalidate: 3600, tags: ['planner-catalogue'] })

  // Resilience: row and category changes within sanity bounds still load.
  const expectLoad = async (rows) => { global.fetch = pagedResponse(rows); assert.equal((await readCatalogue()).length, rows.length) }
  await expectLoad([{ ...all[0], category: 'Gin' }, ...all.slice(1)])
  await expectLoad(all.slice(0, 1200))
  await expectLoad(all.filter((row) => row.category !== 'Sake'))
  await expectLoad([...all, { ...all[0], id: 'z99-0000', category: 'Non-alcoholic' }])
  await expectLoad([...all, ...all.slice(0, 700).map((row, index) => ({ ...row, id: `q${String(index).padStart(4, '0')}` }))].sort((a, b) => a.id.localeCompare(b.id)))

  // Still fails closed on implausible size, too many categories, unordered ids and inconsistent totals.
  await expectFailure(pagedResponse(all.slice(0, 99)))
  await expectFailure(pagedResponse(all.slice(0, 100).map((row, index) => ({ ...row, category: `Category ${index}` }))))
  await expectFailure(pagedResponse([all[1], all[0], ...all.slice(2)]))
  await expectFailure(pagedResponse([{ ...all[0], price_paise: 0 }, ...all.slice(1)]))
  await expectFailure(async (url, init) => {
    const [start, end] = String(init.headers.Range).split('-').map(Number)
    return response(all.slice(start, end + 1), start, start === 0 ? all.length : all.length + 1)
  })
  await expectFailure(async () => response([{ ...all[0], city: 'Jaipur' }], 0, 1311))
  await expectFailure(async () => { throw new Error('offline') })
  console.log('PASS: server-only secret guard, origin and apikey-only transport, fetch revalidation tag, row/category resilience within sanity bounds, shape integrity, and safe failures.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
