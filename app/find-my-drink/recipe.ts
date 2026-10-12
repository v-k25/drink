// app/find-my-drink/recipe.ts
// Shared pure helpers for recipe presentation. No 'server-only' import: these
// plain functions run in server components and the making client component
// alike, always over validated data.

// The existing hand-authored category SVGs (no rights-cleared photography
// exists). Mapped from the stored base_spirit column only — never inferred;
// unknown values fall back to the placeholder.
const SPIRIT_ART: Record<string, string> = {
  vodka: '/images/drinks/vodka.svg',
  gin: '/images/drinks/gin.svg',
  rum: '/images/drinks/rum.svg',
  whisky: '/images/drinks/whisky.svg',
  whiskey: '/images/drinks/whisky.svg',
  tequila: '/images/drinks/tequila.svg',
  brandy: '/images/drinks/brandy.svg',
  scotch: '/images/drinks/scotch.svg',
  champagne: '/images/drinks/champagne.svg',
  sake: '/images/drinks/sake.svg',
}

export function artFor(baseSpirit: string | null): string {
  if (baseSpirit) {
    const art = SPIRIT_ART[baseSpirit.toLowerCase()]
    if (art) return art
  }
  return '/images/drink-placeholder.svg'
}

export function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value
}

// Cards and the detail hero prefer the stored original image when present
// (alt from image_alt, else the recipe name); otherwise the hand-authored
// artwork renders decoratively with an empty alt. image_url is already
// validated by the query layer, so this always runs over validated data.
export function imageFor(
  imageUrl: string | null,
  imageAlt: string | null,
  baseSpirit: string | null,
  name: string,
): { src: string; alt: string } {
  if (imageUrl !== null) return { src: imageUrl, alt: imageAlt ?? name }
  return { src: artFor(baseSpirit), alt: '' }
}

// Type line from the stored alcohol_type and base_spirit columns; never inferred.
export function typeLabel(alcoholType: 'cocktail' | 'mocktail', baseSpirit: string | null): string {
  const label = alcoholType === 'mocktail' ? 'Mocktail' : 'Cocktail'
  return baseSpirit ? `${label} · ${capitalize(baseSpirit)}` : label
}

// Only a local finder URL may be used for the return link.
export function safeResultsHref(value: string | undefined): string {
  if (!value || value.length > 4000) return '/find-my-drink'
  try {
    const url = new URL(value, 'https://allcheers.local')
    if (url.origin !== 'https://allcheers.local' || url.pathname !== '/find-my-drink') return '/find-my-drink'
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return '/find-my-drink' }
}

export function pickRecipeIds(ids: string[], seen: ReadonlySet<string>, random = Math.random): string[] {
  const available = ids.filter(id => !seen.has(id))
  const picked: string[] = []
  while (picked.length < 3 && available.length) {
    picked.push(available.splice(Math.floor(random() * available.length), 1)[0])
  }
  return picked
}
