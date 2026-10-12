const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('app/party-planner/model.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const context = { exports: {}, Intl, console }
vm.runInNewContext(code, context)
const { calculatePlan, formatMoney, parseBudget, planText } = context.exports
const catalogue = [
  { id: 'gin', category: 'spirit', name: 'Jaipur Gin', brand: 'AllCheers', sizeMl: 700, pricePaise: 100000 },
  { id: 'tonic', category: 'mixer', name: 'Tonic Water', brand: 'Desert Fizz', sizeMl: 750, pricePaise: 160000 },
  { id: 'zero', category: 'zero-proof', name: 'Pink Fizz', brand: 'No Buzz', sizeMl: 700, pricePaise: 160000 },
]
const input = { guests: 20, budgetPaise: 500000, categories: ['spirit', 'mixer', 'zero-proof'], lines: [{ productId: 'gin', quantity: 1 }, { productId: 'tonic', quantity: 2 }, { productId: 'zero', quantity: 1 }] }
const result = calculatePlan(input, catalogue)
assert.equal(result.ok, true)
assert.equal(result.plan.totalPaise, 580000)
assert.equal(result.plan.remainingPaise, -80000)
assert.equal(result.plan.lines[1].subtotalPaise, 320000)
assert.equal(calculatePlan({ ...input, budgetPaise: 580000 }, catalogue).plan.remainingPaise, 0)
const arithmetic = calculatePlan({ guests: 10, budgetPaise: 500000, categories: ['spirit', 'mixer'], lines: [{ productId: 'gin', quantity: 2 }, { productId: 'tonic', quantity: 2 }] }, catalogue)
assert.equal(arithmetic.ok, true)
assert.equal(arithmetic.plan.lines[0].subtotalPaise, 200000)
assert.equal(arithmetic.plan.lines[1].subtotalPaise, 320000)
assert.equal(arithmetic.plan.remainingPaise, -20000)
assert.equal(calculatePlan({ ...input, lines: [{ productId: 'gin', quantity: 1 }, { productId: 'gin', quantity: 1 }, { productId: 'zero', quantity: 1 }] }, catalogue).ok, false)
assert.equal(calculatePlan({ ...input, categories: ['spirit', 'mixer'], lines: [{ productId: 'gin', quantity: 1 }, { productId: 'tonic', quantity: 1 }] }, catalogue).ok, true)
assert.equal(calculatePlan({ ...input, lines: [{ productId: 'gin', quantity: 1 }, { productId: 'tonic', quantity: 1 }, { productId: 'zero', quantity: 1, pricePaise: 1 }] }, catalogue).plan.lines[2].subtotalPaise, 160000)
assert.equal(calculatePlan(input, [{ ...catalogue[0] }, { ...catalogue[1], id: 'gin' }]).ok, false)
assert.equal(calculatePlan(input, [...catalogue, { ...catalogue[0], id: 'gin-alt' }]).ok, true)
assert.equal(calculatePlan({ guests: 1, budgetPaise: 100000000, categories: ['spirit'], lines: [{ productId: 'huge', quantity: 1000 }] }, [{ ...catalogue[0], id: 'huge', pricePaise: Number.MAX_SAFE_INTEGER }]).ok, false)
for (const bad of [null, { ...input, guests: 1.5 }, { ...input, budgetPaise: Infinity }, { ...input, categories: ['spirit', 'spirit', 'mixer'], lines: input.lines }, { ...input, lines: [{ productId: 'missing', quantity: 1 }, ...input.lines.slice(1)] }, { ...input, budgetPaise: 100000001 }]) assert.equal(calculatePlan(bad, catalogue).ok, false)
assert.equal(parseBudget('5000'), 500000)
assert.equal(parseBudget('10.5'), 1050)
for (const bad of ['0', '10.001', '1e3', '+10', '1,000', ' 10', '10 ']) assert.equal(parseBudget(bad), null)
const text = planText(result.plan)
assert.match(text, /Jaipur/)
assert.match(text, /Shortfall: ₹800\.00/)
assert.match(text, /price date unknown/i)
assert.match(text, /not a serving recommendation/i)
const sibling = { ...catalogue[0], id: 'gin-2', name: 'Second Gin', pricePaise: 125000 }
const multiCatalogue = [...catalogue, sibling]
const multi = { ...input, lines: [...input.lines, { productId: sibling.id, quantity: 3 }] }
const multiResult = calculatePlan(multi, multiCatalogue)
assert.equal(multiResult.ok, true)
assert.equal(multiResult.plan.totalPaise, 955000)
assert.equal(multiResult.plan.lines.length, 4)
assert.match(planText(multiResult.plan), /Second Gin/)
for (const bad of [
  { ...multi, lines: [] },
  { ...multi, lines: [...multi.lines, multi.lines[0]] },
  { ...multi, lines: multi.lines.filter(line => line.productId !== 'tonic') },
  { ...multi, categories: ['spirit'] },
  ...[0, 1001, 1.5, '2', NaN].map(quantity => ({ ...multi, lines: [{ productId: 'gin', quantity }, ...multi.lines.slice(1)] })),
]) assert.equal(calculatePlan(bad, multiCatalogue).ok, false)
assert.equal(calculatePlan({ ...multi, lines: [{ productId: 'gin', quantity: 1000 }, ...multi.lines.slice(1)] }, multiCatalogue).ok, true)
const eighteenCatalogue = Array.from({ length: 18 }, (_, index) => ({ id: `category-${index}`, category: `category-${index}`, name: `Category ${index}`, brand: 'AllCheers', sizeMl: 750, pricePaise: 10000 }))
const eighteenInput = { guests: 1, budgetPaise: 500000, categories: eighteenCatalogue.map((product) => product.category), lines: eighteenCatalogue.map((product) => ({ productId: product.id, quantity: 1 })) }
assert.equal(calculatePlan(eighteenInput, eighteenCatalogue).ok, true, 'all 18 categories are accepted')
assert.equal(calculatePlan({ ...eighteenInput, categories: [...eighteenInput.categories, 'category-18'] }, [...eighteenCatalogue, { ...eighteenCatalogue[0], id: 'category-18', category: 'category-18' }]).ok, false, 'more than 18 categories are rejected')
console.log('PASS: multi-product categories, mixed lines, duplicates/empty-category/bounds rejection, legacy shape, trusted prices, safe arithmetic and exports.')
