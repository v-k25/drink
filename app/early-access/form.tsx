'use client'

import { useActionState, useState } from 'react'
import { submitEarlyAccess, type EarlyAccessState } from './actions'
import styles from './form.module.css'

export default function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [jaipur, setJaipur] = useState(false)
  const [state, action, pending] = useActionState<EarlyAccessState, FormData>(async (previous, data) => {
    try {
      return await submitEarlyAccess(previous, data)
    } catch {
      return { status: 'error' }
    }
  }, { status: 'idle' })
  const errors = state.fieldErrors

  return (
    <div className={styles.wrap}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {state.status === 'success' && (
          <div className={styles.done}>
            <span className={styles.tick} aria-hidden="true">✓</span>
            <h3>You&apos;re on the list</h3>
            <p>We&apos;ll email {email ? <b>{email}</b> : 'you'} when bookings open.</p>
          </div>
        )}
        {state.status === 'duplicate' && <div className={styles.note}><b>You&apos;re already on the list</b>{email ? <>We have <span className={styles.address}>{email}</span>. Nothing else to do.</> : 'Nothing else to do.'}</div>}
        {state.status === 'invalid' && <div className={`${styles.note} ${styles.noteError}`}><b><span aria-hidden="true">! </span>Check the fields marked below</b></div>}
        {state.status === 'error' && <div className={`${styles.note} ${styles.noteError}`}><b><span aria-hidden="true">! </span>That didn&apos;t go through</b>Your details are still here. Try again.</div>}
      </div>
      {state.status !== 'success' && (
        <form action={action} onReset={event => event.preventDefault()} className={styles.form} aria-busy={pending}>
          <div className={`sf-field${errors?.email ? ' sf-field--error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input id="email" className="sf-input" name="email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required aria-invalid={Boolean(errors?.email)} aria-describedby={errors?.email ? 'email-error' : undefined} />
            {errors?.email && <p id="email-error" className={styles.error}><span aria-hidden="true">!</span>{errors.email}</p>}
          </div>
          <div className={styles.choices}>
            <label className="sf-choice">
              <input type="checkbox" name="interests" value="jaipur" required checked={jaipur} onChange={e => setJaipur(e.target.checked)} aria-invalid={Boolean(errors?.interests)} aria-describedby={errors?.interests ? 'interests-error' : undefined} />
              <span><b>I&apos;m joining early access for Jaipur</b></span>
            </label>
            {errors?.interests && <p id="interests-error" className={styles.error}><span aria-hidden="true">!</span>Tick this to continue.</p>}
            <label className={`sf-choice${errors?.consent ? ` ${styles.invalid}` : ''}`}>
              <input type="checkbox" name="consent" required checked={consent} onChange={e => setConsent(e.target.checked)} aria-invalid={Boolean(errors?.consent)} aria-describedby={errors?.consent ? 'consent-note consent-error' : 'consent-note'} />
              <span><b>I agree to receive Socifer early-access and launch updates by email.</b><small id="consent-note">See the <a href="#privacy">privacy note</a>.</small></span>
            </label>
            {errors?.consent && <p id="consent-error" className={styles.error}><span aria-hidden="true">!</span>{errors.consent}</p>}
          </div>
          <input name="company" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true" />
          <input type="hidden" name="cta_source" value="homepage" />
          <button className={`sf-btn sf-btn--primary sf-btn--block ${styles.submit}`} type="submit" disabled={pending} aria-busy={pending}>
            {pending ? <><span className="sf-spinner" aria-hidden="true" />Joining</> : state.status === 'error' ? 'Try again' : 'Join the list'}
          </button>
        </form>
      )}
    </div>
  )
}
