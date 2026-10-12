import Link from 'next/link'
import styles from '../finder.module.css'

// Shared shell for the recipe listing and detail routes. The eligibility gate
// keeps its own self-contained markup and styles.
export default function Shell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>Socifer</Link>
      <div className={styles.headerActions}><Link href="/find-my-drink/saved" className={styles.linkButton}>Saved recipes</Link><Link href="/party-planner" className={styles.linkButton}>Party Planner</Link></div>
    </header>
    <main id="main" tabIndex={-1}>{children}</main>
  </div>
}
