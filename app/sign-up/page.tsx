import type { Metadata } from 'next'
import AuthPage from '../account/auth-page'

export const metadata: Metadata = { title: 'Create an account | Socifer' }

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />
}
