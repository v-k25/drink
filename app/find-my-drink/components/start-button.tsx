'use client'

import { useEffect, useState } from 'react'
import styles from '../finder.module.css'

export const START_MAKING_EVENT = 'socifer:start-making'

// Primary call to action on the recipe page. Without JavaScript it is a plain
// jump to the method; once mounted it opens the full-screen step view owned by
// the making section (focus returns here when the step view closes).
export default function StartButton({ hasSteps }: { hasSteps: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !hasSteps) return <a id="start-making" href="#method" className={styles.primary}>Start making</a>
  return <button id="start-making" type="button" className={styles.primary} aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event(START_MAKING_EVENT))}>Start making</button>
}
