import Link from 'next/link'
import AccountLink from './account/account-link'
import { archivo, manrope } from './fonts'
import { Wordmark } from './logo'
import NavPending from './nav-pending'
import styles from './tool-shell.module.css'

// Shared shell for Party Planner and Find My Drink (Pre-Party R3). A tool page puts these on its root element:
//   <div className={`${toolRoot} ...`} data-theme="tools">
// Importing this file imports app/fonts.ts, which is what makes next/font preload the two faces on the tool routes only.
export const toolFonts = `${archivo.variable} ${manrope.variable}`
export const toolRoot = `sf ${styles.root} ${toolFonts}`

export type ToolName = 'planner' | 'finder'

export function ToolHeader({ current }: { current?: ToolName }) {
  return <header className={styles.header} data-tool-header>
    <Link href="/" className={styles.wordmark} aria-label="Socifer home"><Wordmark label={null} /><NavPending /></Link>
    <nav className={styles.nav} aria-label="Tools">
      <Link href="/party-planner" aria-current={current === 'planner' ? 'page' : undefined}>Plan a party<NavPending /></Link>
      <Link href="/find-my-drink" aria-current={current === 'finder' ? 'page' : undefined}>Find a drink<NavPending /></Link>
    </nav>
    <AccountLink className={styles.account} />
  </header>
}

export function ToolFooter() {
  return <footer className={styles.footer} data-tool-footer>
    <nav aria-label="Footer navigation">
      <Link href="/">Home<NavPending /></Link>
      <Link href="/party-planner">Plan a party<NavPending /></Link>
      <Link href="/find-my-drink">Find a drink<NavPending /></Link>
      <Link href="/#privacy">Privacy</Link>
      <Link href="/#responsible-use">Responsible use</Link>
    </nav>
    <p>For adults. Drink responsibly and never drink and drive.</p>
  </footer>
}
