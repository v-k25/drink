// Catalogue clean-up check (tools redesign, TR1): app/catalogue/normalise.ts on real planner_products rows.
// Runs without a browser or database: node scripts/catalogue-normalise-check.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const root = path.resolve(__dirname, '..')
function load(file) {
  const filename = path.resolve(root, file)
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
  return mod.exports
}
const n = load('app/catalogue/normalise.ts')
const catalogue = require('../app/party-planner/catalogue.json')
const row = (category, name, sizeMl, rupees, brand = name.replace(/\([^]*$/, '')) => ({ id: 'T-' + name.length + '-' + sizeMl, category, name, brand, sizeMl, pricePaise: rupees * 100 })

// Names: pack text, capitals, punctuation and spelling slips (all taken from real rows).
const names = [
  ['OLD MONK AMBER MELLOW & MATURED RUM(quarts)', 'Old Monk Amber Mellow & Matured Rum'],
  ['.JACK DANIEL\'S OLD NO 7 BRAND QUALITY TENNESSEE SOUR MASH WHISKEY(quarts)', "Jack Daniel's Old No 7 Brand Quality Tennessee Sour Mash Whiskey"],
  ['1800 Milenio Extra Anejo Tequila(750 ML(3 Bottles))', '1800 Milenio Extra Anejo Tequila'],
  ['BEJOIS XO BRANDY(quarts)', 'Bejois XO Brandy'],
  ['Bejois VSOP Blended Grape Brandy(quarts)', 'Bejois VSOP Blended Grape Brandy'],
  ['ABSOLUT VODKA(QUARTS)', 'Absolut Vodka'],
  ['JAGERMEISTER LIQUEUR(1', 'Jagermeister Liqueur'],
  ['MCDOWELLS PREMIUM DRY GIN(quarts)', "McDowell's Premium Dry Gin"],
  ['SEAGRAMS XCLAMAT!ON PREMIER RUM(quarts)', "Seagram's Xclamation Premier Rum"],
  ['IMPACT RED XXX RUM-RML(quarts)', 'Impact Red XXX Rum'],
  ['BOMBAY SAPPHIRE DISTILLED LONDON DRY GIN 40%(quarts)', 'Bombay Sapphire Distilled London Dry Gin'],
  ['TERAI TEQUILA BLANCO.(quarts)', 'Terai Tequila Blanco'],
  ['HENNESSY VERY SPECIAL COGNAC .(700 ML (6 Bottle))', 'Hennessy Very Special Cognac'],
  ['CAMPO VIEJO RIOJA TEMPRANILLO (13.5%)(quarts)', 'Campo Viejo Rioja Tempranillo'],
  ['DON ROMEO BLANCO TEQUILLA(quarts)', 'Don Romeo Blanco Tequila'],
  ['VOLCAN DE MI TIERRA TEQUILA BLANCO(700 ML (6 Bottle))', 'Volcan de Mi Tierra Tequila Blanco'],
  ['Amrut Nilgiris Indian Dry Gin(quarts)', 'Amrut Nilgiris Indian Dry Gin'],
  ['KINGFISHER PREMIUM LAGER BEER(650 ML)', 'Kingfisher Premium Lager Beer'],
  ['BREEZER PRESTIGE CRISP WATERMELON MINT FLAVOUR(Pint(275 ml))', 'Breezer Prestige Crisp Watermelon Mint Flavour'],
]
for (const [raw, clean] of names) assert.equal(n.cleanName(raw), clean, raw)

// Brands: the known list, a leading "The", and two words when the first is too common.
const brands = [
  ['Old Monk Gold Reserve Rum', 'Old Monk'], ['Very Old Vatted Old Monk Rum', 'Old Monk'], ['Black by Bacardi Prestige Original Premium Crafted Rum', 'Bacardi'],
  ["McDowell's Premium Vodka", "McDowell's"], ['Johnnie Walker Black Label Blended Scotch Whisky', 'Johnnie Walker'], ['Blenders Pride Reserve Collection Whisky', 'Blenders Pride'],
  ['The Macallan 12 YO Highland Single Malt Scotch Whisky', 'The Macallan'], ['The Glen Grant Single Malt Scotch Whisky Aged 10 Years', 'The Glen Grant'],
  ['Black Jet XXX Rum', 'Black Jet'], ['Don Romeo Blanco Tequila', 'Don Romeo'], ['100 Strokes Monarch Rum', '100 Strokes'], ['Smoke Lab Classic Vodka', 'Smoke Lab'],
  ['Tequila Camino Real Blanco', 'Camino Real'], ['J and B Rare Blended Scotch Whisky', 'J&B'], ['Absolut Lime Flavored Vodka', 'Absolut'], ['Aperol', 'Aperol'],
  ['Kingfishersuper Strong Premium Beer Can', 'Kingfisher'],
]
for (const [name, brand] of brands) assert.equal(n.brandOf(name), brand, name)

// Kinds: categories by pattern; unclassified rows only by one clear kind of word; country liquor never.
assert.equal(n.kindOf({ category: 'Tequila / Agave Spirit', name: 'x' }), 'tequila')
assert.equal(n.kindOf({ category: 'RTD / Premix', name: 'x' }), 'rtd')
assert.equal(n.kindOf({ category: 'Liqueur / Aperitif', name: 'x' }), 'liqueur')
assert.equal(n.kindOf({ category: 'Country Liquor', name: 'GHOOMAR C.L. ENA BASE(Bottle)' }), null)
assert.equal(n.kindOf({ category: 'Other / Unclassified', name: 'Bex Nahe Riesling QbA(quarts)' }), 'wine')
assert.equal(n.kindOf({ category: 'Other / Unclassified', name: 'TINTO NEGRO UCO VALLEY MALBEC(750 ML (6 Bottles))' }), 'wine')
assert.equal(n.kindOf({ category: 'Other / Unclassified', name: 'BRO CODE ORIGINAL XV-F(250 ml x 36)' }), null, '"ORIGINAL" is not gin')
assert.equal(n.kindOf({ category: 'Other / Unclassified', name: "JACK DANIEL'S HONEY SMOOTH & BALANCED ORIGINAL RECIPE(quarts)" }), null)
assert.equal(n.kindOf({ category: 'Other / Unclassified', name: 'CABO WHITE RUM WITH COCONUT WINE' }), null, 'two kinds stay out')

// Sizes: full bottles only.
assert.ok(n.isFullBottle('rum', 750) && n.isFullBottle('gin', 700) && n.isFullBottle('vodka', 1000))
assert.ok(!n.isFullBottle('rum', 375) && !n.isFullBottle('whisky', 180) && !n.isFullBottle('whisky', 60))
assert.ok(n.isFullBottle('beer', 330) && n.isFullBottle('beer', 650) && !n.isFullBottle('beer', 5000))
assert.ok(n.isFullBottle('rtd', 275))

// Bottles: 750 ml-equivalent price, duplicates keep the cheaper row, cheapest first.
const gin = n.toBottle(row('Gin', 'BEEFEATER LONDON DRY GIN PINK(700 ML (6 Bottle))', 700, 1660))
assert.deepEqual({ kind: gin.kind, name: gin.name, brand: gin.brand, size: gin.sizeMl, price: gin.pricePaise, per750: gin.price750Paise },
  { kind: 'gin', name: 'Beefeater London Dry Gin Pink', brand: 'Beefeater', size: 700, price: 166000, per750: 177857 })
assert.equal(n.toBottle(row('Beer', 'TUBORG STRONG BEER(650 ML)', 650, 180)).price750Paise, 18000, 'beer keeps its own price')
assert.equal(n.toBottle(row('Rum', 'OLD MONK XXX RUM(Nips)', 180, 150)), null, 'miniatures are left out')
const deduped = n.normaliseCatalogue([
  { ...row('Rum', 'OLD MONK XXX RUM(quarts)', 750, 520), id: 'A' },
  { ...row('Rum', 'Old Monk XXX Rum(750 ML (12 Bottles))', 750, 500), id: 'B' },
  { ...row('Rum', 'OLD MONK XXX RUM(1 LTR)', 1000, 700), id: 'C' },
])
assert.deepEqual(deduped.map(b => b.id), ['B', 'C'])

// The whole catalogue: bounded, clean and deterministic.
const bottles = n.normaliseCatalogue(catalogue)
assert.deepEqual(n.normaliseCatalogue(catalogue), bottles, 'same input, same output')
assert.ok(bottles.length > 800 && bottles.length < catalogue.length, 'bottle count ' + bottles.length)
const byKind = Object.fromEntries(n.KINDS.map(kind => [kind, bottles.filter(b => b.kind === kind).length]))
for (const kind of n.KINDS) assert.ok(byKind[kind] > 0, kind + ' has bottles')
assert.equal(bottles.filter(b => b.kind === 'wine' && catalogue.find(p => p.id === b.id).category === 'Other / Unclassified').length, 20, 'reclassified wines')
// Brands the known list spells differently from the start of the name ("Black by Bacardi", "Tequila Camino Real", "J and B").
const renamed = new Set(['Bacardi', 'Old Monk', 'Camino Real', 'J&B', 'Moët & Chandon', 'Dom Pérignon', 'Laurent-Perrier', 'Kingfisher', 'Black & White', 'Royal Challenge'])
for (const b of bottles) {
  assert.ok(b.name && !/\(|\)\s*$|^\.|\s{2}|[-.,]$/.test(b.name), 'clean name: ' + b.name)
  assert.ok(!/\b(QUARTS?|PINTS?|NIPS)\b/i.test(b.name), 'no pack text: ' + b.name)
  assert.ok(b.name !== b.name.toUpperCase() || b.name.length <= 4, 'not shouting: ' + b.name)
  assert.ok(b.brand && b.brand.length <= 30 && (b.name.toLowerCase().startsWith(b.brand.toLowerCase()) || renamed.has(b.brand)), 'brand from the name: ' + b.brand + ' / ' + b.name)
  assert.ok(n.isFullBottle(b.kind, b.sizeMl), 'full bottle: ' + b.name)
  assert.ok(Number.isSafeInteger(b.price750Paise) && b.price750Paise > 0)
}
for (let i = 1; i < bottles.length; i++) assert.ok(bottles[i - 1].pricePaise <= bottles[i].pricePaise, 'cheapest first')

console.log('catalogue-normalise-check: PASS', JSON.stringify(byKind))
