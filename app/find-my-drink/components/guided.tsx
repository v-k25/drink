'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { discoveryHref, parseDiscovery, recommendationPool, reviewedDiscovery, type DiscoveryState } from '../discovery'
import { pickRecipeIds, safeResultsHref } from '../recipe'
import { ArrowLeftIcon } from '../../icons'
import RecipeCard from './recipe-card'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

// Surprise me (mode=random): one recipe at random, no repeats until you start again.
// Find a Drink's questions moved to finder.tsx in the tools redesign (TR3); the back link keeps their answers.
const drinkLabels = { cocktail: 'Cocktail', mocktail: 'Mocktail' }

function RandomRecipe({ rows, type, requested, onPick, returnTo }: { rows: RecipeRow[]; type: 'cocktail' | 'mocktail'; requested: string | null; onPick: (id: string) => void; returnTo: string }) {
  const pool = recommendationPool(rows,type)
  const ids = pool.map(row => row.id)
  const [current, setCurrent] = useState<string | null>(ids.includes(requested ?? '') ? requested : null)
  const [ready, setReady] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const seen = useRef(new Set<string>())
  const initialized = useRef(false)
  const key = 'socifer-surprise-v1:' + type
  function choose(restart = false) {
    if (restart) seen.current.clear()
    const id = pickRecipeIds(ids,seen.current,Math.random,1)[0]
    if (!id) { setExhausted(true); return }
    seen.current.add(id)
    setCurrent(id)
    setExhausted(seen.current.size >= pool.length)
    onPick(id)
    try { sessionStorage.setItem(key,JSON.stringify([...seen.current])) } catch { setBlocked(true) }
  }
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]')
      if (Array.isArray(stored)) seen.current = new Set(stored.filter((id): id is string => typeof id === 'string' && ids.includes(id)))
    } catch { setBlocked(true) }
    if (current) {
      seen.current.add(current)
      try { sessionStorage.setItem(key,JSON.stringify([...seen.current])) } catch { setBlocked(true) }
      setExhausted(seen.current.size >= pool.length)
    } else choose()
    setReady(true)
  }, [])
  const row = pool.find(row => row.id === current)
  const kind = type === 'mocktail' ? 'mocktail' : 'cocktail'
  return <section className={styles.guideRandom} aria-label="Random recipe">
    <p className={styles.hint} role="status">{!pool.length ? `No ${kind} recipes are available for Surprise me.` : pool.length === 1 ? `This is the only ${kind} recipe.` : exhausted ? `You’ve seen all ${pool.length} ${kind}s.` : 'No repeats until you start again.'}</p>
    {row && <><RecipeCard row={row} returnTo={returnTo} asHeading reviewedBase={reviewedDiscovery(row)?.primaryBase} showType={false} />{reviewedDiscovery(row)?.pathNote && type === 'mocktail' && <p className={styles.hint}>{reviewedDiscovery(row)?.pathNote}</p>}</>}
    <div className={styles.randomActions}>
      {row && <Link className={styles.primary} href={`/find-my-drink/${encodeURIComponent(row.id)}?from=${encodeURIComponent(safeResultsHref(returnTo))}`}>View recipe</Link>}
      {ready && pool.length > 0 && <button className={styles.secondary} type="button" onClick={() => choose(exhausted)}>{exhausted ? 'Start again' : 'Pick for me'}</button>}
    </div>
    {blocked && <p className={styles.hint}>Browser storage is off. Repeats are only avoided while this screen stays open.</p>}
  </section>
}

export default function Guided({ rows, initial }: { rows: RecipeRow[]; initial: DiscoveryState }) {
  const [view, setView] = useState(initial)
  const heading = useRef<HTMLHeadingElement>(null)
  const returnTo = discoveryHref(view)
  function navigate(next: DiscoveryState, replace = false) {
    setView(next)
    if (replace) window.history.replaceState(null,'',discoveryHref(next))
    else window.history.pushState(null,'',discoveryHref(next))
  }
  useEffect(() => {
    const back = () => {
      const params = new URLSearchParams(window.location.search)
      const input = Object.fromEntries([...new Set(params.keys())].map(key => [key, params.getAll(key)]))
      setView(parseDiscovery(input))
    }
    window.addEventListener('popstate',back)
    return () => window.removeEventListener('popstate',back)
  }, [])
  useEffect(() => { heading.current?.focus() }, [])

  return <div className={styles.guide}>
    <noscript><p className={styles.notice}>Surprise me needs JavaScript. <a href="/find-my-drink?mode=browse">Browse all</a> works without it.</p></noscript>
    <div className={styles.guideBack}><Link className={styles.backLink} href={discoveryHref({ ...view, mode: 'guided', stage: 'results', pick: null })}><ArrowLeftIcon size={18} />Back to Find a Drink</Link></div>
    {view.mode === 'random' && <section className={styles.guideSetup}>
      <h1 ref={heading} tabIndex={-1}>Surprise me</h1>
      <p className={styles.hint}>One at random. Your Guide me answers are kept.</p>
      <fieldset className={styles.guideFieldset}><legend>What kind of drink?</legend><div className={styles.guideChoices}>{(['cocktail','mocktail'] as const).map(type => <button type="button" className={styles.filter} aria-pressed={view.randomType === type} key={type} onClick={() => { if (view.randomType !== type) navigate({...view,randomType:type,pick:null}) }}>{drinkLabels[type]}</button>)}</div></fieldset>
      {view.randomType && <RandomRecipe key={view.randomType} rows={rows} type={view.randomType} requested={view.pick} onPick={pick => navigate({...view,pick},true)} returnTo={returnTo} />}
    </section>}
  </div>
}
