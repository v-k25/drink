import styles from '../finder.module.css'

// Honest empty state while zero recipes are editorially approved (the
// fail-closed not-ready mapping and the eligible-but-empty library render the
// same truthful message — nothing unreviewed is shown).
export function NothingPublished() {
  return <div className={styles.emptySlot}>
    <p>Nothing is published here yet.</p>
    <p className={styles.hint}>Recipes appear once they have been editorially reviewed and approved for publishing. Nothing unreviewed is shown, so the library is empty for now.</p>
  </div>
}

// Clear unavailable state for database or network errors: fail closed, never
// legacy or draft rows, never a fabricated substitute.
export function Unavailable() {
  return <div className={styles.emptySlot}>
    <p>Recipes are temporarily unavailable.</p>
    <p className={styles.hint}>The recipe library could not be reached. Please try again shortly.</p>
    <a href="" className={styles.filter}>Try again</a>
  </div>
}
