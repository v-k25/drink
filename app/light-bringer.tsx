'use client'

import { useEffect } from 'react'

// Light-bringer (Black Tie, BT4). Lucifer means "light-bringer": black and white photos get their colour back where
// the visitor brings light to them. Renders nothing; it only wires up elements already on the page.
//   [data-light-hero]  a mouse or pen moving over it sets --lx / --ly (cursor position) and data-lit; CSS draws a circle
//                      of colour there (see .heroLight in home.module.css). Off for touch. Under reduced motion it still
//                      follows the mouse (the visitor's own movement), but appears without the grow animation.
//   [data-light-card]  on touch screens (no hover), gets data-lit while it is in the middle of the screen; with a mouse
//                      or keyboard, CSS :hover and :focus-visible do the same job (.sf-lit in ui.css).
// Positions are written straight to CSS custom properties, so moving the mouse never re-renders React.
export default function LightBringer() {
  useEffect(() => {
    const cleanups: (() => void)[] = []

    for (const hero of document.querySelectorAll<HTMLElement>('[data-light-hero]')) {
      let frame = 0
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        const box = hero.getBoundingClientRect()
        const x = event.clientX - box.left, y = event.clientY - box.top
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          hero.style.setProperty('--lx', `${x}px`)
          hero.style.setProperty('--ly', `${y}px`)
          hero.dataset.lit = ''
        })
      }
      const leave = () => { cancelAnimationFrame(frame); delete hero.dataset.lit }
      hero.addEventListener('pointermove', move)
      hero.addEventListener('pointerleave', leave)
      cleanups.push(() => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); cancelAnimationFrame(frame) })
    }

    if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const card = entry.target as HTMLElement
          if (entry.isIntersecting) card.dataset.lit = ''
          else delete card.dataset.lit
        }
      }, { rootMargin: '-35% 0px -35% 0px' })
      document.querySelectorAll('[data-light-card]').forEach(card => observer.observe(card))
      cleanups.push(() => observer.disconnect())
    }

    return () => cleanups.forEach(cleanup => cleanup())
  }, [])
  return null
}
