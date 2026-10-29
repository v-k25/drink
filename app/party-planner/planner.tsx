'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { formatMoney, parseBudget, planText, PRICE_LABEL, type Plan, type PlannerInput, type Product } from './model'
import { suggestibleCategories, suggestStartingList, SUGGEST_LABEL, type Suggestion } from './suggest'
import { confirmEligibility, getCatalogue, validatePlan } from './actions'
import styles from './planner.module.css'

const iconProps = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false }
const InfoIcon = () => <svg {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M12 16v-5M12 8h.01" /></svg>
const TrashIcon = () => <svg {...iconProps}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
const PencilIcon = () => <svg {...iconProps} width={16} height={16}><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
const GripIcon = () => <svg {...iconProps} width={16} height={16} fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
// Display-only: whole rupees drop ".00". Exact formatMoney strings stay available as visually hidden text where asserted.
const shortMoney = (paise: number) => formatMoney(paise).replace(/\.00$/, '')
const validCount = (value: string) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000
const estimateNote = 'Estimated from our Jaipur catalogue. Store prices and availability may differ.'
type Confirmation = { kind: 'new' } | { kind: 'suggest' }
const dragType = 'application/x-allcheers-product'
const draftKey = 'allcheers_planner_draft'
const eligibilityError = 'Confirm eligibility to continue.'
// Illustrative art by category name, so new or renamed catalogue categories still match.
const categoryArt: [RegExp, string][] = [[/beer/i, 'beer'], [/champagne|sparkling/i, 'champagne'], [/wine/i, 'wine'], [/ready to drink|rtd|premix/i, 'rtd'], [/liqueur|aperitif/i, 'liqueur'], [/sake/i, 'sake'], [/scotch|single malt/i, 'scotch'], [/whisk|bourbon/i, 'whisky'], [/vodka/i, 'vodka'], [/\brum\b/i, 'rum'], [/\bgin\b/i, 'gin'], [/tequila|agave|mezcal/i, 'tequila'], [/brandy|cognac/i, 'brandy']]
const artFor = (category: string) => `/images/drinks/${categoryArt.find(([pattern]) => pattern.test(category))?.[1] ?? 'bottle'}.svg`
const confirmationCopy = {
  new: { title: 'Start a new plan?', description: 'This clears your current list on this device.', action: 'Start new plan' },
  suggest: { title: 'Replace your list?', description: 'The starting list replaces the drinks on your current list. You can undo straight after.', action: 'Replace list' },
}


// Loading placeholder that mirrors the build screen (pills, search/filters, product rows, plan panel / mobile bar).
// Decorative only: no visible text; the sr-only status below it is the accessible announcement.
const skeletonPillWidths = [92, 128, 112, 140, 100, 120]
function PlannerSkeleton() {
  return <div className={styles.loading}>
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.inventoryLayout}>
        <div className={styles.browse}>
          <div className={styles.categoryRail}><div className={styles.skelPills}>{skeletonPillWidths.map((width, index) => <span key={index} className={styles.skelPill} style={{ width }} />)}</div></div>
          <div className={styles.shelf}>
            <div className={styles.filterBar}><span className={styles.skelSearch} /><span className={styles.skelFilter} /></div>
            <div className={styles.menuList}>{[0, 1, 2, 3, 4, 5, 6].map(row => <div key={row} className={styles.skelRow}>
              <span className={styles.skelArt} />
              <div className={styles.skelIdentity}><span className={styles.skelBar} style={{ width: row % 2 ? '58%' : '72%' }} /><span className={styles.skelBarSmall} style={{ width: row % 3 ? '34%' : '44%' }} /></div>
              <span className={styles.skelButton} />
            </div>)}</div>
          </div>
        </div>
        <div className={styles.planPanel}>
          <div className={styles.panelHead}><span className={styles.skelBarSmall} style={{ width: 84 }} /></div>
          <div className={styles.hero}><span className={styles.skelFigure} /><span className={styles.skelMeter} /><span className={styles.skelBarSmall} style={{ width: '55%' }} /></div>
          <div className={styles.skelLines}>{[0, 1, 2].map(line => <div key={line} className={styles.skelLine}><span className={styles.skelArtSmall} /><div className={styles.skelIdentity}><span className={styles.skelBar} style={{ width: line === 1 ? '62%' : '78%' }} /><span className={styles.skelBarSmall} style={{ width: '38%' }} /></div></div>)}</div>
          <div className={styles.inventorySummary}><span className={styles.skelWide} /></div>
        </div>
      </div>
      <div className={styles.mobileBar}><div className={styles.skelIdentity}><span className={styles.skelBar} style={{ width: '46%' }} /><span className={styles.skelBarSmall} style={{ width: '62%' }} /></div><span className={styles.skelButton} /></div>
    </div>
    <p className={`${styles.hint} ${styles.srOnly}`} role="status">Loading planner…</p>
  </div>
}

function Receipt({ plan }: { plan: Plan }) {
  return <div className={styles.receipt}>
    <p className={`${styles.eyebrow} ${styles.receiptBrand}`}>Socifer / Jaipur</p><h2>Your list</h2>
    <p>{plan.guests} guests · Original budget {formatMoney(plan.budgetPaise)}</p>
    <p className={plan.remainingPaise < 0 ? styles.overBudget : styles.goodBudget}>{plan.remainingPaise < 0 ? `Over budget by ${formatMoney(-plan.remainingPaise)}` : `${formatMoney(plan.remainingPaise)} remaining`}</p>
    {plan.lines.map(line => <div className={styles.receiptLine} key={line.id}>
      <span><img src={artFor(line.category)} alt="" width={28} height={31} /><span><strong>{line.name}</strong><small>{line.category} · {line.sizeMl} ml · {line.quantity} {line.quantity === 1 ? 'pack' : 'packs'} × {formatMoney(line.pricePaise)}</small></span></span><b>{formatMoney(line.subtotalPaise)}</b>
    </div>)}
    <div className={styles.receiptTotal}><span>Estimated total</span><b>{formatMoney(plan.totalPaise)}</b></div>
    <div className={styles.receiptLine}><span>Estimated cost per guest</span><b>{formatMoney(Math.round(plan.totalPaise / plan.guests))}</b></div>
    <p className={styles.disclaimer}>{estimateNote} {PRICE_LABEL}. Shop independently at local stores. Not included: mixers, food, water, ice and supplies. Quantities are an estimate; check them before you buy.</p>
  </div>
}

export default function Planner() {
  const [step, setStep] = useState(0)
  const [eligible, setEligible] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [guests, setGuests] = useState('')
  const [budget, setBudget] = useState('')
  const [servings, setServings] = useState('')
  const [nonDrinkers, setNonDrinkers] = useState('0')
  const [suggestCategories, setSuggestCategories] = useState<string[]>([])
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [setupError, setSetupError] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [guestNotice, setGuestNotice] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const categoryDialog = useRef<HTMLDialogElement>(null)
  const categoryTrigger = useRef<HTMLButtonElement>(null)
  const suggestionHeading = useRef<HTMLHeadingElement>(null)
  const [estimate, setEstimate] = useState<Suggestion | null>(null)
  const [suggestMessage, setSuggestMessage] = useState('')
  const pendingSuggestion = useRef<Suggestion | null>(null)
  const [checkingGate, setCheckingGate] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryFailures, setRetryFailures] = useState(0)
  const unavailableHeading = useRef<HTMLHeadingElement>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [inventory, setInventory] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState('')
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [brands, setBrands] = useState<Record<string, string[]>>({})
  const [sizes, setSizes] = useState<Record<string, number[]>>({})
  const [within, setWithin] = useState<Record<string, boolean>>({})
  const [announcement, setAnnouncement] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const draggedId = useRef<string | null>(null)
  const inventoryDialog = useRef<HTMLDialogElement>(null)
  const inventoryTrigger = useRef<HTMLButtonElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [needsReview, setNeedsReview] = useState<Record<string, boolean>>({})
  const [plan, setPlan] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [message, setMessage] = useState('')
  const [copyFallback, setCopyFallback] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const confirmationDialog = useRef<HTMLDialogElement>(null)
  const confirmationAction = useRef<Confirmation | null>(null)
  const confirmationTrigger = useRef<HTMLElement | null>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const focusHeading = useRef(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const filterDialog = useRef<HTMLDialogElement>(null)
  const filterTrigger = useRef<HTMLButtonElement>(null)
  const filterHeading = useRef<HTMLHeadingElement>(null)
  const [basicsOpen, setBasicsOpen] = useState(false)
  const basicsDialog = useRef<HTMLDialogElement>(null)
  const basicsTrigger = useRef<HTMLElement | null>(null)
  const infoDialog = useRef<HTMLDialogElement>(null)
  const infoTrigger = useRef<HTMLElement | null>(null)
  const basicsHeading = useRef<HTMLHeadingElement>(null)
  const basicsSnapshot = useRef({ guests: '', budget: '' })
  const shelfRef = useRef<HTMLElement>(null)
  const [toast, setToast] = useState<{ message: string; restore: () => void } | null>(null)
  const toastTimer = useRef<number | null>(null)

  const previousStep = useRef(step)
  const quantityInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [hydrated, setHydrated] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw)
        const ok = typeof draft === 'object' && draft !== null
          && Array.isArray(draft.categories) && draft.categories.every((category: unknown) => typeof category === 'string')
          && Array.isArray(draft.inventory) && draft.inventory.every((item: any) => item && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.name === 'string' && typeof item.brand === 'string' && Number.isFinite(item.sizeMl) && item.sizeMl > 0 && Number.isFinite(item.pricePaise) && item.pricePaise > 0)
          && draft.quantities && typeof draft.quantities === 'object' && !Array.isArray(draft.quantities) && Object.values(draft.quantities).every((value: unknown) => typeof value === 'string')
          && draft.needsReview && typeof draft.needsReview === 'object' && !Array.isArray(draft.needsReview) && Object.values(draft.needsReview).every((value: unknown) => typeof value === 'boolean')
          && typeof draft.activeCategory === 'string'
        if (ok) {
          const restoredGuests = typeof draft.guests === 'string' && (draft.guests === '' || validCount(draft.guests)) ? draft.guests : ''
          const restoredBudget = typeof draft.budget === 'string' && (draft.budget === '' || parseBudget(draft.budget) !== null) ? draft.budget : ''
          setGuests(restoredGuests); setBudget(restoredBudget); setCategories(draft.categories); setInventory(draft.inventory); setQuantities(draft.quantities); setNeedsReview(draft.needsReview); setActiveCategory(draft.activeCategory); setDraftRestored(draft.inventory.length > 0)
          setSetupComplete(validCount(restoredGuests) && parseBudget(restoredBudget) !== null)
          if (typeof draft.servings === 'string' && (draft.servings === '' || validCount(draft.servings))) setServings(draft.servings)
          if (typeof draft.nonDrinkers === 'string' && /^\d+$/.test(draft.nonDrinkers)) setNonDrinkers(draft.nonDrinkers)
          if (Array.isArray(draft.suggestCategories) && draft.suggestCategories.every((value: unknown) => typeof value === 'string')) setSuggestCategories(draft.suggestCategories)
          if (draft.estimate && typeof draft.estimate === 'object' && draft.estimate.ok === true
            && Number.isSafeInteger(draft.estimate.guests) && Number.isSafeInteger(draft.estimate.drinkers)
            && Number.isSafeInteger(draft.estimate.nonDrinkers) && Number.isSafeInteger(draft.estimate.servingsPerDrinker)
            && Array.isArray(draft.estimate.categories) && draft.estimate.categories.every((category: unknown) => typeof category === 'string')
            && Number.isSafeInteger(draft.estimate.totalServings) && Number.isFinite(draft.estimate.coveredServings) && draft.estimate.coveredServings >= 0 && draft.estimate.coveredServings <= 1_000_000 && Number.isSafeInteger(draft.estimate.totalPaise)
            && Number.isSafeInteger(draft.estimate.perGuestPaise) && Array.isArray(draft.estimate.notes)
            && draft.estimate.notes.every((note: unknown) => typeof note === 'string')
            && Array.isArray(draft.estimate.lines) && draft.estimate.lines.every((line: any) => line && typeof line.productId === 'string' && typeof line.category === 'string' && Number.isSafeInteger(line.quantity) && Number.isSafeInteger(line.subtotalPaise))) setEstimate(draft.estimate)
          if (draft.guestNotice === true) setGuestNotice(true)
        } else localStorage.removeItem(draftKey)
      }
    } catch { }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    const savedBasics = basicsOpen ? basicsSnapshot.current : { guests, budget }
    try { localStorage.setItem(draftKey, JSON.stringify({ ...savedBasics, categories, inventory, quantities, needsReview, activeCategory, servings, nonDrinkers, suggestCategories, estimate, guestNotice })) } catch { }
  }, [guests, budget, categories, inventory, quantities, needsReview, activeCategory, servings, nonDrinkers, suggestCategories, estimate, guestNotice, basicsOpen])
  // Skip the age check when the eligibility cookie is already set (the server action checks it).
  useEffect(() => {
    let live = true
    loadCatalogue(() => live).finally(() => { if (live) setCheckingGate(false) })
    return () => { live = false }
  }, [])
  useEffect(() => { if (retryFailures) unavailableHeading.current?.focus() }, [retryFailures])
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus()
    previousStep.current = step
  }, [step])
  useEffect(() => { if (step === 1 && setupComplete && suggestionOpen) suggestionHeading.current?.focus() }, [step, setupComplete, suggestionOpen])
  useEffect(() => {
    if (confirmation) { confirmationDialog.current?.showModal(); cancelButton.current?.focus() }
    else if (focusHeading.current) { focusHeading.current = false; heading.current?.focus() }
  }, [confirmation])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const budgetPaise = parseBudget(budget)
  const basicsValid = validCount(guests) && budgetPaise !== null
  const allCategories = [...new Set([...products.map(item => item.category), ...categories])]
  const productFor = (id: string) => products.find(item => item.id === id)
  const lineCost = (id: string) => validCount(quantities[id] || '') ? (productFor(id)?.pricePaise ?? 0) * Number(quantities[id]) : 0
  const subtotal = inventory.reduce((total, item) => total + lineCost(item.id), 0)
  const packs = inventory.reduce((total, item) => total + (validCount(quantities[item.id] || '') ? Number(quantities[item.id]) : 0), 0)
  const readyCategories = categories.filter(category => {
    const items = inventory.filter(item => item.category === category)
    return items.length > 0 && items.every(item => productFor(item.id) && validCount(quantities[item.id] || '') && !needsReview[item.id])
  })
  const itemsIncomplete = inventory.length > 0 && inventory.some(item => !productFor(item.id) || !validCount(quantities[item.id] || '') || needsReview[item.id])
  const issueCategories = categories.filter(category => !readyCategories.includes(category))
  const reviewReady = basicsValid && readyCategories.length > 0 && !itemsIncomplete
  const subtotalLabel = itemsIncomplete ? 'Subtotal · incomplete' : 'Subtotal'
  const mobileStatus = !inventory.length ? 'Add at least one drink' : itemsIncomplete ? 'Check quantities' : issueCategories.length ? `${issueCategories.length} ${issueCategories.length === 1 ? 'category has' : 'categories have'} no items` : 'Ready to review'
  const browsing = allCategories.includes(activeCategory) ? activeCategory : allCategories[0] || ''
  const categoryProducts = search ? products.filter(product => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search.toLowerCase())) : products.filter(product => product.category === browsing)
  const brandOptions = [...new Set(categoryProducts.map(product => product.brand))].sort((a, b) => a.localeCompare(b))
  const sizeOptions = [...new Set(categoryProducts.map(product => product.sizeMl))].sort((a, b) => a - b)
  const filterScope = search ? '__all__' : browsing
  const selectedBrands = brands[filterScope] || []
  const selectedSizes = sizes[filterScope] || []
  const withinOn = !!within[filterScope]
  // Affordability rule (single source of truth): one pack fits iff its price is within
  // the remaining budget ignoring this product's own current line cost (prior quantities
  // never change a card's tier). Card tier, over-label and the within-budget chip all
  // read from these two helpers; the post-add announcement instead reports the actual
  // post-add remaining (spec: "R reflects post-add subtotal").
  const remainingExcluding = (product: Product) => (budgetPaise ?? 0) - (subtotal - lineCost(product.id))
  const fitsBudget = (product: Product) => budgetPaise === null || product.pricePaise <= remainingExcluding(product)
  const baseMatches = categoryProducts.filter(product =>
    (!selectedBrands.length || selectedBrands.includes(product.brand))
    && (!selectedSizes.length || selectedSizes.includes(product.sizeMl)))
  const fitting = baseMatches.filter(fitsBudget)
  const matches = withinOn ? fitting : baseMatches
  const filtersActive = !!search || selectedBrands.length > 0 || selectedSizes.length > 0 || withinOn
  const filterCount = selectedBrands.length + selectedSizes.length + (withinOn ? 1 : 0) + (search ? 1 : 0)
  const remaining = budgetPaise === null ? null : budgetPaise - subtotal
  const remainingLabel = remaining === null ? null : remaining < 0 ? `${formatMoney(-remaining)} over budget` : `${formatMoney(remaining)} left of budget`
  const perGuest = budgetPaise !== null && validCount(guests) ? formatMoney(Math.round(budgetPaise / Number(guests))) : null
  const limit = limits[browsing] ?? 24
  function resetFilters() {
    setBrands(current => ({ ...current, [filterScope]: [] }))
    setSizes(current => ({ ...current, [filterScope]: [] }))
    setWithin(current => ({ ...current, [filterScope]: false }))
    setSearch('')
  }
  function openFilters() { filterDialog.current?.showModal(); setFilterDialogOpen(true); filterHeading.current?.focus() }
  function closeFilters() { filterDialog.current?.close(); setFilterDialogOpen(false); filterTrigger.current?.focus() }
  function openInfo(event: { currentTarget: HTMLElement }) { infoTrigger.current = event.currentTarget; infoDialog.current?.showModal() }
  function closeInfo() { infoDialog.current?.close(); infoTrigger.current?.focus() }
  function openBasics() { basicsSnapshot.current = { guests, budget }; basicsDialog.current?.showModal(); setBasicsOpen(true); basicsHeading.current?.focus() }
  function closeBasics(save = false) {
    if (save && !basicsValid) { setSetupError(true); basicsDialog.current?.querySelector<HTMLInputElement>(!validCount(guests) ? '#dialog-guests' : '#dialog-budget')?.focus(); return }
    if (!save) { setGuests(basicsSnapshot.current.guests); setBudget(basicsSnapshot.current.budget) }
    if (save && guests !== basicsSnapshot.current.guests && inventory.length) setGuestNotice(true)
    setSetupError(false); basicsDialog.current?.close(); setBasicsOpen(false)
    if (basicsTrigger.current?.isConnected && basicsTrigger.current.getClientRects().length) basicsTrigger.current.focus(); else heading.current?.focus()
  }
  const input = (): PlannerInput => ({ guests: Number(guests), budgetPaise: budgetPaise ?? 0, categories, lines: inventory.map(item => ({ productId: item.id, quantity: Number(quantities[item.id]) })) })
  const exported = plan

  // Only the exact eligibility error shows the gate; any other failure means the catalogue read failed.
  async function loadCatalogue(live: () => boolean = () => true) {
    try {
      const result = await getCatalogue()
      if (!live()) return true
      if (result.ok) { setUnavailable(false); setProducts(result.products); setEligible(true); setStep(1); return true }
      const failed = result.error !== eligibilityError
      setUnavailable(failed)
      return !failed
    } catch {
      if (live()) setUnavailable(true)
      return false
    }
  }
  async function retryCatalogue() {
    if (retrying) return
    setRetrying(true)
    const loaded = await loadCatalogue()
    setRetrying(false)
    if (!loaded) setRetryFailures(count => count + 1)
  }

  async function run(action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true; setBusy(true)
    setMessage('')
    try { await action() }
    catch { setMessage('Connection interrupted. Your choices are still here; please try again.') }
    finally { pending.current = false; setBusy(false) }
  }
  function move(next: number) { setMessage(''); setCopyFallback(false); setPlan(null); setStep(next) }
  function removeItem(id: string) {
    if (pending.current) return
    const snapshot = { categories, inventory, quantities, needsReview }
    const item = inventory.find(product => product.id === id)
    setInventory(current => current.filter(item => item.id !== id))
    if (item && !inventory.some(product => product.id !== id && product.category === item.category)) setCategories(current => current.filter(category => category !== item.category))
    setQuantities(current => { const next = { ...current }; delete next[id]; return next })
    setNeedsReview(current => { const next = { ...current }; delete next[id]; return next })
    if (item) showToast(`Removed ${item.name}.`, () => undoRemoval(snapshot))
  }
  function showToast(message: string, restore: () => void) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ message, restore })
    toastTimer.current = window.setTimeout(() => setToast(null), 8000)
  }
  function undoRemoval(snapshot: { categories: string[]; inventory: Product[]; quantities: Record<string, string>; needsReview: Record<string, boolean> }) {
    setCategories(snapshot.categories); setInventory(snapshot.inventory); setQuantities(snapshot.quantities); setNeedsReview(snapshot.needsReview)
    setToast(null); move(1); window.setTimeout(() => drawerOpen ? inventoryDialog.current?.querySelector('h2')?.focus() : heading.current?.focus(), 0)
  }
  function toggleCategory(category: string) {
    if (pending.current) return
    setActiveCategory(category)
  }
  function closeCategoryPicker() { categoryDialog.current?.close(); setCategoryPickerOpen(false); categoryTrigger.current?.focus() }
  function focusIssue(category?: string) {
    if (category) setActiveCategory(category)
    if (drawerOpen) closeInventory()
    window.setTimeout(() => {
      const shelf = shelfRef.current
      if (!shelf) return
      shelf.focus({ preventScroll: true })
      shelf.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }, 0)
  }
  function addProduct(id: string) {
    if (pending.current || !eligible || !setupComplete || !basicsValid) return
    const product = productFor(id)
    if (!product) return
    const existing = inventory.some(item => item.id === id)
    if (existing && !validCount(quantities[id] || '')) { setAnnouncement(`Correct ${product.name}'s pack quantity before adding another pack.`); return }
    if (existing && Number(quantities[id]) >= 1000) { setAnnouncement(`${product.name} is at the maximum of 1,000 packs.`); return }
    if (!existing) { setInventory(current => [...current, product]); setCategories(current => current.includes(product.category) ? current : [...current, product.category]) }
    const next = existing ? Number(quantities[id]) + 1 : 1
    const after = subtotal + product.pricePaise
    const over = budgetPaise !== null && after > budgetPaise
    setQuantities(current => ({ ...current, [id]: String(next) }))
    const budgetNote = budgetPaise === null ? '' : over ? ` ${formatMoney(after - budgetPaise)} over budget.` : ` ${formatMoney(budgetPaise - after)} left of budget.`
    setAnnouncement(`${product.name}: added 1 pack. Now ${next} ${next === 1 ? 'pack' : 'packs'} in inventory.${budgetNote}`)
  }
  function openInventory() { setDrawerOpen(true); inventoryDialog.current?.showModal(); inventoryDialog.current?.querySelector('h2')?.focus() }
  function closeInventory() { inventoryDialog.current?.close(); setDrawerOpen(false); if (inventoryTrigger.current?.isConnected && inventoryTrigger.current.getClientRects().length) inventoryTrigger.current.focus(); else heading.current?.focus() }
  function dropZoneOver(event: DragEvent<HTMLElement>) { event.preventDefault(); const valid = !pending.current && !!draggedId.current && !!productFor(draggedId.current) && event.dataTransfer.types.includes(dragType); setDragOver(valid); event.dataTransfer.dropEffect = valid ? 'copy' : 'none' }
  function dropZoneLeave(event: DragEvent<HTMLElement>) { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false) }
  function dropZoneDrop(event: DragEvent<HTMLElement>) { event.preventDefault(); event.stopPropagation(); const id = event.dataTransfer.getData(dragType); if (!pending.current && id === draggedId.current && productFor(id)) addProduct(id); draggedId.current = null; setDragOver(false) }
  function reviewList() {
    if (!reviewReady) return
    const emptyCategories = categories.filter(category => !inventory.some(item => item.category === category))
    if (emptyCategories.length) {
      const snapshot = { categories, inventory, quantities, needsReview }
      setCategories(current => current.filter(value => !emptyCategories.includes(value)))
      showToast(`Removed ${emptyCategories.join(', ')} — no items added.`, () => undoRemoval(snapshot))
    }
    const keptCategories = categories.filter(category => !emptyCategories.includes(category))
    closeInventory()
    void run(async () => { const result = await validatePlan({ ...input(), categories: keptCategories }); if (!result.ok) { setMessage(result.error); return } setPlan(result.plan); setStep(2); setCopyFallback(false) })
  }
  function requestConfirmation(action: Confirmation, trigger: HTMLElement) {
    if (pending.current || confirmationAction.current) return
    confirmationTrigger.current = trigger; confirmationAction.current = action; setConfirmation(action)
  }
  function cancelConfirmation() {
    if (confirmationAction.current?.kind === 'suggest' && estimate) {
      setServings(String(estimate.servingsPerDrinker)); setNonDrinkers(String(estimate.nonDrinkers)); setSuggestCategories(estimate.categories)
    }
    pendingSuggestion.current = null
    confirmationAction.current = null
    confirmationDialog.current?.close(); setConfirmation(null)
    confirmationTrigger.current?.focus()
  }
  function confirmAction() {
    const action = confirmationAction.current
    if (!action || pending.current) return
    confirmationAction.current = null
    confirmationDialog.current?.close(); setConfirmation(null)
    if (action.kind === 'new') { startNew(); focusHeading.current = true }
    if (action.kind === 'suggest' && pendingSuggestion.current) applySuggestion(pendingSuggestion.current)
  }
  function startNew() {
    setGuests(''); setBudget(''); setCategories([]); setInventory([]); setQuantities({}); setActiveCategory(''); setLimits({}); setBrands({}); setSizes({}); setNeedsReview({}); setAnnouncement(''); setEstimate(null); setServings(''); setNonDrinkers('0'); setSuggestCategories([]); setSuggestionOpen(false); setSetupComplete(false); setGuestNotice(false); move(1)
  }
  function suggest(trigger: HTMLElement) {
    setSuggestMessage('')
    if (!basicsValid || budgetPaise === null) { setSuggestMessage('Enter guests and a budget first.'); return }
    const others = /^\d+$/.test(nonDrinkers) ? Number(nonDrinkers) : -1
    if (others < 0 || others > Number(guests)) { setSuggestMessage('Enter a whole number of non-drinking guests, no greater than total guests.'); document.getElementById('suggest-nondrinkers')?.focus(); return }
    if (!validCount(servings) || Number(servings) > 20) { setSuggestMessage('Enter 1 to 20 whole servings per drinking guest.'); document.getElementById('suggest-servings')?.focus(); return }
    if (!suggestCategories.length) { setSuggestMessage('Select at least one supported category.'); document.getElementById('suggest-category-choice')?.focus(); return }
    const result = suggestStartingList({ guests: Number(guests), budgetPaise, servingsPerDrinker: Number(servings), nonDrinkers: others, categories: suggestCategories }, products)
    if (!result.ok) { setSuggestMessage(result.error); if (others === Number(guests)) document.getElementById('suggest-nondrinkers')?.focus(); return }
    pendingSuggestion.current = result
    if (inventory.length) requestConfirmation({ kind: 'suggest' }, trigger)
    else applySuggestion(result)
  }
  function applySuggestion(result: Suggestion) {
    pendingSuggestion.current = null
    const snapshot = { categories, inventory, quantities, needsReview, estimate, servings, nonDrinkers, suggestCategories, guestNotice }
    const picked = result.lines.map(line => products.find(product => product.id === line.productId)).filter((product): product is Product => !!product)
    setCategories([...new Set(result.lines.map(line => line.category))])
    setInventory(picked)
    setQuantities(Object.fromEntries(result.lines.map(line => [line.productId, String(line.quantity)])))
    setNeedsReview({}); setActiveCategory(result.lines[0]?.category || ''); setEstimate(result); setGuestNotice(false); setSuggestionOpen(false)
    if (window.matchMedia('(max-width: 1023px)').matches) window.setTimeout(openInventory, 0)
    setAnnouncement(`Starting list added: ${result.lines.length} drinks, ${formatMoney(result.totalPaise)}. ${SUGGEST_LABEL}`)
    if (snapshot.inventory.length) showToast('Replaced your list with a starting list.', () => { undoRemoval(snapshot); setEstimate(snapshot.estimate); setServings(snapshot.estimate ? String(snapshot.estimate.servingsPerDrinker) : snapshot.servings); setNonDrinkers(snapshot.estimate ? String(snapshot.estimate.nonDrinkers) : snapshot.nonDrinkers); setSuggestCategories(snapshot.estimate ? snapshot.estimate.categories : snapshot.suggestCategories); setGuestNotice(snapshot.guestNotice) })
  }
  async function copyList(target: Plan) {
    try { await navigator.clipboard.writeText(planText(target)); setMessage('Plan copied.') }
    catch { setCopyFallback(true); setMessage('Select and copy the full list below.') }
  }
  async function shareList(target: Plan) {
    if (!navigator.share) return copyList(target)
    try { await navigator.share({ title: 'My Socifer list', text: planText(target) }) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copyList(target) }
  }

  // The budget is the hero of the plan (panel on desktop, sheet on mobile): spent figure, meter, state in text, guests and per-guest.
  function infoButton() { return <button className={styles.iconButton} aria-label="How are quantities chosen?" aria-haspopup="dialog" onClick={openInfo}><InfoIcon /></button> }
  function budgetHero() {
    const over = remaining !== null && remaining < 0
    const shortStatus = remaining === null ? null : over ? `${shortMoney(-remaining)} over` : `${shortMoney(remaining)} left`
    return <div className={`${styles.hero} ${over ? styles.heroOver : ''}`.trim()} aria-label="Budget meter">
      <div className={styles.heroTop}>
        <p className={styles.heroFigure}><strong>{shortMoney(subtotal)}</strong><span>{budgetPaise === null ? 'Set budget' : `of ${shortMoney(budgetPaise)}`}</span></p>
        <button className={styles.meterEdit} aria-label="Edit guests and budget" onClick={event => { basicsTrigger.current = event.currentTarget; openBasics() }}><PencilIcon />Edit</button>
      </div>
      <div className={styles.meterTrack}><div className={over ? styles.meterFillOver : styles.meterFill} style={{ width: `${budgetPaise && budgetPaise > 0 ? Math.min(100, (subtotal / budgetPaise) * 100) : 0}%` }} /></div>
      <p className={styles.heroRow}>
        {shortStatus && <span className={over ? styles.overBudget : styles.goodBudget} aria-hidden="true">{shortStatus}</span>}
        {guests && <span aria-hidden="true">{guests} guests{perGuest ? ` · ${perGuest}/guest` : ''}</span>}
        <span className={styles.srOnly}>{formatMoney(subtotal)}{budgetPaise === null ? '' : ` of ${formatMoney(budgetPaise)}`}. {remainingLabel} {guests || 'Set'} guests{perGuest ? ` · Budget per guest ${perGuest}` : ''}</span>
      </p>
    </div>
  }

  function inventoryContents(prefix: string) {
    return <fieldset className={styles.panel} disabled={busy}>
      {budgetHero()}
      <p className={`${styles.inventoryCount} ${styles.srOnly}`}>{guests || '—'} guests · {inventory.length} {inventory.length === 1 ? 'item' : 'items'} · {packs} {packs === 1 ? 'pack' : 'packs'}</p>
      {!inventory.length && <p className={styles.emptySlot}>Your plan is empty.<span className={styles.srOnly}> Add a drink from the catalogue{prefix === 'desktop' ? ' or drag a product here' : ''}.</span></p>}
      <div className={styles.inventoryLines} role="region" aria-label="Selected items" tabIndex={0}>{[...new Set(inventory.map(item => item.category))].map(group => <div className={styles.planGroup} key={group}><h4>{group}</h4>{inventory.filter(item => item.category === group).map(item => {
        const current = productFor(item.id), quantityValid = validCount(quantities[item.id] || '')
        const token = encodeURIComponent(item.id)
        return <div className={styles.inventoryLine} key={item.id} data-inventory-id={item.id}>
          <div className={styles.inventoryIdentity}><div><strong>{item.name}</strong><small><span aria-hidden="true">{item.category} · {current?.sizeMl ?? item.sizeMl} ml{quantityValid ? ` × ${Number(quantities[item.id])}` : ''}</span><span className={styles.srOnly}>{item.category} · {current?.sizeMl ?? item.sizeMl} ml · {formatMoney(current?.pricePaise ?? item.pricePaise)} per pack</span></small></div></div>
          {!current && <p role="alert" className={styles.overBudget}>No longer in the catalogue. Remove this item before review.</p>}
          <div className={styles.planQuantity}>
            <label className={styles.srOnly} htmlFor={`plan-quantity-${prefix}-${token}`}>{item.name} pack quantity</label>
            <span className={styles.quantityControls}>
              <button aria-label={`Decrease ${item.name} packs`} disabled={!quantityValid || Number(quantities[item.id]) <= 1} onClick={() => setQuantities(values => ({ ...values, [item.id]: String(Number(values[item.id]) - 1) }))}>−</button>
              <input id={`plan-quantity-${prefix}-${token}`} inputMode="numeric" value={quantities[item.id] || ''} aria-invalid={!quantityValid} aria-describedby={`plan-quantity-status-${prefix}-${token}`} onChange={event => setQuantities(values => ({ ...values, [item.id]: event.target.value }))} />
              <button aria-label={`Increase ${item.name} packs`} disabled={!quantityValid || Number(quantities[item.id]) >= 1000} onClick={() => addProduct(item.id)}>+</button>
            </span>
          </div>
          <p id={`plan-quantity-status-${prefix}-${token}`} className={styles.quantityReadout}>{quantityValid ? <><span className={styles.srOnly}>{`Line total: ${formatMoney(lineCost(item.id))}`}</span><span aria-hidden="true">{shortMoney(lineCost(item.id))}</span></> : 'Enter a whole number from 1 to 1,000.'}</p>
          {current && needsReview[item.id] && <div className={styles.notice}><p>Pack size changed. Check your quantity before continuing.</p><button className={styles.secondary} disabled={!quantityValid} onClick={event => { event.currentTarget.closest('[data-inventory-id]')?.querySelector<HTMLInputElement>('input[id^="plan-quantity-"]')?.focus(); setNeedsReview(values => ({ ...values, [item.id]: false })) }}>I have reviewed my quantity</button></div>}
          <button className={styles.iconButton} aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}><TrashIcon /></button>
        </div>
      })}</div>)}</div>
      <div className={styles.inventorySummary}>{itemsIncomplete && <strong>{subtotalLabel} {formatMoney(subtotal)}</strong>}
        {validCount(guests) && <p>Estimated cost per guest: {formatMoney(Math.round(subtotal / Number(guests)))}</p>}
        {(!inventory.length || issueCategories.length > 0 || !basicsValid) && <div className={styles.issueChips} aria-label="List issues">{!basicsValid && <button className={styles.filter} onClick={event => { basicsTrigger.current = event.currentTarget; openBasics() }}>Set guests & budget</button>}{!inventory.length ? <button className={styles.filter} onClick={() => focusIssue(categories[0])}>Add at least one drink</button> : issueCategories.map(category => <button key={category} className={styles.filter} onClick={() => focusIssue(category)}>{category} — {inventory.some(item => item.category === category) ? 'check quantities' : 'add at least one item'}</button>)}</div>}
        <button className={styles.primary} disabled={!reviewReady || busy} onClick={reviewList}>{busy ? 'Checking…' : <>Review list<span aria-hidden="true">{` · ${shortMoney(subtotal)}`}</span></>}</button></div>
    </fieldset>
  }

  // The setup fields also serve the later edit dialog; suggestion preferences live in their own step.
  function basicsFields(prefix: 'setup' | 'dialog') {
    const guestsInvalid = (setupError || guests !== '') && !validCount(guests)
    const stepGuests = (delta: number) => setGuests(value => String(Math.min(1000, Math.max(1, (validCount(value) ? Number(value) : delta > 0 ? 0 : 2) + delta))))
    return <>
      <div className={styles.formGrid}>
        <div className={styles.field}><label htmlFor={`${prefix}-guests`}>Guests</label><span className={styles.stepper}><button type="button" aria-label="Decrease guests" disabled={validCount(guests) && Number(guests) <= 1} onClick={() => stepGuests(-1)}>−</button><input id={`${prefix}-guests`} inputMode="numeric" value={guests} onChange={event => setGuests(event.target.value)} aria-describedby={guestsInvalid ? `${prefix}-guests-hint` : undefined} aria-invalid={guestsInvalid} placeholder="e.g. 20" /><button type="button" aria-label="Increase guests" disabled={validCount(guests) && Number(guests) >= 1000} onClick={() => stepGuests(1)}>+</button></span>{guestsInvalid && <small id={`${prefix}-guests-hint`}>Enter a whole number from 1 to 1,000.</small>}</div>
        <label>Drinks budget (INR)<span className={styles.rupeeField}><span aria-hidden="true">₹</span><input id={`${prefix}-budget`} inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} aria-describedby={setupError || budget !== '' ? `${prefix}-budget-hint` : undefined} aria-invalid={(setupError || budget !== '') && budgetPaise === null} placeholder="e.g. 5000" /></span>{(setupError || budget !== '') && budgetPaise === null && <small id={`${prefix}-budget-hint`}>Enter ₹0.01–₹10,00,000, with up to two decimal places.</small>}</label>
      </div>
      {perGuest && <p>Budget per guest: {perGuest}</p>}
      <p className={styles.hint}>Alcohol budget only. Mixers, water, ice and food are not included.</p>
      {prefix === 'setup' && <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => finishSetup(true)}>Suggest my list</button><button type="button" className={styles.secondary} onClick={() => finishSetup(false)}>Choose drinks myself</button></div>}
    </>
  }

  function finishSetup(wantsSuggestion: boolean) {
    setSetupError(true)
    if (!basicsValid) { document.getElementById(!validCount(guests) ? 'setup-guests' : 'setup-budget')?.focus(); return }
    setSetupComplete(true); setSuggestionOpen(wantsSuggestion); setSetupError(false)
  }

  function suggestionFields() {
    const drinkers = validCount(guests) && /^\d+$/.test(nonDrinkers) ? Number(guests) - Number(nonDrinkers) : 0
    const target = validCount(servings) && Number(servings) <= 20 && drinkers > 0 ? drinkers * Number(servings) : null
    const eligibleCategories = suggestibleCategories(products)
    return <section className={styles.setupCard} aria-labelledby="suggest-title"><h3 id="suggest-title" ref={suggestionHeading} tabIndex={-1}>Suggest a starting list</h3>
      <p>Shopping estimate only. Choose a serving target; this is not a drinking recommendation.</p>
      <div className={styles.formGrid}><label>Non-drinking guests<input id="suggest-nondrinkers" inputMode="numeric" value={nonDrinkers} onChange={event => setNonDrinkers(event.target.value)} aria-describedby={suggestMessage ? 'suggest-error' : undefined} aria-invalid={!!suggestMessage && (!/^\d+$/.test(nonDrinkers) || Number(nonDrinkers) >= Number(guests))} /></label><label>Estimated servings per drinking guest<input id="suggest-servings" inputMode="numeric" value={servings} onChange={event => setServings(event.target.value)} placeholder="Whole number, 1–20" aria-describedby={suggestMessage ? 'suggest-error' : undefined} aria-invalid={!!suggestMessage && (!validCount(servings) || Number(servings) > 20)} /></label></div>
      <fieldset className={styles.facet} aria-describedby={suggestMessage ? 'suggest-error' : undefined}><legend>What would your guests like? Select categories</legend><div className={styles.facetChips}>{eligibleCategories.map((category, index) => <button id={index === 0 ? 'suggest-category-choice' : undefined} type="button" key={category} className={suggestCategories.includes(category) ? styles.filterActive : styles.filter} aria-pressed={suggestCategories.includes(category)} onClick={() => setSuggestCategories(current => current.includes(category) ? current.filter(value => value !== category) : [...current, category])}>{category}</button>)}</div></fieldset>
      <div className={styles.suggestionNote}><p aria-live="polite">{target === null ? 'Enter servings to see your target' : `Target: ${target} servings`}</p><details><summary>About this estimate</summary><p>Servings are split equally across your selected categories, then rounded up to whole packs. Pack counts and spending may differ.</p><p>More categories are available when you choose drinks yourself.</p><button className={styles.linkButton} onClick={openInfo}>How quantities work</button></details></div>
      {suggestMessage && <p id="suggest-error" className={styles.overBudget} role="alert">{suggestMessage}</p>}
      <div className={styles.actions}><button className={styles.primary} onClick={event => suggest(event.currentTarget)}>Generate list</button><button className={styles.secondary} onClick={() => { setSuggestionOpen(false); window.setTimeout(() => heading.current?.focus(), 0) }}>Back to drinks</button></div>
    </section>
  }

  function categoryNavigation(label: string) {
    return <><button ref={categoryTrigger} className={styles.categoryPicker} aria-haspopup="dialog" aria-expanded={categoryPickerOpen} onClick={() => { categoryDialog.current?.showModal(); setCategoryPickerOpen(true) }}>Browse category: {browsing}</button><nav className={styles.categoryIndex} aria-label={label}>{allCategories.map(category => {
      const categoryProductsAll = products.filter(item => item.category === category)
      return <span className={styles.categoryChoice} key={category}><button className={`${styles.categoryTab} ${browsing === category ? styles.categoryTabActive : ''}`.trim()} aria-current={browsing === category || undefined} onClick={() => toggleCategory(category)}><span>{category}</span><small>{categoryProductsAll.length}<span className={styles.srOnly}> drinks</span></small></button></span>
    })}</nav></>
  }

  return <>
    <main className={styles.shell} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); draggedId.current = null; setDragOver(false) }}>
      <a href="#planner-content" className="skip-link">Skip to planner</a>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>Socifer</Link>
        <nav className={styles.toolNav} aria-label="Tools"><Link href="/party-planner" aria-current="page">Party Planner</Link><Link href="/find-my-drink">Find My Drink</Link></nav>
        <span className={styles.priceNote}>Jaipur prices</span>
      </header>
      <h1 className={styles.srOnly}>Party Planner</h1>
      <section className={step === 0 && !checkingGate ? styles.frameBare : styles.card} id="planner-content">
        {message && <p className={styles.notice} role="status">{message}</p>}
        <fieldset className={styles.panel} disabled={busy}>
          {step === 0 && checkingGate && <PlannerSkeleton />}
          {step === 0 && !checkingGate && unavailable && <div className={styles.gateStage}><div className={styles.gateCard}>
            <h2 ref={unavailableHeading} tabIndex={-1}>We couldn&apos;t load the drinks catalogue.</h2>
            <p>Your list is safe on this device.</p>
            <p className={`${styles.hint} ${retrying ? styles.srOnly : ''}`.trim()} role="status">{retrying ? 'Trying again…' : retryFailures ? 'Still unavailable. Please try again in a moment.' : ''}</p>
            <div className={styles.actions}><button className={styles.primary} disabled={retrying} aria-busy={retrying} onClick={() => void retryCatalogue()}>Try again{retrying && <span className={styles.srOnly}> (trying again…)</span>}</button></div>
          </div></div>}
          {step === 0 && !checkingGate && !unavailable && <>
            <div className={styles.gateStage}><div className={styles.gateCard}><p className={`${styles.eyebrow} ${styles.srOnly}`}>Before we begin</p><h2 ref={heading} tabIndex={-1}>One quick check.</h2><p className={styles.srOnly}>Please confirm your eligibility before viewing alcoholic products.</p>
            <label className={styles.check}><input type="checkbox" checked={eligible} onChange={event => setEligible(event.target.checked)} />I meet the legal drinking-age requirements where I live</label>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={!eligible} onClick={() => void run(async () => {
                const confirmation = await confirmEligibility(eligible)
                if (!confirmation.ok) { setMessage(confirmation.error || 'Please confirm eligibility.'); return }
                const result = await getCatalogue()
                if (!result.ok) { setUnavailable(true); setMessage('The drinks catalogue could not load. Try again; your choices are safe.'); return }
                setProducts(result.products); move(1)
              })}>{draftRestored ? 'Continue your list' : 'Continue to planner'}{busy && <span className={styles.srOnly}> (loading…)</span>}</button><Link href="/" className={styles.secondary}>No thanks, take me home</Link>
            </div></div></div>
          </>}
          {step === 1 && !setupComplete && <section className={styles.setupStage}><h2 ref={heading} tabIndex={-1}>Set your party</h2>{basicsFields('setup')}</section>}
          {step === 1 && setupComplete && suggestionOpen && suggestionFields()}
          {step === 1 && setupComplete && !suggestionOpen && <>
            <h2 ref={heading} tabIndex={-1} className={styles.compactHeading}>Build your list.</h2>
            <p className={styles.additionStatus} role="status" aria-live="polite">{announcement || ''}</p>
            <div className={styles.inventoryLayout}>
              <div className={styles.browse}>
            {guestNotice && <div className={styles.notice} role="status"><p>Guests changed; quantities have not been updated.</p><div className={styles.actions}>{estimate && <button className={styles.secondary} onClick={() => setSuggestionOpen(true)}>Update suggestion</button>}<button className={styles.secondary} onClick={() => { setGuestNotice(false); focusIssue() }}>{estimate ? 'Review quantities' : 'Review quantities'}</button><button className={styles.linkButton} onClick={() => setGuestNotice(false)}>Keep my quantities</button></div></div>}
            <button className={styles.linkButton} onClick={() => setSuggestionOpen(true)}>{estimate ? 'Edit suggestion' : 'Suggest a list'}</button>
              <div className={styles.categoryRail}>{categoryNavigation('Categories')}</div>
              <section ref={shelfRef} tabIndex={-1} className={styles.shelf} aria-label={browsing ? `${browsing} selection` : 'Drink shelf'}>
                {!browsing && <p className={styles.hint}>Select a category from the index to browse its drinks.</p>}
                {browsing && <>
                <div className={styles.filterBar}>
                  <input className={styles.search} type="search" aria-label="Search all drinks" placeholder="Search all drinks" value={search} onChange={event => { setSearch(event.target.value); setLimits(current => ({ ...current, [filterScope]: 24 })) }} />
                  <button ref={filterTrigger} className={styles.filterTrigger} aria-haspopup="dialog" aria-expanded={filterDialogOpen} onClick={openFilters}>Filters{filterCount > 0 ? ` (${filterCount})` : ''}</button>
                </div>
                <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Showing {matches.length} of {categoryProducts.length} {categoryProducts.length === 1 ? 'drink' : 'drinks'}{(() => { if (!categoryProducts.length) return ''; const min = Math.min(...categoryProducts.map(product => product.pricePaise)); const max = Math.max(...categoryProducts.map(product => product.pricePaise)); return ` · ${min === max ? formatMoney(min) : `${formatMoney(min)}–${formatMoney(max)}`} · illustrative artwork` })()}</p>
                {filtersActive && <div className={styles.activeFilters}>
                  <span className={styles.resultCount} aria-hidden="true">{matches.length}</span>
                  <span className={styles.activeFiltersLabel}>Active filters</span>
                  {search && <button className={styles.filterChip} aria-label="Remove search filter" onClick={() => setSearch('')}><span className={styles.filterChipLabel}>{search}</span><span aria-hidden="true">×</span></button>}
                  {selectedBrands.map(brand => <button key={brand} className={styles.filterChip} aria-label={`Remove ${brand} filter`} onClick={() => setBrands(current => ({ ...current, [filterScope]: (current[filterScope] || []).filter(value => value !== brand) }))}><span className={styles.filterChipLabel}>{brand}</span><span aria-hidden="true">×</span></button>)}
                  {selectedSizes.map(size => <button key={size} className={styles.filterChip} aria-label={`Remove ${size} ml filter`} onClick={() => setSizes(current => ({ ...current, [filterScope]: (current[filterScope] || []).filter(value => value !== size) }))}><span className={styles.filterChipLabel}>{size} ml</span><span aria-hidden="true">×</span></button>)}
                  {withinOn && <button className={styles.filterChip} aria-label="Remove within-budget filter" onClick={() => setWithin(current => ({ ...current, [filterScope]: false }))}><span className={styles.filterChipLabel}>Within budget</span><span aria-hidden="true">×</span></button>}
                  <button className={styles.linkButton} onClick={resetFilters}>Clear all filters</button>
                </div>}
                {!matches.length && <div className={styles.emptySlot}><p>No matching drinks</p><button className={styles.secondary} onClick={resetFilters}>Reset filters</button></div>}
                <ul className={styles.menuList}>{matches.slice(0, limit).map(product => {
                  const fits = fitsBudget(product)
                  const inInventory = inventory.some(item => item.id === product.id)
                  const cardQuantityValid = validCount(quantities[product.id] || '')
                  const cardToken = encodeURIComponent(product.id)
                  return <li key={product.id} data-product-id={product.id} className={`${inInventory ? styles.menuItemSelected : styles.menuItem} ${fits ? '' : styles.menuItemOver}`.trim()} draggable={!busy} onDragStart={event => { if (pending.current || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) { event.preventDefault(); return } draggedId.current = product.id; event.dataTransfer.setData(dragType, product.id); event.dataTransfer.effectAllowed = 'copy' }} onDragEnd={() => { draggedId.current = null; setDragOver(false) }}>
                  <span className={styles.dragHint} aria-hidden="true" title="Drag to plan"><GripIcon /></span><span className={styles.menuArt}><img src={artFor(product.category)} alt="" width={56} height={56} draggable={false} /></span>
                  <div className={styles.menuIdentity}>
                    <strong>{product.name}</strong>{search && <small>{product.category}</small>}
                    <small>{product.sizeMl} ml · <b className={styles.menuPrice}>{shortMoney(product.pricePaise)}</b><span className={styles.srOnly}> ({formatMoney(product.pricePaise)})</span></small>
                    {!fits && <b className={styles.overBudget}><span aria-hidden="true">{shortMoney(product.pricePaise - remainingExcluding(product))} over</span><span className={styles.srOnly}>{formatMoney(product.pricePaise - remainingExcluding(product))} over remaining budget</span></b>}
                  </div>
                  <div className={styles.menuActions}>
                  {inInventory ? <div className={styles.cardStepper}>
                    <label className={styles.srOnly} htmlFor={`card-quantity-${cardToken}`}>{product.name} pack quantity</label>
                    <div className={styles.quantityControls}>
                      <button aria-label={`Decrease ${product.name} packs`} disabled={!cardQuantityValid || Number(quantities[product.id]) <= 1} onClick={() => setQuantities(values => ({ ...values, [product.id]: String(Number(values[product.id]) - 1) }))}>−</button>
                      <input id={`card-quantity-${cardToken}`} ref={node => { quantityInputs.current[`card-quantity-${cardToken}`] = node }} inputMode="numeric" value={quantities[product.id] || ''} aria-invalid={!cardQuantityValid} aria-describedby={`card-quantity-status-${cardToken}`} onChange={event => setQuantities(values => ({ ...values, [product.id]: event.target.value }))} />
                      <button aria-label={`Increase ${product.name} packs`} disabled={!cardQuantityValid || Number(quantities[product.id]) >= 1000} onClick={() => addProduct(product.id)}>+</button>
                    </div>
                    <p id={`card-quantity-status-${cardToken}`} className={`${styles.quantityMessage} ${cardQuantityValid ? styles.srOnly : ''}`.trim()}>{cardQuantityValid ? `Line total: ${formatMoney(lineCost(product.id))}` : 'Enter a whole number from 1 to 1,000.'}</p>
                  </div> : <>
                    <button className={styles.primary} disabled={!fits} aria-label={`Add ${product.name} to inventory`} onClick={() => addProduct(product.id)}>Add</button>
                    {!fits && <button className={styles.secondary} aria-label={`Add ${product.name} anyway (over budget)`} onClick={() => addProduct(product.id)}><span aria-hidden="true">Add anyway</span></button>}
                  </>}
                  </div>
                </li>})}</ul>
                {matches.length > limit && <button className={styles.secondary} onClick={() => setLimits(current => ({ ...current, [browsing]: limit + 24 }))}>Show more {browsing} ({matches.length - limit} more)</button>}
                </>}
              </section>
              </div>
              <aside className={`${styles.planPanel} ${dragOver ? styles.validDrop : ''}`} aria-label="Your selected plan" onDragOverCapture={dropZoneOver} onDragLeave={dropZoneLeave} onDropCapture={dropZoneDrop}><div className={styles.panelHead}><h3>Your plan</h3>{infoButton()}</div>{inventoryContents('desktop')}</aside>
            </div>
            <p className={styles.disclaimer}>{estimateNote} {PRICE_LABEL}. Not included: mixers, food, water, ice and supplies.</p>
            <div className={styles.mobileBar}><div className={styles.mobileMeter} aria-hidden="true"><div className={remaining !== null && remaining < 0 ? styles.meterFillOver : styles.meterFill} style={{ width: `${budgetPaise && budgetPaise > 0 ? Math.min(100, (subtotal / budgetPaise) * 100) : 0}%` }} /></div><div><strong>{inventory.length} {inventory.length === 1 ? 'item' : 'items'} · {shortMoney(subtotal)}</strong><small><span aria-hidden="true">{remaining === null ? '' : remaining < 0 ? `${shortMoney(-remaining)} over` : `${shortMoney(remaining)} left`}{mobileStatus === 'Ready to review' ? '' : `${remaining === null ? '' : ' · '}${mobileStatus}`}</span><span className={styles.srOnly}>{remainingLabel ? `${remainingLabel} · ${mobileStatus}` : mobileStatus}</span></small></div><button ref={inventoryTrigger} className={styles.primary} aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={openInventory}>View plan</button></div>
          </>}
          {step === 2 && plan && <>
            <h2 ref={heading} tabIndex={-1}>Ready for the shops.</h2>
            <div className={styles.reviewLayout}>
              <Receipt plan={plan} />
              <div id="list-export" className={styles.reviewActions}>
                <p className={styles.keptNote}>Your list is kept on this device.</p>
                <div className={styles.reviewButtons}>
                  <button className={styles.primary} onClick={() => void shareList(plan)}>Share list</button>
                  <button className={styles.outline} onClick={() => move(1)}>Edit list</button>
                  <details className={styles.exportMore}><summary>More options</summary><button className={styles.outline} onClick={() => void copyList(plan)}>Copy list</button><button className={styles.outline} onClick={() => window.print()}>Print / Save as PDF</button><button className={styles.linkButton} onClick={event => requestConfirmation({ kind: 'new' }, event.currentTarget)}>Start a new plan</button></details>
                </div>
              </div>
            </div>
            {copyFallback && <label className={styles.searchLabel}>Full list for copying<textarea readOnly className={styles.shareText} value={planText(plan)} onFocus={event => event.target.select()} /></label>}
          </>}
        </fieldset>
        {busy && <p role="status" className={`${styles.hint} ${styles.srOnly}`}>Working… Your choices are retained.</p>}
      </section>
      <dialog ref={inventoryDialog} className={`${styles.modal} ${styles.inventoryDrawer} ${dragOver ? styles.validDrop : ''}`.trim()} aria-labelledby="inventory-title" onCancel={event => { event.preventDefault(); closeInventory() }} onDragOverCapture={dropZoneOver} onDragLeave={dropZoneLeave} onDropCapture={dropZoneDrop}>
        <button className={styles.close} onClick={closeInventory} aria-label="Close plan">×</button><div className={styles.sheetHead}><h2 id="inventory-title" tabIndex={-1}>Your plan</h2>{infoButton()}</div>
        <p role="status" className={styles.srOnly}>{announcement}</p>{drawerOpen && inventoryContents('drawer')}
        {drawerOpen && toast && <div className={styles.toast} role="status"><span>{toast.message}</span><button className={styles.toastAction} onClick={() => toast.restore()}>Undo</button></div>}
      </dialog>
      <dialog ref={categoryDialog} className={`${styles.modal} ${styles.categorySheet}`} aria-labelledby="category-sheet-title" onCancel={event => { event.preventDefault(); closeCategoryPicker() }}><h2 id="category-sheet-title">Browse categories</h2><p>Browsing does not change your list.</p><div className={styles.categorySheetChoices}>{allCategories.map(category => <button key={category} className={browsing === category ? styles.filterActive : styles.filter} aria-current={browsing === category || undefined} onClick={() => { setActiveCategory(category); closeCategoryPicker() }}>{category}</button>)}</div><button className={styles.secondary} onClick={closeCategoryPicker}>Cancel</button></dialog>
      <dialog ref={infoDialog} className={`${styles.modal} ${styles.basicsPanel}`} aria-labelledby="info-title" onCancel={event => { event.preventDefault(); closeInfo() }}>
        <button className={styles.close} onClick={closeInfo} aria-label="Close how quantities are chosen">×</button>
        <h2 id="info-title" tabIndex={-1}>How are quantities chosen?</h2>
        {estimate && <div role="note"><p><strong>{SUGGEST_LABEL}</strong> Original estimate for {estimate.drinkers} {estimate.drinkers === 1 ? 'drinker' : 'drinkers'} · target {estimate.totalServings} servings · packs cover about {estimate.coveredServings} category-specific servings · original total {formatMoney(estimate.totalPaise)} · original estimated cost per guest {formatMoney(estimate.perGuestPaise)}. Edits to your list do not change these original figures.</p>{estimate.notes.map(note => <p key={note}>{note}</p>)}</div>}
        <p>For a starting list, enter estimated servings per drinking guest. Target servings are drinking guests × that number. We split target servings equally across your selected categories, then round up to purchasable packs. Beer uses 330 ml per serving, wine 150 ml, ready-to-drink 275 ml and spirits 60 ml. Equal servings do not mean equal packs or spending. Product selection is deterministic: mid-priced, best-value eligible packs move cheaper if needed to fit your budget. This is a shopping estimate, not a drinking recommendation. Changing guests does not change existing quantities.</p>
        <p className={styles.hint}>A transparent estimate you can edit. Non-alcoholic drinks and mixers are not in the catalogue yet.</p>
        <div className={styles.actions}><button className={styles.primary} onClick={closeInfo}>Done</button></div>
      </dialog>
      <dialog ref={basicsDialog} className={`${styles.modal} ${styles.basicsPanel}`} aria-labelledby="basics-title" onCancel={event => { event.preventDefault(); closeBasics() }}>
        <button className={styles.close} onClick={() => closeBasics()} aria-label="Close guests and budget">×</button>
        <h2 id="basics-title" tabIndex={-1} ref={basicsHeading}>Guests & budget</h2>
        {basicsFields('dialog')}
        <div className={styles.actions}><button className={styles.secondary} onClick={() => closeBasics()}>Cancel</button><button className={styles.primary} onClick={() => closeBasics(true)}>Save changes</button></div>
      </dialog>
      <dialog ref={confirmationDialog} className={`${styles.modal} ${styles.confirmation}`} aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={event => { event.preventDefault(); cancelConfirmation() }}>
        {confirmation && <>
          <p className={styles.eyebrow}>Socifer / Your list</p>
          <h2 id="confirmation-title">{confirmationCopy[confirmation.kind].title}</h2>
          <p id="confirmation-description">{confirmationCopy[confirmation.kind].description}</p>
          <div className={styles.actions}>
            <button ref={cancelButton} autoFocus className={styles.secondary} onClick={cancelConfirmation}>Cancel</button>
            <button className={styles.primary} onClick={confirmAction}>{confirmationCopy[confirmation.kind].action}</button>
          </div>
        </>}
      </dialog>
      <dialog ref={filterDialog} className={`${styles.modal} ${styles.filterPanel}`} aria-labelledby="filter-title" onCancel={event => { event.preventDefault(); closeFilters() }}>
        <button className={styles.close} onClick={closeFilters} aria-label="Close filters">×</button>
        <h2 id="filter-title" tabIndex={-1} ref={filterHeading}>Filters</h2>
        {browsing && <><p>Filters apply to {search ? 'all search results' : browsing}.</p>
          <fieldset className={styles.facet}><legend>Brand</legend><div className={styles.facetChips}>{brandOptions.map(brand => <button key={brand} className={selectedBrands.includes(brand) ? styles.filterActive : styles.filter} aria-pressed={selectedBrands.includes(brand)} onClick={() => setBrands(current => { const selected = current[filterScope] || []; return { ...current, [filterScope]: selected.includes(brand) ? selected.filter(value => value !== brand) : [...selected, brand] } })}>{brand || 'Unlisted brand'} ({categoryProducts.filter(product => product.brand === brand).length})</button>)}</div></fieldset>
          <fieldset className={styles.facet}><legend>Pack size</legend><div className={styles.facetChips}>{sizeOptions.map(size => <button key={size} className={selectedSizes.includes(size) ? styles.filterActive : styles.filter} aria-pressed={selectedSizes.includes(size)} onClick={() => setSizes(current => { const selected = current[filterScope] || []; return { ...current, [filterScope]: selected.includes(size) ? selected.filter(value => value !== size) : [...selected, size] } })}>{size} ml ({categoryProducts.filter(product => product.sizeMl === size).length})</button>)}</div></fieldset>
          <fieldset className={styles.facet}><legend>Within budget</legend><div className={styles.facetChips}><button className={withinOn ? styles.filterActive : styles.filter} aria-pressed={withinOn} onClick={() => setWithin(current => ({ ...current, [filterScope]: !withinOn }))}>Within budget ({fitting.length})</button></div></fieldset>
        </>}
        <div className={styles.actions}><button className={styles.secondary} onClick={resetFilters}>Clear all filters</button><button className={styles.primary} onClick={closeFilters}>Done</button></div>
      </dialog>
      {!drawerOpen && toast && <div className={styles.toast} role="status"><span>{toast.message}</span><button className={styles.toastAction} onClick={() => toast.restore()}>Undo</button></div>}
    </main>
    <div className={styles.printOnly}>{exported && <Receipt plan={exported} />}</div>
  </>
}
