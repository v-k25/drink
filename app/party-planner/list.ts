import type { Taste } from '../find-my-drink/discovery'
import { rankSpirits, type Spirit } from '../find-my-drink/spirit'
import type { Bottle, Kind } from '../catalogue/normalise'
import type { PlannerInput } from './model'

// Party Planner list (tools redesign, TR4). Guests and budget in, a shopping list by category out:
// pre-picked categories from the optional taste answers, a suggested bottle count per category,
// three real options per category, and line totals that add up to the estimate.
// Pure: no I/O, so scripts/party-planner-list-check.cjs runs it directly. Bottles come from normaliseCatalogue().

export const CHIPS = ['beer', 'wine', 'rum', 'vodka', 'whisky', 'gin', 'tequila', 'rtd'] as const
export type Chip = typeof CHIPS[number] & Kind // every chip is a catalogue kind
export const CHIP_LABELS: Record<Chip, string> = { beer: 'Beer', wine: 'Wine', rum: 'Rum', vodka: 'Vodka', whisky: 'Whisky', gin: 'Gin', tequila: 'Tequila', rtd: 'Ready to drink' }
export const DEFAULT_CHIPS: readonly Chip[] = ['beer', 'rum', 'vodka']

export const DRINK_STYLES = ['mixer', 'neat'] as const
export type DrinkStyle = typeof DRINK_STYLES[number]
export const DRINK_STYLE_LABELS: Record<DrinkStyle, string> = { mixer: 'With a mixer', neat: 'Neat or on ice' }

// About three drinks a guest, split evenly across the chosen categories. One drink is a 330 ml beer,
// a 150 ml glass of wine, a 60 ml spirit pour or one ready-to-drink bottle (the SERVING_ML values in suggest.ts).
export const DRINKS_PER_GUEST = 3
const SERVING_ML: Record<Chip, number> = { beer: 330, wine: 150, rum: 60, vodka: 60, whisky: 60, gin: 60, tequila: 60, rtd: 275 }
// The size the options are chosen from, when the catalogue has at least three of them.
const STANDARD_ML: Record<Chip, number> = { beer: 650, wine: 750, rum: 750, vodka: 750, whisky: 750, gin: 750, tequila: 750, rtd: 275 }
const MAX_QUANTITY = 1000
// A third pre-picked category only when it scores at least this share of the best one.
const THIRD_PICK = 0.6

// Two or three categories from the answers, using Find a Drink's spirit scores. No answers: the usual mix.
export function prePick(tastes: readonly Taste[], style: DrinkStyle | null): Chip[] {
  if (!tastes.length && !style) return [...DEFAULT_CHIPS]
  // Best first; brandy and liqueur have no chip. A single flavour can reach only one chip, so the
  // second pick is simply the next best, and a third needs a real score of its own.
  const scored = rankSpirits({ tastes, feel: null, serve: style, occasion: null })
    .filter(match => (CHIPS as readonly string[]).includes(match.profile.spirit))
  if (!scored[0] || scored[0].score <= 0) return [...DEFAULT_CHIPS]
  const picks = scored.slice(0, 2)
  if (scored[2] && scored[2].score > 0 && scored[2].score >= THIRD_PICK * scored[0].score) picks.push(scored[2])
  return picks.map(match => match.profile.spirit as Spirit & Chip)
}

// Cheaper, middle and premium: the 10th, 45th and 80th percentile by price at the standard size.
// Flavoured spirits (orange vodka, mango rum) are left out when at least three plain bottles remain; a party list wants the plain one.
const FLAVOURED = /flavou?r|orange|jamun|mango|apple|lemon|lime|citron|cranberr|mint|coffee|chilli|coconut|vanilla/i
export function optionsFor(bottles: readonly Bottle[], chip: Chip): Bottle[] {
  const all = bottles.filter(bottle => bottle.kind === chip)
  const standard = all.filter(bottle => bottle.sizeMl === STANDARD_ML[chip])
  const sized = standard.length >= 3 ? standard : all
  const plain = chip === 'rtd' ? sized : sized.filter(bottle => !FLAVOURED.test(bottle.name))
  const pool = [...(plain.length >= 3 ? plain : sized)].sort((a, b) => a.pricePaise - b.pricePaise || (a.id < b.id ? -1 : 1))
  if (pool.length <= 3) return pool
  const at = (share: number) => pool[Math.floor((pool.length - 1) * share)]
  return [...new Set([at(0.1), at(0.45), at(0.8)])]
}

export const suggestedQuantity = (guests: number, chips: number, bottle: Bottle) =>
  Math.min(MAX_QUANTITY, Math.max(1, Math.ceil(guests * DRINKS_PER_GUEST / chips * SERVING_ML[bottle.kind as Chip] / bottle.sizeMl)))

export type ListInput = {
  guests: number
  budgetPaise: number
  chips: readonly Chip[]
  // Choices the host made: an option index per category, and a bottle count per category.
  picks?: Partial<Record<Chip, number>>
  quantities?: Partial<Record<Chip, number>>
}
export type ListLine = {
  chip: Chip; label: string; options: Bottle[]; choice: number; bottle: Bottle
  suggested: number; quantity: number; subtotalPaise: number
}
export type PartyList = {
  lines: ListLine[]; totalPaise: number; remainingPaise: number; perGuestPaise: number; withinBudget: boolean
  bottles: number
  // True when the budget made the list step down to cheaper options the host hadn't picked.
  cheaper: boolean
  // Categories with nothing in the catalogue; they are left out of the list.
  missing: Chip[]
}

export function buildList(input: ListInput, bottles: readonly Bottle[]): PartyList {
  const guests = Math.min(1000, Math.max(1, Math.floor(input.guests) || 1))
  const chips = CHIPS.filter(chip => input.chips.includes(chip))
  const stocked = chips.map(chip => ({ chip, options: optionsFor(bottles, chip) }))
  const missing = stocked.filter(entry => !entry.options.length).map(entry => entry.chip)
  const entries = stocked.filter(entry => entry.options.length)
  const line = (entry: (typeof entries)[number], choice: number): ListLine => {
    const bottle = entry.options[choice]
    const suggested = suggestedQuantity(guests, entries.length, bottle)
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(input.quantities?.[entry.chip] ?? suggested)))
    return { chip: entry.chip, label: CHIP_LABELS[entry.chip], options: entry.options, choice, bottle, suggested, quantity, subtotalPaise: quantity * bottle.pricePaise }
  }
  const middle = (entry: (typeof entries)[number]) => Math.floor((entry.options.length - 1) / 2)
  const picked = (chip: Chip, count: number) => {
    const choice = input.picks?.[chip]
    return choice !== undefined && Number.isInteger(choice) && choice >= 0 && choice < count ? choice : null
  }
  let lines = entries.map(entry => line(entry, picked(entry.chip, entry.options.length) ?? middle(entry)))
  const total = () => lines.reduce((sum, item) => sum + item.subtotalPaise, 0)
  // Over budget: step the biggest line the host hasn't picked down one option at a time, like suggest.ts.
  let cheaper = false
  while (total() > input.budgetPaise) {
    const movable = lines.filter(item => item.choice > 0 && picked(item.chip, item.options.length) === null)
    if (!movable.length) break
    movable.sort((a, b) => b.subtotalPaise - a.subtotalPaise || CHIPS.indexOf(a.chip) - CHIPS.indexOf(b.chip))
    const target = movable[0]
    lines = lines.map(item => item.chip === target.chip ? line(entries.find(entry => entry.chip === item.chip)!, item.choice - 1) : item)
    cheaper = true
  }
  const totalPaise = total()
  return {
    lines, totalPaise, remainingPaise: input.budgetPaise - totalPaise, perGuestPaise: Math.round(totalPaise / guests),
    withinBudget: totalPaise <= input.budgetPaise, bottles: lines.reduce((sum, item) => sum + item.quantity, 0), cheaper, missing,
  }
}

// The same list as calculatePlan() expects, so Share, Copy and Print are checked on the server.
export function toPlannerInput(list: PartyList, guests: number, budgetPaise: number, categoryOf: (id: string) => string | undefined): PlannerInput {
  return {
    guests, budgetPaise,
    categories: [...new Set(list.lines.map(item => categoryOf(item.bottle.id) ?? ''))],
    lines: list.lines.map(item => ({ productId: item.bottle.id, quantity: item.quantity })),
  }
}
