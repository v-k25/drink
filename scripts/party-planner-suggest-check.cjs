const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('app/party-planner/suggest.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const context = { exports: {} }
vm.runInNewContext(code, context)
const { suggestStartingList, suggestibleCategories, groupOf } = context.exports
const plain = value => JSON.parse(JSON.stringify(value))
const p = (id, category, sizeMl, rupees) => ({ id, category, name: id, brand: id, sizeMl, pricePaise: rupees * 100 })
const catalogue = [
  p('beer-a', 'Beers', 330, 120), p('beer-b', 'Beers', 650, 200), p('beer-c', 'Beers', 500, 180), p('beer-mini', 'Beers', 250, 50),
  p('red-a', 'Red Wine', 750, 900), p('red-b', 'Red Wine', 750, 1500), p('red-half', 'Red Wine', 375, 300),
  p('rum-a', 'Rum', 750, 600), p('rum-b', 'Rum', 750, 650), p('rtd-a', 'Ready to Drink', 275, 120),
  p('liqueur', 'Liqueurs', 750, 100), p('sake', 'Sake', 720, 900),
]
assert.equal(groupOf('Beers'), 'beer')
assert.equal(groupOf('Red Wine'), 'wine')
assert.equal(groupOf('Rum'), 'spirits')
assert.equal(groupOf('Ready to Drink'), 'rtd')
assert.equal(groupOf('Liqueurs'), null)
assert.deepEqual(plain(suggestibleCategories(catalogue)), ['Beers', 'Ready to Drink', 'Red Wine', 'Rum'])
const base = { guests: 20, budgetPaise: 50_000_00, servingsPerDrinker: 5, nonDrinkers: 2, categories: ['Beers', 'Red Wine', 'Rum'] }
const result = suggestStartingList(base, catalogue)
assert.equal(result.ok, true)
assert.equal(result.drinkers, 18)
assert.equal(result.totalServings, 90)
assert.ok(result.coveredServings >= result.totalServings)
assert.deepEqual(plain(result.lines.map(line => line.category)), ['Beers', 'Red Wine', 'Rum'])
assert.deepEqual(plain(suggestStartingList(base, [...catalogue].reverse())), plain(result))
assert.equal(result.totalPaise, result.lines.reduce((total, line) => total + line.subtotalPaise, 0))
assert.equal(result.perGuestPaise, Math.round(result.totalPaise / base.guests))
assert.equal(result.lines.find(line => line.category === 'Beers').quantity, 20)
assert.equal(result.lines.find(line => line.category === 'Red Wine').quantity, 6)
assert.equal(result.lines.find(line => line.category === 'Rum').quantity, 3)
const tiny = suggestStartingList({ guests: 1, budgetPaise: 100, servingsPerDrinker: 1, nonDrinkers: 0, categories: ['Beers', 'Red Wine', 'Rum'] }, catalogue)
assert.equal(tiny.ok, true)
assert.equal(tiny.lines.length, 3)
assert.ok(tiny.lines.every(line => line.quantity === 1))
assert.equal(tiny.withinBudget, false)
assert.match(tiny.notes[0], /selected categories cannot fit/)
const packFit = suggestStartingList({ guests: 1, budgetPaise: 15000, servingsPerDrinker: 1, nonDrinkers: 0, categories: ['Beers'] }, [p('value-large', 'Beers', 650, 200), p('cash-small', 'Beers', 330, 120)])
assert.equal(packFit.ok, true)
assert.equal(packFit.withinBudget, true)
assert.equal(packFit.lines[0].productId, 'cash-small')
const coverage = suggestStartingList({ guests: 1, budgetPaise: 100000, servingsPerDrinker: 5, nonDrinkers: 0, categories: ['Beers', 'Craft Beer', 'Imported Beer'] }, [p('beer-one', 'Beers', 650, 200), p('beer-two', 'Craft Beer', 650, 200), p('beer-three', 'Imported Beer', 650, 200)])
assert.equal(coverage.ok, true)
assert.equal(coverage.coveredServings, 5.9)
assert.ok(!coverage.notes.some(note => /1,000-pack limit/.test(note)))
const huge = suggestStartingList({ guests: 1000, budgetPaise: 1_000_000_00, servingsPerDrinker: 20, nonDrinkers: 0, categories: ['Beers'] }, catalogue)
assert.equal(huge.ok, true)
assert.equal(huge.totalServings, 20000)
assert.equal(huge.lines[0].quantity, 1000)
assert.ok(huge.coveredServings < huge.totalServings)
for (const bad of [null, { ...base, guests: 0 }, { ...base, guests: 1001 }, { ...base, servingsPerDrinker: 0 }, { ...base, servingsPerDrinker: 21 }, { ...base, categories: [] }, { ...base, categories: ['Beers', 'Beers'] }, { ...base, categories: ['Liqueurs'] }, { ...base, categories: ['Beers', 'Missing'] }, { ...base, nonDrinkers: 20 }]) assert.equal(suggestStartingList(bad, catalogue).ok, false)
console.log('PASS: explicit categories, equal servings, pack rounding, determinism, exclusions, budget conflict, tiny and large inputs, invalid input')

