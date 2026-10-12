import 'server-only'

import { eligibilityAccepted, verifiedSession } from '../party-planner/session'
import { loadRecipe } from './queries'

export type CommunityState = {
  signedIn: boolean
  saved: boolean
  note: string
  liked: boolean
  review: { rating: number; body: string; moderationStatus: string } | null
  comments: Array<{ id: string; kind: 'comment' | 'question' | 'tip'; body: string; moderationStatus: string }>
  stats: { likes: number; reviews: number; averageRating: number | null }
  publicReviews: Array<{ id: string; rating: number; body: string }>
  publicComments: Array<{ id: string; kind: 'comment' | 'question' | 'tip'; body: string }>
}

const rest = (path: string, token?: string) => fetch(`${process.env.SUPABASE_URL ?? ''}/rest/v1/${path}`, {
  headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${token ?? process.env.SUPABASE_ANON_KEY ?? ''}`, Accept: 'application/json' },
  cache: 'no-store', signal: AbortSignal.timeout(10000),
})

const rows = async <T>(response: Response): Promise<T[]> => {
  if (!response.ok) throw new Error(`community read failed: ${response.status}`)
  const value = await response.json().catch(() => null) as unknown
  if (!Array.isArray(value)) throw new Error('community read returned invalid data')
  return value as T[]
}

async function loadCommunityUnsafe(drinkId: string): Promise<CommunityState | null> {
  if (!drinkId || !(await eligibilityAccepted())) return null
  const recipe = await loadRecipe(drinkId)
  if (recipe.state !== 'ok' || !recipe.data) return null
  const session = await verifiedSession()
  const token = session?.access
  const encoded = encodeURIComponent(drinkId)
  const [statsResponse, reviewsResponse, commentsResponse, savedResponse, likedResponse, ownReviewResponse, ownCommentsResponse] = await Promise.all([
    rest(`drink_social_stats?drink_id=eq.${encoded}&select=likes,reviews,average_rating`, token),
    rest(`drink_reviews_public?drink_id=eq.${encoded}&select=id,rating,body&order=created_at.desc&limit=100`, token),
    rest(`drink_comments_public?drink_id=eq.${encoded}&select=id,kind,body&order=created_at.asc&limit=100`, token),
    token ? rest(`saved_drinks?drink_id=eq.${encoded}&select=note`, token) : Promise.resolve(null),
    token ? rest(`drink_likes?drink_id=eq.${encoded}&select=drink_id`, token) : Promise.resolve(null),
    token ? rest(`drink_reviews?drink_id=eq.${encoded}&select=rating,body,moderation_status`, token) : Promise.resolve(null),
    token ? rest(`drink_comments?drink_id=eq.${encoded}&select=id,kind,body,moderation_status&order=created_at.asc&limit=100`, token) : Promise.resolve(null),
  ])
  const [stats, publicReviews, publicComments, saved, liked, ownReview, ownComments] = await Promise.all([
    statsResponse ? rows<{ likes: number; reviews: number; average_rating: number | null }>(statsResponse) : [],
    rows<{ id: string; rating: number; body: string }>(reviewsResponse),
    rows<{ id: string; kind: 'comment' | 'question' | 'tip'; body: string }>(commentsResponse),
    savedResponse ? rows<{ note: string }>(savedResponse) : [], likedResponse ? rows<{ drink_id: string }>(likedResponse) : [],
    ownReviewResponse ? rows<{ rating: number; body: string; moderation_status: string }>(ownReviewResponse) : [],
    ownCommentsResponse ? rows<{ id: string; kind: 'comment' | 'question' | 'tip'; body: string; moderation_status: string }>(ownCommentsResponse) : [],
  ])
  const aggregate = stats[0]
  if (stats.length > 1 || (aggregate && (!Number.isSafeInteger(aggregate.likes) || aggregate.likes < 0 || !Number.isSafeInteger(aggregate.reviews) || aggregate.reviews < 0 || (aggregate.average_rating !== null && (typeof aggregate.average_rating !== 'number' || !Number.isFinite(aggregate.average_rating) || aggregate.average_rating < 1 || aggregate.average_rating > 5))))) throw new Error('invalid community stats')
  if (saved.length > 1 || saved.some(row => row.note !== null && (typeof row.note !== 'string' || row.note.length > 500))) throw new Error('invalid private note')
  if (liked.length > 1 || liked.some(row => row.drink_id !== drinkId)) throw new Error('invalid like state')
  if (ownReview.length > 1 || ownReview.some(row => !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 || typeof row.body !== 'string' || !row.body.trim() || row.body.length > 2000 || !['pending', 'approved'].includes(row.moderation_status))) throw new Error('invalid own review')
  if (ownComments.some(row => typeof row.id !== 'string' || !['comment', 'question', 'tip'].includes(row.kind) || typeof row.body !== 'string' || !row.body.trim() || row.body.length > 2000 || !['pending', 'approved'].includes(row.moderation_status))) throw new Error('invalid own comment')
  if (publicReviews.some(row => typeof row.id !== 'string' || !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 || typeof row.body !== 'string' || row.body.length > 2000)) throw new Error('invalid public review')
  if (publicComments.some(row => typeof row.id !== 'string' || !['comment', 'question', 'tip'].includes(row.kind) || typeof row.body !== 'string' || row.body.length > 2000)) throw new Error('invalid public comment')
  return {
    signedIn: Boolean(session), saved: saved.length > 0, note: saved[0]?.note ?? '', liked: liked.length > 0,
    review: ownReview[0] ? { rating: ownReview[0].rating, body: ownReview[0].body, moderationStatus: ownReview[0].moderation_status } : null,
    comments: ownComments.map(comment => ({ ...comment, moderationStatus: comment.moderation_status })),
    stats: { likes: aggregate?.likes ?? 0, reviews: aggregate?.reviews ?? 0, averageRating: aggregate?.average_rating ?? null },
    publicReviews, publicComments,
  }
}

export async function loadCommunity(drinkId: string): Promise<CommunityState | null> {
  try { return await loadCommunityUnsafe(drinkId) } catch (error) { console.error('[find-my-drink] community read failed', error); return null }
}

export async function listSavedRecipes(): Promise<Array<{ drinkId: string; note: string }> | null> {
  const session = await verifiedSession()
  if (!session || !(await eligibilityAccepted())) return []
  try {
    const response = await rest('saved_drinks?select=drink_id,note,drinks!inner(id)&drinks.status=eq.published&drinks.editorial_ready=eq.true&drinks.alcohol_type=in.(cocktail,mocktail)&drinks.source_name=not.is.null&drinks.source_url=not.is.null&drinks.source_retrieved_at=not.is.null&drinks.content_origin=not.is.null&drinks.recipe_quality_issues=eq.{}&order=saved_at.desc', session.access)
    const values = await rows<{ drink_id: string; note: string | null }>(response)
    if (values.some(value => typeof value.drink_id !== 'string' || (value.note !== null && typeof value.note !== 'string') || (typeof value.note === 'string' && value.note.length > 500))) throw new Error('invalid saved recipe')
    return values.map(value => ({ drinkId: value.drink_id, note: value.note ?? '' }))
  } catch (error) { console.error('[find-my-drink] saved recipes read failed', error); return null }
}
