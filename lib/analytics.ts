import { track } from '@vercel/analytics'

type AnalyticsEvents = {
  early_access_viewed: undefined
  early_access_started: undefined
  early_access_submitted: undefined
  early_access_succeeded: { result: 'new' | 'duplicate' }
  early_access_failed: { reason: 'invalid' | 'error' }
  cta_clicked: { source: string; destination: string }
  cocktail_story_milestone: { percent: 25 | 50 | 75 | 100 }
  returning_visitor: undefined
}

export function trackEvent<E extends keyof AnalyticsEvents>(
  name: E,
  ...args: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
) {
  try {
    track(name, args[0])
  } catch {
    // analytics must never break UX
  }
}
