'use client'

import { useActionState, useState } from 'react'
import { submitEarlyAccess, type EarlyAccessState } from './actions'

const interests = [
  ['find-my-sip', 'Finding my drink'],
  ['party-planner', 'Planning a party'],
  ['zero-percent', 'Non-alcoholic drinks'],
]

export default function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [preference, setPreference] = useState('undecided')
  const [consent, setConsent] = useState(false)
  const [jaipur, setJaipur] = useState(false)
  const [state, action, pending] = useActionState<EarlyAccessState, FormData>(async (previous, data) => {
    try {
      return await submitEarlyAccess(previous, data)
    } catch {
      return { status: 'error' }
    }
  }, { status: 'idle' })

  return (
    <div className="access-form-wrap">
      <div role="status" aria-live="polite" aria-atomic="true">
        {state.status === 'success' && <p className="form-message success">You&apos;re on the list. We&apos;ll be in touch when Socifer is ready for Jaipur.</p>}
        {state.status === 'duplicate' && <p className="form-message">That email is already on the list.</p>}
        {state.status === 'invalid' && <p className="form-message error">Please check the highlighted fields below.</p>}
        {state.status === 'error' && <p className="form-message error">We couldn&apos;t save that just now. Your entries are still here. Please try again.</p>}
      </div>
      {state.status !== 'success' && (
        <form action={action} onReset={event => event.preventDefault()} className="access-form" aria-busy={pending}>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined} />
          {state.fieldErrors?.email && <p id="email-error" className="error">{state.fieldErrors.email}</p>}
          <fieldset aria-describedby={state.fieldErrors?.interests ? 'interests-error' : undefined}>
            <legend>What are you interested in? <span className="optional">(optional)</span></legend>
            {interests.map(([value, label]) => (
              <label className="check-label" key={value}>
                <input type="checkbox" name="interests" value={value} checked={selected.includes(value)} onChange={e => setSelected(e.target.checked ? [...selected, value] : selected.filter(item => item !== value))} />
                {label}
              </label>
            ))}
            {state.fieldErrors?.interests && <p id="interests-error" className="error">{state.fieldErrors.interests}</p>}
          </fieldset>
          <label htmlFor="preference">Drinks preference <span className="optional">(optional)</span></label>
          <select id="preference" name="preference" value={preference} onChange={e => setPreference(e.target.value)}>
            <option value="undecided">I&apos;m undecided</option><option value="alcoholic">Alcoholic</option>
            <option value="zero">Non-alcoholic</option><option value="both">Both</option>
          </select>
          <label className="check-label">
            <input type="checkbox" name="interests" value="jaipur" required checked={jaipur} onChange={e => setJaipur(e.target.checked)} />
            I&apos;m joining early access for Jaipur.
          </label>
          <label className="check-label">
            <input type="checkbox" name="consent" required checked={consent} onChange={e => setConsent(e.target.checked)} aria-invalid={Boolean(state.fieldErrors?.consent)} aria-describedby="consent-note consent-error" />
            I agree to receive Socifer early-access and launch updates by email.
          </label>
          <p id="consent-note" className="fine-print">See how your signup information is used in our <a href="#privacy">early-access privacy information</a>.</p>
          <p id="consent-error" className="error">{state.fieldErrors?.consent}</p>
          <input name="company" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true" />
          <input type="hidden" name="cta_source" value="homepage" />
          <button className="button" type="submit" disabled={pending}>{pending ? 'Joining…' : 'Join early access'}</button>
        </form>
      )}
    </div>
  )
}
