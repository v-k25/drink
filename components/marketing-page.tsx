'use client'

import { ArrowRight, Check, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { Reveal } from '@/components/reveal'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export type MarketingPageData = {
  eyebrow: string
  title: string
  intro: string
  note?: string
  sections: Array<{ label: string; title: string; body: string; items?: string[] }>
  cta: { title: string; body: string; primary: string; href: string; secondary?: string; secondaryHref?: string }
}

const icons = [Sparkles, Check, MapPin]

export function MarketingPage({ data }: { data: MarketingPageData }) {
  const ctaPrefix = `cta:${data.eyebrow.split('·')[0].trim().toLowerCase().replace(/\s+/g, '-')}`

  return (
    <main>
      <SiteHeader />
      <section className="editorial-grid min-h-[78svh] border-b border-border px-5 pb-20 pt-36 md:px-10 md:pb-28 md:pt-44">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          <p className="eyebrow">{data.eyebrow}</p>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="max-w-5xl font-serif text-6xl leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-8xl">{data.title}</h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{data.intro}</p>
          </div>
          {data.note ? <p className="max-w-2xl border-l-2 border-accent pl-5 text-sm leading-relaxed text-muted-foreground">{data.note}</p> : null}
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-20">
          {data.sections.map((section, index) => {
            const Icon = icons[index % icons.length]
            return (
              <Reveal key={section.label} className="flex flex-col gap-8 border-t border-border pt-8 lg:flex-row lg:gap-20">
                <div className="flex min-w-60 items-center gap-3 self-start">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <p className="eyebrow">{section.label}</p>
                </div>
                <div className="flex max-w-3xl flex-1 flex-col gap-6">
                  <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{section.title}</h2>
                  <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{section.body}</p>
                  {section.items ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {section.items.map((item) => <li key={item} className="flex items-start gap-3 border-b border-border py-3 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}
                    </ul>
                  ) : null}
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="bg-foreground px-5 py-20 text-background md:px-10 md:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="eyebrow text-background/60">Early Jaipur release</p>
            <h2 className="font-serif text-5xl leading-none tracking-tight sm:text-6xl">{data.cta.title}</h2>
            <p className="max-w-xl leading-relaxed text-background/65">{data.cta.body}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={data.cta.href}
              className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground transition-transform hover:-translate-y-0.5"
              onClick={() => trackEvent('cta_clicked', { source: `${ctaPrefix}:primary`, destination: data.cta.href })}
            >
              {data.cta.primary}<ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {data.cta.secondary && data.cta.secondaryHref ? (
              <Link
                href={data.cta.secondaryHref}
                className="inline-flex items-center justify-center border border-background/35 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em]"
                onClick={() => trackEvent('cta_clicked', { source: `${ctaPrefix}:secondary`, destination: data.cta.secondaryHref ?? '' })}
              >
                {data.cta.secondary}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
