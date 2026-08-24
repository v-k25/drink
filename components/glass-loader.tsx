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
              </defs>
              <path d="M19 9h58l-8 78a21 21 0 0 1-42 0L19 9Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <g clipPath="url(#loader-glass-clip)">
                <motion.rect
                  x="17"
                  y="16"
                  width="62"
                  height="100"
                  fill="var(--primary)"
                  initial={{ y: 100 }}
                  animate={{ y: reduceMotion ? 42 : 18 }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.65, 0, 0.35, 1] }}
                />
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
