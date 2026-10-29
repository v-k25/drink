# Pegpedia catalogue import preparation

## Scope and method

P2 captured public beverage product facts from the API linked by [Pegpedia’s developer page](https://www.pegpedia.dev/developers), using the Scrapling MCP request-session tools. The endpoint is `https://pegpedia-api.onrender.com/products`; the saved API contract and category totals are in [api-contract.json](../output/pegpedia/api-contract.json) and [categories.json](../output/pegpedia/categories.json). The repeatable acquisition procedure and evidence contract are in [acquisition-reproduction.md](../scripts/pegpedia/acquisition-reproduction.md).

The crawl used category-filtered pages of 100 sorted newest-first, low request concurrency and pacing. It captured product IDs, names, brand, source category, product type, bottle ABV, volume, slug, fetch time and page URL. It did not fetch descriptions, images, ratings, reviews, user data or product prices. The saved planner baseline has 1,311 rows and SHA-256 `a249213ea061280b10e8e21ffd0ceae4bbb90a75d6ff8aabd44c2229371ea0be`.

## Acquisition reconciliation

Nine advertised categories total 13,951 products. The 145 primary pages contain 13,951 rows but one repeated Whiskey UUID at the 400/500 boundary, leaving 13,950 primary distinct IDs. Re-fetches of those pages repeated the same ID order. A separately preserved Whiskey offset-450 probe returned 100 IDs, 99 overlapping primary pages and one novel ID, Yamazaki 12 (700 ml). The union contains 13,951 unique source IDs and reconciles to every category’s advertised total:

| Category | Unique IDs | Bottle ABV present |
| --- | ---: | ---: |
| Beer | 909 | 83 |
| Brandy | 607 | 13 |
| Gin | 434 | 18 |
| Liqueur | 348 | 2 |
| Rum | 649 | 90 |
| Tequila | 368 | 0 |
| Vodka | 820 | 112 |
| Whiskey | 2,817 | 411 |
| Wine | 6,999 | 38 |
| **Total** | **13,951** | **767** |

All nine first-page ordered-ID rechecks were stable. Original page snapshots and the original crawl manifest were preserved. The page hash manifest covers all 145 page snapshots; verification hashes the compact parsed JSON rows, while saved page files are formatted JSON. The separate stability-recheck digests use a narrower projection and are not treated as whole-record hash comparisons.

## Match and coverage results

The preparer compares normalized full names and exact sizes, then requires compatible category families, brand identity and unique source/target candidates. It preserves age, edition and flavor distinctions and leaves fuzzy or possible duplicate identities for review. It never auto-merges source records.

| Classification | Source records |
| --- | ---: |
| Exact planner link | 413 |
| Ambiguous/manual review | 193 |
| Unmatched | 13,342 |
| Category conflict | 3 |
| **Total** | **13,951** |

All 13,951 source identities are present in the import candidate payload. All have `pending_review` import status. The 81 potential source-duplicate groups remain flagged for manual review; no source identity is silently collapsed. The three category conflicts are Absolut Citron variants classified as Whiskey by Pegpedia; they remain pending review and must not be used for recommendations or active Planner links. Exact planner links are unique and use planner product IDs as text.

Bottle ABV is present for 767 records (5.5%) and absent for 13,184; volume is present for 13,235 and absent for 716. Among the 413 exact planner overlaps, only 18 have Pegpedia bottle ABV and 395 do not. Null values remain null. Bottle ABV is product metadata and is not used as finished-cocktail ABV.

No product-specific `/prices` requests were made. Jaipur eligibility is `not_evaluated`; the prepared data does not establish the absence or presence of Jaipur prices. No non-Jaipur price is treated as Jaipur evidence.

## Prepared artifacts and boundary

- [prepare-import.mjs](../scripts/pegpedia/prepare-import.mjs) transforms saved evidence into a deterministic, facts-only candidate payload and reports.
- [proposed-supplemental-schema.sql](../scripts/pegpedia/proposed-supplemental-schema.sql) proposes an additive server-only table with RLS, service-role-only access, provenance, review/match state and insert-only rerun guidance. It has **not** been executed. New-schema owner approval remains pending.
- [ingestion-candidates.jsonl](../output/pegpedia/ingestion-candidates.jsonl) contains all source IDs, provenance, match classification, empty price evidence and pending review status.
- [manifest.json](../output/pegpedia/manifest.json), [preparation-verification.json](../output/pegpedia/preparation-verification.json), and the match/category JSONL reports provide reconciliation and hashes.
- [unique-source-products.jsonl](../output/pegpedia/unique-source-products.jsonl) is the deduplicated UUID set; [source-products.jsonl](../output/pegpedia/source-products.jsonl) is the raw page concatenation, including the repeated boundary row.

No remote database mutations were made. The next checkpoint is parent review of the concrete SQL and candidate payload, followed by explicit owner approval of the supplemental table. After that, Jaipur price reads should be limited to reviewed candidates where local eligibility is being established, before any additive planner import is considered. Existing planner rows are not overwritten or deleted.

## Checks and limits

The preparer’s 18 focused in-process assertions passed, covering normalization, numeric validation, size handling, SQL escaping, conservative matching, category conflict, location eligibility and repeat identity. Two fresh module loads produced the same payload SHA-256: `813b29136ffa48a7c4d8dbbf54235ac9e41001d441870555f379a84a9e6a0d92`. All 145 saved page canonical hashes matched; candidate UUIDs are unique and all candidates remain pending review with empty price evidence. A fresh preparation run left the original crawl manifest SHA-256 unchanged. Static checks confirmed that every candidate field maps to the proposed table, the planner ID is text with a foreign key, the exact-link check is bidirectional, and grants are limited to service_role. The full build, standalone TypeScript check, git diff check and SQL application were not performed. The repository terminal launcher had already failed before command execution with `CreateProcess helper_unknown_error`; no alternate-shell retry was made.
