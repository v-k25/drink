'use client'

import { createPortal } from 'react-dom'
import { useLinkStatus } from 'next/link'
import { DetailSkeletonBody, ListingSkeletonBody } from './skeletons'
import styles from '../finder.module.css'

// Rendered inside a Link: while that navigation is pending, a layout-matched skeleton covers the page below the
// header. Nothing renders otherwise, so the link's accessible name is unchanged. Client-side only (no streaming),
// so visitors without JavaScript get the normal full page response.
// The skeleton is block content (div, section, article), so it is portalled to the themed page root: inside the
// link it would sit in a <p> or <h3> card name, which is invalid HTML and a hydration error.
function Overlay({ children }: { children: React.ReactNode }) {
  const root = document.querySelector('[data-theme="tools"]') ?? document.body
  return createPortal(<div className={styles.skOverlay}>{children}</div>, root)
}

export function DetailPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Overlay><DetailSkeletonBody /><span className={styles.srOnly} role="status">Loading recipe…</span></Overlay>
}

export function ListingPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Overlay><ListingSkeletonBody /><span className={styles.srOnly} role="status">Loading recipes…</span></Overlay>
}
