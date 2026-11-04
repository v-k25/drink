'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMoney, parseBudget, planText, PRICE_LABEL, type Plan, type Product } from './model'
import { CHIPS, CHIP_LABELS, DRINK_STYLES, DRINK_STYLE_LABELS, buildList, optionsFor, prePick, toPlannerInput, type Chip, type DrinkStyle } from './list'
import { confirmEligibility, getCatalogue, validatePlan } from './actions'
import { TASTES, type Taste } from '../find-my-drink/discovery'
import { brandOf, cleanName, normaliseCatalogue } from '../catalogue/normalise'
import { sizeLabel } from '../find-my-drink/bottles'
import AgeCheck from '../age-check'
import { ToolFooter, ToolHeader, toolFonts, toolRoot } from '../tool-shell'
import { LoadingScreen, Wordmark } from '../logo'
import styles from './planner.module.css'

// Party Planner (tools redesign, TR5): one page. Guests and budget, two optional taste questions, eight category chips,
// then the shopping list straight away (category, bottles, line total, total against the budget) and three real bottles
// to choose from per category. The list itself is list.ts; Share, Copy and Print are checked on the server (validatePlan).
// The draft stays on this device; there is no account save.

const shortMoney = (paise: number) => formatMoney(paise).replace(/\.00$/, '')
const perGuestMoney = (paise: number) => shortMoney(Math.round(paise / 100) * 100)
const validCount = (value: string) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000
const budgetValue = (value: string) => parseBudget(value.replace(/[,\s₹]/g, ''))
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const draftKey = 'socifer_planner_draft_v2'
// The pre-redesign draft: only its guests and budget carry over.
const oldDraftKey = 'allcheers_planner_draft'
const eligibilityError = 'Confirm eligibility to continue.'
const copiedMessage = 'List copied. Paste it into WhatsApp or notes.'
const DEFAULT_GUESTS = '20', DEFAULT_BUDGET = '10000'
// The server checks the list with the raw catalogue rows; the copied, shared and printed list shows the clean names.
const tidy = (plan: Plan): Plan => ({ ...plan, lines: plan.lines.map(line => { const name = cleanName(line.brand || line.name); return { ...line, name, brand: brandOf(name) } }) })

type Draft = {
  guests: string; budget: string; tastes: Taste[]; style: DrinkStyle | null
  // null: the chips follow the answers. picks are bottle ids, so a catalogue change can't point a pick at the wrong bottle.
  chips: Chip[] | null; picks: Partial<Record<Chip, string>>; quantities: Partial<Record<Chip, number>>
}
const emptyDraft: Draft = { guests: DEFAULT_GUESTS, budget: DEFAULT_BUDGET, tastes: [], style: null, chips: null, picks: {}, quantities: {} }

function readDraft(): Draft {
  const draft = { ...emptyDraft }
  try {
    const raw = localStorage.getItem(draftKey)
    const value: unknown = raw ? JSON.parse(raw) : null
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const d = value as Record<string, unknown>
      if (typeof d.guests === 'string' && (d.guests === '' || validCount(d.guests))) draft.guests = d.guests
      if (typeof d.budget === 'string' && (d.budget === '' || budgetValue(d.budget) !== null)) draft.budget = d.budget
      if (Array.isArray(d.tastes)) draft.tastes = d.tastes.filter((t): t is Taste => TASTES.includes(t as Taste)).slice(0, 2)
      if (DRINK_STYLES.includes(d.style as DrinkStyle)) draft.style = d.style as DrinkStyle
      if (Array.isArray(d.chips)) draft.chips = CHIPS.filter(chip => (d.chips as unknown[]).includes(chip))
      const record = (input: unknown, ok: (value: unknown) => boolean) => input && typeof input === 'object' && !Array.isArray(input)
        ? Object.fromEntries(Object.entries(input).filter(([key, item]) => CHIPS.includes(key as Chip) && ok(item))) : {}
      draft.picks = record(d.picks, item => typeof item === 'string' && item.length <= 200)
      draft.quantities = record(d.quantities, item => Number.isSafeInteger(item) && (item as number) >= 1 && (item as number) <= 1000)
      return draft
    }
    const old: unknown = JSON.parse(localStorage.getItem(oldDraftKey) ?? 'null')
    if (old && typeof old === 'object') {
      const o = old as Record<string, unknown>
      if (typeof o.guests === 'string' && validCount(o.guests)) draft.guests = o.guests
      if (typeof o.budget === 'string' && budgetValue(o.budget) !== null) draft.budget = o.budget
    }
  } catch { }
  return draft
}

function PlannerLoading() {
  return <div className="sf-nav-loading sf-nav-loading--now">
    <LoadingScreen />
    <p className={`${styles.hint} ${styles.srOnly}`} role="status">Loading planner…</p>
  </div>
}

function Receipt({ plan }: { plan: Plan }) {
  const groups = [...new Set(plan.lines.map(line => line.category))]
  return <div className={styles.receipt}>
    <p className={styles.printBrand}><Wordmark /></p>
    <h3 className={styles.printTitle}>Socifer party list</h3>
    <p className={styles.receiptMeta}>{plan.guests} guests · budget {shortMoney(plan.budgetPaise)}</p>
    {groups.map(category => <div className={styles.receiptGroup} key={category}><h4>{category}</h4>{plan.lines.filter(line => line.category === category).map(line => <div className={styles.receiptLine} key={line.id}>
      <span><strong>{line.quantity}× {line.name}</strong><small>{line.sizeMl} ml · {shortMoney(line.pricePaise)} each</small></span><b>{shortMoney(line.subtotalPaise)}</b>
    </div>)}</div>)}
    <div className={styles.receiptTotal}><span>Estimated total</span><b>{shortMoney(plan.totalPaise)}</b></div>
    <p className={styles.receiptStatus}>{plan.remainingPaise < 0 ? `Over budget by ${shortMoney(-plan.remainingPaise)}` : 'Within budget'} · {perGuestMoney(plan.totalPaise / plan.guests)} per guest</p>
    <p className={styles.disclaimer}>{PRICE_LABEL}. Estimate only; shops may differ. Alcohol only. For adults. Drink responsibly and never drink and drive.</p>
  </div>
}

export default function Planner() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [checkingGate, setCheckingGate] = useState(true)
  const [eligible, setEligible] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryFailures, setRetryFailures] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [message, setMessage] = useState('')
  const [copyText, setCopyText] = useState('')
  const [printPlan, setPrintPlan] = useState<Plan | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const unavailableHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => { setDraft(readDraft()); setHydrated(true) }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(draftKey, JSON.stringify(draft)) } catch { }
  }, [draft, hydrated])
  // Skip the age check when the eligibility cookie is already set (the server action checks it).
  useEffect(() => {
    let live = true
    loadCatalogue(() => live).finally(() => { if (live) setCheckingGate(false) })
    return () => { live = false }
  }, [])
  useEffect(() => { if (retryFailures) unavailableHeading.current?.focus() }, [retryFailures])
  // Print once the server-checked list has rendered into the print-only receipt.
  useEffect(() => {
    if (!printPlan) return
    const timer = window.setTimeout(() => window.print(), 0)
    return () => window.clearTimeout(timer)
  }, [printPlan])

  // Only the exact eligibility error shows the gate; any other failure means the catalogue read failed.
  async function loadCatalogue(live: () => boolean = () => true) {
    try {
      const result = await getCatalogue()
      if (!live()) return true
      if (result.ok) { setUnavailable(false); setProducts(result.products); return true }
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
    pending.current = true; setBusy(true); setMessage(''); setCopyText('')
    try { await action() }
    catch { setMessage('Connection interrupted. Your list is still here; please try again.') }
    finally { pending.current = false; setBusy(false) }
  }

  const bottles = useMemo(() => products ? normaliseCatalogue(products) : [], [products])
  const categoryOf = useMemo(() => { const map = new Map((products ?? []).map(product => [product.id, product.category])); return (id: string) => map.get(id) }, [products])
  const guestsValid = validCount(draft.guests)
  const budgetPaise = budgetValue(draft.budget)
  const guests = guestsValid ? Number(draft.guests) : 0
  const answered = draft.tastes.length > 0 || !!draft.style
  const chips = draft.chips ?? prePick(draft.tastes, draft.style)
  const pickIndex = Object.fromEntries(CHIPS.map(chip => [chip, optionsFor(bottles, chip).findIndex(bottle => bottle.id === draft.picks[chip])]).filter(([, index]) => (index as number) >= 0))
  const list = guestsValid && budgetPaise !== null && products ? buildList({ guests, budgetPaise, chips, picks: pickIndex, quantities: draft.quantities }, bottles) : null
  const over = list ? list.remainingPaise < 0 : false
  const status = list ? (over ? `${shortMoney(-list.remainingPaise)} over budget` : `${shortMoney(list.remainingPaise)} left`) : ''

  const patch = (next: Partial<Draft>) => { setDraft(current => ({ ...current, ...next })); setMessage(''); setCopyText('') }
  // New answers start the list again from the answers; new guests reset the bottle counts to the suggestion.
  const answer = (next: Partial<Draft>) => patch({ ...next, chips: null, picks: {}, quantities: {} })
  const setGuests = (value: string) => patch({ guests: value, quantities: {} })
  const stepGuests = (by: number) => setGuests(String(Math.min(1000, Math.max(1, (guestsValid ? guests : 0) + by))))
  const toggleChip = (chip: Chip) => patch({ chips: chips.includes(chip) ? chips.filter(item => item !== chip) : [...chips, chip] })
  const setQuantity = (chip: Chip, quantity: number) => patch({ quantities: { ...draft.quantities, [chip]: Math.min(1000, Math.max(1, quantity)) } })

  async function checkedPlan(): Promise<Plan | null> {
    if (!list || !list.lines.length || budgetPaise === null) return null
    const result = await validatePlan(toPlannerInput(list, guests, budgetPaise, categoryOf))
    if (!result.ok) { setMessage(result.error === eligibilityError ? 'Confirm your age again to continue.' : 'We couldn’t check this list. Please try again.'); return null }
    return tidy(result.plan)
  }
  async function copyPlan(plan: Plan) {
    try { await navigator.clipboard.writeText(planText(plan)); setMessage(copiedMessage) }
    catch { setCopyText(planText(plan)); setMessage('Select and copy the list below.') }
  }
  const share = () => run(async () => {
    const plan = await checkedPlan()
    if (!plan) return
    if (!navigator.share) return copyPlan(plan)
    try { await navigator.share({ title: 'My Socifer list', text: planText(plan) }) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copyPlan(plan) }
  })
  const copy = () => run(async () => { const plan = await checkedPlan(); if (plan) await copyPlan(plan) })
  const print = () => run(async () => { const plan = await checkedPlan(); if (plan) setPrintPlan({ ...plan }) })

  const pickNote = draft.chips ? 'Your picks.' : answered ? 'Picked from your answers. Change any.' : 'Our usual mix. Change any.'
  const shareButton = (className: string) => <button type="button" className={`${styles.primary} ${className}`} disabled={busy || !list?.lines.length} aria-busy={busy} onClick={() => void share()}>Share list</button>

  const ready = !checkingGate && !unavailable && products
  return <>
    <div className={`${styles.shell} ${toolRoot}`} data-theme="tools">
      <a href="#planner-content" className="skip-link">Skip to planner</a>
      <ToolHeader current="planner" />
      <main id="planner-content" className={styles.page}>
        {checkingGate && <PlannerLoading />}
        {!checkingGate && unavailable && <div className={styles.gateCard}>
          <h2 ref={unavailableHeading} tabIndex={-1}>Drinks are temporarily unavailable</h2>
          <p className={`${styles.hint} ${retrying ? styles.srOnly : ''}`.trim()} role="status">{retrying ? 'Trying again…' : retryFailures ? 'Still unavailable. Please try again in a moment.' : ''}</p>
          <div className={styles.actions}><button type="button" className={styles.primary} disabled={retrying} aria-busy={retrying} onClick={() => void retryCatalogue()}>{retrying && <span className="sf-spinner" aria-hidden="true" />}Try again{retrying && <span className={styles.srOnly}> (trying again…)</span>}</button></div>
        </div>}
        {!checkingGate && !unavailable && !products && <div className={styles.gate}>
          <AgeCheck lines={['Party', 'Planner']} headingRef={heading} checked={eligible} onCheckedChange={setEligible} continueLabel="Continue to planner" busy={busy} busyLabel="loading…" message={message || undefined} onContinue={() => void run(async () => {
            const confirmation = await confirmEligibility(eligible)
            if (!confirmation.ok) { setMessage(confirmation.error || 'Please confirm eligibility.'); return }
            if (!(await loadCatalogue())) setMessage('The drinks catalogue could not load. Try again; your choices are safe.')
          })} />
        </div>}

        {ready && <>
          <header className={styles.intro}>
            <h1>Party Planner</h1>
            <p className={styles.lede}>Guests and budget in, a shopping list out. No sign-in.</p>
          </header>
          <div className={styles.layout}>
            <section className={styles.party} aria-labelledby="party-title">
              <h2 id="party-title">Your party</h2>
              <div className={styles.basics}>
                <div className={styles.field}>
                  <label htmlFor="planner-guests">Guests</label>
                  <div className={styles.stepper}>
                    <button type="button" aria-label="Fewer guests" disabled={guestsValid && guests <= 1} onClick={() => stepGuests(-1)}>−</button>
                    <input id="planner-guests" inputMode="numeric" autoComplete="off" value={draft.guests} aria-invalid={!guestsValid || undefined} aria-describedby={!guestsValid ? 'guests-error' : undefined} onChange={event => setGuests(event.target.value.replace(/\D/g, '').slice(0, 4))} />
                    <button type="button" aria-label="More guests" disabled={guestsValid && guests >= 1000} onClick={() => stepGuests(1)}>+</button>
                  </div>
                  {!guestsValid && <p id="guests-error" className={styles.fieldError}>Enter 1 to 1,000 guests.</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="planner-budget">Drinks budget</label>
                  <div className={styles.money}>
                    <span aria-hidden="true">₹</span>
                    <input id="planner-budget" inputMode="numeric" autoComplete="off" value={draft.budget} aria-invalid={budgetPaise === null || undefined} aria-describedby={budgetPaise === null ? 'budget-error' : undefined} onChange={event => patch({ budget: event.target.value.replace(/[^\d,]/g, '').slice(0, 12) })} />
                  </div>
                  {budgetPaise === null && <p id="budget-error" className={styles.fieldError}>Enter a budget in rupees.</p>}
                </div>
              </div>
              <fieldset className={styles.group}>
                <legend>What do your guests like? Optional</legend>
                <div className={styles.chips}>
                  {TASTES.map(taste => {
                    const on = draft.tastes.includes(taste)
                    return <button type="button" key={taste} className={styles.chip} aria-pressed={on} onClick={() => answer({ tastes: on ? draft.tastes.filter(t => t !== taste) : [...draft.tastes, taste].slice(-2) })}>{capitalize(taste)}</button>
                  })}
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend>How do they drink? Optional</legend>
                <div className={styles.pair}>
                  {DRINK_STYLES.map(style => <button type="button" key={style} className={styles.chip} aria-pressed={draft.style === style} onClick={() => answer({ style: draft.style === style ? null : style })}>{DRINK_STYLE_LABELS[style]}</button>)}
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend>What to buy</legend>
                <p className={styles.pickNote}>{pickNote}</p>
                <div className={styles.chips}>
                  {CHIPS.map(chip => <button type="button" key={chip} className={styles.chip} aria-pressed={chips.includes(chip)} onClick={() => toggleChip(chip)}>{CHIP_LABELS[chip]}</button>)}
                </div>
              </fieldset>
            </section>

            <div className={styles.results}>
              <section className={styles.listPanel} aria-labelledby="list-title">
                <div className={styles.listHead}>
                  <h2 id="list-title">Shopping list</h2>
                  {list && <span className={styles.muted}>{guests} {guests === 1 ? 'guest' : 'guests'} · {list.bottles} {list.bottles === 1 ? 'bottle' : 'bottles'}</span>}
                </div>
                {!list && <p className={styles.empty}>Enter your guests and budget to see the list.</p>}
                {list && !list.lines.length && <p className={styles.empty}>Pick at least one thing to buy.</p>}
                {list && list.lines.length > 0 && <>
                  <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Shopping list table"><table className={styles.table}>
                    <caption className={styles.srOnly}>Shopping list by category</caption>
                    <thead><tr><th scope="col">Category</th><th scope="col">Bottles</th><th scope="col">Line total</th></tr></thead>
                    <tbody>{list.lines.map(line => <tr key={line.chip}>
                      <th scope="row"><b>{line.label}</b><span>{line.bottle.name}</span></th>
                      <td>{line.quantity}</td>
                      <td><span className={styles.srOnly}>{line.quantity} × {shortMoney(line.bottle.pricePaise)} = </span>{shortMoney(line.subtotalPaise)}</td>
                    </tr>)}</tbody>
                  </table></div>
                  <div className={styles.total}><span>Estimated total</span><b>{shortMoney(list.totalPaise)}</b></div>
                  <div className={`${styles.meter} ${over ? styles.meterOver : ''}`.trim()} aria-hidden="true"><span style={{ width: `${Math.min(100, budgetPaise ? list.totalPaise / budgetPaise * 100 : 0)}%` }} /></div>
                  <p className={styles.statusLine}>
                    <span className={over ? styles.overBudget : styles.goodBudget}>{status}</span>
                    <span className={styles.muted}>{perGuestMoney(list.perGuestPaise)} per guest · budget {shortMoney(budgetPaise ?? 0)}</span>
                  </p>
                  {list.cheaper && <p className={styles.hint}>{over ? 'Even the cheaper bottles are over your budget. Try fewer categories or a bigger budget.' : 'Switched to cheaper bottles to fit your budget.'}</p>}
                  {list.missing.length > 0 && <p className={styles.hint}>Not in our catalogue right now: {list.missing.map(chip => CHIP_LABELS[chip]).join(', ')}.</p>}
                  <div className={styles.exportRow}>
                    {shareButton(styles.shareWide)}
                    <button type="button" className={styles.secondary} disabled={busy} onClick={() => void copy()}>Copy</button>
                    <button type="button" className={styles.secondary} disabled={busy} onClick={() => void print()}>Print</button>
                  </div>
                </>}
                {message && <p className={`${styles.notice} ${message === copiedMessage ? styles.noticeOk : ''}`.trim()} role="status">{message}</p>}
                {copyText && <textarea className={styles.copyBox} aria-label="Your list" readOnly value={copyText} rows={8} onFocus={event => event.currentTarget.select()} />}
              </section>

              {list && list.lines.length > 0 && <section className={styles.choose} aria-labelledby="choose-title">
                <h2 id="choose-title">Choose your bottles</h2>
                {list.lines.map(line => <div className={styles.category} key={line.chip}>
                  <div className={styles.categoryHead}>
                    <div>
                      <h3>{line.label}</h3>
                      <span className={styles.muted}>Suggested {line.suggested} {line.suggested === 1 ? 'bottle' : 'bottles'} · {sizeLabel(line.bottle.sizeMl)} each</span>
                    </div>
                    <div className={styles.qty}>
                      <button type="button" aria-label={`One fewer ${line.label} bottle`} disabled={line.quantity <= 1} onClick={() => setQuantity(line.chip, line.quantity - 1)}>−</button>
                      <span aria-live="polite"><span className={styles.srOnly}>{line.label}: </span>{line.quantity}</span>
                      <button type="button" aria-label={`One more ${line.label} bottle`} disabled={line.quantity >= 1000} onClick={() => setQuantity(line.chip, line.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <div className={styles.options} role="group" aria-label={`Choose a ${line.label} bottle`}>
                    {line.options.map((bottle, index) => <button type="button" key={bottle.id} className={styles.option} aria-pressed={index === line.choice} onClick={() => patch({ picks: { ...draft.picks, [line.chip]: bottle.id } })}>
                      <span className={styles.optionArt} aria-hidden="true"><img src={`/images/drinks/${bottle.kind}.svg`} alt="" width={36} height={36} /></span>
                      <span className={styles.optionText}>
                        <span>{bottle.name}</span>
                        <small>{sizeLabel(bottle.sizeMl)}</small>
                        <b>{shortMoney(bottle.pricePaise)}</b>
                      </span>
                    </button>)}
                  </div>
                </div>)}
                <p className={styles.hint}>Estimate: about 3 drinks a guest. Alcohol only. {PRICE_LABEL}; shops may differ.</p>
              </section>}
            </div>
          </div>
        </>}
      </main>
      {ready && list && list.lines.length > 0 && <section className={styles.bar} aria-label="List total">
        <div><strong>{shortMoney(list.totalPaise)}</strong><span className={over ? styles.overBudget : styles.goodBudget}>{status}</span></div>
        {shareButton('')}
      </section>}
      <ToolFooter />
    </div>
    <div className={`${styles.printOnly} ${toolFonts}`} data-theme="tools">{printPlan && <Receipt plan={printPlan} />}</div>
  </>
}
