const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const ts = require('typescript')

const ROOT = process.cwd()
const EXPECTED_COUNT = 1311
const EXPECTED_CATEGORY_COUNT = 18

function loadEnvironment() {
  try {
    require('@next/env').loadEnvConfig(ROOT)
    return
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') throw error
  }

  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
    if (!match || process.env[match[1]] !== undefined) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    process.env[match[1]] = value
  }
}

function loadReader() {
  const originalExtension = Module._extensions['.ts']
  const originalRequire = Module.prototype.require
  Module.prototype.require = function (id) {
    if (id === 'server-only') return {}
    return originalRequire.apply(this, arguments)
  }
  Module._extensions['.ts'] = (mod, filename) => {
    const source = fs.readFileSync(filename, 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    mod._compile(output, filename)
  }
  try {
    return require(path.join(ROOT, 'app/party-planner/catalogue-server.ts')).readCatalogue
  } finally {
    Module._extensions['.ts'] = originalExtension
    Module.prototype.require = originalRequire
  }
}

;(async () => {
  loadEnvironment()
  const payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/jaipur-replacement-1311/planner-products-payload.json'), 'utf8'))
  assert.ok(Array.isArray(payload))
  assert.equal(payload.length, EXPECTED_COUNT)
  assert.equal(new Set(payload.map((row) => row.category)).size, EXPECTED_CATEGORY_COUNT)

  const expected = payload.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    brand: row.brand,
    sizeMl: row.size_ml,
    pricePaise: row.price_paise,
  })).sort((left, right) => left.id.localeCompare(right.id))

  const products = await loadReader()()
  assert.equal(products.length, EXPECTED_COUNT)
  assert.equal(new Set(products.map((product) => product.category)).size, EXPECTED_CATEGORY_COUNT)
  assert.deepEqual(products, expected)
  console.log('PASS: live planner catalogue matches the 1,311-row, 18-category prepared payload.')
})().catch(() => {
  console.error('FAIL: live catalogue smoke failed.')
  process.exitCode = 1
})
