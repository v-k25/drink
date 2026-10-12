'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { pantryMatches, pantryVocabulary } from '../pantry'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

const storageKey = 'allcheers-pantry-session-v1'

export default function Pantry({ eligibleRows, matchingRows, returnTo }: { eligibleRows: RecipeRow[]; matchingRows: RecipeRow[]; returnTo: string }) {
  const vocabulary = pantryVocabulary(eligibleRows)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [storageBlocked, setStorageBlocked] = useState(false)
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
      const valid = new Set(vocabulary.map(item => item.ingredientId))
      if (Array.isArray(stored)) {
        const restored = [...new Set(stored.filter((id): id is string => typeof id === 'string' && valid.has(id)))]
        setSelected(restored)
        setOpen(restored.length > 0)
      }
    } catch { setStorageBlocked(true) }
    setReady(true)
  // The initial full eligible vocabulary validates restore, independently of temporary filters.
  }, [])
  useEffect(() => {
    if (!ready) return
    try { sessionStorage.setItem(storageKey, JSON.stringify(selected)) } catch { setStorageBlocked(true) }
  }, [ready, selected])
  useEffect(() => {
    if (open && window.location.hash.startsWith('#pantry-recipe-')) {
      try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView() } catch { /* Ignore malformed external fragments. */ }
    }
  }, [open])
  if (!ready) return null
  const valid = new Set(vocabulary.map(item => item.ingredientId))
  const selectedSet = new Set(selected.filter(id => valid.has(id)))
  const results = pantryMatches(matchingRows, selectedSet)
  const visible = vocabulary.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]) }
  function recipeHref(row: RecipeRow) {
    const back = `${returnTo.split('#')[0]}#pantry-recipe-${encodeURIComponent(row.id)}`
    return `/find-my-drink/${encodeURIComponent(row.id)}?from=${encodeURIComponent(back)}`
  }
  return <section className={styles.pantry} aria-label="Use what I have">
    <button type="button" className={styles.primary} aria-expanded={open} aria-controls="pantry-content" onClick={() => setOpen(value => !value)}>Use what I have</button>
    {open && <div id="pantry-content" className={styles.pantryContent}>
      <h2 id="pantry-title">Ingredients I have</h2>
      <p className={styles.hint}>Choose exact forms, including ice and garnish. This checklist lasts for this browsing session. It does not check how much you have.</p>
      {storageBlocked && <p role="status" className={styles.hint}>Browser storage is unavailable. Your selections work here, but cannot be retained when you leave or reload.</p>}
      <div className={styles.pantrySelected} aria-label="Selected ingredients">
        {vocabulary.filter(item => selectedSet.has(item.ingredientId)).map(item => <button type="button" className={styles.filterActive} key={item.ingredientId} onClick={() => toggle(item.ingredientId)} aria-label={`Remove ${item.label}`}>{item.label} ×</button>)}
        {selectedSet.size > 0 && <button type="button" className={styles.filter} onClick={() => setSelected([])}>Clear ingredients</button>}
      </div>
      <label className={styles.fieldLabel} htmlFor="pantry-search">Search the ingredient checklist</label>
      <input id="pantry-search" className={styles.pantrySearch} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try lime juice or ice" />
      <div className={styles.pantryChecklist}>
        {visible.map(item => <label key={item.ingredientId}><input type="checkbox" checked={selectedSet.has(item.ingredientId)} onChange={() => toggle(item.ingredientId)} /><span>{item.label}</span></label>)}
        {!visible.length && <p className={styles.hint}>No reviewed ingredient matches this search.</p>}
      </div>
      <p className={styles.hint}>Some recipes are not included in ingredient matching yet. <Link href="#ordinary-results">Browse the selected collection</Link>. Current recipe filters apply to all ingredient matches.</p>
      <div className={styles.pantryResultStatus} role="status" aria-live="polite">{selectedSet.size ? `${results.exact.length} ingredient ${results.exact.length === 1 ? 'match' : 'matches'}; ${results.oneAway.length} one ingredient away.` : 'Select ingredients to see reviewed matches.'}</div>
      {selectedSet.size > 0 && <>
        <h3>Ingredient matches</h3>
        <p className={styles.hint}>Ingredients match; check quantities and equipment.</p>
        {!results.exact.length && <p className={styles.hint}>No complete reviewed recipe matches your selected ingredients under these filters.</p>}
        <div className={styles.pantryMatches}>{results.exact.map(({ row, audit }) => <article className={styles.pantryMatch} id={`pantry-recipe-${row.id}`} key={row.id}><Link href={recipeHref(row)}>{row.name}</Link><p>Equipment: {audit.equipment.join(', ')}.</p><p>Check every quantity in the recipe before making.</p></article>)}</div>
        <h3>One ingredient away</h3>
        <p className={styles.hint}>Add the exact item shown; check all quantities and equipment. Unmeasured missing ice or garnish cannot appear here.</p>
        {!results.oneAway.length && <p className={styles.hint}>No reviewed recipe is exactly one recorded ingredient away under these filters.</p>}
        <div className={styles.pantryMatches}>{results.oneAway.map(({ row, audit, missing }) => <article className={styles.pantryMatch} id={`pantry-recipe-${row.id}`} key={row.id}><Link href={recipeHref(row)}>{row.name}</Link><p>Add {missing.label}: {missing.quantityText}.</p><p>Equipment: {audit.equipment.join(', ')}.</p></article>)}</div>
      </>}
    </div>}
  </section>
}
