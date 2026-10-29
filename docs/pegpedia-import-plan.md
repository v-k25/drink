# Pegpedia catalogue import and Find My Drink data plan

Owner request: 2026-10-14. Collect Pegpedia drinks missing from our catalogue in the existing Supabase database, using Scrapling, and delegate implementation to GPT-6 Luna at medium effort after planning. Preserve existing data. New schema needs explicit checkpoint approval per AGENTS.md.

## Verified findings

- Pegpedia advertises 13,951 products across nine alcoholic categories. Its developer page links https://pegpedia-api.onrender.com/docs. Public GET /products accepts limit <=100 and offset; product rows include name, brand, category, type, bottle volume and nullable bottle ABV. GET /prices?product_id=... includes location, source, effective date and verification state.
- Website and API robots.txt return 404. Terms contain no explicit scraping prohibition. No separate public API service or bulk licence is advertised. Read public factual metadata conservatively; retain provenance and do not copy descriptions, reviews, photos or user data.
- Target project ojptrukzildmkilwponx (BrewList): planner_products contains 1,311 entries, 18 categories and only Jaipur prices. Its city constraint requires Jaipur, price and size must be positive, and it has no ABV/provenance fields. The loader rejects more than 5,000 rows. drinks is a separate recipe table.
- Bottle ABV is not recipe ABV. Public schemas do not expose recipe quantities or mood/taste ratings. A source category defect was observed: Absolut Citron displayed as Whiskey. Source facts need validation.

## Scope and acceptance

1. Crawl all public beverage product pages through Scrapling MCP using resumable bounded pagination, modest pacing, retries/backoff, and stop on access refusal. Record timestamps, URLs, counts and hashes. Check distinct IDs, pagination stability and category totals; never call partial results complete.
2. Read all planner_products for comparison. Normalise case, whitespace, punctuation and explicit trailing bottle-size tokens; preserve age, flavour, edition and actual size. Exact unique name/size matches link to existing IDs. Fuzzy matches and aliases need review. Detect source duplicates. Preserve all original rows.
3. Save factual candidates, overlap links, unmatched and ambiguous reports, ABV coverage and category conflicts. Unknown stays null. Never pass a national minimum or other-state price off as Jaipur pricing.
4. Prepare supplemental catalogue storage in the SAME database for nationwide/unpriced products and metadata. Produce concrete SQL for owner approval before applying new schema. Link existing products instead of duplicating their catalogue identity. Use RLS and server-only access.
5. New planner_products rows need reviewed exact Jaipur price, positive size, a valid existing category mapping and a non-duplicate identity. Rajasthan-only pricing is not automatically Jaipur pricing. Store source/date in the approved supplemental structure. Zero qualifying rows is a valid finding.
6. Parent reviews payloads before remote writes. User authorizes eligible additive imports. New schema still requires checkpoint approval. Import other validated factual records into approved supplemental storage with stable source IDs, transactional batches and readback reconciliation; no destructive upserts. Uncertain matches/classifications remain pending review.
7. No UI redesign in this task. Update guided discovery planning with actual coverage: mood/occasion/taste -> supported base suggestions -> selected base/brand -> recipes containing it. Bottle ABV can support bottle filtering; finished-cocktail strength still needs recipe amounts, ingredient ABVs and dilution/review. Pegpedia does not by itself fill taste/occasion gaps.

## Checkpoints and ownership

- P1 parent: source/schema audit, plan and progress entry.
- P2 Luna medium: scripts/pegpedia/ acquisition, matching and import preparation plus meaningful self-checks; output/pegpedia/ snapshots, provenance, candidates and coverage; docs/pegpedia-import-report.md; proposed SQL under scripts/pegpedia/. Worker makes NO remote writes during preparation.
- P3 parent: review coverage/matching, tests and SQL. Obtain explicit approval for concrete new-schema checkpoint if necessary. Apply eligible additive inserts after review and approved new schema only after approval.
- P4 parent: verify counts, hashes, original-row preservation and repeat-run safety; update report, guided plan and progress with exact inserted/skipped/blocked totals.

## Verification

Cover normalization, size variants, age/flavour/edition preservation, null and invalid ABV, source duplicates, uncertain matches, category conflicts, Jaipur price eligibility, SQL escaping and idempotence. Reconcile source totals and remote readback. Required build, standalone TypeScript, git diff --check and Graphify remain pending if terminal startup still fails; no alternative-shell retries or claims of passes. No UI changes are planned. No commit, deployment, dependency, environment, early-access, recipe or unrelated source changes.

## Sources

- https://www.pegpedia.dev/
- https://www.pegpedia.dev/developers
- https://www.pegpedia.dev/terms
- https://www.pegpedia.dev/data-sources
- https://www.pegpedia.dev/copyright
- https://pegpedia-api.onrender.com/openapi.json

## Status

P1 and P2 complete; P3 active-agent preparation review passed on 2026-10-15. GPT-6 Luna at medium effort acquired 13,951 distinct source IDs. All 145 saved page hashes reconcile, with one preserved boundary-recovery probe. The verified preparer reports 413 exact links, 193 ambiguous records, 13,342 unmatched candidates and 3 category conflicts; unmatched does not establish that a product is genuinely new. All records remain pending_review. ABV exists for 767 products (5.5%) and for only 18 exact overlaps with our catalogue. Product-specific prices have not been fetched.

The actual Scrapling acquisition method is documented in scripts/pegpedia/acquisition-reproduction.md; no unverified standalone crawler is retained. See docs/pegpedia-import-report.md and output/pegpedia/preparation-verification.json. Parent independently checked all candidate IDs, source name/size/ABV equality, unique planner links, source dates and payload hash, and ran the current preparer self-check. Repeated runs reproduce the same payload hash and preserve the original crawl manifest.

Remaining: explicit owner approval for scripts/pegpedia/proposed-supplemental-schema.sql and additive import into public.pegpedia_catalogue in the existing project, then remote readback/RLS checks and original-row preservation checks. No table, database rows, UI, credentials or dependencies have been changed. Build, exact standalone TypeScript, git diff --check and Graphify remain unrun after terminal process creation failed.
