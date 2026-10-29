'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BASES, discoveryCoverage, discoveryHref, parseDiscovery, rankRecipes, reasonText, recommendationPool, reviewedDiscovery, type DiscoveryState, type Taste, type DrinkType } from '../discovery'
import { capitalize, pickRecipeIds } from '../recipe'
import { PantryChecklist, usePantrySelection } from './pantry'
import RecipeCard from './recipe-card'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

const drinkLabels = { cocktail: 'Alcoholic', mocktail: 'Non-alcoholic', mixed: 'Both for a group' }

function TasteChoices({ label, value, supported, onChange }: { label: string; value: Taste[]; supported: readonly Taste[]; onChange: (value: Taste[]) => void }) {
  if (!supported.length) return <p className={styles.hint}>No reviewed taste choices for this selection.</p>
  return <fieldset className={styles.guideFieldset}><legend>{label}</legend>
    <p className={styles.hint}>Choose up to two, or skip.</p>
    <div className={styles.guideChoices}>
      {supported.map(taste => <button key={taste} type="button" aria-pressed={value.includes(taste)} className={value.includes(taste) ? styles.filterActive : styles.filter} disabled={!value.includes(taste) && value.length >= 2} onClick={() => onChange(value.includes(taste) ? value.filter(t => t !== taste) : [...value, taste])}>{capitalize(taste)}</button>)}
      <button type="button" className={!value.length ? styles.filterActive : styles.filter} aria-pressed={!value.length} onClick={() => onChange([])}>I’m open to anything</button>
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
    if (type === 'mocktail' && draft.base) setNotice('Base cleared: it applies only to alcoholic recipes.')
    setDraft({ ...draft, type, base: type === 'mocktail' ? null : draft.base })
  }
  return <form className={styles.guidePreferences} onSubmit={event => { event.preventDefault(); onApply(draft, selected) }}>
    <fieldset className={styles.guideFieldset}><legend>Drink type</legend><div className={styles.guideChoices}>{(['cocktail','mocktail','mixed'] as const).map(type => <button key={type} type="button" className={draft.type === type ? styles.filterActive : styles.filter} aria-pressed={draft.type === type} onClick={() => changeType(type)}>{drinkLabels[type]}</button>)}</div></fieldset>
    {notice && <p role="status" className={styles.hint}>{notice}</p>}
    {draft.type === 'mixed' ? <>
      <TasteChoices label="Alcoholic tastes" value={draft.cocktailTastes ?? draft.tastes} supported={discoveryCoverage(rows,{...draft,type:'cocktail'}).tastes} onChange={cocktailTastes => setDraft({...draft,cocktailTastes})} />
      <TasteChoices label="Non-alcoholic tastes" value={draft.mocktailTastes ?? draft.tastes} supported={discoveryCoverage(rows,{...draft,type:'mocktail'}).tastes} onChange={mocktailTastes => setDraft({...draft,mocktailTastes})} />
    </> : <TasteChoices label="Taste" value={(draft.type === 'cocktail' ? draft.cocktailTastes : draft.mocktailTastes) ?? draft.tastes} supported={coverage.tastes} onChange={tastes => setDraft({...draft,tastes,cocktailTastes:null,mocktailTastes:null})} />}
    {draft.type !== 'mocktail' && (coverage.bases.length > 1 || draft.base) && <fieldset className={styles.guideFieldset}><legend>Base — optional{draft.type === 'mixed' ? ' (alcoholic recipes only)' : ''}</legend><div className={styles.guideChoices}>
      <button type="button" className={!draft.base ? styles.filterActive : styles.filter} aria-pressed={!draft.base} onClick={() => setDraft({...draft,base:null})}>Any base</button>
      {BASES.filter(base => base === 'beer' || base === draft.base || coverage.bases.some(item => item.base === base)).map(base => <button type="button" key={base} className={draft.base === base ? styles.filterActive : styles.filter} aria-pressed={draft.base === base} onClick={() => setDraft({...draft,base})}>{capitalize(base)}: {coverage.bases.find(item => item.base === base)?.count ?? 0}{base === 'champagne' ? ' recipe' : ''}</button>)}
    </div>{draft.base === 'beer' && <p className={styles.hint}>We don’t have beer recipes yet. Choose another base or <Link href="/party-planner">browse products in Party Planner</Link>.</p>}
    {draft.base === 'champagne' && <p className={styles.hint}>Wine coverage is limited to champagne. We have no red, white or rosé wine recipes.</p>}</fieldset>}
    {(coverage.methods.length > 1 || draft.method) && <label className={styles.guideLabel}>Preparation method — optional<select value={draft.method ?? ''} onChange={event => setDraft({...draft,method:event.target.value as DiscoveryState['method'] || null})}><option value="">Any method</option>{[...new Set([...coverage.methods,...(draft.method ? [draft.method] : [])])].map(method => <option key={method} value={method}>{capitalize(method)}</option>)}</select></label>}
    {coverage.occasions.length > 0 && <label className={styles.guideLabel}>Occasion — optional<select value={draft.occasion ?? ''} onChange={event => setDraft({...draft,occasion:event.target.value as DiscoveryState['occasion'] || null})}><option value="">Any occasion</option>{coverage.occasions.map(occasion => <option key={occasion} value={occasion}>{occasion === 'after-dinner' ? 'After dinner' : 'Casual get-together'}</option>)}</select></label>}
    <label className={styles.guideLabel}>Name or ingredient — optional<input type="search" maxLength={120} value={draft.q} onChange={event => setDraft({...draft,q:event.target.value})} placeholder="Any recipe" /></label>
    <details className={styles.guideIngredientPicker}><summary>Ingredients I have ({selected.length}) — optional</summary><PantryChecklist eligibleRows={rows} selected={selected} onChange={ids => { setSelected(ids); if (!ids.length) setDraft({...draft,onlyIngredients:false}) }} storageBlocked={storageBlocked} /></details>
    <label className={styles.guideCheck}><input type="checkbox" disabled={!selected.length} checked={draft.onlyIngredients} onChange={event => setDraft({...draft,onlyIngredients:event.target.checked})} />Only recipes matching my ingredients</label>
    <div className={styles.guideActions}><button className={styles.primary} type="submit">Apply preferences</button><button className={styles.filter} type="button" onClick={onCancel}>Cancel</button></div>
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
  return <section className={styles.guideRandom} aria-label="Random recipe">
    <p role="status">{!pool.length ? 'No reviewed ' + drinkLabels[type].toLowerCase() + ' recipes are available for Surprise me.' : pool.length === 1 ? 'This is the only eligible recipe for this drink type.' : exhausted ? 'You’ve seen every recipe in this drink type. Start again to reset the pool.' : 'One random recipe from your chosen drink type.'}</p>
    {row && <><RecipeCard row={row} returnTo={returnTo} asHeading reason="Random choice — uses drink type only." tags={reviewedDiscovery(row)?.tastes} reviewedBase={reviewedDiscovery(row)?.primaryBase} />{reviewedDiscovery(row)?.pathNote && type === 'mocktail' && <p className={styles.hint}>{reviewedDiscovery(row)?.pathNote}</p>}</>}
    {ready && pool.length > 0 && <button className={styles.primary} type="button" onClick={() => choose(exhausted)}>{exhausted ? 'Start again' : 'Another recipe'}</button>}
    {blocked && <p className={styles.hint}>Browser storage is unavailable. Repeat history lasts only while this screen stays open.</p>}
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
    setNotice(view.base && next.type === 'mocktail' ? 'Base cleared: it applies only to alcoholic recipes.' : 'Preferences applied.')
    setSelected(ingredients)
    closeEditor()
    navigate({...next,mode:'guided',stage:'results',pick:null})
    setEditorKey(key => key + 1)
  }
  const results = (view.type === 'mixed' ? ['cocktail','mocktail'] as const : view.type ? [view.type] : []).map(type => ({
    type, items: rankRecipes(rows,view,type,selectedSet),
  }))
  const preferenceForm = <PreferenceForm key={editorKey + ':' + returnTo + ':' + ready} rows={rows} value={view} ingredients={selected} storageBlocked={storageBlocked} onApply={apply} onCancel={() => { closeEditor(); setEditorKey(key => key + 1) }} />
  return <div className={styles.guide}>
    <nav className={styles.guideNav} aria-label="Recipe discovery routes">
      <button type="button" className={styles.filter} aria-current={view.mode === 'guided' ? 'page' : undefined} onClick={() => navigate({...view,mode:'guided',stage:view.type ? 'results' : 'type',pick:null})}>Guide me</button>
      <button type="button" className={styles.filter} aria-current={view.mode === 'random' ? 'page' : undefined} onClick={() => navigate({...view,mode:'random',pick:null,randomType:null})}>Surprise me</button>
      <Link className={styles.filter} href="/find-my-drink?mode=browse">Browse recipes</Link>
    </nav>
    <noscript><p>Guided discovery needs JavaScript. <a href="/find-my-drink?mode=browse">Browse and filter all published recipes</a> without it.</p></noscript>
    {view.mode === 'entry' && <section className={styles.guideSetup}>
      <p className={styles.eyebrow}>Find My Drink</p><h1 ref={heading} tabIndex={-1}>Your next recipe starts here.</h1>
      <p>Two quick choices. A few recipes worth making.</p>
      <div className={styles.guideActions}><button className={styles.primary} onClick={() => navigate({...view,mode:'guided',stage:'type'})}>Guide me to a recipe</button><button className={styles.filter} onClick={() => navigate({...view,mode:'random',randomType:null})}>Surprise me</button></div>
    </section>}
    {view.mode === 'guided' && view.stage !== 'results' && <section className={styles.guideSetup}>
      <p className={styles.eyebrow}>{view.stage === 'type' ? '1 · Drink type' : '2 · Taste'}</p>
      <h1 ref={heading} tabIndex={-1}>{view.stage === 'type' ? 'What are we making?' : 'What sounds good?'}</h1>
      {view.stage === 'type' ? <fieldset className={styles.guideFieldset}><legend>Choose a drink type</legend><div className={styles.guideChoices}>{(['cocktail','mocktail','mixed'] as const).map(type => <button type="button" key={type} className={view.type === type ? styles.filterActive : styles.filter} aria-pressed={view.type === type} onClick={() => { if (type === 'mocktail' && view.base) setNotice('Base cleared: it applies only to alcoholic recipes.'); navigate({...view,type,base:type === 'mocktail' ? null : view.base,stage:'taste'}) }}>{drinkLabels[type]}</button>)}</div></fieldset>
      : <><TasteChoices label="Your tastes" supported={coverage.tastes} value={view.tastes} onChange={tastes => navigate({...view,tastes,cocktailTastes:null,mocktailTastes:null},true)} />
      <div className={styles.guideActions}><button className={styles.primary} onClick={() => navigate({...view,stage:'results'})}>Show recipes</button><button className={styles.filter} onClick={() => navigate({...view,tastes:[],cocktailTastes:null,mocktailTastes:null,stage:'results'})}>Skip taste</button><button className={styles.filter} onClick={() => navigate({...view,stage:'type'})}>Back</button></div></>}
    </section>}
    {notice && <p role="status" className={styles.hint}>{notice}</p>}
    {view.mode === 'random' && <section className={styles.guideSetup}>
      <h1 ref={heading} tabIndex={-1}>Leave it to chance.</h1>
      <p>Surprise me uses drink type only. Taste, base, method and ingredients do not affect the draw. Your guided preferences are kept.</p>
      <fieldset className={styles.guideFieldset}><legend>Choose a drink type for Surprise me</legend><div className={styles.guideChoices}>{(['cocktail','mocktail'] as const).map(type => <button type="button" className={view.randomType === type ? styles.filterActive : styles.filter} aria-pressed={view.randomType === type} key={type} onClick={() => { if (view.randomType !== type) navigate({...view,randomType:type,pick:null}) }}>{drinkLabels[type]}</button>)}</div></fieldset>
      {view.randomType && <RandomRecipe key={view.randomType} rows={rows} type={view.randomType} requested={view.pick} onPick={pick => navigate({...view,pick},true)} returnTo={returnTo} />}
      {view.randomType && <button type="button" className={styles.filter} onClick={() => navigate({...view,mode:'guided',type:view.randomType,base:view.randomType === 'mocktail' ? null : view.base,stage:'results',pick:null})}>Refine this choice</button>}
    </section>}
    {view.mode === 'guided' && view.stage === 'results' && <div className={styles.guideLayout}>
      <header className={styles.guideResultHeading}><div><p className={styles.eyebrow}>Find My Drink</p><h1 ref={heading} tabIndex={-1}>A few good choices.</h1><p>Ranked by reviewed tastes, then featured recipes and name. Check quantities and equipment before making.</p></div>
        <button type="button" className={styles.filter + ' ' + styles.guideEditButton} ref={editButton} onClick={() => { setEditing(true); setEditorKey(key => key + 1); dialog.current?.showModal() }}>Edit preferences</button>
      </header>
      <aside className={styles.guideDesktopPreferences} aria-label="Edit preferences"><h2>Your preferences</h2>{preferenceForm}</aside>
      <dialog ref={dialog} className={styles.guideDialog} aria-labelledby="guide-edit-title" onCancel={event => { event.preventDefault(); closeEditor() }} onClose={() => { setEditing(false); editButton.current?.focus() }}><h2 id="guide-edit-title">Edit preferences</h2>{editing && preferenceForm}</dialog>
      <div className={styles.guideResults}>
        <p className={styles.hint} role="status" aria-live="polite">{results.map(section => Math.min(3,section.items.length) + ' ' + drinkLabels[section.type].toLowerCase() + ' recommendations').join('; ')}.</p>
        {selected.length > 0 && <p className={styles.hint}>Ingredient groups check required forms, including ice and garnish. They do not check how much you have.</p>}
        {results.map(({type,items}) => <section key={type} aria-labelledby={'guided-' + type}>
          <h2 id={'guided-' + type}>{drinkLabels[type]} recipes</h2>
          {type === 'mocktail' && <p className={styles.hint}>Only recipes with a reviewed non-alcoholic preparation path appear here. Follow any path note; this is not a 0.0% claim.</p>}
          {!items.length && <div className={styles.stateCard}><p>{type === 'cocktail' && view.base === 'beer' ? 'We don’t have beer recipes yet.' : 'No reviewed recipes match these requirements. Try Any base, Any method or remove the ingredient restriction.'}</p>{view.base === 'beer' && type === 'cocktail' && <Link className={styles.filter} href="/party-planner">Browse products in Party Planner</Link>}</div>}
          {type === 'cocktail' && view.base === 'champagne' && <p className={styles.hint}>Champagne: {items.length} recipe{items.length === 1 ? '' : 's'}. Our wine coverage is limited to champagne.</p>}
          {(['exact','one-away','other'] as const).map(tier => { const shown=items.slice(0,3).filter(item=>item.tier===tier); return shown.length > 0 && <div key={tier}>
            {selected.length > 0 && <h3>{tier === 'exact' ? 'All required ingredients selected' : tier === 'one-away' ? 'One ingredient away' : 'Other suggestions'}</h3>}
            <div className={styles.guideGrid}>{shown.map(item => <div key={item.row.id} className={styles.guideRecommendation}>
              <RecipeCard row={item.row} returnTo={returnTo} asHeading tags={item.review?.tastes} reviewedBase={item.review?.primaryBase} reason={item.reasons.length ? item.reasons.slice(0,2).map(reasonText).join(' ') : ((type === 'cocktail' ? view.cocktailTastes : view.mocktailTastes) ?? view.tastes).length ? 'No selected taste matched; another eligible recipe to consider.' : 'Selected from your eligible recipes.'} />
              {item.review?.nonAlcoholicPath === 'reviewed' && item.review.pathNote && <p className={styles.hint}>{item.review.pathNote}</p>}
              {!item.pantryReviewed ? <p className={styles.hint}>Ingredient matching hasn’t been reviewed for this recipe.</p> : item.tier === 'exact' ? <p className={styles.hint}>Uses your selected ingredients; check quantities and equipment.</p> : item.missing ? <p className={styles.hint}>Missing {item.missing.label}: {item.missing.quantityText}.</p> : selected.length > 0 ? <p className={styles.hint}>Requires more ingredients or an item without a recorded quantity.</p> : null}
            </div>)}</div>
          </div> })}
        </section>)}
      </div>
    </div>}
  </div>
}
