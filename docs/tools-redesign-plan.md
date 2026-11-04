# Tools redesign: Find a Drink and Party Planner

Status: **approved by the owner, 2026-11-03 (TR0), including the open question (bottle cards are plain cards) and lit-pink chosen states.** TR1–TR6 done, 2026-11-03 (not committed). Details per checkpoint are in `docs/implementation-progress.md`.

## Sources

- **Design canvas:** https://claude.ai/artifact/StAsgBCuAU9hw1xq9N8xtN. The "Mockups" page has interactive boards for both tools at 1440, 834 and 390px. The "Flowcharts" page has the two new flows.
- The mockups use real catalogue names and prices. Their scoring is a simplified stand-in; the real logic stays in `spirit.ts` and `suggest.ts`, extended.
- LivCheers's party planner was the reference for list generation only. None of its branding, wording or visuals is reused.

## What stays the same

- The Black Tie design (`docs/black-tie-redesign-plan.md`), including BT8 lit states. **Chosen chips and answers are lit pink (dark pink fill, pink edge), not the bone fill the mockups show.** The mockups predate BT8. The solid pink fill is the one main action per screen: Share list in the Planner. Find a Drink's results have no solid pink action, because answers update the results live.
- Data: `planner_products` through `readCatalogue()` (unchanged), and the `drinks` recipe table through `queries.ts` (unchanged). No new tables, migrations or writes.
- The age check, the eligibility cookie, the early-access action, env files, package and lock files.
- Find My Drink: Browse all, recipe pages, cook mode, Use what I have, Surprise me and the no-JavaScript browse.
- Planner: `model.ts` (`calculatePlan`, `planText`), the server actions, the device draft, and copy, share and print. No account save.

## Find a Drink: target

One page. The questions sit on the left (stacked on tablet and phone). The results update as you answer.

1. **Drinking alcohol?** Yes / No, mocktails.
2. **Which flavours?** Up to two of citrusy, fruity, sweet, bitter, herbal, creamy.
3. **How do you like it?** Light (with a mixer), Smooth (in a cocktail), Rich (neat or on ice). This merges the old Feel and Serve questions. Occasion is dropped.
4. **Budget for one bottle (750 ml):** Under ₹1,000, ₹1,000–2,000, ₹2,000–4,000, ₹4,000+ or No limit.

Answering No hides questions 3 and 4 and shows mocktail ideas only.

**Results:**
1. **Your spirit:** the name, a one-line reason, and "Try X instead" (the runner-up).
2. **Cocktail ideas:** a short row of three from `drinks`, linking to the recipe pages, with "See all recipes".
3. **Bottles:** every stocked bottle of that spirit in the budget band, shown as brand, name, size and price. A sort control (Recommended / Price: low to high / high to low), a "Brand and size" filter, then a quieter "Just over your budget" row (up to three).

**Logic:**
- `rankSpirits` keeps its weights. The new `how` answer scores with the existing feel and serve weights (light = light + mixer, smooth = smooth + cocktail, rich = rich + neat).
- The budget filters the ranking: a spirit is only picked if it has at least two stocked bottles in the band. If none qualifies, the top spirit is shown with an empty-state note ("No bottles in this range. Try the next budget up.").
- Bands compare a 750 ml-equivalent price, so a 700 ml bottle at ₹1,900 counts as ₹2,036. The card shows the real size and price.
- "Recommended" order: closest to the middle of the band first, then price. Beer is shown by its bottle price; the 750 ml note is hidden for beer.
- URL: `feel` carries the how answer and a new `budget` parameter carries the band (`u1`, `b2`, `b4`, `o4`, `any`). Old `serve` and `occasion` parameters are read but ignored, so old links still open.

**Open question for the owner:** bottle cards have nowhere to go (there is no bottle page), so I'll make them plain cards, not links. The flowchart's "Open a bottle" waits for a bottle page later.

## Catalogue normalisation (shared)

A new pure module, `app/catalogue/normalise.ts`, used by both tools, with a check script.
- **Name:** strip pack suffixes ("(quarts)", "(750 ML (6 Bottles))", "(Pints)", "(200 ML*24)"), leading dots and double spaces; title-case all-caps names, keeping short words and acronyms (XO, VSOP, XXX) right.
- **Brand:** a short brand from a small reviewed list of known brands (Old Monk, Bacardi, Absolut, Blenders Pride and so on); otherwise the first word of the cleaned name.
- **Kind:** from the category (Whisky, Rum, Vodka, Gin, Tequila / Agave Spirit, Brandy, Wine, Beer, Liqueur / Aperitif, RTD / Premix). "Other / Unclassified" (227 rows) stays out. Only a name with words of exactly one kind is moved: in the current data that is 20 wines named by grape (Riesling, Malbec, Chenin Blanc and so on). The first estimate of 8 gins and 3 rums came from substring hits like "ORIGINAL" and was wrong.
- **Sizes:** full bottles only for Find a Drink (700–1000 ml for spirits and wine, 330–650 ml for beer, 275 ml for ready to drink). Miniatures and pints are left out.
- **Duplicates:** the same cleaned name and size keeps the cheapest row.

## Party Planner: target

One page, no stages.

1. **Your party:** guests (− / +) and drinks budget (₹).
2. **What do your guests like? Optional:** up to two flavours.
3. **How do they drink? Optional:** With a mixer / Neat or on ice.
4. **What to buy:** eight category chips: Beer, Wine, Rum, Vodka, Whisky, Gin, Tequila, Ready to drink. Two or three are pre-picked from the answers by the spirit logic. With no answers it's Beer, Rum and Vodka, with the note "Our usual mix. Change any." Any chip can be changed.
5. **Shopping list**, straight away: Category / Bottles / Line total, where line total = bottles × the chosen bottle's price. Then the estimated total, a budget bar, the amount left or over, and cost per guest. Share list (pink), Copy and Print.
6. **Choose your bottles:** per category, "Suggested N bottles · size each", a − / + stepper, and three real options (cheaper, middle, premium) at the standard size.

**Logic:**
- A new pure module, `app/party-planner/list.ts`: the category map onto catalogue categories (Wine is one chip for all wine), the pre-pick (the spirit scores from `spirit.ts`, mapped to chips), quantities from the existing `SERVING_ML` (about three drinks a guest, split evenly), the three options per category, and the budget fit: if the list goes over budget, step lines down to cheaper options, biggest line first, as `suggest.ts` does now.
- The total is the sum of line totals, never a sum of single bottle prices.
- Share, Copy and Print still go through `validatePlan` / `planText`, so the server checks the list.
- The device draft moves to a new version key. An old draft keeps its guests and budget only.

**Phone:** a sticky bottom bar with the total, left or over, and Share list. The three bottle options scroll sideways.

**Removed:** the stages, setup screen, product shelf, filters, inventory dialog and suggest dialog. The code for drag to add goes with them.

## Checkpoints

| # | Scope | Main files | Acceptance |
|---|---|---|---|
| TR0 | **Owner approval** of this plan and the open question | this file | Owner OK |
| TR1 | **Catalogue normalisation** | `app/catalogue/normalise.ts` (new), `scripts/catalogue-normalise-check.cjs` (new) | Names, brands, kinds, sizes and duplicates match the check's fixtures from real rows; no I/O |
| TR2 | **Find a Drink logic:** the how answer, budget bands, two-bottle rule, bottle list, sort and filter; URL parameters | `spirit.ts`, `discovery.ts`, `app/find-my-drink/bottles.ts` (new), `scripts/spirit-check.cjs` | Same answers give the same spirit; budget changes the pick when a band has under two bottles; old URLs still open |
| TR3 | **Find a Drink page:** one-page quiz and live results at 390, 834 and 1440 | `page.tsx`, `components/guided.tsx` (rewritten as the finder), `finder.module.css`, recipe browser checks | Matches the mockups; Browse all, recipes, cook mode, pantry and no-JS browse unchanged |
| TR4 | **Planner logic:** categories, pre-pick, quantities, options, budget fit | `app/party-planner/list.ts` (new), `scripts/party-planner-list-check.cjs` (new) | Totals add up; within budget whenever the cheapest options fit; deterministic |
| TR5 | **Planner page:** one page, sticky phone bar, share, copy, print, draft | `planner.tsx`, `planner.module.css`, the seven Planner browser checks | Matches the mockups; draft and export work; one pink action per screen |
| TR6 | **Regression:** every check, 320/390/768/1024/1440, 200% text, contrast, progress log | `docs/implementation-progress.md` | `pnpm build`, `tsc --noEmit`, production smoke of both pages, all checks pass |

Each checkpoint runs `tsc --noEmit` and its checks. TR3, TR5 and TR6 also run `pnpm build` and a production-server smoke test. Each one gets a progress-log entry. Nothing is committed until the owner asks.

## Not in this plan

- A bottle detail page, bottle photos, and "Add to party list" from Find a Drink.
- The owner's base-spirits spreadsheet. When it arrives it can replace the brand list and the reclassification in `normalise.ts`.
- Mixers and soft drinks in the Planner (there is no catalogue data for them).
