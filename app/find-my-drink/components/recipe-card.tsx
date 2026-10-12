import Link from 'next/link'
import { typeLabel, safeResultsHref } from '../recipe'
import RecipeImage from './recipe-image'
import type { RecipeRow } from '../queries'
import styles from '../finder.module.css'

// Recipe card for the listing and the related rail: one link per card, facts
// from the stored columns only (type/base spirit, ingredient count). The
// stored original image is preferred when present; otherwise the hand-authored
// SVG fallback renders decoratively. No save or like controls — Phase 1 is
// read-only.
export default function RecipeCard({ row, returnTo, reason, preserveAnchor }: { row: RecipeRow; returnTo?: string; reason?: string; preserveAnchor?: boolean }) {
  const back = returnTo ? safeResultsHref(preserveAnchor ? returnTo : `${returnTo.split('#')[0]}#recipe-${encodeURIComponent(row.id)}`) : null
  const href = `/find-my-drink/${encodeURIComponent(row.id)}${back ? `?from=${encodeURIComponent(back)}` : ''}`
  return <article id={`recipe-${row.id}`} className={styles.product}>
    <Link href={href} className={styles.productLink}>
      <RecipeImage key={`${row.id}:${row.imageUrl}`} row={row} width={600} height={450} />
      <strong>{row.name}</strong>
      <span>{typeLabel(row.alcoholType, row.baseSpirit)}</span>
      <span>{row.ingredients.length} {row.ingredients.length === 1 ? 'listed ingredient' : 'listed ingredients'}</span>
      {reason && <span className={styles.matchReason}>{reason}</span>}
    </Link>
  </article>
}
