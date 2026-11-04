// Account sign-in rules (docs/accounts-plan.md): input checks, the code format and the plain messages.
// No I/O, so the form can run the same checks before a round trip and scripts/account-check.cjs can run it directly.

// Owner decision 2026-11-01: email codes now; phone codes are built but stay off until an SMS provider is set up (O3).
export const PHONE_CODES_ENABLED = false

export type Method = 'email' | 'phone'
export type Mode = 'sign-in' | 'sign-up'

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const CODE_PATTERN = /^\d{6}$/
export const RESEND_SECONDS = 60
export const CONSENT_VERSION = 'account-v1'

// This Supabase project is shared with EkQuarter, so a login row alone isn't a Socifer account.
// Socifer's create-account step records consent on the login; that record is what makes it one.
export const isSociferAccount = (metadata: unknown) => typeof (metadata as { consent?: unknown } | null | undefined)?.consent === 'string'

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

// Indian mobile numbers only: 10 digits starting 6–9, with or without +91, 91 or a leading 0. Returns E.164 or null.
export function normalizeIndianPhone(value: string): string | null {
  let digits = value.replace(/[\s()-]/g, '')
  if (digits.startsWith('+91')) digits = digits.slice(3)
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

// What the code screen shows: "+91 98••• ••210", "na•••@example.com".
export function maskAddress(method: Method, address: string): string {
  if (method === 'phone') return `+91 ${address.slice(3, 5)}••• ••${address.slice(-3)}`
  const [name, domain] = address.split('@')
  return `${name.slice(0, 2)}•••@${domain}`
}

export type AuthError =
  | 'invalid_email' | 'invalid_phone' | 'invalid_code' | 'consent_required' | 'no_account' | 'account_exists'
  | 'code_expired' | 'too_many' | 'phone_off' | 'unavailable'

export const AUTH_MESSAGES: Record<AuthError, string> = {
  invalid_email: 'Enter a valid email address.',
  invalid_phone: 'Enter a 10-digit Indian mobile number.',
  invalid_code: 'Enter the 6-digit code.',
  consent_required: 'Tick the box to create an account.',
  no_account: 'There’s no account with this email.',
  account_exists: 'You already have an account with this email.',
  code_expired: 'That code didn’t work. Check it, or send a new one.',
  too_many: 'Too many tries. Wait a minute and try again.',
  phone_off: 'Phone sign-in isn’t on yet. Use your email.',
  unavailable: 'That didn’t go through. Try again.',
}

export type Checked = { ok: true; address: string } | { ok: false; error: AuthError }

export function checkAddress(method: Method, value: string): Checked {
  if (method === 'phone') {
    if (!PHONE_CODES_ENABLED) return { ok: false, error: 'phone_off' }
    const phone = normalizeIndianPhone(value)
    return phone ? { ok: true, address: phone } : { ok: false, error: 'invalid_phone' }
  }
  const email = normalizeEmail(value)
  return EMAIL_PATTERN.test(email) && email.length <= 254 ? { ok: true, address: email } : { ok: false, error: 'invalid_email' }
}

// Supabase Auth error codes → our messages. Unknown codes become the generic message.
export function authErrorFrom(status: number, code: string | undefined): AuthError {
  if (status === 429 || code?.startsWith('over_') || code === 'too_many_requests') return 'too_many'
  if (code === 'otp_disabled' || code === 'user_not_found') return 'no_account'
  if (code === 'otp_expired' || status === 403) return 'code_expired'
  if (code === 'phone_provider_disabled' || code === 'sms_send_failed') return 'phone_off'
  return 'unavailable'
}
