'use client'

import { useEffect, useRef, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { FilterIcon } from './icons'
import styles from '../finder.module.css'

function PendingLinkStatus() {
  const { pending } = useLinkStatus()
  return <span className={`${styles.pendingLinkStatus} ${styles.srOnly}`} role="status" aria-live="polite">{pending ? 'Updating recipe matches…' : ''}</span>
}

export function FilterChoice({ href, children, className, current = false }: { href: string; children: React.ReactNode; className: string; current?: boolean }) {
  return <Link href={href} scroll={false} prefetch={false} className={className} aria-current={current ? 'true' : undefined}>{children}<PendingLinkStatus /></Link>
}

function keepTabInside(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(node => node.getClientRects().length)
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

export default function FilterSheet({ children, count, resultCount }: { children: React.ReactNode; count: number; resultCount: number }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => setReady(true), [])
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])
  if (!ready) return <details className={styles.filterFallback}><summary>Refine matches{count ? ' (' + count + ')' : ''}</summary>{children}<p className={styles.filterCount} role="status" aria-live="polite">{resultCount} matching {resultCount === 1 ? 'recipe' : 'recipes'}</p><FilterChoice className={styles.resetFilters} href="/find-my-drink">Reset all filters</FilterChoice></details>
  return <>
    <button type="button" className={styles.mobileFilters} aria-haspopup="dialog" aria-expanded={open} aria-controls="finder-filter-dialog" onClick={() => setOpen(true)}>{<FilterIcon />}Filters{count ? ' (' + count + ')' : ''}</button>
    <dialog ref={dialog} className={styles.filterDialog} id="finder-filter-dialog" aria-labelledby="filter-sheet-title" onClose={() => setOpen(false)} onKeyDown={keepTabInside}>
      <div className={styles.dialogHeading}><h2 id="filter-sheet-title">Refine matches</h2><button type="button" className={styles.secondary} onClick={() => setOpen(false)}>Close</button></div>
      <p className={styles.filterCount} role="status" aria-live="polite">{resultCount} matching {resultCount === 1 ? 'recipe' : 'recipes'}</p>{children}<FilterChoice className={styles.resetFilters} href="/find-my-drink">Reset all filters</FilterChoice>
      <button type="button" className={styles.primary} onClick={() => setOpen(false)}>Done</button>
    </dialog>
  </>
}
