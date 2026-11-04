import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ToolFooter, ToolHeader, toolRoot } from '../tool-shell'
import { signOut } from './actions'
import { currentAccount } from './session'
import styles from './account.module.css'

export const metadata: Metadata = { title: 'Your account | Socifer' }

// Nothing is behind an account yet (owner decision O1, 2026-11-01); bookings will live here.
export default async function AccountPage() {
  const account = await currentAccount()
  if (account === 'refresh') redirect('/account/refresh')
  if (!account) redirect('/sign-in')
  const address = account.email ?? account.phone ?? 'your account'
  return <div className={toolRoot} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader />
    <main id="main" tabIndex={-1} className={styles.stage}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Your account</h1>
        <p className={styles.copy}>Signed in as <b>{address}</b>.</p>
        <p className={styles.copy}>Bookings will show here when they open.</p>
        <div className={styles.actions}>
          <Link href="/party-planner" className="sf-btn sf-btn--primary">Plan a party</Link>
          <form action={signOut}><button type="submit" className="sf-btn sf-btn--secondary">Sign out</button></form>
        </div>
      </div>
    </main>
    <ToolFooter />
  </div>
}
