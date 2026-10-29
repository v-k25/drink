'use client'

import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export default function MobileMenu({ className, children }: { className: string; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const close = (restoreFocus: boolean) => {
    if (!menu.current?.open) return
    menu.current.open = false
    if (restoreFocus) menu.current.querySelector('summary')?.focus()
  }
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(true) }
  return (
    <details ref={menu} className={className} onKeyDown={onKeyDown}>
      <summary>Menu <span aria-hidden="true">+</span></summary>
      <nav aria-label="Mobile navigation" onClick={event => { if ((event.target as HTMLElement).closest('a')) close(false) }}>{children}</nav>
    </details>
  )
}
