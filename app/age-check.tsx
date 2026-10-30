'use client'

import Link from 'next/link'
import { useRef, useState, type Ref } from 'react'
import styles from './age-check.module.css'

// The age check card for Party Planner and Find My Drink. Presentation only: each tool keeps its own confirm call and what happens after it.
// Continue stays enabled. Pressing it unticked shows the inline error and moves focus to the checkbox.
export default function AgeCheck({ lines, checked, onCheckedChange, onContinue, continueLabel, busy, busyLabel, message, headingRef }: {
  lines: [string, string]
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onContinue: () => void
  continueLabel: string
  busy: boolean
  busyLabel: string
  message?: string
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const [missing, setMissing] = useState(false)
  const box = useRef<HTMLInputElement>(null)
  const showError = missing && !checked
  return <div className={styles.stage}><div className={`sf-age ${styles.card}`}>
    <p className="mark" aria-hidden="true">{lines[0]}<br />{lines[1]}</p>
    <h2 ref={headingRef} tabIndex={-1} className={styles.lead}>One quick check first.</h2>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <label className={`sf-choice ${showError ? styles.invalid : ''}`.trim()}>
      <input ref={box} type="checkbox" checked={checked} aria-labelledby="age-check-label" aria-describedby={showError ? 'age-check-error' : undefined} aria-invalid={showError || undefined} onChange={event => { onCheckedChange(event.target.checked); if (event.target.checked) setMissing(false) }} />
      <span><b id="age-check-label">I meet the legal drinking-age requirements where I live</b>{showError && <small id="age-check-error" role="alert" className={styles.error}>! Tick the box to continue</small>}</span>
    </label>
    <div className={styles.actions}>
      <button type="button" className="sf-btn sf-btn--primary sf-btn--block" aria-busy={busy || undefined} onClick={() => {
        if (busy) return
        if (!checked) { setMissing(true); box.current?.focus(); return }
        onContinue()
      }}>{continueLabel}{busy && <span className={styles.sr}> ({busyLabel})</span>}</button>
      <Link href="/" className="sf-btn sf-btn--ghost sf-btn--block">No thanks, take me home</Link>
    </div>
    <p className={styles.note}>We’ll remember this on this device for 30 days.</p>
  </div></div>
}
