'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import AgeCheck from '../age-check'
import { ToolFooter, ToolHeader, toolRoot } from '../tool-shell'
import { acceptEligibilityForm } from '../party-planner/actions'
import styles from './finder.module.css'

export default function Gate() {
  const [checked, setChecked] = useState(false)
  const params = useSearchParams()
  const pathname = usePathname()
  const next = pathname + (params.get('age') ? '' : params.toString() ? '?' + params.toString() : '')
  const message = params.get('age') === 'needed' ? 'Tick the box to continue.' : ''

  return <div className={`${styles.shell} ${toolRoot}`} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader current="finder" />
    <main id="main" tabIndex={-1}>
      <h1 className={styles.srOnly}>Find My Drink</h1>
      <AgeCheck lines={['Find', 'My Drink']} checked={checked} onCheckedChange={setChecked} continueLabel="Continue" busy={false} busyLabel="confirming…" message={message} form={{ action: acceptEligibilityForm, next }} />
    </main>
    <ToolFooter />
  </div>
}
