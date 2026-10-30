import Link from 'next/link'
import type { Metadata } from 'next'
import { ToolFooter, ToolHeader, toolRoot } from './tool-shell'
import styles from './not-found.module.css'

export const metadata: Metadata = { title: 'Page not found | Socifer' }

// Themed 404 (Pre-Party R6 follow-up): the tool shell, plain copy and two ways back.
export default function NotFound() {
  return <div className={toolRoot} data-theme="tools">
    <a href="#main" className="skip-link">Skip to content</a>
    <ToolHeader />
    <main id="main" tabIndex={-1} className={styles.stage}>
      <p className={styles.code} aria-hidden="true">404</p>
      <h1 className={styles.title}>That page isn’t here.</h1>
      <p className={styles.copy}>The link may be old, or the address may have a typo.</p>
      <div className={styles.actions}>
        <Link href="/" className="sf-btn sf-btn--primary">Go to the home page</Link>
        <Link href="/find-my-drink" className="sf-btn sf-btn--ghost">Find a drink</Link>
      </div>
    </main>
    <ToolFooter />
  </div>
}
