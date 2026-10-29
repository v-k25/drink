# Pegpedia acquisition reproduction

The captured catalogue was acquired through Scrapling MCP request-session tools using the public endpoint linked from https://www.pegpedia.dev/developers. This records the verified method; it does not claim a checked-in crawler was runtime-tested.

## Request procedure

- Read the API contract and category counts from output/pegpedia/api-contract.json and categories.json. The nine advertised categories total 13,951 products.
- Open one Scrapling request session and issue low-rate GET requests to https://pegpedia-api.onrender.com/products?category={slug}&limit=100&offset={offset}&sort=newest, advancing offsets by 100 until each category count is reached. Use public product facts only. Do not fetch descriptions, images, reviews, user data or prices. Back off on 429/refusal and do not bypass it.
- Save each response as output/pegpedia/pages/{category}-{offset}.json with request URL and fetch timestamp in crawl-pages.jsonl. Validate returned category and page count. The original crawl manifest is preserved unchanged.
- Re-fetch each category first page and compare ordered product UUIDs. Re-fetch Whiskey offsets 400 and 500 to diagnose the repeated boundary UUID. Probe Whiskey offset 450 separately, preserve the full facts response, union UUIDs, and reconcile distinct IDs against advertised category totals.
- Recompute SHA-256 over JSON.stringify(parsed saved page rows) and compare with page-hash-manifest.json. The saved page files are formatted JSON. Do not compare factual JSON hashes from differing field projections. stability-rechecks.jsonl digests used a narrower projection; its same flag and page-stability.json concern ordered UUIDs.

## Captured evidence

crawl-pages.jsonl retains the original 145 page fetch records. source-products.jsonl is the 13,951-row raw concatenation and includes one pagination duplicate. unique-source-products.jsonl contains the deduplicated 13,951 UUID set after adding the single novel UUID from the Whiskey offset-450 probe. The probe has 100 UUIDs: 99 overlap primary pages and one novel Yamazaki 12, 700 ml. Category distinct counts reconcile to advertised totals. Original evidence snapshots are not overwritten during preparation.

The preparation script consumes these saved artifacts and the full planner snapshot; its output manifest includes source and payload hashes and count reconciliation. The acquisition itself was conducted through Scrapling MCP. No Python runner is included because the initially drafted runner could not be validated reliably in this environment.
