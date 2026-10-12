import Link from 'next/link'
import Making from './making'
import RecipeCard from './recipe-card'
import Shell from './shell'
import { typeLabel, safeResultsHref } from '../recipe'
import RecipeImage from './recipe-image'
import { metricIngredients } from '../metric'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'
import Community from './community'
import type { CommunityState } from '../community'

export function DetailUnavailable() {
  return <Shell>
    <div className={styles.detailBody}>
      <Link href="/find-my-drink" className={styles.backLink}>← All recipes</Link>
      <div className={styles.emptySlot}>
        <p>Recipes are temporarily unavailable.</p>
        <p className={styles.hint}>The recipe library could not be reached. Please try again shortly.</p>
        <a href="" className={styles.filter}>Try again</a>
      </div>
    </div>
  </Shell>
}

export default function Detail({ recipe, related, community, returnTo }: { recipe: RecipeRow; related: RecipeRow[] | null; community: CommunityState | null; returnTo?: string }) {
  // The stored original image is preferred when present; otherwise the
  // hand-authored SVG fallback renders decoratively.
  const resultsHref = safeResultsHref(returnTo)
  // Metric display lines: each exact source line rewritten metric-first with a
  // practical metric equivalent only where it can be safely converted (pure
  // helper over the validated row; the raw quantities themselves are never
  // rewritten in storage). The note labels the approximations near the
  // checklist whenever any line converted or stayed ambiguous.
  const metric = metricIngredients(recipe.ingredients)
  const quantityNote = metric.convertedCount > 0 || metric.ambiguousCount > 0
    ? 'Approximate metric conversions; source quantities retained internally. Where conversion is unclear, original unit shown.'
    : null
  return <Shell>
    <div className={styles.detailBody}>
      <Link href={resultsHref} className={styles.backLink}>← Back to recipes</Link>
      <div className={styles.detailIntro}>
      <div className={styles.titleBlock}>
        <p className={styles.eyebrow}>The selected collection</p>
        <h1>{recipe.name}</h1>
        <p className={styles.typeLine}>{typeLabel(recipe.alcoholType, recipe.baseSpirit)}</p>
        {recipe.abv !== null && <p className={styles.abvLine}>ABV {String(recipe.abv)}%</p>}
        {recipe.description !== null && <p className={styles.description}>{recipe.description}</p>}
        {(recipe.recipeYield !== null || recipe.prepTimeMin !== null || recipe.preparationMethod !== null || recipe.glassware !== null || recipe.garnish !== null || recipe.iceType !== null) && <p className={styles.metaLine}>
          {recipe.recipeYield !== null && <span>Yield: {recipe.recipeYield}</span>}
          {recipe.prepTimeMin !== null && <span>Prep: {recipe.prepTimeMin} min</span>}
          {recipe.preparationMethod !== null && <span>Method: {recipe.preparationMethod}</span>}
          {recipe.glassware !== null && <span>Glass: {recipe.glassware}</span>}
          {recipe.garnish !== null && <span>Garnish: {recipe.garnish}</span>}
          {recipe.iceType !== null && <span>Ice: {recipe.iceType}</span>}
        </p>}
        <p className={styles.unknownLine}>Allergens: {recipe.allergens === null ? 'not specified' : recipe.allergens.length > 0 ? recipe.allergens.join(', ') : 'none listed'} · Caffeine: {recipe.hasCaffeine === null ? 'not specified' : recipe.hasCaffeine ? 'contains' : 'none reported'}</p>
        <div className={styles.detailJumps}><a href="#ingredients" className={styles.filter}>Ingredients ↓</a><a href="#method" className={styles.primary}>Start making ↓</a></div>
      </div>
      </div>
      <Community key={`${recipe.id}:${community?.signedIn ?? 'unavailable'}`} drinkId={recipe.id} initial={community}>
      <section className={`${styles.card} ${styles.sectionCard}`} aria-labelledby="making-title">
        <h2 id="making-title">Make it</h2>
        <Making ingredients={metric.lines.map(line => line.display)} steps={recipe.preparation} quantityNote={quantityNote} />
      </section>
      <RecipeImage key={`${recipe.id}:${recipe.imageUrl}`} row={recipe} width={1200} height={800} className={styles.heroImage} />
      <details className={styles.sourceContext}>
        <summary>Source & recipe context</summary>
        <p>Recipe facts from <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceName}</a>. Retrieved {recipe.sourceRetrievedAt.slice(0, 10)}.</p>
        <p>Preparation wording reviewed for this collection. Unspecified or unlisted allergens and caffeine do not establish their absence.</p>
      </details>
      </Community>
      {related !== null && related.length > 0 && <section className={styles.related} aria-labelledby="related-title">
        <h2 id="related-title">More like this</h2>
        <div className={styles.relatedGrid}>{related.map(row => <RecipeCard key={row.id} row={row} returnTo={resultsHref} preserveAnchor />)}</div>
      </section>}
      <p className={styles.disclaimer}>Recipes are for adults who meet the legal drinking-age requirements where they live. Please enjoy responsibly.</p>
    </div>
  </Shell>
}
