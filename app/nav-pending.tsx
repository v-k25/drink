'use client'

import { createPortal } from 'react-dom'
import { useLinkStatus } from 'next/link'
import { LoadingScreen } from './logo'

// Rendered inside a Link to another page: while that navigation is pending, the branded loading screen covers the page
// (it fades in only after 150ms, so fast navigations show nothing). Portalled to the themed page
// root so the loader's block markup never sits inside the link. Nothing renders otherwise.
export default function NavPending({ label = 'Loading page…' }: { label?: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return null
  const root = document.querySelector('[data-theme]') ?? document.body
  return createPortal(<div className="sf-nav-loading"><LoadingScreen /><span className="sf-sr" role="status">{label}</span></div>, root)
}
