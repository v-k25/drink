'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

export function VisitorSignal() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    try {
      if (sessionStorage.getItem('drink_rv_fired')) return
      if (localStorage.getItem('drink_visited')) {
        trackEvent('returning_visitor')
      } else {
        localStorage.setItem('drink_visited', '1')
      }
      sessionStorage.setItem('drink_rv_fired', '1')
    } catch {
      // storage unavailable (private mode) — never break UX
    }
  }, [])

  return null
}
