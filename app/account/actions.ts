'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AUTH_MESSAGES, CODE_PATTERN, CONSENT_VERSION, authErrorFrom, checkAddress, isSociferAccount, maskAddress, type AuthError, type Method, type Mode } from './rules'
import { authConfigured, authFetch, endSession, setSession, sociferAccountExists, type Tokens } from './session'

export type AuthState = {
  step: 'address' | 'code'
  method: Method
  address?: string
  masked?: string
  sentAt?: number
  error?: AuthError
  field?: 'address' | 'consent' | 'code'
  message?: string
}

// Wrong codes allowed per code sent from this browser, on top of Supabase's own limits (the server's calls share one IP).
const TRIES = 'sf_code_tries'
const MAX_TRIES = 5

const consentRecord = () => ({ consent: CONSENT_VERSION, consented_at: new Date().toISOString() })

const fail = (state: AuthState, error: AuthError, field?: AuthState['field']): AuthState => ({ ...state, error, field, message: AUTH_MESSAGES[error] })

async function supabaseError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error_code?: string; code?: string | number }
  const code = body.error_code ?? (typeof body.code === 'string' ? body.code : undefined)
  const error = authErrorFrom(response.status, code)
  if (error === 'unavailable') console.error(`account: auth status ${response.status} ${code ?? ''}`)
  return error
}

export async function authStep(previous: AuthState, formData: FormData): Promise<AuthState> {
  const intent = String(formData.get('intent') ?? 'send')
  const mode: Mode = formData.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in'
  const method: Method = formData.get('method') === 'phone' ? 'phone' : 'email'
  const base: AuthState = { step: 'address', method }

  if (intent === 'change') return { ...base, address: previous.address }

  if (intent === 'verify') {
    const codeState: AuthState = { ...previous, step: 'code', method, error: undefined, field: undefined, message: undefined }
    const checked = checkAddress(method, String(formData.get('address') ?? ''))
    if (!checked.ok) return fail(base, checked.error, 'address')
    const token = String(formData.get('code') ?? '').replace(/\s/g, '')
    if (!CODE_PATTERN.test(token)) return fail(codeState, 'invalid_code', 'code')
    const jar = await cookies()
    const tries = Number(jar.get(TRIES)?.value ?? 0)
    if (tries >= MAX_TRIES) return fail(codeState, 'too_many', 'code')
    if (!authConfigured()) return fail(codeState, 'unavailable')
    let tokens: Tokens
    try {
      const response = await authFetch('/verify', {
        method: 'POST',
        body: JSON.stringify(method === 'phone' ? { type: 'sms', phone: checked.address, token } : { type: 'email', email: checked.address, token }),
      })
      if (!response.ok) {
        jar.set(TRIES, String(tries + 1), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 15 })
        return fail(codeState, await supabaseError(response), 'code')
      }
      tokens = await response.json() as Tokens
    } catch {
      return fail(codeState, 'unavailable')
    }
    jar.delete(TRIES)
    if (!isSociferAccount(tokens.user?.user_metadata)) {
      // A login from the shared project with no Socifer account: sign in stops here, create account records the consent ticked before the code was sent.
      const added = mode === 'sign-up' && tokens.access_token ? await authFetch('/user', { method: 'PUT', token: tokens.access_token, body: JSON.stringify({ data: consentRecord() }) }).then(response => response.ok, () => false) : false
      if (!added) {
        if (tokens.access_token) await authFetch('/logout?scope=local', { method: 'POST', token: tokens.access_token }).catch(() => null)
        return mode === 'sign-up' ? fail(codeState, 'unavailable') : fail({ ...base, address: checked.address }, 'no_account', 'address')
      }
    }
    if (!(await setSession(tokens))) return fail(codeState, 'unavailable')
    redirect('/account')
  }

  // send or resend. Errors keep what was typed in the field.
  const typed = String(formData.get('address') ?? '').trim().slice(0, 254)
  const checked = checkAddress(method, typed)
  const retry: AuthState = { ...base, address: typed }
  if (!checked.ok) return fail(retry, checked.error, checked.error === 'phone_off' ? undefined : 'address')
  if (mode === 'sign-up' && !formData.get('consent')) return fail(retry, 'consent_required', 'consent')
  const sent: AuthState = { step: 'code', method, address: checked.address, masked: maskAddress(method, checked.address), sentAt: Date.now() }

  // Honeypot: a filled hidden field gets the code screen with no code sent.
  const company = formData.get('company')
  if (typeof company === 'string' && company.trim() !== '') return sent

  if (!authConfigured()) {
    console.error('account: missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return fail(retry, 'unavailable')
  }
  try {
    // Supabase's "create" also signs existing accounts in without saying so, so Create account checks first and sends nothing to an existing account.
    if (mode === 'sign-up' && intent !== 'resend') {
      const exists = await sociferAccountExists(checked.address)
      if (exists === null) return fail(retry, 'unavailable')
      if (exists) return fail(retry, 'account_exists', 'address')
    }
    const create = mode === 'sign-up'
    const contact = method === 'phone' ? { phone: checked.address, channel: 'sms' } : { email: checked.address }
    const response = await authFetch('/otp', {
      method: 'POST',
      body: JSON.stringify({ ...contact, create_user: create, ...(create ? { data: consentRecord() } : {}) }),
    })
    if (!response.ok) {
      const error = await supabaseError(response)
      return intent === 'resend' ? fail({ ...previous, step: 'code' }, error) : fail(retry, error, error === 'no_account' ? 'address' : undefined)
    }
  } catch {
    return fail(intent === 'resend' ? { ...previous, step: 'code' } : retry, 'unavailable')
  }
  ;(await cookies()).delete(TRIES)
  return sent
}

export async function signOut() {
  await endSession()
  redirect('/')
}
