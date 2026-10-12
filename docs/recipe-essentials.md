# Recipe essentials enrichment

`scripts/recipe-catalogue/enrich_essentials.py` reads the two authorized JSONL
extracts, reuses the accepted catalogue transform, and writes deterministic
source-derived review data to `output/recipe-essentials/`:

- `enrichment.jsonl` preserves the accepted ingredient and existing generated preparation arrays and adds conservative ingredient details, source yield/servings, source-explicit preparation evidence, a local unverified glassware suggestion when whitelisted, and quality flags. Glassware is not applied by the SQL batches; garnish is not recovered.
- `review-queue.csv` is the editorial queue; every row is flagged because the existing preparation is a generated template and source classification is not verified.
- `sql/enrich-*.sql` contains draft-only updates guarded by id, source URL, content origin, and exact original ingredient/preparation arrays. It is not applied by this script.
- `summary.json` reports counts.

Unknown quantities, units, servings, method evidence, glassware, and garnish are
`null`; blank values are never interpreted as zero. Amount strings are not
automatically scalable, and a source yield is not treated as a verified serving
size. Source instructions are
used only for narrowly extracted evidence and are never copied into public
preparation. The builder now emits `strength`, `sweetness`, `has_caffeine`, and
`allergens` as explicit `null` values, preventing database defaults from being
mistaken for facts. Apply `scripts/recipe-catalogue/essentials-schema.sql`
separately after review of the additive DDL.

| Field group | Current use | Deferred or review-only |
| --- | --- | --- |
| Existing name, ingredients, generated preparation, provenance | Preserved and guarded by exact source/core-field matches | Existing generated preparation remains unreviewed |
| Ingredient details, yield, servings, preparation method, quality issues | Enrichment and editorial queue | No automatic scaling or serving-size claim |
| Glassware | Local unverified suggestion only | Not applied; garnish not recovered |
| Strength, sweetness, caffeine, allergens | Explicitly unknown (`null`) | Must be editorially established |
| Taste, mood, occasion, preference and similar attributes | Not inferred | Deferred until separately sourced and reviewed |

The run produced 9,450 enrichment rows and 19 SQL batches. Verification already
completed: the self-check, fresh builder/validator (all checks passed), production
build, standalone TypeScript check, and `git diff --check` (existing line-ending
warnings only). No local PostgreSQL SQL smoke test was run; SQL application and
remote verification are handled separately.

Run the edge-case check with:

```text
python scripts/recipe-catalogue/enrich_essentials.py --self-check
```
