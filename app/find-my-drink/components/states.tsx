import styles from '../finder.module.css'

// Honest empty state while zero recipes are editorially approved (the
// fail-closed not-ready mapping and the eligible-but-empty library render the
// same truthful message — nothing unreviewed is shown).
export function NothingPublished() {
  return <div className={styles.stateCard}>
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7" /></svg>
    <p>Nothing is published here yet.</p>
    <p className={styles.srOnly}>Recipes appear once they have been editorially reviewed and approved for publishing. Nothing unreviewed is shown, so the library is empty for now.</p>
  </div>
}

// Clear unavailable state for database or network errors: fail closed, never
// legacy or draft rows, never a fabricated substitute.
export function Unavailable() {
  return <div className={styles.stateCard}>
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 17h.01" /></svg>
    <p>Recipes are temporarily unavailable.</p>
    <p className={styles.srOnly}>The recipe library could not be reached. Please try again shortly.</p>
    <a href="" className={styles.filter}>Try again</a>
  </div>
}
