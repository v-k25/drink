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

console.log('spirit-check: ok')
