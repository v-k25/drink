# AllCheers Party Planner: competitor review

Reviewed 2026-09-14 at the owner's request. Planning research only; no product implementation.

## Method and limits

Reviewed public first-party pages through web search/open. The in-app browser was unavailable, so this is a content and product-pattern review, not an end-to-end interaction or visual usability audit. LivCheers' entry screen is observable; later category, swap, calculation, save and share behavior was not verified. Do not infer absent functionality from content the reader could not expose. No accounts were created, age declarations made, forms submitted, messages sent or competitor assets/data downloaded.

Total Wine's party page returned 403 and its Paperform calculator returned a form-load error, so it is excluded from scored comparisons. These access failures do not establish that the sites fail for normal visitors. Sources: [Total Wine party planning](https://www.totalwine.com/party-planning), [calculator form](https://totalwinealcoholcalculator.paperform.co/).

## What is worth borrowing

| Reference | Directly observed | Useful adaptation for AllCheers | Boundary |
| --- | --- | --- | --- |
| [LivCheers planner, Gurgaon](https://www.livcheers.com/gurgaon/party-planner) | City context, people and budget inputs, one start action, regional eligibility prompt, estimated-price and no-delivery notices. | Keep the first step short and immediately relevant to local shopping; show Jaipur and INR clearly. | Entry page only. No claim that later steps handle budgets, quantities or saves correctly. Do not copy its eligibility policy. |
| [LivCheers product page](https://www.livcheers.com/mumbai/liquor/heineken-beer-330ml) | Product size choices, local price context, reviews and Compare/Party actions. | Make pack size and local price prominent in planner cards. Product-to-plan entry is a possible later shortcut. | Reviews, prices and stock are not AllCheers evidence. Standalone comparison and product discovery are outside this MVP. |
| [Omni Party Drink Calculator](https://www.omnicalculator.com/food/party-drink) | Distinguishes known versus unknown drink preferences; exposes guest/duration inputs, soft-drink coverage, results, sharing and written formulas. | Explain how quantities arise and recognize that guest count does not equal alcohol-drinker count. Keep extra inputs conditional on the approved model. | Do not import its consumption formulas, category split or serving assumptions. This review does not establish their suitability for AllCheers. |
| [Cocktailhire planner](https://www.cocktailhire.com/party-drinks-calculator/) | Public page describes no-signup planning, explicit coverage limits, adjustable category split, bottle conversions, optional prices and PDF output. | Provide a useful result before login, make excluded costs visible and prioritize a readable shopping handoff. | Its wider event/supplier scope and UK quantity model do not fit the current Jaipur catalogue MVP. PDF generation itself was not exercised. |

These strengths are useful patterns, not evidence of higher conversion or customer satisfaction. No traffic, completion-rate or usability-study data was available.

## What the first AllCheers plan should improve

**Budget decisions should happen before the swap.** The first plan correctly specified server arithmetic but did not explain how the host makes a choice. Add a preview showing price difference and resulting basket total. Keep the current selection visible while browsing alternatives. This is an AllCheers recommendation, not a verified competitive gap.

**Preserve useful over-budget work.** The original proposal blocked save/export until the basket fit. Revise that: a valid, fully priced basket may be saved and shared with a prominent exact shortfall. A host may need to discuss a more expensive list before deciding what to change. Invalid or unpriced lists cannot masquerade as complete estimates.

**Make the list useful outside the app.** A CSV-first output suits spreadsheets more than a store visit. Prefer browser Print / Save as PDF and clear copied/shared text for MVP. This uses the native print flow; direct PDF-file generation and CSV remain optional later requirements. Authentication is for durable cloud saves, not for viewing or taking away a result.

**Make uncertainty visible at the decision point.** Show quantity assumptions next to quantities and price dates next to estimates, rather than relying on a footer. Do not promise to serve the whole party when a group includes people whose drinks are absent from the catalogue. The approved quantity model may require a subgroup count or allocation input; that remains an explicit scope decision.

**Reduce effort in step three.** A long category list needs product-name search, a persistent selected choice and clear pack sizes. Start with those simple controls. Do not add ranking, taste scores, a general comparison tool or invented popularity labels.

**Treat pack changes as real changes.** Two small bottles and two large bottles have different volumes even if both show quantity two. Update the specific product/pack price and flag quantity for review. If an approved model recalculates quantities, preview its effect and request confirmation before replacing a host's edits.

## Priority and decisions

Propose for MVP: four-step progress, persistent budget summary, swap-cost preview, category-local name search, visible quantity explanation, guest-first result/export, readable print output, clearly labelled over-budget saves and explicit estimate exclusions. The revised main plan contains measurable acceptance for these.

Keep deferred: allocation sliders and additional duration inputs until the quantity rules justify them; accountless durable cloud saves; collaboration/public links; supplies calculators; retailer/stock integrations; multiple products per category; product recommendations and ratings.

Owner decisions still needed: quantity/allocation model and guest-group meaning; eligibility; authentication; verified catalogue/price ownership; over-budget export policy; native print versus direct PDF download. Existing website, backend and data preservation remain unchanged. Inspiration does not settle these decisions or authorize implementation.
