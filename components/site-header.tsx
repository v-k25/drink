'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const navItems = [
  { href: '/find-my-sip', label: 'Find My Sip' },
  { href: '/party-planner', label: 'Party Planner' },
  { href: '/jaipur', label: 'Jaipur' },
  { href: '/zero-percent', label: '0% Drinks' },
  { href: '/guides', label: 'Guides' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-border/60 text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10" aria-label="Main navigation">
        <Link href="/" className="font-serif text-xl leading-none tracking-tight" onClick={() => setOpen(false)}>
          <span className="block">THE SIP</span>
          <span className="block">SOCIETY</span>
        </Link>
        <div className="hidden items-center gap-7 text-xs font-medium uppercase tracking-[0.14em] lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} className="transition-colors hover:text-primary" href={item.href}>{item.label}</Link>
          ))}
        </div>
        <Link href="/early-access" className="hidden bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-transform hover:-translate-y-0.5 md:block">
          Join early access
        </Link>
        <button
          type="button"
          className="flex size-11 items-center justify-center border border-border lg:hidden"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>
      {open ? (
        <div className="border-t border-border bg-background px-5 py-6 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            {navItems.map((item) => (
              <Link key={item.href} className="font-serif text-3xl" href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
            ))}
            <Link href="/early-access" className="mt-2 bg-primary px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground" onClick={() => setOpen(false)}>
              Join early access
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
