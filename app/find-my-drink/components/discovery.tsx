'use client'

import { useEffect, useRef, useState } from 'react'
import RecipeCard from './recipe-card'
import { pickRecipeIds } from '../recipe'
import type { RecipeRow } from '../queries'
import { ShuffleIcon } from './icons'
import styles from '../finder.module.css'

export default function Discovery({ pool, initial, pageRows, returnTo, query }: {
  pool: RecipeRow[]; initial: RecipeRow[]; pageRows: RecipeRow[]; returnTo: string; query: string
}) {
  const [ready, setReady] = useState(false)
  const [choices, setChoices] = useState(initial)
  const [picked, setPicked] = useState(false)
  const [message, setMessage] = useState('')
  const seen = useRef(new Set(initial.map(row => row.id)))
  useEffect(() => { setReady(true) }, [])
  const sessionUrl = new URL(returnTo, 'https://allcheers.local')
  sessionUrl.searchParams.delete('pick')
  sessionUrl.searchParams.delete('cursor')
  const sessionKey = `allcheers-picks:${sessionUrl.pathname}${sessionUrl.search}:${pool.map(row => row.id).join(',')}`
  function pick() {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(sessionKey) ?? '[]')
      if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string') seen.current.add(id)
    } catch { /* Session continues if browser storage is blocked. */ }
    const ids = pickRecipeIds(pool.map(row => row.id), seen.current)
    if (!ids.length) { setMessage('All matching recipes shown'); return }
    ids.forEach(id => seen.current.add(id))
    setChoices(ids.map(id => pool.find(row => row.id === id)!))
    setPicked(true)
    setMessage(seen.current.size >= pool.length ? 'All matching recipes shown' : `${ids.length} fresh ${ids.length === 1 ? 'choice' : 'choices'} from your matches`)
    try { sessionStorage.setItem(sessionKey, JSON.stringify([...seen.current])) } catch { }
  }
  const chosen = new Set(choices.map(row => row.id))
  const choiceUrl = new URL(returnTo, 'https://allcheers.local')
  if (picked) choiceUrl.searchParams.set('pick', choices.map(row => row.id).join(','))
  const choiceReturn = `${choiceUrl.pathname}${choiceUrl.search}`
  const browse = [...pageRows, ...initial].filter(row => !chosen.has(row.id))
  function reason(row: RecipeRow): string {
    if (query) return row.name.toLowerCase().includes(query.toLowerCase()) ? `Name matches “${query}”` : `Ingredients include “${query}”`
    return row.preparationMethod ? `Recorded method: ${row.preparationMethod}` : `${row.ingredients.length} listed ingredients`
  }
  return <div className={styles.discovery}>
    {choices.length > 0 && <section aria-labelledby="choices-title">
      <div className={styles.sectionHeading}>
        <h2 id="choices-title">A few good choices<span className={styles.srOnly}> — a place to start</span></h2>
        {ready && <button type="button" className={styles.pickButton} onClick={pick}><ShuffleIcon />Pick for me</button>}
      </div>
      <p className={`${styles.pickStatus} ${styles.srOnly}`} role="status">{message || 'Selected from your current matches. Check the recipe quantities and equipment.'}</p>
      <div className={styles.choiceGrid}>{choices.map(row => <RecipeCard key={row.id} row={row} reason={reason(row)} returnTo={choiceReturn} asHeading />)}</div>
    </section>}
    {browse.length > 0 && <section id="all-matches" aria-labelledby="all-title">
      <div className={styles.sectionHeading}><h2 id="all-title">Browse all matches</h2></div>
      <div className={styles.productGrid}>{browse.map(row => <RecipeCard key={row.id} row={row} returnTo={returnTo} asHeading />)}</div>
    </section>}
  </div>
}
