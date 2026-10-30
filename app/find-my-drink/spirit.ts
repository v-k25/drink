import type { Base, Taste } from './discovery'

// Find My Drink's main goal (owner, 2026-10-31): find the base spirit that suits someone, then suggest recipes with it.
// The profiles below are editorial, general descriptions of each kind of drink; the owner reviews the wording before launch.
// Weights are 0 (no match), 1 (fair) or 2 (strong). Pure module: no I/O, so scripts/spirit-check.cjs runs it directly.

export const SPIRITS = ['gin', 'vodka', 'rum', 'whisky', 'tequila', 'brandy', 'wine', 'beer', 'liqueur'] as const
export type Spirit = typeof SPIRITS[number]
export const FEELS = ['light', 'smooth', 'rich'] as const
export type Feel = typeof FEELS[number]
export const SERVES = ['mixer', 'cocktail', 'neat'] as const
export type Serve = typeof SERVES[number]
export const QUIZ_OCCASIONS = ['casual-get-together', 'after-dinner', 'party'] as const
export type QuizOccasion = typeof QUIZ_OCCASIONS[number]

type Weight = 0 | 1 | 2
export type SpiritProfile = {
  spirit: Spirit; name: string; note: string; tryIt: string
  tastes: Partial<Record<Taste, Weight>>; feel: Record<Feel, Weight>; serve: Record<Serve, Weight>; occasion: Record<QuizOccasion, Weight>
  // The recipe base that matches it in discovery.ts, or null when we have no recipes for it.
  recipeBase: Base | null
}

export const FEEL_LABELS: Record<Feel, [string, string]> = {
  light: ['Light and fresh', 'Crisp and easy to sip'],
  smooth: ['Smooth and rounded', 'Soft and mellow'],
  rich: ['Rich and warming', 'Deep and full of flavour'],
}
export const SERVE_LABELS: Record<Serve, [string, string]> = {
  mixer: ['With a mixer', 'Soda, tonic, cola or juice'],
  cocktail: ['In a cocktail', 'Mixed with a few ingredients'],
  neat: ['Neat or on ice', 'Just the drink'],
}
export const OCCASION_LABELS: Record<QuizOccasion, string> = {
  'casual-get-together': 'Casual get-together',
  'after-dinner': 'After dinner',
  party: 'Party',
}

const why = {
  feel: { light: 'light and fresh', smooth: 'smooth', rich: 'rich and warming' } as Record<Feel, string>,
  serve: { mixer: 'good with a mixer', cocktail: 'made for cocktails', neat: 'good on its own' } as Record<Serve, string>,
  occasion: { 'casual-get-together': 'easy for a casual get-together', 'after-dinner': 'suits after dinner', party: 'a party favourite' } as Record<QuizOccasion, string>,
}

export const PROFILES: readonly SpiritProfile[] = [
  { spirit: 'gin', name: 'Gin', note: 'Dry and botanical, built around juniper.', tryIt: 'With tonic and a slice of lime.',
    tastes: { herbal: 2, citrusy: 2, bitter: 1 }, feel: { light: 2, smooth: 1, rich: 0 }, serve: { mixer: 2, cocktail: 2, neat: 0 },
    occasion: { 'casual-get-together': 2, 'after-dinner': 1, party: 1 }, recipeBase: 'gin' },
  { spirit: 'vodka', name: 'Vodka', note: 'Clean and neutral. It takes on whatever you mix it with.', tryIt: 'With soda and lime, or cranberry juice.',
    tastes: { fruity: 2, citrusy: 1, sweet: 1 }, feel: { light: 2, smooth: 1, rich: 0 }, serve: { mixer: 2, cocktail: 2, neat: 0 },
    occasion: { 'casual-get-together': 1, 'after-dinner': 0, party: 2 }, recipeBase: 'vodka' },
  { spirit: 'rum', name: 'Rum', note: 'Sweet and tropical, made from sugarcane.', tryIt: 'With cola and a squeeze of lime.',
    tastes: { sweet: 2, fruity: 2, citrusy: 1, creamy: 1 }, feel: { light: 1, smooth: 2, rich: 1 }, serve: { mixer: 2, cocktail: 2, neat: 0 },
    occasion: { 'casual-get-together': 1, 'after-dinner': 0, party: 2 }, recipeBase: 'rum' },
  { spirit: 'whisky', name: 'Whisky', note: 'Oaky and warming, aged in wooden casks.', tryIt: 'Neat, on ice, or with soda.',
    tastes: { bitter: 1, sweet: 1 }, feel: { light: 0, smooth: 2, rich: 2 }, serve: { mixer: 1, cocktail: 1, neat: 2 },
    occasion: { 'casual-get-together': 1, 'after-dinner': 2, party: 0 }, recipeBase: 'whisky' },
  { spirit: 'tequila', name: 'Tequila', note: 'Bright and earthy, made from agave.', tryIt: 'In a margarita, or with grapefruit soda.',
    tastes: { citrusy: 2, herbal: 1 }, feel: { light: 1, smooth: 1, rich: 0 }, serve: { mixer: 1, cocktail: 2, neat: 1 },
    occasion: { 'casual-get-together': 0, 'after-dinner': 0, party: 2 }, recipeBase: 'tequila' },
  { spirit: 'brandy', name: 'Brandy', note: 'Rich and fruity, distilled from wine.', tryIt: 'Neat or on ice, after a meal.',
    tastes: { sweet: 2, fruity: 1, creamy: 1 }, feel: { light: 0, smooth: 2, rich: 2 }, serve: { mixer: 0, cocktail: 1, neat: 2 },
    occasion: { 'casual-get-together': 0, 'after-dinner': 2, party: 0 }, recipeBase: 'brandy' },
  { spirit: 'wine', name: 'Wine', note: 'Made from grapes: red, white or sparkling.', tryIt: 'As it is. Chill white and sparkling wine first.',
    tastes: { fruity: 2, citrusy: 1, sweet: 1 }, feel: { light: 1, smooth: 2, rich: 1 }, serve: { mixer: 0, cocktail: 0, neat: 2 },
    occasion: { 'casual-get-together': 2, 'after-dinner': 2, party: 1 }, recipeBase: 'champagne' },
  { spirit: 'beer', name: 'Beer', note: 'Cold, light and easy, brewed from grain and hops.', tryIt: 'Cold, from the bottle or in a glass.',
    tastes: { bitter: 2, citrusy: 1 }, feel: { light: 2, smooth: 0, rich: 0 }, serve: { mixer: 0, cocktail: 0, neat: 2 },
    occasion: { 'casual-get-together': 2, 'after-dinner': 0, party: 2 }, recipeBase: null },
  { spirit: 'liqueur', name: 'Liqueur', note: 'Sweet and flavoured, made from a spirit with fruit, herbs or cream.', tryIt: 'On ice, or as part of a cocktail.',
    tastes: { sweet: 2, creamy: 2, fruity: 1, herbal: 1 }, feel: { light: 0, smooth: 2, rich: 1 }, serve: { mixer: 1, cocktail: 2, neat: 1 },
    occasion: { 'casual-get-together': 0, 'after-dinner': 2, party: 1 }, recipeBase: null },
]

export type SpiritAnswers = { tastes: readonly Taste[]; feel: Feel | null; serve: Serve | null; occasion: QuizOccasion | null }
export type SpiritMatch = { profile: SpiritProfile; score: number; reasons: string[] }

export const answered = (answers: SpiritAnswers) => answers.tastes.length > 0 || !!answers.feel || !!answers.serve || !!answers.occasion
export const profileFor = (spirit: Spirit) => PROFILES.find(profile => profile.spirit === spirit)!

// Score = 2 per taste weight + 3 x feel + 3 x serve + 2 x occasion. Ties keep the SPIRITS order.
export function rankSpirits(answers: SpiritAnswers): SpiritMatch[] {
  return PROFILES.map((profile, index) => {
    const tasteScore = answers.tastes.reduce((sum, taste) => sum + (profile.tastes[taste] ?? 0), 0)
    const score = 2 * tasteScore + 3 * (answers.feel ? profile.feel[answers.feel] : 0) + 3 * (answers.serve ? profile.serve[answers.serve] : 0) + 2 * (answers.occasion ? profile.occasion[answers.occasion] : 0)
    const reasons: string[] = []
    const strongTastes = answers.tastes.filter(taste => profile.tastes[taste] === 2)
    if (strongTastes.length) reasons.push(strongTastes.join(' and '))
    if (answers.feel && profile.feel[answers.feel] === 2) reasons.push(why.feel[answers.feel])
    if (answers.serve && profile.serve[answers.serve] === 2) reasons.push(why.serve[answers.serve])
    if (answers.occasion && profile.occasion[answers.occasion] === 2) reasons.push(why.occasion[answers.occasion])
    return { profile, score, reasons, index }
  }).sort((a, b) => b.score - a.score || a.index - b.index).map(({ profile, score, reasons }) => ({ profile, score, reasons }))
}

// "Herbal and citrusy, light and fresh, good with a mixer."
export function reasonSentence(reasons: readonly string[]): string {
  if (!reasons.length) return 'The closest match to your answers.'
  const text = reasons.slice(0, 3).join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}
