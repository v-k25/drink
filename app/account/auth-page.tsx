import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ToolFooter, ToolHeader, toolRoot } from '../tool-shell'
import AuthForm from './auth-form'
import type { Mode } from './rules'
import { currentAccount } from './session'
import styles from './account.module.css'

// /sign-in and /sign-up. Someone already signed in goes straight to their account.
export default async function AuthPage({ mode }: { mode: Mode }) {
  if (await currentAccount()) redirect('/account')
  const signUp = mode === 'sign-up'
  return <div className={toolRoot} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader />
    <main id="main" tabIndex={-1} className={styles.stage}>
      <div className={styles.panel}>
        <h1 className={styles.title}>{signUp ? 'Create an account' : 'Sign in'}</h1>
        <p className={styles.copy}>We’ll send you a 6-digit code. No password.</p>
        <AuthForm mode={mode} />
        <p className={styles.switch}>
          {signUp ? <>Have an account? <Link href="/sign-in">Sign in</Link></> : <>New here? <Link href="/sign-up">Create an account</Link></>}
        </p>
      </div>
    </main>
    <ToolFooter />
  </div>
}
