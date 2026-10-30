import audit from './pantry-audit.json'
import type { RecipeRow } from './queries'

export type PantryRequirement = { ingredientId: string; label: string; quantityText: string | null }
export type PantryAudit = { recipeId: string; sourceSignature: string; requirements: PantryRequirement[]; equipment: string[] }
const sourceFields = ['id', 'name', 'description', 'alcoholType', 'ingredients', 'ingredientDetails', 'preparation', 'garnish', 'iceType', 'glassware', 'preparationMethod', 'recipeYield', 'servings', 'sourceName', 'sourceUrl', 'sourceRetrievedAt', 'contentOrigin'] as const

export function pantrySignature(row: RecipeRow): string {
  return JSON.stringify(sourceFields.map(field => row[field]))
}

// Audits approve requirements, never publication. Callers supply current eligible rows only.
export function reviewedPantry(row: RecipeRow, records: PantryAudit[] = audit): PantryAudit | null {
  const record = records.find(item => item.recipeId === row.id)
  return record && record.sourceSignature === pantrySignature(row) && record.equipment.length > 0 &&
    record.equipment.every(item => item.trim().length > 0) && record.requirements.length > 0 &&
    record.requirements.every(item => item.ingredientId && item.label && (item.quantityText === null || item.quantityText.trim())) ? record : null
}

export function pantryVocabulary(rows: RecipeRow[]): { ingredientId: string; label: string }[] {
  const items = new Map<string, { ingredientId: string; label: string }>()
  for (const row of rows) for (const item of reviewedPantry(row)?.requirements ?? []) {
    if (!items.has(item.ingredientId)) items.set(item.ingredientId, { ingredientId: item.ingredientId, label: item.label })
  }
  return [...items.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export function pantryMatches(rows: RecipeRow[], selected: ReadonlySet<string>) {
  const exact: { row: RecipeRow; audit: PantryAudit }[] = []
  const oneAway: { row: RecipeRow; audit: PantryAudit; missing: PantryRequirement }[] = []
  const seen = new Set<string>()
  let reviewedCount = 0
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const record = reviewedPantry(row)
    if (!record) continue
    reviewedCount++
    if (!selected.size) continue
    const missing = [...new Map(record.requirements.filter(item => !selected.has(item.ingredientId)).map(item => [item.ingredientId, item])).values()]
    if (!missing.length) exact.push({ row, audit: record })
    if (missing.length === 1 && missing[0].quantityText !== null) oneAway.push({ row, audit: record, missing: missing[0] })
  }
  return { exact, oneAway, reviewedCount }
}
