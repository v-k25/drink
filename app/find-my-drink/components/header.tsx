import Link from 'next/link'
import styles from '../finder.module.css'

// Shared tool header (same pattern as the Party Planner header): wordmark home, tool switcher.
export default function ToolHeader() {
  return <header className={styles.header}>
    <Link href="/" className={styles.logo}>Socifer</Link>
    <nav className={styles.toolNav} aria-label="Tools"><Link href="/party-planner">Party Planner</Link><Link href="/find-my-drink" aria-current="page">Find My Drink</Link></nav>
  </header>
}
