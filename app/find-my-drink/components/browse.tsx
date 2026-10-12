import Link from 'next/link'
import FilterSheet, { FilterChoice } from './filter-sheet'
import Discovery from './discovery'
import Pantry from './pantry'
import { NothingPublished, Unavailable } from './states'
import Shell from './shell'
import { capitalize } from '../recipe'
import type { ListingData, ListingFilters, RecipeRow } from '../queries'
import styles from '../finder.module.css'

function hrefWith(filters: ListingFilters, overrides: Partial<ListingFilters> = {}, cursor?: { name: string; id: string } | null): string {
  const selected = { ...filters, ...overrides }
  const search = new URLSearchParams()
  if (selected.q) search.set('q', selected.q)
  if (selected.drinkType !== 'all') search.set('drink', selected.drinkType)
  for (const type of selected.types) search.append('type', type)
  if (selected.method) search.set('method', selected.method)
  if (selected.maxIngredients !== null) search.set('max', String(selected.maxIngredients))
  if (Object.keys(overrides).length === 0 && selected.picks?.length) search.set('pick', selected.picks.join(','))
  if (cursor) search.set('cursor', `${cursor.name}::${cursor.id}`)
  return `/find-my-drink${search.size ? `?${search.toString()}` : ''}`
}

export default function Browse({ state, data, filters, cursor, eligibleRows }: {
  eligibleRows: RecipeRow[]; state: 'ok' | 'not-ready' | 'unavailable'; data: ListingData | null; filters: ListingFilters; cursor: { name: string; id: string } | null
}) {
  const hasLibrary = state === 'ok' && data !== null && data.eligibleTotal > 0
  const returnTo = hrefWith(filters, {}, cursor)
  const activeCount = Number(Boolean(filters.q)) + Number(filters.drinkType !== 'all') + filters.types.length + Number(Boolean(filters.method)) + Number(filters.maxIngredients !== null)
  const facets = data && <div className={styles.facetContent}>
    <div className={styles.facetGroup} role="group" aria-label="Base spirit"><p className={styles.chipLabel}>Base spirit</p><div className={styles.categoryStrip}>{data.spiritChips.map(chip => { const active = filters.types.includes(chip.name); return <FilterChoice key={chip.name} href={hrefWith(filters, { types: active ? filters.types.filter(type => type !== chip.name) : [...filters.types, chip.name] })} className={active ? styles.filterActive : styles.filter} current={active}>{capitalize(chip.name)} ({chip.count})</FilterChoice> })}</div><p className={styles.hint}>Spirit selections match any selected spirit; each count includes your current spirit choices. Other filters apply together.</p></div>
    {data.methodChips.length > 0 && <div className={styles.facetGroup} role="group" aria-label="Recorded method"><p className={styles.chipLabel}>Recorded method</p><div className={styles.categoryStrip}>{data.methodChips.map(chip => <FilterChoice key={chip.name} href={hrefWith(filters, { method: filters.method === chip.name ? null : chip.name })} className={filters.method === chip.name ? styles.filterActive : styles.filter} current={filters.method === chip.name}>{capitalize(chip.name)} ({chip.count})</FilterChoice>)}</div></div>}
    <div className={styles.facetGroup} role="group" aria-label="Listed ingredients"><p className={styles.chipLabel}>Listed ingredients</p><div className={styles.categoryStrip}>{data.maxChips.map(chip => <FilterChoice key={chip.value} href={hrefWith(filters, { maxIngredients: filters.maxIngredients === chip.value ? null : chip.value })} className={filters.maxIngredients === chip.value ? styles.filterActive : styles.filter} current={filters.maxIngredients === chip.value}>{chip.value} or fewer ({chip.count})</FilterChoice>)}</div></div>
    <p className={styles.hint}>Counts reflect your search and the other active filters.</p>
  </div>
  return <Shell>
    <div className={styles.intro}><p className={styles.eyebrow}>Find a recipe</p><h1>What sounds good?</h1><p className={styles.introLine}>Find a recipe from our selected collection.</p></div>
    <div className={styles.browseLayout}>
      {state === 'unavailable' && <div className={styles.card}><Unavailable /></div>}
      {(state === 'not-ready' || (state === 'ok' && data?.eligibleTotal === 0)) && <div className={styles.card}><NothingPublished /></div>}
      {hasLibrary && data && <>
        <section className={styles.discoveryControls} aria-label="Search and browse recipes">
          <form method="get" action="/find-my-drink" className={styles.searchForm} role="search">
            {filters.drinkType !== 'all' && <input type="hidden" name="drink" value={filters.drinkType} />}{filters.types.map(type => <input key={type} type="hidden" name="type" value={type} />)}{filters.method && <input type="hidden" name="method" value={filters.method} />}{filters.maxIngredients !== null && <input type="hidden" name="max" value={String(filters.maxIngredients)} />}
            <label className={styles.fieldLabel} htmlFor="recipe-search">Search by name or ingredient</label><div className={styles.searchRow}><input id="recipe-search" type="search" name="q" defaultValue={filters.q} placeholder="Try lime or a favourite drink" /><button type="submit" className={styles.primary}>Search</button></div>
          </form>
          <nav className={styles.typeControl} aria-label="Drink type">{data.typeChips.map(chip => <FilterChoice key={chip.value} href={hrefWith(filters, { drinkType: chip.value })} className={filters.drinkType === chip.value ? styles.typeActive : styles.typeOption} current={filters.drinkType === chip.value}>{chip.value === 'all' ? 'All' : chip.value === 'mocktail' ? 'Mocktails' : 'Cocktails'} <span>({chip.count})</span></FilterChoice>)}</nav>
          <div className={styles.activeFilters} aria-label="Active filters">{filters.q && <FilterChoice className={styles.filterActive} href={hrefWith(filters, { q: '' })}>Search: {filters.q} ×</FilterChoice>}{filters.drinkType !== 'all' && <FilterChoice className={styles.filterActive} href={hrefWith(filters, { drinkType: 'all' })}>{filters.drinkType === 'mocktail' ? 'Mocktails' : 'Cocktails'} ×</FilterChoice>}{filters.types.map(type => <FilterChoice key={type} className={styles.filterActive} href={hrefWith(filters, { types: filters.types.filter(value => value !== type) })}>{capitalize(type)} ×</FilterChoice>)}{filters.method && <FilterChoice className={styles.filterActive} href={hrefWith(filters, { method: null })}>{capitalize(filters.method)} ×</FilterChoice>}{filters.maxIngredients !== null && <FilterChoice className={styles.filterActive} href={hrefWith(filters, { maxIngredients: null })}>{filters.maxIngredients} ingredients or fewer ×</FilterChoice>}{activeCount > 0 && <FilterChoice className={styles.resetFilters} href="/find-my-drink">Reset</FilterChoice>}</div>
        </section>
        <aside className={styles.filterPanel} aria-label="Recipe refinement"><FilterSheet count={activeCount} resultCount={data.total}>{facets}</FilterSheet>{facets}</aside>
        <div className={styles.resultsPanel}>
          <Pantry eligibleRows={eligibleRows} matchingRows={data.matchingRows} returnTo={returnTo} />
          <div id="ordinary-results"><p className={styles.statusLine} role="status" aria-live="polite" aria-atomic="true">{data.total} matching {data.total === 1 ? 'recipe' : 'recipes'} / selected collection</p>
          {data.total === 0 ? <div className={styles.emptySlot}><h2>No matches just yet</h2><p>Try a different search or remove a filter.</p><Link className={styles.filter} href="/find-my-drink">Clear all filters</Link></div> : <Discovery key={returnTo} pool={data.matchingRows} initial={data.recommendations} pageRows={data.pageRows} query={filters.q} returnTo={returnTo} />}
          {data.nextCursor && <Link className={styles.secondary} href={hrefWith(filters, {}, data.nextCursor)}>Next recipes ({data.total - data.shownTotal} more)</Link>}{cursor && <Link className={styles.backLink} href={hrefWith(filters)}>Back to first matches</Link>}</div>
        </div>
        <p className={styles.browseDisclaimer}>Recipes are for adults who meet the legal drinking-age requirements where they live. Please enjoy responsibly. Quantities are shown in approximate metric units when a safe conversion is possible.</p>
      </>}
    </div>
  </Shell>
}
