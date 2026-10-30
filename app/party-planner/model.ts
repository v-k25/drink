export type Product = {
  id: string
  category: string
  name: string
  brand: string
  sizeMl: number
  pricePaise: number
}

export type PlannerInput = {
  guests: number
  budgetPaise: number
  categories: string[]
  lines: { productId: string; quantity: number }[]
}

export type PlannedLine = Product & { quantity: number; subtotalPaise: number }

export type Plan = {
  guests: number
  budgetPaise: number
  city: 'Jaipur'
  lines: PlannedLine[]
  totalPaise: number
  remainingPaise: number
}

export type PlanResult = { ok: true; plan: Plan } | { ok: false; error: string }

const MAX_GUESTS = 1000
const MAX_QUANTITY = 1000
const MAX_BUDGET_PAISE = 100_000_000
const MAX_CATEGORIES = 18

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isSafeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isString = (value: unknown): value is string => typeof value === 'string'

const validProduct = (value: unknown): value is Product => isRecord(value)
  && isText(value.id) && isText(value.category) && isText(value.name) && isString(value.brand)
  && isSafeInteger(value.sizeMl) && value.sizeMl > 0
  && isSafeInteger(value.pricePaise) && value.pricePaise > 0

export function parseBudget(value: string): number | null {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null
  const [rupees, paise = ''] = value.split('.')
  const amount = Number(rupees) * 100 + Number(paise.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_BUDGET_PAISE ? amount : null
}

export const PRICE_LABEL = 'Listed price in Jaipur, checked 3 Oct 2026'

export function formatMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

export function calculatePlan(input: unknown, catalogue: Product[]): PlanResult {
  if (!Array.isArray(catalogue) || catalogue.some((product) => !validProduct(product))) return { ok: false, error: 'Catalogue is invalid.' }
  const products = catalogue as Product[]
  const ids = new Set<string>()
  const catalogueCategories = new Set<string>()
  for (const product of products) {
    if (ids.has(product.id)) return { ok: false, error: 'Catalogue contains duplicate product IDs.' }
    ids.add(product.id)
    catalogueCategories.add(product.category)
  }
  if (!isRecord(input) || !isSafeInteger(input.guests) || input.guests < 1 || input.guests > MAX_GUESTS
    || !isSafeInteger(input.budgetPaise) || input.budgetPaise < 1 || input.budgetPaise > MAX_BUDGET_PAISE
    || !Array.isArray(input.categories) || input.categories.length < 1 || input.categories.length > MAX_CATEGORIES
    || input.categories.some((category) => !isText(category))
    || !Array.isArray(input.lines)) return { ok: false, error: 'Planner input is invalid.' }

  const categories = input.categories as string[]
  if (new Set(categories).size !== categories.length) return { ok: false, error: 'Categories must be unique.' }
  if (input.lines.length < 1 || input.lines.length > products.length) return { ok: false, error: 'Choose a bounded, nonempty inventory.' }
  const selectedCategories = new Set<string>()
  const selectedIds = new Set<string>()
  const lines: PlannedLine[] = []
  let totalPaise = 0
  for (const line of input.lines) {
    if (!isRecord(line) || !isText(line.productId) || !isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) return { ok: false, error: 'Planner line is invalid.' }
    const product = products.find((candidate) => candidate.id === line.productId)
    if (!product || selectedIds.has(product.id) || !categories.includes(product.category)) return { ok: false, error: 'Choose distinct known products and include every selected category.' }
    const subtotalPaise = product.pricePaise * line.quantity
    if (!Number.isSafeInteger(subtotalPaise) || totalPaise > Number.MAX_SAFE_INTEGER - subtotalPaise) return { ok: false, error: 'Plan total is too large.' }
    selectedIds.add(product.id)
    selectedCategories.add(product.category)
    lines.push({ ...product, quantity: line.quantity, subtotalPaise })
    totalPaise += subtotalPaise
  }
  if (selectedCategories.size !== categories.length || categories.some((category) => !catalogueCategories.has(category))) return { ok: false, error: 'Choose distinct known products and include every selected category.' }
  return { ok: true, plan: { guests: input.guests, budgetPaise: input.budgetPaise, city: 'Jaipur', lines, totalPaise, remainingPaise: input.budgetPaise - totalPaise } }
}

export function planText(plan: Plan): string {
  const lines = plan.lines.map((line) => `${line.name} (${line.brand}, ${line.sizeMl} ml) — ${line.quantity} × ${formatMoney(line.pricePaise)} = ${formatMoney(line.subtotalPaise)}`).join('\n')
  const balance = plan.remainingPaise < 0 ? `Shortfall: ${formatMoney(-plan.remainingPaise)}` : `Remaining: ${formatMoney(plan.remainingPaise)}`
  return `Jaipur party plan for ${plan.guests} guests\nBudget: ${formatMoney(plan.budgetPaise)}\n${lines}\nTotal estimate: ${formatMoney(plan.totalPaise)}\nCost per guest: ${formatMoney(Math.round(plan.totalPaise / plan.guests))}\n${balance}\nEstimated from our Jaipur catalogue. ${PRICE_LABEL}. Store prices and availability may differ; buy independently from stores. Not included: mixers, food, water, ice and supplies. Quantities are an estimate; check them before you buy.`
}
