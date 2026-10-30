'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BASES, discoveryCoverage, discoveryHref, parseDiscovery, rankRecipes, reasonText, recommendationPool, reviewedDiscovery, type DiscoveryState, type Taste, type DrinkType } from '../discovery'
import { capitalize, pickRecipeIds, safeResultsHref } from '../recipe'
import { PantryChecklist, usePantrySelection } from './pantry'
import RecipeCard from './recipe-card'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

const drinkLabels = { cocktail: 'Cocktail', mocktail: 'Mocktail', mixed: 'Both' }

function TasteChoices({ label, value, supported, onChange }: { label: string; value: Taste[]; supported: readonly Taste[]; onChange: (value: Taste[]) => void }) {
  if (!supported.length) return <p className={styles.hint}>No taste choices for this selection.</p>
  return <fieldset className={styles.guideFieldset}><legend>{label}</legend>
    <p className={styles.hint}>Up to two. Or skip it.</p>
    <div className={styles.guideChoices}>
      {supported.map(taste => <button key={taste} type="button" aria-pressed={value.includes(taste)} className={styles.filter} disabled={!value.includes(taste) && value.length >= 2} onClick={() => onChange(value.includes(taste) ? value.filter(t => t !== taste) : [...value, taste])}>{capitalize(taste)}</button>)}
      <button type="button" className={styles.filter} aria-pressed={!value.length} onClick={() => onChange([])}>Any</button>
    </div>
  </fieldset>
}

function PreferenceForm({ rows, value, ingredients, storageBlocked, onApply, onCancel }: {
  rows: RecipeRow[]; value: DiscoveryState; ingredients: string[]; storageBlocked: boolean
  onApply: (state: DiscoveryState, ingredients: string[]) => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  const [selected, setSelected] = useState(ingredients)
  const [notice, setNotice] = useState('')
  const coverage = discoveryCoverage(rows, draft, new Set(selected))
  function changeType(type: DrinkType) {
    if (type === 'mocktail' && draft.base) setNotice('Base cleared: it applies only to cocktails.')
    setDraft({ ...draft, type, base: type === 'mocktail' ? null : draft.base })
  }
  return <form className={styles.guidePreferences} onSubmit={event => { event.preventDefault(); onApply(draft, selected) }}>
    <fieldset className={styles.guideFieldset}><legend>Drink type</legend><div className={styles.guideChoices}>{(['cocktail','mocktail','mixed'] as const).map(type => <button key={type} type="button" className={styles.filter} aria-pressed={draft.type === type} onClick={() => changeType(type)}>{drinkLabels[type]}</button>)}</div></fieldset>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {draft.type === 'mixed' ? <>
      <TasteChoices label="Cocktail tastes" value={draft.cocktailTastes ?? draft.tastes} supported={discoveryCoverage(rows,{...draft,type:'cocktail'}).tastes} onChange={cocktailTastes => setDraft({...draft,cocktailTastes})} />
      <TasteChoices label="Mocktail tastes" value={draft.mocktailTastes ?? draft.tastes} supported={discoveryCoverage(rows,{...draft,type:'mocktail'}).tastes} onChange={mocktailTastes => setDraft({...draft,mocktailTastes})} />
    </> : <TasteChoices label="Taste" value={(draft.type === 'cocktail' ? draft.cocktailTastes : draft.mocktailTastes) ?? draft.tastes} supported={coverage.tastes} onChange={tastes => setDraft({...draft,tastes,cocktailTastes:null,mocktailTastes:null})} />}
    {draft.type !== 'mocktail' && (coverage.bases.length > 1 || draft.base) && <fieldset className={styles.guideFieldset}><legend>Base spirit (cocktails)</legend><div className={styles.guideChoices}>
      <button type="button" className={styles.filter} aria-pressed={!draft.base} onClick={() => setDraft({...draft,base:null})}>Any</button>
      {BASES.filter(base => base === 'beer' || base === draft.base || coverage.bases.some(item => item.base === base)).map(base => <button type="button" key={base} className={styles.filter} aria-pressed={draft.base === base} onClick={() => setDraft({...draft,base})}>{capitalize(base)}: {coverage.bases.find(item => item.base === base)?.count ?? 0}{base === 'champagne' ? ' recipe' : ''}</button>)}
    </div>{draft.base === 'beer' && <p className={styles.hint}>We don’t have beer recipes yet. Pick another base, or <Link href="/party-planner">browse products in Party Planner</Link>.</p>}
    {draft.base === 'champagne' && <p className={styles.hint}>Our wine recipes are champagne only.</p>}</fieldset>}
    {(coverage.methods.length > 1 || draft.method) && <label className={styles.guideLabel}>Method<select value={draft.method ?? ''} onChange={event => setDraft({...draft,method:event.target.value as DiscoveryState['method'] || null})}><option value="">Any</option>{[...new Set([...coverage.methods,...(draft.method ? [draft.method] : [])])].map(method => <option key={method} value={method}>{capitalize(method)}</option>)}</select></label>}
    {coverage.occasions.length > 0 && <label className={styles.guideLabel}>Occasion<select value={draft.occasion ?? ''} onChange={event => setDraft({...draft,occasion:event.target.value as DiscoveryState['occasion'] || null})}><option value="">Any</option>{coverage.occasions.map(occasion => <option key={occasion} value={occasion}>{occasion === 'after-dinner' ? 'After dinner' : 'Casual get-together'}</option>)}</select></label>}
    <label className={styles.guideLabel}>Name or ingredient<input type="search" maxLength={120} value={draft.q} onChange={event => setDraft({...draft,q:event.target.value})} placeholder="Any" /></label>
    <details className={styles.guideIngredientPicker}><summary>Ingredients I have ({selected.length})</summary><PantryChecklist eligibleRows={rows} selected={selected} onChange={ids => { setSelected(ids); if (!ids.length) setDraft({...draft,onlyIngredients:false}) }} storageBlocked={storageBlocked} /></details>
    <label className={styles.guideCheck}><input type="checkbox" disabled={!selected.length} checked={draft.onlyIngredients} onChange={event => setDraft({...draft,onlyIngredients:event.target.checked})} />Only recipes matching my ingredients</label>
    <div className={styles.dialogActions}><button className={styles.secondary} type="button" onClick={onCancel}>Cancel</button><button className={styles.primary} type="submit">Apply</button></div>
  </form>
}

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
    {row && <><RecipeCard row={row} returnTo={returnTo} asHeading tags={reviewedDiscovery(row)?.tastes} reviewedBase={reviewedDiscovery(row)?.primaryBase} />{reviewedDiscovery(row)?.pathNote && type === 'mocktail' && <p className={styles.hint}>{reviewedDiscovery(row)?.pathNote}</p>}</>}
    <div className={styles.randomActions}>
      {row && <Link className={styles.primary} href={`/find-my-drink/${encodeURIComponent(row.id)}?from=${encodeURIComponent(safeResultsHref(returnTo))}`}>View recipe</Link>}
      {ready && pool.length > 0 && <button className={styles.secondary} type="button" onClick={() => choose(exhausted)}>{exhausted ? 'Start again' : 'Pick for me'}</button>}
    </div>
    {blocked && <p className={styles.hint}>Browser storage is off. Repeats are only avoided while this screen stays open.</p>}
  </section>
}

export default function Guided({ rows, initial }: { rows: RecipeRow[]; initial: DiscoveryState }) {
  const [view, setView] = useState(initial)
  const [notice, setNotice] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [editing, setEditing] = useState(false)
  const { selected, setSelected, ready, storageBlocked } = usePantrySelection(rows)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const returnTo = discoveryHref(view)
  const selectedSet = new Set(selected)
  const coverage = discoveryCoverage(rows,view)
  function navigate(next: DiscoveryState, replace = false) {
    setView(next)
    if (replace) window.history.replaceState(null,'',discoveryHref(next))
    else window.history.pushState(null,'',discoveryHref(next))
  }
  useEffect(() => {
    const back = () => {
      const params = new URLSearchParams(window.location.search)
      const input = Object.fromEntries([...new Set(params.keys())].map(key => [key, params.getAll(key)]))
      setView(parseDiscovery(input)); setNotice('')
    }
    window.addEventListener('popstate',back)
    return () => window.removeEventListener('popstate',back)
  }, [])
  useEffect(() => { heading.current?.focus() }, [view.mode,view.stage])
  useEffect(() => {
    if (!ready || !window.location.hash.startsWith('#recipe-')) return
    try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView() } catch { /* Ignore malformed return fragments. */ }
  }, [ready, selected])
  useEffect(() => { if (editing) dialog.current?.querySelector<HTMLButtonElement>('button')?.focus() }, [editing])
  function closeEditor() { dialog.current?.close(); setEditing(false); editButton.current?.focus() }
  function apply(next: DiscoveryState, ingredients: string[]) {
    setNotice(view.base && next.type === 'mocktail' ? 'Base cleared: it applies only to cocktails.' : 'Preferences applied.')
    setSelected(ingredients)
    closeEditor()
    navigate({...next,mode:'guided',stage:'results',pick:null})
    setEditorKey(key => key + 1)
  }
  const results = (view.type === 'mixed' ? ['cocktail','mocktail'] as const : view.type ? [view.type] : []).map(type => ({
    type, items: rankRecipes(rows,view,type,selectedSet),
  }))
  const preferenceForm = <PreferenceForm key={editorKey + ':' + returnTo + ':' + ready} rows={rows} value={view} ingredients={selected} storageBlocked={storageBlocked} onApply={apply} onCancel={() => { closeEditor(); setEditorKey(key => key + 1) }} />
  const typeChoices = [['cocktail', 'With alcohol'], ['mocktail', 'No alcohol'], ['mixed', 'Two separate lists']] as const
  const summary = [view.type ? drinkLabels[view.type] : '', ...(view.tastes ?? [])].filter(Boolean).map(capitalize).join(' · ')
  const stageIndex = view.stage === 'type' ? 0 : view.stage === 'taste' ? 1 : 2
  const stages = <ol className={styles.stages + ' sf-stages'} aria-label="Steps">{['Type', 'Taste', 'Results'].map((label, index) => <li key={label} className={index < stageIndex ? 'done' : undefined} aria-current={index === stageIndex ? 'step' : undefined}>{label}</li>)}</ol>
  const back = <div className={styles.guideBack}><button type="button" className={styles.backLink} onClick={() => navigate({...view,mode:'entry',stage:'type',pick:null})}>← All ways to find a drink</button></div>
  return <div className={styles.guide}>
    <noscript><p className={styles.notice}>Guide me and Surprise me need JavaScript. <a href="/find-my-drink?mode=browse">Browse all</a> works without it.</p></noscript>
    {view.mode === 'entry' && <section className={styles.entry} aria-labelledby="entry-title">
      <h1 id="entry-title" ref={heading} tabIndex={-1}>Your next recipe starts here</h1>
      <p className={styles.lede}>{rows.length} cocktails and mocktails.</p>
      <div className={styles.routes}>
        <button type="button" className={`${styles.route} ${styles.routeLead}`} onClick={() => navigate({...view,mode:'guided',stage:'type'})}><span className={styles.routeIcon} aria-hidden="true">→</span><span><h2>Guide me</h2><p>Answer two questions.</p></span></button>
        <button type="button" className={styles.route} onClick={() => navigate({...view,mode:'random',randomType:null})}><span className={styles.routeIcon} aria-hidden="true">?</span><span><h2>Surprise me</h2><p>Get one at random.</p></span></button>
        <Link className={styles.route} href="/find-my-drink?mode=browse"><span className={styles.routeIcon} aria-hidden="true">≡</span><span><h2>Browse all</h2><p>See all {rows.length}.</p></span></Link>
        <Link className={styles.route} href="/find-my-drink?mode=browse#use-what-i-have"><span className={styles.routeIcon} aria-hidden="true">✓</span><span><h2>Use what I have</h2><p>Tick what’s in your kitchen.</p></span></Link>
      </div>
    </section>}
    {view.mode !== 'entry' && !(view.mode === 'guided' && view.stage === 'results') && back}
    {view.mode === 'guided' && view.stage !== 'results' && <section className={styles.guideSetup}>
      {stages}
      <h1 ref={heading} tabIndex={-1}>{view.stage === 'type' ? 'What are you making?' : 'Pick up to two tastes'}</h1>
      {view.stage === 'type' ? <fieldset className={styles.guideFieldset}><legend>Drink type</legend><div className={styles.choiceCards}>{typeChoices.map(([type, note]) => <button type="button" key={type} className={styles.choiceCard} aria-pressed={view.type === type} onClick={() => { if (type === 'mocktail' && view.base) setNotice('Base cleared: it applies only to cocktails.'); navigate({...view,type,base:type === 'mocktail' ? null : view.base,stage:'taste'}) }}><b>{drinkLabels[type]}</b><span>{note}</span></button>)}</div></fieldset>
      : <><TasteChoices label="Tastes" supported={coverage.tastes} value={view.tastes} onChange={tastes => navigate({...view,tastes,cocktailTastes:null,mocktailTastes:null},true)} />
      <div className={styles.guideActions}><button className={styles.primary} onClick={() => navigate({...view,stage:'results'})}>Show drinks</button><button className={styles.secondary} onClick={() => navigate({...view,tastes:[],cocktailTastes:null,mocktailTastes:null,stage:'results'})}>Skip</button><button className={styles.backLink} onClick={() => navigate({...view,stage:'type'})}>Back</button></div></>}
    </section>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {view.mode === 'random' && <section className={styles.guideSetup}>
      <h1 ref={heading} tabIndex={-1}>Surprise me</h1>
      <p className={styles.hint}>One at random. Taste, base and method don’t count. Your Guide me answers are kept.</p>
      <fieldset className={styles.guideFieldset}><legend>What kind of drink?</legend><div className={styles.guideChoices}>{(['cocktail','mocktail'] as const).map(type => <button type="button" className={styles.filter} aria-pressed={view.randomType === type} key={type} onClick={() => { if (view.randomType !== type) navigate({...view,randomType:type,pick:null}) }}>{drinkLabels[type]}</button>)}</div></fieldset>
      {view.randomType && <RandomRecipe key={view.randomType} rows={rows} type={view.randomType} requested={view.pick} onPick={pick => navigate({...view,pick},true)} returnTo={returnTo} />}
      {view.randomType && <button type="button" className={styles.backLink} onClick={() => navigate({...view,mode:'guided',type:view.randomType,base:view.randomType === 'mocktail' ? null : view.base,stage:'results',pick:null})}>Refine this choice</button>}
    </section>}
    {view.mode === 'guided' && view.stage === 'results' && <div className={styles.guideLayout}>
      {back}
      <header className={styles.guideResultHeading}><div><h1 ref={heading} tabIndex={-1}>A few good choices</h1><p className={styles.resultFacts}>{summary}</p></div>
        <button type="button" className={styles.secondary + ' ' + styles.guideEditButton} ref={editButton} onClick={() => { setEditing(true); setEditorKey(key => key + 1); dialog.current?.showModal() }}>Edit preferences</button>
      </header>
      <aside className={styles.guideDesktopPreferences} aria-label="Edit preferences"><h2>Your preferences</h2>{preferenceForm}</aside>
      <dialog ref={dialog} className={styles.guideDialog} aria-labelledby="guide-edit-title" onCancel={event => { event.preventDefault(); closeEditor() }} onClose={() => { setEditing(false); editButton.current?.focus() }}><div className={styles.dialogHeading}><h2 id="guide-edit-title">Edit preferences</h2><button type="button" className={styles.dialogClose} aria-label="Cancel and close" onClick={closeEditor}><span aria-hidden="true">✕</span></button></div>{editing && preferenceForm}</dialog>
      <div className={styles.guideResults}>
        <p className={styles.srOnly} role="status" aria-live="polite">{results.map(section => Math.min(3,section.items.length) + ' ' + (section.type === 'cocktail' ? 'cocktail' : 'mocktail') + ' picks').join('; ')}.</p>
        <p className={styles.hint}>Check quantities and equipment before you make anything.{selected.length > 0 ? ' Ingredient groups include ice and garnish; they don’t check how much you have.' : ''}</p>
        {results.map(({type,items}) => <section key={type} aria-labelledby={'guided-' + type}>
          <h2 id={'guided-' + type}>{type === 'cocktail' ? 'Cocktails' : 'Mocktails'}</h2>
          {type === 'cocktail' && <p className={styles.resultFacts}>Base spirit: {view.base ? capitalize(view.base) : 'Any'} · Method: {view.method ? capitalize(view.method) : 'Any'}</p>}
          {type === 'mocktail' && <p className={styles.hint}>Only recipes with a reviewed alcohol-free path. Follow any note on a recipe; this isn’t a 0.0% claim.</p>}
          {!items.length && <div className={styles.stateCard}><h2>{type === 'cocktail' && view.base === 'beer' ? 'We don’t have beer recipes yet' : 'No matches just yet'}</h2>{!(type === 'cocktail' && view.base === 'beer') && <p>Try Any base, Any method or fewer ingredients.</p>}{view.base === 'beer' && type === 'cocktail' && <Link className={styles.secondary} href="/party-planner">Browse products in Party Planner</Link>}</div>}
          {type === 'cocktail' && view.base === 'champagne' && <p className={styles.hint}>Champagne: {items.length} recipe{items.length === 1 ? '' : 's'}. Our wine recipes are champagne only.</p>}
          {(['exact','one-away','other'] as const).map(tier => { const shown=items.slice(0,3).filter(item=>item.tier===tier); return shown.length > 0 && <div key={tier}>
            {selected.length > 0 && <h3>{tier === 'exact' ? 'Ready to make' : tier === 'one-away' ? 'One ingredient away' : 'Other suggestions'}</h3>}
            <div className={styles.guideGrid}>{shown.map(item => <div key={item.row.id} className={styles.guideRecommendation}>
              <RecipeCard row={item.row} returnTo={returnTo} asHeading tags={item.review?.tastes} reviewedBase={item.review?.primaryBase} reason={item.reasons.length ? item.reasons.slice(0,2).map(reasonText).join(' ') : ((type === 'cocktail' ? view.cocktailTastes : view.mocktailTastes) ?? view.tastes).length ? 'No selected taste matched; another one to consider.' : undefined} />
              {item.review?.nonAlcoholicPath === 'reviewed' && item.review.pathNote && <p className={styles.hint}>{item.review.pathNote}</p>}
              {!item.pantryReviewed ? <p className={styles.hint}>Not in ingredient matching yet.</p> : item.tier === 'exact' ? <p className={styles.hint}>Uses your ingredients. Check quantities and equipment.</p> : item.missing ? <p className={styles.hint}>! Missing: {item.missing.label} ({item.missing.quantityText}).</p> : selected.length > 0 ? <p className={styles.hint}>Needs more ingredients, or one with no recorded quantity.</p> : null}
            </div>)}</div>
          </div> })}
        </section>)}
      </div>
    </div>}
  </div>
}
