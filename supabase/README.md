# supabase/

Database definition for Socifer, on the existing EkQuarter Supabase project.

`migrations/` describes what the `public` schema **should** be. All four files
are baselines: they document objects that already exist remotely, were read
back from the remote on 2026-10-13 (waitlist and profiles re-verified read-only on 2026-10-29: no drift), hold structure only (no row data) and must
not be re-run blindly against the remote project. They reflect the remote after
the B9 Step 2 clean-up (2026-10-13). New work goes in new, later-dated migration
files. The read-only introspection query used for the readback is
`docs/b9_readonly_introspection.sql`.

| File | Object | Used by |
|---|---|---|
| `20260801_waitlist_subscribers_baseline.sql` | `waitlist_subscribers` (insert-only email capture) | `app/early-access/actions.ts` (anon key) |
| `20260801000001_profiles_baseline.sql` | `profiles`, `set_updated_at`, `handle_new_user`, auth trigger | nothing today; FK target for B11 bookings |
| `20260802_drinks_baseline.sql` | `drinks` (50 publishable recipes, fail-closed read policy) | `app/find-my-drink/queries.ts` (anon key) |
| `20260803_planner_products_baseline.sql` | `planner_products` (1,311 Jaipur bottles, service role only) | `app/party-planner/catalogue-server.ts` |
| `20261030_booking_phase1.sql` | **New, not applied.** `venues`, `venue_members`, `venue_offers`, `booking_requests`, `booking_status_history` and the create/decide/cancel/expire functions (B11 Phase 1, no payment) | nothing yet; rules mirrored in `app/bookings/booking.ts`, checked by `scripts/booking-check.cjs` |

Project-level (not in migrations): the `ensure_rls` event trigger and
`public.rls_auto_enable()` come from the Supabase "automatically enable RLS"
project setting.

`seed/booking_demo.sql` is one demo venue and offer, test data only (every row has `is_demo = true`; `delete from public.venues where is_demo` removes it). Run it by hand on a staging database, never as a migration.

## Remote migration history -> repo

The remote `supabase_migrations.schema_migrations` lists 21 migrations written
incrementally, partly through Studio. The repo does not replay them; the
baselines above replace them. Mapping (read 2026-10-13):

| Remote version / name | Repo file |
|---|---|
| 20260815142117 ekquarter_core_tables | `20260802_drinks_baseline`, `20260801000001_profiles_baseline`, `20260801_waitlist_subscribers_baseline` (quiz tables: removed) |
| 20260815142832 ekquarter_rls_and_auth_bootstrap | same three baselines (RLS, policies, `handle_new_user`) |
| 20260815142932 ekquarter_seed_drinks | row data, not in repo SQL (content is in Studio and `scripts/recipe-catalogue/`) |
| 20260815143810 ekquarter_revoke_rpc_exposure | folded into the baselines' function grants |
| 20260817072538 ekquarter_quiz_throttle_fix | removed (quiz feature retired) |
| 20260824121716 segment_waitlist_for_early_access | `20260801_waitlist_subscribers_baseline` |
| 20260824122227 drop_redundant_waitlist_email_constraint | `20260801_waitlist_subscribers_baseline` |
| 20260917033539 party_plans | removed (account save dropped 2026-10-12; table and function dropped remotely in B9 Step 2) |
| 20260925033248 drink_recipe_provenance | `20260802_drinks_baseline` |
| 20260927204510 recipe_essentials_unknowns | `20260802_drinks_baseline` |
| 20260928103310 recipe_quality_publication_gate | `20260802_drinks_baseline` |
| 20260928111903 recipe_saves_and_moderated_community | removed (community retired) |
| 20260928112657 recipe_community_read_indexes_and_private_limit_policy | removed |
| 20260928112832 recipe_community_owner_and_save_indexes | removed |
| 20261003074112 jaipur_planner_products | `20260803_planner_products_baseline` |
| 20261004051202 create_protected_planner_products_candidate_20261004 | removed (staging copy, already dropped) |
| 20261004062358 remove_false_mrp_defaults_from_planner_candidate | removed (staging copy) |
| 20261004091643 create_protected_planner_products_backup_20261004 | removed (backup copy, already dropped) |
| 20261004091848 remove_false_mrp_defaults_from_live_planner_products | `20260803_planner_products_baseline` |
| 20261004101645 remove_obsolete_planner_staging_and_backup | removed (nothing left to describe) |
| 20261004155617 remove_planner_product_source_columns | `20260803_planner_products_baseline` |

Remote history keeps its old entries; the repo is not a replay of it. The two
`20260801` baselines now have unique versions (`20260801` and `20260801000001`),
as the Supabase CLI requires.
