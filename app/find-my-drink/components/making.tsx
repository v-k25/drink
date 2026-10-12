'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../finder.module.css'

type WakeLockLike = { release: () => Promise<void>; addEventListener: (type: string, listener: () => void) => void }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }


// Making experience for the detail page. Core content (ingredients, steps) is
// server-rendered in full; everything interactive mounts progressively:
// - ingredient checklist with native checkboxes (toggleable even without JS)
//   and a checked-progress line once mounted; the server-computed quantity note
//   (approximate metric conversions; shown when any line converted or stayed
//   ambiguous) renders near the checklist without waiting for JS;
// - honest servings scaling: only offered when every ingredient line carries a
//   validated numeric amount, otherwise a plain explanation and no scaling;
// - step mode (one step at a time) after mount, keyboard and touch operable;
// - Screen Wake Lock as a silent no-op where unsupported;
// - a sticky mobile bar with the honest making controls only — step mode and
//   keep-awake. No save/like controls exist in this phase, and none are faked.
export default function Making({ ingredients, steps, quantityNote }: { ingredients: string[]; steps: string[]; quantityNote?: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const [stepMode, setStepMode] = useState(false)
  const [step, setStep] = useState(0)
  const [wakeSupported, setWakeSupported] = useState(false)
  const [wakeHeld, setWakeHeld] = useState(false)
  const wakeRef = useRef<WakeLockLike | null>(null)
  const wakeWanted = useRef(false)
  const stepCounter = useRef<HTMLParagraphElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    setWakeSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator)
    return () => {
      wakeWanted.current = false
      wakeRef.current?.release().catch(() => { })
      wakeRef.current = null
    }
  }, [])
  // The wake lock auto-releases when the tab is hidden; re-request silently when
  // the tab becomes visible again and the visitor still wants it held.
  useEffect(() => {
    if (!wakeSupported) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wakeWanted.current && !wakeRef.current) void requestWake()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [wakeSupported])
  useEffect(() => { if (stepMode) stepCounter.current?.focus() }, [stepMode, step])

  async function requestWake() {
    try {
      const sentinel = await (navigator as WakeLockNavigator).wakeLock?.request('screen')
      if (!sentinel) return
      wakeRef.current = sentinel
      sentinel.addEventListener('release', () => { wakeRef.current = null; setWakeHeld(false) })
      setWakeHeld(true)
    } catch { setWakeHeld(false) }
  }

  async function toggleWake() {
    if (!wakeSupported) return
    if (wakeRef.current) {
      wakeWanted.current = false
      try { await wakeRef.current.release() } catch { }
      wakeRef.current = null
      setWakeHeld(false)
    } else {
      wakeWanted.current = true
      await requestWake()
    }
  }

  function toggleStepMode() {
    const next = !stepMode
    setStepMode(next)
    if (next) setStep(0)
  }

  function toggleChecked(index: number) {
    setChecked(current => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return <div className={styles.making}>
    <div id="ingredients" className={styles.makingBlock}>
      <h3>Ingredients</h3>
      {ingredients.length === 0
        ? <p className={styles.hint}>No ingredients are recorded for this recipe.</p>
        : <ul className={styles.checklist}>
            {ingredients.map((ingredient, index) => <li key={index} className={styles.checkItem}>
              <label htmlFor={`ingredient-${index + 1}`}>
                <input id={`ingredient-${index + 1}`} type="checkbox" checked={checked.has(index)} onChange={() => toggleChecked(index)} />
                <span>{ingredient}</span>
              </label>
            </li>)}
          </ul>}
      {ingredients.length > 0 && quantityNote && <p className={styles.hint}>{quantityNote}</p>}
      {mounted && ingredients.length > 0 && <p className={styles.progressLine} role="status">{checked.size} of {ingredients.length} ingredients gathered</p>}
      {mounted && ingredients.length > 0 && <p className={styles.hint}>Follow the quantities shown for this recipe.</p>}
    </div>
    <div id="method" className={styles.makingBlock}>
      <h3>Method</h3>
      {steps.length === 0
        ? <p className={styles.hint}>No method steps are recorded for this recipe.</p>
        : stepMode
          ? <div>
              <div className={styles.stepStage} key={step} aria-live="polite">
                <p className={styles.stepCounter} tabIndex={-1} ref={stepCounter}>Step {step + 1} of {steps.length}</p>
                <p className={styles.stepText}>{steps[step]}</p>
              </div>
              <div className={styles.stepNav}>
                <button className={styles.filter} onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0}>Previous</button>
                <button className={styles.filter} onClick={() => setStep(current => Math.min(steps.length - 1, current + 1))} disabled={step === steps.length - 1}>Next</button>
              </div>
            </div>
          : <ol className={styles.stepsList}>
              {steps.map((text, index) => <li key={index}>{text}</li>)}
            </ol>}
    </div>
    <div className={styles.makingBar} role="group" aria-label="Making controls">
      {mounted && <>
        <button className={styles.barButton} aria-pressed={stepMode} onClick={toggleStepMode}>{stepMode ? 'View all steps' : 'Step mode'}</button>
        {wakeSupported && <button className={styles.barButton} aria-pressed={wakeHeld} onClick={() => void toggleWake()}>{wakeHeld ? 'Keeping screen awake' : 'Keep screen awake'}</button>}
      </>}
    </div>
  </div>
}
