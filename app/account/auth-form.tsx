'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AlertIcon } from '../icons'
import { authStep, type AuthState } from './actions'
import { AUTH_MESSAGES, CODE_PATTERN, PHONE_CODES_ENABLED, RESEND_SECONDS, checkAddress, type AuthError, type Method, type Mode } from './rules'
import styles from './account.module.css'

// Sign in and sign up share one form: address (email, or phone once PHONE_CODES_ENABLED) → 6-digit code → /account.
// The client runs the same checks as the server action for instant errors; the server still checks everything.
export default function AuthForm({ mode }: { mode: Mode }) {
  const [method, setMethod] = useState<Method>(PHONE_CODES_ENABLED ? 'phone' : 'email')
  const [state, action, pending] = useActionState<AuthState, FormData>(async (previous, data) => {
    try {
      return await authStep(previous, data)
    } catch (error) {
      // redirect() after a good code arrives here as a thrown navigation; let Next handle it.
      if (error && typeof error === 'object' && 'digest' in error) throw error
      return { ...previous, error: 'unavailable', message: AUTH_MESSAGES.unavailable }
    }
  }, { step: 'address', method })
  const [clientError, setClientError] = useState<{ field: AuthState['field']; error: AuthError } | null>(null)
  const error = clientError ?? (state.error ? { field: state.field, error: state.error } : null)
  const onCode = state.step === 'code'

  const check = (event: FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.value ?? 'send'
    const form = event.currentTarget
    let found: typeof clientError = null
    if (intent === 'send') {
      const checked = checkAddress(method, (form.elements.namedItem('address') as HTMLInputElement).value)
      if (!checked.ok) found = { field: 'address', error: checked.error }
      else if (mode === 'sign-up' && !(form.elements.namedItem('consent') as HTMLInputElement).checked) found = { field: 'consent', error: 'consent_required' }
    } else if (intent === 'verify') {
      const code = (form.elements.namedItem('code') as HTMLInputElement).value.replace(/\s/g, '')
      if (!CODE_PATTERN.test(code)) found = { field: 'code', error: 'invalid_code' }
    }
    setClientError(found)
    if (!found) return
    event.preventDefault()
    form.querySelector<HTMLInputElement>(`[name="${found.field}"]`)?.focus()
  }

  const errorFor = (field: AuthState['field']) => error && error.field === field ? error : null
  const fieldError = (field: AuthState['field'], id: string) => {
    const found = errorFor(field)
    return found && <p id={id} className="err"><AlertIcon size={18} /><span>{AUTH_MESSAGES[found.error]}{found.error === 'no_account' && <> <Link href="/sign-up">Create an account</Link></>}{found.error === 'account_exists' && <> <Link href="/sign-in">Sign in</Link></>}</span></p>
  }
  const general = error && !error.field ? error : null

  return (
    <form action={action} onSubmit={check} noValidate className={styles.form} aria-busy={pending}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="method" value={method} />
      <div role="status" aria-live="polite" aria-atomic="true" className={styles.status}>
        {general && <p className={styles.alert}><AlertIcon size={18} />{AUTH_MESSAGES[general.error]}</p>}
        {onCode && !general && <p className={styles.sent}>Code sent to <b>{state.masked}</b>.</p>}
      </div>

      {onCode ? <>
        <input type="hidden" name="address" value={state.address ?? ''} />
        <CodeField key={state.sentAt} error={fieldError('code', 'code-error')} invalid={Boolean(errorFor('code'))} />
        <button className="sf-btn sf-btn--primary sf-btn--block" type="submit" name="intent" value="verify" disabled={pending} aria-busy={pending}>
          {pending ? <><span className="sf-spinner" aria-hidden="true" />Checking</> : 'Continue'}
        </button>
        <div className={styles.links}>
          <Resend sentAt={state.sentAt ?? 0} disabled={pending} />
          <button className="sf-btn sf-btn--ghost" type="submit" name="intent" value="change" formNoValidate disabled={pending}>
            Use a different {method === 'phone' ? 'number' : 'email'}
          </button>
        </div>
      </> : <>
        {PHONE_CODES_ENABLED && <div className="sf-tabs" role="tablist" aria-label="Sign in with">
          {(['phone', 'email'] as const).map(option => <button key={option} type="button" role="tab" aria-selected={method === option} onClick={() => { setMethod(option); setClientError(null) }}>
            {option === 'phone' ? 'Phone' : 'Email'}
          </button>)}
        </div>}
        <div className={`sf-field${errorFor('address') ? ' sf-field--error' : ''}`}>
          <label htmlFor="address">{method === 'phone' ? 'Mobile number' : 'Email'}</label>
          <div className={method === 'phone' ? styles.phone : undefined}>
            {method === 'phone' && <span className={styles.prefix} aria-hidden="true">+91</span>}
            <input id="address" key={method} name="address" className="sf-input" defaultValue={state.method === method ? state.address : undefined}
              type={method === 'phone' ? 'tel' : 'email'} inputMode={method === 'phone' ? 'numeric' : 'email'} autoComplete={method === 'phone' ? 'tel-national' : 'email'}
              placeholder={method === 'phone' ? '98765 43210' : 'name@example.com'} aria-invalid={Boolean(errorFor('address'))}
              aria-describedby={errorFor('address') ? 'address-error' : undefined} onChange={() => clientError?.field === 'address' && setClientError(null)} />
          </div>
          {fieldError('address', 'address-error')}
        </div>
        {mode === 'sign-up' && <div>
          <label className={`sf-choice${errorFor('consent') ? ` ${styles.invalid}` : ''}`}>
            <input type="checkbox" name="consent" aria-invalid={Boolean(errorFor('consent'))} aria-describedby={errorFor('consent') ? 'consent-error' : undefined}
              onChange={() => clientError?.field === 'consent' && setClientError(null)} />
            <span><b>I’m 21 or older and agree to the privacy note.</b><small><Link href="/#privacy">Read the privacy note</Link></small></span>
          </label>
          {fieldError('consent', 'consent-error')}
        </div>}
        <input name="company" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true" />
        <button className="sf-btn sf-btn--primary sf-btn--block" type="submit" name="intent" value="send" disabled={pending} aria-busy={pending}>
          {pending ? <><span className="sf-spinner" aria-hidden="true" />Sending</> : 'Send code'}
        </button>
      </>}
    </form>
  )
}

function CodeField({ error, invalid }: { error: ReactNode; invalid: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return <div className={`sf-field${invalid ? ' sf-field--error' : ''}`}>
    <label htmlFor="code">6-digit code</label>
    <input ref={ref} id="code" name="code" className={`sf-input ${styles.code}`} inputMode="numeric" autoComplete="one-time-code" maxLength={7}
      aria-invalid={invalid} aria-describedby={error ? 'code-error code-hint' : 'code-hint'} />
    <p id="code-hint" className="hint">It can take a minute to arrive. Check spam too.</p>
    {error}
  </div>
}

function Resend({ sentAt, disabled }: { sentAt: number; disabled: boolean }) {
  const left = () => Math.max(0, Math.ceil((sentAt + RESEND_SECONDS * 1000 - Date.now()) / 1000))
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  useEffect(() => {
    const tick = () => setSeconds(left())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentAt])
  return <button className="sf-btn sf-btn--ghost" type="submit" name="intent" value="resend" formNoValidate disabled={disabled || seconds > 0}>
    {seconds > 0 ? `Send a new code in ${seconds}s` : 'Send a new code'}
  </button>
}
