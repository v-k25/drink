'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TASTES, discoveryHref, parseDiscovery, rankRecipes, reasonText, recommendationPool, reviewedDiscovery, type DiscoveryState, type GuidedStage, type Taste } from '../discovery'
import { capitalize, pickRecipeIds, safeResultsHref } from '../recipe'
import { FEELS, FEEL_LABELS, OCCASION_LABELS, QUIZ_OCCASIONS, SERVES, SERVE_LABELS, answered, profileFor, rankSpirits, reasonSentence, type SpiritProfile } from '../spirit'
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

function ChoiceCards<T extends string>({ legend, options, value, onChoose }: { legend: string; options: readonly (readonly [T, string, string?])[]; value: T | null; onChoose: (value: T) => void }) {
  return <fieldset className={styles.guideFieldset}><legend className={styles.srOnly}>{legend}</legend><div className={styles.choiceCards}>
    {options.map(([option, label, note]) => <button type="button" key={option} className={styles.choiceCard} aria-pressed={value === option} onClick={() => onChoose(option)}><b>{label}</b>{note && <span>{note}</span>}</button>)}
  </div></fieldset>
}

function RecipeList({ items, returnTo, label }: { items: ReturnType<typeof rankRecipes>; returnTo: string; label: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 3)
  return <>
    <p className={styles.srOnly} role="status" aria-live="polite">{shown.length} {label} shown.</p>
    <div className={styles.guideGrid}>{shown.map(item => <div key={item.row.id} className={styles.guideRecommendation}>
      <RecipeCard row={item.row} returnTo={returnTo} asHeading tags={item.review?.tastes} reviewedBase={item.review?.primaryBase} reason={item.reasons.some(reason => reason.code !== 'base') ? item.reasons.filter(reason => reason.code !== 'base').slice(0, 2).map(reasonText).join(' ') : undefined} />
      {item.review?.nonAlcoholicPath === 'reviewed' && item.review.pathNote && <p className={styles.hint}>{item.review.pathNote}</p>}
    </div>)}</div>
    {items.length > 3 && <div className={styles.guideActions}><button type="button" className={styles.secondary} aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show fewer' : `Show all ${items.length}`}</button></div>}
  </>
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
  useEffect(() => { heading.current?.focus() }, [view.mode,view.stage])
  useEffect(() => {
    if (!window.location.hash.startsWith('#recipe-')) return
    try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView() } catch { /* Ignore malformed return fragments. */ }
  }, [])

  // Guide me is the spirit quiz: drinking? then taste, feel, serve and occasion, then the best match and its cocktails.
  // Not drinking skips to mocktails after the taste question.
  const drinking = view.type !== 'mocktail'
  const order: readonly GuidedStage[] = drinking ? ['type', 'taste', 'feel', 'serve', 'occasion', 'results'] : ['type', 'taste', 'results']
  const labels = drinking ? ['Start', 'Taste', 'Feel', 'Serve', 'Occasion', 'Match'] : ['Start', 'Taste', 'Mocktails']
  const stageIndex = Math.max(0, order.indexOf(view.stage))
  const go = (patch: Partial<DiscoveryState>, from: GuidedStage) => navigate({ ...view, ...patch, stage: order[order.indexOf(from) + 1] ?? 'results', pick: null })
  const backTo = (from: GuidedStage) => navigate({ ...view, stage: order[Math.max(0, order.indexOf(from) - 1)] })
  const stages = <ol className={styles.stages + ' sf-stages'} aria-label="Steps">{labels.map((label, index) => <li key={label} className={index < stageIndex ? 'done' : undefined} aria-current={index === stageIndex ? 'step' : undefined}>{label}</li>)}</ol>
  const back = <div className={styles.guideBack}><button type="button" className={styles.backLink} onClick={() => navigate({...view,mode:'entry',stage:'type',pick:null})}>← All ways to find a drink</button></div>
  const skipBack = (stage: GuidedStage, patch: Partial<DiscoveryState>) => <div className={styles.guideActions}>
    <button type="button" className={styles.secondary} onClick={() => go(patch, stage)}>Skip</button>
    <button type="button" className={styles.backLink} onClick={() => backTo(stage)}>Back</button>
  </div>

  const mocktailTastes = TASTES.filter(taste => recommendationPool(rows, 'mocktail').some(row => reviewedDiscovery(row)?.tastes.includes(taste)))
  const answers = { tastes: view.tastes, feel: view.feel, serve: view.serve, occasion: view.quizOccasion }
  const matches = rankSpirits(answers)
  const top = matches[0].profile
  const shown: SpiritProfile = view.spirit ? profileFor(view.spirit) : top
  const alternative = shown.spirit === top.spirit ? matches[1].profile : top
  const reasons = matches.find(match => match.profile.spirit === shown.spirit)?.reasons ?? []
  const recipePreferences = { ...view, method: null, q: '', onlyIngredients: false, cocktailTastes: null, mocktailTastes: null }
  const cocktails = shown.recipeBase ? rankRecipes(rows, { ...recipePreferences, base: shown.recipeBase }, 'cocktail') : []
  const mocktails = rankRecipes(rows, { ...recipePreferences, base: null }, 'mocktail')
  const lower = shown.name.toLowerCase()

  return <div className={styles.guide}>
    <noscript><p className={styles.notice}>Guide me and Surprise me need JavaScript. <a href="/find-my-drink?mode=browse">Browse all</a> works without it.</p></noscript>
    {view.mode === 'entry' && <section className={styles.entry} aria-labelledby="entry-title">
      <h1 id="entry-title" ref={heading} tabIndex={-1}>Your next recipe starts here</h1>
      <p className={styles.lede}>{rows.length} cocktails and mocktails.</p>
      <div className={styles.routes}>
        <button type="button" className={`${styles.route} ${styles.routeLead}`} onClick={() => navigate({...view,mode:'guided',stage:'type'})}><span className={styles.routeIcon} aria-hidden="true">→</span><span><h2>Guide me</h2><p>Find the spirit for you.</p></span></button>
        <button type="button" className={styles.route} onClick={() => navigate({...view,mode:'random',randomType:null})}><span className={styles.routeIcon} aria-hidden="true">?</span><span><h2>Surprise me</h2><p>Get one at random.</p></span></button>
        <Link className={styles.route} href="/find-my-drink?mode=browse"><span className={styles.routeIcon} aria-hidden="true">≡</span><span><h2>Browse all</h2><p>See all {rows.length}.</p></span></Link>
        <Link className={styles.route} href="/find-my-drink?mode=browse#use-what-i-have"><span className={styles.routeIcon} aria-hidden="true">✓</span><span><h2>Use what I have</h2><p>Tick what’s in your kitchen.</p></span></Link>
      </div>
    </section>}
    {view.mode !== 'entry' && back}

    {view.mode === 'guided' && view.stage !== 'results' && <section className={styles.guideSetup}>
      {stages}
      {view.stage === 'type' && <>
        <h1 ref={heading} tabIndex={-1}>Are you drinking alcohol?</h1>
        <ChoiceCards legend="Are you drinking alcohol?" value={view.type === 'mocktail' ? 'no' : view.type ? 'yes' : null}
          options={[['yes', 'Yes', 'Find the spirit for you'], ['no', 'No', 'Show me mocktails']]}
          onChoose={choice => navigate({ ...view, type: choice === 'no' ? 'mocktail' : 'cocktail', base: null, spirit: null, stage: 'taste', pick: null })} />
      </>}
      {view.stage === 'taste' && <>
        <h1 ref={heading} tabIndex={-1}>Which flavours do you like?</h1>
        <TasteChoices label="Flavours" supported={drinking ? TASTES : mocktailTastes} value={view.tastes} onChange={tastes => navigate({...view,tastes,cocktailTastes:null,mocktailTastes:null,spirit:null},true)} />
        <div className={styles.guideActions}>
          <button type="button" className={styles.primary} onClick={() => go({}, 'taste')}>{drinking ? 'Next' : 'Show mocktails'}</button>
          <button type="button" className={styles.secondary} onClick={() => go({ tastes: [], spirit: null }, 'taste')}>Skip</button>
          <button type="button" className={styles.backLink} onClick={() => backTo('taste')}>Back</button>
        </div>
      </>}
      {view.stage === 'feel' && <>
        <h1 ref={heading} tabIndex={-1}>How should it feel?</h1>
        <ChoiceCards legend="How should it feel?" value={view.feel} options={FEELS.map(feel => [feel, ...FEEL_LABELS[feel]] as const)} onChoose={feel => go({ feel, spirit: null }, 'feel')} />
        {skipBack('feel', { feel: null, spirit: null })}
      </>}
      {view.stage === 'serve' && <>
        <h1 ref={heading} tabIndex={-1}>How do you usually drink?</h1>
        <ChoiceCards legend="How do you usually drink?" value={view.serve} options={SERVES.map(serve => [serve, ...SERVE_LABELS[serve]] as const)} onChoose={serve => go({ serve, spirit: null }, 'serve')} />
        {skipBack('serve', { serve: null, spirit: null })}
      </>}
      {view.stage === 'occasion' && <>
        <h1 ref={heading} tabIndex={-1}>What’s the occasion?</h1>
        <ChoiceCards legend="What’s the occasion?" value={view.quizOccasion} options={QUIZ_OCCASIONS.map(occasion => [occasion, OCCASION_LABELS[occasion]] as const)}
          onChoose={quizOccasion => go({ quizOccasion, occasion: quizOccasion === 'party' ? null : quizOccasion, spirit: null }, 'occasion')} />
        {skipBack('occasion', { quizOccasion: null, occasion: null, spirit: null })}
      </>}
    </section>}

    {view.mode === 'guided' && view.stage === 'results' && drinking && <div className={styles.guideLayout}>
      <section className={styles.spiritResult} aria-labelledby="spirit-title">
        <p className={styles.eyebrow}>{shown.spirit === top.spirit ? 'Your best match' : 'Also a good match'}</p>
        <h1 id="spirit-title" ref={heading} tabIndex={-1}>{shown.name}</h1>
        <p className={styles.lede}>{shown.note}</p>
        <dl className={styles.spiritFacts}>
          <div><dt>Why</dt><dd>{answered(answers) ? reasonSentence(reasons) : 'You skipped the questions, so this is a starting point.'}</dd></div>
          <div><dt>Try it</dt><dd>{shown.tryIt}</dd></div>
        </dl>
        <div className={styles.guideActions}>
          <button type="button" className={styles.secondary} onClick={() => navigate({ ...view, spirit: alternative.spirit === top.spirit ? null : alternative.spirit }, true)}>{alternative.spirit === top.spirit ? `Back to ${top.name.toLowerCase()}` : `Show ${alternative.name.toLowerCase()} instead`}</button>
          <button type="button" className={styles.backLink} onClick={() => navigate({ ...view, stage: 'taste', spirit: null })}>Change answers</button>
        </div>
      </section>
      <section className={styles.guideResults} aria-labelledby="spirit-recipes">
        <h2 id="spirit-recipes">{shown.recipeBase ? `Cocktails with ${lower}` : `${shown.name} recipes`}</h2>
        {cocktails.length === 0 ? <div className={styles.stateCard}>
          <h3>We don’t have {lower} recipes yet</h3>
          <p>You can still add {lower} to a party list.</p>
          <Link className={styles.secondary} href="/party-planner">Find {lower} in Party Planner</Link>
        </div> : <>
          {shown.spirit === 'wine' && <p className={styles.hint}>Our only wine recipe uses champagne.</p>}
          <RecipeList key={shown.spirit} items={cocktails} returnTo={returnTo} label={cocktails.length === 1 ? 'cocktail' : 'cocktails'} />
          <p className={styles.hint}>Check quantities and equipment before you make anything.</p>
        </>}
      </section>
    </div>}

    {view.mode === 'guided' && view.stage === 'results' && !drinking && <div className={styles.guideLayout}>
      <section className={styles.guideResults} aria-labelledby="mocktail-title">
        <header className={styles.guideResultHeading}><div>
          <h1 id="mocktail-title" ref={heading} tabIndex={-1}>Mocktails for you</h1>
          <p className={styles.resultFacts}>{view.tastes.length ? view.tastes.map(capitalize).join(' · ') : 'Any flavour'}</p>
        </div><button type="button" className={styles.backLink} onClick={() => navigate({ ...view, stage: 'taste' })}>Change answers</button></header>
        <p className={styles.hint}>Only recipes with a reviewed alcohol-free path. Follow any note on a recipe; this isn’t a 0.0% claim.</p>
        {mocktails.length ? <RecipeList items={mocktails} returnTo={returnTo} label="mocktails" /> : <div className={styles.stateCard}><h3>No matches just yet</h3><p>Try fewer flavours.</p></div>}
      </section>
    </div>}

    {view.mode === 'random' && <section className={styles.guideSetup}>
      <h1 ref={heading} tabIndex={-1}>Surprise me</h1>
      <p className={styles.hint}>One at random. Your Guide me answers are kept.</p>
      <fieldset className={styles.guideFieldset}><legend>What kind of drink?</legend><div className={styles.guideChoices}>{(['cocktail','mocktail'] as const).map(type => <button type="button" className={styles.filter} aria-pressed={view.randomType === type} key={type} onClick={() => { if (view.randomType !== type) navigate({...view,randomType:type,pick:null}) }}>{drinkLabels[type]}</button>)}</div></fieldset>
      {view.randomType && <RandomRecipe key={view.randomType} rows={rows} type={view.randomType} requested={view.pick} onPick={pick => navigate({...view,pick},true)} returnTo={returnTo} />}
    </section>}
  </div>
}
