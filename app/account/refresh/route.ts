import { redirect } from 'next/navigation'
import { clearSession, refreshSession } from '../session'

// Pages can't write cookies, so /account sends an expired session here; a route handler can rotate the tokens.
export async function GET() {
  if (await refreshSession()) redirect('/account')
  await clearSession()
  redirect('/sign-in')
}
