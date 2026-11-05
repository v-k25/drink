'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TASTES, discoveryHref, parseDiscovery, rankRecipes, type DiscoveryState, type Taste } from '../discovery'
import { capitalize } from '../recipe'
import { FEELS, HOW_LABELS, answered, howAnswers, profileFor, rankSpirits, reasonSentence, type Spirit } from '../spirit'
import { BANDS, BAND_INFO, NO_FILTER, SORTS, SORT_LABELS, listBottles, pickSpirit, sizeLabel, type Band, type BottleFilter, type Sort } from '../bottles'
import { formatMoney } from '../../party-planner/model'
import type { Bottle } from '../../catalogue/normalise'
import type { RecipeRow } from '../queries'
import { CloseIcon } from '../../icons'
import RecipeCard from './recipe-card'
import styles from '../finder.module.css'

// Find a Drink (tools redesign, TR3): four questions on one page, and results that update as you answer.
// 1 your spirit and why, 2 every bottle we list of that spirit in the budget, 3 cocktail ideas with it from the recipes.
// Answers live in the URL (replaced, not pushed, so Back leaves the page); sort and the brand and size filter are local.

const PLURAL: Record<Spirit, string> = { gin: 'gins', vodka: 'vodkas', rum: 'rums', whisky: 'whiskies', tequila: 'tequilas', brandy: 'brandies', wine: 'wines', beer: 'beers', liqueur: 'liqueurs' }
const money = (paise: number) => formatMoney(paise).replace(/\.00$/, '')
const IDEAS = 3, MOCKTAIL_IDEAS = 6
// Bottles shown first on a phone; .bottleGridLimited in finder.module.css hides the rest until Show all.
const PHONE_BOTTLES = 6

function bandPhrase(band: Band) {
  if (band === 'any') return ''
  return band === 'u1' ? ' under ₹1,000' : ' at ' + BAND_INFO[band].label
}

function BottleCard({ bottle, quiet = false }: { bottle: Bottle; quiet?: boolean }) {
  return <li className={`${styles.bottle} ${quiet ? styles.bottleQuiet : ''}`}>
    <span className={styles.bottleArt} aria-hidden="true"><img src={`/images/drinks/${bottle.kind}.svg`} alt="" width={48} height={48} /></span>
    <span className={styles.bottleText}>
      <span className={styles.bottleBrand}>{bottle.brand}</span>
      <strong>{bottle.name}</strong>
      <span className={styles.bottleSize}>{sizeLabel(bottle.sizeMl)}</span>
      <b className={styles.bottlePrice}>{money(bottle.pricePaise)}</b>
    </span>
  </li>
}

function FilterDialog({ open, onClose, brands, sizes, filter, onChange, shown }: {
  open: boolean; onClose: () => void; brands: { brand: string; count: number }[]; sizes: { sizeMl: number; count: number }[]
  filter: BottleFilter; onChange: (filter: BottleFilter) => void; shown: number
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])
  const toggle = <T,>(list: readonly T[], value: T) => list.includes(value) ? list.filter(item => item !== value) : [...list, value]
  return <dialog ref={dialog} className={styles.filterDialog} aria-labelledby="bottle-filter-title" onClose={onClose}>
    <div className={styles.dialogHeading}><h2 id="bottle-filter-title">Brand and size</h2><button type="button" className={styles.dialogClose} aria-label="Close" onClick={onClose}><CloseIcon size={22} /></button></div>
    {sizes.length > 1 && <fieldset className={styles.bottleFilterGroup}><legend>Size</legend><div className={styles.guideChoices}>
      {sizes.map(item => <button type="button" key={item.sizeMl} className={styles.filter} aria-pressed={filter.sizes.includes(item.sizeMl)} onClick={() => onChange({ ...filter, sizes: toggle(filter.sizes, item.sizeMl) })}>{sizeLabel(item.sizeMl)} <span className={styles.count}>{item.count}</span></button>)}
    </div></fieldset>}
    <fieldset className={styles.bottleFilterGroup}><legend>Brand</legend><div className={styles.guideChoices}>
      {brands.map(item => <button type="button" key={item.brand} className={styles.filter} aria-pressed={filter.brands.includes(item.brand)} onClick={() => onChange({ ...filter, brands: toggle(filter.brands, item.brand) })}>{item.brand} <span className={styles.count}>{item.count}</span></button>)}
    </div></fieldset>
    <div className={styles.dialogActions}>
      <button type="button" className={styles.backLink} onClick={() => onChange(NO_FILTER)}>Clear</button>
      <button type="button" className={styles.primary} onClick={onClose}>Show {shown} {shown === 1 ? 'bottle' : 'bottles'}</button>
    </div>
    <p className={styles.srOnly} role="status" aria-live="polite">{shown} {shown === 1 ? 'bottle' : 'bottles'}</p>
  </dialog>
}

export default function Finder({ rows, bottles, initial }: { rows: RecipeRow[]; bottles: Bottle[] | null; initial: DiscoveryState }) {
  const [view, setView] = useState<DiscoveryState>({ ...initial, mode: 'guided', stage: 'results' })
  const [sort, setSort] = useState<Sort>('recommended')
  const [filter, setFilter] = useState<{ key: string; value: BottleFilter }>({ key: '', value: NO_FILTER })
  const [filterOpen, setFilterOpen] = useState(false)
  const filterTrigger = useRef<HTMLButtonElement>(null)
  const [allBottlesFor, setAllBottlesFor] = useState('')
  const questions = useRef<HTMLElement>(null)
  const [questionsInView, setQuestionsInView] = useState(true)
  const returnTo = discoveryHref(view)

  function update(patch: Partial<DiscoveryState>) {
    // Any new answer drops "Try X instead", like starting the match again.
    const next = { ...view, ...patch, spirit: 'spirit' in patch ? patch.spirit ?? null : null, mode: 'guided' as const, stage: 'results' as const, pick: null }
    setView(next)
    window.history.replaceState(null, '', discoveryHref(next))
  }
  useEffect(() => {
    const back = () => {
      const params = new URLSearchParams(window.location.search)
      setView({ ...parseDiscovery(Object.fromEntries([...new Set(params.keys())].map(key => [key, params.getAll(key)]))), mode: 'guided', stage: 'results' })
    }
    window.addEventListener('popstate', back)
    return () => window.removeEventListener('popstate', back)
  }, [])

  // The bottom bar on a phone shows the result while the answers fill the screen, and goes once they scroll away.
  useEffect(() => {
    const node = questions.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setQuestionsInView(entry.isIntersecting), { rootMargin: '0px 0px -96px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const drinking = view.type !== 'mocktail'
  const band: Band = view.budget ?? 'any'
  const answers = howAnswers(view.tastes, view.feel)
  const matches = rankSpirits(answers)
  const picked = pickSpirit(matches, bottles ?? [], band)
  const shownMatch = view.spirit ? matches.find(match => match.profile.spirit === view.spirit) ?? picked.top : picked.top
  const shown = shownMatch.profile
  const switchTo = shown.spirit === picked.top.profile.spirit ? picked.alternative?.profile ?? null : picked.top.profile
  const lower = shown.name.toLowerCase()

  const recipePreferences = { ...view, base: null, method: null, occasion: null, q: '', onlyIngredients: false, cocktailTastes: null, mocktailTastes: null }
  const cocktails = drinking && shown.recipeBase ? rankRecipes(rows, { ...recipePreferences, base: shown.recipeBase }, 'cocktail').slice(0, IDEAS) : []
  const mocktails = drinking ? [] : rankRecipes(rows, recipePreferences, 'mocktail').slice(0, MOCKTAIL_IDEAS)

  const filterKey = shown.spirit + ':' + band
  const activeFilter = filter.key === filterKey ? filter.value : NO_FILTER
  const listing = bottles ? listBottles(bottles, shown.spirit, band, sort, activeFilter) : null
  const filterCount = activeFilter.brands.length + activeFilter.sizes.length
  const closeFilter = () => { setFilterOpen(false); filterTrigger.current?.focus() }
  const countLine = listing ? (listing.bottles.length < listing.total ? `${listing.bottles.length} of ` : '') + `${listing.total} ${listing.total === 1 ? lower : PLURAL[shown.spirit]}${bandPhrase(band)}` : ''

  const why = answered(answers) ? reasonSentence(shownMatch.reasons) : 'Pick a flavour or two to narrow it down.'

  return <div className={styles.finder}>
    <noscript><p className={styles.notice}>The questions need JavaScript. Browse all recipes, below them, works without it.</p></noscript>
    <header className={styles.finderHead}>
      <h1>Find a Drink</h1>
      <p className={styles.lede}>Four quick questions. Your spirit and its bottles update as you answer.</p>
    </header>

    <div className={styles.finderLayout}>
      <section ref={questions} className={styles.questions} aria-label="Your answers">
        <fieldset className={styles.question}>
          <legend>1 · Drinking alcohol?</legend>
          <div className={styles.answerPair}>
            <button type="button" className={styles.filter} aria-pressed={view.type !== null && drinking} onClick={() => update({ type: 'cocktail' })}>Yes</button>
            <button type="button" className={styles.filter} aria-pressed={!drinking} onClick={() => update({ type: 'mocktail', feel: null, budget: null })}>No, mocktails</button>
          </div>
        </fieldset>
        <fieldset className={styles.question}>
          <legend>2 · Which flavours? Up to two</legend>
          <div className={styles.guideChoices}>
            {TASTES.map(taste => {
              const on = view.tastes.includes(taste)
              return <button type="button" key={taste} className={styles.filter} aria-pressed={on}
                onClick={() => update({ tastes: on ? view.tastes.filter(t => t !== taste) : [...view.tastes, taste].slice(-2) as Taste[] })}>{capitalize(taste)}</button>
            })}
          </div>
        </fieldset>
        {drinking && <fieldset className={styles.question}>
          <legend>3 · How do you like it?</legend>
          <div className={styles.howChoices}>
            {FEELS.map(how => <button type="button" key={how} className={styles.choiceCard} aria-pressed={view.feel === how} onClick={() => update({ feel: view.feel === how ? null : how })}>
              <b>{HOW_LABELS[how][0]}</b><span>{HOW_LABELS[how][1]}</span>
            </button>)}
          </div>
        </fieldset>}
        {drinking && <fieldset className={styles.question}>
          <legend>4 · Budget for one bottle (750 ml)</legend>
          <div className={styles.guideChoices}>
            {BANDS.map(id => <button type="button" key={id} className={styles.filter} aria-pressed={band === id} onClick={() => update({ budget: id })}>{BAND_INFO[id].label}</button>)}
          </div>
        </fieldset>}
        <nav className={styles.moreWays} aria-label="More ways to find a drink">
          <Link href="/find-my-drink?mode=browse">Browse all recipes</Link>
          <Link href="/find-my-drink?mode=random">Surprise me</Link>
          <Link href="/find-my-drink?mode=browse#use-what-i-have">Use what I have</Link>
        </nav>
      </section>

      <div className={styles.finderResults}>
        {drinking && <section id="your-spirit" className={`${styles.spiritPanel} sf-glow-once`} key={shown.spirit} aria-labelledby="spirit-title">
          <div>
            <p className={styles.eyebrow}>Your spirit</p>
            <h2 id="spirit-title">{shown.name}</h2>
            <p className={styles.spiritWhy}>{why}</p>
          </div>
          {switchTo && <button type="button" className={styles.secondary} onClick={() => update({ spirit: switchTo.spirit === picked.top.profile.spirit ? null : switchTo.spirit })}>
            {switchTo.spirit === picked.top.profile.spirit ? `Back to ${switchTo.name.toLowerCase()}` : `Try ${switchTo.name.toLowerCase()} instead`}
          </button>}
        </section>}


        {drinking && <section className={styles.bottles} aria-labelledby="bottles-title">
          <div className={styles.bottlesHead}>
            <h2 id="bottles-title">{listing ? countLine : `${shown.name} bottles`}</h2>
            {listing && listing.total > 0 && <div className={styles.bottleTools}>
              <label className={styles.sortLabel}>Sort
                <select value={sort} onChange={event => setSort(event.target.value as Sort)}>
                  {SORTS.map(id => <option key={id} value={id}>{SORT_LABELS[id]}</option>)}
                </select>
              </label>
              <button type="button" ref={filterTrigger} className={styles.secondary} aria-haspopup="dialog" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>Brand and size{filterCount ? ' · ' + filterCount : ''}</button>
            </div>}
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">{countLine}</p>
          {!listing && <p className={styles.emptyNote}>Bottle prices aren’t loading right now. Try again in a minute.</p>}
          {listing && !listing.total && <p className={styles.emptyNote}>No bottles in this range. Try the next budget up.</p>}
          {listing && listing.total > 0 && !listing.bottles.length && <p className={styles.emptyNote}>Nothing matches that brand and size. <button type="button" className={styles.backLink} onClick={() => setFilter({ key: filterKey, value: NO_FILTER })}>Clear</button></p>}
          {listing && listing.bottles.length > 0 && <ul className={`${styles.bottleGrid} ${listing.bottles.length > PHONE_BOTTLES && allBottlesFor !== filterKey ? styles.bottleGridLimited : ''}`.trim()}>{listing.bottles.map(bottle => <BottleCard key={bottle.id} bottle={bottle} />)}</ul>}
          {listing && listing.bottles.length > PHONE_BOTTLES && <button type="button" className={`${styles.secondary} ${styles.showAll}`} aria-expanded={allBottlesFor === filterKey} onClick={() => setAllBottlesFor(allBottlesFor === filterKey ? '' : filterKey)}>{allBottlesFor === filterKey ? 'Show fewer' : `Show all ${listing.bottles.length} ${PLURAL[shown.spirit]}`}</button>}
          {listing && listing.justOver.length > 0 && <>
            <h3 className={styles.overTitle}>Just over your budget</h3>
            <ul className={styles.bottleGrid}>{listing.justOver.map(bottle => <BottleCard key={bottle.id} bottle={bottle} quiet />)}</ul>
          </>}
          <p className={styles.hint}>Prices from our Jaipur catalogue; shops may differ.</p>
          {listing && <FilterDialog open={filterOpen} onClose={closeFilter} brands={listing.brands} sizes={listing.sizes} filter={activeFilter}
            onChange={value => setFilter({ key: filterKey, value })} shown={listing.bottles.length} />}
        </section>}

        <section id="drink-ideas" className={styles.ideas} aria-labelledby="ideas-title">
          <div className={styles.ideasHead}>
            <h2 id="ideas-title">{drinking ? `Make it with ${lower}` : 'Mocktail ideas'}</h2>
            <Link href={drinking ? '/find-my-drink?mode=browse&drink=cocktail' : '/find-my-drink?mode=browse&drink=mocktail'}>See all recipes</Link>
          </div>
          {drinking && !shown.recipeBase && <p className={styles.hint}>We don’t have {lower} recipes yet.</p>}
          {drinking && shown.spirit === 'wine' && cocktails.length > 0 && <p className={styles.hint}>Our only wine recipe uses champagne.</p>}
          {!drinking && <p className={styles.hint}>Only recipes with a reviewed alcohol-free version.</p>}
          {!drinking && !mocktails.length && <p className={styles.hint}>No matches. Try fewer flavours.</p>}
          {(cocktails.length > 0 || mocktails.length > 0) && <div className={styles.ideaCards}>
            {(drinking ? cocktails : mocktails).map(item => <RecipeCard key={item.row.id} row={item.row} returnTo={returnTo} asHeading reviewedBase={item.review?.primaryBase} showType={false} />)}
          </div>}
        </section>
      </div>
    </div>
    {questionsInView && (drinking || mocktails.length > 0) && <a className={styles.resultBar} href={drinking ? '#your-spirit' : '#drink-ideas'}>
      <span className={styles.resultBarText}><small>{drinking ? 'Your spirit' : 'Mocktails'}</small><strong>{drinking ? shown.name : `${mocktails.length} ${mocktails.length === 1 ? 'idea' : 'ideas'}`}{drinking && listing ? ` · ${listing.bottles.length} ${listing.bottles.length === 1 ? 'bottle' : 'bottles'}` : ''}</strong></span>
      <span className={styles.resultBarAction}>{drinking ? 'See bottles' : 'See ideas'}</span>
    </a>}
  </div>
}
