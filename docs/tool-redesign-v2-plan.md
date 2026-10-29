# Tool-page redesign v2 — Party Planner + Find My Drink

## Context
The owner rejected the "Tool Night" restyle, which put new colour tokens on the old layouts. This checkpoint rebuilds both tools from the ground up: layout, IA, components, hierarchy and interaction. These stay:
- the tokens in `app/tool-theme.module.css`;
- all behaviour;
- server actions, the data layer and `suggest.ts`;
- the landing page.

The current UI is treated as a feature inventory only. Problems visible in `output/playwright/tool-redesign/final-*.png`:
- boxes nested inside boxes;
- long helper paragraphs;
- a weak budget meter;
- an "All categories" disclosure on mobile;
- uneven buttons;
- a detail page with no hero;
- step mode that is just an inline card.

**Plan mode constraint.** The brief's Phase 1 deliverables (mockups and `design-contract.md` in `output/`) cannot be written while plan mode is on. So this plan has three approval gates:
1. **Gate 1 (this plan).** Research, IA, design contract, harness impact and risks.
2. **Gate 2.** After you approve this plan, I build static prototypes and screenshots in `output/tool-redesign-v2/`, show them, and **stop**.
3. **Gate 3.** Implementation starts only after you approve the mockups.

---

## 1. Research summary
Source status: **[F]** = live page fetched, **[S]** = search summary or store listing only, **[X]** = blocked or not verified.

Many sites returned 403 to the fetcher:
- Liquor.com, Serious Eats, Bon Appétit, Epicurious, NYT Cooking;
- Total Wine, DICE, RA, Apple HIG;
- cocktailpartyapp.com.

For those I used the store listings, help centres or write-ups named below.

### 1a. Recipe discovery and cocktail browsing
| Ref | Best at | Borrow | Don't copy |
|---|---|---|---|
| Difford's Guide [F] | Deep facets plus a useful recipe page | Cards that list ingredients inline with have/missing markers. "Pick a random recipe" and "Edit this search" on the results page. A "Keep screen awake" switch on the recipe page. A method split into Glass / Prepare / Method / Garnish | A long stack of dropdowns, premium-locked facets, numbered pages, a 10-control action bar |
| Liquor.com [X] | Browsing by type (according to mirrors) | Nothing verified | — |
| Cocktail Builder [F] | Low-friction "add what's in your bar" | Type-ahead plus popular-ingredient chips with have/don't-have toggles, and a live "you can mix" list | Google sign-in to save, recipes behind sign-in, opaque matching |
| Mixel [S] | Browsing tied to bar inventory | A "can make now" sort, and "which ingredient unlocks the most recipes" | The best-match view is paywalled |
| Kindred Cocktails [F] | Depth and sort options | Ingredient names that link through; sort by name or ingredient count | A form-style search with 5 text fields, no facets |
| NYT Cooking [S] | A clean cook workflow | A Cook Mode button placed at the Preparation section; grouped filter panel | The paywall; cook mode treated as an add-on |
| Serious Eats / Bon Appétit / Epicurious [X] | Editorial recipe pages (Epicurious: copy ingredients, according to secondary sources) | "Copy ingredients" as an idea only | Voice scrolling, paywalls, ad-heavy pages |
| Tasty [S] | Visual, tag-led discovery | Sections that end in "See all"; one step at a time | Tags that navigate instead of filtering; dependence on video |
| Yummly [S] | **Shut down on 20 Dec 2024** | Lesson: users disliked hard-to-find export, so keep export visible | — |

### 1b. Step mode and cook-along
| Ref | Borrow | Don't copy |
|---|---|---|
| NYT Cooking [S] | Cook mode entered from the method; ingredients checked off inside it | Hiding the entry point mid-page |
| Samsung Food [S] | Step-by-step as **the main button** on the recipe page; left/right arrows | Smart cooking behind a paywall; appliance features |
| Paprika [F] | Tap an ingredient to cross it off; tap a step to highlight it; screen kept awake while cooking | A dated, manager-like scope |
| Mela [S] | Large step type that is readable from a distance | A side-by-side ingredient pane on phones |
| Kitchen Stories [S] | "Activate cooking mode", with step text first | Requiring a photo per step (we have none) |
| SideChef [S] | Clear progress through the steps | Voice control as the only fast path |
| Tasty [S] | One step on screen at a time | Dependence on video |
| AllSpice docs [F] (extra) | A step card with a "Next:" preview; progress segments you can jump between; the full recipe one tap away | Timers (we have no timing data) |
| Crumb [S] | Pantry and voice-entry ideas only; a cook mode was not confirmed | AI-generated recipes |

### 1c. Pantry matching ("what can I make")
| Ref | Borrow | Don't copy |
|---|---|---|
| Supercook [S] | Pantry entered from a categorised ingredient list; results list "you have / you need" | Thousands of noisy matches (needs a curated taxonomy, which we have: 46 reviewed labels) |
| Cocktail Party [S] | Drinks grouped by how many ingredients are missing; missing items struck through | — |
| Barback [S] | A "What can I make tonight" framing and a "One ingredient away" view | Bar editing on the Pro tier only |
| Bar Assistant [F] | Explicit "can make" and "missing N" filters; optional garnish doesn't block a match | A self-hosted admin model |
| My Cocktail Bar [S] | Each ingredient shows how many drinks it unlocks; missing items named on cards | — |
| Mixel / Yummly / Samsung Food | Covered above (paywalled, shut down, paid respectively) | — |

### 1d. Shopping lists, quantity planners, budget builders
| Ref | Best at | Borrow | Don't copy |
|---|---|---|---|
| Instacart [S] | The bill is never a surprise | A persistent bar with item count and **the total inside the primary CTA** | Weak feedback when an item is added (Pratt critique) |
| Bring! [F, App Store] | Auto-grouped categories; tile *or* list view | Recognisable category art for scanning; a compact list for review | Sharing tied to accounts. **Print was removed in June 2025**, so keep ours prominent |
| AnyList [F, App Store] | A running total built from per-item prices | The total derived inline, not on a separate screen | A paywalled total |
| Splitwise [F, App Store] | One dominant balance figure | A single net figure, "₹35 left" / "₹1,240 over" | Colour alone carrying the meaning |
| Shopify cart drawer (Dawn) [S] | +/− lines and a sticky footer | A footer with the total and the action; − disabled at the minimum | A separate "estimated total" block apart from the button |
| IKEA app [S] | Lists grouped by a human unit | The plan grouped by category | Lists synced to accounts |
| Notion-style lists [X] | — | — | — |
| Total Wine Drink Planner [S, 403] | Guest presets 25/50/100/150 across beer, wine, spirits and RTD | Presets plus a mix control, which match our suggest inputs | Retail upsell; output UI not seen |
| Minibar / Evite calculators [S] | Hours, guests and drinker type in; a shopping list out | Confirms our input set (length, mix, non-drinkers) | No transparency about the formula |
| Drizly / Cocktail Party (calculator) [X] | — | — | — |

### 1e. Mobile catalogue browsing with price (India)
| Ref | Borrow | Don't copy |
|---|---|---|
| Blinkit [F, App Store; patterns S] | ADD becomes −/+ in place; a sticky cart bar; unavailable items greyed | The "View cart" snackbar that is inconsistent and hard to find (case studies) |
| Zepto [F, App Store; S] | Bottom sheets for details; fees shown up front | Fees hidden behind info icons; app price differing from the pay screen |
| Swiggy Instamart / BigBasket [S] | BigBasket's quick filter tags under search (Instamart had none) | No filter or sort at all (Instamart, at the time reviewed) |
| Zomato [S] | A high-contrast sticky "View cart" bar | — |
| Vivino [F, App Store] | Filters on what you can buy; price bands | Subscription upsells |
| Untappd [S] | Dark mode that follows the system | A 3-step add; ours stays one tap |
| Total Wine, Drizly, Minibar listings [X] | — | — |
| Contentsquare mobile filter UX [F] | Applied filters as removable chips above results; one sheet with a single "Done"; a sticky filter control | — |

### 1f. Dark premium craft (feeling, not copy)
| Ref | Borrow | Don't copy |
|---|---|---|
| Vercel Geist [F] | A role scale: background steps for default/hover/active, a border step, text steps. Each border drawn once. Radii 6/12/16 | Building the layout out of the secondary background |
| Linear [F] | Surface steps for elevation, restrained accent, less chrome, a heading display face | — |
| Stripe colour system [F] | Status colours at equal perceived lightness, so "over" isn't dimmer than "left" | — |
| Spotify [S, third-party] | Elevation by a lighter surface; one accent used sparingly; hierarchy from size and weight, not boxes; 200ms transitions | 11px uppercase labels |
| Raycast [S, third-party] | Near-black steps with hairline borders | A 0.15-alpha glow as the only focus cue |
| RA Guide [S, Pratt] / DICE [S, Pratt] | Outlined pill filters (date, price); **one bright single CTA** (DICE yellow "Get Tickets") | A chip label that shows a stale state (RA) |
| Fever, Arc, Apple Music, Sunset gradients [X] | Not verified. Only the general "night plus one warm accent" feeling is used | — |

### 1g. Accessibility and dark reading comfort
- **Material 3 [S]:** surface container roles (lowest → highest), independent of elevation. We name surfaces by role: night, surface, raised, sheet.
- **Apple HIG [S]:** base vs elevated backgrounds, with elevated used for sheets and popovers. That is what `--tool-sheet` is for.
- **GOV.UK [F]:**
  - One primary action per view. Mark "(optional)". No sliders.
  - An error summary that links to the fields.
  - Confirmation only for destructive actions ("Start a new plan").
  - GOV.UK discourages disabled buttons. Ours stay, because existing behaviour disables Add on items that don't fit, but each one always comes with the visible reason and the "Add anyway" path.
- **Inclusive Components [F]:**
  - Toggles are `<button aria-pressed>` with a fixed label.
  - Cards have a single heading link with a stretched click area. Steppers sit above it with `position:relative`.
  - Image after the heading in the DOM.
- **WCAG 2.2 [F]:**
  - 2.4.11 (AA): sticky bars must not fully hide focus, so use `scroll-padding` (C43).
  - 2.4.13 (AAA): a 2px perimeter with a 3:1 change. A solid 2px outline meets it.
  - 2.5.8 (AA): 24px minimum; we keep **44px**.

### Synthesis (what drives the design)
1. A sticky summary with **the total in the primary CTA**, plus `scroll-padding`.
2. In-place ADD → −/+ stepper.
3. A budget given as **one dominant net figure** with words, not colour alone.
4. Over budget is information, not a dead end ("Add anyway"; fixes stated).
5. Quick chips plus one filter sheet with a single "Done"; active filters as removable chips.
6. Starting points, not blank slates (presets, then a suggested list).
7. Elevation by surface step and hairlines; shadows only on floating layers.
8. One gold accent; status colours at equal perceived lightness.
9. A solid 2px focus ring that doesn't shift layout.
10. Recipes:
    - "can make now" and "one away" grouping with the missing item named;
    - step mode as the main CTA;
    - a full-screen large-type step view with a "Next:" preview and keep-awake;
    - no paywall, sign-in or pagination clutter.

---

## 2. Shared direction: one tool family
- **Feel.** The landing's craft (Nunito Sans 800 titles, generous rhythm, gold-on-night CTAs) applied to an app-like tool shell. Calm and dense where it helps, with no city accent.
  - Depth comes from **surface steps plus hairlines, not shadows** (Linear, Raycast).
  - Gold is used sparingly: the primary action, the selected state, focus and the meter fill. Never for decoration.
- **Shared tool header** (both pages, 56px, sticky, night with a hairline below):
  - the "SOCIFER" wordmark linking to `/`;
  - a tool switcher with two links, "Party Planner" and "Find My Drink" (current one: `aria-current="page"`, gold 2px underline);
  - on the planner only, a muted "Jaipur prices" note at ≥768px.

  Implemented twice, once per CSS module, so no new shared runtime code; the class names are kept similar.
- **Gate, the same on both tools:** a centred 440px card on night with a soft radial warm glow behind it (static and decorative). Existing copy and labels are kept. The planner's stock photo is removed so both gates match.
- **Type.**
  - Sizes: display `clamp(1.75rem, 1.2rem + 2.4vw, 2.5rem)` 800 sentence case; h2 1.375–1.5rem 800; h3 1.125rem 700; body 1rem/1.55; small 0.875rem; eyebrow 0.75rem 800 uppercase .12em gold.
  - Tool titles use sentence case. Uppercase stays for eyebrows and the wordmark, so headings read better at 200%.
  - The H1 limit (≤40px on mobile) is still met.
- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
  - Page gutter: 16 at 390, 24 at 768, 32 at ≥1024.
  - Container max: 1200 (planner) and 1120 (recipes); reading measure 65ch.
- **Grids.**
  - 390: 4 columns, 16px gutter.
  - 768: 8 columns, 20px gutter.
  - ≥1024: 12 columns, 24px gutter.
- **Radii:** 8 (controls), 12 (cards, rows), 16 (sheets, hero), 999 (chips, steppers).
- **Breakpoints:** 600 (2-column cards), 800 (Find My Drink filter split; kept for the harness), 1024 (planner two-pane, recipe two-column), 1280 (wider rails).

---

## 3. Party Planner: new IA

**Jobs, ranked:**
1. Get a realistic ₹ list for N guests fast (starting list).
2. Adjust items and quantities while staying within budget.
3. Take the list to the shop (print, copy, share).
4. Hunt for specific bottles.

**Structure:**
1. **Gate** (skipped when the cookie is set) → "Loading planner…" skeleton.
2. **Setup: inline, not an auto-opened dialog** (GOV.UK one-thing; Total Wine presets).
   - The empty state *is* the setup card. Title "Plan your party".
   - Fields: Guests (number with −/+), "Total drinks budget (INR)" with presets ₹2,000 / ₹5,000 / ₹10,000 as chips, Party length (2/4/6 h) as a segmented control, Drinking mix as a segmented control, and "Non-drinking guests (optional)".
   - Primary button "Suggest a starting list". Secondary text button "I'll pick drinks myself".
   - The existing labels and errors are reused.
   - Later edits use **Edit** on the budget strip, which opens the same fields in the "Guests & budget" sheet (the dialog name is kept).
3. **Build.**
   - **Budget strip**, sticky under the header (Splitwise/Instacart-style single figure):
     - large "₹29,965" and "of ₹30,000";
     - a 6px meter (gold fill, danger fill when over, with a text label so the state is never shown by colour alone);
     - "₹35 left" or "₹1,240 over" (the existing strings);
     - "25 guests · ₹1,199 per guest";
     - an Edit button (`aria-label="Edit guests and budget"`).
     - The `aria-label="Budget meter"` container is kept.
   - **Estimate chip** "Estimate. Edit anything." with "How are quantities chosen?" in a compact disclosure that is closed by default. The servings line moves inside it.
   - **≥1024: two panes.**
     - Left (8 columns), "Add drinks": a vertical category rail (200px; rows with the name, a "N drinks" count and an "In list" dot) beside the product rows.
     - Right (4 columns), sticky "Your plan" panel: the list grouped by category, each line with −/qty/+ and a line total, a summary, and the primary button "Review list · ₹29,965".
     - Drag and drop goes from rows to the panel.
   - **<1024: one column.**
     - A horizontally scrollable **category chip row** (`nav "Categories"`, the same button names "Beers 107 drinks") replaces the "All categories" disclosure. The ends fade and a scroll-snap is used.
     - Then search and **Filters (n)**, which opens a bottom sheet. Quick chips "Within budget" and the active filters sit under search (BigBasket).
     - The sticky **bottom bar** (Blinkit/Zepto "View cart"): "8 items · ₹29,965", a thin meter, the status, and "View plan" opening the full-height **"Your plan" sheet** (names kept).
     - After "Suggest", the plan sheet opens automatically on mobile, so the new list is the first thing seen.
   - **Product row** (not a boxed card):
     - 56px category art, name, "330 ml · ₹210" (with a price per 750 ml in muted text only if the data supports it; otherwise omitted);
     - on the right, an **ADD** button that turns into a −/qty/+ pill stepper in place (Blinkit);
     - rows that don't fit show "₹175 over remaining budget" in danger text and a secondary "Add anyway (over budget)";
     - the hint "Drag to plan or add below" is shown only on hover-capable pointers ≥1024.
   - **Toasts:** bottom-centre (above the bottom bar on mobile), with "Undo"; existing copy; 8s.
4. **Review** → a **paper receipt.**
   - A light "paper" slip (new `--tool-paper` tokens) on the night page with a perforated top edge (CSS mask) and a monospace-like tabular figure style (Nunito `font-variant-numeric: tabular-nums`).
   - The same component renders the print version, so screen and PDF match.
   - Actions to the right (≥1024) or in a sticky bottom row (<1024): primary **Share list**, then Copy list, Print / Save as PDF, Edit list, and the text button "Start a new plan".
   - "Your list is kept on this device." appears once.
5. **New "catalogue unavailable" state (UI only).** If the mount `getCatalogue()` fails *and* the cookie is set: "We couldn't load the drinks catalogue. Your list is safe on this device." with a **Try again** button that calls the existing `getCatalogue()` again. The gate shows only when eligibility is actually missing. Approved by the owner.

**Removed:**
- the "All categories" disclosure;
- the auto-opened setup dialog;
- the stock photo on the gate;
- duplicate helper paragraphs;
- the dead "I have reviewed my quantity" path stays in the logic but gets no new styling;
- the boxed shelf container.

## 4. Find My Drink: new IA

**Jobs, ranked:**
1. Find something good to make tonight.
2. "What can I make with what I have?"
3. Make it (ingredients, steps).
4. Search a drink I know.

**Listing:**
- **Intro.** Eyebrow "Find a recipe", H1 "What sounds good?", then a full-width search field with an inline submit ("Search"; label kept).
- **Type control.** A segmented control `nav "Drink type"`: All (50) · Cocktails · Mocktails. These stay links and keep `typeActive`.
- **Quick chips under search** (<800): Filters (n) plus the active-filter chips. **At ≥800:** a left `aside "Recipe refinement"` with "Base spirit", "Method" and "Ingredients" chip groups, sticky. At 800–1023 it is a compact 220px column.
- **"Use what I have" mode card** (Cocktail Builder, Barback).
  - A full-width banner card: "Have a few bottles? See what you can make." The button "Use what I have" keeps `aria-expanded`.
  - It opens a panel: selected chips at top, then type-ahead "Search the ingredient checklist", then a categorised checklist (spirits, juices, garnish and ice).
  - Results come in two groups: "Ready to make" (renamed from "Ingredient matches") and "One ingredient away", each card with a "+ Pineapple Juice" missing tag (Cocktail Party, My Cocktail Bar).
- **"A few good choices".** 3 large photo cards, a horizontal snap row on mobile and 3 columns on desktop. Next to the heading, a shuffle-icon button "Pick for me". The reason line is the card's eyebrow.
- **"Browse all matches".** A 2-column photo-tile grid at 390, 3 at 768 and 4 at ≥1024.
  - Tile: 4:3 photo or SVG art, name, "Cocktail · Vodka", and "3 ingredients · Shake".
  - Single heading link with a stretched click area (Inclusive Components); `article#recipe-{id}` and the focus-within ring are kept.
- **Pagination:** "Next recipes (n more)" as a full-width secondary button.
- **Empty and error states:** centred, an icon, one line, one action.

**Recipe detail:**
- **Hero.** At 390 the photo is full-bleed (16:10) visually first. At ≥1024 it's split: photo on the left (5 columns), title block on the right (7 columns).
  - The DOM keeps the making section before the hero image; CSS grid `order` moves it visually. This satisfies the existing check, and the image isn't focusable.
- **Title block:** "← Back to recipes", eyebrow, H1, "Cocktail · Vodka", description, then **spec chips** with small labels (Glass · Method · Ice · Garnish · Yield · Prep) instead of the run-on meta line. The asserted strings "Yield: 1 cocktail" and "Glass: Highball glass" stay visible.
- **Primary CTA "Start making"** opens step mode directly (Samsung Food: step-by-step as the main button). "Ingredients ↓" stays as a secondary jump link.
- **Make it:**
  - ≥1024: two columns. Ingredients are sticky on the left: tappable 48px rows with a large check, the metric amount in bold, then the name; "x of n ingredients gathered" with a mini progress bar. Method on the right as large numbered steps.
  - Mobile: stacked.
  - The metric note becomes one muted line under the list.
- **Step mode becomes a full-screen cook view** (a modal `<dialog>`, focus trapped; AllSpice, Mela, Paprika):
  - Top bar: recipe name, progress segments (Step 2 of 3, tappable), "Keep screen awake" (aria-pressed), and "View all steps", which closes it.
  - Centre: step text at `clamp(1.5rem, 1rem + 2.5vw, 2.25rem)`, max 28ch, plus a muted "Next: …" preview.
  - A collapsible "Ingredients" strip shows the list as **plain text, not checkboxes**, so the page keeps exactly N checkboxes.
  - Bottom: 56px "Previous" (secondary) and "Next" (primary); on the last step, "Done" returns to the recipe. ← / → keys work too.
  - The `stepStage` crossfade is turned off under reduced motion.
  - The wake lock logic is unchanged.
- **"Source & recipe context"** disclosure, then "More like this": a 4-up tile row that scrolls horizontally on mobile.
- **Print:** title, specs, ingredients and method only. Header, controls, related tiles, step view and images are hidden, which fixes the cramped "More like this".

---

## 5. Design contract (to be expanded into `output/tool-redesign-v2/design-contract.md` at Gate 2)

**Token additions** (`app/tool-theme.module.css`, city-neutral; contrast measured with a WCAG luminance script):

| New token | Value | Role | Measured |
|---|---|---|---|
| `--tool-sheet` | `#1d1c21` | Sheets, dialogs, sticky bars (level 3) | text 14.66, muted 7.97, gold 9.25, control border 4.66, danger 7.39, success 9.74 |
| `--tool-danger-soft` | `#33191a` | Over-budget strip background | text 14.04, danger 7.08 |
| `--tool-paper` | `#fbf8f2` | Receipt slip on screen | — |
| `--tool-paper-ink` | `#1c1b18` | Text on paper | 16.25 |
| `--tool-paper-muted` | `#5c5850` | Secondary text on paper | 6.68 |
| `--tool-paper-accent` | `#8a5a00` | Accent on paper | 5.59 |
| `--tool-paper-danger` | `#a30038` | "Over budget by" on paper | 7.58 |
| `--tool-paper-line` | `#8f897e` | Rules and perforation (UI) | 3.28 |

- **Existing tokens on existing backgrounds** (unchanged): text 16.78/15.45/13.79; muted 9.12/8.40/7.50; gold 10.58/9.74/8.70; controls 5.34/4.91/4.39; meter fill gold on the raised track 8.70; danger fill 6.95.
- **Selected ground** `#2a2417`: text 13.34, gold 8.41.
- **Print:** the paper tokens equal the print values, so the receipt looks the same on screen and on paper.
- **Contrast audit at Gate 3:** every rendered text/background pair is re-checked.

**Component inventory:**
- tool header and tool switcher
- gate card
- budget strip and meter
- setup form: number stepper, budget chips, segmented controls
- category rail (desktop) and chip scroller (mobile)
- search field
- quick chips and active chips
- filter sheet: bottom sheet below 800/1024, centred dialog above
- product row with ADD → pill stepper
- plan line (grouped)
- plan panel and plan sheet
- bottom bar
- toast with Undo
- confirmation dialog
- paper receipt
- export action group
- recipe tile (2 sizes)
- pick-for-me button
- pantry banner, pantry panel and match card
- recipe hero, spec chip
- ingredient checklist row
- method steps
- step-mode cook view
- empty, error and loading (skeleton) states

**States (applied to every interactive part):**
- **rest**
- **hover:** surface one step lighter (pointer:fine only)
- **focus-visible:** 2px gold outline with a 2px offset; on gold fills, a 2px night inner ring plus a gold outer ring
- **pressed:** gold-pressed, or one step darker
- **disabled:** muted text on raised, `cursor:not-allowed`, still ≥3:1 for borders where needed to see it
- **error:** danger text plus an icon plus `aria-invalid`
- **over-budget:** danger meter fill plus "over" text plus a danger-soft strip
- **success:** success text ("₹35 left")
- **loading:** skeleton blocks and a `role=status` line
- **empty:** icon, one line, one action
- **offline / catalogue unavailable:** a card with Try again; draft kept

**Motion:**
- 120ms for press/hover colour; 200ms ease-out for sheet and dialog slide/fade; 160ms crossfade for step changes; toast slide 200ms; ADD → stepper width 150ms.
- No looping animation and no glow animation.
- `prefers-reduced-motion: reduce` sets everything to 0s and turns off smooth scroll (`li[data-product-id]` transition stays 0s per the harness).

**Microcopy:**
- One helper line maximum per control.
- Every asserted string is kept verbatim (inventory below).
- Trimmed:
  - the planner footnote, which moves into the receipt and a "Prices" info line;
  - the pantry hints, cut to one sentence each (the asserted "Check every quantity…" and "Add {label}: {qty}" stay);
  - the Find My Drink disclaimer, which moves to a footer line.
- Indian number formatting is unchanged (`formatMoney`).

**Accessibility checklist:**
- 44px minimum targets (56px for step-mode navigation).
- `scroll-padding-top` and `scroll-padding-bottom` equal to the sticky strip and bar heights (2.4.11).
- Every sheet is a native `<dialog>` with the existing focus return.
- Meter state is given in text.
- At 200% text, chips and steppers wrap, and the bottom bar grows (no fixed heights).
- Landmarks: header, `main`, `nav` × 2, `aside`.

**Print:**
- Planner: the paper receipt only (`.printOnly`).
- Find My Drink: recipe text only.
- Both use the light print tokens; the header and controls are hidden.

---

## 6. Mockups (Gate 2 deliverable, after this plan is approved)
- **Static HTML/CSS prototypes** in `output/tool-redesign-v2/prototype/`, outside the app.
  - They use the real tokens and real data: planner rows from `output/jaipur-replacement-1311/planner-products-payload.json`, recipes and images read from the running production build.
- **"Before" shots** come from `pnpm build` plus `next start`, captured with a throwaway Playwright script.
- **Screens, each at 390 and 1280:**
  - Planner: empty/setup, building with a suggested list, over budget, receipt, and print preview.
  - Find My Drink: discovery list, filtered, pantry open with matches, recipe detail, step mode.
  - Both gates, plus catalogue-unavailable and no-matches.
- **Output:** `output/tool-redesign-v2/{before,after}-*.png` plus `design-contract.md`, shown to you. **Then stop.**

## 7. Harness impact (approve up front)
**Principle:** the CSS-module local class names that harnesses target are kept as stable hooks on their new elements:
- `primary`, `toast`, `additionStatus`, `menuItemOver`, `validDrop`, `receipt`, `menuList`, `mobileBar`, `planPanel`, `activeFilters`, `shell`;
- `typeActive`, `filterPanel`, `hint`, `filterFallback`, `stepStage`, `heroImage`, `pantry*`, `pantryChecklist`.

Ids, roles, accessible names and asserted copy are also kept.

**Expected changes (structure genuinely changes):**
1. **Setup inline instead of an auto-opened "Guests & budget" dialog:**
   - `planner-inventory-check` 65–73 and 279–331;
   - `planner-redesign-check` 29–33;
   - `design-polish-check` 83;
   - `brewlist-tools-style-check` 56–60.

   They will fill the inline fields (same labels: "Guests", "Total drinks budget (INR)"). The dialog path stays covered through "Edit guests and budget".
2. **"All categories" disclosure removed:** `brewlist-tools-style-check` 61 (`details[class*=allCategories] summary`, focus-on-summary) is rewritten to click the chip in `nav "Categories"` and expect focus on the shelf region. `planner-inventory-check` 36–41 already prefers the visible rail and needs no change.
3. **Plan sheet opens automatically after "Suggest" on mobile:** no existing assertion covers it. A new assertion will be added.
4. **Step mode becomes a modal dialog:** `recipe-detail`, `recipe-discovery` 91–102 and `brewlist` 82 should pass unchanged (same names; one "View all steps"; the checkbox count is unchanged). If Playwright treats the inert page differently, the step-mode lookups get scoped to the dialog. Any such change will be reported.
5. **Possibly** `planner-inventory-check` 233, 238, 264 and `brewlist` 72–74 (in-view checks with the new sticky strip and bar). I adjust these only if the new layout legitimately moves the element, and I report each one.
6. **Possibly** `brewlist-tools-style-check` 63: an unscoped "Increase … packs" click may already fail at 1440. A **baseline run before any change** will settle it. If it fails today, it gets scoped to the shelf and reported as pre-existing.

**New assertions to add:**
- the planner catalogue-unavailable "Try again" state;
- step view Escape → "View all steps" with focus returned to "Start making";
- paper receipt contrast;
- the tool switcher has `aria-current`.

**No change expected:**
- party-planner-check, -backend, -catalogue-server, -live-catalogue, -suggest;
- recipe-browse, -metric, -pantry, -pantry-browser (hooks kept);
- brewlist-home, home-design, early-access.

## 8. Implementation (Gate 3)
- **Files:**
  - `app/party-planner/planner.tsx` (state and logic stay; markup rewritten), new presentational components in `app/party-planner/components/` (setup, budget-strip, shop, plan-list, receipt, sheets), and `planner.module.css` rewritten.
  - The inline logic moves **verbatim** into `app/party-planner/use-planner.ts` only if it makes the split cleaner; there is no logic rewrite.
  - Find My Drink: rewrite markup in `app/find-my-drink/components/*.tsx`, `gate.tsx` and `finder.module.css`. `making.tsx` gets the cook-view dialog.
  - `app/tool-theme.module.css`: the 8 token additions above, plus their print values.
- **Untouched:**
  - `actions.ts`, `session.ts`, `catalogue-server.ts`, `model.ts`, `suggest.ts`, `queries.ts`, `recipe.ts`, `pantry.ts`, `metric.ts`;
  - `app/early-access/`;
  - landing files, `.env*`, `.opencode/`, `.fallow/`, package and lockfiles;
  - images other than the drink SVGs;
  - no B10–B12 work.
- **Workflow (AGENTS.md):** I am director and reviewer.
  - **One** general-purpose executor gets a self-contained contract: objective, allowed files, do-not-change list, acceptance criteria, checks and return format.
  - It does the Planner first, then Find My Drink, in the same session.
  - Only that executor runs builds, one at a time.
  - I review the diffs and the evidence; findings go back to the same executor; at most 2 repair cycles; no recursive delegation.

## 9. Verification (Gate 3; all executed, none claimed)
1. **Baseline first:** build plus every harness on the current tree, to record pre-existing failures.
2. `node node_modules/typescript/bin/tsc --noEmit` and `pnpm_config_verify_deps_before_run=warn corepack pnpm build`.
3. **Harnesses** (with `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` from the progress log):
   - all `party-planner-*`, `planner-*`, `recipe-*` and `brewlist-*`;
   - `party-planner-suggest-check`, `design-polish-check`, `home-design-check` (server on :3125), `early-access-check`.
4. **Throwaway Playwright audit outside the repo** at 390 and 1280 plus 200% text:
   - computed contrast for every text and control pair;
   - target size ≥44;
   - no overflow;
   - a keyboard-only walkthrough of each flow (screenshots of focus);
   - reduced motion (computed transition and animation set to none);
   - print emulation screenshots;
   - an accessibility-tree snapshot (`page.accessibility` / aria snapshot) as the screen-reader sanity check. A real NVDA pass is not possible here.
5. **Smoke on `next start`:** `/`, `/party-planner`, `/find-my-drink`, a recipe page. Then `git diff --check`, and `git diff --stat` on the landing files, which must be empty.
6. **Log:** append "Tool-page redesign v2" to `docs/implementation-progress.md` (references, decisions, tokens, contrast, changes, harness changes, checks, open items). Refresh Graphify.

## 9b. Execution order and tracker (owner: "implement, then decide what to change")
**Change from section 6:** the owner chose to implement straight away and review the real build afterwards. So:
- the static-prototype gate is dropped;
- "before" screenshots come from the baseline build in step S0;
- "after" screenshots are produced at S6 and S11.

The tracker lives in `docs/tool-redesign-v2-tracker.md`. Rules:
- Exactly one step is "in progress" at a time.
- Each step records its status, the files changed, the checks run with results, and notes or deviations.
- The next step starts only once the current one is "done" with evidence.

| Step | Scope | Exit check |
|---|---|---|
| S0 | Copy this plan to `docs/tool-redesign-v2-plan.md`; create the tracker. Baseline: `tsc` and build, then every harness on the untouched tree, recording pre-existing failures (e.g. brewlist:63). "Before" screenshots at 390/1280 into `output/tool-redesign-v2/before/` | Baseline table in the tracker |
| S1 | Token additions in `app/tool-theme.module.css` (8 tokens plus print values) | `tsc`, build |
| S2 | Planner frame: shared tool header, gate card, loading skeleton, **catalogue-unavailable plus Try again** | Focused planner harnesses |
| S3 | Planner setup: inline setup card plus the "Guests & budget" sheet for edits | Same |
| S4 | Planner build: budget strip, rail and chip scroller, search and filter sheet, product rows (ADD → stepper), plan panel, plan sheet (auto-open after Suggest on mobile), bottom bar, toasts, DnD | Same |
| S5 | Planner review: paper receipt (screen = print), export actions, print CSS | Same |
| S6 | Planner harness updates (section 7 list only; each logged), all planner, design-polish and brewlist checks. "After" screenshots. **Pause for owner review** | All pass; screenshots shown |
| S7 | Find My Drink frame: header and tool switcher, gate, unavailable/empty states | Focused recipe harnesses |
| S8 | Find My Drink listing: search, type segmented control, quick chips, aside and filter sheet, pantry banner and panel, choices row, tile grid, pagination | Same |
| S9 | Find My Drink detail: hero, spec chips, checklist, method, **full-screen step view (dialog)**, related, print | Same |
| S10 | Find My Drink harness updates (logged), all recipe and brewlist checks. "After" screenshots | All pass |
| S11 | Full verification (section 9): `tsc`, build, every harness, the contrast/target/200%/keyboard/reduced-motion/print/a11y-tree audit, smoke, `git diff --check`, landing unchanged. **Pause for owner review** | Evidence in the tracker |
| S12 | Append "Tool-page redesign v2" to `docs/implementation-progress.md`; Graphify refresh | Done |

## 10. Decisions taken (owner, 2026-10-13, during planning)
- **Receipt:** a light paper slip on screen, matching print.
- **Planner catalogue-unavailable screen:** add it. UI only; Try again re-calls `getCatalogue()`.
- **After "Suggest" on mobile:** open the "Your plan" sheet with focus on its heading.

## 11. Risks and open questions
- **Recipe count.** The progress log says 50 live, but the local snapshot `output/recipe-pantry/live-eligible.json` has 28. The UI is count-agnostic. I'll confirm read-only during the mockups.
- **Pantry coverage.** Only 17 recipes are pantry-reviewed. The panel will say "Matches cover reviewed recipes".
- **Total in the CTA.** "Review list · ₹29,965" keeps "Review list" at the start of the accessible name. The harnesses match by substring, so that's fine.
- **Paper glare at night.** Mitigated by off-white `#fbf8f2`, a max width of 560px and night margins.
- **Step view as a modal.** It traps focus, which is correct for a cook view, but it is a new interaction pattern on this page.
- **Copy and harness coupling.** Many exact strings are asserted. A large copy rewrite would mean harness edits, so this plan keeps the asserted copy.
- **Possible pre-existing failure** in brewlist line 63 (settled by the baseline run).
