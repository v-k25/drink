'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmEligibility } from '../party-planner/actions'
import ToolHeader from './components/header'
import styles from './finder.module.css'

export default function Gate() {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  return <div className={styles.shell}>
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader />
    <main id="main" tabIndex={-1} className={styles.gateStage}><div className={styles.gateCard}>
      <h1 className={styles.srOnly}>Find My Drink</h1>
      <p className={`${styles.eyebrow} ${styles.srOnly}`}>Before we begin</p>
      <h2>One quick check.</h2>
      <p className={styles.srOnly}>Please confirm your eligibility before viewing drink recommendations.</p>
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
        })()}>Continue{busy && <span className={styles.srOnly}> (confirming…)</span>}</button>
        <Link href="/" className={styles.secondary}>No thanks, take me home</Link>
      </div>
    </div></main>
  </div>
}
