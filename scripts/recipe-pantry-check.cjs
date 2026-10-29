const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const mod = new Module('pantry-helpers', module)
mod.filename = require('node:path').resolve('app/find-my-drink/pantry.cjs')
mod.paths = Module._nodeModulePaths(require('node:path').resolve('app/find-my-drink'))
mod._compile(ts.transpileModule(fs.readFileSync('app/find-my-drink/pantry.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, mod.filename)
const { pantryMatches, pantryVocabulary, reviewedPantry } = mod.exports
const rows = JSON.parse(fs.readFileSync('output/recipe-pantry/live-eligible.json', 'utf8'))
const audit = JSON.parse(fs.readFileSync('app/find-my-drink/pantry-audit.json', 'utf8'))
const row = id => rows.find(item => item.id === id)
const ids = id => new Set(reviewedPantry(row(id)).requirements.map(item => item.ingredientId))
const cape = row('dn-cape-codder')
const allCape = ids(cape.id)
assert.equal(pantryMatches([cape], allCape).exact.length, 1)
for (const missing of ['ice-cubes', 'lime-wedge']) {
  const selection = new Set(allCape); selection.delete(missing)
  assert.equal(pantryMatches([cape], selection).exact.length, 0, `missing ${missing} never complete`)
}
const wedgeMissing = new Set(allCape); wedgeMissing.delete('lime-wedge')
assert.equal(pantryMatches([cape], wedgeMissing).oneAway[0].missing.quantityText, '1 wedge Lime')
const wrongForm = new Set(wedgeMissing); wrongForm.add('lime-juice'); wrongForm.add('lime')
assert.equal(pantryMatches([cape], wrongForm).exact.length, 0)
const bay = row('dn-bay-breeze'); const allBay = ids(bay.id)
const pineappleMissing = new Set(allBay); pineappleMissing.delete('pineapple-juice')
const one = pantryMatches([bay], pineappleMissing).oneAway[0]
assert.equal(one.missing.label, 'Pineapple Juice'); assert.equal(one.missing.quantityText, '2 oz. Pineapple Juice')
for (const missing of ['ice', 'lime-wedge']) {
  const selection = new Set(allBay); selection.delete(missing)
  assert.equal(pantryMatches([bay], selection).oneAway.length, 0, 'unrecorded measure suppressed')
}
assert.equal(pantryMatches([cape, cape], allCape).exact.length, 1, 'recipe IDs deduplicated')
assert.equal(pantryMatches([], allCape).exact.length, 0, 'removed/unpublished rows cannot resurrect')
assert.equal(pantryMatches([row('mm-roy-rogers-drink')], allCape).exact.length, 0, 'filtered pool respected')
for (const key of ['description','ingredients','ingredientDetails','preparation','garnish','iceType','glassware','preparationMethod','sourceUrl','sourceRetrievedAt']) {
  const changed = structuredClone(cape)
  changed[key] = Array.isArray(changed[key]) ? [] : 'drift'
  assert.equal(reviewedPantry(changed), null, `${key} drift fails closed`)
}
const uncertainQuantity = structuredClone(cape); uncertainQuantity.ingredientDetails[0].amount = null
assert.equal(reviewedPantry(uncertainQuantity), null, 'uncertain changed quantity loses approval')
const unknownIdentity = structuredClone(cape); unknownIdentity.ingredientDetails[0].name = null
assert.equal(reviewedPantry(unknownIdentity), null, 'unknown changed identity loses approval')
const brokenEquipment = structuredClone(audit); brokenEquipment.find(item => item.recipeId === cape.id).equipment = []
assert.equal(reviewedPantry(cape, brokenEquipment), null, 'no equipment review fails closed')
for (const id of ['dn-daiquiri','dn-paloma','mm-blood-orange-mocktail','mm-vodka-mocktail']) assert.equal(reviewedPantry(row(id)), null, 'unknown or ambiguous requirements excluded')
for (const id of ['mm-watermelon-strawberry-mocktail','mm-grapefruit-martino-mocktail']) assert.ok(reviewedPantry(row(id)), 'new manually reviewed mocktail requirements')
assert.equal(reviewedPantry({ ...cape, id: 'unknown-recipe' }), null)
assert.equal(pantryMatches(rows, new Set()).exact.length, 0)
const vocabulary = pantryVocabulary(rows)
assert.equal(vocabulary.length, new Set(vocabulary.map(item => item.ingredientId)).size)
assert.ok(vocabulary.some(item => item.ingredientId === 'fresh-lime-juice'))
assert.ok(vocabulary.some(item => item.ingredientId === 'lime-juice'))
assert.ok(vocabulary.some(item => item.ingredientId === 'lime-wheel'))
assert.ok(vocabulary.some(item => item.ingredientId === 'lime-wedge'))
assert.ok(vocabulary.some(item => item.ingredientId === 'heavy-cream'))
assert.equal(reviewedPantry(row('mm-virgin-mango-margarita')).equipment.includes('High-speed blender'), true)
const queryModule = new Module('pantry-filter-assembly', module)
queryModule.require = request => request === 'server-only' ? {} : require(request)
queryModule._compile(ts.transpileModule(fs.readFileSync('app/find-my-drink/queries.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'pantry-filter-assembly.cjs')
const combined = queryModule.exports.buildListingData(rows,{q:'cranberry',drinkType:'cocktail',types:['vodka'],method:'build',maxIngredients:3},null)
assert.deepEqual(combined.matchingRows.map(item=>item.id).sort(), ['dn-bay-breeze','dn-cape-codder'])
assert.deepEqual(pantryMatches(combined.matchingRows,new Set(vocabulary.map(item=>item.ingredientId))).exact.map(item=>item.row.id).sort(), ['dn-bay-breeze','dn-cape-codder'], 'all active facets jointly constrain pantry results')
// One real filter assembly is already covered across 405 combinations by recipe-browse-check.
// Exercise every filtered subset as the only input: no out-of-pool suggestion may leak.
for (const type of ['cocktail','mocktail']) for (const method of ['shake','stir','build','blend']) {
  const pool = rows.filter(item => item.alcoholType === type && item.preparationMethod === method)
  const result = pantryMatches(pool, new Set(vocabulary.map(item => item.ingredientId)))
  assert.ok([...result.exact,...result.oneAway].every(item => pool.includes(item.row)))
}
console.log(`Pantry checks passed: ${rows.length} live audit rows, ${audit.length} complete reviews; ice/garnish/forms/unknowns/quantities/equipment/drift/exclusion/dedup/filter fixtures.`)
