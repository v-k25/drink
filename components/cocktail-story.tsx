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

// SVG canvas: 288 x 432. Bowl outline: M30 54H258, floor curves to y~318, stem to 392.
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

  // Chill (ice) first, then the pour, then the garnish — each completes before the next begins.
  const FULL: [number, number] = [0, 1]
  const iceOpacity = useTransform(scrollYProgress, reduceMotion ? FULL : [0.08, 0.24], reduceMotion ? [1, 1] : [0, 1])
  const iceY = useTransform(scrollYProgress, reduceMotion ? FULL : [0.08, 0.24], reduceMotion ? [0, 0] : [8, 0])
  const liquidY = useTransform(scrollYProgress, reduceMotion ? FULL : [0.26, 0.72], reduceMotion ? [0, 0] : [310, 0])
  const waveX = useTransform(scrollYProgress, reduceMotion ? FULL : [0.26, 0.72], reduceMotion ? [0, 0] : [-30, 30])
  const garnishOpacity = useTransform(scrollYProgress, reduceMotion ? FULL : [0.74, 0.78], reduceMotion ? [1, 1] : [0, 1])
  const garnishY = useTransform(scrollYProgress, reduceMotion ? FULL : [0.74, 0.85, 0.9], reduceMotion ? [0, 0, 0] : [-26, 3, 0])
  const garnishRotate = useTransform(scrollYProgress, reduceMotion ? FULL : [0.74, 0.85, 0.9], reduceMotion ? [0, 0, 0] : [-18, 4, 0])
  const glowOpacity = useTransform(scrollYProgress, reduceMotion ? FULL : [0.55, 0.9], reduceMotion ? [0.16, 0.16] : [0, 0.3])

  return (
    <section ref={targetRef} className="relative min-h-[240vh] border-y border-border bg-foreground text-background md:min-h-[300vh]">
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
            <motion.div aria-hidden="true" className="absolute size-72 rounded-full bg-secondary blur-3xl" style={{ opacity: glowOpacity }} />
            <div className="relative h-[27rem] w-72" role="img" aria-label="A cocktail glass that fills with ice, a rising amber pour and a citrus garnish as the page scrolls">
              <svg viewBox="0 0 288 432" className="absolute inset-0 size-full" aria-hidden="true">
                <defs>
                  <clipPath id="story-bowl-clip">
                    <path d="M35 59H253L219 272C215.5 295 196 313 171 313H117C92 313 72.5 295 69 272L35 59Z" />
                  </clipPath>
                  <linearGradient id="story-liquid-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="oklch(0.84 0.115 72)" />
                    <stop offset="0.45" stopColor="oklch(0.72 0.13 69)" />
                    <stop offset="1" stopColor="oklch(0.5 0.13 48)" />
                  </linearGradient>
                  <linearGradient id="story-sheen-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="oklch(0.97 0.02 90)" stopOpacity="0" />
                    <stop offset="0.5" stopColor="oklch(0.97 0.02 90)" stopOpacity="0.14" />
                    <stop offset="1" stopColor="oklch(0.97 0.02 90)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* glass interior tint */}
                <path d="M30 54H258L222 274C218 299 197 318 171 318H117C91 318 70 299 66 274L30 54Z" fill="oklch(0.94 0.019 78)" fillOpacity="0.05" />

                {/* liquid — level driven by translateY so the bowl clip keeps the silhouette exact at any fill */}
                <g clipPath="url(#story-bowl-clip)">
                  <motion.g style={{ y: liquidY }}>
                    <rect x="30" y="66" width="228" height="260" fill="url(#story-liquid-grad)" />
                    <motion.g style={{ x: waveX }}>
                      <path d="M-20 66 Q-2 60 16 66 T52 66 T88 66 T124 66 T160 66 T196 66 T232 66 T268 66 T304 66" fill="none" stroke="oklch(0.9 0.09 78)" strokeWidth="3" opacity="0.85" />
                      <path d="M-20 70 Q-2 75 16 70 T52 70 T88 70 T124 70 T160 70 T196 70 T232 70 T268 70 T304 70" fill="none" stroke="oklch(0.94 0.019 78)" strokeWidth="2" opacity="0.4" />
                    </motion.g>
                    <ellipse cx="144" cy="66" rx="112" ry="5" fill="oklch(0.9 0.09 78)" opacity="0.5" />
                  </motion.g>
                  {/* glass sheen on top of liquid */}
                  <rect x="62" y="60" width="26" height="250" fill="url(#story-sheen-grad)" opacity="0.9" />
                </g>

                {/* ice — translucent cubes settle in before the pour */}
                <motion.g
                  clipPath="url(#story-bowl-clip)"
                  style={{ opacity: iceOpacity, y: iceY }}
                >
                  <g transform="rotate(12 118 178)">
                    <rect x="96" y="156" width="44" height="44" rx="4" fill="oklch(0.94 0.019 78)" fillOpacity="0.12" stroke="oklch(0.94 0.019 78)" strokeOpacity="0.65" strokeWidth="2" />
                    <line x1="104" y1="196" x2="118" y2="162" stroke="oklch(0.97 0.02 90)" strokeOpacity="0.5" strokeWidth="2" />
                  </g>
                  <g transform="rotate(-10 166 194)">
                    <rect x="144" y="172" width="44" height="44" rx="4" fill="oklch(0.94 0.019 78)" fillOpacity="0.12" stroke="oklch(0.94 0.019 78)" strokeOpacity="0.65" strokeWidth="2" />
                    <line x1="152" y1="212" x2="166" y2="178" stroke="oklch(0.97 0.02 90)" strokeOpacity="0.5" strokeWidth="2" />
                  </g>
                  <g transform="rotate(-6 142 236)">
                    <rect x="120" y="214" width="44" height="44" rx="4" fill="oklch(0.94 0.019 78)" fillOpacity="0.12" stroke="oklch(0.94 0.019 78)" strokeOpacity="0.65" strokeWidth="2" />
                    <line x1="128" y1="254" x2="142" y2="220" stroke="oklch(0.97 0.02 90)" strokeOpacity="0.5" strokeWidth="2" />
                  </g>
                </motion.g>

                {/* glass outline + stem + foot + etch line */}
                <path d="M30 54H258L222 274C218 299 197 318 171 318H117C91 318 70 299 66 274L30 54Z" fill="none" stroke="currentColor" strokeWidth="4" />
                <path d="M144 318V392M94 394H194" stroke="currentColor" strokeWidth="4" strokeLinecap="square" fill="none" />
                <ellipse cx="144" cy="54" rx="114" ry="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
                <ellipse cx="144" cy="392" rx="50" ry="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M38 99H250" stroke="currentColor" strokeWidth="2" opacity="0.3" fill="none" />

                {/* garnish — a citrus wheel that drops and settles on the rim */}
                <motion.g
                  style={{
                    opacity: garnishOpacity,
                    y: garnishY,
                    rotate: garnishRotate,
                    transformOrigin: '230px 58px',
                  }}
                >
                  <circle cx="230" cy="58" r="19" fill="oklch(0.94 0.019 78)" stroke="oklch(0.47 0.16 31)" strokeWidth="2.5" />
                  <circle cx="230" cy="58" r="12.5" fill="none" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" opacity="0.7" />
                  <line x1="230" y1="58" x2="230" y2="45.5" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                  <line x1="230" y1="58" x2="230" y2="70.5" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                  <line x1="230" y1="58" x2="219.2" y2="51.75" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                  <line x1="230" y1="58" x2="240.8" y2="64.25" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                  <line x1="230" y1="58" x2="240.8" y2="51.75" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                  <line x1="230" y1="58" x2="219.2" y2="64.25" stroke="oklch(0.47 0.16 31)" strokeWidth="1.5" />
                </motion.g>
              </svg>
            </div>
            <p className="absolute bottom-5 left-5 text-xs uppercase tracking-[0.18em] text-background/50">Jaipur evening · bright · social · 0% ready</p>
          </div>
        </div>
      </div>
    </section>
  )
}