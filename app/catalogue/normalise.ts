import type { Product } from '../party-planner/model'

// Catalogue clean-up shared by Find a Drink and Party Planner (tools redesign, TR1).
// planner_products rows carry pack text in the name ("OLD MONK SUPERIOR XXX RUM(quarts)"), shouting capitals,
// variant brand spellings and 227 "Other / Unclassified" rows. This turns them into plain bottles.
// Pure: no I/O, so scripts/catalogue-normalise-check.cjs runs it directly. The data source is unchanged.

export const KINDS = ['gin', 'vodka', 'rum', 'whisky', 'tequila', 'brandy', 'wine', 'beer', 'liqueur', 'rtd'] as const
export type Kind = typeof KINDS[number]

export type Bottle = {
  id: string
  kind: Kind
  name: string
  brand: string
  sizeMl: number
  pricePaise: number
  // Price scaled to 750 ml, so budget bands compare a 700 ml and a 1 litre bottle fairly. Beer and RTD keep their own price.
  price750Paise: number
}

// Category names are matched by pattern, like groupOf in suggest.ts, so renamed categories keep working.
const CATEGORY_KINDS: readonly [RegExp, Kind][] = [
  [/liqueur|aperitif/i, 'liqueur'],
  [/ready to drink|rtd|premix/i, 'rtd'],
  [/beer/i, 'beer'],
  [/wine|champagne|prosecco/i, 'wine'],
  [/tequila|agave|mezcal/i, 'tequila'],
  [/whisk|scotch|bourbon|malt/i, 'whisky'],
  [/vodka/i, 'vodka'],
  [/\brum\b/i, 'rum'],
  [/\bgin\b/i, 'gin'],
  [/brandy|cognac/i, 'brandy'],
]

// "Other / Unclassified" rows move only when the name has words of exactly one kind. Grape names count as wine.
const NAME_KINDS: readonly [RegExp, Kind][] = [
  [/\b(wine|riesling|reisling|malbec|chardonnay|merlot|shiraz|cabernet|sauvignon|pinot|chenin|garnacha|tempranillo|prosecco)\b/i, 'wine'],
  [/\b(whisky|whiskey|scotch|bourbon)\b/i, 'whisky'],
  [/\bvodka\b/i, 'vodka'],
  [/\brum\b/i, 'rum'],
  [/\bgin\b/i, 'gin'],
  [/\b(tequila|mezcal)\b/i, 'tequila'],
  [/\b(brandy|cognac)\b/i, 'brandy'],
]

export function kindOf(product: Pick<Product, 'category' | 'name'>): Kind | null {
  // Country liquor is not offered in either tool.
  if (/country/i.test(product.category)) return null
  if (!/unclassified|other/i.test(product.category)) return CATEGORY_KINDS.find(([pattern]) => pattern.test(product.category))?.[1] ?? null
  const kinds = [...new Set(NAME_KINDS.filter(([pattern]) => pattern.test(product.name)).map(([, kind]) => kind))]
  return kinds.length === 1 ? kinds[0] : null
}

// Full bottles only: no miniatures, pints or party kegs.
export function isFullBottle(kind: Kind, sizeMl: number): boolean {
  if (kind === 'beer') return sizeMl >= 330 && sizeMl <= 650
  if (kind === 'rtd') return sizeMl >= 250 && sizeMl <= 330
  return sizeMl >= 700 && sizeMl <= 1000
}

// Trailing pack text: "(quarts)", "(750 ML (6 Bottles))", "(Nips-IMFL pet)", "(13.5%)", or an unclosed "(1".
const PACK = /quart|pint|nip|miniature|\bml\b|ml\b|ltr|litre|bottle|\bbtl|\bcan|\bpet\b|rml|rhl|\d/i
function stripPack(text: string): string {
  let name = text
  for (let i = 0; i < 4; i++) {
    const unclosed = /\([^()]*$/.exec(name)
    if (unclosed && PACK.test(unclosed[0])) { name = name.slice(0, unclosed.index); continue }
    const group = /\((?:[^()]|\([^()]*\))*\)\s*$/.exec(name)
    if (group && PACK.test(group[0])) { name = name.slice(0, group.index); continue }
    break
  }
  return name
}

const UPPER = new Set(['XO', 'VS', 'VSOP', 'XXX', 'XX', 'VAT', 'IPA', 'USA', 'UK', 'NV', 'PM', 'AG', 'II', 'III', 'IV', 'DOC', 'DOCG', 'AOC', 'DOP', 'QBA', 'CL', 'IMFL', 'YO', 'HH', 'IQ', 'MG', 'JR', 'AMG', 'GBR', 'RJ'])
const LOWER = new Set(['of', 'the', 'and', 'de', 'del', 'des', 'di', 'da', 'du', 'la', 'le', 'los', 'las', 'by', 'en', 'et', 'y'])

function wordCase(word: string, first: boolean): string {
  const letters = word.replace(/[^A-Za-zÀ-ÿ]/g, '')
  // Keep mixed-case words ("McDowell's", "Añejo") and words with digits ("M2", "12YO") as they are.
  if (!letters || letters !== letters.toUpperCase() || /\d/.test(word)) return word
  if (UPPER.has(letters)) return word
  const lower = word.toLowerCase()
  if (!first && LOWER.has(lower)) return lower
  // Capitalise after hyphens and dots too: "SAINT-EMILION" → "Saint-Emilion", "J.LOHR" → "J.Lohr". Not after apostrophes.
  return lower.replace(/(^|[-.&/])([a-zà-ÿ])/g, (_, mark: string, letter: string) => mark + letter.toUpperCase())
}

// Spelling slips in the source data that would otherwise show on screen.
const SPELLING: readonly [RegExp, string][] = [
  [/^johnie walker\b/i, 'Johnnie Walker'], [/xclamat!on/i, 'Xclamation'], [/\btequilla\b/i, 'Tequila'], [/^remy martin\b/i, 'Rémy Martin'],
  [/\bbelnded\b/i, 'Blended'], [/\bwhi(ksy|shy)\b/i, 'Whisky'], [/\bkentuckey\b/i, 'Kentucky'], [/^taliskar\b/i, 'Talisker'],
]

export function cleanName(raw: string): string {
  let text = stripPack(raw)
    .replace(/[‘’`´]/g, "'")
    .replace(/\s*\b\d+(?:\.\d+)?\s?%/g, '')
    // "-RML" (Rajasthan-made liquor) and stray dashes, dots and commas at the end.
    .replace(/[\s-]*\brml\b\s*$/i, '')
    .replace(/[\s.,-]+$/, '')
    .replace(/^[\s.]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [pattern, fix] of SPELLING) text = text.replace(pattern, fix)
  text = text.split(' ').map((word, index) => wordCase(word, index === 0)).join(' ')
  // When a known brand is only spelled differently ("Mcdowells", "Seagrams"), show its proper spelling.
  const known = BRANDS.find(([pattern, brand]) => brand && pattern.test(text))
  if (known) {
    const match = known[0].exec(text)!
    if (letters(match[0]) === letters(known[1])) text = known[1] + text.slice(match[0].length)
  }
  return text
}

const letters = (text: string) => text.normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '')

// Brands we know by more than one word, or by a spelling the catalogue varies. Matched against the start of the cleaned name.
// The owner's base-spirits spreadsheet can replace this list later.
const BRANDS: readonly [RegExp, string][] = [
  [/^old monk\b/i, 'Old Monk'], [/^old port\b/i, 'Old Port'],
  [/^johnn?ie walker\b/i, 'Johnnie Walker'], [/^jack daniel'?s\b/i, "Jack Daniel's"], [/^jim beam\b/i, 'Jim Beam'],
  [/^jose cuervo\b/i, 'Jose Cuervo'], [/^el jimador\b/i, 'El Jimador'], [/^don angel\b/i, 'Don Angel'], [/^(tequila )?camino real\b/i, 'Camino Real'],
  [/^chivas regal\b/i, 'Chivas Regal'], [/^royal salute\b/i, 'Royal Salute'], [/^royal stag\b/i, 'Royal Stag'],
  [/^royal chall[ae]nge\b/i, 'Royal Challenge'], [/^imperial blue\b/i, 'Imperial Blue'], [/^officer'?s choice\b/i, "Officer's Choice"],
  [/^blenders pride\b/i, 'Blenders Pride'], [/^sterling reserve\b/i, 'Sterling Reserve'], [/^peter scot\b/i, 'Peter Scot'],
  [/^director'?s special\b/i, "Director's Special"], [/^pure gold\b/i, 'Pure Gold'], [/^red knight\b/i, 'Red Knight'],
  [/^knight rider\b/i, 'Knight Rider'], [/^black dog\b/i, 'Black Dog'], [/^black (and|&) white\b/i, 'Black & White'],
  [/^black pearl\b/i, 'Black Pearl'], [/^black by bacardi\b/i, 'Bacardi'], [/^paul john\b/i, 'Paul John'], [/^crazy cock\b/i, 'Crazy Cock'],
  [/^monkey shoulder\b/i, 'Monkey Shoulder'], [/^100 pipers\b/i, '100 Pipers'], [/^8 ?pm\b/i, '8PM'], [/^magic moments\b/i, 'Magic Moments'],
  [/^russian standard\b/i, 'Russian Standard'], [/^grey goose\b/i, 'Grey Goose'], [/^ketel one\b/i, 'Ketel One'], [/^short story\b/i, 'Short Story'],
  [/^smoke lab\b/i, 'Smoke Lab'], [/^rock paper rum\b/i, 'Rock Paper Rum'], [/^big ben\b/i, 'Big Ben'], [/^blue moon\b/i, 'Blue Moon'],
  [/^bombay sapphire\b/i, 'Bombay Sapphire'], [/^greater than\b/i, 'Greater Than'], [/^gin mare\b/i, 'Gin Mare'],
  [/^mc ?dowell'?s\b/i, "McDowell's"], [/^seagram'?s\b/i, "Seagram's"], [/^ballantine'?\s?s\b/i, "Ballantine's"], [/^dewar'?s\b/i, "Dewar's"],
  [/^teacher'?s\b/i, "Teacher's"], [/^grant'?s\b/i, "Grant's"], [/^hendrick'?s\b/i, "Hendrick's"], [/^gordon'?s\b/i, "Gordon's"],
  [/^michter'?s\b/i, "Michter's"], [/^jacob'?s creek\b/i, "Jacob's Creek"], [/^yellow tail\b/i, 'Yellow Tail'], [/^two oceans\b/i, 'Two Oceans'],
  [/^black tower\b/i, 'Black Tower'], [/^moet\b/i, 'Moët & Chandon'], [/^dom perignon\b/i, 'Dom Pérignon'],
  [/^laurent perrier\b/i, 'Laurent-Perrier'], [/^nicolas feuillatte\b/i, 'Nicolas Feuillatte'], [/^cloudy bay\b/i, 'Cloudy Bay'],
  [/^king ?fisher/i, 'Kingfisher'], [/^carlsberg\b/i, 'Carlsberg'], [/^tuborg\b/i, 'Tuborg'], [/^heineken\b/i, 'Heineken'], [/^budweiser\b/i, 'Budweiser'],
  [/^miller\b/i, 'Miller'], [/^fosters?\b/i, "Foster's"], [/^corona\b/i, 'Corona'], [/^hoegaarden\b/i, 'Hoegaarden'],
  [/^very old vatted old monk\b/i, 'Old Monk'], [/^rémy martin\b/i, 'Rémy Martin'],
  [/^j ?(and|&) ?b\b/i, 'J&B'], [/^what the fox\b/i, 'What The Fox'], [/^1800\b/i, '1800'], [/^m2 magic\b/i, 'M2 Magic'], [/^v21\b/i, 'V21'], [/^six fields\b/i, 'Six Fields'],
]

export function brandOf(name: string): string {
  const known = BRANDS.find(([pattern]) => pattern.test(name))
  if (known) return known[1]
  // Otherwise the first word, or the first two when the first is too common to name a brand ("Black Jet", "Don Romeo").
  // A leading "The" stays with it: "The Macallan", "The Glen Grant".
  const article = /^the /i.test(name) ? 'The ' : ''
  const words = name.slice(article.length).split(' ').map(word => word.replace(/[,:;]+$/, ''))
  return article + ((GENERIC.test(words[0]) || /^\d+$/.test(words[0])) && words.length > 2 ? words.slice(0, 2).join(' ') : words[0])
}

const GENERIC = /^(black|blue|red|white|green|gold|golden|silver|old|royal|wild|very|big|grand|central|south|north|saint|st\.?|san|santa|don|dona|el|la|le|les|los|tom|jin|buen|cruz|casa|castello|chateau|château|domaine|villa|mont|monte|two|three|one|gin|rum|vodka|tequila|cognac|vin|vina|viña|cape|lost|mark|master|signature|glen|all|after|star|william|scottish|evan|john|mountain|wood|house|spirit|orange|premium|champagne|reserve)$/i

const byPrice = (a: Bottle, b: Bottle) => a.pricePaise - b.pricePaise || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export function toBottle(product: Product): Bottle | null {
  const kind = kindOf(product)
  if (!kind || !isFullBottle(kind, product.sizeMl)) return null
  // The brand column is the product name without its pack text, so it is the cleaner source. Fall back to the name.
  const name = cleanName(product.brand || product.name)
  if (!name) return null
  const price750Paise = kind === 'beer' || kind === 'rtd' ? product.pricePaise : Math.round(product.pricePaise * 750 / product.sizeMl)
  return { id: product.id, kind, name, brand: brandOf(name), sizeMl: product.sizeMl, pricePaise: product.pricePaise, price750Paise }
}

// Clean bottles, cheapest first. The same kind, name and size listed twice keeps the cheaper row.
export function normaliseCatalogue(products: readonly Product[]): Bottle[] {
  const seen = new Map<string, Bottle>()
  for (const product of products) {
    const bottle = toBottle(product)
    if (!bottle) continue
    const key = [bottle.kind, bottle.name.toLowerCase(), bottle.sizeMl].join('|')
    const current = seen.get(key)
    if (!current || byPrice(bottle, current) < 0) seen.set(key, bottle)
  }
  return [...seen.values()].sort(byPrice)
}
