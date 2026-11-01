'use client'

import { useActionState, useState, type FormEvent } from 'react'
import { AlertIcon, CheckIcon } from '../icons'
import { submitEarlyAccess, type EarlyAccessState } from './actions'
import styles from './form.module.css'

// Same rule and messages as the server action, so the designed error states show before a round trip.
// The server still validates everything; without JavaScript its errors render the same way.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
type FieldErrors = NonNullable<EarlyAccessState['fieldErrors']>

export default function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null)
  const [state, action, pending] = useActionState<EarlyAccessState, FormData>(async (previous, data) => {
    try {
      return await submitEarlyAccess(previous, data)
    } catch {
      return { status: 'error' }
    }
  }, { status: 'idle' })
  const errors = clientErrors ?? state.fieldErrors
  const check = (event: FormEvent<HTMLFormElement>) => {
    const found: FieldErrors = {}
    if (!EMAIL_PATTERN.test(email.trim())) found.email = 'Enter a valid email address.'
    if (!consent) found.consent = 'We need your agreement to contact you.'
    if (Object.keys(found).length === 0) { setClientErrors(null); return }
    event.preventDefault()
    setClientErrors(found)
    event.currentTarget.querySelector<HTMLInputElement>(found.email ? '#email' : '#consent')?.focus()
  }

  return (
    <div className={styles.wrap}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {state.status === 'success' && (
          <div className={`${styles.done} sf-glow-once`}>
            <span className={styles.tick}><CheckIcon size={40} /></span>
            <h3>You&apos;re on the list</h3>
            <p>We&apos;ll email {email ? <b>{email}</b> : 'you'} when bookings open.</p>
          </div>
        )}
        {state.status === 'duplicate' && <div className={styles.note}><b>You&apos;re already on the list</b>{email ? <>We have <span className={styles.address}>{email}</span>. Nothing else to do.</> : 'Nothing else to do.'}</div>}
        {state.status === 'invalid' && <div className={`${styles.note} ${styles.noteError}`}><b><AlertIcon size={18} />Check the fields marked below</b></div>}
        {state.status === 'error' && <div className={`${styles.note} ${styles.noteError}`}><b><AlertIcon size={18} />That didn&apos;t go through</b>Your details are still here. Try again.</div>}
      </div>
      {state.status !== 'success' && (
        <form action={action} onSubmit={check} noValidate onReset={event => event.preventDefault()} className={styles.form} aria-busy={pending}>
          <div className={`sf-field${errors?.email ? ' sf-field--error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input id="email" className="sf-input" name="email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e => { setEmail(e.target.value); if (clientErrors?.email) setClientErrors(current => current && { ...current, email: undefined }) }} required aria-invalid={Boolean(errors?.email)} aria-describedby={errors?.email ? 'email-error' : undefined} />
            {errors?.email && <p id="email-error" className={styles.error}><AlertIcon size={18} />{errors.email}</p>}
          </div>
          <div className={styles.choices}>
            {/* Jaipur is the only city, so it is sent rather than asked for; the server action still requires one interest. */}
            <input type="hidden" name="interests" value="jaipur" />
            <label className={`sf-choice${errors?.consent ? ` ${styles.invalid}` : ''}`}>
              <input id="consent" type="checkbox" name="consent" required checked={consent} onChange={e => { setConsent(e.target.checked); if (clientErrors?.consent) setClientErrors(current => current && { ...current, consent: undefined }) }} aria-invalid={Boolean(errors?.consent)} aria-describedby={errors?.consent ? 'consent-note consent-error' : 'consent-note'} />
              <span><b>I agree to receive Socifer early-access and launch updates by email.</b><small id="consent-note">See the <a href="#privacy">privacy note</a>.</small></span>
            </label>
            {errors?.consent && <p id="consent-error" className={styles.error}><AlertIcon size={18} />{errors.consent}</p>}
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
