import Image from 'next/image'
import { ArrowDown, ArrowRight, Menu, Search } from 'lucide-react'

const journey = [
  { label: 'Your taste', detail: 'Bright, smoky, crisp or bold' },
  { label: 'Your mood', detail: 'Quiet night or full celebration' },
  { label: 'Your moment', detail: 'Budget, place and occasion' },
  { label: 'Your sip', detail: 'A match made for tonight' },
]

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10" aria-label="Main navigation">
        <a href="#top" className="font-serif text-xl leading-none tracking-tight md:text-2xl">
          <span className="block">THE SIP</span>
          <span className="block">SOCIETY</span>
        </a>
        <div className="hidden items-center gap-8 text-sm uppercase tracking-[0.14em] md:flex">
          <a className="transition-colors hover:text-primary" href="#journey">Explore</a>
          <a className="transition-colors hover:text-primary" href="#zero">Zero proof</a>
          <a className="transition-colors hover:text-primary" href="#jaipur">Jaipur</a>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <a className="flex items-center gap-2 transition-colors hover:text-primary" href="#journey">
            <Search className="size-4" aria-hidden="true" /> Search
          </a>
        </div>
        <a href="#journey" className="hidden rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 md:block">
          Find my sip
        </a>
        <a href="#journey" className="rounded-full border border-border p-3 md:hidden" aria-label="Skip to Find my sip">
          <Menu className="size-5" aria-hidden="true" />
        </a>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-end overflow-hidden md:items-center">
      <Image src="/images/hero-glass.png" alt="A rose and amber cocktail in a coupe glass" fill priority sizes="100vw" className="object-cover object-[62%_center] md:object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_82%,transparent)_42%,color-mix(in_oklab,var(--background)_10%,transparent)_78%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-7 px-5 pb-20 pt-36 md:px-10 md:pb-16">
        <p className="text-sm uppercase tracking-[0.24em] text-secondary">Personal pours, thoughtfully found</p>
        <h1 className="max-w-3xl text-balance font-serif text-6xl leading-[0.88] tracking-[-0.055em] sm:text-7xl md:text-8xl lg:text-[7.5rem]">
          What should I drink tonight?
        </h1>
        <p className="max-w-md text-pretty text-base leading-relaxed text-foreground/75 md:text-lg">
          Your personalized guide to excellent cocktails, zero-proof pours and nights worth remembering.
        </p>
        <a href="#journey" className="flex items-center gap-3 border-b border-secondary pb-2 text-sm uppercase tracking-[0.16em] text-secondary">
          Begin your pour <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}

function Journey() {
  return (
    <section id="journey" className="px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">The art of you, crafted</p>
          <h2 className="text-balance font-serif text-5xl leading-none tracking-tight md:text-7xl">One night. One perfect pour.</h2>
          <p className="text-pretty leading-relaxed text-muted-foreground">Tell us what the evening feels like. We&apos;ll turn a few details into a drink that fits.</p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {journey.map((step, index) => (
            <li key={step.label} className="flex min-h-64 flex-col justify-between gap-8 bg-background p-7">
              <span className="font-mono text-sm text-secondary">0{index + 1}</span>
              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-3xl">{step.label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <a href="#jaipur" className="mx-auto flex items-center gap-3 rounded-full bg-primary px-7 py-4 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
          Find my sip <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}

function Jaipur() {
  return (
    <section id="jaipur" className="border-y border-border px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-start gap-7 lg:pr-12">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Launching first in the Pink City</p>
          <h2 className="text-balance font-serif text-6xl leading-[0.9] tracking-tight md:text-8xl">Jaipur first.</h2>
          <p className="max-w-lg text-pretty text-lg leading-relaxed text-foreground/70">A city with impeccable taste deserves a better way to choose what comes next. Join the first circle of drinkers shaping Drink in Jaipur.</p>
          <a href="mailto:hello@drink.club?subject=Jaipur%20waitlist" className="rounded-full border border-primary px-7 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">Join the Jaipur waitlist</a>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-secondary/40 bg-card p-3">
          <Image src="/images/jaipur-duotone.png" alt="Hawa Mahal in Jaipur at dusk" width={1024} height={1024} sizes="(min-width: 1024px) 55vw, 100vw" className="aspect-[4/5] w-full rounded-3xl object-cover" />
        </div>
      </div>
    </section>
  )
}

function ZeroProof() {
  return (
    <section id="zero" className="px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-cream text-ink lg:grid-cols-2">
        <div className="p-3">
          <Image src="/images/zero-percent-mocktail.png" alt="Watermelon, lime and mint zero-proof drink" width={1024} height={1024} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-square w-full rounded-3xl object-cover" />
        </div>
        <div className="flex flex-col items-start justify-center gap-7 px-7 py-14 md:px-14 lg:px-16">
          <span className="rounded-full bg-rose-brand px-4 py-2 text-sm font-medium uppercase tracking-[0.16em]">The 0% path</span>
          <h2 className="text-balance font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">0% is a first-class seat.</h2>
          <p className="text-pretty text-lg leading-relaxed text-ink/70">Complexity, ceremony and refreshment without compromise. Our zero-proof matches get the same attention as every other pour.</p>
          <a href="#journey" className="flex items-center gap-3 border-b border-ink pb-2 font-medium">Explore 0% <ArrowRight className="size-4" aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-5 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-muted-foreground md:flex-row md:items-end md:justify-between">
        <p className="font-serif text-3xl text-foreground">Drink, Jaipur.</p>
        <div className="flex flex-wrap gap-6">
          <a className="hover:text-foreground" href="#journey">Find my sip</a>
          <a className="hover:text-foreground" href="#zero">Zero proof</a>
          <a className="hover:text-foreground" href="mailto:hello@drink.club">Contact</a>
        </div>
        <p>© 2026 Drink. Please enjoy responsibly.</p>
      </div>
    </footer>
  )
}

export function DrinkLanding() {
  return (
    <main className="overflow-hidden">
      <Header />
      <Hero />
      <Journey />
      <Jaipur />
      <ZeroProof />
      <Footer />
    </main>
  )
}
