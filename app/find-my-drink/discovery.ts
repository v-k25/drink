import audit from './discovery-audit.json'
import { pantryMatches, pantrySignature, reviewedPantry, type PantryRequirement } from './pantry'
import type { PreparationMethod, RecipeRow } from './queries'
import { FEELS, QUIZ_OCCASIONS, SERVES, SPIRITS, type Feel, type QuizOccasion, type Serve, type Spirit } from './spirit'

export const TASTES = ['citrusy', 'fruity', 'sweet', 'bitter', 'herbal', 'creamy'] as const
export type Taste = typeof TASTES[number]
export const BASES = ['gin', 'vodka', 'rum', 'light rum', 'white rum', 'whisky', 'bourbon', 'blended whisky', 'brandy', 'cognac', 'tequila', 'white tequila', 'champagne', 'beer'] as const
export type Base = typeof BASES[number]
export const OCCASIONS = ['casual-get-together', 'after-dinner'] as const
export type Occasion = typeof OCCASIONS[number]
export type DrinkType = 'cocktail' | 'mocktail' | 'mixed'
export type DiscoveryReview = {
  recipeId: string; sourceSignature: string; version: number; reviewedAt: string
  tastes: Taste[]; primaryBase: Base | null; additionalAlcohol: string[]; tasteRationale: string
  occasions: { tag: Occasion; rationale: string; approved: boolean }[]
  nonAlcoholicPath: 'not-applicable' | 'reviewed' | 'unresolved'; pathNote: string | null
  pantryReview: string | null
}
export type Preferences = {
  type: DrinkType | null; tastes: Taste[]; cocktailTastes: Taste[] | null; mocktailTastes: Taste[] | null
  base: Base | null; occasion: Occasion | null; method: PreparationMethod | null; q: string; onlyIngredients: boolean
}
export const GUIDED_STAGES = ['type', 'taste', 'feel', 'serve', 'occasion', 'results'] as const
export type GuidedStage = typeof GUIDED_STAGES[number]
export type DiscoveryState = Preferences & {
  mode: 'entry' | 'guided' | 'random' | 'browse'; stage: GuidedStage; pick: string | null; randomType: 'cocktail' | 'mocktail' | null
  // Spirit quiz answers (Guide me). `occasion` above keeps only the reviewed recipe occasions; `quizOccasion` also allows party.
  // `spirit` is set when someone switches to the runner-up instead of the best match.
  feel: Feel | null; serve: Serve | null; quizOccasion: QuizOccasion | null; spirit: Spirit | null
}
const methods = ['shake', 'stir', 'blend', 'build', 'batch', 'hot'] as const
const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v
const tasteList = (v: string | undefined): Taste[] => [...new Set((v ?? '').slice(0,100).split(',').filter((t): t is Taste => TASTES.includes(t as Taste)))].slice(0,2)
export function parseDiscovery(params: Record<string, string | string[] | undefined>): DiscoveryState {
  const mode = first(params.mode)
  const rawType = first(params.drink)
  const type = rawType === 'cocktail' || rawType === 'mocktail' || rawType === 'mixed' ? rawType : null
  const rawBase = first(params.base)?.toLowerCase().replace('whiskey','whisky')
  const base = rawBase === 'wine' ? 'champagne' : BASES.includes(rawBase as Base) ? rawBase as Base : null
  const method = first(params.method)
  const occasion = first(params.occasion)
  const pick = first(params.pick)
  const randomType = first(params.randomDrink)
  const stage = first(params.stage)
  const feel = first(params.feel), serve = first(params.serve), spirit = first(params.spirit)
  return {
    mode: mode === 'guided' || mode === 'random' || mode === 'browse' ? mode : ['q','drink','type','method','max','pick','cursor'].some(k => params[k] !== undefined) ? 'browse' : 'entry',
    randomType: randomType === 'cocktail' || randomType === 'mocktail' ? randomType : null,
    type, tastes: tasteList(first(params.taste)),
    cocktailTastes: params.cocktailTaste === undefined ? null : tasteList(first(params.cocktailTaste)),
    mocktailTastes: params.mocktailTaste === undefined ? null : tasteList(first(params.mocktailTaste)),
    base: type === 'mocktail' ? null : base,
    method: methods.includes(method as PreparationMethod) ? method as PreparationMethod : null,
    occasion: OCCASIONS.includes(occasion as Occasion) ? occasion as Occasion : null,
    quizOccasion: QUIZ_OCCASIONS.includes(occasion as QuizOccasion) ? occasion as QuizOccasion : null,
    feel: FEELS.includes(feel as Feel) ? feel as Feel : null,
    serve: SERVES.includes(serve as Serve) ? serve as Serve : null,
    spirit: type !== 'mocktail' && SPIRITS.includes(spirit as Spirit) ? spirit as Spirit : null,
    q: (first(params.q) ?? '').slice(0,120), onlyIngredients: first(params.ingredients) === 'only',
    stage: !type || stage === 'type' ? 'type' : GUIDED_STAGES.includes(stage as GuidedStage) ? stage as GuidedStage : 'results',
    pick: pick && /^[A-Za-z0-9._~-]{1,200}$/.test(pick) ? pick : null,
  }
}
export function discoveryHref(state: DiscoveryState): string {
  const p = new URLSearchParams({ mode: state.mode })
  if (state.type) p.set('drink', state.type)
  if (state.mode === 'random' && state.randomType) p.set('randomDrink', state.randomType)
  if (state.tastes.length) p.set('taste', state.tastes.join(','))
  if (state.cocktailTastes !== null) p.set('cocktailTaste', state.cocktailTastes.join(','))
  if (state.mocktailTastes !== null) p.set('mocktailTaste', state.mocktailTastes.join(','))
  if (state.base && state.type !== 'mocktail') p.set('base', state.base)
  if (state.quizOccasion ?? state.occasion) p.set('occasion', (state.quizOccasion ?? state.occasion)!)
  if (state.feel) p.set('feel', state.feel)
  if (state.serve) p.set('serve', state.serve)
  if (state.spirit && state.type !== 'mocktail') p.set('spirit', state.spirit)
  if (state.method) p.set('method', state.method)
  if (state.q) p.set('q', state.q)
  if (state.onlyIngredients) p.set('ingredients', 'only')
  if (state.stage !== 'results') p.set('stage', state.stage)
  if (state.mode === 'random' && state.pick) p.set('pick', state.pick)
  return '/find-my-drink?' + p.toString()
}
export function discoverySignature(row: RecipeRow): string {
  return JSON.stringify([pantrySignature(row), row.baseSpirit])
}
// Reviews attach claims to current eligible rows; they never establish publication.
export function reviewedDiscovery(row: RecipeRow, records: DiscoveryReview[] = audit as DiscoveryReview[]): DiscoveryReview | null {
  const record = records.find(r => r.recipeId === row.id)
  return record && record.version === 1 && record.sourceSignature === discoverySignature(row) &&
    record.tastes.length <= 3 && record.tastes.every(t => TASTES.includes(t)) &&
    record.tasteRationale.trim() && (record.primaryBase === null || BASES.includes(record.primaryBase)) &&
    record.occasions.every(o => OCCASIONS.includes(o.tag) && o.rationale.trim()) ? record : null
}
export function recommendationPool(rows: RecipeRow[], type: 'cocktail' | 'mocktail', records: DiscoveryReview[] = audit as DiscoveryReview[]): RecipeRow[] {
  return rows.filter(row => row.alcoholType === type && (type === 'cocktail' || reviewedDiscovery(row, records)?.nonAlcoholicPath === 'reviewed'))
}
export function matchesBase(review: DiscoveryReview | null, base: Base): boolean {
  const primary = review?.primaryBase
  return primary === base || base === 'rum' && (primary === 'light rum' || primary === 'white rum') ||
    base === 'whisky' && (primary === 'bourbon' || primary === 'blended whisky') ||
    base === 'brandy' && primary === 'cognac' || base === 'tequila' && primary === 'white tequila'
}
export type Reason = { code: 'taste'; tags: Taste[] } | { code: 'base'; base: Base } | { code: 'occasion'; occasion: Occasion }
export type RankedRecipe = {
  row: RecipeRow; review: DiscoveryReview | null; score: number; reasons: Reason[]
  tier: 'exact' | 'one-away' | 'other'; missing: PantryRequirement | null; pantryReviewed: boolean
}
export function rankRecipes(rows: RecipeRow[], preferences: Preferences, type: 'cocktail' | 'mocktail', selected: ReadonlySet<string> = new Set(), records: DiscoveryReview[] = audit as DiscoveryReview[]): RankedRecipe[] {
  const tastes = (type === 'cocktail' ? preferences.cocktailTastes : preferences.mocktailTastes) ?? preferences.tastes
  const pool = recommendationPool(rows, type, records).filter(row =>
    (!preferences.base || type === 'mocktail' || matchesBase(reviewedDiscovery(row, records), preferences.base)) &&
    (!preferences.method || row.preparationMethod === preferences.method) &&
    (!preferences.q || [row.name, ...row.ingredients].some(text => text.toLowerCase().includes(preferences.q.toLowerCase()))))
  const pantry = pantryMatches(pool, selected)
  const exact = new Set(pantry.exact.map(r => r.row.id))
  const near = new Map(pantry.oneAway.map(r => [r.row.id, r.missing]))
  const ranked = pool.map(row => {
    const review = reviewedDiscovery(row, records)
    const matched = tastes.filter(t => review?.tastes.includes(t))
    const occasion = preferences.occasion && review?.occasions.some(o => o.approved && o.tag === preferences.occasion) ? preferences.occasion : null
    const reasons: Reason[] = []
    if (matched.length) reasons.push({ code: 'taste', tags: matched })
    if (preferences.base && type === 'cocktail') reasons.push({ code: 'base', base: preferences.base })
    if (occasion) reasons.push({ code: 'occasion', occasion })
    return { row, review, score: 10 * matched.length + (occasion ? 2 : 0), reasons,
      tier: exact.has(row.id) ? 'exact' as const : near.has(row.id) ? 'one-away' as const : 'other' as const,
      missing: near.get(row.id) ?? null, pantryReviewed: reviewedPantry(row) !== null }
  }).filter(item => !preferences.onlyIngredients || item.tier === 'exact')
  const order = { exact: 0, 'one-away': 1, other: 2 }
  return ranked.sort((a,b) => order[a.tier] - order[b.tier] || b.score - a.score ||
    Number(b.row.featured) - Number(a.row.featured) || a.row.name.localeCompare(b.row.name) || a.row.id.localeCompare(b.row.id))
}
export function discoveryCoverage(rows: RecipeRow[], preferences: Preferences, selected: ReadonlySet<string> = new Set()) {
  const types = preferences.type === 'mixed' ? ['cocktail','mocktail'] as const : preferences.type ? [preferences.type] : []
  const unfiltered = { ...preferences, base: null, method: null, occasion: null }
  const pool = types.flatMap(type => rankRecipes(rows, unfiltered, type, selected))
  return {
    tastes: TASTES.filter(t => pool.some(item => item.review?.tastes.includes(t))),
    bases: BASES.filter(base => base !== 'beer').map(base => ({ base, count: pool.filter(item => item.row.alcoholType === 'cocktail' && matchesBase(item.review,base) && (!preferences.method || item.row.preparationMethod === preferences.method)).length })).filter(item => item.count > 0),
    methods: methods.filter(method => pool.some(item => item.row.preparationMethod === method && (!preferences.base || item.row.alcoholType === 'mocktail' || matchesBase(item.review,preferences.base)))),
    occasions: OCCASIONS.filter(tag => pool.some(item => item.review?.occasions.some(o => o.approved && o.tag === tag))),
  }
}
export function reasonText(reason: Reason): string {
  if (reason.code === 'taste') return 'Matches your ' + reason.tags.join(' and ') + ' preference.'
  if (reason.code === 'base') return 'Uses your chosen ' + reason.base + ' base.'
  return reason.occasion === 'after-dinner' ? 'Reviewed for after dinner.' : 'Reviewed for a casual get-together.'
}
