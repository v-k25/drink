import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'

// Data access layer for accounts (docs/accounts-plan.md). Supabase Auth over REST with the same server-only
// SUPABASE_URL / SUPABASE_ANON_KEY as the early-access action; tokens live only in httpOnly cookies.
// Cookies can only be written in server actions and route handlers, so a page that finds an expired access token
// sends the browser to /account/refresh instead of refreshing during render (a refresh rotates the refresh token).

const ACCESS = 'sf_access'
const REFRESH = 'sf_refresh'
// Not httpOnly and not a credential: it only tells the static tool header to show "Account" instead of "Sign in".
export const SIGNED_IN_HINT = 'sf_signed_in'
const MONTH = 60 * 60 * 24 * 30
const secure = process.env.NODE_ENV === 'production'

export type Account = { id: string; email: string | null; phone: string | null }
type AuthUser = { id?: string; email?: string; phone?: string; user_metadata?: unknown }
export type Tokens = { access_token?: string; refresh_token?: string; user?: AuthUser }

export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

export function authFetch(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init
  const key = process.env.SUPABASE_ANON_KEY ?? ''
  return fetch(`${process.env.SUPABASE_URL ?? ''}/auth/v1${path}`, {
    ...rest,
    headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
}

// Whether this email or phone already has a Socifer account (supabase/migrations/20261104_socifer_account_exists.sql).
// Uses the server-only secret key: only service_role can call the function. Null means the check couldn't run.
export async function sociferAccountExists(address: string): Promise<boolean | null> {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!process.env.SUPABASE_URL || !key) return null
  try {
    const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/socifer_account_exists`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_address: address }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!response.ok) { console.error(`account: exists check status ${response.status}`); return null }
    const found = await response.json() as unknown
    return typeof found === 'boolean' ? found : null
  } catch {
    return null
  }
}

export async function setSession(tokens: Tokens) {
  if (!tokens.access_token || !tokens.refresh_token) return false
  const jar = await cookies()
  const options = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: MONTH }
  jar.set(ACCESS, tokens.access_token, options)
  jar.set(REFRESH, tokens.refresh_token, options)
  jar.set(SIGNED_IN_HINT, '1', { ...options, httpOnly: false })
  return true
}

export async function clearSession() {
  const jar = await cookies()
  for (const name of [ACCESS, REFRESH, SIGNED_IN_HINT]) jar.set(name, '', { httpOnly: name !== SIGNED_IN_HINT, sameSite: 'lax', secure, path: '/', maxAge: 0 })
}

const toAccount = (user: AuthUser): Account | null =>
  user.id ? { id: user.id, email: user.email || null, phone: user.phone ? `+${user.phone.replace(/^\+/, '')}` : null } : null

// 'refresh' means the access token has expired but a refresh token is there: send the browser to /account/refresh.
export const currentAccount = cache(async (): Promise<Account | 'refresh' | null> => {
  const jar = await cookies()
  const access = jar.get(ACCESS)?.value
  const refresh = jar.get(REFRESH)?.value
  if (!refresh || !authConfigured()) return null
  if (!access) return 'refresh'
  try {
    const response = await authFetch('/user', { token: access })
    if (response.ok) return toAccount(await response.json() as AuthUser)
    return response.status === 401 || response.status === 403 ? 'refresh' : null
  } catch {
    return null
  }
})

// Server actions and route handlers only.
export async function refreshSession(): Promise<boolean> {
  const refresh = (await cookies()).get(REFRESH)?.value
  if (!refresh || !authConfigured()) return false
  try {
    const response = await authFetch('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) })
    if (!response.ok) return false
    return setSession(await response.json() as Tokens)
  } catch {
    return false
  }
}

export async function endSession() {
  const access = (await cookies()).get(ACCESS)?.value
  if (access && authConfigured()) {
    // Revokes this device's refresh token. A failure still clears the cookies.
    await authFetch('/logout?scope=local', { method: 'POST', token: access }).catch(() => null)
  }
  await clearSession()
}
