'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { trackEvent } from '@/lib/analytics'

type TrackedLinkProps = ComponentProps<typeof Link> & { trackSource: string }

export function TrackedLink({ trackSource, onClick, href, ...rest }: TrackedLinkProps) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        trackEvent('cta_clicked', {
          source: trackSource,
          destination: typeof href === 'string' ? href : href.toString(),
        })
        onClick?.(event)
      }}
      {...rest}
    />
  )
}
