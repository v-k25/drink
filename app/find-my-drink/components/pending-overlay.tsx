'use client'

import { createPortal } from 'react-dom'
import { useLinkStatus } from 'next/link'
import { LoadingScreen } from '../../logo'
import styles from '../finder.module.css'

// Rendered inside a Link: while that navigation is pending, the shared branded loading screen covers the page (the
// same one as every other page load). Nothing renders otherwise, so the link's accessible name is unchanged.
// Client-side only, so visitors without JavaScript get the normal full page response. The screen is block content,
// so it is portalled to the themed page root: inside the link it would sit in a <p> or <h3> card name, which is
// invalid HTML and a hydration error.
function Overlay({ label }: { label: string }) {
  const root = document.querySelector('[data-theme="tools"]') ?? document.body
  return createPortal(<div className="sf-nav-loading"><LoadingScreen /><span className={styles.srOnly} role="status">{label}</span></div>, root)
}

export function DetailPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Overlay label="Loading recipe…" />
}

export function ListingPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Overlay label="Loading recipes…" />
}
