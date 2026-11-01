// Shared line icons: 24px grid, 1.75 stroke, round caps, colour from currentColor. Decorative only (aria-hidden);
// the control or text next to an icon carries its name. Replaces the text characters (→ ← ✕ × ≡ ✓ ! ?) used as icons.
import type { ReactNode, SVGProps } from 'react'

type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, 'children'>
const icon = (paths: ReactNode) => function Icon({ size = 20, ...rest }: IconProps) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{paths}</svg>
}

export const ArrowRightIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />)
export const ArrowLeftIcon = icon(<path d="M19 12H5M11 6l-6 6 6 6" />)
export const CloseIcon = icon(<path d="M6 6l12 12M18 6L6 18" />)
export const MenuIcon = icon(<path d="M4 7h16M4 12h16M4 17h16" />)
export const CheckIcon = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const AlertIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>)
// Guide me: a compass.
export const CompassIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>)
// Surprise me: a die.
export const DiceIcon = icon(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01" strokeWidth={2.5} /></>)
// Browse all: a grid of cards.
export const GridIcon = icon(<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>)
// Use what I have: a basket.
export const BasketIcon = icon(<path d="M5 10h14l-1.5 9h-11zM9 10l3-5 3 5" />)
