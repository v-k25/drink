import type { Bottle } from '../catalogue/normalise'
import type { SpiritMatch, Spirit } from './spirit'

// Find a Drink's main result (tools redesign, TR2): the stocked bottles of the picked spirit within a budget band.
// Pure: no I/O, so scripts/spirit-check.cjs runs it directly. Bottles come from normaliseCatalogue().

export const BANDS = ['u1', 'b2', 'b4', 'o4', 'any'] as const
export type Band = typeof BANDS[number]
type BandInfo = { label: string; minPaise: number; maxPaise: number; targetPaise: number | null }
// Bands compare the 750 ml-equivalent price. `max` is exclusive. `target` is the price "Recommended" sorts closest to;
// No limit uses the spirit's median price instead.
export const BAND_INFO: Record<Band, BandInfo> = {
  u1: { label: 'Under ₹1,000', minPaise: 0, maxPaise: 100_000, targetPaise: 75_000 },
  b2: { label: '₹1,000–2,000', minPaise: 100_000, maxPaise: 200_000, targetPaise: 150_000 },
  b4: { label: '₹2,000–4,000', minPaise: 200_000, maxPaise: 400_000, targetPaise: 300_000 },
  o4: { label: '₹4,000+', minPaise: 400_000, maxPaise: Number.MAX_SAFE_INTEGER, targetPaise: 600_000 },
  any: { label: 'No limit', minPaise: 0, maxPaise: Number.MAX_SAFE_INTEGER, targetPaise: null },
}
// A spirit is only picked when the band has at least this many of its bottles.
export const MIN_BOTTLES = 2
const JUST_OVER = 3

export const SORTS = ['recommended', 'low', 'high'] as const
export type Sort = typeof SORTS[number]
export const SORT_LABELS: Record<Sort, string> = { recommended: 'Recommended', low: 'Price: low to high', high: 'Price: high to low' }

export const inBand = (bottle: Bottle, band: Band) => bottle.price750Paise >= BAND_INFO[band].minPaise && bottle.price750Paise < BAND_INFO[band].maxPaise
const ofSpirit = (bottles: readonly Bottle[], spirit: Spirit) => bottles.filter(bottle => bottle.kind === spirit)

export type SpiritPick = {
  // The best match with enough bottles in the band, and the runner-up for "Try X instead" (null when no other qualifies).
  top: SpiritMatch; alternative: SpiritMatch | null
  // False when no spirit has two bottles in the band: `top` is then the best match regardless, and its grid is empty or thin.
  stocked: boolean
}

// `matches` is rankSpirits() output, best first. The budget filters it; it never reorders it.
export function pickSpirit(matches: readonly SpiritMatch[], bottles: readonly Bottle[], band: Band): SpiritPick {
  const stocked = matches.filter(match => ofSpirit(bottles, match.profile.spirit).filter(bottle => inBand(bottle, band)).length >= MIN_BOTTLES)
  if (!stocked.length) return { top: matches[0], alternative: matches[1] ?? null, stocked: false }
  return { top: stocked[0], alternative: stocked[1] ?? null, stocked: true }
}

export type BottleFilter = { brands: readonly string[]; sizes: readonly number[] }
export const NO_FILTER: BottleFilter = { brands: [], sizes: [] }

const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}
const byId = (a: Bottle, b: Bottle) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export function sortBottles(list: readonly Bottle[], sort: Sort, band: Band): Bottle[] {
  if (sort === 'low') return [...list].sort((a, b) => a.price750Paise - b.price750Paise || byId(a, b))
  if (sort === 'high') return [...list].sort((a, b) => b.price750Paise - a.price750Paise || byId(a, b))
  // Recommended: closest to the middle of the band first, so neither the cheapest nor the dearest bottle leads.
  const target = BAND_INFO[band].targetPaise ?? median(list.map(bottle => bottle.price750Paise))
  return [...list].sort((a, b) => Math.abs(a.price750Paise - target) - Math.abs(b.price750Paise - target) || a.price750Paise - b.price750Paise || byId(a, b))
}

export type BottleListing = {
  bottles: Bottle[]
  // Before the brand and size filter, for its counts and the "N of M" line.
  total: number
  // The cheapest few bottles of the same spirit above the band (none for ₹4,000+ and No limit). Not filtered.
  justOver: Bottle[]
  brands: { brand: string; count: number }[]
  sizes: { sizeMl: number; count: number }[]
}

export function listBottles(all: readonly Bottle[], spirit: Spirit, band: Band, sort: Sort = 'recommended', filter: BottleFilter = NO_FILTER): BottleListing {
  const mine = ofSpirit(all, spirit)
  const banded = mine.filter(bottle => inBand(bottle, band))
  const count = <K>(keys: K[]) => [...new Set(keys)].map(key => ({ key, count: keys.filter(k => k === key).length }))
  const brands = count(banded.map(bottle => bottle.brand)).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).map(({ key, count }) => ({ brand: key, count }))
  const sizes = count(banded.map(bottle => bottle.sizeMl)).sort((a, b) => a.key - b.key).map(({ key, count }) => ({ sizeMl: key, count }))
  // Filters only apply to values still on offer, so a stale brand from another spirit can't empty the grid.
  const brandSet = new Set(filter.brands.filter(brand => brands.some(item => item.brand === brand)))
  const sizeSet = new Set(filter.sizes.filter(size => sizes.some(item => item.sizeMl === size)))
  const filtered = banded.filter(bottle => (!brandSet.size || brandSet.has(bottle.brand)) && (!sizeSet.size || sizeSet.has(bottle.sizeMl)))
  const max = BAND_INFO[band].maxPaise
  const justOver = max === Number.MAX_SAFE_INTEGER ? [] : mine.filter(bottle => bottle.price750Paise >= max)
    .sort((a, b) => a.price750Paise - b.price750Paise || byId(a, b)).slice(0, JUST_OVER)
  return { bottles: sortBottles(filtered, sort, band), total: banded.length, justOver, brands, sizes }
}

// "750 ml", "1 litre". Beer and RTD show their own sizes.
export const sizeLabel = (sizeMl: number) => sizeMl === 1000 ? '1 litre' : `${sizeMl} ml`
