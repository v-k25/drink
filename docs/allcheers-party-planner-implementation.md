# Party Planner implementation checkpoints

Status: local implementation and verification completed 2026-09-15; connection restored and the additive party_plans migration applied 2026-09-17; phone OTP/SMS provider configuration and an owner-operated login test remain before durable saves are live.

## Frozen decisions

- Owner selected host-entered pack quantities, with no serving recommendation, and mobile OTP for durable saving.
- Owner approved regional eligibility confirmation with a decline path to the homepage; no fixed age is inferred. Enforce before the server releases the catalogue or calculates/saves a list.
- Revised plan's four steps, budget/swap preview, category search, native print/share, explicit over-budget states and snapshots are the implementation scope.
- Preserve marketing homepage and its styles, assets, signup action and data. New route is `/party-planner`; no homepage launch claims or navigation change during this checkpoint.
- Existing EkQuarter Supabase project only. New persistence is additive. No environment or dependency edits, no existing table changes and no real SMS or user-data writes during tests.

## Catalogue audit

Read-only audit of `EkQuarter_Drink_Master.xlsx` found 507 rows with 507 unique IDs; all cities are Jaipur; all prices and sizes are positive numeric values. Categories: Beer 75, Brandy 21, Champagne 10, Gin 70, Rum 63, Sake 7, Scotch 86, Tequila 44, Vodka 98, Whisky 33. Listed prices range from Rs 99 to Rs 263,300. Workbook SHA-256: `a7161f5d3f502f615956ded3ab3ea90c9d0d28740b8c5ba5f89911e1bea09607`.

`app/party-planner/catalogue.json` is a minimal projection: ID, category, name, brand, size in ml and integer price in paise. Sort: category, price, name, ID. No ratings, descriptions, competitor URLs or images are included. Source data stays unchanged. This is structural validation, not verification of current prices, availability or rights. Price verification date is unknown; alcohol-free coverage is absent. Text product cards avoid using images whose reuse rights remain unresolved.

## Checkpoints and contracts

1. **Calculation core:** pure validation and integer-paise arithmetic, complete one-product-per-category baskets, immutable original budget, exact shortfalls, shared export text. Operational limits: 1-1,000 guests, 1-1,000 packs per category, positive budget up to Rs 10 lakh, ten categories maximum. These are application bounds, not consumption advice. Runnable assertions cover invalid inputs, tampering, exact-fit and swap shortfalls.
2. **Four-step UI:** isolated CSS module and route. Blank guest/budget fields; host-entered quantities; explicit selection, persistent selections/back editing, category-local search, affordable/over-budget swap previews and quantity-review notice on pack change. Complete valid lists may remain over budget, visibly labelled. Eligibility confirmed before catalogue access. Native print/share with usable copy fallback, no login needed for guest result.
3. **Durable saves:** Supabase phone OTP and verified server sessions; owner-scoped saved-list CRUD, snapshots, idempotent new saves and optimistic update conflicts. Saved prices remain unchanged until explicit repricing. Draft retained through login errors/expiry; no false save success. Additive `party_plans` migration, never a waitlist migration.
4. **Integrated verification:** one executor runs build and standalone TypeScript; root reviews changes and production browser behavior at mobile/desktop sizes. Check arithmetic, mocked backend/auth, existing early-access regression, print/share, keyboard access, error recovery and preservation hashes. Graphify refresh and progress update after completed checkpoint.

Two bounded Luna executors own disjoint files: one core/UI, one auth/persistence. Root owns catalogue projection, contracts, review and progress notes. No racing builds. Findings go back to the same executor, with at most two repair cycles before reassessment.

Workflow exception: Astra rejected the first UI delivery for missing save/reopen, recovery and swap behaviors. Luna hit its usage limit when sent repair cycle 1. The owner asked to continue; Astra disclosed the exception and completed the bounded UI repairs. Backend fixes returned to the original Luna executor. Astra reviewed and tested the final implementation; no separate agent reviewed Astra's UI repair.

## External setup and launch readiness

Both sandboxed and approved read-only `/auth/v1/settings` attempts failed; the latter reported DNS `ENOTFOUND`. No credentials were printed or edited. Live OTP/provider configuration and database state cannot be verified from this environment yet.

Prepare and inspect the SQL migration and mocked tests first. Applying migration/configuring SMS requires working project access. No SMS is sent by the agent; a later owner-operated test is required. Price-maintenance ownership, source content rights and live authentication/persistence verification remain launch requirements; local passing tests do not resolve these.

## Local review and activation

- Open `/party-planner` on the development or production server. The homepage remains unchanged and continues to describe the planner as upcoming; it does not link to this route yet.
- Restore the existing project's hostname/connection through the environment or connected tools, without exposing keys in chat. Completed 2026-09-17 via connected Supabase tools after initial wake-up timeouts; no credentials were exposed or edited. Environment files were not edited.
- Review and apply `supabase/migrations/20260914_party_plans.sql` to that same project once connected. Applied verbatim 2026-09-17 and recorded as migration `20260917033539`; verification confirmed row level security, four owner-scoped authenticated policies, the active updated_at trigger and no anon grants. It creates only the planner table, its trigger function and timestamp trigger, ownership policies and the authenticated DML grant; it deliberately fails if the table name already exists. No waitlist or product-source data is modified.
- REMAINING OWNER STEP: enable/configure phone OTP and its SMS provider in the existing project's Auth settings, using the project's delivery/rate-limit settings. See [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login). Then perform one owner-operated login and save/reopen on the connected deployment; no real SMS test was performed by the agent.
- Run `node scripts/party-planner-check.cjs`, `node scripts/party-planner-backend-check.cjs`, `node scripts/early-access-check.cjs`, production build, standalone TypeScript and whitespace checks. Do not run the test mock upstream as a real service.

Production browser review covered eligibility, decimal/invalid input, categories, search retention, whole-basket swap preview, pack-size review, over-budget output, back/edit, request-abort recovery, copy fallback, mobile layout and native print. The isolated upstream at port 3101 exercised OTP, cloud-save API wiring, snapshot open, explicit edit/reprice, reload, delete and signout using test-only in-memory records; it does not prove live provider availability. Screenshots and a one-page print PDF are under `output/playwright/allcheers-planner/`.

The SQL migration separately passed real PostgreSQL owner/cross-user/anonymous/stale-update checks in an isolated workspace cluster. Durable production saves are not live until the existing Supabase project is reachable and migration/provider setup is complete. The planner uses the supplied historical catalogue projection; it does not claim verified current prices or stock.
