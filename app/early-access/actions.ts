'use server'

const SUPABASE_REST_PATH = '/rest/v1/waitlist_subscribers'

const ALLOWED_INTERESTS = ['find-my-sip', 'party-planner', 'zero-percent', 'jaipur'] as const
const ALLOWED_PREFERENCES = ['alcoholic', 'zero', 'both', 'undecided'] as const

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const CTA_SOURCE_PATTERN = /^[a-z0-9-]{1,40}$/

export type EarlyAccessState = {
  status: 'idle' | 'invalid' | 'error' | 'duplicate' | 'success'
  fieldErrors?: { email?: string; interests?: string; consent?: string }
  values?: { email?: string; interests?: string[]; preference?: string }
}

export async function submitEarlyAccess(
  _prevState: EarlyAccessState,
  formData: FormData,
): Promise<EarlyAccessState> {
  // Honeypot: bots that fill the hidden field get a silent fake success.
  const company = formData.get('company')
  if (typeof company === 'string' && company.trim() !== '') {
    return { status: 'success' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const interests = Array.from(
    new Set(
      formData
        .getAll('interests')
        .filter((value): value is string => typeof value === 'string')
        .filter((value) => (ALLOWED_INTERESTS as readonly string[]).includes(value)),
    ),
  )
  const rawPreference = formData.get('preference')
  const preference =
    typeof rawPreference === 'string' && (ALLOWED_PREFERENCES as readonly string[]).includes(rawPreference)
      ? rawPreference
      : null
  const consented = Boolean(formData.get('consent'))
  const rawCtaSource = formData.get('cta_source')
  const ctaSource = typeof rawCtaSource === 'string' && CTA_SOURCE_PATTERN.test(rawCtaSource) ? rawCtaSource : null

  const fieldErrors: { email?: string; interests?: string; consent?: string } = {}
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'Enter a valid email address.'
  if (interests.length === 0) fieldErrors.interests = 'Choose at least one interest.'
  if (!consented) fieldErrors.consent = 'We need your agreement to contact you.'

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'invalid',
      fieldErrors,
      values: { email, interests, preference: preference ?? undefined },
    }
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    const missing = [!url && 'SUPABASE_URL', !key && 'SUPABASE_ANON_KEY'].filter(Boolean).join(' ')
    console.error(`early-access: missing env ${missing}`)
    return { status: 'error' }
  }

  try {
    const response = await fetch(`${url}${SUPABASE_REST_PATH}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email,
        source: 'early-access',
        cta_source: ctaSource,
        interests,
        preference,
        consent_version: 'early-access-v1',
      }),
      cache: 'no-store',
    })

    if (response.status === 201) return { status: 'success' }
    if (response.status === 409) return { status: 'duplicate' }

    const text = await response.text().catch(() => '')
    console.error(`early-access: unexpected status ${response.status}: ${text.slice(0, 300)}`)
    return { status: 'error' }
  } catch (error) {
    console.error(`early-access: insert failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    return { status: 'error' }
  }
}