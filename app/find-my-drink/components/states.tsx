import styles from '../finder.module.css'

// Honest empty state while zero recipes are editorially approved (the
// fail-closed not-ready mapping and the eligible-but-empty library render the
// same truthful message — nothing unreviewed is shown).
export function NothingPublished() {
  return <div className={styles.stateCard}>
    <h2>Nothing is published here yet</h2>
    <p>Recipes appear once they have been reviewed. Nothing unreviewed is shown.</p>
  </div>
}

// Clear unavailable state for database or network errors: fail closed, never
// legacy or draft rows, never a fabricated substitute.
export function Unavailable() {
  return <div className={styles.stateCard} role="alert">
    <span className={styles.stateGlyph} aria-hidden="true">!</span>
    <h2>Recipes are temporarily unavailable</h2>
    <p>Check your connection, then try again.</p>
    <a href="" className={styles.primary}>Try again</a>
  </div>
}
