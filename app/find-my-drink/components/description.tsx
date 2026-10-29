'use client'

import { useState } from 'react'
import styles from '../finder.module.css'

// Long descriptions are clamped to three lines on small screens with a real
// toggle; the full text is always in the DOM.
export default function Description({ text }: { text: string }) {
  const long = text.length > 150
  const [open, setOpen] = useState(false)
  return <div className={styles.descriptionWrap}>
    <p className={`${styles.description} ${long && !open ? styles.descriptionClamp : ''}`}>{text}</p>
    {long && <button type="button" className={styles.moreText} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Less' : 'More'}</button>}
  </div>
}
