'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

export function GlassLoader() {
  const [visible, setVisible] = useState(true)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), reduceMotion ? 120 : 1050)
    return () => window.clearTimeout(timeout)
  }, [reduceMotion])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-5">
            <svg viewBox="0 0 96 128" className="h-28 w-auto" role="presentation">
              <defs>
                <clipPath id="loader-glass-clip">
                  <path d="M19 9h58l-8 78a21 21 0 0 1-42 0L19 9Z" />
                </clipPath>
                <linearGradient id="loader-liquid-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="oklch(0.84 0.115 72)" />
                  <stop offset="0.45" stopColor="oklch(0.72 0.13 69)" />
                  <stop offset="1" stopColor="oklch(0.48 0.13 48)" />
                </linearGradient>
              </defs>
              <path d="M19 9h58l-8 78a21 21 0 0 1-42 0L19 9Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <g clipPath="url(#loader-glass-clip)">
                <motion.g
                  initial={{ y: 110 }}
                  animate={{ y: reduceMotion ? 34 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.65, 0, 0.35, 1] }}
                >
                  <path d="M5 22 Q11 16, 17 22 T29 22 T41 22 T53 22 T65 22 T77 22 T89 22 L89 116 L5 116 Z" fill="url(#loader-liquid-grad)" />
                  <motion.g
                    animate={reduceMotion ? undefined : { x: [0, -12] }}
                    transition={reduceMotion ? undefined : { duration: 0.6, repeat: Infinity, ease: 'linear', repeatType: 'mirror' }}
                  >
                    <path d="M5 21 Q11 16, 17 21 T29 21 T41 21 T53 21 T65 21 T77 21 T89 21 T101 21" fill="none" stroke="oklch(0.94 0.08 80)" strokeWidth="1.5" opacity="0.6" />
                    <path d="M5 23 Q11 27, 17 23 T29 23 T41 23 T53 23 T65 23 T77 23 T89 23 T101 23" fill="none" stroke="oklch(0.94 0.019 78)" strokeWidth="1.5" opacity="0.35" />
                  </motion.g>
                </motion.g>
              </g>
              <path d="M48 108v12M31 122h34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">Finding your pour</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}