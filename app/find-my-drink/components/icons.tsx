const base = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false }
export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
export const ShuffleIcon = () => <svg {...base}><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
export const FilterIcon = () => <svg {...base}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
export const BasketIcon = () => <svg {...base}><path d="M5 9h14l-1.5 10h-11zM9 9l3-5 3 5" /></svg>
export const EmptyIcon = () => <svg {...base} width={32} height={32}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8.5 11h5" /></svg>
