'use server'

import { redirect } from 'next/navigation'
import { readCatalogue } from './catalogue-server'
import { calculatePlan, type Plan, type Product } from './model'
import { eligibilityAccepted, setEligibility } from './session'

type Result<T> = { ok: true } & T | { ok: false; error: string }

const generic = 'Unable to complete that request.'

export async function confirmEligibility(accepted: boolean): Promise<{ ok: boolean; error?: string }> {
  if (typeof accepted !== 'boolean') return { ok: false, error: 'Eligibility confirmation is required.' }
  await setEligibility(accepted)
  return { ok: accepted, ...(accepted ? {} : { error: 'You must confirm eligibility to continue.' }) }
}

// Find My Drink age check as a plain form post, so it works without JavaScript. `next` is validated: only Find My Drink paths are accepted.
const FINDER_NEXT = /^\/find-my-drink(?:\/[A-Za-z0-9_-]{1,80})?(?:\?[A-Za-z0-9_=&%.,~+-]{0,300})?$/

export async function acceptEligibilityForm(formData: FormData): Promise<void> {
  const raw = formData.get('next')
  const next = typeof raw === 'string' && FINDER_NEXT.test(raw) ? raw : '/find-my-drink'
  if (formData.get('eligible') !== 'on') redirect('/find-my-drink?age=needed')
  await setEligibility(true)
  redirect(next)
}

export async function getCatalogue(): Promise<Result<{ products: Product[] }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  try { return { ok: true, products: await readCatalogue() } } catch { return { ok: false, error: generic } }
}

export async function validatePlan(input: unknown): Promise<Result<{ plan: Plan }>> {
  if (!(await eligibilityAccepted())) return { ok: false, error: 'Confirm eligibility to continue.' }
  try {
    const result = calculatePlan(input, await readCatalogue())
    return result.ok ? result : { ok: false, error: result.error }
  } catch { return { ok: false, error: generic } }
}
