import type { Product } from './model'

// Optional deterministic starting list (D7). Pure: no Date, no randomness, no I/O.
// The same input and catalogue always produce the same list.

export type Group = 'beer' | 'wine' | 'spirits' | 'rtd'

export type SuggestInput = {
  guests: number
  budgetPaise: number
  servingsPerDrinker: number
  nonDrinkers: number
  categories: string[]
}

export type SuggestedLine = { productId: string; category: string; quantity: number; subtotalPaise: number }

export type Suggestion = {
  ok: true
  label: 'Estimate. Edit anything.'
  guests: number
  drinkers: number
  nonDrinkers: number
  categories: string[]
  servingsPerDrinker: number
  totalServings: number
  coveredServings: number
  lines: SuggestedLine[]
  totalPaise: number
  withinBudget: boolean
  perGuestPaise: number
  notes: string[]
}

export type SuggestResult = Suggestion | { ok: false; error: string }

export const SUGGEST_LABEL = 'Estimate. Edit anything.' as const

// Catalogue categories are grouped by name, so the split follows whatever categories
// the database holds. Liqueurs, sake and anything unrecognised are never suggested.
export function groupOf(category: string): Group | null {
  const name = category.toLowerCase()
  if (/liqueur|aperitif|sake|other|unclassified/.test(name)) return null
  if (/beer/.test(name)) return 'beer'
  if (/ready to drink|rtd|premix/.test(name)) return 'rtd'
  if (/wine|champagne|prosecco/.test(name)) return 'wine'
  if (/whisk|scotch|malt|bourbon|vodka|rum|gin|tequila|agave|mezcal|brandy|cognac|country liquor/.test(name)) return 'spirits'
  return null
}

export const SERVING_ML: Record<Group, number> = { beer: 330, wine: 150, spirits: 60, rtd: 275 }
const sizeAllowed = (group: Group, sizeMl: number) =>
  group === 'beer' ? sizeMl >= 330 && sizeMl <= 650
    : group === 'wine' ? sizeMl === 750
      : group === 'spirits' ? sizeMl >= 375 && sizeMl <= 1000
        : true

export const suggestibleCategories = (catalogue: Product[]) => [...new Set(catalogue.filter(product => {
  const group = groupOf(product.category)
  return group !== null && sizeAllowed(group, product.sizeMl)
}).map(product => product.category))].sort(byName)

const MAX_GUESTS = 1000
const MAX_BUDGET_PAISE = 100_000_000
const MAX_QUANTITY = 1000
const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Best value first: price per 750 ml (cross-multiplied, integer-safe), then price, then id.
function byValue(a: Product, b: Product) {
  const left = a.pricePaise * b.sizeMl, right = b.pricePaise * a.sizeMl
  if (left !== right) return left - right
  if (a.pricePaise !== b.pricePaise) return a.pricePaise - b.pricePaise
  return byName(a.id, b.id)
}

export function suggestStartingList(input: SuggestInput, catalogue: Product[]): SuggestResult {
  if (!input || !isInt(input.guests) || input.guests < 1 || input.guests > MAX_GUESTS
    || !isInt(input.budgetPaise) || input.budgetPaise < 1 || input.budgetPaise > MAX_BUDGET_PAISE
    || !isInt(input.servingsPerDrinker) || input.servingsPerDrinker < 1 || input.servingsPerDrinker > 20
    || !isInt(input.nonDrinkers) || input.nonDrinkers < 0 || !Array.isArray(input.categories)
    || !input.categories.length || input.categories.length > 18
    || input.categories.some(category => typeof category !== 'string')
    || new Set(input.categories).size !== input.categories.length || !Array.isArray(catalogue)) return { ok: false, error: 'Enter servings and select at least one supported category.' }
  const drinkers = input.guests - input.nonDrinkers
  if (drinkers < 1) return { ok: false, error: 'At least one guest must be drinking for a starting list.' }

  const servingsPerDrinker = input.servingsPerDrinker
  const totalServings = drinkers * servingsPerDrinker

  // Eligible products per selected category, best value first.
  const ranked = new Map<string, Product[]>()
  for (const product of catalogue) {
    const group = groupOf(product.category)
    if (!input.categories.includes(product.category) || !group || !sizeAllowed(group, product.sizeMl)) continue
    ranked.set(product.category, [...(ranked.get(product.category) ?? []), product])
  }
  for (const items of ranked.values()) items.sort(byValue)
  if (ranked.size !== input.categories.length) return { ok: false, error: 'A selected category has no eligible packs. Change the selection to continue.' }
  const plan = [...ranked.keys()].sort(byName).map(category => {
    const neededMl = Math.ceil((totalServings * SERVING_ML[groupOf(category)!]) / input.categories.length)
    const items = ranked.get(category)!
    return { category, neededMl, items, index: Math.floor((items.length - 1) / 2) }
  })

  const lineFor = (entry: (typeof plan)[number]): SuggestedLine => {
    const product = entry.items[entry.index]
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.ceil(entry.neededMl / product.sizeMl)))
    return { productId: product.id, category: entry.category, quantity, subtotalPaise: product.pricePaise * quantity }
  }
  const total = () => plan.reduce((sum, entry) => sum + lineFor(entry).subtotalPaise, 0)

  // Budget fit: lower the biggest category subtotal one purchasable choice at a time.
  // Price per ml ordering is for the initial pick; it does not guarantee the lowest line cost.
  const cheaperIndex = (entry: (typeof plan)[number]) => {
    const currentCost = lineFor(entry).subtotalPaise
    let next = -1, nextCost = -1
    entry.items.forEach((item, index) => {
      const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.ceil(entry.neededMl / item.sizeMl)))
      const cost = item.pricePaise * quantity
      if (cost < currentCost && (cost > nextCost || (cost === nextCost && index < next))) { next = index; nextCost = cost }
    })
    return next
  }
  while (total() > input.budgetPaise) {
    const movable = plan.filter(entry => cheaperIndex(entry) >= 0)
    if (!movable.length) break
    movable.sort((a, b) => lineFor(b).subtotalPaise - lineFor(a).subtotalPaise || byName(a.category, b.category))
    movable[0].index = cheaperIndex(movable[0])
  }

  const lines = plan.map(lineFor)
  const exactCoverage = plan.reduce((sum, entry) => {
    const product = entry.items[entry.index]
    return sum + lineFor(entry).quantity * product.sizeMl / SERVING_ML[groupOf(entry.category)!]
  }, 0)
  const coveredServings = Math.round(exactCoverage * 10) / 10
  const totalPaise = lines.reduce((sum, line) => sum + line.subtotalPaise, 0)
  const withinBudget = totalPaise <= input.budgetPaise
  const notes = ['Not included: mixers, soft drinks, water, ice and food.']
  if (!withinBudget) notes.unshift('The selected categories cannot fit this budget, even with the lowest-priced eligible packs. Raise the budget or change your category selection.')
  if (lines.some(line => line.quantity === MAX_QUANTITY)) notes.push('Some quantities hit the 1,000-pack limit.')
  if (exactCoverage < totalServings) notes.push('Pack coverage is below the target because a quantity reached the 1,000-pack limit.')
  return { ok: true, label: SUGGEST_LABEL, guests: input.guests, drinkers, nonDrinkers: input.nonDrinkers, categories: [...input.categories].sort(byName), servingsPerDrinker, totalServings, coveredServings, lines, totalPaise, withinBudget, perGuestPaise: Math.round(totalPaise / input.guests), notes }
}
