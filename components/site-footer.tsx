import Link from 'next/link'

const links = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/responsible-use', label: 'Responsible use' },
  { href: '/contact', label: 'Contact' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-foreground px-5 py-12 text-background md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-md flex-col gap-4">
          <p className="font-serif text-4xl">A better answer to tonight.</p>
          <p className="text-sm leading-relaxed text-background/65">Drink discovery for Jaipur, built around taste, mood and the moment. Alcoholic or 0%, always enjoy responsibly.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Footer navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className="hover:text-primary">{link.label}</Link>)}
          <a href="https://app.mywebsite.in" aria-label="App experience, coming soon">App — coming soon</a>
          <a href="https://support.mywebsite.in" aria-label="Support center, coming soon">Support — coming soon</a>
        </nav>
        <p className="text-xs text-background/55">© 2026 Drink. Jaipur-first.</p>
      </div>
    </footer>
  )
}
