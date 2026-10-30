// app/find-my-drink/metric.ts
// Pure metric-annotation helpers for recipe ingredient checklists.
//
// Given the validated, source-retained ingredient lines of a recipe (the exact
// strings stored in public.drinks and never rewritten), annotate each line with
// a practical metric equivalent ONLY where it can be safely converted from the
// source unit, with no density assumptions anywhere. Confidently convertible
// lines are rewritten metric-first — the metric quantity leads and the
// source-unit amount is not repeated in the visible checklist:
// - US fluid ounces on liquid ingredients → "~44 mL Vodka" (~29.57 mL per fl oz);
// - ounces on explicitly solid ingredients (berries, fruit, herbs, fresh
//   ginger, spices) → "~28 g Strawberries" (~28.35 g per oz), never for liquids;
// - cups → millilitres (240 mL per cup): "~80 mL coconut cream" for liquid
//   contents, "~120 mL (by volume) frozen mango" for non-liquid contents — a
//   cup measure is a volume either way, and no density assumption ever turns a
//   solid cup into grams;
// - tablespoons (15 mL) and teaspoons (5 mL) → "~30 mL lime juice".
// Everything else — whole-fruit pieces (wedge/slice), dashes, pinches, counts,
// unknown units and variable quantities ("Juice of 1 lime") — is retained
// verbatim. Ounces on ingredients that are neither clearly liquid nor clearly
// solid (a whole lime may mean juice volume or fruit weight; sugar/salt/honey
// may be weight or volume) are ambiguous: they keep the source quantity with an
// explicit per-line fallback note, never a guessed conversion. A line combining
// a solid with an ambiguous food word (e.g. "1 oz strawberries or lime") also
// stays verbatim.
//
// Alternatives ("X or Y") are preserved with their original separators: every
// alternative that carries a convertible quantity is annotated on its own
// ("1 ounce alcohol free vodka or 1 teaspoon apple cider vinegar" →
// "~30 mL alcohol free vodka or ~5 mL apple cider vinegar"); a name-only
// alternative ("1 cup rosé or alternative (see notes)") continues the previous
// quantity and is merged back into one annotation. No serving scaling ever
// happens: each line converts only itself, at its own source amount.
//
// These are pure functions over validated data with no imports, so they run in
// server components and the making client component alike and their string
// results serialize safely across the server/client boundary.

// --- Conversion bases (documented; no density assumptions) ---
const ML_PER_US_FLOZ = 29.5735
const ML_PER_US_CUP = 240
const ML_PER_TBSP = 15
const ML_PER_TSP = 5
const G_PER_OZ_MASS = 28.35
// Amounts beyond this cannot be a real single recipe measure; treat as
// unverifiable rather than converting an absurd number.
const MAX_SANE_AMOUNT = 10000

export type MetricStatus = 'converted' | 'verbatim' | 'ambiguous'
export type MetricIngredient = { display: string; status: MetricStatus }
export type MetricSummary = { lines: MetricIngredient[]; convertedCount: number; ambiguousCount: number }

// Per-line fallback note for ambiguous quantities: retained verbatim, never guessed.
const AMBIGUOUS_NOTE = '(kept in source units — weight or volume unclear)'

// --- Vocabulary (ingredient-name only; never inferred from anything stored) ---

// Words marking a pourable liquid ingredient. Includes the spirit/liqueur/brand
// names that appear without a generic liquid word in the curated rows.
const LIQUID_WORDS: readonly string[] = [
  'juice', 'vodka', 'gin', 'rum', 'whisky', 'whiskey', 'scotch', 'bourbon',
  'tequila', 'brandy', 'cognac', 'schnapps', 'liqueur', 'cordial', 'cointreau',
  'campari', 'kahlua', 'chartreuse', 'vermouth', 'creme', 'cream', 'milk',
  'syrup', 'water', 'soda', 'cola', 'tonic', 'nectar', 'cider', 'vinegar',
  'wine', 'champagne', 'prosecco', 'coffee', 'espresso', 'tea', 'lemonade',
  'limeade', 'bitters', 'kombucha', 'rose', 'ale', 'beer', 'mix',
]
// Multiword liquid phrases not covered by single words.
const LIQUID_PHRASES: readonly string[] = ['triple sec', 'sour mix', 'egg white']

// Solid foods that are measured by weight when an ounce amount appears.
const SOLID_WORDS: readonly string[] = [
  'strawberries', 'strawberry', 'raspberries', 'raspberry', 'blueberries',
  'blueberry', 'blackberries', 'blackberry', 'cranberries', 'cranberry',
  'cherries', 'cherry', 'pineapple', 'mango', 'mangoes', 'watermelon', 'melon',
  'peach', 'apricot', 'plum', 'banana', 'apple', 'pear', 'cucumber', 'celery',
  'avocado', 'mint', 'basil', 'rosemary', 'thyme', 'sage', 'parsley',
  'cilantro', 'leaves', 'herbs', 'ginger', 'nutmeg', 'cinnamon', 'cloves',
]
// Food words that are neither clearly liquid nor clearly solid on their own
// (whole citrus, sugar/salt/honey, egg, ice, generic fruit). A source ounce on
// them is ambiguous; their presence alongside a solid word also keeps the line
// ambiguous instead of guessing.
const AMBIGUOUS_FOOD_WORDS: readonly string[] = [
  'lime', 'lemon', 'orange', 'grapefruit', 'citrus', 'egg', 'eggs', 'ice',
  'sugar', 'salt', 'honey', 'vanilla', 'fruit', 'berry', 'berries',
]

// Supported Unicode vulgar fractions (common recipe measures only); anything
// outside this set is unparseable and stays verbatim.
const UNICODE_FRACTIONS: Readonly<Record<string, number>> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}
const UNICODE_FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('')

// --- Amount parsing ---

function sane(value: number): number | null {
  return Number.isFinite(value) && value > 0 && value <= MAX_SANE_AMOUNT ? value : null
}

// Parse an amount: plain decimals (including a leading dot), simple fractions,
// mixed whole+fraction ("1 1/2", "1½") and the supported Unicode fractions.
// Returns null for anything else (invalid, zero, negative, absurd).
function parseAmountValue(text: string): number | null {
  const token = text.trim()
  if (token.length === 0 || token.length > 24) return null
  if (Object.prototype.hasOwnProperty.call(UNICODE_FRACTIONS, token)) return UNICODE_FRACTIONS[token]
  const mixed = /^(\d{1,4})(?:\s+(\d{1,4})\/(\d{1,4})|\s*([½⅓⅔¼¾⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘]))$/.exec(token)
  if (mixed !== null) {
    const part = mixed[2] !== undefined
      ? Number(mixed[3]) === 0 ? null : Number(mixed[2]) / Number(mixed[3])
      : mixed[4] !== undefined ? UNICODE_FRACTIONS[mixed[4]] : undefined
    if (part === undefined || part === null || !Number.isFinite(part)) return null
    return sane(Number(mixed[1]) + part)
  }
  const fraction = /^(\d{1,6})\/(\d{1,6})$/.exec(token)
  if (fraction !== null) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return sane(Number(fraction[1]) / denominator)
  }
  if (/^(\d+(\.\d+)?|\.\d+)$/.test(token)) return sane(Number(token))
  return null
}

// Words recognized as convertible source units (lowercase, trailing periods
// stripped, singular/plural). The recipes' "oz"/"ounce(s)" is the US fluid
// ounce and is classified per ingredient (liquid → mL, solid → g, else ambiguous).
function unitKind(token: string): 'oz' | 'cup' | 'tbsp' | 'tsp' | null {
  const unit = token.toLowerCase().replace(/\.+$/, '')
  if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') return 'oz'
  if (unit === 'cup' || unit === 'cups') return 'cup'
  if (unit === 'tbsp' || unit === 'tbsps' || unit === 'tablespoon' || unit === 'tablespoons') return 'tbsp'
  if (unit === 'tsp' || unit === 'tsps' || unit === 'teaspoon' || unit === 'teaspoons') return 'tsp'
  return null
}

type Lead = { amount: number; kind: 'oz' | 'cup' | 'tbsp' | 'tsp'; name: string }

// Recognize "<amount> <unit> <name>" at the start of a line. The amount may be
// a decimal (leading dot allowed), a fraction or a mixed/Unicode fraction; the
// unit is the word right after it ("fl oz" / "fluid ounce" consume two words).
const LEAD = new RegExp(
  '^(\\d+(?:\\.\\d+)?(?:\\s+\\d+/\\d+)?|\\.\\d+|\\d+/\\d+|[0-9' + UNICODE_FRACTION_CHARS + ']*[' + UNICODE_FRACTION_CHARS + ']+[0-9]*)' +
  '\\s*(?=[A-Za-z0-9.])(.*)$',
)

function parseLead(text: string): Lead | null {
  const match = LEAD.exec(text.trim())
  if (match === null) return null
  const amount = parseAmountValue(match[1])
  if (amount === null) return null
  const tokens = match[2].trim().split(/\s+/).filter(token => token.length > 0)
  if (tokens.length === 0) return null
  const firstKind = unitKind(tokens[0])
  if (firstKind !== null) return { amount, kind: firstKind, name: tokens.slice(1).join(' ') }
  const firstWord = tokens[0].toLowerCase().replace(/\.+$/, '')
  if ((firstWord === 'fl' || firstWord === 'fluid') && tokens.length >= 2 && unitKind(tokens[1]) === 'oz') {
    return { amount, kind: 'oz', name: tokens.slice(2).join(' ') }
  }
  return null
}

// --- Ingredient-name classification ---

// The name's own words: lowercase, diacritics stripped, punctuation split.
function nameWords(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
}

function isLiquidName(name: string): boolean {
  const words = nameWords(name)
  return words.some(word => LIQUID_WORDS.includes(word)) ||
    LIQUID_PHRASES.some(phrase => words.join(' ').includes(phrase))
}

function isSolidName(name: string): boolean {
  const words = nameWords(name)
  return words.some(word => SOLID_WORDS.includes(word))
}

function hasAmbiguousFoodWord(name: string): boolean {
  const words = nameWords(name)
  return words.some(word => AMBIGUOUS_FOOD_WORDS.includes(word))
}

// --- Annotation ---

// Practical metric rounding without false precision: below 2 mL to the nearest
// 0.25 mL (canonical spoon measures like ¼ tsp = 1.25 mL survive), 2–10 mL to
// the nearest 0.5 mL, everything above to whole units (⅓ oz → ~10 mL, not 9.76).
function roundMetric(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null
  let rounded: number
  if (value < 2) rounded = Math.round(value * 4) / 4
  else if (value < 10) rounded = Math.round(value * 2) / 2
  else rounded = Math.round(value)
  return rounded > 0 ? String(rounded) : null
}

// Metric-first display: the metric quantity leads; for an empty name the
// annotation alone is shown.
function metricFirst(annotation: string, name: string): string {
  return name.length > 0 ? `${annotation} ${name}` : annotation
}

// A single alternative (or unsplit line): annotate when its leading quantity
// carries a convertible unit. Null = not parseable (verbatim territory).
function annotateSingle(text: string): { display: string; status: 'converted' | 'ambiguous' } | null {
  const lead = parseLead(text)
  if (lead === null) return null
  const base = text.trim()
  if (lead.kind === 'oz') {
    if (isLiquidName(lead.name)) {
      const value = roundMetric(lead.amount * ML_PER_US_FLOZ)
      return value === null
        ? { display: `${base} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
        : { display: metricFirst(`~${value} mL`, lead.name), status: 'converted' }
    }
    if (isSolidName(lead.name) && !hasAmbiguousFoodWord(lead.name)) {
      const value = roundMetric(lead.amount * G_PER_OZ_MASS)
      return value === null
        ? { display: `${base} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
        : { display: metricFirst(`~${value} g`, lead.name), status: 'converted' }
    }
    return { display: `${base} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
  }
  if (lead.kind === 'cup') {
    const value = roundMetric(lead.amount * ML_PER_US_CUP)
    if (value === null) return { display: `${base} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
    // A cup is a volume measure whatever it holds; for non-liquid contents the
    // "(by volume)" qualifier follows the metric value so a solid cup is never
    // read as a weight in grams.
    const annotation = `~${value} mL${isLiquidName(lead.name) ? '' : ' (by volume)'}`
    return { display: metricFirst(annotation, lead.name), status: 'converted' }
  }
  const perUnit = lead.kind === 'tbsp' ? ML_PER_TBSP : ML_PER_TSP
  const value = roundMetric(lead.amount * perUnit)
  if (value === null) return { display: `${base} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
  return { display: metricFirst(`~${value} mL`, lead.name), status: 'converted' }
}

// Split a raw line on its " or " alternatives, keeping the exact separator
// text so the display preserves the original wording. An empty part ("Or …")
// means the line is not an alternatives shape.
function splitAlternatives(raw: string): { parts: string[]; separators: string[] } {
  const parts: string[] = []
  const separators: string[] = []
  const pattern = /\s+or\s+/gi
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw)) !== null) {
    parts.push(raw.slice(last, match.index))
    separators.push(match[0])
    last = match.index + match[0].length
  }
  parts.push(raw.slice(last))
  if (parts.some(part => part.trim().length === 0)) return { parts: [raw], separators: [] }
  return { parts, separators }
}

// Does the text start with something amount-like (a digit, a leading-dot
// decimal or a supported Unicode fraction)? Such a part is a real quantity
// alternative in its own right, not a name-only continuation of the previous one.
const STARTS_WITH_AMOUNT = new RegExp('^\\s*(?:\\d|\\.|[' + UNICODE_FRACTION_CHARS + '])')

function annotateLine(raw: string): MetricIngredient {
  const { parts, separators } = splitAlternatives(raw)
  const slots: { text: string; result: ReturnType<typeof annotateSingle> }[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    const result = annotateSingle(part)
    const previous = slots[slots.length - 1]
    if (result === null && previous !== undefined && previous.result !== null && !STARTS_WITH_AMOUNT.test(part)) {
      // A name-only alternative ("…or alternative (see notes)") continues the
      // previous quantity: merge it back into that part's original text and
      // re-parse. The merged head is unchanged, so it re-parses; a merged name
      // that turns ambiguous demotes the line to the verbatim note. A part that
      // starts with its own amount (e.g. "1 splash soda") is never merged.
      previous.text = `${previous.text}${separators[index - 1] ?? ' or '}${part}`
      const merged = annotateSingle(previous.text)
      previous.result = merged ?? { display: `${previous.text.trim()} ${AMBIGUOUS_NOTE}`, status: 'ambiguous' }
      continue
    }
    slots.push({ text: part, result })
  }
  const parsed = slots.filter(slot => slot.result !== null)
  if (parsed.length === 0) return { display: raw, status: 'verbatim' }
  const display = slots
    .map((slot, index) => {
      const result = slot.result
      return result === null ? slot.text.trim() : result.display
    })
    .reduce((text, part, index) => (index === 0 ? part : `${text}${separators[index - 1] ?? ' or '}${part}`), '')
  if (slots.some(slot => slot.result?.status === 'ambiguous')) return { display, status: 'ambiguous' }
  return { display, status: 'converted' }
}

// Annotate every ingredient line of a recipe. Pure: the input array is only
// read, never mutated, and the result contains no NaN/Infinity values.
export function metricIngredients(ingredients: readonly string[]): MetricSummary {
  const lines = ingredients.map(annotateLine)
  let convertedCount = 0
  let ambiguousCount = 0
  for (const line of lines) {
    if (line.status === 'converted') convertedCount += 1
    else if (line.status === 'ambiguous') ambiguousCount += 1
  }
  return { lines, convertedCount, ambiguousCount }
}
