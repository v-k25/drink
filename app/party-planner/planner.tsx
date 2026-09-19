'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { formatMoney, parseBudget, planText, type Plan, type PlannerInput, type Product } from './model'
import { confirmEligibility, getCatalogue, validatePlan, getSession, sendOtp, verifyOtp, listPlans, savePlan, deletePlan, signOut, type SavedPlan } from './actions'
import styles from './planner.module.css'

const validCount = (value: string) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000
const estimateNote = 'Estimated from our Jaipur catalogue. Store prices and availability may differ.'
type Confirmation = { kind: 'new' } | { kind: 'edit' | 'delete'; item: SavedPlan }
const dragType = 'application/x-allcheers-product'
const draftKey = 'allcheers_planner_draft'
const categoryArt: Record<string, string> = { Beer: '/images/drinks/beer.svg', Brandy: '/images/drinks/brandy.svg', Champagne: '/images/drinks/champagne.svg', Gin: '/images/drinks/gin.svg', Rum: '/images/drinks/rum.svg', Sake: '/images/drinks/sake.svg', Scotch: '/images/drinks/scotch.svg', Tequila: '/images/drinks/tequila.svg', Vodka: '/images/drinks/vodka.svg', Whisky: '/images/drinks/whisky.svg' }
const artFor = (category: string) => categoryArt[category] ?? '/images/drink-placeholder.svg'
const confirmationCopy = {
  new: { title: 'Start a new plan?', description: 'Unsaved changes to this draft will be discarded.', action: 'Start new plan' },
  edit: { title: 'Edit & reprice this plan?', description: 'This replaces your current draft using current catalogue prices. The saved snapshot stays unchanged until you save.', action: 'Edit & reprice' },
  delete: { title: 'Delete this saved plan?', description: 'This cannot be undone. Your current draft will stay here.', action: 'Delete plan' },
}

function Receipt({ plan }: { plan: Plan }) {
  return <div className={styles.receipt}>
    <p className={styles.eyebrow}>AllCheers / Jaipur</p><h2>Your list</h2>
    <p>{plan.guests} guests · Original budget {formatMoney(plan.budgetPaise)}</p>
    <p className={plan.remainingPaise < 0 ? styles.overBudget : styles.goodBudget}>{plan.remainingPaise < 0 ? `Over budget by ${formatMoney(-plan.remainingPaise)}` : `${formatMoney(plan.remainingPaise)} remaining`}</p>
    {plan.lines.map(line => <div className={styles.receiptLine} key={line.id}>
      <span><img src={artFor(line.category)} alt="" width={28} height={31} /><span><strong>{line.name}</strong><small>{line.category} · {line.sizeMl} ml · {line.quantity} {line.quantity === 1 ? 'pack' : 'packs'} × {formatMoney(line.pricePaise)}</small></span></span><b>{formatMoney(line.subtotalPaise)}</b>
    </div>)}
    <div className={styles.receiptTotal}><span>Estimated total</span><b>{formatMoney(plan.totalPaise)}</b></div>
    <p className={styles.disclaimer}>{estimateNote} Price verification date: unknown. Shop independently at local stores.</p>
    <p className={styles.disclaimer}>Not included in this estimate: mixers, food, water, ice and supplies. Host-entered quantities are not a serving recommendation.</p>
  </div>
}

export default function Planner() {
  const [step, setStep] = useState(0)
  const [eligible, setEligible] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [guests, setGuests] = useState('')
  const [budget, setBudget] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [inventory, setInventory] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState('')
  const [queries, setQueries] = useState<Record<string, string>>({})
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
  const [accountMessage, setAccountMessage] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [saved, setSaved] = useState<SavedPlan[]>([])
  const [viewed, setViewed] = useState<SavedPlan | null>(null)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [copyFallback, setCopyFallback] = useState(false)
  const record = useRef<{ id: string; updatedAt?: string } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
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
  const basicsPrompted = useRef(false)
  const basicsHeading = useRef<HTMLHeadingElement>(null)
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
          && typeof draft.guests === 'string' && /^\d+$/.test(draft.guests) && Number(draft.guests) <= 1000
          && typeof draft.budget === 'string' && parseBudget(draft.budget) !== null
          && Array.isArray(draft.categories) && draft.categories.length > 0 && draft.categories.every((category: unknown) => typeof category === 'string')
          && Array.isArray(draft.inventory) && draft.inventory.length > 0 && draft.inventory.every((item: any) => item && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.name === 'string' && typeof item.brand === 'string' && Number.isFinite(item.sizeMl) && item.sizeMl > 0 && Number.isFinite(item.pricePaise) && item.pricePaise > 0)
          && draft.quantities && typeof draft.quantities === 'object' && !Array.isArray(draft.quantities) && Object.values(draft.quantities).every((value: unknown) => typeof value === 'string')
          && draft.needsReview && typeof draft.needsReview === 'object' && !Array.isArray(draft.needsReview) && Object.values(draft.needsReview).every((value: unknown) => typeof value === 'boolean')
          && typeof draft.activeCategory === 'string'
        if (ok) {
          setGuests(draft.guests); setBudget(draft.budget); setCategories(draft.categories); setInventory(draft.inventory); setQuantities(draft.quantities); setNeedsReview(draft.needsReview); setActiveCategory(draft.activeCategory); setDraftRestored(true)
        } else localStorage.removeItem(draftKey)
      }
    } catch { }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(draftKey, JSON.stringify({ guests, budget, categories, inventory, quantities, needsReview, activeCategory })) } catch { }
  }, [guests, budget, categories, inventory, quantities, needsReview, activeCategory])
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus()
    previousStep.current = step
    if (step === 1 && products.length && !basicsValid && !basicsPrompted.current) { basicsPrompted.current = true; openBasics() }
  }, [step])
  useEffect(() => {
    if (confirmation) { confirmationDialog.current?.showModal(); cancelButton.current?.focus() }
    else if (focusHeading.current) { focusHeading.current = false; heading.current?.focus() }
  }, [confirmation])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const budgetPaise = parseBudget(budget)
  const basicsValid = validCount(guests) && budgetPaise !== null
  const allCategories = [...new Set([...products.map(item => item.category), ...categories])]
  const productFor = (id: string) => products.find(item => item.id === id && categories.includes(item.category))
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
  const browsing = categories.includes(activeCategory) ? activeCategory : categories[0] || ''
  const categoryProducts = products.filter(product => product.category === browsing)
  const brandOptions = [...new Set(categoryProducts.map(product => product.brand))].sort((a, b) => a.localeCompare(b))
  const sizeOptions = [...new Set(categoryProducts.map(product => product.sizeMl))].sort((a, b) => a - b)
  const selectedBrands = brands[browsing] || []
  const selectedSizes = sizes[browsing] || []
  const withinOn = !!within[browsing]
  // Affordability rule (single source of truth): one pack fits iff its price is within
  // the remaining budget ignoring this product's own current line cost (prior quantities
  // never change a card's tier). Card tier, over-label and the within-budget chip all
  // read from these two helpers; the post-add announcement instead reports the actual
  // post-add remaining (spec: "R reflects post-add subtotal").
  const remainingExcluding = (product: Product) => (budgetPaise ?? 0) - (subtotal - lineCost(product.id))
  const fitsBudget = (product: Product) => budgetPaise === null || product.pricePaise <= remainingExcluding(product)
  const baseMatches = categoryProducts.filter(product => `${product.name} ${product.brand}`.toLowerCase().includes((queries[browsing] || '').toLowerCase())
    && (!selectedBrands.length || selectedBrands.includes(product.brand))
    && (!selectedSizes.length || selectedSizes.includes(product.sizeMl)))
  const fitting = baseMatches.filter(fitsBudget)
  const matches = withinOn ? fitting : baseMatches
  const filtersActive = !!queries[browsing] || selectedBrands.length > 0 || selectedSizes.length > 0 || withinOn
  const filterCount = selectedBrands.length + selectedSizes.length + (withinOn ? 1 : 0) + (queries[browsing] ? 1 : 0)
  const remaining = budgetPaise === null ? null : budgetPaise - subtotal
  const remainingLabel = remaining === null ? null : remaining < 0 ? `${formatMoney(-remaining)} over budget` : `${formatMoney(remaining)} left of budget`
  const perGuest = budgetPaise !== null && validCount(guests) ? formatMoney(Math.round(budgetPaise / Number(guests))) : null
  const limit = limits[browsing] ?? 24
  function resetFilters() {
    setBrands(current => ({ ...current, [browsing]: [] }))
    setSizes(current => ({ ...current, [browsing]: [] }))
    setWithin(current => ({ ...current, [browsing]: false }))
    setQueries(current => ({ ...current, [browsing]: '' }))
  }
  function openFilters() { filterDialog.current?.showModal(); setFilterDialogOpen(true); filterHeading.current?.focus() }
  function closeFilters() { filterDialog.current?.close(); setFilterDialogOpen(false); filterTrigger.current?.focus() }
  function openBasics() { basicsDialog.current?.showModal(); setBasicsOpen(true); basicsHeading.current?.focus() }
  function closeBasics() { basicsDialog.current?.close(); setBasicsOpen(false); basicsTrigger.current?.focus() }
  const input = (): PlannerInput => ({ guests: Number(guests), budgetPaise: budgetPaise ?? 0, categories, lines: inventory.map(item => ({ productId: item.id, quantity: Number(quantities[item.id]) })) })
  const exported = viewed?.snapshot ?? plan

  async function run(action: () => Promise<void>, inAccount = false) {
    if (pending.current) return
    pending.current = true; setBusy(true)
    const notify = inAccount ? setAccountMessage : setMessage
    notify('')
    try { await action() }
    catch { notify('Connection interrupted. Your choices are still here; please try again.') }
    finally { pending.current = false; setBusy(false) }
  }
  function move(next: number) { setMessage(''); setCopyFallback(false); setPlan(null); setStep(next) }
  function removeItem(id: string) {
    if (pending.current) return
    setInventory(current => current.filter(item => item.id !== id))
    setQuantities(current => { const next = { ...current }; delete next[id]; return next })
    setNeedsReview(current => { const next = { ...current }; delete next[id]; return next })
  }
  function showToast(message: string, restore: () => void) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ message, restore })
    toastTimer.current = window.setTimeout(() => setToast(null), 8000)
  }
  function undoRemoval(snapshot: { categories: string[]; inventory: Product[]; quantities: Record<string, string>; needsReview: Record<string, boolean> }) {
    setCategories(snapshot.categories); setInventory(snapshot.inventory); setQuantities(snapshot.quantities); setNeedsReview(snapshot.needsReview)
    setToast(null); move(1); window.setTimeout(() => heading.current?.focus(), 0)
  }
  function removeCategory(category: string) {
    if (pending.current) return
    const snapshot = { categories, inventory, quantities, needsReview }
    const hadItems = inventory.some(item => item.category === category)
    inventory.filter(item => item.category === category).forEach(item => removeItem(item.id))
    setCategories(current => current.filter(value => value !== category))
    if (hadItems) showToast(`Removed ${category} and its items.`, () => undoRemoval(snapshot))
  }
  function toggleCategory(category: string) {
    if (pending.current) return
    if (!categories.includes(category)) { setCategories(current => [...current, category]); setActiveCategory(category) }
    else if (browsing !== category) setActiveCategory(category)
    else removeCategory(category)
  }
  function addProduct(id: string) {
    if (pending.current || !eligible) return
    const product = productFor(id)
    if (!product) return
    const existing = inventory.some(item => item.id === id)
    if (existing && !validCount(quantities[id] || '')) { setAnnouncement(`Correct ${product.name}'s pack quantity before adding another pack.`); return }
    if (existing && Number(quantities[id]) >= 1000) { setAnnouncement(`${product.name} is at the maximum of 1,000 packs.`); return }
    if (!existing) setInventory(current => [...current, product])
    const next = existing ? Number(quantities[id]) + 1 : 1
    const after = subtotal + product.pricePaise
    const over = budgetPaise !== null && after > budgetPaise
    setQuantities(current => ({ ...current, [id]: String(next) }))
    const budgetNote = budgetPaise === null ? '' : over ? ` ${formatMoney(after - budgetPaise)} over budget.` : ` ${formatMoney(budgetPaise - after)} left of budget.`
    setAnnouncement(`${product.name}: added 1 pack. Now ${next} ${next === 1 ? 'pack' : 'packs'} in inventory.${budgetNote}`)
  }
  function closeInventory() { inventoryDialog.current?.close(); setDrawerOpen(false); inventoryTrigger.current?.focus() }
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
  async function loadSaved() {
    const result = await listPlans()
    if (result.ok) setSaved(result.plans)
    else { setAccountMessage(result.error); if (result.unauthorized) setSignedIn(false) }
  }
  function openAccount() {
    setViewed(null); setCopyFallback(false); setAccountMessage(''); dialog.current?.showModal()
    void run(async () => { const session = await getSession(); setSignedIn(session.signedIn); if (session.signedIn) await loadSaved() }, true)
  }
  function closeAccount() { dialog.current?.close(); setViewed(null); setCopyFallback(false) }
  function saveCurrent() {
    if (!plan) return
    void run(async () => {
      record.current ??= { id: crypto.randomUUID() }
      const result = await savePlan(input(), record.current.id, record.current.updatedAt)
      if (!result.ok) {
        setMessage(result.error)
        if (result.unauthorized) { setSignedIn(false); setViewed(null); setAccountMessage('Sign in, then return to your list and select Save plan. Your choices are retained.'); dialog.current?.showModal() }
        return
      }
      record.current = { id: result.record.id, updatedAt: result.record.updated_at }
      setPlan(result.record.snapshot); setSignedIn(true); setMessage('Plan saved. You can reopen it in Saved plans.')
    })
  }
  function requestConfirmation(action: Confirmation, trigger: HTMLElement) {
    if (pending.current || confirmationAction.current) return
    confirmationTrigger.current = trigger; confirmationAction.current = action; setConfirmation(action)
  }
  function cancelConfirmation() {
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
    else if (action.kind === 'edit') { editSaved(action.item); focusHeading.current = true }
    else {
      const item = action.item
      void run(async () => {
        const result = await deletePlan(item.id, item.updated_at)
        if (!result.ok) { setAccountMessage(result.error); if (result.unauthorized) setSignedIn(false); return }
        setSaved(current => current.filter(value => value.id !== item.id))
        if (record.current?.id === item.id) record.current = null
        setAccountMessage('Plan deleted.')
      }, true)
    }
  }
  function editSaved(item: SavedPlan) {
    setGuests(String(item.snapshot.guests)); setBudget((item.snapshot.budgetPaise / 100).toFixed(2))
    setCategories([...new Set(item.snapshot.lines.map(line => line.category))])
    setInventory(item.snapshot.lines.map(line => products.find(product => product.id === line.id) ?? line))
    setQuantities(Object.fromEntries(item.snapshot.lines.map(line => [line.id, String(line.quantity)])))
    setNeedsReview(Object.fromEntries(item.snapshot.lines.map(line => [line.id, products.find(product => product.id === line.id)?.sizeMl !== line.sizeMl])))
    setActiveCategory(item.snapshot.lines[0]?.category || ''); setQueries({}); setLimits({}); setBrands({}); setSizes({}); record.current = { id: item.id, updatedAt: item.updated_at }
    closeAccount(); move(1); setMessage('Editing with current catalogue prices. Review the updated total and replace any unavailable products before saving.')
  }
  function startNew() {
    setGuests(''); setBudget(''); setCategories([]); setInventory([]); setQuantities({}); setActiveCategory(''); setQueries({}); setLimits({}); setBrands({}); setSizes({}); setNeedsReview({}); setAnnouncement(''); record.current = null; move(1)
  }
  async function copyList(target: Plan) {
    try { await navigator.clipboard.writeText(planText(target)); (dialog.current?.open ? setAccountMessage : setMessage)('Plan copied.') }
    catch { setCopyFallback(true); (dialog.current?.open ? setAccountMessage : setMessage)('Select and copy the full list below.') }
  }
  async function shareList(target: Plan) {
    if (!navigator.share) return copyList(target)
    try { await navigator.share({ title: 'My AllCheers list', text: planText(target) }) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copyList(target) }
  }
  function exportButtons(target: Plan) {
    return <><button className={styles.primary} onClick={() => window.print()}>Print / Save as PDF</button><button className={styles.secondary} onClick={() => void copyList(target)}>Copy list</button><button className={styles.secondary} onClick={() => void shareList(target)}>Share list</button></>
  }

  function inventoryContents(prefix: string) {
    return <fieldset className={styles.panel} disabled={busy}>
      <p className={styles.inventoryCount}>{inventory.length} {inventory.length === 1 ? 'item' : 'items'} · {packs} {packs === 1 ? 'pack' : 'packs'}</p>
      {!inventory.length && <p className={styles.emptySlot}>Your list is empty. Add a drink from the shelf, or drag a card onto the pill on desktop.</p>}
      <div className={styles.inventoryLines}>{inventory.map(item => {
        const current = productFor(item.id), quantityValid = validCount(quantities[item.id] || '')
        return <div className={styles.inventoryLine} key={item.id} data-inventory-id={item.id}>
          <div className={styles.inventoryIdentity}><img src={artFor(item.category)} alt="" width={48} height={64} /><div><strong>{item.name}</strong><small>{item.category} · {current?.sizeMl ?? item.sizeMl} ml · {formatMoney(current?.pricePaise ?? item.pricePaise)} per pack</small></div></div>
          {!current && <p role="alert" className={styles.overBudget}>Saved product unavailable. Remove this item before review.</p>}
          <p className={styles.quantityReadout}>{quantityValid ? `${quantities[item.id]} ${Number(quantities[item.id]) === 1 ? 'pack' : 'packs'} × ${formatMoney(current?.pricePaise ?? item.pricePaise)} = ${formatMoney(lineCost(item.id))}` : 'Set the quantity on the card'}</p>
          {current && needsReview[item.id] && <div className={styles.notice}><p>Pack size changed. Check your quantity before continuing.</p><button className={styles.secondary} disabled={!quantityValid} onClick={() => { const card = quantityInputs.current[`card-quantity-${encodeURIComponent(item.id)}`]; card?.scrollIntoView({ block: 'center' }); card?.focus(); setNeedsReview(values => ({ ...values, [item.id]: false })) }}>I have reviewed my quantity</button></div>}
          <button className={styles.linkButton} aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      })}</div>
      <div className={styles.inventorySummary}><strong>{subtotalLabel} {formatMoney(subtotal)}</strong><small>Budget {formatMoney(budgetPaise ?? 0)} · {subtotal > (budgetPaise ?? 0) ? `${formatMoney(subtotal - (budgetPaise ?? 0))} over budget` : `${formatMoney((budgetPaise ?? 0) - subtotal)} left of budget`}</small>
        {(!inventory.length || issueCategories.length > 0 || !basicsValid) && <div className={styles.issueChips} aria-label="List issues">{!basicsValid && <button className={styles.filter} onClick={event => { basicsTrigger.current = event.currentTarget; openBasics() }}>Set guests & budget</button>}{!inventory.length ? <button className={styles.filter} onClick={() => categories[0] && setActiveCategory(categories[0])}>Add at least one drink</button> : issueCategories.map(category => <button key={category} className={styles.filter} onClick={() => setActiveCategory(category)}>{category} — {inventory.some(item => item.category === category) ? 'check quantities' : 'add at least one item'}</button>)}</div>}
        <button className={styles.primary} disabled={!reviewReady || busy} onClick={reviewList}>{busy ? 'Checking…' : 'Review list'}</button></div>
    </fieldset>
  }

  return <>
    <main className={styles.shell} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); draggedId.current = null; setDragOver(false) }}>
      <a href="#planner-content" className="skip-link">Skip to planner</a>
      <header className={styles.header}><Link href="/" className={styles.logo}>AllCheers</Link><div className={styles.headerActions}><span>Jaipur</span><button disabled={!products.length || busy} className={styles.linkButton} onClick={openAccount}>Saved plans</button></div></header>
      <div className={styles.intro}><h1>Party Planner</h1></div>
      <section className={styles.card} id="planner-content">
        {message && <p className={styles.notice} role="status">{message}</p>}
        <fieldset className={styles.panel} disabled={busy}>
          {step === 0 && <>
            <p className={styles.eyebrow}>Before we begin</p><h2 ref={heading} tabIndex={-1}>One quick check.</h2><p>Please confirm your eligibility before viewing alcoholic products.</p>
            <label className={styles.check}><input type="checkbox" checked={eligible} onChange={event => setEligible(event.target.checked)} />I meet the legal drinking-age requirements where I live</label>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={!eligible} onClick={() => void run(async () => {
                const confirmation = await confirmEligibility(eligible)
                if (!confirmation.ok) { setMessage(confirmation.error || 'Please confirm eligibility.'); return }
                const result = await getCatalogue()
                if (!result.ok) { setMessage(result.error); return }
                setProducts(result.products); move(1)
              })}>{busy ? 'Loading…' : draftRestored ? 'Continue your list' : 'Continue to planner'}</button><Link href="/" className={styles.secondary}>No thanks, take me home</Link>
            </div>
          </>}
          {step === 1 && <>
            <h2 ref={heading} tabIndex={-1}>Build your list.</h2><p>Choose your categories and add drinks in one place. Each add chooses 1 pack, not a serving recommendation.</p>
            <details className={styles.explanation}><summary>How are quantities chosen?</summary><p>You control every quantity. We multiply packs by their listed unit price; we don’t estimate how much anyone will drink. Changing guest count does not change your quantities.</p></details>
            <div className={styles.controls}>
              {budgetPaise !== null && <div className={styles.meter} aria-label="Budget meter">
                <div className={styles.meterTrack}><div className={remaining !== null && remaining < 0 ? styles.meterFillOver : styles.meterFill} style={{ width: `${budgetPaise > 0 ? Math.min(100, (subtotal / budgetPaise) * 100) : 0}%` }} /></div>
                <p className={styles.meterRow}><strong>Budget {formatMoney(budgetPaise)}</strong>{remainingLabel && <span className={remaining !== null && remaining < 0 ? styles.overBudget : styles.goodBudget}>{remainingLabel}</span>}{perGuest && <span>{perGuest} per guest</span>}<button className={styles.meterEdit} aria-label="Edit guests and budget" onClick={event => { basicsTrigger.current = event.currentTarget; openBasics() }}>Edit</button></p>
              </div>}
              <div className={styles.categoryStrip} aria-label="Categories">{allCategories.map(category => {
                const categoryProductsAll = products.filter(item => item.category === category)
                const selected = categories.includes(category)
                const min = categoryProductsAll.length ? Math.min(...categoryProductsAll.map(item => item.pricePaise)) : 0
                const max = categoryProductsAll.length ? Math.max(...categoryProductsAll.map(item => item.pricePaise)) : 0
                return <button key={category} className={`${styles.categoryTab} ${browsing === category ? styles.categoryTabActive : selected ? styles.categoryTabSelected : ''}`.trim()} aria-pressed={selected} onClick={() => toggleCategory(category)}>{category} <small>{categoryProductsAll.length} drinks{categoryProductsAll.length ? ` · ${min === max ? formatMoney(min) : `${formatMoney(min)}–${formatMoney(max)}`}` : ''}</small></button>
              })}</div>
              {browsing && <div className={styles.filterBar}>
                <input className={styles.search} aria-label={`Search ${browsing}`} placeholder={`Search ${browsing}`} value={queries[browsing] || ''} onChange={event => { setQueries(current => ({ ...current, [browsing]: event.target.value })); setLimits(current => ({ ...current, [browsing]: 24 })) }} />
                <button ref={filterTrigger} className={styles.filterTrigger} aria-haspopup="dialog" aria-expanded={filterDialogOpen} onClick={openFilters}>Filters{filterCount > 0 ? ` (${filterCount})` : ''}</button>
                {filtersActive && <button className={styles.linkButton} onClick={resetFilters}>Clear all filters</button>}
              </div>}
            </div>
            <p className={styles.additionStatus} role="status" aria-live="polite">{announcement || ''}</p>
            <div className={styles.inventoryLayout}>
              <section className={styles.shelf} aria-label={browsing ? `${browsing} selection` : 'Drink shelf'}>
                {!browsing && <div><p className={styles.hint}>Start with a category:</p><div className={styles.facetChips}>{[...new Set(products.map(product => product.category))].map(category => ({ category, count: products.filter(product => product.category === category).length })).sort((a, b) => b.count - a.count).slice(0, 3).map(({ category }) => <button key={category} className={styles.filter} onClick={() => toggleCategory(category)}>{category}</button>)}</div></div>}
                {browsing && <>
                <p className={styles.hint} role="status" aria-live="polite" aria-atomic="true">Showing {matches.length} of {categoryProducts.length} {categoryProducts.length === 1 ? 'drink' : 'drinks'}{(() => { if (!categoryProducts.length) return ''; const min = Math.min(...categoryProducts.map(product => product.pricePaise)); const max = Math.max(...categoryProducts.map(product => product.pricePaise)); return ` · ${min === max ? formatMoney(min) : `${formatMoney(min)}–${formatMoney(max)}`} · illustrative artwork` })()}</p>
                {!matches.length && <div className={styles.emptySlot}><p>No matching drinks</p><button className={styles.secondary} onClick={resetFilters}>Reset filters</button></div>}
                <div className={styles.productGrid}>{matches.slice(0, limit).map(product => {
                  const fits = fitsBudget(product)
                  const inInventory = inventory.some(item => item.id === product.id)
                  const cardQuantityValid = validCount(quantities[product.id] || '')
                  const cardToken = encodeURIComponent(product.id)
                  return <article key={product.id} data-product-id={product.id} className={`${inInventory ? styles.productSelected : styles.product} ${fits ? '' : styles.productOver}`} draggable={!busy} onDragStart={event => { if (pending.current || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) { event.preventDefault(); return } draggedId.current = product.id; event.dataTransfer.setData(dragType, product.id); event.dataTransfer.effectAllowed = 'copy' }} onDragEnd={() => { draggedId.current = null; setDragOver(false) }}>
                  <img src={artFor(product.category)} alt="" width={100} height={112} draggable={false} />
                  <strong>{product.name}</strong><span>{product.sizeMl} ml · {formatMoney(product.pricePaise)}</span>
                  <small className={styles.dragHint}>Drag to inventory or add below</small>
                                                            {!fits && <b className={styles.overBudget}>{formatMoney(product.pricePaise - remainingExcluding(product))} over remaining budget</b>}
                  {inInventory ? <div className={styles.cardStepper}>
                    <label htmlFor={`card-quantity-${cardToken}`}>{product.name} pack quantity</label>
                    <div className={styles.quantityControls}>
                      <button aria-label={`Decrease ${product.name} packs`} disabled={!cardQuantityValid || Number(quantities[product.id]) <= 1} onClick={() => setQuantities(values => ({ ...values, [product.id]: String(Number(values[product.id]) - 1) }))}>−</button>
                      <input id={`card-quantity-${cardToken}`} ref={node => { quantityInputs.current[`card-quantity-${cardToken}`] = node }} inputMode="numeric" value={quantities[product.id] || ''} aria-invalid={!cardQuantityValid} aria-describedby={`card-quantity-status-${cardToken}`} onChange={event => setQuantities(values => ({ ...values, [product.id]: event.target.value }))} />
                      <button aria-label={`Increase ${product.name} packs`} disabled={!cardQuantityValid || Number(quantities[product.id]) >= 1000} onClick={() => addProduct(product.id)}>+</button>
                    </div>
                    <p id={`card-quantity-status-${cardToken}`} className={styles.quantityMessage}>{cardQuantityValid ? `Line total: ${formatMoney(lineCost(product.id))}` : 'Enter a whole number from 1 to 1,000.'}</p>
                  </div> : <>
                    <button className={styles.primary} disabled={!fits} aria-label={`Add ${product.name} to inventory`} onClick={() => addProduct(product.id)}>Add <small>+1 pack</small></button>
                    {!fits && <button className={styles.secondary} aria-label={`Add ${product.name} anyway (over budget)`} onClick={() => addProduct(product.id)}>Add anyway (over budget)</button>}
                  </>}
                </article>})}</div>
                {matches.length > limit && <button className={styles.secondary} onClick={() => setLimits(current => ({ ...current, [browsing]: limit + 24 }))}>Show more {browsing} ({matches.length - limit} more)</button>}
                </>}
              </section>
            </div>
            <p className={styles.disclaimer}>{estimateNote} Price verification date: unknown. Not included: mixers, food, water, ice and supplies.</p>
            <div className={styles.mobileBar}><div><strong>{subtotalLabel} {formatMoney(subtotal)}</strong><small>{mobileStatus}</small></div><button className={styles.secondary} onClick={event => { inventoryTrigger.current = event.currentTarget; setDrawerOpen(true); inventoryDialog.current?.showModal() }}>Your list ({inventory.length} {inventory.length === 1 ? 'item' : 'items'})</button><button className={styles.primary} disabled={!reviewReady || busy} onClick={reviewList}>Review list</button></div>
          </>}
          {step === 2 && plan && <>
            <h2 ref={heading} tabIndex={-1}>Ready for the shops.</h2>
            <div className={styles.finalToolbar}><div className={styles.toolbarButtons}><button className={styles.primary} onClick={saveCurrent}>{busy ? 'Saving…' : 'Save plan'}</button><button className={styles.secondary} onClick={() => move(1)}>Edit list</button><a className={styles.secondary} href="#list-export">Export list</a></div><small>Save online requires sign-in. Print or share as a guest.</small></div>
            <Receipt plan={plan} />
            <div id="list-export" className={styles.actions}>{exportButtons(plan)}<button className={styles.secondary} onClick={event => requestConfirmation({ kind: 'new' }, event.currentTarget)}>Start a new plan</button></div>
            {copyFallback && <label className={styles.searchLabel}>Full list for copying<textarea readOnly className={styles.shareText} value={planText(plan)} onFocus={event => event.target.select()} /></label>}
          </>}
        </fieldset>
        {busy && <p role="status" className={styles.hint}>Working… Your choices are retained.</p>}
      </section>
      <dialog ref={inventoryDialog} className={`${styles.modal} ${styles.inventoryDrawer} ${dragOver ? styles.validDrop : ''}`.trim()} aria-label="Your list" onCancel={event => { event.preventDefault(); closeInventory() }} onDragOver={dropZoneOver} onDragLeave={dropZoneLeave} onDrop={dropZoneDrop}>
        <button className={styles.close} onClick={closeInventory} aria-label="Close list">×</button><h2>Your list</h2>
        <p role="status">{announcement}</p>{drawerOpen && inventoryContents('drawer')}
      </dialog>
      <dialog ref={basicsDialog} className={`${styles.modal} ${styles.basicsPanel}`} aria-labelledby="basics-title" onCancel={event => { event.preventDefault(); closeBasics() }}>
        <button className={styles.close} onClick={closeBasics} aria-label="Close guests and budget">×</button>
        <h2 id="basics-title" tabIndex={-1} ref={basicsHeading}>Guests & budget</h2>
        <div className={styles.formGrid}>
          <label>Guests<input inputMode="numeric" value={guests} onChange={event => setGuests(event.target.value)} aria-describedby="guests-hint" aria-invalid={guests !== '' && !validCount(guests)} placeholder="e.g. 20" />{guests !== '' && !validCount(guests) && <small id="guests-hint">Enter a whole number from 1 to 1,000.</small>}</label>
          <label>Total drinks budget (INR)<input inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} aria-describedby="budget-hint" aria-invalid={budget !== '' && budgetPaise === null} placeholder="e.g. 5000" />{budget !== '' && budgetPaise === null && <small id="budget-hint">₹0.01–₹10,00,000. Up to two decimal places.</small>}</label>
        </div>
        <div className={styles.facetChips} aria-label="Budget presets">{[2000, 5000, 10000].map(preset => <button key={preset} className={budgetPaise === preset * 100 ? styles.filterActive : styles.filter} aria-pressed={budgetPaise === preset * 100} onClick={() => setBudget(String(preset))}>₹{preset.toLocaleString('en-IN')}</button>)}</div>
        <p className={styles.hint}>Guest count is context, not an alcohol-consumption estimate. Non-alcoholic catalogue coverage is still being developed.</p>
        <div className={styles.actions}><button className={styles.primary} onClick={closeBasics}>Done</button></div>
      </dialog>
      <dialog ref={dialog} className={styles.modal} aria-label="Saved plans" onCancel={event => { if (busy) event.preventDefault(); else { setViewed(null); setCopyFallback(false) } }}>
        <button className={styles.close} disabled={busy} onClick={closeAccount} aria-label="Close saved plans">×</button><h2>Saved plans</h2>
        {accountMessage && <p role="status" className={styles.notice}>{accountMessage}</p>}
        <fieldset className={styles.panel} disabled={busy}>
          {!signedIn ? <>
            <p>Use a one-time SMS code to keep your plans. Your current list stays here.</p>
            <p className={styles.hint}>Your phone number is used for Supabase sign-in. Saved lists are private to your account; delete them here when no longer needed.</p>
            <label className={styles.searchLabel}>Mobile number with country code<input type="tel" autoComplete="tel" value={phone} placeholder="+91 98765 43210" onChange={event => { setPhone(event.target.value); setOtpSent(false); setCode('') }} /></label>
            {otpSent && <label className={styles.searchLabel}>SMS code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} maxLength={6} /></label>}
            <div className={styles.actions}>
              {!otpSent && <button className={styles.primary} disabled={cooldown > 0} onClick={() => void run(async () => { const result = await sendOtp(phone.replace(/\s/g, '')); if (result.ok) { setOtpSent(true); setCooldown(60); setAccountMessage('Code sent. Enter it below.'); } else setAccountMessage(result.error || 'Could not send code. Try again.') }, true)}>{cooldown > 0 ? `Send code in ${cooldown}s` : 'Send SMS code'}</button>}
              {otpSent && <>
                <button className={styles.primary} disabled={!/^\d{6}$/.test(code)} onClick={() => void run(async () => { const result = await verifyOtp(phone.replace(/\s/g, ''), code); if (!result.ok) { setAccountMessage(result.error || 'Code could not be verified.'); return } setSignedIn(true); setCode(''); setAccountMessage('Signed in. Close this panel and select Save plan to keep your current list.'); await loadSaved() }, true)}>Verify code</button>
                <button className={styles.secondary} disabled={cooldown > 0} onClick={() => void run(async () => { const result = await sendOtp(phone.replace(/\s/g, '')); if (result.ok) { setCooldown(60); setAccountMessage('A new code was sent.'); } else setAccountMessage(result.error || 'Could not resend code.') }, true)}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button>
              </>}
            </div>
          </> : <>
            <div className={styles.actions}><button className={styles.secondary} onClick={() => void run(loadSaved, true)}>Refresh saved plans</button><button className={styles.secondary} onClick={() => void run(async () => { await signOut(); setSignedIn(false); setSaved([]); setViewed(null); setOtpSent(false); setAccountMessage('Signed out on this browser.'); }, true)}>Sign out</button></div>
            {viewed ? <>
              <p className={styles.hint}>Saved {new Date(viewed.updated_at).toLocaleString()}. This is the saved price snapshot, not a fresh quote.</p><Receipt plan={viewed.snapshot} />
              <div className={styles.actions}>{exportButtons(viewed.snapshot)}<button className={styles.primary} onClick={event => requestConfirmation({ kind: 'edit', item: viewed }, event.currentTarget)}>Edit & reprice</button><button className={styles.secondary} onClick={() => { setViewed(null); setCopyFallback(false) }}>Back to saved plans</button></div>
              {copyFallback && <textarea readOnly aria-label="Saved list for copying" className={styles.shareText} value={planText(viewed.snapshot)} onFocus={event => event.target.select()} />}
            </> : saved.length ? saved.map(item => <div className={styles.savedRow} key={item.id}>
              <span><strong>{item.snapshot.guests} guests · {formatMoney(item.snapshot.totalPaise)}</strong><small>{new Date(item.updated_at).toLocaleString()}</small>{item.snapshot.remainingPaise < 0 && <small className={styles.overBudget}>Over budget by {formatMoney(-item.snapshot.remainingPaise)}</small>}</span>
              <div><button className={styles.secondary} onClick={() => { setViewed(item); setCopyFallback(false) }}>Open</button><button className={styles.secondary} onClick={event => requestConfirmation({ kind: 'delete', item }, event.currentTarget)}>Delete</button></div>
            </div>) : <p>No saved plans to show. Return to your list and select Save plan.</p>}
          </>}
        </fieldset>
        {busy && <p role="status">Working…</p>}
      </dialog>
      <dialog ref={confirmationDialog} className={`${styles.modal} ${styles.confirmation}`} aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={event => { event.preventDefault(); cancelConfirmation() }}>
        {confirmation && <>
          <p className={styles.eyebrow}>AllCheers / Your list</p>
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
        {browsing && <>
          <fieldset className={styles.facet}><legend>Brand</legend><div className={styles.facetChips}>{brandOptions.map(brand => <button key={brand} className={selectedBrands.includes(brand) ? styles.filterActive : styles.filter} aria-pressed={selectedBrands.includes(brand)} onClick={() => setBrands(current => { const selected = current[browsing] || []; return { ...current, [browsing]: selected.includes(brand) ? selected.filter(value => value !== brand) : [...selected, brand] } })}>{brand || 'Unlisted brand'} ({categoryProducts.filter(product => product.brand === brand).length})</button>)}</div></fieldset>
          <fieldset className={styles.facet}><legend>Pack size</legend><div className={styles.facetChips}>{sizeOptions.map(size => <button key={size} className={selectedSizes.includes(size) ? styles.filterActive : styles.filter} aria-pressed={selectedSizes.includes(size)} onClick={() => setSizes(current => { const selected = current[browsing] || []; return { ...current, [browsing]: selected.includes(size) ? selected.filter(value => value !== size) : [...selected, size] } })}>{size} ml ({categoryProducts.filter(product => product.sizeMl === size).length})</button>)}</div></fieldset>
          <fieldset className={styles.facet}><legend>Within budget</legend><div className={styles.facetChips}><button className={withinOn ? styles.filterActive : styles.filter} aria-pressed={withinOn} onClick={() => setWithin(current => ({ ...current, [browsing]: !withinOn }))}>Within budget ({fitting.length})</button></div></fieldset>
        </>}
        <div className={styles.actions}><button className={styles.secondary} onClick={resetFilters}>Clear all filters</button><button className={styles.primary} onClick={closeFilters}>Done</button></div>
      </dialog>
      {step === 1 && <button className={`${styles.cartPill} ${dragOver ? styles.validDrop : ''}`.trim()} aria-label={!inventory.length ? 'Your list · 0 items' : `Your list · ${inventory.length} ${inventory.length === 1 ? 'item' : 'items'} · ${formatMoney(subtotal)}`} onClick={event => { inventoryTrigger.current = event.currentTarget; setDrawerOpen(true); inventoryDialog.current?.showModal() }} onDragOver={dropZoneOver} onDragLeave={dropZoneLeave} onDrop={dropZoneDrop}>{!inventory.length ? 'Your list · 0 items' : `Your list · ${inventory.length} ${inventory.length === 1 ? 'item' : 'items'} · ${formatMoney(subtotal)}`}</button>}
      {toast && <div className={styles.toast} role="status"><span>{toast.message}</span><button className={styles.toastAction} onClick={() => toast.restore()}>Undo</button></div>}
    </main>
    <div className={styles.printOnly}>{exported && <Receipt plan={exported} />}</div>
  </>
}
