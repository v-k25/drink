'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { submitEarlyAccess, type EarlyAccessState } from '@/app/early-access/actions'
import { trackEvent } from '@/lib/analytics'

const cardClasses = 'border border-foreground/20 bg-card p-6 shadow-[18px_18px_0_var(--primary)] md:p-8'
const labelClasses = 'text-xs font-bold uppercase tracking-[0.14em]'

const chipSpanClasses =
  'inline-flex items-center border border-foreground/25 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] transition-colors hover:border-foreground peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring'

const interests: Array<{ value: string; label: string }> = [
  { value: 'find-my-sip', label: 'Find My Sip' },
  { value: 'party-planner', label: 'Party Planner' },
  { value: 'zero-percent', label: '0% path' },
  { value: 'jaipur', label: 'Jaipur launch updates' },
]

const preferences: Array<{ value: string; label: string }> = [
  { value: 'alcoholic', label: 'Alcoholic' },
  { value: 'zero', label: '0%' },
  { value: 'both', label: 'Both' },
  { value: 'undecided', label: 'Not sure yet' },
]

export function EarlyAccessForm({ source }: { source: string | null }) {
  const [state, formAction, pending] = useActionState(submitEarlyAccess, { status: 'idle' } as EarlyAccessState)

  const viewedRef = useRef(false)
  const startedRef = useRef(false)
  const lastReported = useRef<EarlyAccessState | null>(null)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    trackEvent('early_access_viewed')
  }, [])

  useEffect(() => {
    if (lastReported.current === state) return
    lastReported.current = state
    if (state.status === 'success') {
      trackEvent('early_access_succeeded', { result: 'new' })
    } else if (state.status === 'duplicate') {
      trackEvent('early_access_succeeded', { result: 'duplicate' })
    } else if (state.status === 'invalid') {
      trackEvent('early_access_failed', { reason: 'invalid' })
    } else if (state.status === 'error') {
      trackEvent('early_access_failed', { reason: 'error' })
    }
  }, [state])

  function handleFocusCapture() {
    if (startedRef.current) return
    startedRef.current = true
    trackEvent('early_access_started')
  }

  function handleSubmit() {
    trackEvent('early_access_submitted')
  }

  if (state.status === 'success' || state.status === 'duplicate') {
    return (
      <div role="status" className={`${cardClasses} flex flex-col gap-5`}>
        <h2 className="font-serif text-4xl">
          {state.status === 'success' ? "You're on the Jaipur list." : "You're already on the list."}
        </h2>
        {state.status === 'success' ? (
          <p className="leading-relaxed text-muted-foreground">
            We{"'"}ll write when previews and the first invitation are ready. Meanwhile, the guides and the 0%
            story are already live —{' '}
            <Link href="/guides" className="font-bold underline underline-offset-4">
              Read the guides
            </Link>{' '}
            ·{' '}
            <Link href="/zero-percent" className="font-bold underline underline-offset-4">
              Explore the 0% path
            </Link>
          </p>
        ) : (
          <p className="leading-relaxed text-muted-foreground">
            Thanks for confirming your interest — your original preferences are safe with us.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      action={formAction}
      onFocusCapture={handleFocusCapture}
      onSubmit={handleSubmit}
      className={`${cardClasses} flex flex-col gap-7`}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="ea-email" className={labelClasses}>
          Email
        </label>
        <input
          id="ea-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          aria-invalid={!!state.fieldErrors?.email}
          aria-describedby={state.fieldErrors?.email ? 'ea-email-error' : undefined}
          className="w-full border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
        {state.fieldErrors?.email ? (
          <p id="ea-email-error" className="text-sm text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={state.fieldErrors?.interests ? 'ea-interests-error' : undefined}
      >
        <legend className={`${labelClasses} mb-3`}>What should we build first? Choose at least one.</legend>
        <div className="flex flex-wrap gap-3">
          {interests.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="checkbox"
                name="interests"
                value={option.value}
                className="peer sr-only"
                defaultChecked={state.values?.interests?.includes(option.value)}
              />
              <span className={chipSpanClasses}>{option.label}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.interests ? (
          <p id="ea-interests-error" className="text-sm text-destructive">
            {state.fieldErrors.interests}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${labelClasses} mb-3`}>What do you usually drink? Optional.</legend>
        <div className="flex flex-wrap gap-3">
          {preferences.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="preference"
                value={option.value}
                className="peer sr-only"
                defaultChecked={state.values?.preference === option.value}
              />
              <span className={chipSpanClasses}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <input
            id="ea-consent"
            type="checkbox"
            name="consent"
            required
            aria-invalid={!!state.fieldErrors?.consent}
            aria-describedby={state.fieldErrors?.consent ? 'ea-consent-error' : undefined}
            className="mt-1 size-4 accent-[var(--primary)]"
          />
          <label htmlFor="ea-consent" className="text-sm leading-relaxed text-muted-foreground">
            I agree to be contacted about the Jaipur launch and understand how my data is used.
          </label>
        </div>
        {state.fieldErrors?.consent ? (
          <p id="ea-consent-error" className="text-sm text-destructive">
            {state.fieldErrors.consent}
          </p>
        ) : null}
      </div>

      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <input type="hidden" name="cta_source" value={source ?? ''} />

      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          Something didn{"'"}t pour. Please try again in a moment, or write to hello@mywebsite.in.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-3 bg-primary px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? 'Joining…' : 'Join the Jaipur list'}
      </button>
    </form>
  )
}
