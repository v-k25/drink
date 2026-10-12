import 'server-only'

import type { Product } from './model'

const EXPECTED_COUNT = 1311
const PAGE_SIZE = 1000
const GENERIC_ERROR = 'Unable to load the Jaipur catalogue.'
const TABLE_PATH = '/rest/v1/planner_products'
const SELECT = 'id,category,name,brand,size_ml,price_paise'
const EXPECTED_ORIGIN = 'https://ojptrukzildmkilwponx.supabase.co'
const EXPECTED_CATEGORY_COUNTS = new Map([
  ['Beers', 107], ['Blended Scotch', 51], ['Brandy', 22], ['Champagne', 10], ['Gin', 84], ['Liqueurs', 38],
  ['Made in India Whisky', 228], ['Ready to Drink', 23], ['Red Wine', 168], ['Rose Wine', 27], ['Rum', 92],
  ['Sake', 7], ['Single Malts', 88], ['Sparkling Wine', 39], ['Tequila', 47], ['Vodka', 152], ['White Wine', 92], ['World Whisky', 36],
])

type DatabaseProduct = {
  id: unknown
  category: unknown
  name: unknown
  brand: unknown
  size_ml: unknown
  price_paise: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0

function settings(): { url: string; secret: string } {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret?.startsWith('sb_secret_')) throw new Error(GENERIC_ERROR)
  try {
    const parsed = new URL(url)
    if (parsed.origin !== EXPECTED_ORIGIN || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error(GENERIC_ERROR)
  } catch {
    throw new Error(GENERIC_ERROR)
  }
  return { url, secret }
}

function contentRange(value: string, start: number, count: number): { total: number; next: number } {
  const match = /^(\d+)-(\d+)\/(\d+)$/.exec(value)
  if (!match) throw new Error(GENERIC_ERROR)
  const first = Number(match[1]); const last = Number(match[2]); const total = Number(match[3])
  if (!Number.isSafeInteger(total) || total !== EXPECTED_COUNT || first !== start || last - first + 1 !== count) throw new Error(GENERIC_ERROR)
  return { total, next: last + 1 }
}

function product(row: unknown): Product {
  if (!isRecord(row) || Object.keys(row).length !== 6
    || !['id', 'category', 'name', 'brand', 'size_ml', 'price_paise'].every((key) => Object.prototype.hasOwnProperty.call(row, key))
    || !isText(row.id) || !isText(row.category) || !isText(row.name) || !isText(row.brand)
    || !isPositiveInteger(row.size_ml) || !isPositiveInteger(row.price_paise)) throw new Error(GENERIC_ERROR)
  return { id: row.id, category: row.category, name: row.name, brand: row.brand, sizeMl: row.size_ml, pricePaise: row.price_paise }
}

export async function readCatalogue(): Promise<Product[]> {
  try {
    const { url, secret } = settings()
    const products: Product[] = []
    const ids = new Set<string>()
    const categoryCounts = new Map<string, number>()
    let start = 0
    let total: number | null = null
    let previousId = ''
    while (products.length < EXPECTED_COUNT) {
      const response = await fetch(`${url}${TABLE_PATH}?select=${SELECT}&order=id.asc`, {
        cache: 'no-store',
        headers: { apikey: secret, Prefer: 'count=exact', Range: `${start}-${start + PAGE_SIZE - 1}` },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      })
      if (response.status !== 200 && response.status !== 206) throw new Error(GENERIC_ERROR)
      const body: unknown = await response.json()
      if (!Array.isArray(body) || body.length === 0) throw new Error(GENERIC_ERROR)
      const range = contentRange(response.headers.get('content-range') ?? '', start, body.length)
      if (total !== null && total !== range.total) throw new Error(GENERIC_ERROR)
      total = range.total
      for (const row of body) {
        const parsed = product(row)
        if (ids.has(parsed.id) || (previousId && parsed.id <= previousId)) throw new Error(GENERIC_ERROR)
        ids.add(parsed.id); products.push(parsed); previousId = parsed.id
        categoryCounts.set(parsed.category, (categoryCounts.get(parsed.category) ?? 0) + 1)
      }
      if (products.length > EXPECTED_COUNT) throw new Error(GENERIC_ERROR)
      start = range.next
    }
    if (products.length !== EXPECTED_COUNT || ids.size !== EXPECTED_COUNT || total !== EXPECTED_COUNT
      || categoryCounts.size !== EXPECTED_CATEGORY_COUNTS.size
      || [...EXPECTED_CATEGORY_COUNTS].some(([category, count]) => categoryCounts.get(category) !== count)) throw new Error(GENERIC_ERROR)
    return products
  } catch {
    throw new Error(GENERIC_ERROR)
  }
}
