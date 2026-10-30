# Find My Drink: UX direction

Planning only, 2026-10-01. No interface or backend change is approved by this document.

## Starting point

- The latest publication checkpoint records 28 eligible recipes: 20 cocktails and 8 mocktails. These counts were not live-verified for this plan; never hard-code them into the UI.
- Current browse already has name/ingredient search, spirit/mocktail and ingredient-count facets, featured rails and pagination. Detail has ingredients, metric annotations, step mode, optional keep-awake, and authenticated saves/notes/community.
- The current homepage is the visual reference: ivory `#faf7f2`, plum `#430e2b`, berry `#a92355`, Georgia display headings, Nunito Sans text/controls, fine borders and restrained image corners. Match its shell and navigation, with tighter spacing for a working tool.
- Keep `/find-my-drink`, the regional eligibility gate, and every existing publication/provenance/quality check. Only eligible selected recipes may appear anywhere, including suggestions and saved-item recovery.

## Recommended experience

Make this a small, useful recipe companion: **choose something, see why it fits, then make it**. The distinctive feature should be a trustworthy bridge from ingredients already at home to a reviewed recipe.

Lead with **What sounds good?** and a compact instruction: "Find a recipe from our selected collection." Avoid a full-screen marketing hero, quiz or invented taste profile. Keep "Find a recipe" as the page identity.

| Order | Mobile layout | Behavior |
|---|---|---|
| 1 | Compact shared header, title and one-line introduction | Preserve familiar site navigation and eligibility behavior |
| 2 | Mocktails / Cocktails / All, equally weighted | Default All; mutually exclusive choice, explicit selected state |
| 3 | Labeled name-or-ingredient search | Enter/Search works; retain query and filters on return |
| 4 | A few wrapping ingredient chips | Real reviewed ingredient names with counts; "More ingredients" expands the rest |
| 5 | Primary "Use what I have", secondary "Pick for me" | Pantry opens an inline checklist; Pick uses current filters |
| 6 | Up to three explained choices | Vertical cards, one clear recipe link each, followed by "Browse all matches" |
| 7 | Compact full results and saved-list entry | No repeated cards in multiple unfiltered rails |

At 390px, keep the type control and search visible before the first substantial scroll; the first result should follow the compact controls, not a decorative image. At 320px chips wrap and text remains readable. Avoid horizontal carousels as the only way to discover results.

Desktop uses the same order in a centered, approximately 1200px shell: a narrow filter column beside three result cards. Detail uses ingredients beside method when space allows. No extra desktop-only feature set or dashboard density.

## Filtering and three choices

- Type is one facet; base spirit, reviewed ingredient and method are separate optional facets. Ingredient selections mean "contains all selected ingredients"; explain this beside the controls. Pantry is a separate task, not the same semantics as ingredient search.
- Populate method chips only from recorded, reviewed methods. Never infer equipment-free preparation from a missing method. Ingredient chips require reliable ingredient identity; substring search alone cannot establish a pantry match.
- Keep counts and every suggestion inside the active type/search/ingredient/method filters. A mocktail selection must never reveal cocktail suggestions through a featured rail or random pick. Existing rails currently use the full eligible set, so this needs an explicit implementation change and regression check.
- Default three choices: selected featured matches first, then stable name order, deduplicated. If only one or two qualify, show that number honestly. Explain each with a stored fact, such as "Contains pineapple juice" or "Method: build"; do not label an arbitrary choice "best for you".
- "Pick for me" chooses up to three distinct eligible matches within current filters, with no repeat until that session's matching pool is exhausted. Say "All matching recipes shown" when exhausted; never loosen filters silently. This is lightweight variety, not a taste prediction.
- Ingredient-count labels describe the actual counted list. Until garnish/ice requirements are reconciled, say "listed ingredients" and do not turn a short list into an "easy" promise.
- Defer sweetness/acidity scores, mood matching and taste tags until editorial review supplies reliable values. No invented prep time, price, allergy-free status or exact zero-ABV claim; "Mocktail" is classification, not laboratory confirmation.

## Use what I have

Offer a searchable checklist drawn only from eligible recipes' reviewed ingredient identities. Show the selected items plainly, with Remove and Clear controls. Separate "Ingredients I have" from the recipe's quantities and equipment checklist.

For the first release of this feature, selections last only within the active browsing session. Results say **"Ingredients match; check quantities and equipment"** rather than "You can make this now". Presence alone does not prove enough juice, the right glass or a shaker.

Only recipes with a confirmed complete requirement list can receive confident pantry matches. Reconcile ingredient rows, method, garnish and ice; null fields do not mean "not required". Missing or ambiguous identity/requirements exclude the recipe from confident matches, while it can remain in ordinary eligible browsing. Do not merge lime, lime juice and lime wedge, or substitute brands/types/forms without editorial confirmation.

## Signature later feature: One ingredient away

After the complete-requirements review, show a small section beneath exact ingredient matches: **"One ingredient away"**, with the exact missing item and its recipe quantity. Count every required ingredient, including garnish and ice; never assume pantry staples. Optional items must be explicitly confirmed optional. Show equipment separately and keep the quantity/equipment check visible.

Example to validate: a visitor with all confirmed Bay Breeze requirements except pineapple juice could see "Add pineapple juice for Bay Breeze". Having made or saved Cape Codder does not prove their pantry contains the correct forms, quantities, garnish or ice. Only their confirmed current selection can support the claim. No substitutions or automatic cocktail-to-mocktail conversions.

A later editorial module, **"One table, two choices"**, could pair independently published recipes sharing an ingredient: Cuba Libre and Roy Rogers both use cola. Each retains its own requirements and method. Show such cross-type pairs only under All, or after explicit user selection of both categories.

## Detail and making

1. Show name, clear cocktail/mocktail classification, modest recipe photo and only known metadata. Use the existing honest illustration fallback when no photo exists.
2. Put "Ingredients" and "Start making" jump links near the title; return to results with the previous filters and position preserved.
3. Keep exact recipe quantities and existing approximate-metric annotations together. Do not add scaling until every relevant quantity can be handled reliably.
4. Retain checklist and step mode, with large Previous/Next controls, "Step X of Y", "View all steps" and optional supported keep-awake. On mobile, the sticky making bar must not cover content or keyboard focus.
5. Keep unknown allergens/caffeine explicit and avoid interpreting "none listed" as absence. Put provenance/source context where it can be found without overwhelming the making flow.
6. Preserve authenticated Save and private notes. Move community below the practical recipe flow; show only real approved feedback. No rating placeholders or fabricated popularity.

## Reasons to return

Start with existing saved recipes and notes: finding a useful recipe again is a complete return journey. Later proposals are **on-device pantry**, **on-device saved recipes**, and **resume making**; none should be described as already implemented guest features.

If adopted, label local storage "On this device", provide Clear, handle blocked storage without losing the current session, and never promise account sync. Keep it distinct from existing authenticated saves; resolve migration/merge behavior before delivery. Ask before resuming a prior step, allow Start over, and revalidate recipe eligibility before showing restored recipe content. Pantry items remain user-maintained, with no assumed depletion or replenishment.

Fresh editorial selections can create occasional discovery as the reviewed catalogue grows. Avoid daily streaks, drinking milestones, push reminders to consume, rewards for cocktails tried or infinite feeds. Measure usefulness, not frequency of alcohol consumption.

## Empty, loading and error states

| State | Response |
|---|---|
| No filter matches | Keep selections visible; offer removal of one filter or Clear filters |
| No pantry match | Explain that no selected recipe has a complete match; show one-away only when validated |
| Incomplete pantry data | "Some recipes are not included in ingredient matching yet"; link ordinary browse |
| No selected recipes published | Honest empty library, no drafts or invented examples |
| Network/read failure | Retry and preserve selections; never report this as zero matches |
| Recipe removed/unpublished | Unavailable message and return to eligible results; do not revive cached content |
| Local storage unavailable | Session continues; explain that progress cannot be retained on this device |
| Loading | Keep current content stable, mark results busy and announce the updated count once |

## Delivery order and boundaries

- **First: visual and browse improvement.** Shared editorial styling, compact entry, explicit type control, existing search, filter-respecting suggestions, three factual explanations, detail hierarchy and preserved navigation. Add reviewed ingredient/method facets only where the data supports them.
- **Next: pantry pilot.** Audit requirements for the small eligible set, then session-only Use what I have. Document ambiguous recipes and exclude them from confident matching. No catalogue expansion is required.
- **Later: one-away and local continuity.** Add only after requirement fixtures pass and the owner chooses device/account save behavior. Pair modules are optional editorial content.
- Keep database publication, new backend features, dependency changes, party-planner integration and wider site redesign outside this plan. Preserve existing server actions and authentication behavior. No application work in this checkpoint.

## Acceptance criteria for implementation

- In a five-person mobile usability check, at least four can choose a mocktail and open its ingredients within 30 seconds without prompting; at least four can explain why a suggested recipe appeared.
- At least four of five can return to the same result set, find a saved recipe, and enter/exit step mode without losing their place. Evaluate existing authenticated saving separately from any later device proposal.
- At 320, 390, 768 and 1440px: no horizontal overflow; actionable targets at least 44px; visible keyboard focus; labels and selected states available to assistive technology; contrast meets WCAG AA; reduced motion honored.
- Core eligible browse/search/detail remains usable without JavaScript. Enhanced pantry/random/resume controls fail gracefully; a browser Back action restores filters.
- Fixture checks prove every displayed suggestion respects every active filter; no drafts, duplicates, invented fields or unpublished saved content leak into recommendations.
- Pantry fixtures include missing ice, missing garnish, lime versus juice, unknown ingredient name, uncertain quantity and missing equipment. Only complete confirmed requirements can produce a confident ingredient match; exactly one missing requirement yields one-away, with quantity/equipment caveats.
- Build, standalone TypeScript, focused behavior checks, production browser smoke and whitespace validation are required when implementing. This document sets targets, not test results or an award promise.

Planning verification: source inspection and documentation whitespace check only; no app build, TypeScript or production smoke is required for this documentation-only checkpoint. Data completeness and owner preference for local continuity remain implementation prerequisites.
