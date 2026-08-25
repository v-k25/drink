import { track } from '@vercel/analytics'

export function trackEvent(name: string, properties?: Record<string, string | number | boolean | null>) {
  try {
    track(name, properties)
  } catch {
    // analytics must never break UX
  }
}
