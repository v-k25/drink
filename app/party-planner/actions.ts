'use server'

import catalogue from './catalogue.json'
import { calculatePlan, type Plan, type Product } from './model'
import { authRequest, clearTokens, eligibilityAccepted, getSessionState, setEligibility, setTokens, verifiedSession, verifiedUser } from './session'

export type SavedPlan = { id: string; updated_at: string; snapshot: Plan }
type Result<T> = { ok: true } & T | { ok: false; error: string; unauthorized?: boolean }
const SUPABASE_PATH = '/rest/v1/party_plans'
const phonePattern = /^\+[1-9]\d{7,14}$/
const codePattern = /^\d{6}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const rest = async (path: string, init: RequestInit = {}, token?: string) => {
  const key = process.env.SUPABASE_ANON_KEY ?? ''
  return fetch(`${process.env.SUPABASE_URL ?? ''}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(10000), cache: 'no-store' })
}
const json = async <T>(response: Response): Promise<T | null> => { try { return await response.json() as T } catch { return null } }
const generic = 'Unable to complete that request.'
const sameJson = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameJson(v, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a); const bk = Object.keys(b)
    return ak.length === bk.length && ak.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameJson((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  }
  return false
}
const validSaved = (value: unknown): value is SavedPlan => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>; const snapshot = record.snapshot as Record<string, unknown> | undefined
  if (!(typeof record.id === 'string' && uuidPattern.test(record.id) && typeof record.updated_at === 'string' && !Number.isNaN(Date.parse(record.updated_at))
    && !!snapshot && snapshot.city === 'Jaipur' && Number.isSafeInteger(snapshot.guests) && Number.isSafeInteger(snapshot.budgetPaise)
    && Number.isSafeInteger(snapshot.totalPaise) && Number.isSafeInteger(snapshot.remainingPaise) && Array.isArray(snapshot.lines))) return false
  const lines = snapshot.lines as Array<Record<string, unknown>>
  if (!lines.length || lines.some((line) => !line || typeof line.id !== 'string' || typeof line.category !== 'string' || typeof line.name !== 'string' || typeof line.brand !== 'string'
    || !Number.isSafeInteger(line.sizeMl) || !Number.isSafeInteger(line.pricePaise) || !Number.isSafeInteger(line.quantity) || !Number.isSafeInteger(line.subtotalPaise))) return false
  const checked = calculatePlan({ guests: snapshot.guests, budgetPaise: snapshot.budgetPaise, categories: [...new Set(lines.map((line) => line.category))], lines: lines.map((line) => ({ productId: line.id, quantity: line.quantity })) }, lines as unknown as Product[])
  return checked.ok && sameJson(checked.plan, snapshot)
}

export async function confirmEligibility(accepted: boolean): Promise<{ ok: boolean; error?: string }> {
  if (typeof accepted !== 'boolean') return { ok: false, error: 'Eligibility confirmation is required.' }
  await setEligibility(accepted)
  return { ok: accepted, ...(accepted ? {} : { error: 'You must confirm eligibility to continue.' }) }
}

export async function getCatalogue(): Promise<Result<{ products: Product[] }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  return { ok: true, products: catalogue as Product[] }
}

export async function validatePlan(input: unknown): Promise<Result<{ plan: Plan }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  const result = calculatePlan(input, catalogue as Product[])
  return result.ok ? result : { ok: false, error: result.error }
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof phone !== 'string' || !phonePattern.test(phone)) return { ok: false, error: 'Enter a valid phone number.' }
  try {
    const response = await authRequest('/otp', { method: 'POST', body: JSON.stringify({ phone, create_user: true }) })
    return response.ok ? { ok: true } : { ok: false, error: generic }
  } catch { return { ok: false, error: generic } }
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof phone !== 'string' || typeof code !== 'string' || !phonePattern.test(phone) || !codePattern.test(code)) return { ok: false, error: 'Enter a valid phone number and code.' }
  try {
    const response = await authRequest('/verify', { method: 'POST', body: JSON.stringify({ phone, token: code, type: 'sms' }) })
    if (!response.ok) return { ok: false, error: generic }
    const data = await json<{ access_token?: string; refresh_token?: string }> (response)
    if (!data?.access_token || !data.refresh_token) return { ok: false, error: generic }
    await setTokens(data.access_token, data.refresh_token)
    const user = await verifiedUser()
    if (!user) { await clearTokens(); return { ok: false, error: generic } }
    return { ok: true }
  } catch { return { ok: false, error: generic } }
}

export async function signOut(): Promise<{ ok: boolean }> {
  const token = (await verifiedSession())?.access ?? null
  if (token) { try { await authRequest('/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) } catch {} }
  await clearTokens()
  return { ok: true }
}

async function current(): Promise<{ token: string; userId: string } | null> {
  const session = await verifiedSession()
  return session ? { token: session.access, userId: session.user.id } : null
}
const unauthorized = <T>(): Result<T> => ({ ok: false, error: 'Sign in to manage saved plans.', unauthorized: true })

export async function listPlans(): Promise<Result<{ plans: SavedPlan[] }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  const auth = await current(); if (!auth) return unauthorized()
  try {
    const response = await rest(`${SUPABASE_PATH}?select=id,updated_at,snapshot&user_id=eq.${encodeURIComponent(auth.userId)}&order=updated_at.desc`, {}, auth.token)
    if (!response.ok) return { ok: false, error: generic }
    const plans = await json<unknown>(response)
    return Array.isArray(plans) && plans.every(validSaved) ? { ok: true, plans } : { ok: false, error: generic }
  } catch { return { ok: false, error: generic } }
}

export async function savePlan(input: unknown, id: string, expectedUpdatedAt?: string): Promise<Result<{ record: SavedPlan }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  if (!uuidPattern.test(id)) return { ok: false, error: 'Plan id is invalid.' }
  if (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(expectedUpdatedAt)))) return { ok: false, error: 'Plan timestamp is invalid.' }
  const calculated = calculatePlan(input, catalogue as Product[]); if (!calculated.ok) return calculated
  const auth = await current(); if (!auth) return unauthorized()
  const query = `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}${expectedUpdatedAt ? `&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}` : ''}`
  try {
    const response = expectedUpdatedAt
      ? await rest(`${SUPABASE_PATH}?${query}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ snapshot: calculated.plan }) }, auth.token)
      : await rest(SUPABASE_PATH, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id, snapshot: calculated.plan }) }, auth.token)
    if (response.ok) { const rows = await json<unknown>(response); if (Array.isArray(rows) && rows[0] && validSaved(rows[0])) return { ok: true, record: rows[0] } }
    if (!expectedUpdatedAt && response.status === 409) {
      const existing = await rest(`${SUPABASE_PATH}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&select=id,updated_at,snapshot`, {}, auth.token)
      const rows = existing.ok ? await json<unknown>(existing) : null
      if (Array.isArray(rows) && rows[0] && validSaved(rows[0]) && sameJson(rows[0].snapshot, calculated.plan)) return { ok: true, record: rows[0] }
      return { ok: false, error: 'A plan with this id already exists.' }
    }
    if (expectedUpdatedAt && response.ok) return { ok: false, error: 'Plan was changed elsewhere.' }
    return { ok: false, error: expectedUpdatedAt ? 'Plan was changed elsewhere.' : generic }
  } catch { return { ok: false, error: generic } }
}

export async function deletePlan(id: string, expectedUpdatedAt: string): Promise<Result<{}>> {
  const auth = await current(); if (!auth) return unauthorized()
  if (!uuidPattern.test(id) || typeof expectedUpdatedAt !== 'string' || !expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) return { ok: false, error: 'Plan details are invalid.' }
  try {
    const response = await rest(`${SUPABASE_PATH}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.userId)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }, auth.token)
    const rows = response.ok ? await json<SavedPlan[]>(response) : null
    return rows?.length ? { ok: true } : { ok: false, error: 'Plan was changed elsewhere.' }
  } catch { return { ok: false, error: generic } }
}

export async function getSession(): Promise<{ signedIn: boolean }> { return getSessionState() }
