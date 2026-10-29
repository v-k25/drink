import { ListingPending } from './pending-overlay'
import Link from 'next/link'
import Description from './description'
import Making from './making'
import StartButton from './start-button'
import RecipeCard from './recipe-card'
import Shell from './shell'
import { capitalize, typeLabel, safeResultsHref } from '../recipe'
import RecipeImage from './recipe-image'
import { metricIngredients } from '../metric'
import type { RecipeRow } from '../queries'
import { Unavailable } from './states'
import styles from '../finder.module.css'

export function DetailUnavailable() {
  return <Shell>
    <div className={styles.detailBody}>
      <Link href="/find-my-drink" className={styles.backLink}>← All recipes</Link>
      <Unavailable />
    </div>
  </Shell>
}

export default function Detail({ recipe, related, returnTo }: { recipe: RecipeRow; related: RecipeRow[] | null; returnTo?: string }) {
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
  const allergens = recipe.allergens === null ? 'not specified' : recipe.allergens.length > 0 ? recipe.allergens.join(', ') : 'none listed'
  const caffeine = recipe.hasCaffeine === null ? 'not specified' : recipe.hasCaffeine ? 'contains' : 'none reported'
  // Spec chips: tiny label over the value. The plain "Label: value" string stays
  // in the DOM (visually hidden) as the chip's accessible text.
  const specs: { label: string; value: string; shown?: string }[] = []
  if (recipe.glassware !== null) specs.push({ label: 'Glass', value: recipe.glassware })
  if (recipe.preparationMethod !== null) specs.push({ label: 'Method', value: recipe.preparationMethod, shown: capitalize(recipe.preparationMethod) })
  if (recipe.iceType !== null) specs.push({ label: 'Ice', value: recipe.iceType })
  if (recipe.garnish !== null) specs.push({ label: 'Garnish', value: recipe.garnish })
  if (recipe.recipeYield !== null) specs.push({ label: 'Yield', value: recipe.recipeYield })
  if (recipe.prepTimeMin !== null) specs.push({ label: 'Prep', value: `${recipe.prepTimeMin} min` })
  if (recipe.abv !== null) specs.push({ label: 'ABV', value: `${String(recipe.abv)}%` })
  specs.push({ label: 'Allergens', value: allergens }, { label: 'Caffeine', value: caffeine })
  return <Shell>
    <div className={styles.detailBody}>
      <article className={styles.detailPage}>
        <Link href={resultsHref} className={styles.backLink}>← Back to recipes<ListingPending /></Link>
        <div className={styles.titleBlock}>
          <p className={styles.typeLine}>{typeLabel(recipe.alcoholType, recipe.baseSpirit)}</p>
          <h1>{recipe.name}</h1>
          {recipe.description !== null && <Description text={recipe.description} />}
          <ul className={styles.specChips} aria-label="Recipe details">
            {specs.map(spec => <li key={spec.label} className={spec.value === 'not specified' ? styles.srOnly : styles.specChip}>
              {spec.value !== 'not specified' && <span aria-hidden="true"><small>{spec.label}</small>{spec.shown ?? spec.value}</span>}
              <span className={styles.srOnly}>{spec.label}: {spec.value}</span>
            </li>)}
          </ul>
          <div className={styles.detailJumps}><StartButton hasSteps={recipe.preparation.length > 0} /><a href="#ingredients" className={styles.filter}>Ingredients ↓</a></div>
        </div>
        <section className={styles.makeSection} aria-labelledby="making-title">
          <h2 id="making-title" className={styles.srOnly}>Make it</h2>
          <Making name={recipe.name} ingredients={metric.lines.map(line => line.display)} steps={recipe.preparation} quantityNote={quantityNote} />
        </section>
        <RecipeImage key={`${recipe.id}:${recipe.imageUrl}`} row={recipe} width={1200} height={750} className={styles.heroImage} />
        <details className={styles.sourceContext}>
          <summary>Source & recipe context</summary>
          <p>Recipe facts from <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceName}</a>. Retrieved {recipe.sourceRetrievedAt.slice(0, 10)}.</p>
          <p>Preparation wording reviewed for this collection. Unspecified or unlisted allergens and caffeine do not establish their absence.</p>
        </details>
        {related !== null && related.length > 0 && <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title">More like this</h2>
          <div className={styles.relatedGrid}>{related.map(row => <RecipeCard key={row.id} row={row} returnTo={resultsHref} preserveAnchor />)}</div>
        </section>}
        <p className={styles.disclaimer}>Recipes are for adults who meet the legal drinking-age requirements where they live. Please enjoy responsibly.</p>
      </article>
    </div>
  </Shell>
}
