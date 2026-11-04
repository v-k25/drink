import type { Metadata } from 'next'
import AuthPage from '../account/auth-page'

export const metadata: Metadata = { title: 'Sign in | Socifer' }

export default function SignInPage() {
  return <AuthPage mode="sign-in" />
}
