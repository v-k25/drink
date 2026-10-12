'use server'

import { eligibilityAccepted, verifiedSession } from '../party-planner/session'
import { loadRecipe } from './queries'

type Result = { ok: true } | { ok: false; error: string; unauthorized?: boolean }
const generic = 'Unable to complete that request.'
const idOk = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0 && id.length <= 200
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const rest = (path: string, init: RequestInit, token: string) => fetch(`${process.env.SUPABASE_URL ?? ''}/rest/v1/${path}`, { ...init, headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store', signal: AbortSignal.timeout(10000) })
const ensureProfile = (id: string, token: string) => rest('profiles', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id }) }, token)
const auth = async (id: unknown): Promise<{ id: string; token: string } | Result> => {
  if (!idOk(id) || !(await eligibilityAccepted())) return { ok: false, error: 'Recipe is unavailable.' }
  const session = await verifiedSession()
  if (!session) return { ok: false, error: 'Sign in to continue.', unauthorized: true }
  const recipe = await loadRecipe(id)
  if (recipe.state !== 'ok' || !recipe.data) return { ok: false, error: 'Recipe is unavailable.' }
  try { const profile = await ensureProfile(session.user.id, session.access); if (!profile.ok && profile.status !== 409) return { ok: false, error: 'Unable to complete that request.' } } catch { return { ok: false, error: 'Unable to complete that request.' } }
  return { id, token: session.access }
}
const done = (response: Response): Result => response.ok ? { ok: true } : { ok: false, error: generic }

export async function setRecipeSaved(id: string, saved: boolean): Promise<Result> {
  if (typeof saved !== 'boolean') return { ok: false, error: 'Save state is invalid.' }
  const checked = await auth(id); if ('ok' in checked) return checked
  try {
    if (saved) {
      const response = await rest('saved_drinks', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ drink_id: checked.id }) }, checked.token)
      return done(response)
    }
    return done(await rest(`saved_drinks?drink_id=eq.${encodeURIComponent(checked.id)}`, { method: 'DELETE' }, checked.token))
  } catch { return { ok: false, error: generic } }
}

export async function updateRecipeNote(id: string, note: string): Promise<Result> {
  const checked = await auth(id); if ('ok' in checked) return checked
  if (typeof note !== 'string' || note.length > 500) return { ok: false, error: 'Note must be 500 characters or fewer.' }
  try { const response = await rest(`saved_drinks?drink_id=eq.${encodeURIComponent(checked.id)}&select=drink_id,note`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ note }) }, checked.token); if (!response.ok) return { ok: false, error: generic }; const rows = await response.json().catch(() => null) as unknown; return Array.isArray(rows) && rows.length === 1 ? { ok: true } : { ok: false, error: 'Save the recipe before adding a note.' } } catch { return { ok: false, error: generic } }
}

export async function setRecipeLiked(id: string, liked: boolean): Promise<Result> {
  if (typeof liked !== 'boolean') return { ok: false, error: 'Like state is invalid.' }
  const checked = await auth(id); if ('ok' in checked) return checked
  try { return done(liked ? await rest('drink_likes', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ drink_id: checked.id }) }, checked.token) : await rest(`drink_likes?drink_id=eq.${encodeURIComponent(checked.id)}`, { method: 'DELETE' }, checked.token)) } catch { return { ok: false, error: generic } }
}

export async function submitRecipeReview(id: string, rating: number, body: string): Promise<Result> {
  const checked = await auth(id); if ('ok' in checked) return checked
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text(body, 2000)) return { ok: false, error: 'Enter a rating and review of 2,000 characters or fewer.' }
  try { const payload = JSON.stringify({ drink_id: checked.id, rating, body: body.trim() }); const update = await rest(`drink_reviews?drink_id=eq.${encodeURIComponent(checked.id)}&select=rating,body,moderation_status`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ rating, body: body.trim() }) }, checked.token); if (!update.ok) return { ok: false, error: generic }; const rows = await update.json().catch(() => null) as unknown; if (Array.isArray(rows) && rows.length === 1) return { ok: true }; if (Array.isArray(rows) && rows.length === 0) return done(await rest('drink_reviews', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: payload }, checked.token)); return { ok: false, error: generic } } catch { return { ok: false, error: generic } }
}

export async function deleteRecipeReview(id: string): Promise<Result> { const checked = await auth(id); if ('ok' in checked) return checked; try { return done(await rest(`drink_reviews?drink_id=eq.${encodeURIComponent(checked.id)}`, { method: 'DELETE' }, checked.token)) } catch { return { ok: false, error: generic } } }

export async function submitRecipeComment(id: string, kind: 'comment' | 'question' | 'tip', body: string): Promise<Result> {
  const checked = await auth(id); if ('ok' in checked) return checked
  if (!['comment', 'question', 'tip'].includes(kind) || !text(body, 2000)) return { ok: false, error: 'Enter a valid comment of 2,000 characters or fewer.' }
  try { return done(await rest('drink_comments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ drink_id: checked.id, kind, body: body.trim() }) }, checked.token)) } catch { return { ok: false, error: generic } }
}

export async function deleteRecipeComment(id: string, commentId: string): Promise<Result> {
  const checked = await auth(id); if ('ok' in checked) return checked
  if (!idOk(commentId)) return { ok: false, error: 'Comment is invalid.' }
  try { return done(await rest(`drink_comments?id=eq.${encodeURIComponent(commentId)}&drink_id=eq.${encodeURIComponent(checked.id)}`, { method: 'DELETE' }, checked.token)) } catch { return { ok: false, error: generic } }
}
