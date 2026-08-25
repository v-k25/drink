import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { EarlyAccessForm } from '@/components/early-access-form'
import { Reveal } from '@/components/reveal'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Early access',
  description:
    'Join the Jaipur launch list for product previews, 0% updates and the first Find My Sip invitation.',
  alternates: { canonical: '/early-access' },
}

const benefits = [
  'Product previews before public release',
  '0% and Party Planner updates you ask for',
  'One launch invitation. No spam, ever.',
]

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const fromRaw = params.from
  const from = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw
  const fromOk = from && /^[a-z0-9-]{1,40}$/.test(from) ? from : null

  return (
    <main>
      <SiteHeader />

      <section className="border-b border-border px-5 pb-16 pt-36 md:px-10 md:pb-20 md:pt-44">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-7">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Early access · Jaipur</p>
            <h1 className="max-w-4xl text-balance font-serif text-6xl leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
              Be first in line for your sip.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Join the launch list for product previews, 0% updates and the first invitation when Find My Sip goes
              live in Jaipur.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="flex flex-col gap-10">
            <h2 className="font-serif text-4xl tracking-tight">What joining means</h2>
            <ul>
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-3 border-b border-border py-3 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="border-l-2 border-primary pl-5 text-sm leading-relaxed text-muted-foreground">
              Your email and selections are stored securely and used only to measure Jaipur demand and send launch
              updates. We never sell or share them, keep them only until launch, and delete them on request —
              hello@mywebsite.in.
            </p>
            <p className="border-l-2 border-primary pl-5 text-sm leading-relaxed text-muted-foreground">
              Alcohol-related features will be for eligible adults only. The 0% path is open to everyone, always.
            </p>
          </Reveal>
          <Reveal>
            <EarlyAccessForm source={fromOk} />
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
