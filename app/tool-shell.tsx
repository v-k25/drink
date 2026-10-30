import Link from 'next/link'
import { bricolage, manrope } from './fonts'
import styles from './tool-shell.module.css'

// Shared shell for Party Planner and Find My Drink (Pre-Party R3). A tool page puts these on its root element:
//   <div className={`${toolRoot} ...`} data-theme="tools">
// Importing this file imports app/fonts.ts, which is what makes next/font preload the two faces on the tool routes only.
export const toolFonts = `${bricolage.variable} ${manrope.variable}`
export const toolRoot = `sf ${styles.root} ${toolFonts}`

export type ToolName = 'planner' | 'finder'

export function ToolHeader({ current }: { current: ToolName }) {
  return <header className={styles.header} data-tool-header>
    <Link href="/" className={styles.wordmark} aria-label="Socifer home">socifer</Link>
    <nav className={styles.nav} aria-label="Tools">
      <Link href="/party-planner" aria-current={current === 'planner' ? 'page' : undefined}>Plan a party</Link>
      <Link href="/find-my-drink" aria-current={current === 'finder' ? 'page' : undefined}>Find a drink</Link>
    </nav>
    <span className={styles.saved}>Saved on this device · no account needed</span>
  </header>
}

export function ToolFooter() {
  return <footer className={styles.footer} data-tool-footer>
    <nav aria-label="Footer navigation">
      <Link href="/">Home</Link>
      <Link href="/party-planner">Plan a party</Link>
      <Link href="/find-my-drink">Find a drink</Link>
      <Link href="/#privacy">Privacy</Link>
      <Link href="/#responsible-use">Responsible use</Link>
    </nav>
    <p>For adults. Drink responsibly and never drink and drive.</p>
  </footer>
}
