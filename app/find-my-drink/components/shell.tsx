import ToolHeader from './header'
import styles from '../finder.module.css'

// Shared shell for the recipe listing and detail routes. The eligibility gate
// keeps its own self-contained markup and styles.
export default function Shell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader />
    <main id="main" tabIndex={-1}>{children}</main>
  </div>
}
