import Link from 'next/link'
import { capitalize, safeResultsHref } from '../recipe'
import RecipeImage from './recipe-image'
import { DetailPending } from './pending-overlay'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

// Recipe card for the listing and the related rail: one link per card, facts
// from the stored columns only (type/base spirit, ingredient count). The
// stored original image is preferred when present; otherwise the hand-authored
// SVG fallback renders decoratively. No save or like controls — Phase 1 is
// read-only.
export default function RecipeCard({ row, returnTo, reason, preserveAnchor, asHeading, tags, reviewedBase }: { row: RecipeRow; returnTo?: string; reason?: string; preserveAnchor?: boolean; asHeading?: boolean; tags?: readonly string[]; reviewedBase?: string | null }) {
  const back = returnTo ? safeResultsHref(preserveAnchor ? returnTo : `${returnTo.split('#')[0]}#recipe-${encodeURIComponent(row.id)}`) : null
  const href = `/find-my-drink/${encodeURIComponent(row.id)}${back ? `?from=${encodeURIComponent(back)}` : ''}`
  const base = reviewedBase ?? row.baseSpirit
  return <article id={`recipe-${row.id}`} className={styles.product}>
    <div className={styles.productLink}>
      <div className={styles.imgWrap}>
        <RecipeImage key={`${row.id}:${row.imageUrl}`} row={row} width={600} height={450} />
        <span className={styles.tag}>{row.alcoholType === 'mocktail' ? 'Mocktail' : 'Cocktail'}</span>
      </div>
      {asHeading ? <h3 className={styles.cardName}><Link href={href}>{row.name}<DetailPending /></Link></h3> : <p className={styles.cardName}><Link href={href}>{row.name}<DetailPending /></Link></p>}
      {reason && <span className={styles.matchReason}>{reason}</span>}
      {tags && tags.length > 0 && <span className={styles.guideTags}>Reviewed tastes: {tags.join(', ')}</span>}
      {base && <span className={styles.cardMeta}>{capitalize(base)}</span>}
      {(row.servings !== null || row.prepTimeMin !== null) && <span className={styles.cardFacts}>{row.servings !== null ? `Serves ${row.servings}` : ''}{row.servings !== null && row.prepTimeMin !== null ? ' · ' : ''}{row.prepTimeMin !== null ? `${row.prepTimeMin} min` : ''}</span>}
      <span className={styles.cardFacts}>{row.preparationMethod ? `${capitalize(row.preparationMethod)} · ` : ''}{row.ingredients.length} {row.ingredients.length === 1 ? 'ingredient' : 'ingredients'}</span>
    </div>
  </article>
}
