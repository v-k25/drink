# Find My Drink guided discovery: B12 contract

> **Superseded for Guide me, 2026-10-31.** The owner made finding the base spirit the main goal of Find My Drink. Guide me is now a spirit quiz (drinking? then flavour, feel, how you drink, occasion) that ends on a best match out of nine (gin, vodka, rum, whisky, tequila, brandy, wine, beer, liqueur) and then suggests its cocktails; not drinking goes from flavour to mocktails. Scoring and profiles are in `app/find-my-drink/spirit.ts`. Acceptance items 1 and 3 below (type then taste, the edit-preferences sheet, mixed sections) no longer apply to Guide me. Surprise me, Browse all, Use what I have, the recipe page, the reviews and the publication rules below still apply.

Approved implementation request: 2026-10-14. Build now; retain drinks and the current dark warm-gold Tool Night design.

## Scope and interfaces

- Preserve queries.ts and its publication predicate, eligibility cookie, safeResultsHref, detail/making/metric behavior, Planner, early-access action, credentials and dependencies.
- Add a pure discovery module over validated RecipeRow[] and signed editorial records. Return ranked recipes, fixed reason codes and coverage. No metadata may publish a row.
- Add versioned taste/base/path reviews for all 50 recipes; inspect ingredients and preparation. Review all 15 mocktail pantry paths; unresolved alternatives remain disabled with a recorded reason. Claims expire on source-content change.
- Add entry/guided/random routes in the existing page and keep legacy browse query URLs and no-JavaScript browse working. Bound URL preferences; keep pantry storage separate.
- Reuse RecipeCard, pantry checklist, shared tokens and random helper. Extend their callers/tests only where needed.
- No brand step, bottle matching, group size, scaling, substitutions, ABV, new dependencies, endpoints, schema or writes. Occasion scoring supports reviewed mappings, but no occasion UI until owner-approved wording exists.

## Acceptance

1. No default alcohol choice. Type then up to two supported tastes (or Any) produces three recipes, or up to three per independent mixed section. Taste and occasion affect score, not eligibility.
2. Score = 10 per taste + 2 for approved occasion, then featured/name/ID. Explicit base affects cocktails only; exact subtypes stay distinct in pantry. Beer is honestly empty; champagne is one recipe.
3. Optional refinements have Any; only useful controls appear. Edits preserve answers and use Apply/Cancel, a complete modal below 1024px, focus restoration, visible base-clear notice. Mixed sections can have separate tastes.
4. Pantry separates exact, measured one-away and other/unaudited results, with visible quantities, equipment/quantity caveats, required ice and garnish.
5. Surprise me uses type only, one uniform choice, no repeats until Start again; restored IDs are intersected with the current eligible pool. Guided answers survive switching modes.
6. Recipes remain linked through safe return URLs. Published browser includes unresolved mocktails; new recommendations exclude them. Unknown metadata stays unknown.
7. Visible focus, labelled fieldsets, 44px controls/48px primary actions, reduced motion, polite result updates, no covered content, responsive 360/390/768/1024/1440px, short desktop and 200% text.

## Priority follow-up: alcoholic drink strength (deferred until data is ready)

Owner request: 2026-10-14. Implement strength filtering as soon as reviewed data supports it. The ABV exclusion above applies to the current MVP; this follow-up remains pending.

- **Current blocker:** the read-only live check on 2026-10-14 found an existing drinks.abv field, already read by the application, but no recorded values for any of the 35 published cocktails or 15 published mocktails. Unknown ABV must not become zero or a guessed strength.
- **Data needed:** reviewed finished-drink ABV or a defensible reviewed strength classification, with source, review date and calculation basis where applicable. Calculated ABV needs quantities and ABVs for all alcoholic ingredients, total finished volume and explicit dilution assumptions. Check coverage before enabling the control; do not infer strength from base spirit, colour or refreshing taste. An LLM is not required.
- **Readiness trigger:** reviewed data exists for the recipes offered through the strength filter, category thresholds and wording are agreed, and missing-data handling is verified. Prioritise this follow-up once those conditions are met. Any database writes or schema work still require separate owner approval.
- **Intended flow:** after choosing an alcoholic base, let users select a strength preference (provisional labels: lower, medium, higher, or Any). Match both the chosen base and strength; use taste to rank the remaining recipes. Strength means alcohol concentration in the finished drink, separate from flavour/body and bottle ABV. Label estimates clearly.
- **Acceptance:** never silently relax a selected base or strength; explain an empty match and let users change their choices. Recipes with unknown strength are excluded from a specific strength filter and remain available under Any without a strength claim. In mixed mode, strength affects only the alcoholic section. Keep the type-only Surprise me shortcut. Preserve strength selections when editing answers or returning from a recipe.
- **Verification before release:** check classification boundaries, missing/invalid/stale data, combined base and strength filtering, mixed-mode isolation, empty states and return navigation; run the required build, standalone TypeScript and production UI checks. Do not show a working-looking strength control before the data is ready.

## Pegpedia dropped — 2026-10-30

The owner dropped the Pegpedia catalogue import: its data lacked the taste, occasion and finished-drink strength information Find My Drink needs. No table was ever created. The import plan, report and scripts were removed from the repo; they remain in git history (commit f3bae48).

## Checkpoints

1. Contract and stale docs corrected.
2. Editorial metadata/pantry review and assertion harness.
3. Ranking, query state and random behavior.
4. Guided UI and browse integration.
5. Integrated review: build, exact standalone TypeScript, git diff --check, recipe browse/discovery/detail/metric/pantry/pantry-browser, Planner backend/catalogue and early-access, production responsive/browser screenshot checks. Refresh Graphify after implementation checkpoints.

Terminal process creation currently fails before commands start. Do not retry through other shells. In-process source checks can provide partial evidence but do not replace the required production checks.

## Implementation evidence and remaining checks

Checkpoints 1–4 are implemented. See docs/implementation-progress.md for the read-only catalogue review, in-process assertions, source review and verification limits. Checkpoint 5 remains open: terminal process creation fails before commands start.

When the standard terminal environment is available, run the required production build, exact standalone TypeScript and git diff --check; then node scripts/recipe-guided-check.cjs and node scripts/recipe-guided-browser-check.cjs plus the existing recipe and backend regressions. The browser harness uses the existing PLAYWRIGHT_MODULE/PLAYWRIGHT_CHROMIUM_EXECUTABLE settings and only mocked catalogue reads, rejecting remote writes. Inspect its screenshots, then refresh Graphify. No new dependencies are needed.
