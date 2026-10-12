# Jaipur planner Supabase move

## Latest status — authorized 1,311-row live replacement and local verification complete; Vercel not deployed (2026-10-04)

The authorized replacement is complete locally: `public.planner_products` and
`public.planner_products_candidate_20261004` each contain the same 1,311 rows
across 18 categories with fingerprint `25f648be7971db22b9d50779f4b6ddb2`.
Independent SQL found zero full-outer row differences and zero overlap with the
old IDs. The authorized flagged row `JPR-E3EEB807D525` is included. Protected
`public.planner_products_backup_20261004` retains the historical 1,638-row
catalogue with fingerprint `aab3104f0995a815c0b794288bd98e5d`.

`python scripts/jaipur-planner-updated-import.py --verify-live` passed full
paginated REST reconciliation against the workbook payload for every field and
all 1,311 rows; anonymous REST access returned 401. The live evidence is
`output/jaipur-replacement-1311/live-verification.json`, and the complete final
hashes, commands, security assertions, results, and limitations are in
`output/jaipur-replacement-1311/final-verification.json`. The server-only live
reader, focused checks, standalone TypeScript, Corepack production build,
whitespace check, and corrected local production gate smoke on port 3166 passed.
That smoke returned HTTP 200, showed the gate, withheld `JPR-00834827D38C` before
eligibility, and stopped the server.

`drinks` remains 9,462 rows / `54575d121506d7ad163ec84120aedcaf`; `party_plans`
remains empty / `d41d8cd98f00b204e9800998ecf8427e`. Live and candidate have RLS
enabled with no policies, deny anon/authenticated reads, and grant service role
only `SELECT, INSERT`; the backup grants service role `SELECT` only. Inherited
source defaults are removed on all three tables. No Vercel deployment,
deployment verification, or commit occurred; the owner accepts possible
fail-closed partner-review behavior until a separately authorized deployment.
The row-by-row [category review](jaipur-product-category-review.md) is historical
evidence for the protected 1,638-row backup, not the new replacement.

All prior status and plan sections below are historical and superseded wherever
they characterize the 1,311-row replacement, local integration, or final
verification as pending.

## Latest status — local import and integration completed; development deployment unverified (2026-10-03)

The protected `public.planner_products` import is complete and the local
planner integration now uses server-only `readCatalogue()` in `getCatalogue`,
`validatePlan`, and `savePlan`. It preserves the eligibility gate and
historical snapshots, uses trusted live prices for new validation/saves, and
fails closed with a safe generic error rather than falling back to bundled
JSON. Exact live reconciliation confirms 1,638 Jaipur 2026–27 Official-MRP
products, including 227 unclassified products; the post-switch independent
review found no blocking code defects.

The local development secret exists, but no secret value is recorded here.
The owner reports development deployment configuration; it was not
independently verified, and no deployment or commit occurred. The checkpoint-A
preparation, prerequisite, owner-setup, and future-switch text below is
historical and superseded where it describes import or local integration as
pending. The category review remains
[jaipur-product-category-review.md](jaipur-product-category-review.md).

## Checkpoint A — protected import preparation (2026-10-03)

The owner supplied a valid server-only `sb_secret_` key and verified the
configured project URL. Checkpoint A prepared, without DDL or live writes:

- `output/jaipur-supabase-move/schema.sql` defines `public.planner_products`
  with the six existing planner fields (`id`, `category`, `name`, `brand`,
  `size_ml`, `price_paise`), positive integer checks, fixed Jaipur city, and
  Rajasthan 2026-27 official-MRP source metadata. The source note states that
  stock availability was not verified.
- `scripts/jaipur-planner-supabase-import.py --prepare` imports the existing
  extractor with `importlib`, requires exact workbook-to-checked-in-JSON
  equality, preserves all 1,638 unique IDs and 227 `Other / Unclassified`
  products, and writes a local payload, sorted expected IDs, hashes and
  baseline evidence under `output/jaipur-supabase-move/`.
- `--verify` uses only the `apikey` header, rejects a project URL mismatch,
  denies anonymous reads, reads the target in stable pages larger than 1,000,
  and reconciles every field. `--import` first requires an empty target (or
  an exact existing dataset), then performs one guarded POST and reconciles
  the complete paginated readback. It never upserts or touches other tables.
- Baseline copies of the current planner actions and focused checks are saved
  in the evidence directory before any future application switch.

No app switch, DDL, live import, dependency, environment, recipe or
`party_plans` change occurred in this checkpoint. Root review and explicit
execution of the SQL/import remain pending.

## Verified prerequisite status

On 2026-10-03, the connected Supabase tool successfully queried project
`ojptrukzildmkilwponx` (dashboard name BrewList), matching the app's configured
project. There is no planner-products table in the inspected public/private
schemas. `SUPABASE_SECRET_KEY` is absent from the current process and local
Next.js development environment files. Development deployment credentials
remain unverified because its hosting provider and project have not been identified.

Connector authorization does not configure the Next.js server environment.
No DDL, import, app switch, credential edit, commit or deployment has occurred.

## Owner setup

1. Open https://supabase.com/dashboard/project/ojptrukzildmkilwponx/settings/api-keys
   and use the Publishable and secret API keys tab. Create a named backend secret
   key if needed; use an `sb_secret_` key, not a publishable key.
2. Privately add `SUPABASE_SECRET_KEY=<actual secret value>` to the repository-root
   `.env.local` in your editor. The placeholder is not a usable credential.
   This file is already ignored by Git. Keep the existing URL and anon key.
3. Configure `SUPABASE_SECRET_KEY` as a server runtime secret for the development
   deployment, scoped to that environment. Prefer a separate named key for that
   server. Its Supabase URL must match this project. Never use `NEXT_PUBLIC_`.
4. Restart the local development server after saving. Report only that setup is
   complete and the hosting provider/project name; never share the key in chat.
   Deployment/redeployment remains a separate owner-authorized action.

Reference: https://supabase.com/docs/guides/getting-started/api-keys

## Implementation contract after credentials are verified

1. Verify credentials through a read-only server request without logging keys.
   Reinspect the live schema, grants and policies immediately before DDL.
2. Create a separate `public.planner_products` table with RLS enabled, no client
   policies, and explicit revocation of privileges from PUBLIC, anon and
   authenticated. Grant only the necessary service_role operations. Public schema
   placement supports the existing REST transport; it must not confer public
   access. Test direct anonymous/authenticated catalogue reads are denied.
3. Preserve workbook IDs and all six existing Product fields; use integer paise
   and positive integer sizes with database constraints, Jaipur city and honest
   source metadata. Preserve all 227 unclassified products and the 22 reviewed
   reclassifications. No stock inference, invented categories or product omissions.
4. Build the payload client-side from the workbook using the existing validated
   extractor. Require exactly 1,638 unique IDs, valid fields and exact agreement
   with the checked-in catalogue. Record a source/payload hash and expected IDs.
   Require an empty new target before insertion; abort on conflicting rows. Use an
   atomic insertion where practical. If transport requires batches, keep the app
   unswitched until every batch and the complete table pass reconciliation; a
   retry must verify existing rows, never blindly overwrite or delete them.
5. Read back all rows with explicit pagination beyond Supabase's default page
   limit. Reconcile count, exact ID set and every product field against the payload.
   Verify grants/RLS and unchanged recipe/snapshot data. Preserve import evidence.
6. Only then add a server-only catalogue reader using SUPABASE_SECRET_KEY in the
   apikey header. Retain eligibility checks before fetching products, validate
   database results, and fetch the complete catalogue with stable pagination.
   Use it in getCatalogue, validatePlan and savePlan for trusted prices. On missing
   credentials, network errors or invalid/incomplete results, fail closed with a
   safe error; never silently fall back to bundled prices.
7. Keep historical snapshot validation based on the saved snapshot. Unavailable
   draft IDs must be identified to the owner of the draft and excluded from valid
   new plans until resolved. Preserve auth, consent, OTP, ownership, concurrency
   checks and all Find My Drink and early-access behavior.
8. Run extractor/review checks, focused tests covering live-read failures and
   trusted pricing, standalone TypeScript, production build, whitespace check,
   production eligibility smoke test and final live readback. Obtain the required
   director review before declaring implementation complete. No commit/deploy.

The row-by-row category review is [jaipur-product-category-review.md](jaipur-product-category-review.md).
