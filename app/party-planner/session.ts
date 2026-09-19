import 'server-only'

import { cookies } from 'next/headers'

const ACCESS = 'allcheers_access'
const REFRESH = 'allcheers_refresh'
const ELIGIBLE = 'allcheers_eligible'

const authBase = () => `${process.env.SUPABASE_URL ?? ''}/auth/v1`
const authHeaders = () => ({ apikey: process.env.SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' })
const secure = process.env.NODE_ENV === 'production'

export type AuthUser = { id: string }

export async function eligibilityAccepted(): Promise<boolean> {
  return (await cookies()).get(ELIGIBLE)?.value === '1'
}

export async function setEligibility(accepted: boolean) {
  ;(await cookies()).set(ELIGIBLE, accepted ? '1' : '0', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 24 * 30 })
}

export async function setTokens(access: string, refresh: string) {
  const jar = await cookies()
  const options = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: 60 * 60 * 24 * 30 }
  jar.set(ACCESS, access, options)
  jar.set(REFRESH, refresh, options)
}

export async function clearTokens() {
  const jar = await cookies()
  jar.set(ACCESS, '', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 })
  jar.set(REFRESH, '', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 })
}

async function refreshAccess(refresh: string): Promise<string | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null
  try {
    const response = await fetch(`${authBase()}/token?grant_type=refresh_token`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ refresh_token: refresh }), signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json() as { access_token?: string; refresh_token?: string }
    if (!data.access_token) return null
    await setTokens(data.access_token, data.refresh_token ?? refresh)
    return data.access_token
  } catch { return null }
}

export async function verifiedUser(): Promise<AuthUser | null> {
  const jar = await cookies()
  let access = jar.get(ACCESS)?.value
  const refresh = jar.get(REFRESH)?.value
  if (!access || !refresh || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${authBase()}/user`, { headers: { ...authHeaders(), Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(10000), cache: 'no-store' })
      if (response.ok) {
        const data = await response.json() as { id?: string }
        return data.id ? { id: data.id } : null
      }
      if (response.status !== 401 || attempt > 0) return null
      access = (await refreshAccess(refresh)) ?? undefined
      if (!access) return null
    } catch { return null }
  }
  return null
}

export async function verifiedSession(): Promise<{ user: AuthUser; access: string } | null> {
  const user = await verifiedUser()
  if (!user) return null
  const access = (await cookies()).get(ACCESS)?.value
  return access ? { user, access } : null
}

export async function getSessionState(): Promise<{ signedIn: boolean }> {
  return { signedIn: Boolean(await verifiedUser()) }
}

export async function authRequest(path: string, init: RequestInit = {}) {
  return fetch(`${authBase()}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(10000), cache: 'no-store' })
}

export async function accessToken(): Promise<string | null> {
  const user = await verifiedUser()
  if (!user) return null
  return (await cookies()).get(ACCESS)?.value ?? null
}
