import 'server-only'

// ---------------------------------------------------------------------------
// Recipe reads over public.drinks (Supabase REST, existing anonymous key).
//
// Fail-closed design: the frozen eligible-publication predicate (plan §1/§9/§16)
// — status='published' AND editorial_ready=true AND alcohol_type IN
// ('cocktail','mocktail') AND non-null source_name/source_url/source_retrieved_at/
// content_origin — is applied identically to every read. The listing read also
// feeds the filter counts and curated rails; detail and related reads repeat the
// identical filter. Rows failing the predicate in full are never served; if any
// returned row fails the re-checked predicate, the whole read fails closed.
//
// `editorial_ready` is introduced by a director-owned migration that is not part
// of this change. Until it is applied, PostgREST rejects any filter/select
// referencing it with HTTP 42703; that specific error maps to the 'not-ready'
// state, which the UI renders as the honest empty state ("nothing published
// yet") because no row can be editorially approved before the flag exists.
// Every other error (network, environment, unexpected payloads) maps to the
// 'unavailable' state with a clear message — never legacy or draft rows.
// ---------------------------------------------------------------------------

const ROW_LIMIT = 2000 // reviewed-catalogue design bound; beyond it reads fail closed
const PAGE_SIZE = 24

// The single source of the eligible predicate, appended to every drinks read.
const ELIGIBLE_PARAMS: readonly (readonly [string, string])[] = [
  ['status', 'eq.published'],
  ['editorial_ready', 'is.true'],
  ['alcohol_type', 'in.(cocktail,mocktail)'],
  ['source_name', 'not.is.null'],
  ['source_url', 'not.is.null'],
  ['source_retrieved_at', 'not.is.null'],
  ['content_origin', 'not.is.null'],
  ['recipe_quality_issues', 'eq.{}'],
]

const COLUMNS =
  'id,name,status,editorial_ready,description,category,base_spirit,alcohol_type,ingredients,preparation,ingredient_details,recipe_yield,servings,preparation_method,recipe_quality_issues,glassware,garnish,abv,prep_time_min,ice_type,allergens,has_caffeine,featured,source_name,source_url,source_retrieved_at,content_origin,image_url,image_alt'

export type IngredientDetail = { raw: string; name: string | null; amount: string | null; unit: string | null }
export type PreparationMethod = 'shake' | 'stir' | 'blend' | 'build' | 'batch' | 'hot'

export type RecipeRow = {
  id: string
  name: string
  description: string | null
  category: string | null
  baseSpirit: string | null
  alcoholType: 'cocktail' | 'mocktail'
  ingredients: string[]
  preparation: string[]
  ingredientDetails: IngredientDetail[] | null
  recipeYield: string | null
  servings: number | null
  preparationMethod: PreparationMethod | null
  prepTimeMin: number | null
  iceType: string | null
  allergens: string[] | null
  hasCaffeine: boolean | null
  glassware: string | null
  garnish: string | null
  abv: number | null
  featured: boolean
  sourceName: string
  sourceUrl: string
  sourceRetrievedAt: string
  contentOrigin: string
  imageUrl: string | null
  imageAlt: string | null
}

export type ReadOutcome<T> =
  | { state: 'ok'; data: T }
  | { state: 'not-ready' }
  | { state: 'unavailable' }

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// The optional stored original image: null/absent is unknown; a present value
// must be a non-empty https URL of at most 2048 characters or the row fails
// closed. Relative and http values never pass — presentation then falls back
// to the hand-authored artwork.
function isHttpsImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

// Re-check the frozen eligible predicate in full on every returned row (defense
// in depth on top of the REST filter). Returns null for any failing row.
function toRecipeRow(value: unknown): RecipeRow | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  if (r.status !== 'published' || r.editorial_ready !== true) return null
  if (r.alcohol_type !== 'cocktail' && r.alcohol_type !== 'mocktail') return null
  if (!isText(r.id) || !isText(r.name)) return null
  if (!isText(r.source_name) || !isText(r.source_url) || !isText(r.source_retrieved_at) || !isText(r.content_origin)) return null
  if (!Array.isArray(r.ingredients) || !r.ingredients.every(isText)) return null
  if (!Array.isArray(r.preparation) || !r.preparation.every(isText)) return null
  if (r.ingredients.length === 0 || r.preparation.length === 0) return null
  if (!Array.isArray(r.recipe_quality_issues) || r.recipe_quality_issues.length !== 0) return null
  if (r.ingredient_details !== null && (!Array.isArray(r.ingredient_details) || !r.ingredient_details.every(isIngredientDetail))) return null
  if (r.recipe_yield !== null && typeof r.recipe_yield !== 'string') return null
  if (r.servings !== null && (typeof r.servings !== 'number' || !Number.isInteger(r.servings) || r.servings <= 0)) return null
  if (r.preparation_method !== null && !['shake', 'stir', 'blend', 'build', 'batch', 'hot'].includes(String(r.preparation_method))) return null
  if (r.prep_time_min !== null && (typeof r.prep_time_min !== 'number' || !Number.isInteger(r.prep_time_min) || r.prep_time_min < 0)) return null
  if (r.ice_type !== null && typeof r.ice_type !== 'string') return null
  if (r.allergens !== null && (!Array.isArray(r.allergens) || !r.allergens.every(isText))) return null
  if (r.has_caffeine !== null && typeof r.has_caffeine !== 'boolean') return null
  if (r.description !== null && typeof r.description !== 'string') return null
  if (r.base_spirit !== null && typeof r.base_spirit !== 'string') return null
  if (r.category !== null && typeof r.category !== 'string') return null
  if (r.glassware !== null && typeof r.glassware !== 'string') return null
  if (r.garnish !== null && typeof r.garnish !== 'string') return null
  if (r.abv !== null && (typeof r.abv !== 'number' || !Number.isFinite(r.abv) || r.abv < 0 || r.abv > 100)) return null
  if (r.image_url !== null && r.image_url !== undefined && !isHttpsImageUrl(r.image_url)) return null
  if (r.image_alt !== null && r.image_alt !== undefined && typeof r.image_alt !== 'string') return null
  if (typeof r.featured !== 'boolean') return null
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    baseSpirit: r.base_spirit,
    alcoholType: r.alcohol_type,
    ingredients: r.ingredients,
    preparation: r.preparation,
    ingredientDetails: r.ingredient_details,
    recipeYield: r.recipe_yield,
    servings: r.servings,
    preparationMethod: r.preparation_method as PreparationMethod | null,
    prepTimeMin: r.prep_time_min,
    iceType: r.ice_type,
    allergens: r.allergens,
    hasCaffeine: r.has_caffeine,
    glassware: r.glassware,
    garnish: r.garnish,
    abv: r.abv,
    featured: r.featured,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    sourceRetrievedAt: r.source_retrieved_at,
    contentOrigin: r.content_origin,
    imageUrl: typeof r.image_url === 'string' ? r.image_url : null,
    imageAlt: typeof r.image_alt === 'string' ? r.image_alt : null,
  }
}

function isIngredientDetail(value: unknown): value is IngredientDetail {
  if (typeof value !== 'object' || value === null) return false
  const detail = value as Record<string, unknown>
  return isText(detail.raw) && (detail.name === null || typeof detail.name === 'string') &&
    (detail.amount === null || (typeof detail.amount === 'string' && detail.amount.trim().length > 0)) &&
    (detail.unit === null || typeof detail.unit === 'string')
}

// PostgREST rejects filters/selects on a column that is absent from its schema
// cache with 42703 (undefined column) or a PGRST204 message naming the column.
// Before the director-owned editorial migration is applied, that is the expected
// response to the eligible predicate — mapped to 'not-ready', not to an outage.
function isNotReadyError(payload: { code?: string; message?: string } | null): boolean {
  if (!payload) return false
  return payload.code === '42703' || /editorial_ready/.test(payload.message ?? '')
}

// Parse the exact total from a `Content-Range: a-b/total` header (Prefer:
// count=exact). Null when the count is unknown — callers then fail closed.
function parseCountTotal(contentRange: string | null): number | null {
  if (!contentRange) return null
  const total = contentRange.split('/')[1]
  if (!total || total === '*') return null
  const parsed = Number(total)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

// One bounded, complete read of every drinks row matching `filters` plus the
// identical eligible filter. Fail closed on: missing credentials, network
// errors, unexpected payloads, an eligible total above the design bound, a
// truncated read, or any row failing the re-checked predicate.
async function readDrinks(filters: Record<string, string>): Promise<ReadOutcome<RecipeRow[]>> {
  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!base || !key) return { state: 'unavailable' }
  const query = new URLSearchParams({ select: COLUMNS, ...filters })
  for (const [name, value] of ELIGIBLE_PARAMS) query.append(name, value)
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/drinks?${query.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', Prefer: 'count=exact' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
      if (isNotReadyError(payload)) return { state: 'not-ready' }
      console.error(`[find-my-drink] drinks read failed: HTTP ${response.status}${payload?.code ? ` ${payload.code}` : ''}`)
      return { state: 'unavailable' }
    }
    const total = parseCountTotal(response.headers.get('content-range'))
    const rows = (await response.json()) as unknown
    if (!Array.isArray(rows) || total === null) {
      console.error('[find-my-drink] drinks read returned an unexpected payload; failing closed')
      return { state: 'unavailable' }
    }
    if (total > ROW_LIMIT) {
      console.error('[find-my-drink] eligible catalogue exceeds the reviewed-catalogue design bound; failing closed')
      return { state: 'unavailable' }
    }
    if (total > rows.length) {
      // Incomplete read (e.g. a server-side row cap): a partial catalogue would
      // misstate counts and rails, so fail closed instead.
      console.error('[find-my-drink] drinks read was truncated; failing closed')
      return { state: 'unavailable' }
    }
    const eligible: RecipeRow[] = []
    for (const row of rows) {
      const typed = toRecipeRow(row)
      if (!typed) {
        console.error('[find-my-drink] drinks read returned a row failing the eligible predicate; failing closed')
        return { state: 'unavailable' }
      }
      eligible.push(typed)
    }
    return { state: 'ok', data: eligible }
  } catch (error) {
    console.error('[find-my-drink] drinks read failed', error)
    return { state: 'unavailable' }
  }
}

// Listing read: every eligible row, bounded. Also feeds the filter counts and
// the curated rails, so all three come from this one identical eligible-filtered
// read rather than separate count queries.
export async function loadRecipes(): Promise<ReadOutcome<RecipeRow[]>> {
  return readDrinks({ limit: String(ROW_LIMIT + 1) })
}

// Detail read: a single eligible id, else null (verifiably ineligible → 404).
export async function loadRecipe(id: string): Promise<ReadOutcome<RecipeRow | null>> {
  const outcome = await readDrinks({ id: `eq.${id}`, limit: '1' })
  if (outcome.state !== 'ok') return outcome
  return { state: 'ok', data: outcome.data.length > 0 ? outcome.data[0] : null }
}

// Related read: same base spirit (cocktails) or the mocktail category
// (mocktails), from the stored columns only — never inferred. Eligible rows
// only, excluding the current recipe, modest count.
export async function loadRelated(recipe: RecipeRow, limit = 4): Promise<ReadOutcome<RecipeRow[]>> {
  const key = recipe.baseSpirit !== null ? 'base_spirit' : 'alcohol_type'
  const value = recipe.baseSpirit ?? recipe.alcoholType
  const outcome = await readDrinks({
    [key]: `eq.${value}`,
    id: `neq.${recipe.id}`,
    limit: String(ROW_LIMIT + 1),
  })
  if (outcome.state !== 'ok') return outcome
  return { state: 'ok', data: outcome.data.slice(0, limit) }
}

// ---------------------------------------------------------------------------
// Listing assembly: search, filters, counts and keyset pagination over the
// eligible-filtered rows.
// ---------------------------------------------------------------------------

export type ListingFilters = {
  q: string
  types: string[] // base spirits, OR within this facet
  drinkType: 'all' | 'cocktail' | 'mocktail'
  method: PreparationMethod | null
  maxIngredients: number | null
  picks?: string[] // restored choices; always intersected with the filtered eligible pool
}

export type ListingData = {
  pageRows: RecipeRow[]
  recommendations: RecipeRow[]
  matchingRows: RecipeRow[]
  shownTotal: number
  total: number
  eligibleTotal: number
  spiritChips: { name: string; count: number }[]
  typeChips: { value: ListingFilters['drinkType']; count: number }[]
  methodChips: { name: PreparationMethod; count: number }[]
  maxChips: { value: 3 | 5; count: number }[]
  nextCursor: { name: string; id: string } | null
}

function matches(row: RecipeRow, filters: ListingFilters): boolean {
  const needle = filters.q.toLowerCase()
  return (!needle || row.name.toLowerCase().includes(needle) || row.ingredients.some(ingredient => ingredient.toLowerCase().includes(needle))) &&
    (filters.drinkType === 'all' || row.alcoholType === filters.drinkType) &&
    (filters.types.length === 0 || filters.types.includes(row.baseSpirit ?? '')) &&
    (filters.method === null || row.preparationMethod === filters.method) &&
    (filters.maxIngredients === null || row.ingredients.length <= filters.maxIngredients)
}

function comparePair(nameA: string, idA: string, nameB: string, idB: string): number {
  const byName = nameA.localeCompare(nameB)
  return byName || (idA < idB ? -1 : idA > idB ? 1 : 0)
}

export function buildListingData(all: RecipeRow[], filters: ListingFilters, cursor: { name: string; id: string } | null): ListingData {
  const matchingRows = all.filter(row => matches(row, filters)).sort((a, b) => comparePair(a.name, a.id, b.name, b.id))
  const restored = [...new Set(filters.picks ?? [])].map(id => matchingRows.find(row => row.id === id)).filter((row): row is RecipeRow => row !== undefined).slice(0, 3)
  const choices = restored.length ? restored : [...matchingRows].sort((a, b) => Number(b.featured) - Number(a.featured) || comparePair(a.name, a.id, b.name, b.id)).slice(0, 3)
  const chosen = new Set(choices.map(row => row.id))
  const browseRows = matchingRows.filter(row => !chosen.has(row.id))
  let start = 0
  if (cursor) {
    const index = browseRows.findIndex(row => comparePair(row.name, row.id, cursor.name, cursor.id) > 0)
    start = index === -1 ? browseRows.length : index
  }
  const pageRows = browseRows.slice(start, start + PAGE_SIZE)
  const shownTotal = choices.length + start + pageRows.length
  const last = pageRows.at(-1)
  const nextCursor = last && shownTotal < matchingRows.length ? { name: last.name, id: last.id } : null
  const countWith = (overrides: Partial<ListingFilters>) => all.filter(row => matches(row, { ...filters, ...overrides })).length
  const spirits = [...new Set(all.map(row => row.baseSpirit).filter((spirit): spirit is string => spirit !== null))].sort()
  const methods = [...new Set(all.map(row => row.preparationMethod).filter((method): method is PreparationMethod => method !== null))].sort()
  return {
    pageRows, recommendations: cursor ? [] : choices, matchingRows, shownTotal,
    total: matchingRows.length, eligibleTotal: all.length,
    spiritChips: spirits.map(name => ({ name, count: countWith({ types: filters.types.includes(name) ? filters.types : [...filters.types, name] }) })),
    typeChips: (['all', 'mocktail', 'cocktail'] as const).map(value => ({ value, count: countWith({ drinkType: value }) })),
    methodChips: methods.map(name => ({ name, count: countWith({ method: name }) })),
    maxChips: ([3, 5] as const).map(value => ({ value, count: countWith({ maxIngredients: value }) })),
    nextCursor,
  }
}
