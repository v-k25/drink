'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../finder.module.css'

export type CookClose = 'dismiss' | 'method'

const sun = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
const list = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>

// Full-screen cook view: a modal dialog (native focus trap, Escape closes) that
// shows one step at a time. Ingredients appear as plain text only.
export default function CookView({ name, steps, ingredients, wakeSupported, wakeHeld, onToggleWake, onClose }: {
  name: string; steps: string[]; ingredients: string[]
  wakeSupported: boolean; wakeHeld: boolean; onToggleWake: () => void; onClose: (reason: CookClose) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const reason = useRef<CookClose>('dismiss')
  const [step, setStep] = useState(0)
  const last = step === steps.length - 1

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (!node.open) node.showModal()
    nextButton.current?.focus()
  }, [])

  // If the focused "Previous" just became disabled (back at step 1), keep focus in the dialog.
  useEffect(() => {
    if (document.activeElement === document.body || document.activeElement === dialog.current) nextButton.current?.focus()
  }, [step])

  // Arrow keys step through the recipe. Listening on the window keeps them
  // working when focus falls back to the page after a button becomes disabled.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key === 'ArrowRight') { event.preventDefault(); setStep(current => Math.min(steps.length - 1, current + 1)) }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); setStep(current => Math.max(0, current - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length])

  function close(why: CookClose) {
    reason.current = why
    dialog.current?.close()
  }
  function go(index: number) { setStep(Math.max(0, Math.min(steps.length - 1, index))) }

  return <dialog
    ref={dialog}
    className={styles.cook}
    aria-label={`Making ${name}`}
    onClose={() => onClose(reason.current)}
  >
    <div className={styles.cookBar}>
      <h2 className={styles.cookName}>{name}</h2>
      <div className={styles.cookTools}>
        {wakeSupported && <button type="button" className={styles.cookTool} aria-pressed={wakeHeld} onClick={onToggleWake}>{sun}<span>Keep screen awake</span></button>}
        <button type="button" className={styles.cookTool} onClick={() => close('method')}>{list}<span>View all steps</span></button>
        <button type="button" className={`${styles.cookTool} ${styles.cookClose}`} aria-label="Close" onClick={() => close('dismiss')}><span aria-hidden="true">✕</span></button>
      </div>
    </div>
    <div className={styles.cookProgress}>
      <p className={styles.stepCounter}>Step {step + 1} of {steps.length}</p>
      <div className={styles.segments} role="group" aria-label="Steps">
        {steps.map((_, index) => <button key={index} type="button" className={styles.segment} aria-label={`Go to step ${index + 1}`} aria-current={index === step ? 'step' : undefined} data-done={index <= step} onClick={() => go(index)}><span /></button>)}
      </div>
    </div>
    <div className={styles.cookCentre} aria-live="polite">
      <div className={styles.stepStage} key={step}>
        <p className={styles.stepText}>{steps[step]}</p>
        {!last && <p className={styles.nextUp}>Next: {steps[step + 1]}</p>}
      </div>
    </div>
    {ingredients.length > 0 && <details className={styles.cookIngredients}>
      <summary>Ingredients</summary>
      <ul>{ingredients.map((ingredient, index) => <li key={index}>{ingredient}</li>)}</ul>
    </details>}
    <div className={styles.cookNav}>
      <button type="button" className={styles.cookPrev} disabled={step === 0} onClick={() => go(step - 1)}>Previous</button>
      {last
        ? <button ref={nextButton} type="button" className={styles.cookNext} onClick={() => close('dismiss')}>Done</button>
        : <button ref={nextButton} type="button" className={styles.cookNext} onClick={() => go(step + 1)}>Next</button>}
    </div>
  </dialog>
}
