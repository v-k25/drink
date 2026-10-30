'use server'

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
