'use client'

import { useEffect, useRef, useState } from 'react'
import CookView, { type CookClose } from './cook-view'
import { START_MAKING_EVENT } from './start-button'
import styles from '../finder.module.css'

type WakeLockLike = { release: () => Promise<void>; addEventListener: (type: string, listener: () => void) => void }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }


// Making experience for the detail page. Core content (ingredients, steps) is
// server-rendered in full; everything interactive mounts progressively:
// - ingredient checklist with native checkboxes (toggleable even without JS)
//   and a checked-progress line once mounted; the server-computed quantity note
//   (approximate metric conversions; shown when any line converted or stayed
//   ambiguous) renders near the checklist without waiting for JS;
// - a full-screen step view (modal dialog, one step at a time) opened from the
//   page's "Start making" button, keyboard and touch operable;
// - Screen Wake Lock as a silent no-op where unsupported; its toggle lives in
//   the step view. No save/like controls exist in this phase, and none are faked.
export default function Making({ name, ingredients, steps, quantityNote }: { name: string; ingredients: string[]; steps: string[]; quantityNote?: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const [stepMode, setStepMode] = useState(false)
  const [wakeSupported, setWakeSupported] = useState(false)
  const [wakeHeld, setWakeHeld] = useState(false)
  const wakeRef = useRef<WakeLockLike | null>(null)
  const wakeWanted = useRef(false)

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
  useEffect(() => {
    const open = () => { if (steps.length > 0) setStepMode(true) }
    window.addEventListener(START_MAKING_EVENT, open)
    return () => window.removeEventListener(START_MAKING_EVENT, open)
  }, [steps.length])

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

  function closeCook(why: CookClose) {
    // The toggle only lives in the step view, so closing it lets the screen sleep again.
    if (wakeRef.current) void toggleWake()
    setStepMode(false)
    // Focus always returns to "Start making"; "View all steps" also brings the method into view.
    document.getElementById('start-making')?.focus({ preventScroll: why === 'method' })
    if (why === 'method') document.getElementById('method')?.scrollIntoView({ block: 'start' })
  }

  function toggleChecked(index: number) {
    setChecked(current => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const gathered = ingredients.length > 0 ? Math.round((checked.size / ingredients.length) * 100) : 0
  return <div className={styles.making}>
    <div id="ingredients" className={`${styles.makingBlock} ${styles.ingredientsBlock}`}>
      <h3>Ingredients</h3>
      {ingredients.length === 0
        ? <p className={styles.hint}>No ingredients are recorded for this recipe.</p>
        : <ul className={styles.checklist}>
            {ingredients.map((ingredient, index) => {
              const [amount, rest] = splitAmount(ingredient)
              return <li key={index} className={styles.checkItem}>
                <label htmlFor={`ingredient-${index + 1}`}>
                  <input id={`ingredient-${index + 1}`} type="checkbox" checked={checked.has(index)} onChange={() => toggleChecked(index)} />
                  <span className={styles.ingredientText}>{amount && <b>{amount}</b>}{amount && ' '}{rest}</span>
                </label>
              </li>
            })}
          </ul>}
      {mounted && ingredients.length > 0 && <div className={styles.gather}>
        <p className={styles.progressLine} role="status">{checked.size} of {ingredients.length} ingredients gathered</p>
        <div className={styles.gatherBar} aria-hidden="true"><span style={{ width: `${gathered}%` }} /></div>
      </div>}
      {ingredients.length > 0 && quantityNote && <p className={`${styles.hint} ${styles.quantityNote}`}>{quantityNote}</p>}
    </div>
    <div id="method" className={styles.makingBlock}>
      <h3>Method</h3>
      {steps.length === 0
        ? <p className={styles.hint}>No method steps are recorded for this recipe.</p>
        : <ol className={styles.stepsList}>
            {steps.map((text, index) => <li key={index}>{text}</li>)}
          </ol>}
    </div>
    {stepMode && steps.length > 0 && <CookView name={name} steps={steps} ingredients={ingredients} wakeSupported={wakeSupported} wakeHeld={wakeHeld} onToggleWake={() => void toggleWake()} onClose={closeCook} />}
  </div>
}

// Presentation only: bold the leading amount ("~44 mL") when a display line
// starts with one. The two pieces always rejoin to the exact display string.
const AMOUNT = /^~?\d[\d.,/¼-¾⅐-⅞\s-]*(?:\s*(?:mL|ml|g|kg|l|oz|ounces?|cups?|tbsp|tsp|dash(?:es)?|pinch(?:es)?|wedges?|slices?|pieces?|sprigs?|leaves|drops?|cubes?|scoops?|whole|cans?|bottles?)\.?)?(?:\s*\(by volume\))?(?=\s|$)/i

function splitAmount(display: string): [string, string] {
  const match = AMOUNT.exec(display)
  if (!match) return ['', display]
  const amount = match[0].trim()
  const rest = display.slice(match[0].length).trim()
  if (!amount || !rest || `${amount} ${rest}` !== display) return ['', display]
  return [amount, rest]
}
