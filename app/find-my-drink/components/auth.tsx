'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, signOut, verifyOtp } from '../../party-planner/actions'
import styles from '../finder.module.css'

export default function Auth({ onSuccess, compact = false }: { onSuccess?: () => void; compact?: boolean }) {
  const router = useRouter()
  const [phone, setPhone] = useState('+91')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const submit = async () => {
    setBusy(true); setMessage('')
    try {
      const result = sent ? await verifyOtp(phone, code) : await sendOtp(phone)
      if (!result.ok) { setMessage(result.error ?? 'Unable to sign in.'); return }
      if (!sent) { setSent(true); setMessage('Code sent. Check your messages.') }
      else { onSuccess?.(); router.refresh() }
    } catch { setMessage('Connection interrupted. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className={styles.authBox} aria-label="Sign in">
    {!compact && <><h3>Sign in to save your recipes</h3><p className={styles.hint}>We use your phone number to send a one-time code. Your number is private.</p></>}
    <label className={styles.fieldLabel} htmlFor="auth-phone">Phone number</label>
    <input id="auth-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+919876543210" disabled={sent} />
    {sent && <><label className={styles.fieldLabel} htmlFor="auth-code">Six-digit SMS code</label><input id="auth-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></>}
    {message && <p className={styles.notice} role="status">{message}</p>}
    <button type="button" className={styles.primary} onClick={() => void submit()} disabled={busy || (sent && code.length !== 6)}>{busy ? 'Working…' : sent ? 'Verify and continue' : 'Send code'}</button>
  </div>
}

export function SignOut() {
  const router = useRouter(); const [busy, setBusy] = useState(false)
  return <button type="button" className={styles.secondary} disabled={busy} onClick={async () => { setBusy(true); await signOut(); router.refresh() }}>{busy ? 'Signing out…' : 'Sign out'}</button>
}
