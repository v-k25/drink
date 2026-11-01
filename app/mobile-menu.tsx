'use client'

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { CloseIcon, MenuIcon } from './icons'

export default function MobileMenu({ className, children }: { className: string; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(false)
  const close = (restoreFocus: boolean) => {
    if (!menu.current?.open) return
    menu.current.open = false
    if (restoreFocus) menu.current.querySelector('summary')?.focus()
  }
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(true) }
  // The summary shows ✕ while open; the scrim dims the page below the header and closes the menu when tapped.
  return (
    <details ref={menu} className={className} onKeyDown={onKeyDown} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary aria-label={open ? 'Close menu' : 'Menu'}>{open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</summary>
      <nav aria-label="Mobile navigation" onClick={event => { if ((event.target as HTMLElement).closest('a')) close(false) }}>{children}</nav>
      <div className="menu-scrim" aria-hidden="true" onClick={() => close(false)} />
    </details>
  )
}
