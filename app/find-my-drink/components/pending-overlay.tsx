'use client'

import { useLinkStatus } from 'next/link'
import { DetailSkeletonBody, ListingSkeletonBody } from './skeletons'
import styles from '../finder.module.css'

// Rendered inside a Link: while that navigation is pending, a layout-matched skeleton covers the page below the
// header. Nothing renders otherwise, so the link's accessible name is unchanged. Client-side only (no streaming),
// so visitors without JavaScript get the normal full page response.
export function DetailPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <span className={styles.skOverlay}><DetailSkeletonBody /><span className={styles.srOnly} role="status">Loading recipe…</span></span>
}

export function ListingPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <span className={styles.skOverlay}><ListingSkeletonBody /><span className={styles.srOnly} role="status">Loading recipes…</span></span>
}
