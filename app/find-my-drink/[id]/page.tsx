import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eligibilityAccepted } from '../../party-planner/session'
import Gate from '../gate'
import Detail, { DetailUnavailable } from '../components/detail'
import { loadRecipe, loadRelated } from '../queries'

// Recipe ids are slug primary keys (verified: every id matches this charset);
// anything else cannot be an eligible recipe and 404s before any read.
const SAFE_ID = /^[A-Za-z0-9._~-]{1,200}$/

const GENERIC_METADATA: Metadata = {
  title: 'Find a recipe | Socifer',
  description: 'Browse curated cocktail and mocktail recipes.',
}

// The recipe name never appears in metadata before the eligibility gate.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (!SAFE_ID.test(id) || !(await eligibilityAccepted())) return GENERIC_METADATA
  const outcome = await loadRecipe(id)
  if (outcome.state !== 'ok' || !outcome.data) return GENERIC_METADATA
  const recipe = outcome.data
  return {
    title: `${recipe.name} | Socifer`,
    description: recipe.description ?? `A curated ${recipe.alcoholType === 'mocktail' ? 'mocktail' : 'cocktail'} recipe on Socifer.`,
  }
}

// Gate first; then eligible id only else 404. Database errors fail closed with
// a clear unavailable state — no content, never legacy or draft rows.
export default async function RecipePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string | string[] }> }) {
  const { id } = await params
  const eligible = await eligibilityAccepted()
  if (!eligible) return <Gate />
  if (!SAFE_ID.test(id)) notFound()
  const outcome = await loadRecipe(id)
  if (outcome.state === 'unavailable') return <DetailUnavailable />
  if (outcome.state !== 'ok' || !outcome.data) notFound()
  const recipe = outcome.data
  const related = await loadRelated(recipe)
  const { from } = await searchParams
  return <Detail returnTo={typeof from === 'string' ? from : undefined} recipe={recipe} related={related.state === 'ok' ? related.data : null} />
}
