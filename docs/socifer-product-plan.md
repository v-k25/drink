# Socifer: evidence-based product, design and platform plan (v2)

> **Research and planning only. Nothing has been implemented.** The database was inspected read-only with the public anon key; no secrets were printed.
> **[V]** = verified, **[A]** = assumption, **[R]** = recommendation.

## Current B12 implementation contract — 2026-10-14

The owner has requested implementation now, overriding the earlier Phase 1 scheduling for B12. `drinks` is retained: the read-only review found 50 published editorial-ready recipes (35 cocktails, 15 mocktails), not 9,462. The current Party Planner Tool Night palette is the visual reference. B12 is recipe-first guided discovery: type → up to two tastes → results, with optional base, method and audited ingredients. Mixed groups have independent sections; Surprise me samples the reviewed type-only pool. Bottle discovery, brands, exact group size, scaling, ABV estimates, model calls and backend writes are excluded. Occasion choices stay hidden until their editorial mappings receive owner approval.

The bounded implementation and acceptance contract is in `docs/find-my-drink-guided-plan.md`; it supersedes older B12 mood-first assumptions, the B6 bottle finder, tool light-surface direction, and recipe-retirement statements below. Historical research remains below for context.

## What changed in v2 (owner corrections)

1. The brand is now **Socifer** [V: `docs/implementation-progress.md:3`, 2026-10-12 rename checkpoint].
2. **Reversed by the owner 2026-10-12:** the 50 recipes in `drinks` are Socifer's to use and stay. Find My Drink remains a recipe browser (mood/browse, suggestions, recipe pages); section 4c's bottle finder and B8's `drinks` removal are cancelled. Community/save stays retired (no sign-in). Original text: 2. **`drinks` (recipes scraped from a website) is invalid and will be removed.** The only drinks data source is now `planner_products`: 1,311 Jaipur rows, which the owner describes as official data.
3. **Club booking is the core product and becomes the landing-page hero.** Party Planner and Find My Drink stay as secondary companion tools.
4. **The hero background image is a key differentiator.** We need one as good as the reference's, or better.

**Where I agree:**
- Club booking should be the hero. Designing the landing page booking-first now avoids a second redesign at launch.
- Waitlist conversion becomes the main demand signal, which bookings need to justify being built.

**One condition:**
- Until bookings exist, the hero must say "launching soon" honestly.
- [R] Give the hero CTA something real to do: a **manual "Request a table" concierge form** (Booking Phase 0), not only a waitlist. That turns the hero into a live demand test.

---

## Context

Socifer is a Jaipur-first, pre-launch nightlife product.

**What exists today [V]:**
- Landing page: `app/page.tsx` and `app/home.module.css`.
- Party Planner: `/party-planner`. It uses `planner_products` and lets users save plans with phone OTP.
- Find My Drink: `/find-my-drink`. It is currently built on the `drinks` recipes table, which is being retired.
- Early-access waitlist: `app/early-access/actions.ts`, an insert-only write to `waitlist_subscribers`.

**Next phase:** club bookings become the product. The plan below:
- repositions the landing page around bookings;
- rebuilds Find My Drink on the valid catalogue;
- scopes where Claude helps;
- stages the booking build.

---

## 1. Product understanding

**Who it serves [A]:** adults in Jaipur going out to clubs, mainly groups and hosts. No persona research exists, so D3 asks for 5 to 10 quick user and venue interviews.

**Journeys today [V]:**
- **Landing page.** Hero ("Club bookings in Jaipur. Coming soon."), tool cards, booking steps, FAQ, waitlist, privacy, footer. The hero photo is reused for a tool card.
- **Party Planner.**
  - Flow: eligibility checkbox → guests and budget in ₹ → categories → products (1,311 rows, 18 categories) → review → print, copy or share → save via phone OTP.
  - Quantities are entered by hand.
  - Files: `app/party-planner/{planner.tsx,model.ts,actions.ts,catalogue-server.ts,session.ts}`.
- **Find My Drink.**
  - Recipe browse and detail pages, plus community features (save, like, review, comment).
  - **Everything reads from `drinks`**, which is being retired: `app/find-my-drink/queries.ts`, `community.ts`, `actions.ts`.
- **Waitlist.** Fields are email, interests, preference and consent (`early-access-v1`). Insert only.

**Live data [V, read-only, 2026-10-12]:**

| Table | What I found |
|---|---|
| `planner_products` | 1,311 rows, 18 categories: Beers 107, Blended Scotch 51, Brandy 22, Champagne 10, Gin 84, Liqueurs 38, Made in India Whisky 228, RTD 23, Red Wine 168, Rosé 27, Rum 92, Sake 7, Single Malts 88, Sparkling 39, Tequila 47, Vodka 152, White Wine 92, World Whisky 36 |
| `planner_products` columns | `id, category, name, brand, size_ml, price_paise, city` |
| `planner_products` access | service role only; anon gets 401 |
| `planner_products` source columns | removed 2026-10-04 |
| `drinks` | 9,462 rows; 50 publicly visible (to be removed) |
| Community views | exist, 0 rows |
| `party_plans` | 0 rows |
| `waitlist_subscribers`, `profiles` | anon SELECT returns 0 rows; can't tell whether RLS hides rows or the tables are empty without a SQL check |

**⚠ Price-provenance conflict (decision D5).**
- The owner says the data is official FSSAI data for Jaipur.
- The repo says the 1,311 prices are Livcheers website-listed Jaipur prices, checked 2026-10-03 (`output/jaipur-replacement-1311/manifest.json`).
- The progress log says "website-listed only, never an official-MRP claim" (`docs/implementation-progress.md:302-326`).
- An older doc says the data is "not FSSAI records" (`docs/jaipur-product-category-review.md:7`).
- [A] FSSAI regulates food safety and licensing, and I'm not aware that it publishes retail prices.
- The on-site label must match a source we can show. Until then: **"Listed price in Jaipur, checked 3 Oct 2026. Not a guaranteed price."**

---

## 2. Current-state audit

### Strengths [V]
- Honest data rules: no stock claims, and mocktail/non-drinker inclusion.
- Strong RLS patterns: owner-only `party_plans`, service-role-only catalogue, community rate-limit triggers.
- Accessibility already tested: 44px targets, AA contrast, reduced motion, works without JavaScript.
- Real phone-OTP auth with httpOnly session cookies (`session.ts`).
- A booking state machine is already documented (`docs/brewlist-redesign-plan.md:91-95`).

### Gaps, by severity

**G1. Uncommitted work.** [V] `app/find-my-drink/`, `app/home.module.css`, `catalogue-server.ts` and the images are untracked in git, so they could be lost.

**G2. Fragile catalogue check.** [V] The planner breaks on any catalogue change. `catalogue-server.ts:5,11-15,90-92` requires exactly 1,311 rows with exact per-category counts.

**G3. Find My Drink depends entirely on `drinks`.** [V]
- Removing the table will break `/find-my-drink`, `/[id]`, `/saved` and the community features.
- Database objects tied to `drinks`:
  - `saved_drinks` (FK `ON DELETE RESTRICT`)
  - `drink_likes`, `drink_reviews`, `drink_comments`
  - the `private.*_public` tables and the public views
  - the triggers and functions
  - DDL source: `scripts/recipe-catalogue/community-schema.sql` (removed in B9 Step 2; these objects are dropped remotely)

**G4. Saving can't be verified in production.** [V] The SMS OTP provider is not verified, and there has been no Vercel deploy since the catalogue cutover.

**G5. Landing page.** [V]
- The hero promises bookings, but the CTA only joins a waitlist.
- The photo is reused.
- The mobile menu doesn't close when a link is tapped.
- The waitlist's "optional" interests are actually required.

**G6. Planner details.** [V]
- Art for the 18 categories falls back to placeholders (`planner.tsx:14`).
- The age gate is shown on every visit, even when the eligibility cookie exists.
- The receipt shows "Price verification date: unknown".
- The saved-plans list fails entirely if one row is bad (`actions.ts:103`).
- The catalogue is fetched uncached on every action.

**G7. Hygiene.** [V]
- AGENTS.md still describes a "neutral placeholder" site.
- `catalogue.json` is stale: 1,638 rows, and no app code reads it.
- About 80% of `globals.css` is dead.
- Nine dependencies are unused.
- The Supabase MCP configs have no `read_only=true` flag.
- Advisor warning on `quiz_throttle_count`.
- `waitlist_subscribers` and `profiles` have no DDL in `supabase/migrations/`.

---

## 3. Recommended product and design direction [R]

### Positioning
> **Socifer: book Jaipur's nights out.** Request a table at the city's best clubs, get the venue's confirmation, and arrive with your pass. Plus tools to plan the pre-party. For adults; non-drinkers welcome.

### Conversion goals

**Now (pre-launch):**
- **Primary:** "Request a table". A manual concierge form, if D2 is approved; otherwise "Get early access" (waitlist).
- **Secondary:** use a companion tool.

**At launch:** the same hero slot becomes "Book a table" with no redesign. Only the CTA and its data source change.

### Design direction: "Jaipur After Dark"

A dark, photography-led nightlife look with a neon accent, adapted from the reference.

**Keep from the reference:**
- Full-bleed dark photo hero with a centred all-caps headline and one strong CTA.
- Script eyebrow above all-caps titles ("Welcome to the party / JOIN THE CLUB").
- Large neon script words as section dividers.
- Narrow, centred intro copy with generous vertical rhythm.
- Side-by-side "Want to reserve?" panel, which maps directly to our request form.
- Tabbed day-by-day "Upcoming parties", which becomes **real** upcoming nights once venues supply data.

**Reject:**
- Hero carousel arrows.
- Flickering neon (photosensitivity).
- Small low-contrast navigation and body text.
- **Made-up hosts, testimonials, news and gallery.** Show these only with real partner content and permissions.

**Tools keep their light utility surface** (`#F4F1EA`, already AA-checked) and share the same tokens and accent.

### Hero background image (the differentiator)

**What the current image does well and badly.** `public/images/nightlife/club-crowd.jpg` (Pexels, 2200×1467) has strong lasers and silhouettes. But:
- green lasers clash with a magenta/violet palette;
- the bright stage sits behind where the headline goes;
- there is no art-directed mobile crop.

**Brief for the new image [R]:**
- **Light:** dominant magenta, violet and pink stage light, with no green or cyan cast.
- **People:** a silhouetted crowd with raised hands, and no identifiable faces. That avoids model-release and "implied endorsement" risk.
- **Composition:**
  - a dark, low-detail band across the centre, or the upper-middle, for the H1;
  - light sources at the edges or top: beams, haze, a DJ backlight.
- **Size:**
  - Desktop master ≥ 3000px wide.
  - **Separate portrait crop for phones** (≥ 1200×1800), served with `<picture>`/`next/image` art direction, so the headline never sits on a bright spot.
- **Licence:** clear commercial licence, recorded in `docs/nightlife-image-credits.md`. Never presented as a specific Jaipur venue.

**Where to get it, in order of preference:**
1. **Commission a shoot at a Jaipur partner club.** It is authentic, the venue's permission doubles as partnership proof, and the photos can be reused on venue pages after launch.
2. **Paid stock (Adobe Stock / Shutterstock standard licence).** The widest choice of magenta-lit crowd shots. About ₹1–3k per image [A].
3. **Free stock (Pexels / Unsplash).** Good options exist, but they are reused widely.

**Treatment:**
- Grade the image to the palette (shadows toward `#0E0B10`, highlights toward magenta/violet).
- Add a dark radial-plus-bottom gradient overlay so text keeps ≥ 4.5:1 contrast.
- Optional subtle CSS glow on the H1.
- **No video by default**, for LCP and data cost. A short muted loop is optional later: poster first, disabled under reduced motion or Save-Data.
- **Weight:** ≤ 200 KB AVIF/WebP per variant.

**Acceptance:**
- Headline contrast ≥ 4.5:1 on every crop.
- LCP ≤ 2.5s on a mid-range Android over 4G.
- Owner approves 3 shortlisted candidates before integration.

### Colour palette (WCAG ratios calculated against `--night`)

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--night` | `#0E0B10` | Dark page background | — |
| `--surface` | `#17121A` | Cards, panels | — |
| `--surface-raised` | `#221A26` | Inputs, hover | — |
| `--line` | `#3A2F3F` | Borders and dividers (decorative) | — |
| `--bone` | `#F5F0EA` | Primary text on dark | ≈17:1 |
| `--mist` | `#B9AFB8` | Secondary text on dark | ≈9:1 |
| `--neon` | `#FF3EA5` | Primary accent: CTA fill (with `--night` text), links, glow | ≈6:1 |
| `--violet` | `#8B5CF6` | Glow, gradients, script decoration; large text only | ≈4.6:1 |
| `--neon-ink` | `#C2186B` | Accent on light tool surfaces (`#F4F1EA`) | ≈5.1:1 |
| `--success` | `#3DDC97` | Success state | ≈11:1 |
| `--warning` | `#FFB547` | Warning state | high |
| `--danger` | `#FF6B6B` | Error state | ≈7:1 |

This replaces the earlier burnt red `#b73720` as the brand accent (decision D6).

### Typography, spacing, components

**Typography:**
- **Nunito Sans** (local, OFL) for all UI and body text.
- Section titles: Nunito Sans 800, uppercase, letter-spacing .06–.08em.
- Sizes:
  - H1: `clamp(2.5rem, 7vw, 5.5rem)`
  - H2: `clamp(1.75rem, 4vw, 3rem)`
- **One OFL script face**, self-hosted and Latin-subset (about 25 KB), for eyebrows (≥ 20px) and decorative words only. Decorative words are `aria-hidden`; the real heading is a separate element.
- Body text: 1–1.125rem, line height 1.6, max 65ch.

**Spacing (px):** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Section padding: 64 on phones, 96 on tablets, 128 at ≥ 1280px.
- Container: max 1240px. Gutters: 20px on phones, 32px on tablets, then `max(32px, (100% − 1240px)/2)`.

**Breakpoints:**

| Width | Device | Layout |
|---|---|---|
| Below 600px | Phone | 1 column |
| From 600px | Large phone | 2-column cards |
| From 768px | iPad portrait | |
| From 1024px | iPad landscape / laptop | Full header navigation |
| From 1280px | Desktop | |
| From 1536px | Large desktop | Text capped; imagery bleeds |

**Touch and keyboard:**
- Targets ≥ 44×44px (primary CTA ≥ 48px), with 8px spacing.
- Sticky, compact header.
- The mobile menu closes on link tap or Esc and returns focus to the button.
- Visible 2px `--neon` focus ring with a 2px offset.

**Components:**
- Buttons: primary, secondary (outline), text link.
- Value-prop cards.
- Step list.
- Venue card (post-launch).
- Request/waitlist panel.
- FAQ using `<details>`.
- Skeletons and toasts with `aria-live`.

**Accessibility and performance targets:**
- WCAG 2.2 AA; reduced motion removes all transitions and glow; works at 200% text.
- LCP ≤ 2.5s, CLS < 0.1, INP < 200ms; Lighthouse mobile Performance ≥ 90.
- Server-rendered landing page with minimal client JavaScript; at most 2 font files.

---

## 4. Feature plans

### 4a. Landing page: booking-first structure, section by section

| # | Section | What it communicates | Action | Reference idea |
|---|---|---|---|---|
| 0 | Skip link + sticky header | Socifer wordmark. Nav: How it works · For venues · Plan a party · Find a drink. CTA button | Request / early access | Centred logo with split nav |
| 1 | **Hero** (new graded photo, full bleed) | Script "Jaipur, after dark". H1 **BOOK THE NIGHT.** "Request a table at Jaipur's clubs. Venue-confirmed, pass on your phone. Launching soon." | **Primary: "Request a table"** (or "Get early access"). Secondary: "How it works" | "Welcome to the party / JOIN THE CLUB" |
| 2 | Why Socifer | 3–4 value props, all future tense until live: venue-confirmed entry · price shown upfront · digital pass · no calls or DMs | Build intent | Services icon grid |
| 3 | How booking will work | Request → venue approval → pay → pass | Understand | — |
| 4 | Partner clubs | **Only with real signed venues** (names and photos with permission). Otherwise a "Run a club in Jaipur? Partner with us" band | Venue lead capture | Party hosts row |
| 5 | Neon divider "Jaipur nights" | Decorative, `aria-hidden` | — | "Club Gallery" script |
| 6 | Upcoming nights | **Hidden until real event data exists** (Phase 3) | Browse nights | Upcoming parties tabs |
| 7 | Plan the pre-party | Compact band with two cards: Party Planner and Find My Drink (1,311 Jaipur products, budget in ₹) | Use a tool (secondary) | About section |
| 8 | Request / reserve panel | Form beside its explanation. Fields: email, preferred night, group size, club preference (optional), consent | **Submit request or join waitlist** | "Want to reserve?" panel |
| 9 | FAQ | Is booking live? · Who confirms? · Pricing and fees (TBD) · Age and responsible use · Socifer doesn't sell alcohol · Privacy | Trust | — |
| 10 | Footer | Links, responsible-use line, photo credits, For venues | — | Footer |

**Acceptance:**
- No horizontal scroll from 360 to 1920px.
- Targets ≥ 44px; AA contrast; the performance targets above are met.
- Waitlist validation, consent and insert-only behaviour are preserved. New fields go through a migration and consent v2 (D4).
- No claims about venues or partners that can't be backed up.

**Metrics:**
- Hero CTA click-through.
- Request/waitlist conversion: visits → submissions.
- Share of submissions with preferred night and group size.
- Venue leads.

### 4b. Party Planner (secondary tool, stays on `planner_products`)

**Problem:** a host needs a realistic ₹ shopping list for N guests.
**Desired outcome:** a list ready to print, share or save in under 3 minutes.

**Shortcomings to fix:** G2 (fragile catalogue check), G4 (saving unverified), G6 (planner details), and no guidance on quantities.

**Proposed flow:**
1. Age check, skipped when the eligibility cookie exists.
2. Basics: guests, budget, length (2/4/6 hours), drinking mix, number of non-drinkers.
3. **Optional deterministic "Suggest a starting list" (D7).**
   - Transparent rules, e.g. drinks per guest per hour and ml per serving for each category.
   - Picks mid-priced products that fit the budget.
   - Fully editable, labelled "Estimate".
4. Edit using the existing shelf.
5. Review: receipt with the price label (D5), price-checked date, and cost per guest.
6. Print, copy, share, or save (needs OTP).

**Errors and empty states:**
- Catalogue unavailable → Retry; the draft is kept in localStorage.
- A bad saved row is skipped with a notice.
- OTP: resend with cooldown, and a way to change the number.
- No matches → reset filters.

**Data:**
- `planner_products`, `party_plans`.
- **No schema change in release 1.**
- Replace the exact-count check with shape validation plus sanity bounds.
- Cache the catalogue (hourly revalidation by tag).
- Art for all 18 categories.
- Price date stored as a constant for now.

**Later:**
- Non-alcoholic and mixer products: a data source plus a category or flag.
- Read-only share link (`party_plans.share_token`).
- Product images: licensing is pending.
- **Link a pre-party plan to a booking** (Phase 2+).

**Acceptance:**
- Adding or removing catalogue rows or a category doesn't break anything.
- Suggestions are reproducible and stay within budget.
- No gate for users who are already eligible.
- ~~Real OTP save, list and delete works on staging.~~ Dropped by owner (2026-10-12): no account save; the list is kept on the device and exported via print/copy/share.

**Metrics:**
- Start → review completion.
- Time to review.
- Print, share or save rate.
- Share of suggestions that get edited.

### 4c. Find My Drink: rebuilt on `planner_products`

**Problem:** "What bottle should I pick for tonight, within my budget, in Jaipur?"
**Desired outcome:** 3 good options in seconds, with a one-tap "Add to party plan".

**Current behaviour:** recipe browsing on `drinks`, which is invalid and being removed.

**Proposed flow (deterministic):**
1. Age check, shared cookie.
2. Pick a category or spirit (18 categories). Optionally set a budget (₹ slider/presets), size (180/375/750/1000ml…) and brand search.
3. Results sorted by "best value" (price per 750ml), lowest price, or name.
4. A "3 picks" strip: cheapest, best value, and premium within budget.
5. Each product card shows name, brand, size, listed price, price per 750ml, and **Add to plan** (writes to the planner's localStorage draft).
6. State lives in URL parameters, so results are shareable and work without JavaScript.

**Errors and empty states:**
- No results → loosen budget or size, and show the nearest prices.
- Catalogue down → Retry.

**Data:**
- `planner_products` through the **existing server-only `readCatalogue()`** in `app/party-planner/catalogue-server.ts`.
- **No new tables.**
- The catalogue has **no taste or flavour data**, so no "by taste" recommendations unless D8 adds editorial notes later.

**What to retire:**
- Recipe pages: `/[id]`, step mode, pantry, metric conversion.
- Community: save, like, review, comment, `/saved`.
- **Reuse:** the URL-driven filter dialog and chip patterns from `app/find-my-drink/components/filter-sheet.tsx` / `browse.tsx`.

**Acceptance:**
- Every result maps to a `planner_products` row.
- Prices are labelled per D5.
- Add to plan shows up in the Planner.
- Zero `drinks` references remain in `app/`.

**Metrics:**
- Search → add-to-plan rate.
- Zero-result rate < 5%.
- Finder → Planner hand-off.

### 4d. Retiring community objects safely (staged, owner-approved, destructive)

> **Annotation 2026-10-13: "retire `drinks`" is cancelled.** The owner decided on 2026-10-12 that the recipes are Socifer's to use, so Find My Drink stays a recipe browser and the `drinks` table stays (50 published, reviewed rows after B9 Step 2). Only the community objects (saved/like/review/comment tables, their views and functions, the `private` schema), `party_plans` and `quiz_submissions` were retired. They were dropped in B9 Step 2 with owner approval, without CASCADE. Steps 1, 3 (the `drinks` drop only) and 4 (cleanup of recipe scripts and docs) below do not apply to recipes; the cleanup that did apply is the B8 close-out in `docs/implementation-progress.md`. Struck-through wording is kept as history.

1. **Code first.** ~~Ship the rebuilt Finder, so nothing in `app/` reads `drinks`~~ Nothing in `app/` reads the community tables (done). `app/find-my-drink/` still reads `drinks` on purpose.
2. **Archive.** Make a read-only export of `drinks` and the community tables (currently 0 rows) to a local, git-ignored archive. Record row counts and hashes.
3. **Migration, after explicit approval.**
   - Drop in dependency order, using `RESTRICT` (no `CASCADE`): public views → private community tables, functions and triggers → `drink_comments`, `drink_reviews`, `drink_likes`, `saved_drinks` → ~~`drinks`~~ (`drinks` is kept).
   - **Keep `profiles` and auth.**
4. **Clean up.** ~~Remove `scripts/recipe-catalogue/`, recipe scripts and docs~~ Recipe scripts, `scripts/recipe-catalogue/` Python tooling and recipe docs stay. Only community/sign-in code, tests and SQL were removed.
5. **Verify.** `to_regclass` returns null for every dropped object; `drinks`, `planner_products` and the waitlist are unchanged; build, tsc and smoke tests pass.

**Migration-history caveat (2026-10-13).** The B9 Step 2 drops were run by hand in Studio, so `supabase_migrations.schema_migrations` still lists only the 21 old entries and has no row for them. The repo baselines in `supabase/migrations/` are the record of the schema. The history has not been repaired. One fix is a documented `supabase migration repair` (mark the old versions reverted and the new baselines applied); the other is to leave the 21 old entries as-is and rely on `supabase/README.md`. Either needs owner approval, and the baseline SQL must never be re-run blindly against the remote.

---

## 5. Claude integration proposal

### Verified API facts
Source: official pricing page `platform.claude.com/docs/en/about-claude/pricing`, fetched 2026-10-12.

| Model | Input $/MTok | Cache read | Output $/MTok | Batch (−50%) |
|---|---|---|---|---|
| `claude-opus-5-5` (default) | 4.00 | 0.20 | 20.00 | 2 / 10 |
| `claude-sonnet-5-5` | 2.00 | 0.10 | 10.00 | 1 / 5 |
| `claude-haiku-5-5` (≤ 100K-token prompts) | 0.10 | 0.01 | 0.50 | 0.05 / 0.25 |

**Features we'd use:**
- Structured outputs (`output_config.format` with JSON Schema).
- Prompt caching and the Batch API.
- `effort` (Opus 5.5 defaults to `medium`).
- The `refusal` stop reason.

`@anthropic-ai/sdk` is **not installed**. Adding it is a new dependency and needs approval (D9).

### Honest prioritisation
- With the recipe data gone, the catalogue holds only facts: name, brand, size, price, category.
- **AI isn't needed for release 1.** The deterministic Finder and Planner suggestion cover the core jobs.
- AI becomes clearly worthwhile **once bookings and venue data exist**.

### Use cases, in priority order

**1. "Describe your party" for the Planner** (release 2, after the deterministic suggestion is measured)
- **Benefit:** turn free text ("30 people, mostly beer, some whisky fans, ₹15k, 5 hours") into the plan basics plus a draft basket, with a short explanation of the trade-offs.
- **Non-AI alternative:** the guided form plus deterministic suggestion (B7) covers most of it.
- **Grounding:**
  - The server pre-filters about 60 candidate products.
  - Claude returns `{guests, budgetPaise, hours, lines:[{productId, qty}], notes}`.
  - The server rejects unknown IDs, clamps quantities, and recalculates totals with the existing `calculatePlan` (`model.ts:56-92`).
  - Anything over budget is rejected.
- **Cost** (assumptions: about 3K cached + 2K fresh input, about 1.3K output):

| Model | Per request | Per 1,000 |
|---|---|---|
| Opus 5.5 | ≈ $0.035 | ≈ $35 |
| Sonnet 5.5 | ≈ $0.017 | ≈ $17 |
| Haiku 5.5 | ≈ $0.001 | ≈ $1 |

- **Latency [A]:** about 1–2s (Haiku), 2–5s (Sonnet), 4–10s (Opus at low effort). Streamed progress either way.

**2. Natural-language Finder** (release 2, optional)
- "Something for a whisky lover under ₹2,500" → Claude only converts the request into **filters** (category, budget, size), validated against the enums.
- The results are a normal deterministic catalogue query.
- **Claude never states product facts or tasting claims.**
- **Cost:** about 500 input and 150 output tokens → about $0.005 (Opus) or about $0.0001 (Haiku) per query.

**3. Booking concierge** (Phase 1+, the strongest long-term case)
- **Benefit:** help a group pick a venue and offer ("8 of us, Saturday, house music, ₹2k each"), and answer policy questions (dress code, couple/stag entry, cover charge).
- **Grounding:**
  - Only `venues` / `venue_offers` / event rows and venue-approved policy text.
  - Claude returns IDs plus reasons; the server validates them.
  - **Availability, price and confirmation always come from the booking system, never from the model.**
  - Escalate to a human when unsure.
- **Cost:** about $0.02–0.04 per conversation turn on Opus at low effort [A]. Measure in staging.

**4. Return visits with consent** (Phase 2+)
- An opt-in preference profile (music, areas, budget, group size) plus booking history, used for "nights you might like" when new events are published.
- This brings people back with relevant new content, not nagging.

**Not recommended:**
- A general chatbot.
- AI tasting notes or product descriptions: the facts can't be verified.
- AI statements about price, stock, availability or bookings.
- AI-generated images of people or venues.

### Architecture and safeguards
- **Server only.**
  - A Next.js server action or route handler on the Node runtime.
  - `ANTHROPIC_API_KEY` lives in server env only; model set by `CLAUDE_MODEL`.
  - **Default `claude-opus-5-5` at `low` effort.** Cheaper models are the owner's choice after a small eval (D10).
- **Gates.** Eligibility cookie required. Sign-in required for the planner assistant and the concierge.
- **Validation.**
  - JSON Schema output.
  - Check that IDs are in the allowed set, enums are valid, and numbers are within bounds.
  - Handle `refusal` and `max_tokens`.
  - **On any failure, fall back silently to the deterministic result.**
- **Limits.**
  - Copy the existing `private.consume_community_limit` rate-limit pattern into `private.ai_rate_limits`. Example caps [A]: 20 per day per user, 5 per day per anonymous cookie.
  - A global daily cost cap acts as a kill switch.
  - 15-second timeout.
- **Privacy.**
  - Never send phone, email or user ID to Claude.
  - `ai_usage` logs metadata only (feature, model, tokens, latency, outcome).
  - No prompt text is stored by default.
  - Personalisation needs a versioned opt-in consent [A: DPDP Act review].
- **Responsible use (in the prompt and enforced in code).**
  - Always include non-drinker options.
  - No encouraging excess or drinking games.
  - A reminder not to drink and drive.
  - Planner quantities are capped by the deterministic per-guest-per-hour ceiling.
- **Labelling.** AI output reads "Suggested by AI. Check before you buy or book." Database facts are styled so they look clearly different.
- **Age.**
  - The site currently says only "legal drinking-age requirements where you live".
  - [A] Rajasthan's legal drinking age is commonly cited as 21; confirm with counsel.
  - Before bookings launch, collect date of birth at sign-up. Venues verify ID at the door.

**Measuring usefulness without engagement tricks:**
- Accept rate.
- How much users edit AI drafts.
- Thumbs up/down.
- Fallback rate.
- Cost per accepted result.
- Return rate among consenting users.
- No streaks, push nags or drinking milestones.

---

## 6. Supabase mapping

| Capability | Existing objects | Access | Change |
|---|---|---|---|
| Catalogue | `planner_products` (7 columns) | service role only, via server | Later: `catalogue_meta(price_checked_on, source_label)` once D5 is settled |
| Plans | `party_plans` (owner RLS, `city = 'Jaipur'` check) | user JWT | Later: `share_token`, `booking_id` link |
| Waitlist / requests | `waitlist_subscribers` (no repo DDL) | anon INSERT | **D4:** add `preferred_night`, `group_size`, `venue_pref`, consent v2 via migration; or a new insert-only `table_requests` table for Phase 0 |
| Auth | Supabase phone OTP, `profiles`, cookies in `session.ts` | — | Verify the SMS provider; add date of birth before bookings |
| Recipes / community | `drinks`, `saved_drinks`, likes/reviews/comments, private tables, views | — | **Retire** (section 4d) |
| AI | — | — | `private.ai_rate_limits` (deny-all), `public.ai_usage` (server insert only); later `user_preferences` (owner RLS, consented) |
| Bookings | — | — | Phase 1+ (section 7) |

**Read-only SQL checks to run before implementation:**
- `pg_policies` for `waitlist_subscribers` and `profiles`.
- List all public tables.
- `supabase_migrations.schema_migrations` vs local migration files.
- Dependency query for `drinks` (`pg_depend`).

Set `read_only=true` on the MCP URLs first.

---

## 7. Booking roadmap (now the core product)

**Phase 0: validate demand (now, next 2–6 weeks; minimal infrastructure)**
- Booking-first landing page with a "Request a table" form: insert-only table plus consent. Ops fulfil requests **manually** with 3–5 partner clubs via phone or WhatsApp.
- "For venues" lead form.
- **Measure:**
  - requests per week;
  - fulfilment rate;
  - venue response time;
  - willingness to pay a deposit or fee;
  - nights and group sizes requested.
- **Exit criterion:** set by the owner (D3). Example: ≥ 30 requests per week and ≥ 3 venues willing to use a dashboard.

**Phase 1: request-to-book, no payment**
- **TODO (owner, 2026-10-12):** primary CTA "Book tickets" (working title, may change), replacing the earlier "Request a table" idea. Not in Phase 0.
- **Tables:**
  - `venues`
  - `venue_members` (owner/staff)
  - `venue_offers` (entry / table / package, capacity, rules)
  - `booking_requests` (user, venue, night, party size, offer, status, idempotency_key)
  - `booking_status_history`
- **Statuses:** `requested → approved | declined | expired`; `approved → cancelled`.
- **Journeys:**
  - **Customer:** request → status updates → confirmation.
  - **Venue:** inbox → approve or decline within an SLA.
  - **Admin:** venue onboarding, overrides, support.
- **Notifications:** email/SMS on every status change.
- **RLS:** customers see only their own rows; venue staff see only their venue's rows.

**Phase 2: payments and passes**
- **Tables:** `quotes` (server-set, expiry), `payment_attempts`, `payment_provider_events`, `booking_passes`, `refunds`.
- **Flow:** `approved → awaiting_payment → confirmed → pass_issued → redeemed`.
- **Separate branches:** `payment_failed`, `hold_expired`, `cancelled`, `refund_pending → refunded`.
- **Provider:** an Indian gateway, e.g. Razorpay or Cashfree (D11).

**Phase 3: events, ticket tiers, table maps, guest lists, upcoming nights on the landing page.**

**Integrity rules:**
- A partial unique index on active requests per (user, venue, night).
- An idempotency key on create and pay.
- Capacity decremented in a transaction with a row lock and a check constraint.
- Holds expire automatically.
- Webhooks are signed, unique on `provider_event_id`, and checked for amount and currency.
- A payment that arrives after its hold expired is refunded automatically or flagged for review.
- A daily reconciliation job.
- Passes use hashed, revocable, single-use tokens with no personal data in the QR code.
- Prices are set on the server only.

**Fits the existing schema:**
- Reuses `auth.users`, `profiles`, phone OTP and the `city` check pattern.
- `party_plans` can later link to a booking.

**Business questions before Phase 1:**
- Commission vs fee vs subscription.
- Deposit vs full payment, and who holds the funds.
- Cancellation windows and who pays for refunds.
- Venue licence checks.
- Entry policies (couples/stag, dress code).
- Age verification at the door vs in the app.
- GST invoicing.
- Rules on advertising alcohol in India.
- DPDP obligations.
- Support hours and SLA.
- Dispute ownership.

**Prepare now:**
- Booking-first landing page.
- Phase 0 request capture.
- The documented state machine.
- Date-of-birth decision.

**Wait for validated demand:** all booking, payment and venue-portal infrastructure.

---

## 8. Prioritised implementation backlog

Effort: S ≤ 1 day, M 2–4 days, L 1–2 weeks.
Each item is one checkpoint following the AGENTS.md workflow: build, tsc, smoke test, and a progress-log update.

| # | Item | Impact | Effort | Depends on | Acceptance | Verification |
|---|---|---|---|---|---|---|
| B0 | Protect work (commit or back up untracked code); update AGENTS.md; MCP `read_only=true` (Phase 0) | Critical | S | D1 | No untracked app files; AGENTS.md matches reality | `git status`, review |
| B1 | Planner catalogue resilience + caching (Phase 0) | High | S | — | Row or category changes don't break it; still fails closed on a bad shape | `party-planner-check.cjs` + new fixtures, build, tsc |
| B2 | Hero image sourcing: brief → 3 candidates → owner pick → grade + mobile crop (Phase 0) | High | S–M | D12 | Contrast ≥ 4.5:1 on both crops; ≤ 200 KB; licence recorded | Visual review, Lighthouse |
| B3 | **Booking-first landing redesign** ("Jaipur After Dark" tokens, sections 0–10) (Phase 0) | Very high | M–L | D2, D6, B2 | Section 4a criteria | build, tsc, `brewlist-home-check.cjs` extended, screenshots 360/390/768/1024/1440/1920, Lighthouse mobile |
| B4 | **Deferred to Phase 1** (D2/D4, 2026-10-12) — re-scoped with the Phase 1 booking design (B11); Phase 0 "Request a table" + "For venues" capture (migration, insert-only, consent v2) (Phase 1) | Very high | M | D2, D4 | Insert-only RLS; validation mirrors the waitlist; no reads by anon | Migration review, mocked insert test |
| B5 | Vercel staging deploy + LCP re-measure; OTP save removed from Party Planner (owner decision 2026-10-12) (Phase 0) | Critical | S–M | Owner credentials | Staging preview live; planner works without sign-in | Lighthouse on staging, build, tsc |
| B6 | **Superseded 2026-10-12 (owner): keep recipe Find My Drink, retire community/sign-in only.** Was: Find My Drink rebuilt on `planner_products` (category, budget, size, value sort, Add to plan) (Phase 0) | Med | M | B1 | Section 4c criteria; zero `drinks` references in `app/` | Mocked harness, screenshots |
| B7 | Planner polish + deterministic starting list (Phase 0) | Med | M | D7, B1 | Section 4b criteria | Unit tests + harness |
| B8 | **Recipes stay (owner, 2026-10-12); only community objects may be retired, with approval.** Was: Retire `drinks` + community objects (archive → approved migration → cleanup) (Phase 0) | Med | S–M | B6, D13 | Section 4d verification | SQL readback, build, smoke |
| B9 | Commit missing DDL (waitlist, profiles) to `supabase/migrations/` (Phase 0) | Med | S | Read-only SQL | Repo matches remote | Schema diff |
| B10 | Claude planner assistant behind a flag (+ rate limits, `ai_usage`) (after Phase 0 measurement) | Low–Med | M | B7 results, D9, D10 | Fallback works offline; server recalculates totals; caps enforced | Mocked SDK harness + ~50-prompt eval |
| B11 | Booking Phase 1 (request-to-book) (Phase 1) | Strategic | L | Phase 0 exit, D3, D11 | Phase 1 rules; RLS per role | Schema review, RLS tests, E2E on staging |
| B12 | Guided recipe discovery MVP (priority advanced by owner 2026-10-14) | Med | M | Retained recipes; signed editorial taste and preparation-path review; occasion approval deferred | Type → taste → ranked results; separate mixed sections; uniform type-only Surprise me; preserve browse/detail/pantry/eligibility | Metadata/ranking/state tests, build, standalone types, regression and responsive production smoke |

**Order:** B0 → B1 → B2 → B3 + B4 → B5 → B6 → B7 → B8 → B9 → (measure) → B10 / B11 / B12.

---

## Verification (every checkpoint)
- `corepack pnpm build` with `pnpm_config_verify_deps_before_run=warn`.
- `node node_modules/typescript/bin/tsc --noEmit`.
- `git diff --check`.
- Existing mocked production harnesses:
  - `scripts/brewlist-home-check.cjs`
  - `scripts/brewlist-tools-style-check.cjs`
  - `scripts/party-planner-check.cjs`
  - `scripts/party-planner-backend-check.cjs`
- What they check: unexpected network requests are blocked; 44px targets, AA contrast, reduced motion, no overflow, 200% text.
- Screenshots at 360/390/768/1024/1440px.
- Graphify refresh.
- Entry in `docs/implementation-progress.md`.
- No live writes without explicit owner consent.

---

## Decisions needed before implementation

| # | Decision | Recommendation |
|---|---|---|
| D1 | Commit or back up the untracked app code now? | Yes, first |
| D2 | Hero CTA: manual "Request a table" concierge (Phase 0) or waitlist only? | **Decided 2026-10-12: waitlist only** (no partner clubs yet). "Book tickets" (working title) moves to Phase 1 (B11). |
| D3 | Phase 0 exit criteria (requests per week, venues) and 5–10 user/venue interviews | Set the targets before launch |
| D4 | New request/waitlist fields (night, group size, venue preference) via migration + consent v2 | **Withdrawn 2026-10-12:** waitlist stays email + interests only; no migration in Phase 0. Revisit with Phase 1 booking design. |
| D5 | **Price label:** what can we show for `planner_products`? Repo evidence says Livcheers website-listed prices (checked 2026-10-03), not FSSAI/MRP | Provide the source document; until then use "Listed price in Jaipur, checked 3 Oct 2026" |
| D6 | Accent: neon magenta `#FF3EA5` (from the reference) replacing burnt red; dark landing, light tools | **Approved 2026-10-12** ("sure, let's try that"); revisit after the B3 visual review. |
| D7 | Allow an optional deterministic "starting list" in the Planner (reverses the 2026-09-14 no-suggestions decision) | Yes, labelled as an estimate |
| D8 | Find My Drink without taste data (price, size, category only) for now | Yes; add editorial notes only if users ask |
| D9 | Approve `@anthropic-ai/sdk` + server API key (only at B10) | Later, after B7 is measured |
| D10 | Model for user-facing AI (Opus 5.5 default vs Sonnet/Haiku after eval) | Run the eval, then choose |
| D11 | Booking business model, payment provider, legal review (age threshold, alcohol advertising, DPDP) | Before Phase 1 |
| D12 | Hero image route: commission a Jaipur club shoot vs paid stock vs free stock | Paid stock now; commission a partner shoot when the first venue signs |
| D13 | Approve removing `drinks` + community tables (after archive) | Yes, after B6 ships |
| D14 | Script display font (one OFL face, ~25 KB) | Yes, decorative only |
