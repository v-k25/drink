import Planner from './planner'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Party Planner | Socifer', description: 'Build a Jaipur drinks shopping list with your own quantities and a clear budget.' }

export default function PartyPlannerPage() {
  return <Planner />
}
