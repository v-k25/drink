import type { Metadata } from 'next'
import { eligibilityAccepted } from '../party-planner/session'
import Gate from './gate'
import Browse from './components/browse'
import { buildListingData, loadRecipes, type ListingFilters } from './queries'

export const metadata: Metadata = {
  title: 'Find a recipe | Socifer',
  description: 'Browse curated cocktail and mocktail recipes, with method and making help.',
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

// Gate first (both list and detail); the eligible-only listing renders after.
export default async function FindMyDrinkPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const eligible = await eligibilityAccepted()
  if (!eligible) return <Gate />
  const { filters, cursor } = parseInput(await searchParams)
  const outcome = await loadRecipes()
  const data = outcome.state === 'ok' ? buildListingData(outcome.data, filters, cursor) : null
  return <Browse eligibleRows={outcome.state === 'ok' ? outcome.data : []} state={outcome.state} data={data} filters={filters} cursor={cursor} />
}
