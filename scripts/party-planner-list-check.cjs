// Party Planner list check (tools redesign, TR4): app/party-planner/list.ts on the catalogue snapshot.
// Runs without a browser or database: node scripts/party-planner-list-check.cjs
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
const l = load('app/party-planner/list.ts')
const m = load('app/party-planner/model.ts')
const catalogue = require('../app/party-planner/catalogue.json')
const bottles = load('app/catalogue/normalise.ts').normaliseCatalogue(catalogue)
const categoryOf = id => catalogue.find(p => p.id === id)?.category
const rupees = n => n * 100

// Eight chips; no answers is the usual mix.
assert.deepEqual([...l.CHIPS], ['beer', 'wine', 'rum', 'vodka', 'whisky', 'gin', 'tequila', 'rtd'])
assert.deepEqual(l.CHIPS.map(chip => l.CHIP_LABELS[chip]), ['Beer', 'Wine', 'Rum', 'Vodka', 'Whisky', 'Gin', 'Tequila', 'Ready to drink'])
assert.deepEqual(l.prePick([], null), ['beer', 'rum', 'vodka'])

// Pre-picks: two or three chips from the spirit scores, never brandy or liqueur (no chip for them).
assert.deepEqual(l.prePick([], 'mixer'), ['gin', 'vodka', 'rum'])
assert.deepEqual(l.prePick([], 'neat'), ['whisky', 'wine', 'beer'])
assert.deepEqual(l.prePick(['herbal', 'citrusy'], 'mixer'), ['gin', 'tequila'], 'vodka scores under 60% of gin, so two picks')
assert.deepEqual(l.prePick(['fruity'], null), ['vodka', 'rum', 'wine'])
const tastes = ['citrusy', 'fruity', 'sweet', 'bitter', 'herbal', 'creamy']
for (const a of [null, ...tastes]) for (const b of [null, ...tastes]) for (const style of [null, ...l.DRINK_STYLES]) {
  const answers = [a, b].filter(Boolean).filter((t, i, list) => list.indexOf(t) === i)
  const picks = l.prePick(answers, style)
  assert.ok(picks.length >= 2 && picks.length <= 3, 'two or three picks')
  assert.ok(picks.every(chip => l.CHIPS.includes(chip)) && new Set(picks).size === picks.length)
  assert.deepEqual(l.prePick(answers, style), picks, 'deterministic')
}

// Options: up to three real bottles per chip, cheaper to premium, at the standard size when there are three.
for (const chip of l.CHIPS) {
  const options = l.optionsFor(bottles, chip)
  assert.ok(options.length >= 2 && options.length <= 3, chip + ' options')
  assert.ok(options.every(bottle => bottle.kind === chip && bottles.includes(bottle)))
  for (let i = 1; i < options.length; i++) assert.ok(options[i - 1].pricePaise <= options[i].pricePaise, chip + ' cheaper first')
}
assert.ok(l.optionsFor(bottles, 'rum').every(bottle => bottle.sizeMl === 750))
assert.ok(l.optionsFor(bottles, 'beer').every(bottle => bottle.sizeMl === 650))
assert.deepEqual(l.optionsFor([], 'gin'), [])

// Quantities: about three drinks a guest split across the chips, in whole bottles.
const rum750 = l.optionsFor(bottles, 'rum')[1]
assert.equal(l.suggestedQuantity(20, 3, rum750), Math.ceil(20 * 3 / 3 * 60 / 750)) // 20 drinks of 60 ml: 2 bottles
assert.equal(l.suggestedQuantity(20, 3, l.optionsFor(bottles, 'beer')[1]), Math.ceil(20 * 330 / 650)) // 11 bottles
assert.equal(l.suggestedQuantity(1, 8, rum750), 1, 'at least one bottle')

// The list: middle options by default, line total = bottles × price, total = sum of lines.
const party = { guests: 20, budgetPaise: rupees(20000), chips: ['beer', 'rum', 'vodka'] }
const list = l.buildList(party, bottles)
assert.deepEqual(list.lines.map(line => line.chip), ['beer', 'rum', 'vodka'])
for (const line of list.lines) {
  assert.equal(line.choice, Math.floor((line.options.length - 1) / 2), line.chip + ' middle option')
  assert.equal(line.quantity, line.suggested)
  assert.equal(line.subtotalPaise, line.quantity * line.bottle.pricePaise, line.chip + ' line total')
}
assert.equal(list.totalPaise, list.lines.reduce((sum, line) => sum + line.subtotalPaise, 0), 'total is the sum of line totals')
assert.equal(list.remainingPaise, party.budgetPaise - list.totalPaise)
assert.equal(list.perGuestPaise, Math.round(list.totalPaise / 20))
assert.equal(list.bottles, list.lines.reduce((sum, line) => sum + line.quantity, 0))
assert.ok(list.withinBudget && !list.cheaper)
assert.deepEqual(l.buildList(party, bottles), list, 'deterministic')
assert.deepEqual(l.buildList({ ...party, chips: ['vodka', 'beer', 'rum', 'vodka'] }, bottles).lines.map(line => line.chip), ['beer', 'rum', 'vodka'], 'chip order and duplicates do not matter')

// Host choices win: a picked option and a typed quantity.
const chosen = l.buildList({ ...party, picks: { rum: 2 }, quantities: { beer: 30 } }, bottles)
assert.equal(chosen.lines[1].choice, 2)
assert.equal(chosen.lines[0].quantity, 30)
assert.equal(chosen.lines[0].subtotalPaise, 30 * chosen.lines[0].bottle.pricePaise)
assert.equal(l.buildList({ ...party, picks: { rum: 9 }, quantities: { beer: 0 } }, bottles).lines[1].choice, 1, 'out-of-range pick ignored')
assert.equal(l.buildList({ ...party, quantities: { beer: 0 } }, bottles).lines[0].quantity, 1, 'at least one bottle')

// Over budget: switch to cheaper options, biggest line first, and stop at the cheapest.
const middleTotal = list.totalPaise
const cheapest = l.buildList({ ...party, picks: { beer: 0, rum: 0, vodka: 0 } }, bottles).totalPaise
const tight = l.buildList({ ...party, budgetPaise: Math.floor((middleTotal + cheapest) / 2) }, bottles)
assert.ok(tight.cheaper && tight.totalPaise < middleTotal, 'steps down to cheaper options')
assert.ok(tight.withinBudget, 'fits when the cheaper options fit')
const broke = l.buildList({ ...party, budgetPaise: rupees(100) }, bottles)
assert.ok(!broke.withinBudget && broke.cheaper && broke.totalPaise === cheapest, 'cannot fit: cheapest options, shown as over')
assert.equal(broke.remainingPaise, rupees(100) - cheapest)
const kept = l.buildList({ ...party, budgetPaise: rupees(100), picks: { rum: 2 } }, bottles)
assert.equal(kept.lines[1].choice, 2, 'a host pick is never stepped down')

// Empty and missing.
assert.deepEqual(l.buildList({ ...party, chips: [] }, bottles).lines, [])
const none = l.buildList(party, [])
assert.deepEqual([none.lines.length, none.totalPaise, none.missing], [0, 0, ['beer', 'rum', 'vodka']])

// Every chip and pre-pick builds a list the server accepts, with the same totals.
for (const chips of [[...l.CHIPS], ['wine'], ['rtd', 'tequila'], l.prePick(['sweet'], 'neat')]) {
  for (const guests of [1, 20, 250]) {
    const result = l.buildList({ guests, budgetPaise: rupees(50000), chips }, bottles)
    const plan = m.calculatePlan(l.toPlannerInput(result, guests, rupees(50000), categoryOf), catalogue)
    assert.ok(plan.ok, 'server accepts ' + chips.join(',') + ' for ' + guests + ': ' + (plan.error ?? ''))
    assert.equal(plan.plan.totalPaise, result.totalPaise, 'server total matches')
    assert.equal(plan.plan.remainingPaise, result.remainingPaise)
  }
}

console.log('party-planner-list-check: PASS')
