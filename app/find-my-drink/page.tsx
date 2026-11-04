import type { Metadata } from 'next'
import { eligibilityAccepted } from '../party-planner/session'
import Gate from './gate'
import Browse from './components/browse'
import Finder from './components/finder'
import Guided from './components/guided'
import Shell from './components/shell'
import { parseDiscovery, discoveryHref } from './discovery'
import { buildListingData, loadRecipes, type ListingFilters } from './queries'
import { readCatalogue } from '../party-planner/catalogue-server'
import { normaliseCatalogue, type Bottle } from '../catalogue/normalise'

export const metadata: Metadata = {
  title: 'Find a Drink | Socifer',
  description: 'Four quick questions: your spirit, the bottles we list in your budget in Jaipur, and a few cocktails to make with it.',
}

type SearchParams = { [key: string]: string | string[] | undefined }

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value)

function parseInput(params: SearchParams): { filters: ListingFilters; cursor: { name: string; id: string } | null } {
  const q = (first(params.q) ?? '').slice(0, 120)
  const legacyTypes = (Array.isArray(params.type) ? params.type : params.type !== undefined ? [params.type] : [])
    .filter(type => typeof type === 'string' && type.length > 0 && type.length <= 60)
    .slice(0, 12)
  const types = legacyTypes.filter(type => type !== 'mocktail')
  const rawDrink = first(params.drink)
  const drinkType = rawDrink === 'cocktail' || rawDrink === 'mocktail' ? rawDrink : legacyTypes.includes('mocktail') && types.length === 0 ? 'mocktail' : 'all'
  const rawMethod = first(params.method)
  const method = rawMethod && ['shake', 'stir', 'blend', 'build', 'batch', 'hot'].includes(rawMethod) ? rawMethod as ListingFilters['method'] : null
  const rawMax = first(params.max)
  const maxIngredients = rawMax === '3' ? 3 : rawMax === '5' ? 5 : null
  const picks = (first(params.pick) ?? '').split(',').filter(id => /^[A-Za-z0-9._~-]{1,200}$/.test(id)).slice(0, 3)
  let cursor: { name: string; id: string } | null = null
  const rawCursor = first(params.cursor)
  if (rawCursor !== undefined) {
    try {
      const decoded = decodeURIComponent(rawCursor)
      const separator = decoded.lastIndexOf('::')
      if (separator > 0 && separator < decoded.length - 2) {
        const name = decoded.slice(0, separator)
        const id = decoded.slice(separator + 2)
        if (name && id) cursor = { name, id }
      }
    } catch { cursor = null }
  }
  return { filters: { q, types, drinkType, method, maxIngredients, picks }, cursor }
}

async function readBottles(): Promise<Bottle[] | null> {
  try { return normaliseCatalogue(await readCatalogue()).filter(bottle => bottle.kind !== 'rtd') } catch { return null }
}

// Gate first (both list and detail); the eligible-only listing renders after.
export default async function FindMyDrinkPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const eligible = await eligibilityAccepted()
  if (!eligible) return <Gate />
  const params = await searchParams
  const { filters, cursor } = parseInput(params)
  const discovery = parseDiscovery(params)
  const outcome = await loadRecipes()
  if (discovery.mode === 'random' && outcome.state === 'ok' && outcome.data.length > 0) {
    return <Shell><Guided key={discoveryHref(discovery)} rows={outcome.data} initial={discovery} /></Shell>
  }
  // Find a Drink (tools redesign): the four questions and live results. Bottles are optional: if the catalogue is down,
  // the spirit and cocktail ideas still show and the bottle grid says so.
  if (discovery.mode !== 'browse' && outcome.state === 'ok' && outcome.data.length > 0) {
    const bottles = await readBottles()
    return <Shell><Finder rows={outcome.data} bottles={bottles} initial={discovery} /></Shell>
  }
  const data = outcome.state === 'ok' ? buildListingData(outcome.data, filters, cursor) : null
  return <Browse eligibleRows={outcome.state === 'ok' ? outcome.data : []} state={outcome.state} data={data} filters={filters} cursor={cursor} />
}
