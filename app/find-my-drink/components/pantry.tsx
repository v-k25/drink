'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { pantryMatches, pantryVocabulary } from '../pantry'
import type { RecipeRow } from '../queries'
import { BasketIcon } from './icons'
import styles from '../finder.module.css'

const storageKey = 'allcheers-pantry-session-v1'

export default function Pantry({ eligibleRows, matchingRows, returnTo }: { eligibleRows: RecipeRow[]; matchingRows: RecipeRow[]; returnTo: string }) {
  const vocabulary = pantryVocabulary(eligibleRows)
  const { selected, setSelected, ready, storageBlocked } = usePantrySelection(eligibleRows)
  const [open, setOpen] = useState(false)
  useEffect(() => { if (ready && (selected.length || window.location.hash === '#use-what-i-have')) setOpen(true) }, [ready])
  useEffect(() => {
    if (open && window.location.hash.startsWith('#pantry-recipe-')) {
      try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView() } catch { /* Ignore malformed external fragments. */ }
    }
  }, [open])
  if (!ready) return null
  const valid = new Set(vocabulary.map(item => item.ingredientId))
  const selectedSet = new Set(selected.filter(id => valid.has(id)))
  const results = pantryMatches(matchingRows, selectedSet)
  function recipeHref(row: RecipeRow) {
    const back = `${returnTo.split('#')[0]}#pantry-recipe-${encodeURIComponent(row.id)}`
    return `/find-my-drink/${encodeURIComponent(row.id)}?from=${encodeURIComponent(back)}`
  }
  return <section id="use-what-i-have" className={styles.pantry} aria-label="Use what I have">
    <button type="button" className={styles.pantryToggle} aria-expanded={open} aria-controls="pantry-content" onClick={() => setOpen(value => !value)}><BasketIcon />Use what I have</button>
    {open && <div id="pantry-content" className={styles.pantryContent}>
      <h2 id="pantry-title">Ingredients I have</h2>
      <PantryChecklist eligibleRows={eligibleRows} selected={selected} onChange={setSelected} storageBlocked={storageBlocked} />
      <p className={styles.hint}>Check quantities and equipment. Some recipes aren’t in ingredient matching yet. <Link href="#ordinary-results">Browse all matches</Link></p>
      <div className={`${styles.pantryResultStatus} ${styles.srOnly}`} role="status" aria-live="polite">{selectedSet.size ? `${results.exact.length} ready to make; ${results.oneAway.length} one ingredient away.` : 'Tick ingredients to see matches.'}</div>
      {selectedSet.size > 0 && <>
        <h3>Ready to make · {results.exact.length}</h3>
        {!results.exact.length && <p className={styles.hint}>Nothing is ready to make with these ingredients and filters.</p>}
        <div className={styles.pantryMatches}>{results.exact.map(({ row, audit }) => <article className={styles.pantryMatch} id={`pantry-recipe-${row.id}`} key={row.id}><Link href={recipeHref(row)}>{row.name}</Link><p>Equipment: {audit.equipment.join(', ')}.</p></article>)}</div>
        <h3>One ingredient away · {results.oneAway.length}</h3>
        {!results.oneAway.length && <p className={styles.hint}>Nothing is one ingredient away under these filters.</p>}
        <div className={styles.pantryMatches}>{results.oneAway.map(({ row, audit, missing }) => <article className={styles.pantryMatch} id={`pantry-recipe-${row.id}`} key={row.id}><Link href={recipeHref(row)}>{row.name}</Link><span className={styles.missingTag}><span aria-hidden="true">! </span>Missing: {missing.label}</span><p>Add {missing.quantityText}.</p><p>Equipment: {audit.equipment.join(', ')}.</p></article>)}</div>
      </>}
    </div>}
  </section>
}


export function usePantrySelection(eligibleRows: RecipeRow[]) {
  const vocabulary = pantryVocabulary(eligibleRows)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [storageBlocked, setStorageBlocked] = useState(false)
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
      const valid = new Set(vocabulary.map(item => item.ingredientId))
      if (Array.isArray(stored)) setSelected([...new Set(stored.filter((id): id is string => typeof id === 'string' && valid.has(id)))])
    } catch { setStorageBlocked(true) }
    setReady(true)
  // Restore against the full eligible vocabulary, not temporary filters.
  }, [])
  useEffect(() => {
    if (!ready) return
    try { sessionStorage.setItem(storageKey, JSON.stringify(selected)) } catch { setStorageBlocked(true) }
  }, [ready, selected])
  return { selected, setSelected, ready, storageBlocked }
}

export function PantryChecklist({ eligibleRows, selected, onChange, storageBlocked = false }: {
  eligibleRows: RecipeRow[]; selected: string[]; onChange: (ids: string[]) => void; storageBlocked?: boolean
}) {
  const [search, setSearch] = useState('')
  const vocabulary = pantryVocabulary(eligibleRows)
  const selectedSet = new Set(selected)
  const visible = vocabulary.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
  function toggle(id: string) { onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]) }
  return <div className={styles.pantryContent}>
    <p className={styles.hint}>Tick exact forms, including ice and any required garnish. Optional ingredients aren’t required.</p>
    {storageBlocked && <p role="status" className={styles.hint}>Browser storage is off. Your ticks work here but won’t be kept when you leave.</p>}
    {selected.length > 0 && <p className={styles.hint} role="status">{selected.length} ticked</p>}
    <div className={styles.pantrySelected} role="group" aria-label="Selected ingredients">
      {vocabulary.filter(item => selectedSet.has(item.ingredientId)).map(item => <button type="button" className={styles.filterActive} key={item.ingredientId} onClick={() => toggle(item.ingredientId)} aria-label={'Remove ' + item.label}>{item.label} ✕</button>)}
      {selected.length > 0 && <button type="button" className={styles.filter} onClick={() => onChange([])}>Clear</button>}
    </div>
    <label className={styles.guideLabel}>Search ingredients<input className={styles.pantrySearch} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ingredients" /></label>
    <div className={styles.pantryChecklist}>
      {visible.map(item => <label key={item.ingredientId}><input type="checkbox" checked={selectedSet.has(item.ingredientId)} onChange={() => toggle(item.ingredientId)} /><span>{item.label}</span></label>)}
      {!visible.length && <p className={styles.hint}>No ingredient matches that search.</p>}
    </div>
  </div>
}
