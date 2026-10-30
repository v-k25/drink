# AllCheers recipe platform plan

> **Superseded in part (2026-10-13).** Community (save, like, review, comment), phone sign-in and the community database objects were retired and removed from the app and the remote database. Recipes and the `drinks` table stay (owner decision 2026-10-12). Read the community sections below as history. See `docs/implementation-progress.md` (B8 close-out).

## Current delivery status — 2026-09-28

The owner requested completion of Phases 0–3. These phases are now implemented
and verified; the original planning/research brief below is retained as history.
The website changes are local to this workspace; no commit or hosting deployment
was requested. Database publication and community migrations are applied to
EkQuarter.

| Phase | Delivered | Evidence |
|---|---|---|
| 0 — Curate | Six reviewed recipes published: four cocktails, two mocktails; all 12 legacy records explicitly excluded; 9,444 remaining imported drafts hidden and unchanged | `docs/recipe-launch-review.md`, guarded snapshot/publication SQL in `output/recipe-launch/` |
| 1 — Browse/detail | Eligible-only listing, search/facets/cursor pages, related recipes, provenance, ingredient checklist, step mode and wake lock; repaired literal quotation marks in REST equality filters | Production build, separate TypeScript, live anonymous read/SSR regression and responsive production browser smoke |
| 2 — Save/notes | Existing phone OTP/session reused; owner-only saved recipes and private notes (500 chars); duplicate saves retain notes; authenticated saved list and removal | Real action mock tests and local transactional owner/cross-user/anonymous/forged-uid tests |
| 3 — Community | Distinct Like; one editable review per user/recipe; typed comments/questions/tips; pending-by-default Studio moderation; identity-free approved projections and safe aggregates | Transactional self-approval, bounds, pending/approved/edit/rejected/unpublish/rate-limit tests; production browser flow; security critique passed |

Resolved implementation choices: Studio moderation, public label "Community
member", rejected content hidden from authors/public, original quantities with
no scaling/conversion, existing finder replaced by recipes without migrating its
product shortlist, `editorial_ready` plus full provenance/classification/empty
quality issues for publication. No fixed cocktail/mocktail balance or launch
count is imposed. A later change to these choices can be planned independently.

The missing drinks and saved-drinks schema baselines were reconstructed from
live metadata in `scripts/recipe-catalogue/base-schema.sql` and
`saved-base-schema.sql`, and `check_local_schema.py` replayed them with
behavioral RLS assertions against a local PostgreSQL. **Superseded (B9 Step 2,
2026-10-13):** those files, the community/saved tables and the local replay were
removed; `supabase/migrations/20260802_drinks_baseline.sql` is the drinks
baseline (see `supabase/README.md`).

Verification: `corepack pnpm build`, standalone TypeScript, whitespace checks,
`node scripts/recipe-browse-check.cjs` (live reads),
`node scripts/recipe-community-check.cjs` (real actions with mocked REST/auth),
`python scripts/recipe-catalogue/check_local_schema.py` (since removed), and
`node scripts/recipe-platform-browser-smoke.cjs` (production browser with mock
upstream) passed. Browser widths: 320, 390, 1440px; no overflow or page errors.
OTP delivery and authenticated cloud writes were mocked, not sent to real users.

No new security-advisor warnings; the three earlier warnings remain outside
scope. New indexes are reported unused until actual community traffic exists.
Phase 4 (pantry, collections, cooksnaps) remains deferred as originally planned.

## Historical planning brief

> **Status: planning only (2026-09-26).** This document is research and planning. It contains no
> implementation, no database changes, and makes no legal-clearance claim. Reference-site
> observations come from public markup only; their mobile behavior is inferred from responsive
> markup and public descriptions, not viewport-tested. Owner decisions of 2026-09-26 are
> recorded as resolved in §16: keep `/find-my-drink`, retain the existing eligibility gate
> initially, keep Like distinct from Save, and no fixed launch count. The remaining open
> decisions (§16) stay with the owner.

## 1. Current state and target state

**Today.** `/find-my-drink` is a regional-eligibility gate followed by a taste-ranked finder
(`app/find-my-drink/`): a bundled local 507-product Jaipur JSON catalogue
(`app/find-my-drink/drinks.json`), a server-ranked match action, and a localStorage shortlist. It
is disconnected from the recipe database.

**Target.** Replace the taste-ranked finder with Supabase-backed cocktail/mocktail recipes from
`public.drinks`, **querying only eligible published rows** (`status = 'published'` plus an
editorial readiness/classification flag — 'published' alone is not sufficient; see the database
facts below and §9). The route stays `/find-my-drink` initially, retitled **"Find a recipe"**,
with a new detail route **`/find-my-drink/[id]`**.

**Database facts.** Import counts come from the 2026-09-25 provenance checkpoint; the
RLS/policy, grant, legacy-row, `saved_drinks` and column-type facts come from live read-only
checks on 2026-09-26. No new claims beyond those checks, and local migration files are local
state, not remote truth.

- `public.drinks` holds 9,450 imported draft rows (9,306 cocktails, 144 mocktails; 2026-09-25
  provenance checkpoint) plus the 12 pre-existing published rows. Drafts are editorially and
  legally unreviewed and **cannot surface until curated**. Live read-only checks (2026-09-26)
  confirm RLS is enabled with a single `SELECT` policy `drinks_public_read` `TO public USING
  (status = 'published')`, so draft `SELECT` is denied at the database; anon and authenticated
  both hold `SELECT` plus broad legacy table grants (INSERT/UPDATE/DELETE/TRUNCATE etc.), so
  those grants need a privilege audit and safe restriction before launch — Phase 1 must harden
  them and test the anon-key published read and draft denial; authenticated draft access is not
  asserted. The same checks confirm the 12 pre-existing published rows have ingredients +
  preparation but **NULL `alcohol_type` and NULL `source_name`** (and NULL
  `source_url`/`content_origin`), with legacy categories such as 'After Dark', 'Aperitivo',
  'Zero Proof' and 'Long & Cold'. **'Published only' is therefore not a sufficient launch
  filter**: the 12 legacy rows are not treated as pre-curated, and NULL `alcohol_type` is never
  classified as 'cocktail'. Phase 0 must explicitly review/classify — or deliberately exclude —
  all 12 legacy rows, with a provenance/copy-rights assessment (§9). Phase 1's listing/detail
  queries must use a frozen eligible-publication predicate combining `status = 'published'` with
  editorial readiness/classification (schema/flag decision before implementation, §16) and, by
  default, excluding NULL-provenance rows until the owner explicitly decides an honest
  alternative and reviews them (§9); ineligible IDs return 404. The 9,450 drafts stay
  inaccessible throughout.
- Provenance/classification columns exist (source name/URL/retrieved-at, content origin, alcohol
  type); unknown ABV is nullable with a 0–100 range check. `ingredients` is a JSONB array and
  `base_spirit` is a separate text column. Descriptions and preparation wording are
  template-generated from structured facts, never source prose.
- `public.saved_drinks` exists remotely as `(user_id, drink_id, note, saved_at)` with primary
  key `(user_id, drink_id)` and a `char_length(note) <= 500` CHECK (both verified live on
  2026-09-26), supporting save + a private per-user note capped at 500 chars
  (`saved_drinks.note`); there is no separate owner/curator note column and none is proposed.
  `public.drinks.id` is **text**, so any social table's `drink_id` is a text foreign key, not
  uuid. Both base migrations — `public.drinks` and `public.saved_drinks` — are **absent
  locally** (historical: when written, `supabase/migrations` held only `party_plans` and `drink_provenance`; now superseded by the B9 baselines): the
  `drinks` base migration is a Phase 1 local-reset/test precondition and the `saved_drinks` one
  is reconstructed and verified before Phase 2, both additively with owner approval, so local
  environments match remote.
- Source descriptions, instructions, images, ratings, nutrition and author content were excluded
  at import; there are **no imported ratings** to display and none may be synthesized.

## 2. Product goals and non-goals

**Goals**

1. A safe, browsable recipe library for cocktails and mocktails that replaces the taste-ranked
   finder, served only from curated published rows.
2. Guests can read and make recipes without an account; authenticated users can save, note, like,
   review and ask.
3. A making experience that works on a phone in one hand: step mode, sticky actions, optional
   keep-awake.
4. Responsible alcohol UX: eligibility retained, ABV shown only when known, mocktails as
   first-class citizens.
5. Honest provenance: every recipe shows where it came from and how its copy was produced.

**Non-goals**

- Surfacing all 9,450 draft rows; drafts stay hidden until editorially curated.
- Inventing ABV values or fabricating data of any kind.
- Free-form user-submitted recipes; community features are annotations on published recipes only.
- Ad or interstitial density, excessive peer actions, or JS-only core content.
- Custom moderation tooling in early phases (Studio-first).
- New dependencies where the existing stack suffices; no changes to party-planner, the
  early-access action, package/lockfiles or environment files as part of this plan.

## 3. Journeys

### Guest (no account)

Land on `/find-my-drink` ("Find a recipe") → browse curated rails / search / filters → open a
detail page → read provenance, ingredient checklist, steps (or step mode) → attempt to save or
like → sign-in prompt explaining why an account is needed for writes. All reads are
unauthenticated (no sign-in needed), but they may sit behind the eligibility gate below.
Owner decision (2026-09-26): **retain the existing regional eligibility gate** before recipe
content initially; open browsing with no gate and a mocktail-only gate exception are not
adopted under this decision (a later change needs a new owner decision).

### Authenticated

Sign in (phone OTP, matching the existing planner pattern) → the same discovery surface plus a
personal state layer: saved recipes with private notes, likes, one review per recipe, typed
comments/questions/tips → revisit the saved list → edit a note or remove a save.

### Mobile making

On the detail page: ingredient checklist with tappable check state → step mode (one step at a
time, large type, prev/next) → keep-awake progressive enhancement (Screen Wake Lock where
supported; silent no-op where not) → sticky bottom action bar (save/like) always reachable →
related recipes below the fold.

## 4. Discovery IA

- **Search**: name and ingredient text search over published rows; start with ILIKE + trigram
  index, graduate to Postgres full-text search only if needed (§8). `ingredients` is a JSONB
  array, so ingredient ILIKE needs a safe text projection or controlled JSONB handling, and the
  `pg_trgm` extension must be created before any trigram index.
- **Curated rails**: editorially chosen horizontal rails (e.g., "Easy mocktails", "Timeless
  classics", "Three ingredients"), backed by curated flags or tag queries over published rows.
- **Filters**:
  - Mocktail vs base spirit (vodka, gin, rum, whiskey, tequila, …) — the mocktail facet uses the
    `alcohol_type` column and the base-spirit facet uses the separate `base_spirit` text column,
    never inferred. Rows with NULL alcohol_type/base_spirit — including the 12 pre-existing
    published rows — are excluded from these facets until Phase 0 classifies them; NULL is never
    silently treated as 'cocktail'.
  - Few-ingredient counts (≤3 / ≤5): queryable via `jsonb_array_length(ingredients)` — it counts
    listed entries, so repeated ingredient lines count separately. Only method (shaken /
    stirred / built / blended / …) lacks a stored field; it requires a new validated stored
    field (derived and verified per row, then stored) or deferral, and must not be computed ad
    hoc per request from unvalidated data.
- **Filter counts**: each filter shows how many published rows match with the other active
  filters applied (NYT Cooking-style facet counts), computed server-side.
- **Cursor pagination**: keyset pagination on a stable, indexed ordering (e.g., `(name, id)`),
  never offset pagination; modest page size (e.g., 24–36); "Load more" or next/prev.
- Server-rendered core content: listings and details must render without JavaScript; JS enhances.

## 5. Detail IA

- **Provenance block**: source name/URL/retrieved-at and content-origin disclosure from the
  provenance columns; generated-copy disclosure where the description is template-generated.
- **Category art**: the existing hand-authored category SVGs (the planner's
  `categoryArt`/`artFor` pattern) because **no rights-cleared photography exists**; no scraped
  or generated images in scope.
- **Ingredient checklist**: interactive, accessible checkable list with quantities in the
  imported units.
- **Servings scaling**: scale quantities by servings only **where reliable** — clean numeric
  facts scale linearly; rows with ambiguous units or ingredients degrade to no scaling with an
  explanation (unit-conversion rules are an open decision, §16).
- **Step mode**: one-step-at-a-time making mode, reduced-motion-gated transitions, keyboard and
  touch operable.
- **Keep-awake**: Screen Wake Lock API as progressive enhancement; never a hard dependency.
- **Sticky mobile actions**: bottom-anchored Save/Like bar; touch targets ≥44px.
- **Related recipes**: same base spirit / mocktail category (and method only if a validated
  stored field exists, per §4), published rows only, modest count.
- **Community**: like counts, reviews and comments appear once Phase 3 ships; before that the
  detail page simply omits them (no empty-state placeholders promising future features).

## 6. Interaction model

| Action | Who | Scope | Storage |
|---|---|---|---|
| **Save** | Authenticated | One per user per drink; private | Existing `public.saved_drinks` (its key enforces one-per-user); private per-user note reuses `saved_drinks.note` (≤500 chars) |
| **Note** | **Authenticated owner of the `saved_drinks` row only** | Private; part of the owner's save — never public and never visible to other users | Existing `saved_drinks.note` (≤500 chars), readable and writable only by that row's authenticated owner |
| **Like** | Authenticated | Toggle; lightweight public signal | New `drink_likes`; aggregate count public, per-user rows private |
| **Review** | Authenticated | **One per user per drink** (unique constraint); rating + text | New `drink_reviews`; visible only when moderation status allows |
| **Comment / Question / Tip** | Authenticated | Typed (`comment` \| `question` \| `tip`); multiple per user; bounded text | New `drink_comments`; visible only when moderation status allows |

Key distinctions: Save is private and functional ("my list"); Like is a cheap public endorsement;
Review is a single authoritative per-user verdict with a rating; Comment/Question/Tip are
conversational annotations. **All writes require authentication** (`auth.uid()`), including saves
and likes.

## 7. Data separation: imported facts vs user ratings

- Imported source facts (ingredients, quantities, provenance, classification) live only in
  `public.drinks`; user signals live only in the new `drink_likes` / `drink_reviews` /
  `drink_comments` tables and `saved_drinks`.
- Ratings displayed in the UI come exclusively from user tables; there are no imported ratings to
  show and none may be synthesized.
- User writes never mutate provenance or catalogue columns; aggregates are computed over user
  tables only.
- Editorial quality (curated status) and community sentiment (likes/reviews) are independent
  axes: a low-rated recipe is not automatically unpublished, and a draft is never surfaced by
  popularity.

## 8. Backend design (additive)

All new objects are additive; the early-access action, `party_plans` and existing tables are
untouched. Nothing in this section is implemented; the DDL below is a design sketch for Astra to
freeze per phase.

**New tables**

`public.drinks.id` is **text**, so every social table's `drink_id` is a **text** FK (not uuid).

- `drink_likes (user_id uuid, drink_id text, created_at timestamptz)` — PK `(user_id, drink_id)`;
  FK to `public.drinks (id)`; no updates (toggle = insert/delete).
- `drink_reviews (user_id, drink_id text, rating smallint CHECK 1–5, body text, moderation_status,
  created_at, updated_at)` — UNIQUE `(user_id, drink_id)`; FK to drinks.
- `drink_comments (user_id, drink_id text, kind text CHECK IN ('comment','question','tip'), body
  text, moderation_status, created_at)` — FK to drinks; no uniqueness (multiple per user allowed).

**RLS, grants, API exposure**

- RLS enabled on all three tables; policies use `auth.uid()` only — **no `user_metadata`
  authorization** and no trust on JWT app-metadata claims.
- Likes/reviews/comments: owner write (insert and, where applicable, update/delete of own rows)
  and owner read only on the base tables, with `rejected` content excluded from owner read by
  the default recommendation that rejected content is invisible to everyone except moderators
  (§16). Pending content is never publicly queryable.
- Public counts: use a separate aggregate stats table containing only `drink_id`/count/`avg`
  columns, updated by narrowly scoped hardened triggers (fixed `search_path`, `PUBLIC` execute
  revoked) or an equivalent separately security-reviewed private-schema API. Public stats exist
  only for published drinks.
- Approved public review/comment projection must hide `user_id` and pending/rejected rows; design
  it independently with security review — do not assume `security_invoker` views magically expose
  hidden rows, nor that default views preserve RLS.
- Grants are intentional: no `anon` access on base tables.

**Moderation status**

- `moderation_status` (`pending` / `approved` / `rejected`) on reviews and comments; new user
  content starts `pending`; only `approved` renders publicly. Moderation is **Studio-first**
  (§11).

**Bounds, rate limits, indexes, search**

- Text bounds via CHECK constraints: review/comment body ≤ ~2,000 chars; note ≤ 500 chars.
- Rate limits: client-side debounce plus a modest server-side guard; avoid generalizing the
  pre-existing `quiz_throttle_count` SECURITY DEFINER pattern (it is a known advisor finding);
  prefer simple per-user insert checks or app-level throttling.
- Indexes: `(drink_id)` on all three tables; `(user_id, created_at)` for "my activity"; partial
  index on `moderation_status` for approved rows; the `(user_id, drink_id)` uniqueness backs
  per-user checks.
- Search: ILIKE with a pg_trgm GIN index on name over published rows; the `pg_trgm` extension is
  created before the index. `ingredients` is a JSONB array, so ingredient search needs a safe
  text projection or controlled JSONB handling before any index; a tsvector column + GIN
  full-text index is a later upgrade if trigram search proves insufficient.

## 9. Editorial gate (Phase 0)

**Owner decision (2026-09-26): no fixed launch count — the earlier 100–200 recommendation is
withdrawn.** Phase 0 prioritizes a reviewed selection of the best practical recipes, favoring
recipes whose ingredients are easy to obtain or commonly at home, with every row still passing
the per-row editorial/safety/rights checks below; no count is pre-decided and the publication
set is whatever survives that review. The owner's phrasing about the "best" recipes is read as
a preference for accessible-ingredient recipes, not permission to skip editorial review. The
launch catalogue is the reviewed set; the 12
pre-existing published rows are **not automatically included** — Phase 0 must explicitly
review/classify each of them or deliberately exclude them, with a provenance/copy-rights
assessment (their NULL `source_name`/`source_url` fails the provenance-completeness check below
and their NULL `alcohol_type` is not a cocktail classification until editorially assigned). By
default the eligible-publication predicate also **excludes NULL-provenance rows** until the owner
explicitly approves an honest alternative and reviews them — editorial readiness/classification
alone is insufficient to make a row queryable. The remote `drinks_source_name_check` accepts only
the two imported sources ('drinknation', 'mindfulmocktail') or NULL (verified live on
2026-09-26), so legacy rows cannot be backfilled with an imported source value; they need an
honest explicit fallback attribution, never fabricated provenance. The 9,450 drafts remain
hidden, and no claim is made that they can all be published.

Pre-publication checks per row (run in Studio / SQL before flipping draft → published):

1. **Dangerous / high-volume**: unsafe quantities or implausible batch sizes.
2. **Profanity**: in names, ingredients or generated copy.
3. **Duplicates**: same name + base spirit + method as an existing published row.
4. **Allergens**: dairy, nuts, eggs, gluten identified in editorial data (whether and how to
   display them is a later decision).
5. **Source terms**: source-brand or source-prose leakage into names/ingredients/descriptions.
6. **Provenance completeness**: source name/URL/retrieved-at and content origin present.
7. **Generated-copy sanity**: template output reads correctly and matches structured facts.

Acceptance: only rows satisfying the frozen eligible-publication predicate (`status =
'published'` **and** editorial readiness/classification **and**, by default, non-NULL
provenance) are queryable by the app; verified counts match expectation; security/performance
advisors report no new findings.

## 10. Responsible alcohol UX

- The existing regional/age eligibility pattern is retained where alcohol is presented and, per
  the owner decision of 2026-09-26, across the recipe surface initially (§3); whether browsing
  mocktails can bypass the gate is not adopted under that decision (a later change needs a new
  owner decision).
- **No invented ABV**: ABV renders only when the nullable column is populated; no estimates, no
  "approximately X%".
- A persistent, non-intrusive responsible-drinking notice on alcohol categories; mocktails
  presented as first-class, not an afterthought.
- No purchase/inventory integration in this plan (that is the party planner's domain).

## 11. Moderation

- **Studio-first**: all moderation (publishing recipes, approving/rejecting reviews and comments)
  happens in Supabase Studio's table editor; no custom moderation UI, queues or email digests in
  early phases.
- Statuses: `pending` → `approved` / `rejected`. Whether rejected content stays visible to its
  author is an open decision (§16); the recommendation is invisible to everyone except
  moderators — simplest and safest.
- Escalation: repeated abuse → rate-limit tightening or feature gating (owner decision).

## 12. Phased delivery

**Explicit recommendation: do NOT ship all social features at once.** Each of Phase 3's social
writes needs its own review; shipping saves first keeps risk small and the surface useful.
Phases proceed only after the previous phase's acceptance criteria are met.

### Phase 0 — Curate (no code)

- Editorial review + publish a reviewed selection of the best practical recipes via Studio
  (prioritizing easy-to-obtain/commonly-at-home ingredients; no fixed count), using the §9
  checks.
- Explicitly review/classify — or deliberately exclude — all 12 pre-existing published rows,
  with a provenance/copy-rights assessment; they are not assumed curated, and NULL
  `alcohol_type` is never classified as 'cocktail'. Legacy rows with NULL provenance remain
  excluded unless the owner approves an honest fallback attribution (§9).
- Acceptance: verified published count; each of the 12 legacy rows classified or explicitly
  excluded; drafts untouched; advisors show no new findings.
- Verification: SQL counts in Studio; no build required.

### Phase 1 — Read-only browse + detail

- Precondition: the frozen eligible-publication predicate (schema/flag for editorial
  readiness/classification, §16) is decided before implementation; every listing and detail
  query filters on `status = 'published'` **and** that predicate, and detail requests for
  ineligible IDs return 404. The 9,450 drafts stay inaccessible. The missing local
  `public.drinks` base migration is reconstructed additively, with owner approval, before
  implementation (§1).
- Before launch: audit and restrict the broad legacy anon/authenticated grants on
  `public.drinks`, and verify the anon key can `SELECT` published rows but is denied draft
  `SELECT` (§1).
- `/find-my-drink` retitled "Find a recipe": eligible-row listing with search, curated rails,
  mocktail/base-spirit/method/few-ingredient filters, filter counts, cursor pagination.
- `/find-my-drink/[id]`: detail with provenance, category art, ingredient checklist, reliable
  servings scaling, step mode, keep-awake enhancement, sticky mobile actions, related recipes.
- Acceptance: only rows matching the eligible-publication predicate render at every route;
  ineligible IDs 404; the guest journey works with no account; core content renders without JS;
  no horizontal overflow at 320–1440px; reduced motion respected; no page errors.
- Verification: `pnpm build`; standalone `node node_modules/typescript/bin/tsc --noEmit`;
  production browser smoke at desktop and mobile widths (production-server smoke test);
  `git diff --check`.

### Phase 2 — Save + private notes

- Authenticated save/unsave + private note, reusing `public.saved_drinks` and its `note` column;
  sign-in prompts on write attempts; saved list surfaced for the signed-in user.
- Precondition: the missing local base migration for `saved_drinks` is reconstructed and tracked
  additively, with owner approval, before implementation; it must match the verified remote
  `saved_drinks` schema (§1). Live `public.saved_drinks` RLS, policies and table/column grants
  are audited before any use — only the primary key and `note` CHECK are verified so far (§1) —
  and must ensure owner-scoped `auth.uid()` SELECT/INSERT/UPDATE/DELETE policies and narrow
  grants with no anon access; owner/cross-user/anonymous access is tested.
- Acceptance: writes auth-gated end to end; one-per-user enforced; the note round-trips; no anon
  grants.
- Verification: build + tsc + smoke; RLS verification SQL (owner-scoped access, cross-user
  isolation, forged-uid rejection, anonymous denial) mirroring the planner's
  `tmp/planner/rls-check.sql` pattern.

### Phase 3 — Likes, reviews, comments

- Additive `drink_likes` / `drink_reviews` / `drink_comments` with moderation statuses, safe
  aggregate views, bounded text; UI toggles/forms with auth gates.
- Acceptance: aggregates leak no user identities; unapproved content invisible; one review per
  user enforced; text bounds enforced.
- Verification: build + tsc + smoke; RLS/policy SQL checks; advisor review after any DDL.

### Phase 4 — Pantry, collections, cooksnaps (deferred)

- My Bar-style pantry ("what can I make now"), named collections/folders, and photo cooksnaps —
  explored later, each with its own approval; explicitly out of scope for Phases 0–3.

## 13. Reference research

Observations come from **public markup only** (server-rendered HTML). Mobile behavior is
**inferred** from responsive markup and public descriptions — **not viewport-tested** in a
browser. Ad/interstitial density observed on some references is explicitly avoided, as are
excessive peer actions and JS-only core content.

| Site | URL | Observed patterns worth borrowing |
|---|---|---|
| Difford's Guide | https://www.diffordsguide.com/ | Serves/unit switcher on recipes; keep-awake on method steps; personal notes, collections and "tried" lists |
| Punch | https://punchdrink.com/ | Spirit/style/season/flavor/family facets; strong provenance and editorial attribution |
| BBC Good Food | https://www.bbcgoodfood.com/ | Time/difficulty recipe metadata; cook mode; comment/question/tip taxonomy on recipes |
| NYT Cooking | https://cooking.nytimes.com/ | Facet counts in the filter UI; login-required saving |
| Make Me a Cocktail | https://www.makemeacocktail.com/ | My Bar pantry; ingredient-first browse; jump navigation; makers mode and responsible-serving info |
| Cookpad | https://cookpad.com/ | Recipe folders/cooksnaps (community outcome photos) |
| Tasty | https://tasty.co/ | Easy/budget positioning; visible community outcomes |

AllCheers deltas: curated-first (no ad density), honest provenance including generated-copy
disclosure, no JS-only core content, mobile making as a first-class mode, moderation-gated
community.

## 14. Likely file map

Indicative only; Astra freezes the actual map per phase.

**New / rewritten (recipe platform)**

- `app/find-my-drink/page.tsx` — listing route, initially titled "Find a recipe" (replaces the
  current gate + finder composition).
- `app/find-my-drink/[id]/page.tsx` — detail route.
- `app/find-my-drink/components/` (proposed split; final structure is Astra's call) — rails,
  filter sheet, recipe card, ingredient checklist, step mode, keep-awake hook, sticky mobile
  actions, related recipes.
- `app/find-my-drink/queries.ts` (proposed) — published-row query helpers: filters, facet counts,
  keyset pagination.
- `app/find-my-drink/actions.ts` — server actions for save/note (Phase 2) and
  like/review/comment (Phase 3); read paths likely server components querying published rows
  directly.

**Replaced / retired**

- `app/find-my-drink/drinks.json`, `model.ts`, `gate.tsx`, `finder.tsx`, `finder.module.css` —
  the taste-ranked finder implementation; retired when the replacement ships (retirement and
  shortlist migration are open decisions).

**Untouched**

- `app/party-planner/**` (including `session.ts`, which the finder currently reuses for
  eligibility), `app/early-access/actions.ts`, `app/layout.tsx`, `app/globals.css`, fonts,
  `app/robots.ts`, package/lockfiles, environment files.

## 15. Later mandatory checks

Per AGENTS.md, after any implementation checkpoint: `pnpm build` (Corepack fallback with
`pnpm_config_verify_deps_before_run=warn`), standalone
`node node_modules/typescript/bin/tsc --noEmit` (required because the Next config skips
build-time type validation), a production browser smoke test (desktop + mobile widths), and
`git diff --check`. **No lint script exists** — do not add one as part of this plan.

## 16. Open decisions (owner)

Decisions 1–4 were resolved by owner decision on 2026-09-26 and are marked below; 5–11 remain
open with the owner.

1. **Naming/route** — **Resolved (2026-09-26): keep `/find-my-drink`** (retitled "Find a
   recipe"). A later rename to `/recipes` / `/drinks` would need a new owner decision.
2. **Initial curated count** — **Resolved (2026-09-26): no fixed count** (the earlier 100–200
   recommendation is withdrawn). Phase 0 prioritizes a reviewed selection of the best practical
   recipes whose ingredients are easy to obtain or commonly at home; per-row editorial/safety/
   rights checks are retained, no claim is made that all 9,450 drafts can be published, and the
   exact publication set/scoring is decided only by the Phase 0 review, not pre-decided.
3. **Eligibility behavior for guests** — **Resolved (2026-09-26): retain the existing regional
   gate** before recipe content initially. Open browsing with no gate and a mocktail-only gate
   exception are not adopted under this decision (a later change needs a new owner decision).
4. **Whether Like is distinct enough from Save** — **Resolved (2026-09-26): keep Like distinct
   from Save**, sequenced after Phase 1 exactly as the plan already phases it (Phase 3, §12);
   no re-sequencing change was made.
5. **Moderation mode**: Studio-only (recommended) vs a custom moderation surface later.
6. **Display-name policy** for reviews/comments: profile display name, first name, or anonymized.
7. **Unit conversion/scaling**: which units scale linearly, when scaling is suppressed, and
   whether ml ↔ oz conversions are offered.
8. **Old finder retirement/migration**: replace outright (recommended) vs keep the taste-ranked
   finder as a secondary mode; whether the localStorage shortlist migrates.
9. **Launch cocktail/mocktail balance**: the catalogue is 9,306:144 cocktails:mocktails; the
   curated launch balance is an editorial decision.
10. **Eligible-publication predicate schema**: how editorial readiness/classification is flagged
    for the frozen publication predicate (a new column/flag vs reuse of the existing
    classification columns) — decided before Phase 1 implementation. The same decision covers the
    NULL-provenance fallback: whether legacy NULL-provenance rows receive an honest explicit
    fallback attribution (the remote `drinks_source_name_check` accepts only the two imported
    sources or NULL, §9) — the default keeps them excluded unless the owner approves an honest
    alternative.
11. **Rejected UGC visibility**: whether rejected reviews/comments stay visible to their author
    (§11) — the default is hidden from everyone except Studio moderators.
