'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import NavPending from '../nav-pending'

// The tool header is shared with client pages (the Planner), so it can't read the session on the server.
// It reads the non-secret sf_signed_in hint cookie instead; /account checks the real session.
const subscribe = () => () => {}
const signedIn = () => document.cookie.split('; ').includes('sf_signed_in=1')

export default function AccountLink({ className }: { className?: string }) {
  const state = useSyncExternalStore(subscribe, signedIn, () => null)
  if (state === null) return null
  return <Link href={state ? '/account' : '/sign-in'} className={className}>{state ? 'Account' : 'Sign in'}<NavPending /></Link>
}
