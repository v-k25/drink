'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmEligibility } from '../party-planner/actions'
import styles from './finder.module.css'

export default function Gate() {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  return <div className={styles.shell}>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>Socifer</Link>
      <div className={styles.headerActions}><Link href="/party-planner" className={styles.linkButton}>Party Planner</Link></div>
    </header>
    <main id="main" tabIndex={-1} className={`${styles.card} ${styles.gateCard}`}>
      <p className={styles.eyebrow}>Before we begin</p>
      <h2>One quick check.</h2>
      <p>Please confirm your eligibility before viewing drink recommendations.</p>
      {message && <p className={styles.notice} role="status">{message}</p>}
      <label className={styles.check}><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I meet the legal drinking-age requirements where I live</label>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={!checked || busy} onClick={() => void (async () => {
          setBusy(true); setMessage('')
          try {
            const confirmation = await confirmEligibility(true)
            if (!confirmation.ok) { setMessage(confirmation.error || 'Please confirm eligibility.'); return }
            router.refresh()
          } catch { setMessage('Connection interrupted. Your choice is still here; please try again.') }
          finally { setBusy(false) }
        })()}>{busy ? 'Confirming…' : 'Continue'}</button>
        <Link href="/" className={styles.secondary}>No thanks, take me home</Link>
      </div>
    </main>
  </div>
}
