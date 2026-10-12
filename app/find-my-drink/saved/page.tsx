import type { Metadata } from 'next'
import { eligibilityAccepted, getSessionState } from '../../party-planner/session'
import Gate from '../gate'
import Shell from '../components/shell'
import Auth, { SignOut } from '../components/auth'
import { SavedRecipes } from '../components/community'
import { listSavedRecipes } from '../community'
import { loadRecipes } from '../queries'
import styles from '../finder.module.css'

export const metadata: Metadata = { title: 'Saved recipes | Socifer' }

export default async function SavedPage() {
  if (!(await eligibilityAccepted())) return <Gate />
  const session = await getSessionState()
  if (!session.signedIn) return <Shell><div className={`${styles.card} ${styles.savedPage}`}><h1>Saved recipes</h1><a className={styles.secondary} href="/find-my-drink">Browse recipes</a><p>Sign in to see your private notes and saved recipes.</p><Auth /></div></Shell>
  const saved = await listSavedRecipes()
  if (saved === null) return <Shell><div className={`${styles.card} ${styles.savedPage}`}><h1>Saved recipes</h1><a className={styles.secondary} href="/find-my-drink">Browse recipes</a><p>Saved recipes are temporarily unavailable.</p><a className={styles.secondary} href="/find-my-drink/saved">Try again</a></div></Shell>
  const catalogue = await loadRecipes()
  if (catalogue.state !== 'ok') return <Shell><div className={`${styles.card} ${styles.savedPage}`}><h1>Saved recipes</h1><a className={styles.secondary} href="/find-my-drink">Browse recipes</a><p>Recipes are temporarily unavailable.</p><a className={styles.secondary} href="/find-my-drink/saved">Try again</a></div></Shell>
  const byId = new Map(catalogue.data.map(recipe => [recipe.id, recipe]))
  const items = saved.flatMap(item => { const recipe = byId.get(item.drinkId); return recipe ? [{ drinkId: item.drinkId, note: item.note, name: recipe.name }] : [] })
  return <Shell><div className={`${styles.card} ${styles.savedPage}`}><h1>Saved recipes</h1><a className={styles.secondary} href="/find-my-drink">Browse recipes</a><SignOut />{items.length ? <SavedRecipes items={items} /> : <p>No saved recipes yet. Save one from a recipe page.</p>}</div></Shell>
}
