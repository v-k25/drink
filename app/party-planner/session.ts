import 'server-only'

import { cookies } from 'next/headers'

const ELIGIBLE = 'allcheers_eligible'
const secure = process.env.NODE_ENV === 'production'

export async function eligibilityAccepted(): Promise<boolean> {
  return (await cookies()).get(ELIGIBLE)?.value === '1'
}

export async function setEligibility(accepted: boolean) {
  ;(await cookies()).set(ELIGIBLE, accepted ? '1' : '0', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 24 * 30 })
}
