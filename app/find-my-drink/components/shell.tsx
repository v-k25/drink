import { ToolFooter, ToolHeader, toolRoot } from '../../tool-shell'
import styles from '../finder.module.css'

// Shared shell for the recipe listing and detail routes. The eligibility gate renders the same pieces itself.
export default function Shell({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.shell} ${toolRoot}`} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader current="finder" />
    <main id="main" tabIndex={-1}>{children}</main>
    <ToolFooter />
  </div>
}
