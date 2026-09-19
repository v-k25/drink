# AllCheers Party Planner: proposed MVP

Status: planning only, revised 2026-09-14 after owner-requested competitor review. The owner supports the initial direction; new recommendations below remain proposals. No implementation or backend work authorized by this document. Unresolved launch rules remain decisions, not defaults silently adopted.

## Evidence and preservation boundary

Read AGENTS.md, implementation-progress.md and allcheers-brief.md, then inspected the current homepage and preserved early-access action. The marketing homepage is implemented; older placeholder descriptions are stale. Preserve its design, content, assets, signup behavior and current indexing policy.

The handbook's original PDF is absent from the path recorded in the brief and was not found by filename search under Desktop or Downloads. Reviewed the preserved twelve-page overview at `tmp/pdfs/handbook-overview.png` and the full-size planner page at `tmp/pdfs/allcheers-handbook-review/page-7.png`. Detailed requirements elsewhere rely on the existing page-referenced brief; recover the original before final technical-contract signoff. No fresh workbook, price, stock or image-rights audit was performed.

Do not change the existing early-access action, waitlist data, credentials, environment files, dependencies, product workbook/images, legacy material or recovery archives. Future planner persistence must be additive and separately approved in the existing EkQuarter Supabase project. Early-access consent does not create an account or authorize reusing subscriber records as planner profiles.

## Recommended release boundary

Deliver a Jaipur-only, four-step planner at a separate proposed `/party-planner` route. Reuse the current site's visual language without redesigning marketing. Keep the homepage unchanged during development; launch entry links and accurate availability copy should be a separately reviewed, minimal change after the planner passes acceptance.

Include catalogue-backed drink selection, editable quantities, whole-list budget checks, an editable shopping list, authenticated durable saves, a minimal saved-party-list view, print-friendly output through browser Print / Save as PDF and text sharing/copy. Defer CSV unless users need spreadsheet editing. Saving must survive a new browser session; local storage alone does not satisfy the handbook's saved-plan requirement. Proposed account timing: plan, print and share without login after eligibility checks; authenticate only for durable saving and retain the draft through authentication. This timing is a proposal, not a settled handbook rule.

Exclude Find My Drink, taste questionnaires/ranking, saved drinks, multiple products within one category, recipes, events, payments, delivery, stock guarantees, collaboration, public share links, analytics, admin UI and new dependencies by default. Mixers, snacks, supplies and alcohol-free products enter only after verified catalogue coverage; do not fabricate options to match inclusive marketing imagery.

A private prototype may validate navigation and arithmetic before launch decisions are resolved. Its one-pack-per-category default must say: "Starter quantity - adjust for your group, not a headcount-based recommendation." It is not the public MVP and must not imply that quantities serve the entered guest count.

## Four-step journey and acceptance

| Step | Proposed behavior | Acceptance criteria |
| --- | --- | --- |
| 1. People and budget | Guest count and original total drinks budget in INR; Jaipur visible. No extra taste questions. | Require positive whole-number guests and a positive budget with at most two decimal places; reject malformed, non-finite and out-of-range values on the server as well as in the UI. Numerical upper limits must be approved. Back navigation preserves input. Editing the budget never silently raises it or resets selections. |
| 2. Categories | Accessible multi-select from approved catalogue categories, with clear selected states and Clear filters. | At least one category required. Back navigation retains choices. Adding a category retains other lines. Removing a category removes its active line and recalculates totals; clearing all categories blocks continuation without discarding people/budget. Missing or unaffordable categories remain explicitly explained. |
| 3. Product options | Group real products by selected category. Show image or honest fallback, name, pack size, estimated unit price, one chosen product per category and editable pack quantity. | Only valid catalogue products/prices participate. Quantities are positive whole packs, not fractional bottles. Quantity recommendations use only an approved rule. Changing product or quantity recalculates the entire basket. Existing choices survive back navigation; newly invalid choices are flagged for explicit replacement rather than silently swapped. |
| 4. Shopping list | Show Jaipur, guest count, original budget, products, sizes, quantities, unit prices, line totals, estimated total, remaining budget and price-snapshot context. Edit, Save, Download and Share. | Every subtotal and total agrees with server calculations. Edits return to the relevant step without lost choices. Saves persist and reopen accurately. Downloads/shares reproduce the displayed snapshot and estimate disclaimer. All actions have truthful success, failure and recovery states. |

Always display: "Estimated from our Jaipur catalogue. Store prices and availability may differ." The list is advice for independent local-store shopping, not an order or availability promise.

## Money, feasibility and price snapshots

- Use integer paise for authoritative calculations; format INR only for display. The server resolves product IDs, category membership and prices from trusted catalogue data, never submitted client totals or prices.
- Line subtotal = unit price x pack quantity; total = sum of line subtotals; remaining = original budget - total. Reject unsafe arithmetic and invalid quantities rather than truncating them.
- A candidate replacing line A is affordable only if `other lines total + candidate unit price x proposed quantity <= original budget`. Do not compare each category against the full budget independently.
- For example, with a Rs 5,000 budget and other lines costing Rs 3,200, two Rs 1,000 packs produce a Rs 200 shortfall. Two Rs 900 packs fit exactly. These are arithmetic fixtures, not real catalogue prices or serving guidance.
- If the minimum basket for the approved quantities costs Rs 5,600 against Rs 5,000, show the Rs 600 shortfall and affected categories. Offer explicit lower-cost swaps, quantity edits, category removal or budget edit. Never drop a category or increase the budget automatically.
- Revised recommended over-budget policy: permit saving and exporting a valid, complete basket with a prominent "Over budget by Rs X" status on screen, in saved plans and in every output. Keep original budget and exact shortfall visible; never call it affordable or ready within budget. Missing products, invalid quantities and unknown prices still block a complete shopping-list output. This replaces the original blanket restriction, which would prevent hosts retaining useful work. Owner approval remains required.
- Store original budget, guest count, city, product IDs, product/pack labels, quantities, unit-price snapshots, catalogue/price version and save time. Reopening preserves that snapshot. If current prices differ or a product is no longer usable, explain the difference and offer explicit repricing/replacement. Never silently rewrite a saved list.

## Decisions still required

| Decision | Recommendation / consequence |
| --- | --- |
| Quantity and allocation rules | Launch blocker. Owner must approve category allocation, pack-size treatment, applicable guest assumptions and explanatory wording. Duration and preference splits are not currently inputs; if the chosen rule needs them, approve an explicit journey change. Do not derive a consumption formula from the screenshot. Manual quantities as a public product would also require an explicit change to the handbook requirement. |
| Initial product ordering/allocation | Decide the initial product and deterministic tie-break rule. Cheapest valid product per category is a reasonable proposed starting point, conditional on approved quantities; do not auto-upgrade merely to exhaust the budget. |
| Eligibility policy | Launch blocker. Approve access requirements, enforcement points and handling of declined/ineligible users before alcoholic catalogue access. No age threshold or jurisdictional interpretation is invented here. |
| Authentication and saves | Approve provider, login timing, recovery and account lifecycle. Mobile OTP is proposed in the handbook, not selected. Require authenticated ownership for durable saves; minimal list/open/update/delete is proposed, without saved drinks or full account dashboards. |
| Catalogue readiness and maintenance | Assign an owner; verify stable IDs, category/pack mapping, valid Jaipur prices, price dates, duplicates and image reuse rights in a separate authorized audit. Decide update cadence and stale-price policy. The reported 507 products/ten categories are not freshly verified. |
| Category coverage | Confirm launch categories. No dedicated alcohol-free or still-wine coverage is established by the brief. Missing categories must be honestly unavailable; expanding data is a separate task. |
| Infeasible plans and limits | Approve clearly labelled over-budget saving/export, guest/quantity/budget upper limits, and whether removing then re-adding a category restores the prior choice. Proposed simple behavior: re-add from approved defaults. |
| Download and Share | Recommend browser Print / Save as PDF plus native text sharing with Copy fallback, available before login. Label the print action honestly: some devices offer printing without PDF saving. Defer CSV and direct generated-PDF download; no public URL, recipient lookup or automatic sending. |
| Persistence/privacy | Approve additive planner tables, access policies, retention/deletion and planner privacy copy. Preserve all existing tables and data. Do not migrate waitlist entries into accounts. |

Eligibility, quantity rules, catalogue trust and authenticated persistence are public-launch blockers. Export format and numerical limits must be frozen before their implementation. No live backend work is implied by approving a UI prototype.

## Competitor-informed revision

Research and evidence limits: [competitor review](allcheers-party-planner-competitor-review.md). These are proposed improvements to this plan, not claims that competitors lack these features. Keep the four steps and current marketing design.

1. **Make progress and budget visible.** Show the current step and completed steps. From product selection onward, keep original budget, current estimate and remaining amount/shortfall near the action area. Use a compact mobile summary that never obscures inputs, errors or focused controls. An incomplete basket says "Selected items subtotal" rather than implying a complete total.
2. **Make product changes understandable.** Keep the selected product visible within its category, with a compact alternatives list and product-name search inside that category. Show pack size, unit price, line-price difference and resulting whole-basket total before a swap. Affordability labels describe cost only, not serving adequacy or best taste. A pack-size change must flag that quantity needs review; never preserve a misleading serves-guests claim.
3. **Explain quantities where users edit them.** A short expandable explanation shows the approved inputs, allocation and pack rounding. A manually changed quantity is labelled adjusted by the host. Offer explicit recalculation when relevant inputs change; never overwrite those edits silently. Do not claim equal category selection means equal guest demand.
4. **Make a usable shopping handoff.** Print / Save as PDF and Copy / Share include the same product/pack information, price date when known, original budget, shortfall if any and estimate disclaimer. Include a brief "Not included in this estimate" note for mixers, food, water, ice and supplies; this is a scope reminder, not a priced checklist or quantity calculation.
5. **Keep access proportional to the action.** Let eligible visitors see, edit and export the useful result before account creation. Explain Save as "Keep this plan for later" and retain the draft if login is cancelled or expires. No unsolicited messages are sent.

Additional acceptance for this revision:

- For a Rs 5,000 budget and Rs 3,200 of other items, swapping to two Rs 1,000 packs previews Rs 5,200 total and Rs 200 over budget before confirmation. Screen, reopened save, print and shared text agree afterward.
- Category search does not clear the selected product or affect other categories; no-result search provides a clear reset action. Choosing another pack size updates the exact SKU/price and explicitly asks the host to review quantity.
- Completed steps are revisitable without loss of state. Incomplete/invalid steps cannot be skipped into a misleading completed list. At 320px and keyboard zoom, the budget summary does not cover controls or validation messages.
- Updated guest/category inputs distinguish approved suggested quantities from manual edits. Any recalculation requires explicit confirmation; its result shows updated affordability and assumptions.
- Print output contains all rows without clipping and excludes navigation/action buttons. A cancelled print/share is not reported as a successful download/send. Unknown price dates remain unknown rather than being replaced with today's date.
- Non-alcoholic catalogue gaps are visible before a host commits to a selection. The interface must not imply every guest drinks alcohol. If the approved quantity rule needs the number consuming each category, add that input within the existing steps only after explicit approval; headcount alone is insufficient evidence.

Deferred inspiration: percentage-allocation sliders, party-duration controls, serving presets, direct product-detail-to-planner entry, custom unpriced items, store discovery and shared editing. Add only when the quantity model, verified catalogue or user testing establishes a concrete need. No competitor formulas, product data, ratings, imagery, logos or copy are imported.

## Proposed technical boundary

Keep planner pages/components isolated from homepage styles. Use one shared calculation routine for immediate UI feedback and authoritative server validation, with a small runnable test set; avoid a general recommendation framework. Read the installed Next.js guides before implementation and settle file/API names then.

Use an approved catalogue snapshot with stable identifiers and provenance. Browser requests carry product IDs, quantities and user inputs; server responses carry validated lines, totals and actionable errors. Exact endpoints and schema remain uncommitted until authentication and catalogue decisions are settled.

For future saves, derive owner identity from the verified session, enforce ownership in server operations and database policies, and validate imported/reopened data. Reject cross-user read/update/delete attempts. Preserve drafts through login expiry, catalogue failures and failed saves. Prevent duplicate writes on repeated submission and detect stale updates rather than silently overwriting newer saved work. No service credentials enter browser code.

## Delivery checkpoints after approval

1. Freeze the decision table and acceptance criteria; recover the full handbook for technical-contract verification. Authorize a read-only catalogue audit separately and record its findings without editing source data.
2. Review four-screen desktop/mobile layouts plus invalid-input, missing-category, infeasible-budget and save-failure states. Use the existing marketing design language. An internal prototype, if requested, stays explicitly labelled and private.
3. Implement the approved catalogue/quantity/budget contract and four-step flow. Luna is the sole normal executor under an Astra contract; no parallel integrated builds. Keep the marketing website and existing backend intact.
4. Add approved authentication, ownership-protected persistence and export/share. Apply only separately authorized additive database changes; use test data for verification.
5. Astra reviews the diff and evidence. Run production build, standalone TypeScript, whitespace check, existing mocked early-access regression check, focused planner calculations/security checks and production browser smoke. Refresh Graphify after code checkpoints and update implementation-progress.md after each completed checkpoint.

## Release acceptance beyond the four screens

- Arithmetic checks cover exact budget, Rs 200 swap shortfall above, infeasible minimum basket, quantity/category edits, decimal INR, tampered prices/IDs and invalid or excessive quantities. The original budget stays unchanged unless explicitly edited.
- Saved-plan checks cover new-session reload, unchanged snapshot, explicit repricing, removed products, unauthenticated requests, cross-user isolation, repeated saves, stale edits, session expiry and recoverable failures. No false Saved state before persistence succeeds.
- Export/share checks verify line totals, original budget, city, guest count and estimate notice; native-share cancellation is not reported as success, and unavailable sharing/clipboard access offers a usable fallback.
- Production browser checks at 320, 390, 768 and 1440px show no horizontal overflow; all steps work with keyboard, visible focus, accessible validation, announced total/error changes and reduced motion. Back/edit and failed requests preserve the draft.
- Homepage, assets, section anchors and signup behavior remain intact. Run `node scripts/early-access-check.cjs` without real Supabase writes. Compare protected backend/config/environment files against the implementation-start baseline, never print secrets.
- Run `pnpm build` (Corepack fallback with dependency verification set to warn if needed), `node node_modules/typescript/bin/tsc --noEmit`, and `git diff --check`. Do not change package/lockfiles to suppress existing drift warnings. No commit or deployment without a separate request.

Planning verification: source/document review only. No application changes, dependency changes, database operations or live signup tests were performed. Build and production UI checks belong to the future implementation checkpoint.
