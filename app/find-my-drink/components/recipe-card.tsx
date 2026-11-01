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
// read-only. Facts are kept to two short lines: the spirit, then method,
// ingredient count and time; servings live on the recipe page. The type badge
// only shows where a list mixes cocktails and mocktails (showType).
export default function RecipeCard({ row, returnTo, reason, preserveAnchor, asHeading, reviewedBase, showType = true }: { row: RecipeRow; returnTo?: string; reason?: string; preserveAnchor?: boolean; asHeading?: boolean; reviewedBase?: string | null; showType?: boolean }) {
  const back = returnTo ? safeResultsHref(preserveAnchor ? returnTo : `${returnTo.split('#')[0]}#recipe-${encodeURIComponent(row.id)}`) : null
  const href = `/find-my-drink/${encodeURIComponent(row.id)}${back ? `?from=${encodeURIComponent(back)}` : ''}`
  const base = reviewedBase ?? row.baseSpirit
  const facts = [row.preparationMethod ? capitalize(row.preparationMethod) : null, `${row.ingredients.length} ${row.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`, row.prepTimeMin !== null ? `${row.prepTimeMin} min` : null].filter(Boolean).join(' · ')
  return <article id={`recipe-${row.id}`} className={styles.product}>
    <div className={styles.productLink}>
      <div className={styles.imgWrap}>
        <RecipeImage key={`${row.id}:${row.imageUrl}`} row={row} width={600} height={450} />
        {showType && <span className={styles.tag}>{row.alcoholType === 'mocktail' ? 'Mocktail' : 'Cocktail'}</span>}
      </div>
      {asHeading ? <h3 className={styles.cardName}><Link href={href}>{row.name}<DetailPending /></Link></h3> : <p className={styles.cardName}><Link href={href}>{row.name}<DetailPending /></Link></p>}
      {reason && <span className={styles.matchReason}>{reason}</span>}
      {base && <span className={styles.cardMeta}>{capitalize(base)}</span>}
      <span className={styles.cardFacts}>{facts}</span>
    </div>
  </article>
}
