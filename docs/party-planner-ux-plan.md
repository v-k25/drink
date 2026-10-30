# Party Planner: clearer setup and list building

Date: 2026-10-13
Status: implemented and reviewed; current UX checks pass. Legacy layout scripts still require migration to the new setup journey.
Basis: owner discussion and hands-on UX review in implementation-progress.md. This is a bounded follow-up to tool-redesign-v2, not a new visual identity or a Find My Drink redesign. The existing dark/gold theme, Nunito Sans, shared header and paper receipt stay.

## 1. Outcome and scope

A host enters guests and budget, chooses a starting method, edits drinks with clear costs, and exports a usable list. No product can be added before valid setup. Every category is discoverable with mouse, keyboard or touch. Suggestions disclose their assumptions and never overwrite edits silently.

Owner-raised problems: duration and mix controls are vague and misplaced; budget preset buttons feel disconnected; desktop category navigation lacks an obvious route to hidden categories; adding drinks before setup feels out of sequence. Related observed issues: draft settings reset on reload, guest edits leave quantities unchanged without prominent notice, ambiguous per-person amounts, cramped selected-plan viewport and oversized mobile receipt actions.

The changes below are proposals drawn from that discussion, not claims that every detailed interaction or calculation has already been approved.

## 2. Proposed journey

Existing eligibility check -> Set your party -> Choose starting method -> Build your list -> Review and share.

### A. Set your party

- Show a short standalone setup card, not setup alongside an already usable catalogue. Keep the existing compact header; no large page hero.
- Fields: Guests and Drinks budget (INR), using existing validation and limits. Use a visible rupee prefix and appropriate mobile input modes.
- Remove Rs 2,000 / Rs 5,000 / Rs 10,000 preset buttons.
- Show Budget per guest only when both inputs are valid. This is budget divided by all guests, clearly labelled.
- Visible note: Alcohol budget only. Mixers, water, ice and food are not included.
- Actions: Suggest my list (primary) and Choose drinks myself (secondary). Both validate setup, show inline errors and focus the first invalid field. Neither exposes an addable catalogue with incomplete setup.
- Desktop: two fields side by side. Phone: stacked fields and full-width actions. Do not reserve space for an empty plan panel at this stage.
- Returning valid drafts resume the builder. Incomplete legacy drafts return to setup while retaining all valid selected items.

### B. Suggestion preferences, only when requested

- Remove 2 / 4 / 6 hours and Balanced / Beer & wine / Spirits-led from setup and budget editing.
- After Suggest my list, show a compact suggestion step with non-drinking guest count and What would your guests like? Explicit multi-select choices come from eligible catalogue categories, rather than invented or hard-coded database categories.
- Do not auto-select every category. Require at least one supported category; explain unsupported suggestion categories, which remain available for manual selection.
- Show the quantity basis before Generate list and alongside the resulting estimate. Do not silently retain the old hours + 1 rule behind a removed control.
- Approved: replace duration with a directly entered Estimated servings per drinking guest, with no preselected consumption target. Explain that this is a shopping assumption, not a recommendation. Target servings = drinking guests × entered servings. Show total target servings and the existing category-specific serving sizes in How quantities work.
- Approved: split target servings equally across explicitly selected eligible categories, disclose that split, then round up to whole purchasable packs. Equal servings do not mean equal packs or spending. Preserve deterministic price selection, eligible pack-size rules and explicit over-budget results. Never silently drop a requested category; if its minimum packs cannot fit, explain the conflict.
- Show target servings separately from actual rounded pack coverage. Use Estimate. Edit anything. Do not imply alcohol portions across categories are equivalent standard drinks.
- All non-drinking guests: explain that this catalogue cannot generate a non-alcoholic list; keep settings and allow returning to edit. Do not generate alcohol automatically.
- Generate opens the mobile/tablet plan sheet as today; desktop shows the populated plan panel. Back preserves all inputs.

The owner approved the direct quantity target and equal selected-category allocation for suggest.ts.

### C. Build your list

- Desktop (initial breakpoint 1024px): wrapping category buttons; every category visible without horizontal scrolling, arrows or a gesture. Keep normal page scrolling if the catalogue grows.
- Phone/tablet below 1024px: one clearly labelled category picker opens the complete category list in a sheet. Show the active category on its trigger. No swipe-only navigation. Validate the breakpoint at 1024px with actual content.
- Browsing a category does not add a category to the plan or alter any item. Remove destructive category x controls from browse navigation. Keep item removal in Your plan; retain removal Undo. No new bulk-delete interface in this pass.
- Add Search all drinks using the already loaded catalogue. Search ignores the browse category; display each result's category. Clearing search returns to the prior browse category. Keep filters in one toolbar, explicitly scoped to current results; stale category-specific brand filters must not silently hide cross-category results.
- Preserve add/stepper interactions, quantity validation and over-budget choice. Existing drag-and-drop remains optional; clicking and keyboard operation provide the complete path.
- Your plan keeps estimated total, budget remaining/overrun and Edit guests & budget visible. Label Estimated cost per guest using list total / all guests; label budget/person separately wherever shown.
- Compact selected-item rows: name, size, quantity, subtotal and remove. Aim for at least three complete typical items at 1280x844; long names must wrap without clipping. Keep Review reachable at short heights, without shrinking touch targets.
- Mobile bottom bar remains compact: item count, total, remaining/overrun and View plan. The sheet contains the editable list.

### D. Edit and resume safely

- Edit guests & budget opens only those fields, with Save changes and Cancel. Invalid edits cannot destroy the working plan; Cancel restores the previous values.
- Changing guests retains quantities and shows Guests changed; quantities have not been updated. Suggested plans offer Update suggestion and Keep my quantities; manual plans offer Review quantities and Keep my quantities, without implying automatic scaling exists.
- Changing budget updates money feedback immediately after Save; it does not change products. Offer regeneration as a separate action for suggested plans.
- Suggestion settings have an explicit Edit suggestion action. Regeneration previews/requires confirmation before replacing an existing list; Cancel and Undo preserve/restore both items and associated suggestion assumptions.
- Persist guest count, budget, products/quantities, suggestion preferences, generation basis and stale-estimate acknowledgement. Validate stored data, preserve compatible old drafts and do not invent historical assumptions for them.
- Distinguish initial suggestion assumptions from current edited totals. After manual quantity changes, any coverage summary is recalculated or clearly labelled as the original estimate.

### E. Review and share

- Keep the paper receipt, item sizes, quantities, subtotals, total, price provenance and actual cost per guest.
- Mobile: one prominent Share list action and compact Edit list action. Copy list and Print / Save as PDF live in an accessible More options disclosure. Start new plan remains secondary with confirmation.
- Avoid a permanently expanded export block taking roughly 236px. Receipt content must remain reachable above sticky actions, including its final lines and footnotes.
- Preserve clipboard-denied/manual-copy fallback, share cancellation behaviour and print output. No message is sent during automated checks.

### F. Loading and failure

- Reuse catalogue-unavailable + Try again for failures immediately after eligibility as well as returning visits. Keep the successful eligibility state and draft.
- Show actionable error copy next to the failed step; do not leave only Unable to complete that request.
- Adapt skeletons to setup/builder states. Preserve focus, visible pending feedback and prevention of duplicate actions.

## 3. Files and boundaries

Primary UI: app/party-planner/planner.tsx and planner.module.css, including setup, drafts, category navigation, skeletons, dialogs and receipt actions.
Suggestion checkpoint only: app/party-planner/suggest.ts and its caller in planner.tsx. Read relevant local Next.js guides before writing implementation code.
Keep server interfaces unchanged: actions.ts, catalogue-server.ts, session.ts and model.ts money/plan validation/export contracts. Category browsing must translate to the existing plan input using actual selected lines, not empty browsed categories.
Update focused callers/tests: scripts/party-planner-suggest-check.cjs, planner-tool-shell-check.cjs, planner-redesign-check.cjs, planner-inventory-check.cjs, planner-ux-check.cjs, and affected Planner assertions in design-polish-check.cjs and brewlist-tools-style-check.cjs. Reconfirm caller inventory before edits. Preserve unaffected checks and explain changed assertions.
Use existing fixtures; add narrowly scoped synthetic 18-category/long-name coverage if required. The old catalogue.json fixture is not evidence of live names or prices.
Do not change backend tables/actions, credentials, env files, packages/lockfiles, landing, Find My Drink, shared theme, preserved archives/mockups, .fallow/, .opencode/ or docs/agent-workflow.md. No dependency, auth, booking, product-image or AI additions. No commit/deploy unless requested.

## 4. Checkpoints

1. Freeze this interaction contract and the two suggestion decisions. Review compact desktop/mobile wireframes of setup, preferences, builder and receipt. Do not restart visual-brand exploration.
2. Implement setup gate, budget simplification, category navigation and search. Preserve a working suggestion path until checkpoint 3 is ready. Add behaviour checks for setup validation, browse-only categories and cross-category search.
3. Implement explicit suggestion preferences and quantity rule, draft migration/persistence and stale-estimate handling. Test determinism, exclusions, rounding, budget failures, old drafts, Cancel and Undo.
4. Compact plan/receipt actions, unify catalogue retry and complete accessibility/responsive verification.
5. Director reviews diff and verification evidence; update implementation-progress.md after each completed checkpoint and refresh Graphify after code checkpoints.

Follow repository native-agent workflow at implementation time: Astra scope/final review, one bounded executor, one build owner, at most two repair cycles. The requested legacy executor model IDs are not in the current available-model list; resolve an available executor choice explicitly when implementation begins, never silently substitute. No agents needed to write this plan.

## 5. Acceptance and verification

- Fresh users cannot add drinks, generate or review until guests and budget are valid. Inline errors are understandable, keyboard reachable and associated with inputs.
- No budget presets, duration buttons or vague mix presets remain in the completed setup. Quantity assumptions remain visible for suggestions.
- All 18 category labels, including long names, are reachable with a mouse and keyboard at desktop widths; the mobile/tablet picker exposes the full set without horizontal gestures. Browsing never removes or adds drinks.
- Global search finds matching products outside the active category; reset/filter scope is explicit. Empty results have a recovery action.
- Reload preserves every new preference and item. Old drafts retain their items, missing assumptions are explicit, malformed input is handled safely.
- Guest/budget changes do not silently regenerate. Stale notice, replacement confirmation, Cancel and Undo behave as described.
- Cost per guest equals current list total / guests using existing money rounding. Budget/person is separately labelled. Zero/invalid guest values never produce invalid arithmetic.
- Suggestion checks cover selected-category-only output, deterministic allocation, pack rounding, unsupported/empty choices, all non-drinkers, tiny and large inputs, and impossible budgets.
- Inspect at 360, 390, 768, 1024, 1280 and 1440px; include short 500px height, long names, empty/many-item lists, over-budget and failed-catalogue states. No horizontal page overflow or obscured final receipt rows.
- WCAG 2.2 AA targets: visible focus, appropriate names, error announcements, dialog focus containment/return, Escape, 44px interaction targets, contrast, reduced motion and 200% text. Separate browser zoom from font-size testing in evidence.
- Run pnpm build (Corepack with pnpm_config_verify_deps_before_run=warn if necessary), node node_modules/typescript/bin/tsc --noEmit, git diff --check, focused Planner logic/browser harnesses, and production-server smoke. One integrated build owner; no dependency reinstall to hide drift.
- Regression smoke landing and Find My Drink because navigation is shared, without changing those features. Check print and clipboard/share fallback in isolation; no real outgoing shares or database writes.
- Record actual results and limitations. A test fixture pass does not establish live catalogue availability. Investigate the earlier local live-fetch failure separately before claiming production readiness.

## 6. Implementation status

The two suggestion decisions were approved by the owner and implemented. Checkpoint evidence and remaining legacy harness migration work are recorded at the top of `docs/implementation-progress.md`. The current production browser fixture harness covers the approved journey; older layout scripts still assert the removed setup card.
