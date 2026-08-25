import { ArrowDown, ArrowRight, CalendarDays, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { CocktailStory } from '@/components/cocktail-story'
import { GlassLoader } from '@/components/glass-loader'
import { Reveal } from '@/components/reveal'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

const signals = [
  ['Taste', 'Crisp, bitter, smoky, bright'],
  ['Mood', 'Slow evening or loud celebration'],
  ['Moment', 'Occasion, place and company'],
  ['Budget', 'A match that respects the night'],
]

export function DrinkLanding() {
  return (
    <main className="overflow-hidden">
      <GlassLoader />
      <SiteHeader />

      <section className="relative min-h-screen overflow-hidden pt-32">
        <div className="absolute inset-0 ink-grid opacity-35" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl items-center gap-10 px-5 pb-16 md:px-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col items-start gap-7">
            <p className="border-l-2 border-primary pl-4 text-xs font-bold uppercase tracking-[0.22em] text-primary">Jaipur-first · Alcoholic and 0%</p>
            <h1 className="max-w-4xl text-balance font-serif text-6xl leading-[0.88] tracking-[-0.055em] sm:text-7xl lg:text-[7.4rem]">
              Tonight has a taste. <em className="font-normal text-primary">Find yours.</em>
            </h1>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Find My Sip turns your taste, mood, occasion and budget into a drink recommendation you can understand—not a list to scroll through.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/find-my-sip" className="flex items-center justify-center gap-3 bg-primary px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground transition-transform hover:-translate-y-0.5">
                Preview Find My Sip <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/zero-percent" className="flex items-center justify-center gap-3 border border-foreground px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background">
                Explore the 0% path
              </Link>
            </div>
            <a href="#how" className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              See how it works <ArrowDown aria-hidden="true" />
            </a>
          </div>
          <div className="relative mx-auto w-full max-w-lg border border-foreground/20 bg-card p-3 shadow-[18px_18px_0_var(--primary)]">
            <Image src="/images/hero-glass.png" alt="A composed cocktail photographed as an editorial still life" width={1024} height={1024} priority sizes="(min-width: 1024px) 40vw, 90vw" className="aspect-[4/5] w-full object-cover saturate-[0.65] sepia-[0.12]" />
            <div className="absolute bottom-7 left-7 bg-background px-4 py-3 font-serif text-2xl italic">Made for this moment.</div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-border bg-card px-5 py-24 md:px-10 md:py-32">
        <Reveal className="mx-auto flex max-w-7xl flex-col gap-14">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">The drink-first difference</p>
            <div className="flex flex-col gap-6">
              <h2 className="max-w-4xl text-balance font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">Not where should we go. First, <em>what fits tonight?</em></h2>
              <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">A structured recommendation—not an AI guess—maps the details of your night to an explainable sip.</p>
            </div>
          </div>
          <ol className="grid border border-border md:grid-cols-2 lg:grid-cols-4">
            {signals.map(([label, detail], index) => (
              <li key={label} className="flex min-h-56 flex-col justify-between gap-8 border-b border-border p-6 last:border-b-0 md:border-r md:odd:border-r lg:border-b-0 lg:last:border-r-0">
                <span className="text-xs font-bold text-primary">0{index + 1}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-serif text-3xl">{label}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <CocktailStory />

      <section className="border-y border-border bg-foreground px-5 py-24 text-background md:px-10 md:py-32">
        <Reveal className="mx-auto grid max-w-7xl gap-px bg-background/20 lg:grid-cols-2">
          <article className="flex min-h-[32rem] flex-col justify-between gap-10 bg-foreground p-8 md:p-12">
            <Sparkles className="size-8 text-secondary" aria-hidden="true" />
            <div className="flex flex-col items-start gap-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Find My Sip · Hero feature</p>
              <h2 className="font-serif text-5xl leading-none md:text-6xl">A recommendation with a reason.</h2>
              <p className="max-w-lg leading-relaxed text-background/65">A guided teaser for taste, mood, occasion, budget, strength and preference. No booking. No delivery. Just a clearer choice.</p>
              <Link href="/find-my-sip" className="border-b border-secondary pb-2 text-sm font-bold uppercase tracking-[0.14em] text-secondary">Preview the experience</Link>
            </div>
          </article>
          <article className="flex min-h-[32rem] flex-col justify-between gap-10 bg-foreground p-8 md:p-12">
            <CalendarDays className="size-8 text-secondary" aria-hidden="true" />
            <div className="flex flex-col items-start gap-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Party Planner · Supporting feature</p>
              <h2 className="font-serif text-5xl leading-none md:text-6xl">Plan the pours before the place.</h2>
              <p className="max-w-lg leading-relaxed text-background/65">Party details become drink recommendations, quantities and a shopping list. Venue ideas remain useful context—not the product.</p>
              <Link href="/party-planner" className="border-b border-secondary pb-2 text-sm font-bold uppercase tracking-[0.14em] text-secondary">See the planner concept</Link>
            </div>
          </article>
        </Reveal>
      </section>

      <section className="px-5 py-24 md:px-10 md:py-32">
        <Reveal className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-border bg-secondary p-3">
            <Image src="/images/zero-percent-mocktail.png" alt="A layered watermelon, lime and mint zero-percent drink" width={1024} height={1024} sizes="(min-width: 1024px) 45vw, 90vw" className="aspect-square w-full object-cover saturate-[0.75]" />
          </div>
          <div className="flex flex-col items-start justify-center gap-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">0% is not an alternative route</p>
            <h2 className="text-balance font-serif text-6xl leading-[0.9] md:text-8xl">Every bit of the ritual. None of the alcohol.</h2>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">For non-drinkers, designated drivers, health-conscious nights and anyone who simply prefers 0%. The complete experience stays open.</p>
            <Link href="/zero-percent" className="flex items-center gap-3 bg-foreground px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] text-background">Enter the 0% experience <ArrowRight aria-hidden="true" /></Link>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-border px-5 py-24 md:px-10 md:py-32">
        <Reveal className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col items-start gap-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Launching in one city, properly</p>
            <h2 className="font-serif text-7xl leading-[0.85] md:text-9xl">Jaipur,<br /><em>first.</em></h2>
            <p className="max-w-md leading-relaxed text-muted-foreground">Local tastes, local moments and a city-specific editorial guide before we earn the right to expand.</p>
            <Link href="/jaipur" className="border-b border-foreground pb-2 text-sm font-bold uppercase tracking-[0.14em]">Explore the Jaipur launch</Link>
          </div>
          <div className="relative border border-border bg-primary p-3 shadow-[-18px_18px_0_var(--secondary)]">
            <Image src="/images/jaipur-duotone.png" alt="Hawa Mahal representing the Jaipur-first launch" width={1024} height={1024} sizes="(min-width: 1024px) 55vw, 90vw" className="aspect-[5/4] w-full object-cover grayscale-[0.35]" />
          </div>
        </Reveal>
      </section>

      <section className="bg-primary px-5 py-20 text-primary-foreground md:px-10">
        <Reveal className="mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em]">Early access · Jaipur</p>
          <h2 className="text-balance font-serif text-6xl leading-[0.9] md:text-8xl">Help shape what Jaipur drinks next.</h2>
          <p className="max-w-xl text-pretty leading-relaxed text-primary-foreground/75">Join the launch circle for product previews, 0% updates and the first invitation when Find My Sip goes live.</p>
          <Link href="/early-access?from=home" className="bg-background px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] text-foreground">Join the Jaipur list</Link>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  )
}
