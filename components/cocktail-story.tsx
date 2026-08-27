'use client'

import { useRef } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { trackEvent } from '@/lib/analytics'

const stages = [
  ['01', 'The glass', 'A clean structure for a warm Jaipur night.'],
  ['02', 'The chill', 'Ice keeps the finish crisp, not diluted.'],
  ['03', 'The pour', 'Citrus and spice answer a bright, social mood.'],
  ['04', 'The finish', 'A restrained garnish makes the recommendation yours.'],
]

const MILESTONES = [25, 50, 75, 100] as const

export function CocktailStory() {
  const targetRef = useRef<HTMLDivElement>(null)
  const milestonesHit = useRef<Set<number>>(new Set())
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end end'] })

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const percent = progress * 100
    for (const threshold of MILESTONES) {
      if (percent >= threshold && !milestonesHit.current.has(threshold)) {
        milestonesHit.current.add(threshold)
        trackEvent('cocktail_story_milestone', { percent: threshold })
      }
    }
  })

  const liquidScale = useTransform(scrollYProgress, [0.18, 0.72], [0.05, 1])
  const iceOpacity = useTransform(scrollYProgress, [0.12, 0.28], [0, 1])
  const garnishOpacity = useTransform(scrollYProgress, [0.68, 0.86], [0, 1])
  const garnishY = useTransform(scrollYProgress, [0.68, 0.86], [-16, 0])
  const glowOpacity = useTransform(scrollYProgress, [0.55, 0.9], [0, 0.3])

  return (
    <section ref={targetRef} className="relative min-h-[230vh] border-y border-border bg-foreground text-background">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden px-5 py-24 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-start gap-7">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Signature story · Scroll to build</p>
            <h2 className="text-balance font-serif text-5xl leading-[0.92] md:text-7xl">A recommendation, assembled with intent.</h2>
            <p className="max-w-lg text-pretty leading-relaxed text-background/65">Each layer translates a signal from your night. The animation tells the story; the recommendation logic stays structured and explainable.</p>
            <ol className="flex w-full flex-col gap-3 border-t border-background/20 pt-6">
              {stages.map(([number, title, detail]) => (
                <li key={number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-background/15 pb-3">
                  <span className="text-xs font-bold text-secondary">{number}</span>
                  <span className="flex flex-col gap-1">
                    <strong className="font-serif text-xl font-normal">{title}</strong>
                    <span className="text-xs leading-relaxed text-background/55">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-xl items-center justify-center border border-background/20 bg-background/[0.03]">
            <motion.div aria-hidden="true" className="absolute size-72 rounded-full bg-secondary blur-3xl" style={{ opacity: reduceMotion ? 0.16 : glowOpacity }} />
            <div className="relative h-[27rem] w-72" role="img" aria-label="A cocktail glass progressively filled with ice, citrus liquid and a garnish as the page scrolls">
              <motion.div
                aria-hidden="true"
                className="absolute bottom-[7.625rem] left-[3.25rem] h-[12.5rem] w-[11.5rem] origin-bottom bg-secondary"
                style={{ scaleY: reduceMotion ? 1 : liquidScale, clipPath: 'polygon(0% 0, 100% 0, 72% 100%, 28% 100%)' }}
              />
              <motion.div aria-hidden="true" className="absolute bottom-[9rem] left-[5.1rem] grid grid-cols-2 gap-3" style={{ opacity: reduceMotion ? 1 : iceOpacity }}>
                <span className="size-14 rotate-12 border border-background/65 bg-background/15" />
                <span className="size-12 -rotate-12 border border-background/65 bg-background/15" />
                <span className="size-12 -rotate-6 border border-background/65 bg-background/15" />
                <span className="size-14 rotate-6 border border-background/65 bg-background/15" />
              </motion.div>
              <svg viewBox="0 0 288 432" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
                <path d="M30 54H258L222 274C218 299 197 318 171 318H117C91 318 70 299 66 274L30 54Z" stroke="currentColor" strokeWidth="4" />
                <path d="M144 318V392M94 394H194" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
                <path d="M38 99H250" stroke="currentColor" strokeWidth="2" opacity=".45" />
              </svg>
              <motion.div aria-hidden="true" className="absolute right-3 top-6 h-32 w-16 rotate-[28deg] border-4 border-primary bg-limestone" style={{ opacity: reduceMotion ? 1 : garnishOpacity, y: reduceMotion ? 0 : garnishY, borderRadius: '100% 0 100% 0' }} />
              <motion.span aria-hidden="true" className="absolute right-9 top-[4.4rem] size-3 bg-primary" style={{ opacity: reduceMotion ? 1 : garnishOpacity }} />
            </div>
            <p className="absolute bottom-5 left-5 text-xs uppercase tracking-[0.18em] text-background/50">Jaipur evening · bright · social · 0% ready</p>
          </div>
        </div>
      </div>
    </section>
  )
}
