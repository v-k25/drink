# Recipe quality checkpoint

Current status (2026-09-28): the six reviewed recipes are now published following
the owner's request to finish Phases 0–3. The other 9,444 imported drafts and 12
legacy records remain hidden. See `docs/recipe-launch-review.md` for review and
publication evidence; the checkpoint below describes the earlier draft-only state.

The database contains 9,450 imported drafts plus 12 legacy records. Essentials
enrichment covers every imported draft. Six source-reviewed drafts now have
recipe-specific preparation, descriptions, glassware/garnish where specified,
and corrected ingredient details. The remaining 9,444 imported recipes still
require preparation and classification review. Unknown allergen, caffeine, ABV
and taste fields remain unknown; completeness does not justify fabricated facts.

Reviewed drafts and source evidence: `output/recipe-curation/reviewed-drafts.jsonl`
and `evidence.jsonl`. Original six-row snapshot: `remote-before.jsonl`.
Reproduce the local check with `python scripts/recipe-catalogue/curate_recipes.py`.

Applied remote migration `recipe_quality_publication_gate` adds readiness and
requires published status, readiness, classification, provenance, empty quality
issues, and nonempty ingredients/preparation. Anonymous/authenticated access is
SELECT-only. All six remain drafts with `publication_review_pending`; no recipes
were published. Legacy rows remain stored but are hidden until reviewed.

Detail UI shows known yield, preparation time, method, glass, garnish, ice and
explicit unknown allergen/caffeine information. Quantities stay unchanged.
Production browser check: `scripts/recipe-detail-check.cjs`, using the existing
Playwright installation and a local mock upstream, with screenshots in
`output/playwright/recipe-detail/`. Passed at 1440, 390 and 320px, with interactive
checklist/steps and no horizontal overflow or page errors. Build and standalone
TypeScript passed. Database rollback assertions proved an eligible trial row
visible and a flagged trial row hidden, without committing publication.

No deployment, commit, dependency installation or RAG installation. Publication
review of the complete catalogue remains outstanding. Live read-only browse/detail
smoke and query regression passed with network access; the initial sandbox attempt
could not reach Supabase (EACCES). Whitespace check and Graphify refresh passed.
