// Spirit quiz (Guide me) check: scoring in app/find-my-drink/spirit.ts and the quiz URL state in discovery.ts.
// Runs without a browser or database: node scripts/spirit-check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const root = path.resolve(__dirname, '..')
const cache = new Map()
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename)
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => name === 'server-only' ? {} : name.startsWith('.') && !path.extname(name)
    ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')))
    : Module.createRequire(filename)(name)
  cache.set(filename, mod.exports)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText, filename)
  cache.set(filename, mod.exports)
  return mod.exports
}
const s = load('app/find-my-drink/spirit.ts')
const d = load('app/find-my-drink/discovery.ts')
const rows = require('./fixtures/guided-discovery/recipes.json')
const top = answers => s.rankSpirits({ tastes: [], feel: null, serve: null, occasion: null, ...answers })[0].profile.spirit

// Profiles are complete and use only known answers.
assert.deepEqual(s.PROFILES.map(p => p.spirit), [...s.SPIRITS])
for (const p of s.PROFILES) {
  assert.ok(p.name && p.note.endsWith('.') && p.tryIt.endsWith('.'), p.spirit + ' copy')
  assert.ok(!/!/.test(p.note + p.tryIt), p.spirit + ' has no exclamation marks')
  for (const taste of Object.keys(p.tastes)) assert.ok(d.TASTES.includes(taste), p.spirit + ' taste ' + taste)
  for (const [dim, keys] of [['feel', s.FEELS], ['serve', s.SERVES], ['occasion', s.QUIZ_OCCASIONS]]) assert.deepEqual(Object.keys(p[dim]).sort(), [...keys].sort(), p.spirit + ' ' + dim)
}

// Expected matches for plain answer sets.
assert.equal(top({ tastes: ['herbal', 'citrusy'], feel: 'light', serve: 'mixer' }), 'gin')
assert.equal(top({ tastes: ['fruity'], feel: 'light', serve: 'mixer', occasion: 'party' }), 'vodka')
assert.equal(top({ tastes: ['sweet', 'fruity'], feel: 'smooth', serve: 'cocktail', occasion: 'party' }), 'rum')
assert.equal(top({ tastes: ['bitter'], feel: 'rich', serve: 'neat', occasion: 'after-dinner' }), 'whisky')
assert.equal(top({ tastes: ['citrusy'], serve: 'cocktail', occasion: 'party' }), 'tequila')
assert.equal(top({ tastes: ['sweet'], feel: 'rich', serve: 'neat', occasion: 'after-dinner' }), 'brandy')
assert.equal(top({ tastes: ['fruity'], feel: 'smooth', serve: 'neat', occasion: 'casual-get-together' }), 'wine')
assert.equal(top({ tastes: ['bitter'], feel: 'light', serve: 'neat', occasion: 'casual-get-together' }), 'beer')
assert.equal(top({ tastes: ['creamy', 'sweet'], feel: 'smooth', serve: 'cocktail', occasion: 'after-dinner' }), 'liqueur')

// Every match is reachable, and every answer set gives a stable, sorted ranking.
const tasteSets = [[]]
for (let i = 0; i < d.TASTES.length; i++) { tasteSets.push([d.TASTES[i]]); for (let j = i + 1; j < d.TASTES.length; j++) tasteSets.push([d.TASTES[i], d.TASTES[j]]) }
const reached = new Set()
for (const tastes of tasteSets) for (const feel of [null, ...s.FEELS]) for (const serve of [null, ...s.SERVES]) for (const occasion of [null, ...s.QUIZ_OCCASIONS]) {
  const ranked = s.rankSpirits({ tastes, feel, serve, occasion })
  assert.equal(ranked.length, s.SPIRITS.length)
  for (let k = 1; k < ranked.length; k++) assert.ok(ranked[k - 1].score >= ranked[k].score)
  reached.add(ranked[0].profile.spirit)
}
assert.deepEqual([...reached].sort(), [...s.SPIRITS].sort(), 'every match can be the best match')
assert.equal(top({}), 'gin', 'no answers keeps the list order')
assert.equal(s.answered({ tastes: [], feel: null, serve: null, occasion: null }), false)

// Why sentence.
const gin = s.rankSpirits({ tastes: ['herbal', 'citrusy'], feel: 'light', serve: 'mixer', occasion: null })[0]
assert.equal(s.reasonSentence(gin.reasons), 'Herbal and citrusy, light and fresh, good with a mixer.')
assert.equal(s.reasonSentence([]), 'The closest match to your answers.')

// Matches with recipes have at least one eligible cocktail; the others are honest about having none.
for (const p of s.PROFILES) {
  if (!p.recipeBase) continue
  const items = d.rankRecipes(rows, { ...d.parseDiscovery({ mode: 'guided', drink: 'cocktail' }), base: p.recipeBase }, 'cocktail')
  assert.ok(items.length >= 1, p.spirit + ' has cocktails')
}
assert.deepEqual(s.PROFILES.filter(p => !p.recipeBase).map(p => p.spirit), ['beer', 'liqueur'])

// URL state: answers round-trip, party stays out of the reviewed recipe occasions, legacy URLs still parse.
const state = d.parseDiscovery({ mode: 'guided', drink: 'cocktail', taste: 'herbal,citrusy', feel: 'light', serve: 'mixer', occasion: 'party', spirit: 'vodka' })
assert.equal(state.stage, 'results')
assert.deepEqual([state.feel, state.serve, state.quizOccasion, state.occasion, state.spirit], ['light', 'mixer', 'party', null, 'vodka'])
assert.deepEqual(d.parseDiscovery(Object.fromEntries(new URL('http://x' + d.discoveryHref(state)).searchParams)), state)
const casual = d.parseDiscovery({ mode: 'guided', drink: 'cocktail', occasion: 'casual-get-together' })
assert.deepEqual([casual.quizOccasion, casual.occasion], ['casual-get-together', 'casual-get-together'])
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'cocktail', stage: 'serve' }).stage, 'serve')
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'cocktail', stage: 'nonsense' }).stage, 'results')
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'mocktail', spirit: 'gin' }).spirit, null, 'no spirit for mocktails')
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'cocktail', feel: 'strong', serve: 'shot', spirit: 'absinthe' }).feel, null)

// Find a Drink (tools redesign, TR2): one "How do you like it?" answer, budget bands and the bottle list.
const b = load('app/find-my-drink/bottles.ts')
const bottles = load('app/catalogue/normalise.ts').normaliseCatalogue(require('../app/party-planner/catalogue.json'))
const pick = (tastes, how, band) => b.pickSpirit(s.rankSpirits(s.howAnswers(tastes, how)), bottles, band)

// The how answer is a feel plus its serve, so it scores exactly as answering both did.
assert.deepEqual(s.howAnswers(['herbal'], 'light'), { tastes: ['herbal'], feel: 'light', serve: 'mixer', occasion: null })
assert.deepEqual(s.howAnswers([], null), { tastes: [], feel: null, serve: null, occasion: null })
for (const how of s.FEELS) assert.ok(s.HOW_LABELS[how][0] && s.SERVES.includes(s.HOW_SERVE[how]))
assert.equal(pick(['herbal', 'citrusy'], 'light', 'any').top.profile.spirit, 'gin')
assert.equal(pick(['bitter'], 'rich', 'any').top.profile.spirit, 'whisky')
assert.equal(pick(['sweet', 'fruity'], 'smooth', 'b2').top.profile.spirit, 'rum')

// Bands use the 750 ml-equivalent price, upper bound exclusive.
const at = rupees => ({ id: 'x', kind: 'gin', name: 'x', brand: 'x', sizeMl: 750, pricePaise: rupees * 100, price750Paise: rupees * 100 })
assert.ok(b.inBand(at(999), 'u1') && !b.inBand(at(1000), 'u1') && b.inBand(at(1000), 'b2') && b.inBand(at(4000), 'o4') && b.inBand(at(383), 'any'))
assert.deepEqual(b.BANDS.map(band => b.BAND_INFO[band].label), ['Under ₹1,000', '₹1,000–2,000', '₹2,000–4,000', '₹4,000+', 'No limit'])

// The budget changes the pick when a band has fewer than two bottles of the best match, and never reorders the rest.
const count = (spirit, band) => bottles.filter(bottle => bottle.kind === spirit && b.inBand(bottle, band)).length
assert.equal(count('brandy', 'u1'), 1)
assert.equal(s.rankSpirits(s.howAnswers(['sweet'], 'rich'))[0].profile.spirit, 'brandy')
const cheapRich = pick(['sweet'], 'rich', 'u1')
assert.equal(cheapRich.top.profile.spirit, 'whisky', 'one brandy under ₹1,000 is not enough')
assert.ok(cheapRich.stocked && count('whisky', 'u1') >= b.MIN_BOTTLES)
assert.equal(pick(['sweet'], 'rich', 'b4').top.profile.spirit, 'brandy', 'brandy from ₹2,000')
assert.equal(count('tequila', 'u1'), 0)
assert.notEqual(pick(['citrusy'], null, 'u1').alternative.profile.spirit, 'tequila', 'no tequila to try under ₹1,000')
// Beer is never above ₹1,000 a bottle, so a higher band moves a beer match to a spirit.
assert.equal(pick(['bitter'], null, 'u1').top.profile.spirit, 'beer')
assert.equal(pick(['bitter'], null, 'b2').top.profile.spirit, 'gin')
for (const tastes of tasteSets) for (const how of [null, ...s.FEELS]) for (const band of b.BANDS) {
  const result = pick(tastes, how, band)
  const ranked = s.rankSpirits(s.howAnswers(tastes, how)).map(m => m.profile.spirit)
  assert.ok(result.stocked, 'some spirit is stocked in ' + band)
  assert.ok(count(result.top.profile.spirit, band) >= b.MIN_BOTTLES)
  if (result.alternative) {
    assert.ok(count(result.alternative.profile.spirit, band) >= b.MIN_BOTTLES)
    assert.ok(ranked.indexOf(result.top.profile.spirit) < ranked.indexOf(result.alternative.profile.spirit), 'ranking order kept')
  }
}
const none = b.pickSpirit(s.rankSpirits(s.howAnswers(['sweet'], 'rich')), [], 'u1')
assert.deepEqual([none.stocked, none.top.profile.spirit], [false, 'brandy'], 'no stock: best match, flagged')

// Listing: every bottle of the spirit in the band, sorted, filterable, then just over the budget.
const gins = b.listBottles(bottles, 'gin', 'b2')
assert.ok(gins.total >= 10 && gins.bottles.length === gins.total)
assert.ok(gins.bottles.every(bottle => bottle.kind === 'gin' && b.inBand(bottle, 'b2')))
const distance = bottle => Math.abs(bottle.price750Paise - 150000)
for (let i = 1; i < gins.bottles.length; i++) assert.ok(distance(gins.bottles[i - 1]) <= distance(gins.bottles[i]), 'recommended: closest to the band middle first')
const low = b.listBottles(bottles, 'gin', 'b2', 'low').bottles, high = b.listBottles(bottles, 'gin', 'b2', 'high').bottles
for (let i = 1; i < low.length; i++) assert.ok(low[i - 1].price750Paise <= low[i].price750Paise && high[i - 1].price750Paise >= high[i].price750Paise)
assert.deepEqual(new Set(low.map(x => x.id)), new Set(gins.bottles.map(x => x.id)), 'sorting keeps the same bottles')
assert.equal(gins.justOver.length, 3)
assert.ok(gins.justOver.every(bottle => bottle.kind === 'gin' && bottle.price750Paise >= 200000))
for (let i = 1; i < gins.justOver.length; i++) assert.ok(gins.justOver[i - 1].price750Paise <= gins.justOver[i].price750Paise, 'just over: cheapest first')
assert.equal(b.listBottles(bottles, 'gin', 'o4').justOver.length, 0)
assert.equal(b.listBottles(bottles, 'gin', 'any').justOver.length, 0)
assert.equal(gins.brands.reduce((sum, item) => sum + item.count, 0), gins.total)
assert.equal(gins.sizes.reduce((sum, item) => sum + item.count, 0), gins.total)
const brand = gins.brands[0].brand
const byBrand = b.listBottles(bottles, 'gin', 'b2', 'recommended', { brands: [brand], sizes: [] })
assert.ok(byBrand.bottles.length === gins.brands[0].count && byBrand.bottles.every(bottle => bottle.brand === brand) && byBrand.total === gins.total)
const by700 = b.listBottles(bottles, 'gin', 'b2', 'recommended', { brands: [], sizes: [700] })
assert.ok(by700.bottles.length > 0 && by700.bottles.every(bottle => bottle.sizeMl === 700))
assert.equal(b.listBottles(bottles, 'gin', 'b2', 'recommended', { brands: ['Old Monk'], sizes: [] }).bottles.length, gins.total, 'a brand not on offer is ignored')
assert.deepEqual(b.listBottles(bottles, 'gin', 'b2'), gins, 'deterministic')
assert.equal(b.sizeLabel(1000), '1 litre')
assert.equal(b.sizeLabel(700), '700 ml')

// URL state: budget round-trips, mocktails drop it, unknown values are ignored, old serve/occasion links still open.
const finder = d.parseDiscovery({ mode: 'guided', drink: 'cocktail', taste: 'citrusy', feel: 'smooth', budget: 'b4' })
assert.equal(finder.budget, 'b4')
assert.deepEqual(d.parseDiscovery(Object.fromEntries(new URL('http://x' + d.discoveryHref(finder)).searchParams)), finder)
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'mocktail', budget: 'b4' }).budget, null)
assert.equal(d.parseDiscovery({ mode: 'guided', drink: 'cocktail', budget: '9999' }).budget, null)
assert.ok(!d.discoveryHref({ ...finder, type: 'mocktail' }).includes('budget'))

console.log('spirit-check: ok')
