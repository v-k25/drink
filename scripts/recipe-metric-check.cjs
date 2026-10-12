#!/usr/bin/env node
// Focused read-only regression for the metric ingredient-checklist annotations.
//
// 1. Unit section: loads the REAL app/find-my-drink/metric.ts source (transpiled
//    with the repo's own TypeScript package; no new dependencies) and runs the
//    documented ingredient-line shapes of the 26 live eligible recipes plus
//    malformed/ambiguous raw lines, unknown units, variable quantities, invalid
//    decimals, alternatives and supported Unicode fractions through it:
//      - confidently convertible lines are METRIC-FIRST ("~44 mL Vodka") and
//        never repeat the visible source-unit amount (no oz/cup/tbsp/tsp word);
//      - grams ONLY for explicitly solid mass ounces ("~28 g Strawberries");
//      - cups → mL, non-liquid contents carry "(by volume)" after the metric
//        value ("~120 mL (by volume) frozen mango"), never grams;
//      - ambiguous ounces (e.g. "0.67 oz. Lime") keep the source quantity with
//        the explicit per-line note — never a guessed mL/g;
//      - rounding avoids false precision: nearest 0.25 mL under 2, nearest
//        0.5 mL for 2–10 (¼ tsp = 1.25 mL survives, ⅓ oz → ~10 mL not 9.76);
//      - alternatives ("X or Y") keep both sides, annotating every alternative
//        that carries a convertible quantity, merging name-only alternatives;
//      - never NaN/Infinity, never a mutated input array, deterministic.
// 2. Live read-only section: fetches the eligible recipes from Supabase REST
//    with the identical frozen eligible predicate (anonymous key from
//    .env.local), runs every stored ingredient line through the real helper and
//    cross-checks the verdict against each row's stored ingredient_details
//    unit/amount. Read-only: no writes anywhere. When the live read is
//    unavailable, the retained launch-evidence rows are checked instead.
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.join(__dirname, '..')

// Load the real app/find-my-drink/metric.ts (TypeScript) by transpiling it with
// the repo's own TypeScript package. The module is pure with no imports, so no
// stubbing is needed — the assertions below run the actual source.
function loadMetricModule() {
  const ts = require('typescript')
  const Module = require('module')
  const source = fs.readFileSync(path.join(root, 'app', 'find-my-drink', 'metric.ts'), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const mod = new Module('find-my-drink-metric', module)
  mod.filename = path.join(root, 'app', 'find-my-drink', 'metric.js')
  mod.paths = Module._nodeModulePaths(path.join(root, 'app', 'find-my-drink'))
  mod._compile(output, mod.filename)
  return mod.exports
}

// ---------------------------------------------------------------------------
// Unit section: the documented shapes of the 26 live eligible recipes (read
// from the live catalogue read-only when this check was written) plus edge
// cases. These are line fixtures, not DB rows — the live section below
// re-checks the real rows programmatically without hard-coding them.
// ---------------------------------------------------------------------------

// [raw, expected status, substrings the display must include]
const SHAPES = [
  // US fluid ounces on liquids → metric-first millilitres.
  ['1.5 oz. Vodka', 'converted', ['~44 mL Vodka']],
  ['3 oz. Cranberry Juice', 'converted', ['~89 mL Cranberry Juice']],
  ['1.33 oz. Vodka', 'converted', ['~39 mL Vodka']],
  ['2 oz. Pineapple Juice', 'converted', ['~59 mL Pineapple Juice']],
  ['0.5 oz. Sour Apple Schnapps', 'converted', ['~15 mL Sour Apple Schnapps']],
  ['1.5 oz. Bourbon', 'converted', ['~44 mL Bourbon']],
  ['1 oz. Campari', 'converted', ['~30 mL Campari']],
  ['1 oz. Red Vermouth', 'converted', ['~30 mL Red Vermouth']],
  ['1 oz. Cognac', 'converted', ['~30 mL Cognac']],
  ['1 oz. Dark Creme de Cacao', 'converted', ['~30 mL Dark Creme de Cacao']],
  ['1 oz. (fresh) Cream', 'converted', ['~30 mL (fresh) Cream']],
  ['4 oz. Cola', 'converted', ['~118 mL Cola']],
  ['0.33 oz. Lime Juice', 'converted', ['~10 mL Lime Juice']],
  ['2 oz. Light Rum', 'converted', ['~59 mL Light Rum']],
  ['0.25 oz. Gomme Syrup', 'converted', ['~7.5 mL Gomme Syrup']],
  ['0.75 oz. Green Chartreuse', 'converted', ['~22 mL Green Chartreuse']],
  ['0.75 oz. Maraschino Liqueur', 'converted', ['~22 mL Maraschino Liqueur']],
  ['0.75 oz. Lime Juice', 'converted', ['~22 mL Lime Juice']],
  ['1 oz. Orange Juice', 'converted', ['~30 mL Orange Juice']],
  ['1.25 oz. White Tequila', 'converted', ['~37 mL White Tequila']],
  ['0.67 oz. Cointreau', 'converted', ['~20 mL Cointreau']],
  ['0.17 oz. Lime Juice', 'converted', ['~5 mL Lime Juice']],
  ['3.33 oz. Grapefruit Soda', 'converted', ['~98 mL Grapefruit Soda']],
  ['1.7 oz. White Rum', 'converted', ['~50 mL White Rum']],
  ['1 oz. Cream of coconut', 'converted', ['~30 mL Cream of coconut']],
  ['3.33 oz. Grapefruit Juice', 'converted', ['~98 mL Grapefruit Juice']],
  ['0.83 oz. (fresh) Lemon Juice', 'converted', ['~25 mL (fresh) Lemon Juice']],
  ['0.67 oz. Triple Sec', 'converted', ['~20 mL Triple Sec']],
  ['0.67 oz. Lemon Juice', 'converted', ['~20 mL Lemon Juice']],
  ['0.75 oz. Sugar Syrup', 'converted', ['~22 mL Sugar Syrup']],
  ['0.67 oz. Kahlua', 'converted', ['~20 mL Kahlua']],
  ['1 oz. Cream', 'converted', ['~30 mL Cream']],
  ['1 oz. Lime Juice', 'converted', ['~30 mL Lime Juice']],
  ['0.5 oz. Cointreau', 'converted', ['~15 mL Cointreau']],
  ['0.5 oz. Lime Juice', 'converted', ['~15 mL Lime Juice']],
  ['3 ounces cloudy apple juice', 'converted', ['~89 mL cloudy apple juice']],
  ['1 ounce freshly squeezed lemon juice', 'converted', ['~30 mL freshly squeezed lemon juice']],
  // Explicit solid-mass ounce → metric-first grams.
  ['1 oz. Strawberries', 'converted', ['~28 g Strawberries']],
  // Ambiguous ounce → source quantity with the explicit per-line note, no guessed mL/g.
  ['0.67 oz. Lime', 'ambiguous', ['0.67 oz. Lime', 'weight or volume unclear']],
  // Spoon measures → metric-first millilitres (no classification needed).
  ['0.25 tsp. Salt', 'converted', ['~1.25 mL Salt']],
  ['1 tsp. Powdered Sugar', 'converted', ['~5 mL Powdered Sugar']],
  ['2 tbsp lime juice', 'converted', ['~30 mL lime juice']],
  ['2 tablespoons blood orange juice (freshly squeezed)', 'converted', ['~30 mL blood orange juice (freshly squeezed)']],
  ['1 tablespoon lime juice (freshly squeezed)', 'converted', ['~15 mL lime juice (freshly squeezed)']],
  // Cups → metric-first millilitres; non-liquid contents carry "(by volume)",
  // never grams.
  ['1/3 cup coconut cream', 'converted', ['~80 mL coconut cream']],
  ['1/2 cup pineapple juice', 'converted', ['~120 mL pineapple juice']],
  ['1 cup frozen pineapple chunks', 'converted', ['~240 mL (by volume) frozen pineapple chunks']],
  ['1 cup pineapple', 'converted', ['~240 mL (by volume) pineapple']],
  ['1 cup reduced-fat coconut milk', 'converted', ['~240 mL reduced-fat coconut milk']],
  ['2 cups sparkling water', 'converted', ['~480 mL sparkling water']],
  ['.5 cup frozen mango', 'converted', ['~120 mL (by volume) frozen mango']],
  ['3/4 cup coconut water', 'converted', ['~180 mL coconut water']],
  ['2 cups watermelon', 'converted', ['~480 mL (by volume) watermelon']],
  ['1/2 cup fresh lime juice', 'converted', ['~120 mL fresh lime juice']],
  // Alternatives: every convertible alternative annotated metric-first;
  // name-only alternatives merged back into one quantity; separators preserved.
  ['1 ounce alcohol free vodka or 1 teaspoon apple cider vinegar', 'converted', ['~30 mL alcohol free vodka or ~5 mL apple cider vinegar']],
  ['1 cup alcohol free Rosé or alternative (see notes)', 'converted', ['~240 mL alcohol free Rosé or alternative (see notes)']],
  ['1 teaspoon sugar or sweetener (optional)', 'converted', ['~5 mL sugar or sweetener (optional)']],
  ['1 oz non-alcoholic rum ((optional))', 'converted', ['~30 mL non-alcoholic rum ((optional))']],
  ['1 oz white rum or vodka', 'converted', ['~30 mL white rum or vodka']],
  // Whole-fruit pieces, dashes, pinches, counts and variable quantities stay verbatim.
  ['1 wedge Lime', 'verbatim', []],
  ['1 slice Oranges', 'verbatim', []],
  ['1 pinch Nutmeg', 'verbatim', []],
  ['1 pinch Salt', 'verbatim', []],
  ['1 dash (egg white (optional)) Eggs', 'verbatim', []],
  ['8 strawberries', 'verbatim', []],
  ['Juice of 1 lime', 'verbatim', []],
]

const EDGES = [
  // Malformed / unknown / variable / invalid amounts stay verbatim.
  ['', 'verbatim', []],
  ['   ', 'verbatim', []],
  ['oz. Vodka', 'verbatim', []],
  ['1.2.3 oz Vodka', 'verbatim', []],
  ['1..5 oz Vodka', 'verbatim', []],
  ['abc oz vodka', 'verbatim', []],
  ['-1 oz Vodka', 'verbatim', []],
  ['0 oz Vodka', 'verbatim', []],
  ['1/0 oz Vodka', 'verbatim', []],
  ['99999999 oz Vodka', 'verbatim', []],
  ['1 splash soda', 'verbatim', []],
  ['2 parts vodka', 'verbatim', []],
  ['Salt to taste', 'verbatim', []],
  ['Top with soda', 'verbatim', []],
  // An ounce with no ingredient name at all is ambiguous, never guessed.
  ['1 oz.', 'ambiguous', ['weight or volume unclear']],
  // Supported Unicode fractions convert; unsupported ones stay verbatim.
  ['½ oz Vodka', 'converted', ['~15 mL Vodka']],
  ['¾ cup mango', 'converted', ['~180 mL (by volume) mango']],
  ['1½ oz Vodka', 'converted', ['~44 mL Vodka']],
  ['2⅗ cup juice', 'converted', ['~624 mL juice']],
  ['⅐ oz Vodka', 'verbatim', []],
  // A solid plus an ambiguous food word stays verbatim (no g guess for the lime).
  ['1 oz strawberries or lime', 'ambiguous', ['1 oz strawberries or lime', 'weight or volume unclear']],
  // A full alternative with an unknown unit is never merged into the previous quantity.
  ['1 oz strawberries or 1 splash soda', 'converted', ['~28 g strawberries or 1 splash soda']],
  // Case-insensitive "or".
  ['1 oz. vodka OR 1 tsp. vinegar', 'converted', ['~30 mL vodka OR ~5 mL vinegar']],
]

// A converted line must never repeat a visible source-unit word — metric-first
// display without the original oz/cup/tbsp/tsp amount.
const SOURCE_UNIT_WORD = /\b(oz|ounce|ounces|cup|cups|tbsp|tbsps|tablespoon|tablespoons|tsp|tsps|teaspoon|teaspoons)\b/i

function runCases(metric, cases, label) {
  for (const [raw, status, includes] of cases) {
    const summary = metric.metricIngredients([raw])
    assert.equal(summary.lines.length, 1, `${label}: ${JSON.stringify(raw)} must produce one line`)
    const line = summary.lines[0]
    assert.equal(line.status, status, `${label}: ${JSON.stringify(raw)} status (got ${JSON.stringify(line.display)})`)
    assert.ok(!/NaN|Infinity|undefined/.test(line.display), `${label}: ${JSON.stringify(raw)} must not contain NaN/Infinity/undefined`)
    if (status === 'verbatim') {
      assert.equal(line.display, raw, `${label}: verbatim line must be unchanged: ${JSON.stringify(raw)}`)
    } else if (status === 'ambiguous') {
      assert.ok(line.display.startsWith(raw.trim()), `${label}: ambiguous line must retain the source quantity: ${JSON.stringify(raw)}`)
      assert.ok(!line.display.includes(' mL') && !line.display.includes(' g'), `${label}: ambiguous line must not gain a metric guess: ${JSON.stringify(raw)}`)
    } else {
      assert.ok(line.display.startsWith('~'), `${label}: converted line must show metric quantity first: ${JSON.stringify(raw)} (got ${JSON.stringify(line.display)})`)
      assert.ok(line.display.includes(' mL') || line.display.includes(' g'), `${label}: converted line must carry a metric annotation: ${JSON.stringify(raw)}`)
      assert.ok(!SOURCE_UNIT_WORD.test(line.display), `${label}: converted line must not repeat the source unit: ${JSON.stringify(raw)} (got ${JSON.stringify(line.display)})`)
    }
    for (const text of includes) {
      assert.ok(line.display.includes(text), `${label}: ${JSON.stringify(raw)} display must include ${JSON.stringify(text)} (got ${JSON.stringify(line.display)})`)
    }
  }
}

function invariants(metric) {
  const sample = ['1.5 oz. Vodka', '0.67 oz. Lime', '1 wedge Lime', '1 ounce alcohol free vodka or 1 teaspoon apple cider vinegar']
  const before = JSON.stringify(sample)
  const first = metric.metricIngredients(sample)
  const second = metric.metricIngredients(sample)
  assert.equal(JSON.stringify(sample), before, 'the helper must not mutate its input array')
  assert.deepEqual(first, second, 'the helper must be deterministic')
  assert.equal(first.lines.length, 4)
  assert.equal(first.convertedCount, first.lines.filter(line => line.status === 'converted').length, 'convertedCount must match the lines')
  assert.equal(first.ambiguousCount, first.lines.filter(line => line.status === 'ambiguous').length, 'ambiguousCount must match the lines')
  assert.equal(first.convertedCount, 2)
  assert.equal(first.ambiguousCount, 1)
  const frozen = Object.freeze(['1.5 oz. Vodka'])
  assert.doesNotThrow(() => metric.metricIngredients(frozen), 'a frozen input array must not throw')
}

// ---------------------------------------------------------------------------
// Live read-only section
// ---------------------------------------------------------------------------

// The identical frozen eligible predicate (single source: queries.ts).
const ELIGIBLE_PARAMS = [
  ['status', 'eq.published'],
  ['editorial_ready', 'is.true'],
  ['alcohol_type', 'in.(cocktail,mocktail)'],
  ['source_name', 'not.is.null'],
  ['source_url', 'not.is.null'],
  ['source_retrieved_at', 'not.is.null'],
  ['content_origin', 'not.is.null'],
  ['recipe_quality_issues', 'eq.{}'],
]

function parseCountTotal(contentRange) {
  if (!contentRange) return null
  const total = contentRange.split('/')[1]
  if (!total || total === '*') return null
  const parsed = Number(total)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

// Mirror of the recognized source units, for cross-checking the helper against
// each row's stored ingredient_details (raw stays the DB source of truth).
function detailUnitKind(unit) {
  const normalized = String(unit).toLowerCase().replace(/\.+$/, '')
  if (normalized === 'oz' || normalized === 'ounce' || normalized === 'ounces') return 'oz'
  if (normalized === 'cup' || normalized === 'cups') return 'cup'
  if (['tbsp', 'tbsps', 'tablespoon', 'tablespoons'].includes(normalized)) return 'tbsp'
  if (['tsp', 'tsps', 'teaspoon', 'teaspoons'].includes(normalized)) return 'tsp'
  return null
}

// Parse a stored detail amount (decimal with optional leading dot, or fraction).
function detailAmount(amount) {
  const token = String(amount).trim()
  if (/^(\d+(\.\d+)?|\.\d+)$/.test(token)) {
    const value = Number(token)
    return Number.isFinite(value) && value > 0 ? value : null
  }
  const fraction = /^(\d{1,6})\/(\d{1,6})$/.exec(token)
  if (fraction !== null && Number(fraction[2]) !== 0) {
    const value = Number(fraction[1]) / Number(fraction[2])
    return Number.isFinite(value) && value > 0 ? value : null
  }
  return null
}

function readEnvCredentials() {
  const values = {}
  const envPath = path.join(root, '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
      if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
  return {
    base: values.SUPABASE_URL || process.env.SUPABASE_URL,
    key: values.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  }
}

function launchEvidenceIds() {
  const evidencePath = path.join(root, 'output', 'recipe-launch', 'remote-before.json')
  if (!fs.existsSync(evidencePath)) return null
  return JSON.parse(fs.readFileSync(evidencePath, 'utf8')).rows.map(row => row.id)
}

async function liveChecks(metric) {
  const { base, key } = readEnvCredentials()
  if (!base || !key) {
    console.log('SKIP: live read-only section (no Supabase credentials available)')
    return
  }
  const params = new URLSearchParams({ select: 'id,name,ingredients,ingredient_details' })
  for (const [name, value] of ELIGIBLE_PARAMS) params.append(name, value)
  let rows = null
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/drinks?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', Prefer: 'count=exact' },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const total = parseCountTotal(response.headers.get('content-range'))
    const payload = await response.json()
    if (!Array.isArray(payload) || total === null || total !== payload.length) throw new Error('unexpected or truncated payload')
    rows = payload
  } catch (error) {
    const launchIds = launchEvidenceIds()
    if (launchIds === null) {
      console.error(`FAIL: the live read-only read failed (${error && error.message ? error.message : error}) and no launch evidence is available`)
      process.exitCode = 1
      return
    }
    console.log(`NOTE: live read unavailable (${error && error.message ? error.message : error}); checking the retained launch-evidence rows instead.`)
    rows = JSON.parse(fs.readFileSync(path.join(root, 'output', 'recipe-launch', 'remote-before.json'), 'utf8')).rows
  }

  // The retained launch recipes prove the real eligible set was checked.
  const launchIds = launchEvidenceIds()
  if (launchIds !== null) {
    const liveIds = new Set(rows.map(row => row.id))
    for (const id of launchIds) assert.ok(liveIds.has(id), `eligible rows must include the launch recipe ${id}`)
  }
  assert.ok(rows.length >= 6, `the eligible set must be present (got ${rows.length} rows)`)

  // Every stored line of every eligible row through the real helper, with the
  // helper's verdict cross-checked against the stored ingredient_details.
  let linesTotal = 0
  let converted = 0
  let ambiguous = 0
  let verbatim = 0
  for (const row of rows) {
    assert.ok(Array.isArray(row.ingredients) && row.ingredients.length > 0, `${row.id} must have ingredients`)
    const detailsByRaw = new Map()
    if (Array.isArray(row.ingredient_details)) {
      for (const detail of row.ingredient_details) {
        if (detail && typeof detail.raw === 'string') detailsByRaw.set(detail.raw, detail)
      }
    }
    const summary = metric.metricIngredients(row.ingredients)
    assert.equal(summary.lines.length, row.ingredients.length, `${row.id} line count`)
    for (let index = 0; index < row.ingredients.length; index += 1) {
      const raw = row.ingredients[index]
      const line = summary.lines[index]
      linesTotal += 1
      assert.ok(!/NaN|Infinity|undefined/.test(line.display), `${row.id}: ${raw}`)
      assert.ok(['converted', 'verbatim', 'ambiguous'].includes(line.status), `${row.id}: ${raw}`)
      if (line.status === 'verbatim') {
        verbatim += 1
        assert.equal(line.display, raw, `${row.id}: verbatim line must be unchanged: ${raw}`)
      } else if (line.status === 'ambiguous') {
        ambiguous += 1
        assert.ok(line.display.startsWith(raw.trim()) && line.display.includes('weight or volume unclear'), `${row.id}: ${raw}`)
      } else {
        converted += 1
        assert.ok(line.display.startsWith('~'), `${row.id}: converted line must show metric quantity first: ${raw} (got ${line.display})`)
        assert.ok(line.display.includes(' mL') || line.display.includes(' g'), `${row.id}: ${raw}`)
        assert.ok(!SOURCE_UNIT_WORD.test(line.display), `${row.id}: converted line must not repeat the source unit: ${raw} (got ${line.display})`)
      }
      // Cross-check with the stored details: a known convertible unit with a
      // parseable amount must never come out plain-verbatim, and an oz detail
      // must convert or be explicitly ambiguous.
      const detail = detailsByRaw.get(raw)
      if (detail && detail.unit !== null && detail.unit !== undefined && detail.amount !== null && detail.amount !== undefined) {
        const kind = detailUnitKind(detail.unit)
        const amount = detailAmount(detail.amount)
        if (kind !== null && amount !== null) {
          if (kind === 'oz') {
            assert.ok(line.status === 'converted' || line.status === 'ambiguous', `${row.id}: an oz detail must convert or be explicitly ambiguous: ${raw}`)
          } else {
            assert.notEqual(line.status, 'verbatim', `${row.id}: a ${detail.unit} detail must convert: ${raw}`)
          }
        }
      }
    }
  }
  console.log(`PASS: live read-only — ${rows.length} eligible rows, ${linesTotal} ingredient lines: ${converted} converted metric-first (no repeated source units), ${ambiguous} ambiguous, ${verbatim} verbatim; every convertible unit handled per contract, ambiguous ounces keep the source quantity with the per-line note, no writes performed.`)
}

async function main() {
  const metric = loadMetricModule()
  runCases(metric, SHAPES, 'shape')
  runCases(metric, EDGES, 'edge')
  invariants(metric)
  // One combined call over every fixture line: no NaN/Infinity anywhere.
  const combined = metric.metricIngredients([...SHAPES, ...EDGES].map(entry => entry[0]))
  assert.equal(combined.lines.length, SHAPES.length + EDGES.length, 'the combined call must annotate every fixture line')
  for (const line of combined.lines) {
    assert.ok(!/NaN|Infinity|undefined/.test(line.display), `combined display must not contain NaN/Infinity/undefined: ${line.display}`)
  }
  console.log(`PASS: unit — ${SHAPES.length + EDGES.length} fixture lines over the real metric.ts: metric-first displays for known US fl oz/cup/tbsp/tsp (no repeated source units), grams only for explicitly solid mass ounces, ambiguous ounces keep the source quantity with the per-line note, both alternatives converted, false-precision rounding avoided, no NaN/Infinity, no input mutation.`)
  await liveChecks(metric)
}

main().catch(error => {
  console.error('FAIL:', error && error.message ? error.message : error)
  if (error && error.stack) console.error(error.stack)
  process.exitCode = 1
})
