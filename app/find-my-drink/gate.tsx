'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AgeCheck from '../age-check'
import { ToolFooter, ToolHeader, toolRoot } from '../tool-shell'
import { confirmEligibility } from '../party-planner/actions'
import styles from './finder.module.css'

export default function Gate() {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  return <div className={`${styles.shell} ${toolRoot}`} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader current="finder" />
    <main id="main" tabIndex={-1}>
      <h1 className={styles.srOnly}>Find My Drink</h1>
      <AgeCheck lines={['Find', 'My Drink']} checked={checked} onCheckedChange={setChecked} continueLabel="Continue" busy={busy} busyLabel="confirming…" message={message} onContinue={() => void (async () => {
        setBusy(true); setMessage('')
        try {
          const confirmation = await confirmEligibility(true)
          if (!confirmation.ok) { setMessage(confirmation.error || 'Please confirm eligibility.'); return }
          router.refresh()
        } catch { setMessage('Connection interrupted. Your choice is still here; please try again.') }
        finally { setBusy(false) }
      })()} />
    </main>
    <ToolFooter />
  </div>
}
