# Implementation progress

### Launch-list form and landing copy audit, 2026-10-31

**Done (not committed).** Owner asked to simplify the launch-list form and audit the other landing sections.
- **Form.** The "Interested in" chips and the "Drinks" select are gone (both tools are already on the page). The form is now Email, "I'm joining early access for Jaipur" and the consent box. `app/early-access/actions.ts` is **unchanged**: the Jaipur box still supplies the one required interest (`jaipur`), and `preference` is stored as null (the column is nullable). The unused chip and optional styles were removed from `form.module.css`; the Jaipur box now has its own error line.
- **Privacy note** now says "your email, your Jaipur selection and your consent record", which is what is stored.
- **Copy audit (landing).**
  - Hero line: dropped "pay upfront" (payment terms are not decided, D11).
  - "How it'll work" steps now follow the plan: Pick a night ("See what's on in Jaipur." with "this week" removed because nothing is live), Send a request (choose tickets or a table, price shown upfront), Venue confirms ("The venue says yes before you pay."), Show your pass. The old step 3 was titled "Pay" but described the venue confirming.
  - Left as they are, on purpose: the "Jaipur nights, booked." headline and the page title (owner decisions), the tool cards, For venues, the FAQ and the Privacy section.

**Checks actually run.** `tsc --noEmit` exit 0; `corepack pnpm build` exit 0; `home-design-check`, `brewlist-home-check`, `design-polish-check` and `early-access-check` pass; in the pane the form shows exactly email, Jaipur and consent, with no overflow at 320 or at 200% text. No live form submission was made.

**Found, not fixed.** Existing rows in `waitlist_subscribers` keep their old interests and preference values; new signups store `interests = {jaipur}` and no preference. Nothing reads those columns.

### Verification run and reminders, 2026-10-31

**Done (not committed).** Everything that could not run before now has: the Playwright harnesses, Lighthouse mobile and the unit checks.
- **How.** Playwright and Lighthouse were installed in a scratch folder outside the repo (nothing in `package.json` or the lockfile changed) and the scripts were pointed at it with `PLAYWRIGHT_MODULE` and `NODE_PATH`. System Chrome ran Lighthouse.
- **Scripts that failed and what was wrong.** All were stale assertions or markup changes from R4 and R5, not product bugs: `planner-tool-shell-check` (decorative receipt divider contrast), `planner-redesign-check` (reduced motion is `.001ms`, not `0s`), `planner-inventory-check` (heading size limit; over-budget cards now have an "Add anyway" button, not a de-emphasised class), `planner-ux-production-check` (see finding 1), `brewlist-tools-style-check` (outlined Add buttons, contrast scan rewritten to scan all text, filter status text, cook mode "Done" had been replaced by mistake), `recipe-detail-check` (metric note wording), `recipe-discovery-check` (focus ring is on the card image block), `recipe-guided-browser-check` (choice cards, back button, hydration wait, pantry hints), `recipe-pantry-browser-check` (one-away card wording), `party-planner-backend-check` (new `acceptEligibilityForm` action). All 24 `scripts/*-check.cjs` now pass.
- **Lighthouse mobile** (local production build, simulated throttling): home perf 93 / a11y 100 / best practices 100; Party Planner 82 / 100 / 100; Find My Drink 98 / 100 / 100; recipe page 90 / 100 / 100. SEO scores 63 to 66 only because the site is deliberately `noindex`.

**Findings, not fixed.**
1. Party Planner at 1280×844 with three lines: the plan panel is sticky with its own scrolling list, but at scroll 0 the "Review list" button sits below the fold (it is in view once the page scrolls). A layout call for the owner.
2. Planner LCP is about 3.5 s and TBT 330 ms: the planner is client-rendered and waits for the catalogue. Recipe page LCP is about 3.3 s (about 1.1 s server response from the live read plus the hero image; Lighthouse suggests about 112 KB of image savings). Home LCP is about 3 s with about 1 s of render delay. Worth a performance pass before launch.
3. About 50 KB of unused JavaScript on the landing page.

**Decisions.** Sign-in for bookings will be **phone code (OTP)**. Staging database and the booking migration wait ("not yet"). Hero photo: owner has no photo of their own; see the options in the reply of 2026-10-31.

**Reminders (also in the memory note `socifer-todo-reminders`).**
- **Before publishing Phase 0:** settle the business rules (D11: response window, age threshold, cancellation terms, fees); build the booking screens on phone-code sign-in; remove `noindex` (the robots rule and the page metadata) when the site goes public; fix the findings above.
- **Later:** staging database for the booking migration; verify an SMS provider for phone codes and collect date of birth at sign-up (plan, section 5).

### R6 follow-ups and booking Phase 1 backend, 2026-10-30

**Done, owner approved each item.** Two commits: the R6 follow-ups, then the booking backend.
- **Icon.** `app/icon.svg` and `public/favicon.ico` (16, 32, 48) are a plum tile with a marigold S, replacing the pink tile. `design-polish-check` now asserts `#3d1a45`.
- **404.** New themed `app/not-found.tsx` (+ `.module.css`) on the tools theme with the tool header and footer; `ToolHeader`'s `current` is now optional.
- **FAQ.** "Does Socifer sell alcohol?" and "No. We don’t sell or deliver alcohol, and we can’t tell you which shops carry what."
- **Unused images** `club-crowd.jpg` and `cocktail.jpg` deleted (`git rm`) and their rows removed from `docs/nightlife-image-credits.md`.
- **Age check wording.** "I meet the legal drinking-age requirements for Jaipur" (was "where I live"). Existing scripts match the shared prefix, so they still work.
- **Age check works without JavaScript on Find My Drink.** `AgeCheck` has a plain-form mode; `acceptEligibilityForm` in `app/party-planner/actions.ts` sets the same cookie and redirects. `next` is allow-listed to `/find-my-drink[/id]` paths (an outside URL falls back to `/find-my-drink`); an unticked post redirects to `/find-my-drink?age=needed`, which shows "Tick the box to continue." With JavaScript the inline error and focus behave as before. The Planner gate is unchanged: the planner is a client step machine and cannot work without JavaScript.
- **Booking Phase 1 backend (not applied).** `supabase/migrations/20261030_booking_phase1.sql`: `venues`, `venue_members`, `venue_offers`, `booking_requests`, `booking_status_history`; RLS (customers see their own requests, venue staff see their venue's, anyone reads active venues and offers); clients get select only and write through `create_booking_request`, `decide_booking_request`, `cancel_booking_request` (SECURITY DEFINER, pinned `search_path`, offer row locked, capacity and one-live-request-per-night enforced, idempotency key, status history in one transaction) and `expire_booking_requests` (service role). No payment objects, no hard-coded age. `app/bookings/booking.ts` mirrors the rules for forms. `supabase/seed/booking_demo.sql` is one demo venue and offer, every row `is_demo`, with a removal statement. `supabase/README.md` lists both.

**Checks actually run.** `tsc --noEmit` exit 0; `corepack pnpm build` exit 0 (7 routes); tokens check ok; every `scripts/*.cjs` passes `node --check`; `node scripts/booking-check.cjs` ok (state machine, demo walk-through, static SQL checks). Production server: a script that behaves like a browser with JavaScript off (reads the gate form, posts it, follows redirects with cookies) showed unticked → `/find-my-drink?age=needed` with the message and no cookie; ticked → cookie set and the recipe page opens; an outside `next` was rejected. In the pane (fresh cookie jar on 127.0.0.1): with JavaScript, unticked shows the inline error and focuses the box, ticked continues. The 404 has no overflow at 1440 and 320, also at 200% text, no control under 44px, and uses Bricolage.

**Not run.** The booking SQL has not been executed anywhere (no local Postgres, Supabase not connected); it is reviewed and statically checked only. Nothing was written to the live database. The Playwright scripts, Lighthouse, real devices.

**Needs the owner.** Apply the booking migration (staging or a Supabase branch first). Booking needs signed-in users, and the app has no sign-in since account save was dropped; choose the sign-in method (phone OTP or email) before the booking UI. SLA (the placeholder is 48 hours), age threshold and cancellation rules are open under D11.

### Pre-Party R6 regression and copy pass, 2026-10-30

**Done (not committed, waiting for owner approval).** All six checkpoints are built.
- **Changed:** `app/globals.css` (dead landing, hero, planner, steps, button, form, FAQ and footer rules deleted; kept the reset, base type, unthemed focus ring, `.skip-link` and `.honeypot` that the 404 and both shells use), `app/home.module.css` (footer links 44px wide: the FAQ link was 30px), `scripts/design-polish-check`, `brewlist-tools-style-check`, `recipe-guided-browser-check`, `recipe-pantry-browser-check` (stale strings: "More options", "Refine matches", "Over budget by ₹350.00", "Missing Campari: ...", "Uses your selected ingredients...", "All required ingredients selected", "This is the only eligible recipe...", "Browse and filter all published recipes", "Search the ingredient checklist", "Browser storage is unavailable.").
- **Untouched:** `app/early-access/actions.ts`, Planner logic, recipe data, URL parameters, package and lock files, tokens.
- **Fonts:** left per page. The 404 and any unthemed page use Arial, so moving Bricolage and Manrope into the layout would preload them for pages that do not use them.
- **Scripts:** every `scripts/*.cjs` passes `node --check`. I also checked every string and `[class*=]` / `.class` selector the `*-check.cjs` scripts use against the app source and stylesheets. The remaining mismatches are fixtures or dynamic names. Playwright is not installed, so none were run.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: ok. `tsc --noEmit`: exit 0. `corepack pnpm build`: exit 0, 7 routes. `git diff --check`: CRLF warnings only.
- Production smoke (`next start -p 3200`): `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder`, `/robots.txt` 200; `/nope` 404.
- Browser pane: `/` at 1440, 1024, 768, 390, 360, 320; Find My Drink entry at the same six; Browse all at 1440, 768, 390, 320; a recipe page at 1440, 390, 320; Party Planner at 1440, 390, 320. Every page, every width, and again with root text at 200%: no horizontal overflow. No control under 44px except inline text links in sentences. The one real miss was the landing footer FAQ link (30px), fixed and re-measured at 44px.
- Rendered text contrast scan (every text node against its own background, 4.5:1, 3:1 for large text) on the Planner, Browse all and recipe page in light and dark, the landing page in light and dark, and cook mode: no failures. Text over the hero photo is not scanned (image background).
- Keyboard: Escape closes the Planner filters sheet, the category sheet (focus returns to the trigger) and cook mode (focus returns to Start making). R2 to R5 covered the menu, dialogs and the Find My Drink filters sheet.
- Reduced motion: `ui.css` zeroes animations under `.sf`, the landing root and both tool roots carry `sf`, and the landing hover is inside `no-preference`. Checked in the CSS, not emulated.
- Copy: grep of all app source for slogans, exclamation marks, "order", "in stock", "MRP", "near you" and pressure to drink. Only error "!" prefixes and one FAQ sentence (below) turned up.

**Not run.** The Playwright scripts, Lighthouse mobile (the pane has no Lighthouse; not run), real devices, screen readers, real print preview (R4 checked the print CSS on screen; the recipe page print rules exist in `finder.module.css` but were not previewed), a JavaScript-off browser, the age check at each width (the eligibility cookie is httpOnly and could not be cleared in the pane; R3 covered it), and the unavailable states.

**Found, not fixed.**
- **Favicon** (`app/icon.svg`) is still the old berry-pink tile (#a92355). The tools are not pink and the design has no favicon spec. Needs a design decision. `design-polish-check` still asserts that colour.
- **404** is Next's default page on the unthemed body (Arial on cream), with the layout title.
- **FAQ wording.** "Does Socifer sell alcohol or show stock? ... we don’t know what shops have in stock." uses "in stock" as a disclaimer, which the writing rules discourage. Suggest "which shops carry what"; it is the owner's copy call.
- **Age check needs JavaScript** (carried from R3).
- `club-crowd.jpg` and `cocktail.jpg` are unused (R2 note); not deleted.

**Next.** Owner approval, then commit R6. Phase 1 backlog (B11 bookings) is separate.

### Pre-Party R5 Find My Drink, 2026-10-30

**Done (not committed, waiting for owner approval).** Find My Drink is on the Pre-Party tokens and primitives. Decisions and deviations are in `docs/pre-party-redesign-plan.md` (R5 status).
- **Changed:** `app/find-my-drink/finder.module.css` (rewritten on the token names), `components/guided.tsx` (entry route cards, stage bar, choice cards, results, edit sheet, Surprise me), `browse.tsx`, `filter-sheet.tsx`, `discovery.tsx`, `pantry.tsx`, `recipe-card.tsx` (type tag, facts), `detail.tsx`, `making.tsx`, `cook-view.tsx` (✕ close), `states.tsx`, `icons.tsx`. Filters sheet now returns focus to its button on close.
- **Removed:** `app/tool-theme.module.css` (no tool uses it any more).
- **Untouched:** `app/early-access/actions.ts`, `discovery.ts`, `queries.ts`, `pantry.ts`, `metric.ts`, `recipe.ts`, URL parameters, recipe data, the Planner, package and lock files.
- **Scripts updated, not run** (Playwright is not installed): `brewlist-tools-style-check`, `recipe-detail-check`, `recipe-discovery-check`, `recipe-guided-browser-check`, `recipe-pantry-browser-check`. New headings and labels (All n recipes, Filters, Show n recipes, Show drinks, Apply, Pick for me, Back to results, "That’s every match."). All pass `node --check`.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: ok. `tsc --noEmit`: exit 0. `corepack pnpm build`: exit 0, 7 routes. `git diff --check`: CRLF warnings only.
- Production smoke (`next start -p 3200`) against the live catalogue (read only, no writes): entry, Browse all, recipe page and cook mode work.
- Browser pane: no horizontal overflow (clientWidth equals scrollWidth) and no control under 44px on Browse all at 1440, 1024, 768, 390, 360 and 320, each also at 200% root text; Guide me (type, taste, results, edit sheet), Surprise me, the filters sheet, the recipe page and cook mode at 320 and 390 with and without 200% text. Escape closes the filters sheet and cook mode; focus returns to the Filters button and to Start making. Cancel returns focus to Edit preferences. Light and dark (`prefers-color-scheme`) seen on entry, results, filters sheet and cook mode (cook mode stays plum in light). Use what I have opens from `#use-what-i-have` and lists matches.
- Browse all without JavaScript: the server-rendered HTML (fetched with the eligibility cookie) has the h1, a GET search form, the Filters `<details>` with 14 facet links, recipe links and "Next recipes (23 more)". A real JavaScript-off browser run was not possible in the pane.

**Not run.** The Playwright scripts, Lighthouse, real devices, screen readers, the unavailable and nothing-published states (markup and CSS only), print preview of the recipe page.

**Found, not fixed.** None new.

**Next.** R6: regression and copy pass (waits for approval of R5).

### Pre-Party R4 Party Planner, 2026-10-30

**Done (not committed, waiting for owner approval).** The Party Planner content is on the Pre-Party tokens and primitives. Decisions and deviations are in `docs/pre-party-redesign-plan.md` (R4 status).
- **Changed:** `app/party-planner/planner.module.css` (rewritten on the token names; no longer uses `tool-theme.module.css`), `planner.tsx` (markup and copy only: stage indicator, radio start choice with Continue, "Suggest my list", Not drinking / Drinks each, visible "Build your list", empty and no-match states, summary bar, receipt grouped by category, flat action list, dialog copy, "How are quantities chosen?" list, "Drinks are temporarily unavailable"), `app/tool-shell.module.css` (footer links 44px wide, found in the audit).
- **Untouched:** `model.ts`, `suggest.ts`, `catalogue-server.ts`, `actions.ts`, `early-access/actions.ts`, stored draft shape, package and lock files. `tool-theme.module.css` is kept for Find My Drink.
- **Scripts updated, not run** (Playwright is not installed): `planner-inventory-check`, `planner-redesign-check`, `planner-retry-production-check`, `planner-tool-shell-check`, `planner-ux-production-check`, `brewlist-tools-style-check`, `design-polish-check`. New strings, the radio plus Continue start, no "More options", "Keep my list" / "Keep this plan" on the confirmations. All pass `node --check`.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: ok. `tsc --noEmit`: exit 0. `corepack pnpm build`: exit 0, 7 routes. `git diff --check`: CRLF warnings only.
- Production smoke (`next start -p 3200`): `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder` return 200.
- Browser pane, production build, against the live catalogue (read only; no database writes): the whole flow (setup, suggest, build, plan sheet, receipt) at 1440, 1024, 768, 390, 360 and 320, and at 200% root text on each: no horizontal overflow (clientWidth equals scrollWidth) and no control under 44px (the footer "Home" link was 42px wide; fixed). Error states for guests, budget and the suggest step show "!" text, a red border, `aria-invalid` and focus on the first field. Confirmation dialog: Escape closes and returns focus to its trigger; Filters opens from the keyboard and Escape returns focus to the button. Dark (`prefers-color-scheme`) checked on setup-to-build and the receipt. Focus ring is the 2px token ring with the page-colour gap.
- Print: the `@media print` rules were applied to the screen and checked: the print-only receipt is black on white with the brand line, grouped lines, total, caveat and the adults line, and the app shell is hidden. A real print preview was not run.

**Not run.** The Playwright scripts above, Lighthouse, real devices, screen readers, a real print preview, the catalogue-unavailable state (styled, not triggered: it needs the catalogue read to fail), drag and drop onto the plan panel, and the early-access form.

**Found, not fixed.** None new.

**Next.** R5: Find My Drink (waits for approval of R4). `tool-theme.module.css` can be deleted when R5 no longer uses it.

### Pre-Party R3 tool shell and age check, 2026-10-30

**Done (not committed).** Party Planner and Find My Drink now share the Pre-Party header, footer, theme and age check. Details and decisions are in `docs/pre-party-redesign-plan.md` (R3 status).
- **New:** `app/tool-shell.tsx` and `.module.css` (header, footer, focus ring), `app/age-check.tsx` and `.module.css`. `tool-theme.module.css` now maps the old `--tool-*` names onto the tokens, so tool content takes the light theme (dark under `prefers-color-scheme: dark`) without layout changes.
- **Changed:** `gate.tsx`, `components/shell.tsx`, `planner.tsx` (root is a `div`, `<main>` around the content, shared header, footer and age check), `finder.module.css` and `planner.module.css` (old header, gate and focus rules removed; font is Manrope), `layout.tsx`, `globals.css`, `fonts.ts`. `components/header.tsx` deleted.
- **Removed:** Nunito Sans (layout, body font, `app/fonts/NunitoSans-*` and its OFL text); nothing uses it.
- **Untouched:** `app/early-access/actions.ts`, `model.ts`, `suggest.ts`, `catalogue-server.ts`, the Find My Drink guided contract, package and lock files.
- **Scripts updated, not run** (Playwright is not installed): `planner-tool-shell-check.cjs` (age-check heading, new nav names, saved note), `brewlist-tools-style-check.cjs` (heading text, fonts, primary button colours), `design-polish-check.cjs` (Manrope instead of Nunito on `/`). All pass `node --check`.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: ok. `tsc --noEmit`: exit 0. `corepack pnpm build`: exit 0, 7 routes. `git diff --check`: CRLF warnings only.
- Production smoke (`next start -p 3200`): `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder` return 200. `/` and `/party-planner` preload only Bricolage and Manrope (no Nunito).
- Browser pane, production build: both gates in light and dark (`data-theme="tools"`, background `#fff8ee`, Bricolage mark, Manrope text); one `h1`; no horizontal overflow at 1440, 390 and 320, and at 200% root text at 320 (this found a real overflow: the card grew past its column; fixed with a `minmax(0, 1fr)` track and capped mark size). Touch targets: header and footer links, Continue and the exit link are 44px or more; the checkbox itself is 22px but sits inside a 56px choice card that is the click target.
- Behaviour: Continue unticked shows "! Tick the box to continue" with a red border, `aria-invalid="true"`, `aria-describedby` and focus on the checkbox. Ticking and continuing in Find My Drink opens the guided entry; the Planner then skips its gate and loads "Set your party" (the cookie is remembered). The focus ring is the design's 2px `--focus` outline with a page-coloured gap (keyboard Tab).
- Tool pages after the gate (guided entry, Set your party) render correctly in light and dark; their content was not redesigned.

**Not run.** The Playwright scripts, a computed-style back-to-back comparison against the committed build (R3 changes the look of the tool pages on purpose, so an identical fingerprint is not expected), a print preview (header and footer are hidden in print by CSS only), Lighthouse, real devices, screen readers, the full planner flow beyond "Set your party", Find My Drink listing, detail and cook mode in the new theme (R5 restyles them).

**Found, not fixed.** The age check has always needed JavaScript to pass; see the plan's R3 status.

**Next.** R4: Party Planner content (waits for approval of R3).

### Pre-Party R2 landing page, 2026-10-30

**Done (not committed).** `/` is rebuilt to the approved Pre-Party prototype; R1 was committed first as `e10097c`.
- **Page:** `app/page.tsx` and `app/home.module.css` rewritten (sticky header and ≡ menu below 1024px, hero with the arch photo, How it'll work, Free tools, For venues, launch-list form, Questions, Privacy, footer). Anchors kept: `#how-it-works`, `#for-venues`, `#early-access`, `#faq`, `#privacy`, `#responsible-use`, `#top`, `#main`.
- **Form:** `app/early-access/form.tsx` restyled (new `form.module.css`); fields, validation call, honeypot, consent wording and `consent_version` untouched. `actions.ts` not modified.
- **Fonts:** new `app/fonts.ts`; the display and text faces now load only on routes that import it. Damion removed from the layout and its files deleted (`git rm`); Nunito Sans stays for the tool pages.
- **Tokens/styles:** `scripts/pre-party-tokens.cjs` now writes the font stacks on `[data-theme]` instead of `:root`; `app/tokens.css` regenerated. Font sizes and line heights in `ui.css`, `home.module.css` and `form.module.css` converted from `px` to `rem` (R1 had them in `px`). `globals.css`: only the landing-only `#privacy, #responsible-use` scroll rule removed.
- **Scripts updated, not run:** `home-design-check.cjs`, `brewlist-home-check.cjs`, `design-polish-check.cjs` and `brewlist-tools-style-check.cjs` now assert the new heading, hero CTA ("Join the list"), one hero image, the `#tools` links and the new form selectors. Playwright is not installed in the repo, so none of them were run (only `node --check` for syntax).
- **Copy deviations from the prototype** (honesty and consent): cost answer, "The venue will", original privacy note and original consent sentence are kept. Details in `docs/pre-party-redesign-plan.md`.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: ok. `tsc --noEmit`: exit 0. `corepack pnpm build`: exit 0, 7 routes. `git diff --check`: CRLF warnings only.
- Production smoke: `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder`, `/robots.txt` all 200. `/` preloads the two new fonts plus Nunito Sans; `/party-planner` preloads only Nunito Sans.
- In the browser pane on the production build, at 1440, 1024, 768, 390, 360 and 320: no horizontal overflow, one `h1`, every in-page anchor resolves, no touch target under 44px (header, menu, footer links, FAQ rows, form chips, choice cards and button), fonts Bricolage Grotesque and Manrope in use, no running animations.
- At 200% root text size at 360, 390 and 320: no overflow and the hero stays inside the screen. This test caught a real overflow (the headline at 112px was wider than the screen), fixed by capping headline size with `vw`.
- Mobile menu: opens, closes on link tap, closes on Escape and returns focus to the button. FAQ opens and closes. Anchor offsets under the sticky header are 80px (mobile) and 96px.
- Form error state: submitted with an invalid email and nothing ticked (native validation turned off so the server action ran): summary note, field errors with "!", red borders, `aria-invalid`, entries kept, and no request reached Supabase.
- Focus ring on the landing page is the design's cream ring with the background gap (not the old orange).
- Tool pages unchanged: a computed-style fingerprint of `/party-planner` and `/find-my-drink` at 1440 and 390 is identical between the committed R1 build and the R2 build in the same browser state (back-to-back builds).

**Not run.** Real form submissions (success, "already on the list" and the server-error state were not triggered, to avoid writing to the live waitlist; they were checked on the design board only), Lighthouse and LCP (the hidden browser pane does not report LCP), real devices, screen readers, the Playwright scripts above, and a print preview. The design brief's 768px header breakpoint was moved to 1024px because the link row does not fit at 768.

**Next.** R3: tool header and footer, theme switching on tool routes, and the age check.

### Pre-Party R1 foundations, 2026-10-30

**Done (not committed).** Design tokens, themes, fonts and shared primitives added with no visible change to any existing page.
- **Fonts:** `app/fonts/BricolageGrotesque-latin.woff2` (39 KB, weights 700–800, optical size pinned at 48) and `Manrope-latin.woff2` (23 KB, weights 500–800), each with its OFL text. They were trimmed from the google/fonts repository variable fonts (Latin plus ₹, arrows, dashes) with `scripts/pre-party-fonts.py`, which records the sources and the recipe. Loaded with `next/font/local`, `preload: false`, in `app/layout.tsx`.
- **Tokens:** `app/tokens.css` is generated from `docs/design/pre-party/tokens.json` by `scripts/pre-party-tokens.cjs` (`--write`, `--check`). Themes `landing`, `tools` (dark under `prefers-color-scheme: dark`) and `tools-dark` apply only under `[data-theme]`; print resolves to the light tools values. Spacing, radius, size and font tokens are on `:root`.
- **Primitives:** `app/ui.css` holds the `sf-` button, stepper, chip, choice card, field, accordion, tabs, sheet, toast, skeleton, product, recipe, event, summary bar, receipt, age check, stage bar, sticker and arch styles. A `[data-theme] :is(h1, h2, h3, h4) { color: inherit }` rule stops the old global plum heading colour leaking into themed pages.
- **Not done:** Nunito Sans and Damion are still loaded, because existing pages use them (removal moves to R2 and R4/R5). No Tailwind `@theme` mapping: the app does not import Tailwind in its CSS.

**Checks actually run.**
- `node scripts/pre-party-tokens.cjs --check`: tokens match; all text and border pairs pass AA in all three themes.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0.
- `corepack pnpm build`: exit 0, 7 routes.
- `git diff --check`: CRLF warnings only.
- Production smoke (`next start`): `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder` and `/robots.txt` all return 200. The page head preloads only the two old fonts.
- No-regression check: a computed-style fingerprint (font, colour, spacing, size and border of every element, 186/71/21 elements) of `/`, `/party-planner` and `/find-my-drink` at 1440 and 390, taken from the pre-change build and from the new build, is identical. A back-to-back build of the original `layout.tsx` and of the new one in the same browser state also matches.
- Themes in the production build: the primary button resolves to the right fill and 52px height in all three themes; Bricolage and Manrope load; ₹ and tabular figures render; `tools` flips between `#fff8ee` (plum button) and `#170e1a` (marigold button) with the OS colour scheme.

**Not run.** No Lighthouse, no screen reader, no real device, and the regression scripts under `scripts/` were not re-run (nothing they assert changed). The print override was checked in the generated CSS only, not in a print preview. Fingerprints depend on the browser's pixel ratio, so compare them only at the same ratio (the pane's ratio drifted during testing, which briefly looked like a regression).

**Next.** R2: rebuild `/` to match `docs/design/pre-party/landing-prototype.html`.

### Pre-Party redesign approved, handoff and plan written, 2026-10-30

**Done.**
- **Design approved.** The owner approved a clean-slate redesign, "Pre-Party (refined)":
  - Bricolage Grotesque + Manrope.
  - Plum + marigold, with pink landing-only.
  - Themes `landing`, `tools` and `tools-dark`.
  - Minimal layout and plain copy.
- **Where it lives.** Design system artifact: https://claude.ai/artifact/5ACGtEEdZn8wKknfZzZiUU (14 screen boards at 1440/390, components, brand book).
- **Handoff files in `docs/design/pre-party/`:** `tokens.json`, `tokens.css`, `components.css` and `landing-prototype.html`. The prototype is the approved responsive landing page and uses the existing `public/images/nightlife/hero-night-mobile*` photo as a stand-in.
- **Plan.** `docs/pre-party-redesign-plan.md` sets out checkpoints R1–R6 (foundations, landing, tool shell/age check, Party Planner, Find My Drink, regression pass).
- **AGENTS.md.** "Scope and design" now points to the new plan. It supersedes section 3 of `docs/socifer-product-plan.md`, D6 (magenta) and D14 (script face).

**Unchanged.** Application code, backend, dependencies and lockfile.

**Verification.** None needed beyond `git diff --check`, since only docs and the handoff files changed.

**Open.**
- Final hero photo (B2/D12).
- Owner approval at R1 to fetch the two OFL font files.

### Staging push, Vercel preview verification, field-LCP option and decision brief, 2026-10-30

**Done.** Pushed `socifer/b0-baseline` (11 commits ahead of `main`, head `fdb0809`) to `origin` as a new branch, no force, and opened PR #2 against `main`. Tooling files (`AGENTS.md`, `.opencode/`, `opencode.jsonc`, `.mcp.json`) were not committed. No dependency or lockfile change, no database write, no env value read or printed, nothing promoted to production.

**Vercel.** Project `drink` (`prj_ASNnHRDk5BjjcfHExXJbwnPs71fH`, team `vritraroe25-6598s-projects`). The GitHub integration had already built a preview of `fdb0809` on push (READY, target preview), so no extra deploy was created: `https://drink-6byvm93mf-vritraroe25-6598s-projects.vercel.app` (SSO-protected). Env var names present and enabled for Production, Preview and Development: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` (names only; the earlier "Production only" B5 note is stale). `.env.example` lists only the first two; `SUPABASE_SECRET_KEY` is server-only and undocumented there (docs gap, not changed).

**Checks actually run.** `git status --short`, `git log --oneline main..socifer/b0-baseline`, `git diff --check` (CRLF warnings only), `node node_modules/typescript/bin/tsc --noEmit` (exit 0), `corepack pnpm build` (exit 0, 7 routes; plain `pnpm` is not on PATH), local `next start` smoke (`/`, `/party-planner`, `/find-my-drink`, `/robots.txt` all 200). On the preview, via a throwaway `playwright-core` and `lighthouse@13` in the scratchpad (nothing added to the repo), Chrome headless at 390px: `/` loads, no horizontal overflow, waitlist form present (1 email input, 1 submit, 5 consent boxes; not submitted); `/party-planner` passes the age check, and with 20 guests and a Rs 5,000 budget "Choose drinks myself" lists 228 drinks (Rs 80 to Rs 6,440) from the live catalogue; `/find-my-drink` passes the age check and shows 27 recipe links, `/find-my-drink/dn-cape-codder` renders; zero overflow and zero console errors on every page.

**Lighthouse mobile, `/` on the preview** (3 runs, default simulated throttling, HTTP/2 on Vercel): Performance 81 / 95 / 92, LCP 2.7 / 2.5 / 2.5 s, FCP 2.0 / 1.4 / 1.2 s, CLS 0.003 / 0.002 / 0, TBT 400 / 180 / 260 ms. Against the 2.5 s LCP target: met on two runs, missed by 0.2 s on the noisy first run (the machine was under memory pressure). Better than the ~3.2 s seen on staging in B5 and the 2.9 s local figure, but three runs are not proof. Lighthouse was not run on the tool pages.

**Not run.** Waitlist submission (so the insert is unverified on the preview), the regression suites (last recorded passing on 2026-10-29, not re-run today), the planner "Suggest a list" flow, and any real-device or field measurement.

**Field LCP option.** Recommendation: Vercel Speed Insights. The CSP already allows `https://*.vercel-insights.com`, the script and beacon are same-origin under `/_vercel/speed-insights/`, and it needs no backend or table. It does need the `@vercel/speed-insights` dependency (one component in `app/layout.tsx`) and the feature switched on in the Vercel project, both owner-approved steps. `web-vitals` would need a collection endpoint and storage, which is backend work this phase excludes. Caveat: the site is pre-launch, so field data stays thin until real traffic arrives; check the plan's data-point quota in the dashboard. Nothing installed. Owner decision 2026-10-30: install only if important; it is not needed pre-launch (no traffic to measure, LCP is at target on the preview), so it is left out. Revisit when real traffic exists.

**Decision brief (owner).**
- **D3, Phase 0 exit targets. DECIDED 2026-10-30 (owner delegated the choice).** Phase 0 is the pre-launch period where the site only collects waitlist emails. The exit criteria are the pass mark that tells us whether to build booking (Phase 1, B11), which is expensive and needs legal and payment work, or to stop. Without a number set in advance, any result can be argued as a success. The old target (30 requests/week) counted requests, but D2 chose waitlist-only and D4 was withdrawn, so no request flow exists; the target is restated for signups. Chosen: (1) demand: an average of at least 50 new waitlist signups per week over 4 consecutive weeks after launch (higher than 30 because an email signup is a weaker signal than a booking request); (2) supply: at least 3 Jaipur venues or promoters who say in an interview they would take booking requests or use a dashboard; (3) before launch, 5 to 10 short interviews (about 5 hosts/groups, 3 to 5 venue staff). How it works: count signups from `waitlist_subscribers` in Supabase Studio each week (no code or schema change needed); keep a plain list of interviews and venue answers. Rule: both 1 and 2 met, start Phase 1 design; only 1 met, keep the tools live and spend the effort getting venues; neither after 8 weeks, do not build booking. These numbers are judgment, not data; adjust freely once the first weeks show real traffic.
- **D5, price label.** The label "Listed price in Jaipur, checked 3 Oct 2026" is already live (`PRICE_LABEL` in `model.ts`). Open only if you hold a better source document. Recommendation: keep it, and re-check prices and update the date before launch.
- **D9, `@anthropic-ai/sdk` and a server key (B10).** B10 is not started and the SDK is not installed. Recommendation: defer until Phase 0 measurement shows the Planner needs an assistant.
- **D10, model for user-facing AI.** Plan default is Opus 5.5 at low effort. Recommendation: decide after the roughly 50-prompt eval at B10, not before.
- **Pegpedia P3. DECIDED 2026-10-30: not approved, and the Pegpedia work is removed.** The data lacked the taste, occasion and finished-drink strength information Find My Drink needs. Database: read-only check (`list_tables`, `list_migrations`) found no Pegpedia table or migration, because P3 was never applied, so nothing needed removing there. Codebase: removed `docs/pegpedia-import-plan.md`, `docs/pegpedia-import-report.md` and `scripts/pegpedia/` (3 files), and replaced the Pegpedia section in `docs/find-my-drink-guided-plan.md` with a one-paragraph note. Earlier progress entries stay as history, and the files remain in git (f3bae48). Left in place: the ignored, local-only `output/pegpedia` (about 36 MB of crawled pages, not in git, unrecoverable if deleted); delete it on request.

**Open.** LCP is at the edge of target on the preview and needs repeated and field measurement. Pegpedia removal and this entry are committed to PR #2 by owner request.

### Close-out review: inventory, deployment readiness, decision brief, 2026-10-29

Read-only. Ran `git status --short`, `git log --oneline -5`, `git check-ignore` (`.next`, `output/`, `graphify-out/` all ignored) and `git diff --check` (CRLF warnings only). All product work is already committed; the only uncommitted files are tooling config (`AGENTS.md`, `.opencode/*`, `opencode.jsonc`, `.mcp.json`), which the owner chose not to commit. No secrets found; no commits made. Deployment readiness and the decision list were prepared from `next.config.mjs`, `.env.example`, the B5 entries and `docs/socifer-product-plan.md`; no build, deploy, database or dependency action ran.

### LCP: Opus-advised placeholder attempt, not adopted, 2026-10-29

Owner decision: ask Opus 5.5 (high) for a path to 2.5 s, try once, otherwise accept. Opus diagnosed the mobile LCP element as the hero `<img>`, which paints only after the framework JS (~134 KB gz) because Lantern includes it in the LCP graph, and ranked a mobile-only CSS background of a real-entropy 400x600 AVIF (the earlier blur-up was probably ignored by Chrome as low-entropy). Tried exactly that (9 KB AVIF as a `data:` background on `.hero` at max-width 700px). Lighthouse 13.5 mobile, production `next start`, 5 runs: LCP 2.9 / 3.0 / 3.0 / 3.0 / 3.0 s (median 2.97), FCP 0.9 s, CLS 0-0.002. No gain over the earlier 2.8-2.9 s, so it was reverted and nothing shipped. LCP above 2.5 s on simulated mobile is accepted. Untried Opus options: `preload: false` for Damion, fewer next/image widths, server-only mobile menu, and a no-hydration static landing (needs owner approval as backend work). Field measurement is the recommended next step before any architecture change.

### Housekeeping: stale Planner scripts refreshed, B7/B9 re-verified, 2026-10-29

Test-only edits (scripts/): `planner-ux-production-check` (removed "Original shopping estimate" assertion; forces clipboard fallback by clearing `navigator.share`), `planner-redesign-check`, `design-polish-check`, `brewlist-tools-style-check`, `planner-tool-shell-check` (new "Set your party" stage, "Choose drinks myself"/"Suggest my list"/"Generate list", "Drinks budget (INR)", "Save changes"/"Cancel", "Search all drinks", `aria-current` categories, per-item Remove + Undo, "More options" disclosure, start-new returns to setup). All pass. `planner-inventory-check` was rewritten afterwards for browse-only categories, global search scope, item removal with Undo and no budget presets; it passes.

Run: build, tsc, git diff --check, node --check, plus early-access, party-planner(+suggest, backend, catalogue-server, retry), home-design, brewlist-home, planner-ux, recipe guided/pantry/metric/detail/discovery/browse (live read-only) and browser suites all passed. Environment note: Playwright wants chromium build 1234 (not installed) and is absent from node_modules; runs used the codex cached Playwright module and chromium-1243 via env vars/a scratch preload (no repo or dependency change).

B9: read-only SELECTs on the live project (no row reads) match `20260801_waitlist_subscribers_baseline.sql` and `20260801000001_profiles_baseline.sql`: columns/defaults, 7+2 CHECKs, FK, `waitlist_email_unique`, RLS, policies, grants (waitlist anon/auth INSERT only; profiles authenticated SELECT/INSERT/UPDATE), functions and triggers. No drift. B7 acceptance reviewed: met except where noted in the hand-off.

### B12 checkpoint 5 — production verification run, 2026-10-29 (closed)

Terminal works again. Ran: `corepack pnpm build` (pnpm absent from PATH; `pnpm_config_verify_deps_before_run=warn`) passed; `node node_modules/typescript/bin/tsc --noEmit` zero errors; `git diff --check` exit 0 (CRLF warnings only). In-process suites passed: recipe-guided-check, recipe-pantry-check, recipe-metric-check (live section fell back to retained evidence: fetch failed), party-planner-backend-check, party-planner-catalogue-server-check, early-access-check. recipe-browse-check unit section passed; its live section failed because the Supabase host does not resolve from this machine (ENOTFOUND).

scripts/recipe-guided-browser-check.cjs (production server, fixture catalogue, 360/390/768/1024/1440, short heights, 200% text, dialog focus, mixed bases, random exhaustion, storage denial, no-JS browse) passed on the second run. Repair 1 of 2: its no-JS grapefruit assertion wrongly required the word on every card, though only "A few good choices" cards show a match label; it now checks names against fixture name/ingredient matches. No product change. recipe-detail-check passed. Screenshots in output/playwright/finder-guided reviewed (390, 1440, 200% short): layout, tokens and dialog as intended; fixture photos are blocked offline.

Live-catalogue suites: the Supabase project was initially unreachable (local DNS failure for the host, then HTTP 521 / "database possibly not accessible"; project restored by the owner re-authenticating). With the project back (and a process-scoped scratch DNS preload via 1.1.1.1 because the local resolver does not resolve the host; no system change) recipe-browse-check (unit + live, six published launch recipes), recipe-discovery-check, recipe-pantry-browser-check and recipe-metric-check (live read-only, 50 rows / 187 ingredient lines) all PASSED. Repair 2 of 2 (test-only): their legacy browse URLs now carry mode=browse. All checkpoint 5 checks have now run and passed; checkpoint 5 is closed. Graphify refreshed (1059 nodes, 1965 edges). No commit, dependency, backend or data changes.

### Pegpedia P2 — acquisition and import preparation complete, 2026-10-15

The requested GPT-6 Luna medium worker used Scrapling MCP to collect 145 category pages and a preserved Whiskey boundary probe, reconciling 13,951 unique source IDs across nine categories. Prepared deterministic candidate/report artifacts and a concrete server-only/RLS supplemental-table SQL proposal. Existing 1,311 Jaipur products remain unchanged. Matching: 413 unique exact links, 193 ambiguous records, 13,342 unmatched candidates and 3 conflicts; 81 possible source-duplicate groups require review. All candidates are pending_review. Bottle ABV exists for 767 records (5.5%), including only 18 exact catalogue overlaps. No product-specific price requests or remote writes.

Verified: current preparer in-process self-check (18 cases); repeated fresh runs with identical payload hash 813b29136ffa48a7c4d8dbbf54235ac9e41001d441870555f379a84a9e6a0d92; all 145 page hashes; original crawl manifest preserved; schema/payload alignment. Parent independently verified every candidate ID and source name/size/ABV, unique exact links, valid provenance dates and payload hash. Unvalidated standalone Python crawler was removed; actual acquisition is documented in scripts/pegpedia/acquisition-reproduction.md. See docs/pegpedia-import-report.md, docs/pegpedia-import-plan.md and output/pegpedia/preparation-verification.json.

P3 database application is pending explicit owner approval for public.pegpedia_catalogue per AGENTS.md. No schema or row mutations, commit or deployment. Required pnpm build failed before process creation (helper_unknown_error); build, exact standalone TypeScript, git diff --check and Graphify remain unrun. No UI changed.


### Pegpedia P1 — source and import plan, 2026-10-14

Owner requested public catalogue acquisition with Scrapling and a GPT-6 Luna medium implementation worker. Added docs/pegpedia-import-plan.md after read-only source/API and live-schema inspection. Source advertises 13,951 products; target has 1,311 Jaipur products and a 5,000-row loader ceiling. Nationwide prices and bottle ABV cannot become Jaipur prices or recipe ABV. Plan requires exact deduplication, factual provenance, review of category defects, supplemental-storage schema approval and additive-only verified imports. No remote writes. Documentation and API contract snapshot saved; implementation and verification follow in P2.


### B12 planning follow-up — strength filtering deferred, 2026-10-14

Added a priority follow-up to docs/find-my-drink-guided-plan.md so alcoholic strength filtering is implemented when reviewed data is available. Recorded the live-read finding (ABV absent for all 35 published cocktails and 15 mocktails), required data and readiness trigger, combined base/strength matching, unknown-data and mixed-mode behavior, and release acceptance checks. Current MVP ABV exclusion remains scoped to the MVP. Documentation only; no application or database changes. Edited text read back and checked for trailing whitespace; build, TypeScript, production smoke, git diff --check and Graphify were not run for this documentation update (terminal startup remains blocked).


### B12 guided discovery checkpoint 4 — UI implemented, 2026-10-14

Added the compact entry, two-stage type/taste journey, independent mixed sections, optional base/method/search/audited ingredient refinements, desktop Apply/Cancel panel and complete native mobile/tablet dialog. Current Tool Night tokens and Nunito Sans are reused; controls wrap, primary actions are at least 48px, focus and reduced-motion rules are explicit. Recipe cards show reviewed tastes/exact base distinctions and known recorded servings/time. Ingredient state uses the existing separate session key, with visible missing quantities and audit/quantity caveats. Guided answers and selected random recipe IDs use bounded local return URLs; browser Back retains taste answers and restored pantry ranking scrolls to the recipe anchor. Surprise me draws one reviewed type-only recipe, tracks current-pool history, provides Start again and honest zero/single states. Existing browse query URLs and server-rendered no-JavaScript browse remain usable through explicit mode=browse. No Planner, waitlist action, query loader, detail/making/metric, dependency, environment or remote data writes.

Updated affected browse/pantry regression entry/return expectations and added scripts/recipe-guided-browser-check.cjs, a fixture-only production journey at 360/390/768/1024/1440, short desktop/mobile heights and 200% root text, including dialog/focus, mixed bases, quantities, detail return, random exhaustion, storage denial, malformed publication and no-JavaScript browse. The harness syntax passed; it has not run.

### B12 guided discovery checkpoint 3 — matching and state verified in-process, 2026-10-14

Implemented pure discovery ranking and coverage, signed claim invalidation, exact primary-base/subtype filtering, approved-occasion scoring support (no approved occasion records/UI), bounded preference parsing/serialization and a backwards-compatible one-item option on the existing random helper. Score is 10 per reviewed taste plus 2 per approved occasion; ties use featured/name/ID. Pantry groups precede score and explicit ingredient-only mode admits exact audited matches. Mixed partitions are ranked independently; alcoholic base never filters mocktails.

Passed via Node in-process execution: recipe-guided-check.cjs (50 signed reviews, all 15 mocktail decisions, 11 supported non-alcoholic paths, 25 pantry audits; ranking, stale claims, exact forms, required garnish/ice, measured missing items, base distinctions, mixed preferences, query bounds/roundtrips and zero/one/several random pools); existing recipe-pantry-check.cjs; existing recipe-browse-check.cjs unit section over real queries with mocked fetches; existing recipe-metric-check.cjs unit section (89 cases/invariants, live read section intentionally omitted); existing Planner backend/catalogue-server suites in isolated contexts with mocked fetch/cookies/environment; early-access-check.cjs using installed FormData and its own mock. No live writes or waitlist submissions.

### B12 checkpoint 5 — verification incomplete / environment blocked, 2026-10-14

Final active-agent source review repaired browser Back taste retention, repeated active random-type ID clearing, source base/subtype display, and pantry-ranked detail-return anchors. Final focused guided/pantry assertions pass. Full-project TypeScript through ts.createProgram/getPreEmitDiagnostics with noEmit and incremental disabled reports zero diagnostics; script syntax and a source trailing-whitespace scan across the 22 touched files pass. These are in-process evidence, not claims that the required CLI commands ran.

The standard terminal launcher again failed before starting corepack pnpm build: CreateProcess helper_unknown_error, setup refresh had errors. No alternative shell or dependency workaround was used. Still unrun: pnpm/Corepack production build; exact node node_modules/typescript/bin/tsc --noEmit command; git diff --check; production guided/browse/discovery/detail/pantry-browser/style regressions and screenshot review; production smoke at the required widths/short heights/200% text; Graphify refresh. The implementation is not release-verified and checkpoint 5 remains open. No commit or deployment. An earlier Node edit was rejected because automatic approval review reached its usage limit; it did not execute. After the user continued, the edit succeeded through the same tool.


### B12 guided discovery checkpoint 1 — 2026-10-14

Owner request advances B12 for implementation now. Added docs/find-my-drink-guided-plan.md with scope, interfaces and acceptance criteria; updated roadmap precedence and stale AGENTS recipe-retirement/tool-palette statements. Recipes remain on drinks, taste leads, mixed sections stay independent, Surprise me is type-only; occasion wording awaits owner approval and stays hidden. No backend work authorized or needed.

Terminal failed before process creation (helper_unknown_error: setup refresh had errors). No command checks have run; file inspection uses Node. Required build, standalone TypeScript, whitespace, browser/CLI regressions and Graphify remain blocked in this environment.

### Party Planner budget summary compacted — 2026-10-14

Reduced the Your plan budget block padding, spacing, figures, labels and meter size. The guest line now uses concise per-guest wording while retaining the full budget detail for screen readers. Removed the original shopping estimate sentence from the selected-plan panel; the separate final review estimate remains available. No calculation or persistence behavior changed. Build and browser checks were not run for this small presentation-only follow-up.

### Party Planner pinned review action — 2026-10-14

Fixed the Your plan continue action in app/party-planner/planner.module.css. Removed the desktop selected-list 300px minimum that could push the footer beyond the clipped panel, and retained a viewport-height sticky panel on short desktop screens. The selected items scroll in the available space while the Review list action stays at the bottom. Short mobile dialogs retain their sticky summary. No planner state or backend behavior changed.

Verification passed: Corepack pnpm production build (existing drift/override warnings), standalone TypeScript, git diff --check (existing line-ending warning), and isolated production browser fixture with the full planner journey. Additional assertions confirmed the desktop Review list button remained within the viewport at heights 844, 620, and 500px; the 500px screenshot was inspected. The repository test script remains unchanged; the temporary companion fixture was used. Graphify code-only refresh passed: 957 nodes and 1,733 edges. No commit or deployment.

### Party Planner visual refinement — 2026-10-14

Applied the requested follow-up in the original working copy at C:/Users/vritr/OneDrive/Desktop/test, preserving its pre-existing changes. Centered the suggestion panel, aligned its inputs, moved the whole-number hint into the input placeholder, and kept concise target feedback with an expandable explanation. Planner navigation and secondary actions now use rounded controls without persistent underlines. Desktop selected cards have a 112px minimum height and consistent padding; content-sized grid rows prevent single cards stretching and longer lists scroll without compressing controls. Long names and validation messages can increase card height to avoid clipping. No state, calculation, backend, dependency or environment changes.

Passed: production build with existing pnpm drift/override warnings; standalone node node_modules/typescript/bin/tsc --noEmit; party-planner-suggest-check.cjs; party-planner-check.cjs; git diff --check (existing line-ending warnings); and a temporary companion of planner-ux-production-check.cjs using cached Chromium. The companion passed the existing journey at 360/390/768/1024/1280/1440px plus centered-panel/input alignment at 768/1024/1440px, collapsed helper disclosure, scroll access to each card above the review action, unchanged single-card height after removal of other cards, and non-underlined suggestion action. Source diff and desktop/mobile screenshots reviewed. Graphify refreshed to 957 nodes/1,733 edges.

Verification limits: the original regression script remains unchanged; its former assertion that three rows all fit without scrolling conflicts with the newly requested stable card sizing. Automatic approval review rejected modifying that script because it interpreted the two-file implementation scope as a restriction. The temporary companion tests scroll reachability instead and disables native browser share to test clipboard fallback deterministically. Initial browser attempts failed for a missing default Chromium executable, native-share fixture mismatch, and the obsolete three-row assertion; the final companion passed. No physical-device or cross-browser checks, commit or deployment.

### Party Planner UX checkpoint 5: final verification and review — 2026-10-14

The current Party Planner journey is implemented and the Astra read-only final review found no outstanding source or interaction findings. Final checks passed after the last repairs: `corepack pnpm build` (with `pnpm_config_verify_deps_before_run=warn`), standalone `tsc --noEmit`, `git diff --check`, `party-planner-suggest-check.cjs`, `party-planner-check.cjs`, `party-planner-backend-check.cjs`, and `party-planner-catalogue-server-check.cjs`. The production browser fixture harness passed setup validation, explicit suggestion arithmetic and settings, draft restoration, search and category access, editing, Cancel/Undo, guest-change notice, export fallbacks, focus and responsive layout at 360/390/768/1024/1280/1440px. The separate failure fixture passed catalogue Retry and focus at 390/1280px. Earlier read-only live catalogue verification passed 1,311 rows/18 categories; the interactive browser checks used fixtures, not the live catalogue. Graphify refreshed to 957 nodes/1,733 edges.

Remaining verification limitation: older layout scripts (`planner-inventory-check.cjs`, `planner-redesign-check.cjs`, `planner-tool-shell-check.cjs`, plus Planner sections of `design-polish-check.cjs` and `brewlist-tools-style-check.cjs`) assert the removed inline setup card or immediate builder. They fail against this approved journey and have not been migrated. The new production browser harness covers the current UX, but those historical regression suites are not green. Physical devices and browser zoom were not tested. No commit or deployment was made; pre-existing working-tree changes were preserved.

### Party Planner UX checkpoint 1: interaction contract — 2026-10-13

Owner approved direct, unselected servings per drinking guest and equal target servings across explicitly selected eligible categories. `docs/party-planner-ux-plan.md` records both rules. Current Planner source, suggestion engine, responsive CSS, draft persistence and caller checks were inspected. No implementation or verification claim is made for later checkpoints yet. The legacy Luna and Terra model IDs are unavailable in this session; no substitute executor was used. The available `gpt-6-astra` model was requested for the final read-only review.

### Party Planner UX checkpoint 2: setup and browsing — 2026-10-13

Added a standalone required guests/budget setup before any addable catalogue. Removed budget presets. Manual and suggestion actions now branch after valid setup with inline validation and focus on the first invalid input. Desktop categories wrap; below 1024px a complete dialog picker shows every category. Browsing does not change selected lines. Search works across the loaded catalogue, shows result categories and uses a separate filter scope so old category filters do not hide global results. A fixture production browser check exercised setup validation, all fixture category labels, browse-only navigation, search outside the active category and no horizontal overflow at 360, 390, 768, 1024, 1280 and 1440px. These are fixture results, not live UI catalogue verification.

### Party Planner UX checkpoint 3: suggestion and draft state — 2026-10-13

Replaced duration/mix weights with explicitly entered servings per drinking guest and selected eligible categories. `suggest.ts` splits target servings equally, rounds up to whole packs, preserves deterministic product and budget fitting, and reports an impossible budget without removing a selected category. The result separates target from pack coverage. Persisted new preferences, estimate basis and guest notice in the existing draft key; compatible older drafts retain selected items and require setup if incomplete. Guest edits leave quantities unchanged with a visible notice; editing suggestion requires replacement confirmation, Cancel and Undo restores the prior list and assumptions. `party-planner-suggest-check.cjs` passed explicit-category arithmetic, rounding, determinism, exclusions, limits and budget conflict; fixture production browser passed settings reload, legacy incomplete-draft restoration, Cancel, Undo and guest edit/Cancel.

### Party Planner UX checkpoint 4: receipt, recovery and browser check — 2026-10-13

Receipt and panel now distinguish Budget per guest from Estimated cost per guest. Mobile receipt has Share list, Edit list and a More options disclosure for copy, print and starting over. Catalogue failure after eligibility routes to the same unavailable/Retry state. Mobile Undo moved into the open plan dialog after a browser assertion found the previous toast was blocked by the dialog top layer. Fixture production browser checks passed manual quantity validation, removal/Undo, denied-clipboard manual-copy fallback, print dispatch, failed catalogue Retry/focus, and no page errors. Screenshot review at 390, 768 and 1280px showed the setup-free builder, category picker and compact receipt actions without visible clipping. A 200% root-font check passed at 390px; physical browser zoom and real devices were not tested. Read-only `party-planner-live-catalogue-check.cjs` separately passed against the 1,311-row/18-category live catalogue; it does not establish live production UI availability. Old Planner layout harnesses still target the removed setup card and currently fail; this remains verification work for checkpoint 5.

Desktop panel refinement after checkpoint 4: a three-category fixture suggestion at 1280×844 initially put the third row behind the review area. Compact row spacing and shorter estimate copy moved all three complete rows above it (row bottoms 486.5, 607.7 and 709.3px; review area starts 713.4px). The browser assertion checks the review area boundary. The same browser check covers category-picker focus return and Cancel/Undo restoration of earlier suggestion inputs. Final focused model, suggestion, backend and catalogue-server checks, build, standalone TypeScript and diff check passed before the final reviewer pass.

### Socifer B2: hero image sourced and graded — 2026-10-12

D12 decided: the owner prefers free stock and picked candidate A from a 3-image shortlist (`output/hero-candidates.png`): Pexels 1190298, "Purple Fireworks Effect" by Wendy Wei, 3300×2200, Pexels licence. It was graded toward the palette (darker shadows, violet bias) with sharp from an out-of-repo script (`C:\Users\vritr\Backups\scripts\hero.cjs`). Exported to `public/images/nightlife/hero-night-desktop.{avif,webp}` (2400×1600; 141 KB and 171 KB) and `hero-night-mobile.{avif,webp}` (1200×1800 portrait crop; 102 KB and 123 KB). All variants are under 200 KB. Credit recorded in `docs/nightlife-image-credits.md`. Headline-band contrast was measured on the 99th-percentile brightest pixel against `--bone`. B3 must apply at least a 55% `--night` overlay across the headline band, which gives at least 6.1:1 on both crops (40% gives 4.2–4.3:1 and fails). Not yet wired into the page: integration, Lighthouse and LCP checks belong to B3. Also completed the pending B0 item: with owner approval, added `read_only=true` to the Supabase MCP URLs in `opencode.jsonc` and `.opencode/opencode.json`.

### Socifer B1: Planner catalogue resilience and caching — 2026-10-12

Following `docs/socifer-product-plan.md`, `app/party-planner/catalogue-server.ts` no longer demands exactly 1,311 rows with fixed per-category counts. Instead it applies sanity bounds: 100–5,000 rows, 1–40 categories, and the reported total must be consistent across pages. It still fails closed on bad shape, duplicate or unordered ids, non-positive size or price, an unexpected origin, or a missing secret. Catalogue fetches now use `next: { revalidate: 3600, tags: ['planner-catalogue'] }` (exported as `CATALOGUE_TAG`) instead of `no-store`. `scripts/party-planner-catalogue-server-check.cjs` gained resilience fixtures (changed category, 1,200 rows, removed category, new category, 2,011 rows) and fail-closed fixtures (99 rows, 100 categories, unordered ids, zero price, total changing between pages). `scripts/party-planner-backend-check.cjs` used to simulate an unavailable catalogue by dropping one row, which is now valid. It now uses a malformed row.

Verification actually passed: `corepack pnpm build` with `pnpm_config_verify_deps_before_run=warn` (existing ignored-override and lockfile drift warnings), `node node_modules/typescript/bin/tsc --noEmit`, `git diff --check` (line-ending warnings only), `party-planner-check.cjs`, `party-planner-backend-check.cjs`, `party-planner-catalogue-server-check.cjs`, and `brewlist-tools-style-check.cjs`. The style check needs `NODE_PATH` pointing at a cached npx Playwright because Playwright is not a project dependency. Graphify refreshed: 954 nodes, 1,818 edges. Not run: `party-planner-live-catalogue-check.cjs` (it reads live data). Known limit for B7: `model.ts` still caps a plan at 18 selected categories.

### Socifer B0: work protected, AGENTS.md updated — 2026-10-12

Created an off-repo backup at `C:\Users\vritr\Backups\socifer-pre-B1-2026-10-12.zip` (excluding node_modules, .next, graphify-out, .git and `.env*`). Committed the accumulated work as `770e692` on branch `socifer/b0-baseline`. Both migration files are committed but not applied. `.opencode/` is left uncommitted. `output/`, `tmp/`, `.playwright-mcp/`, `__pycache__/` and the EkQuarter source files are now gitignored. Copied the approved v2 plan to `docs/socifer-product-plan.md`. Updated AGENTS.md: the layout, backend and design sections now describe Socifer instead of the neutral placeholder. Still pending owner permission: adding `read_only=true` to the Supabase MCP URLs in `opencode.jsonc` and `.opencode/opencode.json`. The edit was blocked by the tool permission classifier.

### Socifer public brand rename checkpoint — 2026-10-12

Changed the current user-facing platform name from Brewlist to Socifer across homepage and tool wordmarks, accessible labels, early-access consent/success copy, FAQ, Planner sharing title, current page metadata and README. Replaced the B monogram in `app/icon.svg` with an S in the same style and regenerated `public/favicon.ico` from it at 16/32/48/64px using the already installed sharp package. Existing route paths, backend actions, cookies, storage keys, catalogue provenance, fixture identifiers, historical documents and script/env names retain their values for compatibility. All prior uncommitted work was preserved; no dependency, credential or backend change was made.

Verification actually passed: fresh `corepack pnpm build` with `pnpm_config_verify_deps_before_run=warn` (existing lockfile drift and ignored-override warnings), exact `node node_modules/typescript/bin/tsc --noEmit`, `git diff --check` (existing line-ending warnings only), `rg -i Brewlist app` with no matches, production homepage HTML containing Socifer and no Brewlist, and the unchanged `node scripts/brewlist-tools-style-check.cjs` mocked production browser smoke. A temporary copy of that isolated harness passed 15 rendered Socifer/no-Brewlist/title checks across homepage, Planner gate, Finder listing/detail/unavailable/saved and no-JavaScript routes. It used the cached Playwright/Chromium paths, did not touch live services, and cleaned up its server and generated fixture files. The original harness fixture and repository scripts were not changed for this rename. No commit, deployment, installation, live database write, waitlist submission or payment occurred.

Graphify refreshed with `graphify extract . --code-only --no-cluster --max-workers 2`: 954 nodes and 1,818 edges; 46 non-code and 23 unclassified files were skipped. Astra final review explicitly passed with no blocking findings. The reviewer verified the rendered S SVG and matching 16/32/48/64px ICO payloads, and confirmed current app copy/metadata and legacy identifiers; without a pre-rename snapshot, the entire accumulated dirty HEAD diff cannot be independently certified.

### Find My Drink redesign and integrated closeout checkpoint — 2026-10-12

Completed the approved Finder presentation checkpoint. The browse-first controls, URL-driven filter dialog and chips, compact recipe rows, practical detail layout, single community controller, saved-recipe inline removal retry and visible pending states are in place. Final repairs kept Tab focus within the filter dialog, added visible focus to Finder selects and textareas, set pending text on selected dark facet chips and drink-type tabs to white for AA contrast, and added native same-URL Retry links to unavailable browse and detail states (working with and without JavaScript). The browser harness contrast helper was corrected after checking the rendered pending-status colours (rgb(183, 55, 32) on rgb(244, 241, 234)); its AA assertion remains active and now covers pending removal on a dark active chip and selection of an already-active drink type from a pick URL. Planner UI and the frozen backend, route, data, homepage, dependency and environment surfaces were not edited in this checkpoint. The protected-file manifest at tmp/astra-resume-protected-hashes.json matched all 3,707 entries on final director check.

Verification actually passed on the final app state: a fresh `corepack pnpm build` with `pnpm_config_verify_deps_before_run=warn` (Next 16.3.0, existing ignored-override and lockfile drift warnings), exact `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/brewlist-tools-style-check.cjs`, the focused pantry, community, metric and platform-action checks, harness syntax check, and `git diff --check` (line-ending warnings only). The production browser harness used only its two synthetic example.invalid recipes, exact Content-Range including the ID-filter response, and rejected unexpected browser/upstream requests, including unlisted Supabase-origin REST paths and methods; the expected profile upsert is explicitly mocked. It asserted URL/filter/history and no-JavaScript behavior, same-URL retry on unavailable browse and detail with JavaScript on and off, dialog focus restoration and containment, 44px targets, AA contrast (including active-chip pending removal and active drink-type pending navigation), reduced motion, no horizontal overflow at 200% text, short viewport reachability, and a mocked saved DELETE failure followed by successful retry while the private note and saved item remained visible after failure. No live write, waitlist submission or payment was made. The owned server stopped and its preload was removed.

Fresh screenshots (refreshed 2026-10-12 10:14 UTC) in C:/Users/vritr/AppData/Local/Temp/opencode were inspected: brewlist-tools-finder-{360,390,768,1440}.png, brewlist-tools-detail-{360,390,768,1440}.png, brewlist-tools-finder-filter-short-390-500.png, brewlist-tools-finder-filter-text-200-390.png, brewlist-tools-detail-text-200-390.png, brewlist-tools-finder-pending-removal-390.png, brewlist-tools-finder-pending-type-390.png, and fully loaded brewlist-tools-home-regression-{390,1440}.png. Detail captures now show the intended top of the recipe, including title, facts and making entry, after earlier screenshots had been scrolled by keyboard checks.

Limitation: `scripts/recipe-browse-check.cjs` was run once before its live-read behavior was noticed. It passed its unit section but failed a reviewed-recipe assertion that depends on current catalogue data, and may have made read-only Supabase requests. It wrote `tmp/recipe-browse/stub-server-only.cjs` and `production-server.log`; those workspace artifacts were preserved. The discovery/detail browser scripts were not run because they require environment settings and write persistent output; the isolated production harness covered their requested UI flows with synthetic data. No dependency install, commit or deployment occurred. Graphify refreshed after the final type-tab repair with `graphify extract . --code-only --no-cluster --max-workers 2`: 954 nodes and 1,815 edges; 46 non-code and 23 unclassified files were skipped. Astra final source and screenshot re-review explicitly passed with no blocking findings; the reviewer relied on the executor’s fresh build and browser evidence and did not access live services.

### Party Planner redesign checkpoint complete — 2026-10-09

Completed Astra-reviewed Planner checkpoint from docs/brewlist-tools-design-plan.md. The existing responsive Planner now has the approved persistent desktop plan and mobile selected-plan dialog with shared validated quantities. This pass corrected the mocked production harness: CSS Module selectors now resolve reliably, unexpected browser requests are logged and rejected, and the first-row check verifies that the complete product row remains above the mobile plan bar instead of enforcing an arbitrary 500px coordinate. Focused assertions cover category removal/Undo, guest print dispatch and clipboard-denied copy/share fallback, invalid quantity recovery, dialog focus restoration, over-budget review/edit preservation, and many-item desktop plus short-height review reachability at 1440px and the 1000px breakpoint. A one-line pre-existing whitespace defect in the Planner stylesheet was removed. No Planner business/state behavior changed in this pass; the existing harness fixture (exact Content-Range, synthetic recipe ID, two example.invalid recipe sources and unexpected-network rejection) remains intact.

Astra reviewed the source and fresh screenshots and approved the Planner checkpoint. The first selected product row measured y=568.6px at 360px width; the full 185.7px row finished above the fixed mobile plan bar, so no CSS change was warranted. Fresh browser evidence is in C:/Users/vritr/AppData/Local/Temp/opencode: brewlist-tools-planner-interior-{1440,1024,768,390,360}.png, brewlist-tools-planner-selected-plan-390.png, brewlist-tools-planner-short-plan-390-500.png, brewlist-tools-planner-long-plan-1440.png, brewlist-tools-planner-short-long-plan-1440-500.png, brewlist-tools-planner-gap-long-plan-1000.png, and brewlist-tools-planner-interior-firstrow-{360,390}.png. The earlier 500px first-row assertion failure was replaced after visual inspection; it was a test threshold issue, not a clipped UI.

Verification actually passed against the fresh production build: corepack pnpm build (Next 16.3.0; existing dependency/lockfile drift and ignored override warnings; Next skipped type validation), node node_modules/typescript/bin/tsc --noEmit, node scripts/party-planner-check.cjs (calculations and guest export text), node scripts/party-planner-backend-check.cjs (mocked eligibility/OTP/ownership/session behavior), node --check scripts/brewlist-tools-style-check.cjs, the isolated node scripts/brewlist-tools-style-check.cjs production browser flow, and git diff --check (only existing LF/CRLF conversion warnings). Browser smoke assertions passed with zero page errors, zero blocked browser or mocked-server network requests and screenshot captures at 360/390/768/1024/1440 widths. Physical browser zoom / a dedicated 200% text-size run was not performed. No real persistence/auth/SMS write, external network request, dependency or environment change, commit, or deployment occurred.

Graphify refreshed after this checkpoint with graphify extract . --code-only --no-cluster --max-workers 2: 946 nodes and 1,807 edges; 46 non-code files were skipped, with 23 unclassified files noted. Planner is complete and Astra-reviewed. Finder implementation is the next sequential checkpoint; no Finder files have been changed in this checkpoint. Existing user changes and preserved source-adjacent material remain in place.


### Party Planner and Find My Drink design approval checkpoint — 2026-10-08

Completed the requested research and design-plan checkpoint in
`docs/brewlist-tools-design-plan.md`. Application implementation has not begun;
awaiting owner approval of the single direction and explicit behavior changes.
Astra audited current routes, presentation/state models and frozen interfaces;
reviewed current mocked desktop/mobile tool screenshots and the fully loaded
homepage at 1440px and 390px; and incorporated the coordinating agent's fresh
District, Fabric London, MotionSites and Refero desktop/mobile browser research.
The plan includes observed UX problems, reference mapping, shared visual rules,
wireframes, interaction/error/save states, future-feature boundary, phased file
ownership and acceptance criteria. Historical typography/palette guidance is
explicitly superseded by the current homepage. The owner-facing approval must
also resolve the unavailable exact legacy Luna model identifier before execution.

Current baseline verification: original `scripts/brewlist-tools-style-check.cjs`
passed against existing BUILD_ID `o7PeQDJcztQejgFQUNpzA`; no app/public file was
newer than that artifact. A temporary companion retained its fixture and blocked
network behavior while adding viewport captures at 360/390/768/1440px. It passed;
its first homepage captures preceded image loading, so it was rerun with an
explicit loaded-image check and passed again. Replacement desktop/mobile homepage
captures were actually inspected and show the current crowd photography and
Nunito Sans styling. Tool captures include planner catalogue, filters, recipe
browse/detail and saved auth. Files are under
`C:/Users/vritr/AppData/Local/Temp/opencode/brewlist-tools-research-*.png` and the
original `brewlist-tools-*.png`. No tracked harness was changed. This is baseline
research, not a claim that proposed redesign acceptance checks have passed.

Reference limits are recorded in the plan: exact Refero links recovered from
repository docs; Fabric/MotionSites URLs reconstructed through fresh research,
with historical MotionSites domain not proven. Refero's responsive style pages
were inspected, not the embedded brands' live mobile sites. District's observed
mobile search clipping is explicitly rejected. No reference assets copied.

The in-app browser was unavailable after documented discovery. Local research
used the existing repository Playwright harness; external browser research used
the coordinating agent's available browser. After an execution-helper setup
failure, ordinary Node child-process/file APIs completed the same authorized
local checks. There was no approval rejection or security bypass.
`git diff --check` passed with existing CRLF warnings; Graphify code-only refresh
passed with 945 nodes and 1,805 edges. Build and TypeScript were not rerun for
this docs-only checkpoint; fresh build, standalone TypeScript and production
smoke remain mandatory after approved implementation. No real database/SMS/form
write, application/backend/dependency/environment edit, commit or deployment.
All pre-existing uncommitted work is preserved.

### Verification-only tools closeout — 2026-10-07

Preserved the existing uncommitted application and fixture work. The current
`.next/BUILD_ID` was `o7PeQDJcztQejgFQUNpzA`; no `app/` or `public/` file was
newer than it, so the prior-session production build and standalone TypeScript
results remain the build evidence. That previous session also passed the
original isolated tools smoke once after the build, `git diff --check` with
existing line-ending warnings, and Graphify refresh (945 nodes, 1,805 edges).

In this session, reran `node scripts/brewlist-tools-style-check.cjs` against
that artifact with the cached Playwright module and Chromium; it passed. A
temporary companion in `C:\Users\vritr\AppData\Local\Temp\opencode\` reused
the original smoke's synthetic fixture and network isolation without changing
its fixture or interactions. It captured viewport screenshots of open planner
filters at 390px and an open inventory drawer at 1440px and 390px with one
synthetic item at quantity 2. Automated assertions passed for dialog access,
two-pack and summary text, no document horizontal overflow, zero page errors,
and no unexpected server requests. Visual inspection found readable labels,
spacing, totals and controls with no clipping in all three states. Evidence:
`brewlist-companion-filters-390.png`, `brewlist-companion-inventory-1440.png`,
and `brewlist-companion-inventory-390.png` in that temporary directory.

The first companion launch failed before server start because its temporary
checkout path was malformed. After correction, a drawer-button selector timed
out; the captured failure screenshot showed the mobile control used parentheses
around the item count. The selector was corrected, and the bounded rerun passed.
No auth/save form was submitted and no live data was written. No UI, backend,
dependency, commit, or deployment change was made. The owned server was stopped.
Final `git diff --check` passed with existing LF/CRLF warnings only, and
`graphify extract . --code-only --no-cluster --max-workers 2` passed with 945
nodes and 1,805 edges. Port 3246 had no listener and the temporary preload was
absent after the run.

### Mocked tools smoke fixture repair — 2026-10-07

Updated only `scripts/brewlist-tools-style-check.cjs` to remove its stale
recipe-snapshot dependency. Its isolated drinks fixture now has two complete,
clearly synthetic valid rows (one cocktail and one mocktail), explicit nullable
fields, boolean `featured`, non-empty ingredients/preparation, and
`https://example.invalid/` provenance. Every mocked drinks response, including
detail-ID filters, now supplies the required exact `Content-Range`; the detail
smoke targets the synthetic cocktail. The original planner smoke portion was
retained unchanged. Finder screenshots are taken before the Cocktails filter
click, and an unloaded/filter-error path logs the visible body state. The
preload fixture intercepts only the configured Supabase origin and rejects/logs
unexpected network; no live database or other write occurred.

Actually executed once: `node scripts/brewlist-tools-style-check.cjs` passed
with the cached Node Playwright module
`C:\Users\vritr\AppData\Roaming\npm\node_modules\n8n\node_modules\playwright`
and cached Chromium
`C:\Users\vritr\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`.
It printed `PASS: safe mocked production browser smoke; screenshots in
C:\Users\vritr\AppData\Local\Temp\opencode`; the owned server and temporary
preload were cleaned up. Finder initial screenshots are
`C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-tools-finder-initial-1440.png`
and `C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-tools-finder-initial-390.png`;
post-filter, planner, synthetic-detail, and saved-auth screenshots are in the
same directory under `brewlist-tools-*.png`. `node --check
scripts/brewlist-tools-style-check.cjs`, standalone `node
node_modules/typescript/bin/tsc --noEmit`, and `git diff --check` passed;
`git diff --check` retained only existing CRLF warnings. The single bounded
browser run used the pre-existing `.next` production artifact
(`BUILD_ID _S3bJV5prFWgpYgHI_YAj`) and was not repeated after the later build.

Director verification subsequently passed: with
`pnpm_config_verify_deps_before_run=warn`, `corepack pnpm build` completed on
Next 16.3.0 with the existing ignored-override and dependency-drift warnings;
Next skipped build-time type validation. Standalone `node
node_modules/typescript/bin/tsc --noEmit` also passed. `graphify extract .
--code-only --no-cluster --max-workers 2` passed, producing 945 nodes and 1,805
edges. The director viewed
`C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-tools-finder-initial-390.png`
and confirmed both synthetic rows loaded before filtering. This later build does
not add a post-build browser-smoke claim.

### Homepage typography readability checkpoint — 2026-10-06

Updated only `app/home.module.css` to use the existing local Nunito Sans variable
font on the homepage with Arial fallback. Removed condensed/display font styling,
changed headings, navigation, and “Coming soon” to normal-width sentence case,
and adjusted heading scale, tracking, line height, and supporting text sizes for
readability without changing homepage copy, layout, imagery, palette, controls,
or backend behavior.

Verification passed: `pnpm_config_verify_deps_before_run=warn corepack pnpm
build` (with the existing ignored `pnpm.overrides` and lockfile/node_modules
drift warnings; Next skipped build-time type validation), `node
node_modules/typescript/bin/tsc --noEmit`, and `git diff --check` (with existing
unrelated CRLF warnings). The owned production browser check passed on port 3217
at 360, 390, 768, and 1440px, including no horizontal overflow, hero bounds,
44px targets, keyboard FAQ/menu/skip-link behavior, route checks, and zero page
errors; no form was submitted. Visual review found the revised desktop and mobile
hero text readable with no clipping. Screenshots:
`C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-nightlife-1440-hero.png`
and
`C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-nightlife-390-hero.png`.
The owned server was stopped.

### Photography-led Brewlist homepage completed and reviewed — 2026-10-05

Completed the approved photography-led Brewlist homepage, replacing the rejected
technology-prototype direction with a near-black, off-white, and burnt-red
nightlife system. The homepage uses licensed local club-crowd and cocktail
photography, with credits and source/licence checks in
`docs/nightlife-image-credits.md`; the stock imagery is not represented as
Jaipur venues. Added `public/images/nightlife/club-crowd.jpg` (Jerome Govender,
Pexels 2114365, 215,685 bytes) and `public/images/nightlife/cocktail.jpg` (Thu
Huynh, Pexels 17541202, 65,671 bytes). A Fabric London browser review informed
the full-width photographic precedent; MotionSites and Refero were visually
reviewed, while RA browser access was blocked and Printworks was a holding page.

The owned production browser script on port 3217 passed at 360, 390, 768, and
1440px: local photos loaded at target sizes; menu and FAQ worked by keyboard;
the skip link worked; there were no page errors; and `/`, `/party-planner`,
`/find-my-drink`, and `/find-my-drink/saved` returned 200. Hero bounds/range
coverage and a 200% root-text test were improved. Screenshot review caught and
fixed an initially clipped mobile headline by removing masking and constraining
the flex width. Screenshots are under
`C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-nightlife-1440-{full,hero}.png`
and the corresponding `390` paths. The owned server was stopped; no live write
occurred. Source and screenshot review found no blocking or important issues.

Director verification after the final changes passed: `pnpm_config_verify_deps_before_run=warn
corepack pnpm build` and `node node_modules/typescript/bin/tsc --noEmit`.
The existing pnpm overrides/dependency-drift warnings remain, and Next skipped
build-time type validation. Graphify refresh is being performed separately and
is not claimed here.

### Brewlist homepage-only pre-launch prototype — 2026-10-05

Implemented the approved homepage-only Brewlist prototype in `app/page.tsx` and
`app/home.module.css`. The obsolete cream/plum, image-led homepage is replaced
with a dark booking-prelaunch hero, original CSS conceptual booking-flow art,
light factual tools and booking-flow sections, FAQ, unchanged EarlyAccessForm,
accurate privacy/responsible-use anchors, and responsive native mobile menu.
The live tools link only to the existing Party Planner and Find My Drink routes;
future club booking steps are explicitly labelled as coming soon. No booking,
payment, venue, account, data, backend, early-access action/form, dependency,
environment, or global-style behavior was changed. `scripts/brewlist-home-check.cjs`
was added as a focused production homepage check. The external browser reference
audit remains incomplete; this is a prototype for review, not a visual lock.

Verification passed: `pnpm_config_verify_deps_before_run=warn corepack pnpm
build` passed with the existing ignored `pnpm.overrides` and lockfile/node_modules
drift warnings; Next skipped build-time type validation. Standalone `node
node_modules/typescript/bin/tsc --noEmit` passed. `git diff --check` passed with
existing CRLF line-ending warnings. An owned local production server on port
3192 returned HTTP 200 for `/`, `/party-planner`, and `/find-my-drink`, then was
stopped; no form was submitted and no live write occurred. Repair cycle 1 made
all homepage navigation, footer links, wordmarks, FAQ summaries, action buttons,
and waitlist checkbox labels at least 44px, added dark/light focus-ring variants,
removed the page-wide overflow mask, and corrected the conceptual illustration's
image semantics. The focused Playwright browser check passed at 360, 390, 768,
and 1440px: no horizontal overflow, keyboard FAQ/menu operation, 44px visible
targets, zero page errors, reduced-motion context, skip link, and product-route
smoke. Screenshots: `C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-home-1440.png`
and `C:\Users\vritr\AppData\Local\Temp\opencode\brewlist-home-390.png`.
Repair cycle 2 corrected the opened mobile-menu link targets: all four links now
use flex alignment and a 44px minimum height. The focused browser check was
expanded and passed at 360, 390, and 768px with every opened-menu link visible,
at least 44×44px, and keyboard-focusable in sequence. The owned smoke server was
stopped after the check; no form was submitted or live write made.
`graphify extract . --code-only
--no-cluster --max-workers 2` passed, refreshing `graphify-out/graph.json` to
926 nodes and 1,775 edges without clustering; it skipped 32 non-code and 14
unclassified files. The external browser reference audit remains incomplete.

### Brewlist Jaipur pre-launch redesign plan approved; documentation only — 2026-10-05

Added `docs/brewlist-redesign-plan.md`: an approved proposed (not implemented)
club-first Jaipur pre-launch plan with exact homepage copy, bounded factual tool
flows, research limitations, accessibility/performance targets, staged read-only
data discovery, and separate future commerce requirements. It identifies current
route/source constraints for the homepage, Party Planner, Find My Drink, and
early access, and explicitly retains existing gates, saves, moderation,
consent, and insert-only behavior. No application, database, SQL, assets,
credentials, environment, package, or lockfile change occurred; existing user
working changes were left untouched. Pending decisions remain budget scope and
area catalogue availability, asset rights, and venue/payment/refund operations.

Verification passed: initial `pnpm build` could not run because `pnpm` was not
on PATH; fallback `pnpm_config_verify_deps_before_run=warn corepack pnpm build`
passed, with existing ignored `pnpm.overrides` and lockfile/node_modules drift
warnings and Next's build-time type-validation skip. Standalone `node
node_modules/typescript/bin/tsc --noEmit` passed. `git diff --check` passed with
existing CRLF line-ending warnings. Required `graphify extract . --code-only
--no-cluster --max-workers 2` passed, refreshing `graphify-out/graph.json` to
922 nodes and 1,773 edges with no clustering; it skipped 32 non-code files and
reported 14 unclassified files. No UI smoke, waitlist submission, payment, or
live database operation was performed.

### Brewlist active-surface brand replacement — 2026-10-04

Replaced the visible active-site and page-metadata brand from AllCheers to Brewlist
across the homepage, early-access form, recipe finder, Party Planner, favicon, and
README. The active public `favicon.ico` now contains a Brewlist B and sparkle to
match `app/icon.svg`; historical assets remain unchanged. Existing cookies,
localStorage keys, MIME types, synthetic origins, data provenance, backend behavior,
environment files, and historical documentation remain unchanged. Verification passed:
`node node_modules/typescript/bin/tsc --noEmit`; Corepack `pnpm build` with
`pnpm_config_verify_deps_before_run=warn` (existing pnpm override/dependency-drift
warnings; Next skips build-time type validation); and `git diff --check` (existing
line-ending warnings). A local production smoke on port 3191 returned HTTP 200 for
`/`, `/party-planner`, `/find-my-drink`, and `/find-my-drink/saved`; each response
contained Brewlist and did not contain AllCheers. `/favicon.ico` returned 200 as
`image/x-icon`, and `/icon.svg` returned 200 as `image/svg+xml`. The smoke server
was stopped.

### Conservative retired-file cleanup complete; database audit read-only — 2026-10-04

Removed three retired planning documents and five unused legacy public images.
`docs/allcheers-assets.md` now records their retirement while preserving
attribution and identifies the owner-provided active output as
`public/images/updated/{hero-table,glassware,rooftop-party}.webp`. All four
workbooks, `EkQuarter_Product_Images/`, original owner source images,
recipe extraction/review artifacts, current site images, active technical
plans, mockup/recovery archives, and application code were retained; no recipe
completion is claimed.

The database was audited read-only: `planner_products` has 1,311 rows,
`drinks` has 9,462 rows (9,400 drafts), `party_plans` has zero rows, no planner
candidate/backup staging tables or storage buckets exist, and nothing was
removed or changed. Verification passed: Corepack production build (with the
existing pnpm drift/override warnings and Next build-time type-validation skip),
standalone TypeScript, live planner catalogue check (1,311/18), `git diff
--check` (with its existing line-ending warning), and corrected production smoke
on port 3180 (homepage, planner, hero-table, and rooftop-party all 200; planner
gate visible; server stopped). The first smoke setup attempt on port 3179 failed
because PowerShell's read-only `$HOME` variable was used; the retry succeeded.
Historical entries below are preserved.

### Planner-product source metadata columns removed; prices remain website-listed, not official MRP — 2026-10-04

Owner-approved remote migration `remove_planner_product_source_columns` removed
all six `source_*` columns from `public.planner_products` only. Fresh readback
now returns exactly `id, category, name, brand, size_ml, price_paise, city` for
1,311 rows, with the seven-field deterministic hash
`baa0bf91e113c1ed911912b76f9821fc` unchanged before and after. Protected
baselines are unchanged: `drinks` is 9,462 rows /
`54575d121506d7ad163ec84120aedcaf`, and `party_plans` is empty /
`d41d8cd98f00b204e9800998ecf8427e`.

Independent remote verification reconfirmed those exact seven columns, the core
hash, protected baselines, and RLS/grants. RLS remains enabled with zero
policies and service-role `SELECT, INSERT` only. The core app reader was
verified to match all 1,311 current rows on its six product fields. Standalone
TypeScript, the live-catalogue check, and the Next 16.3.0 production build
passed; the build retained existing pnpm override/dependency-drift warnings and
Next skips build-time type validation. `git diff --check` also passed with
existing warnings. Historical `jaipur-planner-updated-import.py --verify-live`
validates the former 13-column payload and is not compatible with this
seven-column schema; the live reader check is passing. No images, application
code, other tables, or deployment changed. The removed metadata means prices
are website-listed only, never an official-MRP claim, and the category-only
review warning is no longer stored on the live table; the local historical
workbook and earlier documentation remain untouched.

### Supabase staging and backup cleanup completed; image, site, and codebase cleanup remain pending — 2026-10-04

Migration `remove_obsolete_planner_staging_and_backup` successfully used `DROP
TABLE ... RESTRICT` only for
`public.planner_products_candidate_20261004` and
`public.planner_products_backup_20261004` after baseline checks. Fresh readback
returns `NULL` for both `to_regclass` values. Live `planner_products` remains
1,311 rows with fingerprint `25f648be7971db22b9d50779f4b6ddb2`; `python
scripts/jaipur-planner-updated-import.py --verify-live` and `node
scripts/party-planner-live-catalogue-check.cjs` passed. Protected baselines are
unchanged: `drinks` is 9,462 rows / `54575d121506d7ad163ec84120aedcaf`, and
`party_plans` is empty / `d41d8cd98f00b204e9800998ecf8427e`.

No Vercel deployment or deployment verification occurred. Product-photo work
and old Jaipur image/site/codebase cleanup remain unverified or pending.
Historical backup claims below are retained as historical records.

### Jaipur product-image audit checkpoint; no image or remote reliability claim — 2026-10-04

Audit-only checkpoint. `output/Updated_Jaipur_City_Product_Database.xlsx`
`Photo_Catalogue` contains 1,311 embedded JPEG objects, but every object is
byte-identical to one generic 128×148 placeholder (SHA-256
`f7021b2e0f04759c8b04e2c2ceb84829aa5e8c08e638f62ba099ff68222dc57b`). All
`Products.image_url` values are blank. `source_image_url_reference_only`
contains 1,311 distinct static.livcheers.com WebP URLs, while `photo_status`
is `DUMMY_PERMISSION_PENDING` and `commercial_permission_status` is
`NOT_VERIFIED`; the owner separately states they have permission.

Only 3 of 10 bounded remote URL GETs succeeded; seven timed out. That is not
evidence that all source images are reliable or product-matching. The separate
existing `EkQuarter_Product_Images/manifest.json` contains 507 LCIN WebPs:
exact code, URL, and name matching found 507 workbook rows, including 13
explicitly marked source placeholders. Therefore 494 local matches are
technically non-placeholder and 804 workbook rows have no local asset. The
current runtime planner uses category art rather than product-specific photos.

No images were added, and no Supabase, website, deployment, or cleanup change
occurred. A prior local server-only `readCatalogue()` matched all 1,311 rows;
the remote Vercel runtime remains unverified because no linked project or URL
was available. The requested cleanup of Supabase candidate/backup and old
Jaipur docs/output remains pending an inventory that avoids unrelated drinks,
early-access, and recipe outputs. Historical entries below are retained.

### Final local verification complete for authorized 1,311-row live replacement; Vercel not deployed — 2026-10-04

The owner authorized replacement of all 1,638 old rows with all 1,311 candidate
rows, including flagged `JPR-E3EEB807D525`, and accepts that the Vercel
partner-review site may fail closed until a separately authorized deployment.
The local live table and candidate both contain 1,311 rows, 18 categories, and
fingerprint `25f648be7971db22b9d50779f4b6ddb2`; independent SQL found zero
full-outer row differences and zero old-ID overlap. The protected backup retains
the historical 1,638-row fingerprint `aab3104f0995a815c0b794288bd98e5d`.

Full paginated REST verification, `python scripts/jaipur-planner-updated-import.py
--verify-live`, passed exact workbook-payload reconciliation for every field of
all 1,311 rows and confirmed anonymous REST status 401; its readback artifact is
`output/jaipur-replacement-1311/live-verification.json`. The server-only live
reader and focused planner/backend/catalogue checks passed. Standalone TypeScript,
the Corepack production build, whitespace check, and a corrected local production
smoke on port 3166 passed: `/party-planner` returned 200 with the gate visible and
`JPR-00834827D38C` absent from ungated HTML; the server was stopped. The complete
truthful command, hash, security, and limitation record is
`output/jaipur-replacement-1311/final-verification.json`.

`drinks` remains 9,462 rows / `54575d121506d7ad163ec84120aedcaf` and
`party_plans` remains zero rows / `d41d8cd98f00b204e9800998ecf8427e`. Live and
candidate retain RLS with no policies, anon/authenticated reads denied, and
service-role `SELECT, INSERT` only; the backup is service-role `SELECT` only.
Inherited source defaults are removed on all three tables. No deployment,
deployment verification, or commit occurred. The historical
`docs/jaipur-product-category-review.md` describes the prior 1,638-row catalogue
preserved in the backup, not this replacement. The earlier entries below are
historical and superseded where they describe this cutover or its verification as
pending.

### Live 1,311-row planner-products cutover executed; SQL verified, REST/build pending — 2026-10-04

Owner authorized replacement of the old 1,638-row live catalogue with the staged
1,311-row candidate and accepted that the Vercel partner-preview planner may
fail closed until a later deployment. Remote migration
`remove_false_mrp_defaults_from_live_planner_products` removed the four
inherited source defaults from live `public.planner_products`; those defaults
are also `NULL` on the candidate and protected backup.

The reviewed single atomic locked `DO` block in
`output/jaipur-replacement-1311/live-cutover.sql` executed without error. It
required the old/live, candidate, and backup baselines, rechecked unchanged
`drinks` and `party_plans` hashes, deleted the old rows, inserted all 13 fields
from the candidate, and post-asserted the result. Fresh independent SQL
readback verified live `planner_products` is 1,311 unique rows with fingerprint
`25f648be7971db22b9d50779f4b6ddb2`, matching the candidate; the protected
backup remains 1,638 rows with `aab3104f0995a815c0b794288bd98e5d`. `drinks`
remains 9,462 rows with `54575d121506d7ad163ec84120aedcaf`, and `party_plans`
remains empty with `d41d8cd98f00b204e9800998ecf8427e`. The live 18-category
histogram is exact, there is one flagged row, and all 1,311 source fields are
Jaipur / Livcheers / 2026 / listed price.

SQL also verified RLS is enabled with no policies: anonymous and authenticated
roles cannot `SELECT` any of the three planner tables; `service_role` can
`SELECT, INSERT` live/candidate and only `SELECT` the backup. One initial
independent read-only query failed because it referenced nonexistent
`drinks.type`; the corrected query passed. Pending: full paginated REST
row-by-row live readback, focused tests, production build, and local production
smoke. No Vercel deployment, deployment verification, or commit occurred.

### Protected planner-products backup completed before final cutover; no swap or deployment — 2026-10-04

Owner approved the Supabase replacement even if the Vercel reviewer site
temporarily fails closed. Root applied
`create_protected_planner_products_backup_20261004`, creating
`public.planner_products_backup_20261004` from the current table with `LIKE`
including all attributes. The backup has RLS enabled, no policies, no anonymous
or authenticated `SELECT`, and `service_role` `SELECT` only; inherited old-source
defaults were removed from the backup.

The guarded locked `DO` block required the old 1,638-row fingerprint
`aab3104f0995a815c0b794288bd98e5d`, copied exactly 1,638 rows, and asserted
the same fingerprint. Fresh SQL readback confirmed both the backup and current
table are 1,638 rows with that fingerprint. The unchanged candidate remains
1,311 rows with fingerprint `25f648be7971db22b9d50779f4b6ddb2`.

This is the completed protected backup before final cutover only: no main-table
deletion or swap, candidate change, application deployment, or deployment
verification occurred.

### Candidate-only provenance-default correction applied; no cutover or deployment — 2026-10-04

Remote migration `remove_false_mrp_defaults_from_planner_candidate` dropped the
inherited defaults for `source_name`, `source_year`, `source_price_type`, and
`source_note` on `public.planner_products_candidate_20261004`. SQL readback
confirmed all four candidate defaults are `NULL`; no rows changed. This applies
to the candidate table only: the app/main table still has its old defaults, and
no deployment or cutover occurred.

### Local 1,311-row / 18-category catalogue code prepared; live cutover not performed — 2026-10-04

Local planner code now validates the prepared replacement catalogue as exactly
1,311 rows across its 18-category histogram: `app/party-planner/catalogue-server.ts`
validates the new shape, `model.ts` permits 18 categories, and the focused
party-planner check scripts use the new fixture. Historical snapshots and
eligibility behavior remain unchanged. The local new reader intentionally
fails closed while the live main table remains the old 1,638-row / 12-category
catalogue; the staged candidate is 1,311 rows / 18 categories. Consequently,
no database cutover, deployment, or live application switch occurred. The
currently deployed old reader would fail after a database swap, so deployment
and cutover require a coordinated maintenance decision and a reviewed guarded
transaction. Before cutover, remove the candidate's inherited old
Official-MRP-column defaults.

Actually passed: `node scripts/party-planner-check.cjs`, `node
scripts/party-planner-backend-check.cjs`, and `node
scripts/party-planner-catalogue-server-check.cjs`; standalone `node
node_modules/typescript/bin/tsc --noEmit`; updated prepare `--check` and
candidate importer `--verify`; Corepack `pnpm build` with
`pnpm_config_verify_deps_before_run=warn` (passed with existing pnpm dependency
warnings; Next skips build-time type validation); and `git diff --check`
(passed with existing CRLF warnings). After the passed build, a production-server
pre-cutover gate smoke started `node node_modules/next/dist/bin/next start -p
3164`; `GET /party-planner` returned HTTP 200, showed “Before we begin”, and
did not include candidate ID `JPR-00834827D38C` in ungated HTML. The server was
stopped. This is gate-only evidence against the current old database: the local
reader would fail closed after eligibility until cutover, so it is not proof of
a live new catalogue. An independent read-only review found no blocking code
defect. No deployment verification is claimed.

### Protected planner-products candidate staged nondestructively; final cutover not performed — 2026-10-04

With the project SQL tool available, the original `public.planner_products`
was first verified unchanged at 1,638 rows with fingerprint
`aab3104f0995a815c0b794288bd98e5d`. The
`create_protected_planner_products_candidate_20261004` migration then created
a candidate public table using `LIKE` against the current table, including all
attributes. The candidate has RLS enabled, no policies, no anonymous or
authenticated `SELECT`, and `service_role` `SELECT, INSERT` only (no `DELETE`).
The current table was not changed.

`python scripts/jaipur-planner-updated-import.py --import` passed with one POST
and complete paginated readback; its `--verify` then passed exactly. SQL
readback confirmed the candidate contains 1,311 unique IDs across 18
categories, including one flagged category-only note, with fingerprint
`25f648be7971db22b9d50779f4b6ddb2`. The old importer `--verify` also passed.
Current `planner_products` remains 1,638 rows; `drinks` remains 9,462 rows with
fingerprint `54575d121506d7ad163ec84120aedcaf`, and `party_plans` remains empty
with fingerprint `d41d8cd98f00b204e9800998ecf8427e`.

This is candidate staging only: no application change, deployment, live-table
cutover, or final switch occurred. The preceding access-blocked statement is
historical and superseded only as to SQL-tool availability; it does not claim a
completed cutover.

### Updated 1,311-row Jaipur workbook prepared only; live switch blocked — 2026-10-04

`scripts/jaipur-planner-updated-prepare.py --prepare` and `--check` passed,
producing deterministic payload and manifest artifacts in
`output/jaipur-replacement-1311/`; older initial artifacts remain preserved in
that directory. The prepared replacement has 1,311 rows across 18 categories,
including flagged `CATEGORY_ONLY_REVIEW` ID `JPR-E3EEB807D525` with its review
caveat. No licensed product photos or official-MRP claim is asserted; the
owner reports manual price verification. The current live old script remains
unchanged: `--verify` passed for 1,638 rows (227 unclassified).

This is preparation only: no database import, application change, deployment,
or live switch occurred. Supabase project listing works, but no privileged SQL
tool, database connection, CLI access, deploy authorization, process
`SUPABASE_ACCESS_TOKEN`/DB URL, or local DB-admin connection is available;
secrets were preserved. Reassess access only after the owner reports
permissions. Live replacement remains blocked.

### Jaipur live planner integration completed locally; development deployment unverified — 2026-10-03

`app/party-planner/actions.ts` now reads the protected live catalogue through
`readCatalogue()` for `getCatalogue`, `validatePlan`, and `savePlan`, retaining
the eligibility gate, trusted live pricing, and historical saved snapshots.
Missing credentials, transport failures, or invalid/incomplete catalogue data
fail with the existing safe generic error; there is no bundled-JSON fallback.
The live import and exact readback are complete: `public.planner_products` has
1,638 distinct Jaipur 2026–27 Official-MRP products, including 227
unclassified products. The independent post-switch review found no blocking
code defects.

Actually passed: `python scripts/jaipur-planner-catalogue.py --check` (1,638),
`python scripts/jaipur-planner-review.py --check` (227 unclassified, 22
reclassified), `python scripts/jaipur-planner-supabase-import.py --verify`
(exact full readback), `node scripts/party-planner-check.cjs`, `node
scripts/party-planner-backend-check.cjs`, `node
scripts/party-planner-catalogue-server-check.cjs`, `node
node_modules/typescript/bin/tsc --noEmit`, Corepack `pnpm build` with
`pnpm_config_verify_deps_before_run=warn` (passed with existing
lock/dependency warnings; Next skips build-time type validation), and `git
diff --check` (passed with existing CRLF warnings). A production Next server
started directly with `node node_modules/next/dist/bin/next start -p 3163`;
`GET /party-planner` returned HTTP 200 with the gate visible and
`YPS-P-000001` withheld, then the server was stopped. The initial `corepack
pnpm start` smoke attempt failed because its subprocess could not find pnpm;
the direct Next retry passed.

Live checks also confirmed `planner_products` RLS is enabled with no policies,
no anonymous/authenticated reads, and service-role `SELECT, INSERT` only.
The local server secret exists but is not recorded here. Before/after data
baselines remain unchanged: `drinks` is 9,462 rows with fingerprint
`54575d121506d7ad163ec84120aedcaf`; `party_plans` is empty with fingerprint
`d41d8cd98f00b204e9800998ecf8427e`. No deployment or commit occurred. The
owner-reported development deployment configuration remains independently
unverified. The import-pending, paused, and preparation entries below are
historical and superseded by this completed local integration checkpoint.

### Jaipur planner-products import completed; application switch pending — 2026-10-03

The guarded `python scripts/jaipur-planner-supabase-import.py --import` completed with an atomic insert and full paginated reconciliation; a subsequent `--verify` passed against the exact existing dataset. Live `public.planner_products` now contains 1,638 distinct Jaipur products using 2026–27 Official MRP, including 227 `Other`, under the existing protected configuration (RLS enabled, no policies, no anon/authenticated read access, and service-role `SELECT, INSERT` only). The local server secret has the required `sb_secret_` form. Fresh before/after full-row aggregate fingerprints confirm `drinks` remained `9462` / `54575d121506d7ad163ec84120aedcaf` and `party_plans` remained empty (`0` / `d41d8cd98f00b204e9800998ecf8427e`). `app/party-planner/actions.ts` still uses bundled JSON: no application integration, deployment, or live switch occurred. The owner reports the deployment environment is configured, but that remains independently unverified.

### Jaipur Supabase move paused at live import gate — 2026-10-03

The local `SUPABASE_SECRET_KEY` now has the expected `sb_secret_` format and a read-only server REST probe returned HTTP 200 without revealing it. The owner reports adding the variable in Vercel; deployment configuration was not independently verified and no deployment was made. The protected `public.planner_products` table was created and verified empty with RLS on, no policies, no anon/authenticated grants, and service-role `SELECT, INSERT` only. The importer now handles real `*/0` empty-table readback, exact-count pages and guarded single insert; the prepared payload contains exactly 1,638 workbook-matched Jaipur products with 227 unclassified. Director review approved the corrected importer. A separate server-only catalogue reader was prepared and director-reviewed, but `app/party-planner/actions.ts` still reads bundled JSON. **No product import or live planner integration occurred.**

After that checkpoint, automatic approval review rejected a read-only Supabase pre-import SQL query because the tool hit a usage limit. The tool expressly described this as review failure, not a determination that the query was unsafe, and instructed against bypassing review. Live import, post-import reconciliation, before/after recipe and saved-plan hashes, and action switch remain pending until review capacity is restored. Last successful live schema read showed zero planner rows and anonymous REST GET HTTP 401. No alternative route was used for the blocked write.

Final local checks on the prepared code: extractor `--check`, category review `--check`, original planner/model test, original backend test, reader transport test, standalone TypeScript, Corepack production build, and `git diff --check` passed (existing pnpm dependency/override and CRLF warnings). Production `/party-planner` HTTP smoke returned 200, showed the eligibility gate, and withheld all catalogue IDs before confirmation. An earlier TypeScript run failed because an evidence snapshot was named `.ts`; the executor renamed it `.ts.txt`, and the subsequent standalone check passed. The production server was stopped. The final live database readback and post-switch tests cannot pass until the blocked import and app switch occur.

### Jaipur Supabase move checkpoint A prepared — 2026-10-03

Prepared `output/jaipur-supabase-move/schema.sql` and
`scripts/jaipur-planner-supabase-import.py` for the protected Jaipur planner
catalogue move. The schema enables RLS, revokes `PUBLIC`, `anon`,
`authenticated`, and default `service_role` access, then grants only
`SELECT, INSERT` to `service_role`; it creates no policies or functions. The
script has explicit `--prepare`, read-only `--verify`, and guarded `--import`
modes, with preparation as the default. It loads the existing extractor via
`importlib`, requires exact workbook/checked-in JSON equality, preserves 1,638
unique products and 227 `Other / Unclassified` rows, records source hashes and
expected IDs, and uses only an `apikey` header for private REST requests. It
requires the fixed project URL, rejects anonymous reads, paginates stable
readback beyond 1,000 rows, aborts on conflicting non-empty targets, and sends
one POST only after an empty-target precheck. No DDL, import, app switch or
live write occurred. Baseline copies of actions and planner checks are under
`output/jaipur-supabase-move/`. Root will review and execute later.

### Jaipur Supabase move checkpoint A schema applied — 2026-10-03

After the preparation repair, root applied the reviewed
`public.planner_products` schema through a single migration transaction. Live
readback confirms the table is empty, RLS is enabled, and there are zero
policies. Public, `anon`, and `authenticated` roles have no table privileges;
`service_role` has only `SELECT` and `INSERT`. The intentional no-policy RLS
advisor INFO and unrelated existing advisor warnings were left unchanged. The
catalogue import, complete readback, application switch, and production
verification remain pending; no import or app change occurred in this
checkpoint.

### Jaipur Supabase move checkpoint B reader prepared — 2026-10-03

Prepared the server-only `readCatalogue()` module at
`app/party-planner/catalogue-server.ts` and focused transport checks at
`scripts/party-planner-catalogue-server-check.cjs`. The reader requires the
server `sb_secret_` key, sends it only as `apikey`, requests stable ascending
ID pages with exact counts, accepts normal 200/206 responses including capped
pages, and validates every six-field product, unique ID, exact 1,638-row
count, and 227 `Other / Unclassified` rows. Missing credentials, HTTP,
network, malformed, duplicate, truncated, partial, or incomplete responses
throw one safe generic error; there is no bundled JSON fallback. The action
file remains unchanged and the reader is not integrated until root supplies
verified live import evidence. No app switch, build, database write or
deployment occurred.

Verification passed: mocked secret/network/HTTP/duplicate/truncated cases,
capped pagination and apikey-only transport via
`node scripts/party-planner-catalogue-server-check.cjs`, plus standalone
`node node_modules/typescript/bin/tsc --noEmit`. An earlier standalone type
check failure caused by the saved `baseline-actions.ts` artifact was resolved
by renaming it to `baseline-actions.ts.txt`; no application code was involved.

Reader security repair: the server URL is now pinned to the configured
Supabase project origin and fetch uses `redirect: 'error'`, with focused checks
for wrong-host rejection, redirect rejection and secret non-forwarding.

### Jaipur Supabase move prerequisite check and plan - 2026-10-03

The owner's explicit handoff replaces the unavailable shared conversation. Fresh local checks found `SUPABASE_SECRET_KEY` absent from the process and `.env.local`; `.env`, `.env.development` and `.env.development.local` are absent. No credential values were printed or modified. `.env.local` is Git-ignored. Development deployment secret configuration remains unverified because the provider/project is unidentified. A fresh live Supabase public/private table-list query succeeded for the app's configured project `ojptrukzildmkilwponx`; no planner-products table exists. Connector access works but does not supply the application's runtime credential. Import and live planner integration are NOT complete.

Prepared `docs/jaipur-supabase-move-plan.md` with private setup steps, deny-client-access table design, guarded client-side import, complete paginated 1,638-row reconciliation, switch ordering, fail-closed reads/trusted pricing, historical snapshot preservation and verification criteria. App, environment, database, dependencies and unrelated changes remain untouched. No commit or deployment.

Actually passed on the unchanged application: `python scripts/jaipur-planner-catalogue.py --check` (1,638 unique products), `python scripts/jaipur-planner-review.py --check` (227 unclassified, 22 reclassified), both `scripts/party-planner-check.cjs` and `scripts/party-planner-backend-check.cjs`, Corepack `pnpm build` with `pnpm_config_verify_deps_before_run=warn`, standalone `node node_modules/typescript/bin/tsc --noEmit`, and `git diff --check`. Existing pnpm dependency/override and CRLF warnings remain. Fresh production server on port 3149 returned HTTP 200 with the eligibility gate and none of the 1,638 product IDs in unauthenticated HTML; the test server was stopped. Live schema readback succeeded; product import readback and live-integration tests cannot run before the blocked import/switch. No interactive browser verification was performed. These are baseline checks, not evidence of a completed migration.

### Supabase connection verification ? 2026-10-03

Read-only live verification succeeded through the connected Supabase tools: project `ojptrukzildmkilwponx` is ACTIVE_HEALTHY and currently named BrewList; its ref matches `.env.local` SUPABASE_URL. Public table inspection and a PostgreSQL table-list query succeeded. `public.drinks` reports 9,462 rows; all nine public tables report RLS enabled. No Jaipur product catalogue table is present in the inspected application schemas. Planner actions still import bundled `catalogue.json`; local environment inspection found the URL and anon key but no privileged Supabase server key (values were not printed). Connector access is confirmed; private application runtime access is not established by that result. The requested OpenCode share could not be fetched, so its precise remaining task is unresolved. No database, application, dependency or environment changes. Build/TypeScript checks were not run for this read-only investigation and documentation-only checkpoint.

### Jaipur catalogue classification review — 2026-10-03

Review-only checkpoint: `docs/jaipur-product-category-review.md`, generated by `scripts/jaipur-planner-review.py`, lists all 227 remaining `Other / Unclassified` products with ID, name, size, INR MRP, Excise Class, and manual-review reason, and audits 22 named reclassifications. Rajasthan excise is the source for official MRP, not FSSAI; stock was not verified. No Supabase import, live-backend change, or other write occurred. A privileged connection for private import and server-only reads remains an explicit blocker before any switch. Executor-reported checks passed: review generator `--check`, catalogue extractor `--check`, `py_compile`, standalone TypeScript, Corepack `pnpm build`, and `git diff --check` (existing warnings).

### Jaipur Party Planner catalogue replacement — 2026-10-02

Replaced the Jaipur Party Planner catalogue from the Product Master + City Prices workbook join: all 1,638 unique Jaipur rows across 12 categories. Regenerated `catalogue.json` with `scripts/jaipur-planner-catalogue.py` and raised the category maximum from 10 to 12. Old-only Scotch, Sake and Champagne entries are absent; 22 conservatively name-classified `Other / Unclassified` entries were reassigned to Brandy, Liqueur / Aperitif, or Tequila / Agave Spirit, while 227 remain Other. Rajasthan excise 2026–27 was verified as official MRP, not FSSAI; stock and pack/case wording remain unverified and are not claimed. Product IDs changed, so old drafts/snapshots may need replacement; saved historical snapshots remain. The Party Planner catalogue is bundled JSON: no new Supabase product database or table was created, no Supabase or `public.drinks` writes occurred, and actions/session behavior was preserved.

Actually passed: extractor `--check`, `node scripts/party-planner-check.cjs`, `node scripts/party-planner-backend-check.cjs`, standalone `node node_modules/typescript/bin/tsc --noEmit`, Corepack `pnpm build` (existing dependency-drift warnings), `git diff --check` (CRLF warning), and a production HTTP smoke test (200; gate visible and products withheld before eligibility). Interactive browser verification was not run because cached Playwright has a missing dependency.

### Batch-7 Gin Fizz source-method correction — 2026-10-02

Corrected only `dn-gin-fizz` preparation step two from “Strain…” to “Pour the shaken mixture into a highball glass over two ice cubes.” to match the retained DrinkNation instruction. A fresh full before-row snapshot/hash (`0c8bb5b587007e8780751306564eb97d`) and 9,461-row unrelated hash (`5d8d65bf2cc2255d0f467a819a2406f9`) were saved before the update. The atomic update required both the exact Gin Fizz row hash and unrelated aggregate, and asserted one changed row. Fresh readback gives row hash `86ef45170b4fcd40503c8784ebfaca59`, unchanged unrelated hash, and 50 eligible rows; only `preparation` and trigger-managed `updated_at` changed. Full before evidence, exact executed SQL, postwrite field evidence, and check log are `output/recipe-batch7/gin-fizz-correction-*`. The original Batch-7 historical prewrite-artifact deviation remains unchanged.

### Batch-8 four-cocktail guarded publication with SVG fallbacks — 2026-10-02

Published exactly `dn-derby-daiquiri`, `dn-frozen-mint-daiquiri`, `dn-rum-screwdriver`, and `dn-tom-collins-2` after an individual retained-DrinkNation review. Derby Daiquiri retains the instruction-specified 1/2 cup shaved ice despite that ice not appearing as an ingredient-list entry; it is blended at low speed and served in a champagne flute. Frozen Mint Daiquiri retains its source-supported “2 sprigs or leaves” mint option and is blended. Rum Screwdriver is an ice-filled highball with its variable orange-juice fill retained and stirred. Tom Collins #2 shakes gin, lemon and syrup only, then adds club soda and stirs; soda is never shaken. Allergens and caffeine remain unknown. None of the four retained records has an image, so no image fields were written and the existing SVG fallback remains.

`output/recipe-batch8/batch8-publication-before.json` saved all four full 53-key rows, exact hashes and the 9,458-row unrelated aggregate `1b5f7a1557fc3861dc3969e8264c5b33` before publication. A fresh read immediately before the atomic transaction matched every hash, expected draft/not-ready/not-featured/issue state, and that aggregate. Row hashes were checked by transaction preflight; individual updates were guarded by expected state and exactly-one affected count, while the transaction rechecked the unrelated count/hash. `batch8-publication-after.json` saves four full postwrite rows; `batch8-changed-keys.json` proves only the reviewed editorial fields, status/readiness/issues and trigger-managed `updated_at` changed (the already-`blend` preparation method did not change for Derby or Frozen Mint). Final hashes are Derby `e584556b9db1d2121dd6eb39350c74ad`, Frozen Mint `48aecc79591ef62278e2b9e9a8d04f3b`, Rum Screwdriver `9c9c6f9aebab46ab8d3e10e4533684bd`, and Tom Collins #2 `0e20cc6776f290cd7f388a02f82bffc9`; the unrelated aggregate is byte-identical. Final live readback is 50 eligible recipes: 35 cocktails and 15 mocktails.

Actually executed: Batch-8 retained-source/six-gram validator and `py_compile` passed; postwrite JSON/full-row/changed-key/aggregate assertion passed; `pnpm build` passed with the existing dependency-drift/ignored-override warnings and build-time type-validation skip; standalone `node node_modules/typescript/bin/tsc --noEmit` passed; `git diff --check` passed with existing CRLF warnings. No image, app/UI, schema, dependency, secret, other-row, commit or deployment changes.

### Batch-7 four-cocktail guarded publication with one retained-source image — 2026-10-02

Published exactly `dn-gin-fizz`, `dn-whiskey-highball`, `dn-apple-daiquiri`, and `dn-frozen-pineapple-daiquiri` after individual retained-DrinkNation review. Gin Fizz shakes only gin, lemon and syrup before soda is gently added; Whiskey Highball is an ice-filled soda highball; Apple Daiquiri is shaken and strained; Frozen Pineapple Daiquiri is blended. Optional Gin Fizz garnish variations remain optional; unrecorded garnishes remain null. Allergens and caffeine remain unknown, and no local-stock promise is made. Only Gin Fizz had a retained HTTPS source image, so it alone received a separately guarded image write; the other three keep null image fields and the existing SVG fallback.

Editorial row hashes were checked by transaction preflight; individual updates were guarded by expected draft/ready/featured/issue states and one-row affected counts, with the 9,458-row unrelated aggregate `c8d168b7bdc364eaae1335c506a9791f` rechecked in the transaction. Fresh post-editorial Gin Fizz hash `6c8985a30844f422d22642052a1bf6b2` guarded its separate image write. Final hashes are Gin Fizz `0c8bb5b587007e8780751306564eb97d`, Whiskey Highball `5f8012dd529db028df61b7c24dd7dd06`, Apple Daiquiri `34ed0654b42c946f90ad12852bb6eaba`, and Frozen Pineapple Daiquiri `7e5bd77855b469467800cc9bb29bd912`; unrelated aggregate is unchanged. Final live readback verified retained source fields, ingredients/quantities, yield, unknown allergens/caffeine, and 58 published / 9,404 draft with 31 eligible cocktails + 15 eligible mocktails = 46 total.

Protocol deviation: the read-only prewrite query returned all four full rows, but they were not saved to an artifact before publication. They were not reconstructed afterward. The final query also did not persist a full `to_jsonb` output file. `output/recipe-batch7/` records the honest limitation, all hashes, source decisions, changed-key expectations and final state. No further database writes occurred while completing this checkpoint.

### Batch-6 four-cocktail guarded publication and retained-image backfill — 2026-10-02

Published exactly `dn-screwdriver`, `dn-gin-and-tonic`, `dn-rum-and-coke-1`, and `dn-mojito` after individual retained-DrinkNation record review. All use mainstream base spirits, mixers and fresh produce without claiming local stock availability. Source ingredients, quantities, yield, provenance, classification, unknown allergens and unknown caffeine remain unchanged. The Screwdriver, Gin and Tonic, and Rum and Coke are ice-filled highball builds retaining their orange-slice, lime-peel-twist and lemon-wedge garnishes. Mojito retains its source quantities, tops with soda without shaking, gently stirs, and marks its two lime wedges optional as the retained source does. Each row uses its retained first full-size HTTPS DrinkNation image with `image_alt` set to the stored name.

`output/recipe-batch6/batch6-publication-before.json` records all four full prewrite snapshots/hashes and the 9,458-row unrelated baseline `d370700558cf84866cd4c5b720ad3833`. Row hashes were checked by transaction preflight; individual editorial updates were guarded by draft/not-ready/not-featured/issue state and exactly one changed row, with the same aggregate rechecked in the transaction. A fresh post-editorial read supplied new hashes for the separate guarded image transaction; its four one-row image updates again required the unchanged aggregate. Final hashes are Screwdriver `7382f6e486c665679d7941166ed4937f`, Gin and Tonic `ea98ae4f1545d177902297647a11b9bb`, Rum and Coke `d0b20828fa57dd54a0fa3c574e586dbd`, and Mojito `b128b0710b4a176de5377b1c38bacc2c`; the unrelated aggregate remained byte-identical. Final changed-key/source-field evidence and both filled guarded SQL transactions are in `output/recipe-batch6/`.

Final live readback: 54 published / 9,408 draft, with 27 eligible cocktails and 15 eligible mocktails. All targets are published, editorial-ready, have exactly empty issues, retained HTTPS images and name-matching alt text. Actually executed: Batch-6 source validator and `py_compile`; Corepack `pnpm build` (passed with existing dependency-drift/ignored-override warnings and build-time type-validation skip); standalone `node node_modules/typescript/bin/tsc --noEmit`; and `git diff --check` (passed with existing CRLF warnings). No app/UI, schema, dependency, secret, source-value, other-row, commit or deployment changes.

### Batch-5 three-cocktail guarded publication and retained-image backfill — 2026-10-02

Published exactly `dn-black-russian`, `dn-stinger`, and `dn-mimosa` after individual retained-DrinkNation record review. Source ingredients, quantities, yield, source/provenance fields, allergens and caffeine remain unchanged; coffee-liqueur caffeine stays unknown because the retained record does not support a value. Black Russian is a rocks-glass ice build with a gentle stir; Stinger is shaken and strained; Mimosa pours chilled orange juice before champagne and is never shaken. Mimosa's source orange-twist garnish is optional but not listed as an ingredient, so no garnish was asserted. Each row uses its retained first full-size HTTPS DrinkNation image with `image_alt` set to its stored name.

`output/recipe-batch5/batch5-publication-before.json` records all three full prewrite snapshots and hashes plus the 9,459-row unrelated baseline `d86ab69bf14e36a49463ec36a45d87f5`. Editorial writes required each full-row hash, exact draft/not-ready/not-featured/issue state, that same unrelated hash, and exactly one updated row. A fresh post-editorial read supplied new per-row hashes for a separate image transaction with the identical aggregate and one-row guards. Final hashes are Black Russian `a7dae1ad70fa84d256e6abb433cdf335`, Mimosa `6f34b565edb5adb26beb3107e8920a4b`, and Stinger `ea34f423f73f98fbcf8447fd034c6eb5`; the unrelated aggregate remained byte-identical. Final changed-key evidence, source decisions and image URLs are in `output/recipe-batch5/`.

Final live readback: 50 published / 9,412 draft, with 23 eligible cocktails and 15 eligible mocktails. All targets are published, editorial-ready, empty of issues, have HTTPS source images and name-matching alt text; provenance, ingredients, ingredient details, yield, prep time, allergens and caffeine were verified unchanged. Actually executed: Batch-5 validator and `py_compile`; Corepack `pnpm build` (passed with existing dependency-drift/ignored-override warnings and build-time type validation skip); standalone `node node_modules/typescript/bin/tsc --noEmit`; and `git diff --check` (passed with existing CRLF warnings). No app/UI, schema, dependency, secret, source-value, other-row, commit or deployment changes.

### Batch-4 three-mocktail publication with one explicit exclusion — 2026-10-02

Published `mm-fig-mocktail`, `mm-hibiscus-electrolyte-drink`, and `mm-paloma-mocktails` after retained-source review. Source ingredients, quantities, yield, prep time, and provenance remain unchanged; allergens/caffeine stay unknown. Fig keeps its optional jam/cinnamon/fig choices; hibiscus keeps to-taste sweetening and optional garnishes; Paloma shakes only its non-carbonated base and adds optional soda afterward. All three use the retained first full-size source photo and name-matching alt text. `mm-virgin-strawberry-daiquiri-margarita` is explicitly excluded and untouched because its “virgin” source permits unidentified bitters, calls for a lime garnish while listing only lime juice, and permits unlisted water adjustment.

`output/recipe-batch4/batch4-publication-before.json` records the prewrite snapshots and the 9,459-row unrelated baseline `52497bd8c55101b5019da741bed8758b`; `batch4-publication-after.json` and `batch4-publication.evidence.json` record post-readback. Exact initial full-row hashes, the unrelated aggregate, and a one-row affected-count guard protected every editorial write. Fresh post-editorial hashes separately protected each image write. Final readback: all three published/ready with empty issues and HTTPS source images; final hashes fig `f2e957b7a30585ef47057c96b8887107`, hibiscus `e0670c00c7d89ccc862590c60f21cba6`, Paloma `96930bca1485834a7924a7d6c2b217bd`. The unrelated hash remained identical and the excluded daiquiri remains draft/not-ready/NULL image with hash `48b4f5ed56b26d5a57f7d6c064d8c609`. Eligible totals are 20 cocktails + 15 mocktails.

Actually executed: Batch-4 source validator and `py_compile`, Corepack `pnpm build` (existing dependency-drift/ignored-override warnings; build skips type validation), standalone `node node_modules/typescript/bin/tsc --noEmit`, and `git diff --check` (existing CRLF warnings). No app/UI, schema, dependency, secret, provenance/quantity, other-row, commit, or deployment changes.

### Batch-3 four-mocktail source review, guarded publication and image backfill — 2026-10-02

Published exactly four individually reviewed Mindful Mocktail rows: `mm-shirley-temple-mocktail`, `mm-quick-cranberry-mocktail`, `mm-lemon-mocktails` and `mm-coconut-water-mocktail`. Retained source ingredients, yield/servings, prep time and provenance were preserved. Each source method was corrected from its template without shaking carbonated drinks; optional ingredients/garnishes remain optional. Lemon's unnamed source garnish is not required. Allergens and caffeine remain NULL/unknown; no allergen-free claims. Each row uses its retained first full-size Mindful Mocktail image without refetching or rehosting, and `image_alt` equals the stored name.

Before writes, `output/recipe-batch3/batch3-publication-before.json` captured all four full 53-key rows plus hashes and the full unrelated baseline: 9,458 rows / `06d502c851d329e52ff83ca76af73a5c`. A second fresh read matched all four row hashes and that aggregate before publication. The editorial transaction required the exact initial full-row hash, draft/ready/featured/issue state, exact target count, unchanged unrelated aggregate, and exactly one affected row for each individual UPDATE; it committed four rows. Post-editorial hashes were freshly captured and used—not the initial hashes—for the separately guarded image transaction, which also required four published/ready/null-image rows, the unchanged unrelated aggregate, and exactly one affected row per image UPDATE. The unrelated aggregate stayed byte-identical after both transactions. Full changed-key and final-readback evidence is in `output/recipe-batch3/batch3-publication.evidence.json`, `batch3-images.evidence.json`, and `batch3-publication-after.json`; the prepare-only validator/drafts are `scripts/recipe-catalogue/batch3_curate_mocktails.py` and the remaining batch3 output files.

Final live readback: 4/4 targets are published, editorial-ready, exactly empty of quality issues, have HTTPS source images and name-matching alt text. Final hashes are coconut `804dcc9361b9671dcbc9ffcefc1d4143`, lemon `bfafb735ba7d14faa98b26ae3f58a3c5`, cranberry `529244ee4436c4680477780757fde11b`, Shirley Temple `bcab0a4691bd70a88e10c5e15adbdcc9`; database totals are 9,418 draft + 44 published, with 20 eligible cocktails + 12 eligible mocktails. Verification actually executed: source validator and `py_compile` passed; Corepack `pnpm build` passed (existing dependency-drift/ignored-override warnings and build-time type-validation skip); standalone `node node_modules/typescript/bin/tsc --noEmit` passed; `git diff --check` passed with existing CRLF warnings; batch3 JSON evidence parsing passed. No app/UI, schema, dependency, secret, provenance, quantity, other-row, commit or deployment changes.

### Find My Drink session pantry and one-away verification — 2026-10-02

Implemented searchable “Use what I have” with exact reviewed identities, visible selected-item removal/Clear, sessionStorage ID-only restore after hydration, and in-memory continuation with an honest blocked-storage notice. Current eligible rows alone provide vocabulary; matches use every active URL filter and exact signature-approved complete requirements. Ingredients, required ice and garnish count separately; equipment and quantity checks remain visible. One ingredient away reports the exact missing item and verbatim recorded measure, and omits unmeasured missing ice/garnish. All seventeen approved recipes remain dependent on fresh eligibility and source-field equality; eleven incomplete/ambiguous recipes remain in ordinary browse. No static recipe resurrection, substitutions, guest saves/account sync, publication/backend writes, dependency/env edits, commit or deployment.

Verification actually executed: final Corepack production build and separate TypeScript passed; focused pantry fixtures passed missing ice/garnish, distinct lime/juice/wheel/wedge and fresh forms, unknown identities, uncertain/null measures, missing equipment review, source drift, removed/stale rows, deduplication and a real combined search/type/spirit/method/count filter. Live production pantry browser passed at320/390/768/1440: searchable checklist, presence/one-away quantities, equipment caveat, remove/Clear, session restore, detail return to visible pantry origin, filtered retention, zero-match access, blocked storage, malformed hash, no-JS ordinary browse, gate, unique anchors,44px buttons/links/checkbox labels, visible focus, no overflow and zero page errors. An additional focused390px pantry detail round trip proved all five URL filters preserved together. Full and focus screenshots are in `output/playwright/recipe-pantry/`; director reviewed all eight and passed.

Existing browse regression passed405 synthetic filter combinations plus live gate/list/detail/publication checks. Metric regression passed89 fixtures plus live28 eligible rows/94 ingredient lines. Mocked detail UI passed all four widths; mocked actions/community regression passed. Existing discovery regression passed all four widths over a local mock of the freshly captured eligible collection, preserving picker/filtered exhaustion/reload/return/no-JS/focus tests. Its live rerun encountered external Supabase DNS ENOTFOUND; the page correctly became unavailable. Evidence copy initially misread five source instruction entries as published steps; published preparation combines them into four, and the final check derives the actual captured count. No product/detail logic changed. Browser harness corrected capitalization, distinguished actionable checkbox labels from static field labels, and eagerly loaded images with a bounded decode wait.

Nine protected-file hashes match the session baseline: early-access/finder actions, community, gate, complete reader/publication predicate, package/lock and environment files. `git diff --check` passed with existing line-ending warnings. Evidence and exact check classification: `output/recipe-pantry/verification-summary.json`, `protected-verification.json`, `docs/recipe-pantry-audit.md`. Independent Astra final implementation/audit/source/test review passed with no blockers, including independently rerun pure fixtures and protected hash review; director visual review passed. Final Graphify code-only refresh passed (759 nodes, 1,412 edges); all test-owned servers were stopped. No user study or cross-browser/device evaluation, live authenticated save/community write, or quantity-sufficiency guarantee is claimed.



### Find My Drink pantry audit checkpoint — 2026-10-02

Fresh read-only existing `loadRecipes()` verified 28 currently eligible recipes. Reviewed exact ingredient forms, complete retained source instructions/descriptions, ice, garnish and equipment for each. Seventeen qualify for requirement matching; eleven remain ordinary browse only because required identities/forms or alternatives are unresolved. `docs/recipe-pantry-audit.md` and `output/recipe-pantry/` record every decision and source evidence. Independent Astra review approved after correcting source-specific heavy cream, fresh juices/strawberries and high-speed blender. No publication/data/backend changes. Audit approval is exact-field signature-bound; unmeasured missing ice/garnish is excluded from One ingredient away.

Pure helper fixtures passed for missing ice/garnish, lime forms, unknowns, raw missing quantities, unrecorded measures, equipment review, source drift, removed rows, filtered pools and deduplication. Initial standalone TypeScript and production build passed; UI verification and final integrated review remain in progress. Existing pnpm warnings retained. Sandbox reader initially failed EACCES; the approved read-only network rerun succeeded.



### Find My Drink phase 1 discovery and making UX — 2026-10-01

Implemented the approved first phase of `docs/find-my-drink-ux-direction.md`.
The compact “What sounds good?” entry now uses the homepage's ivory/plum/berry,
Georgia display and existing Nunito UI language. Explicit All/Mocktails/Cocktails
selection is independent of base-spirit selection; name/ingredient search,
listed-ingredient limits and recorded-method facets remain server-rendered URL
filters. Counts and every recommendation use the same current filtered eligible
pool. Three stable featured-first choices replace repeated unfiltered rails;
the first choices and paginated browse have no duplicate cards. Reasons quote
the actual matched name/ingredient search, recorded method or listed count.

“Pick for me” progressively enhances this with up to three filtered recipes,
without repetition until the session's matching pool is exhausted. It retains
session IDs when storage is available and continues in memory when blocked.
Picked IDs in return URLs are intersected with the current eligible filtered
pool, so a recipe picked from beyond page one remains visible when returning
from detail. Unknown, removed or filter-excluded IDs cannot restore content.
Safe local return URLs preserve filters, pagination and the originating recipe
anchor; related navigation keeps that original anchor. Native search, filter
links, ingredients and complete steps work without JavaScript.

Detail now places classification, known metadata and Ingredients/Start making
jumps beside a restrained real photo, with the existing honest SVG fallback.
A failed remote image also uses that fallback after hydration; image failure
state is keyed per recipe/image URL. Ingredients and method sit together on
desktop; the metric checklist, checked progress, step mode, supported wake
lock, existing authenticated saves/private notes and real community remain.
Source context explains unknown allergens/caffeine. Card keyboard focus is
visible outside the clipping boundary, filter chips wrap, and links/buttons
have at least 44px targets. No pantry, one-away, guest saves, inferred taste
labels, database writes, assets, environment/dependency changes or commits.

Verification actually executed: Corepack `pnpm build` passed after final app
edits (existing drift/ignored-override warnings; build skips type validation);
standalone `node node_modules/typescript/bin/tsc --noEmit` passed;
`node scripts/recipe-browse-check.cjs` passed with 405 synthetic filter
combinations, stable deduplicated pagination, the unchanged fail-closed reader
fixtures, and live read-only gate/list/detail checks across both listing pages;
`node scripts/recipe-detail-check.cjs` passed its mocked metadata, unknowns,
metric checklist and step-mode regression at 1440/768/390/320px. New focused
`node scripts/recipe-discovery-check.cjs` passed live production at those four
widths: no overflow/initial duplicates, 44px visible and expanded-facet targets,
actual beyond-first-page Pick/detail/return to visible card, filtered session
exhaustion/reload, blocked storage, filter-context return, unknown IDs excluded,
visible card focus, no-JavaScript search/detail and zero page errors. Browser
checks use the existing cached Playwright/Chromium 1228; capture waits for image
decoding. Evidence: `output/playwright/finder-ux-phase1/` contains full listing
and detail images plus listing viewport images at all four widths. Independent
Astra final source review and director visual review passed, with no blockers.
`git diff --check` passed with existing line-ending warnings. Graphify's final
code-only refresh passed (718 nodes, 1,347 edges). Baseline comparisons confirm
the protected action/community/gate files and the complete pre-listing database
reader/publication predicate are unchanged. All test-owned servers were stopped.

The initial sandbox live check rendered unavailable because network reads were
blocked with EACCES; read-only reruns with tool-approved network access passed.
The first live browse assertion assumed every launch recipe fit page one; it
now follows the real next-page link (White Russian is on page two). Browser
script fixes distinguish hidden closed-details 0px boxes from visible targets,
use the exact ingredients jump, and await Next navigation before checking URL
context. These changes preserve the original assertions' intent. Current live
collection is 28 eligible recipes; no UI count is hard-coded. Usability targets
remain unmeasured: no five-person study or non-Chromium/device evaluation was
performed. Further ingredient facets/pantry matching remain deferred until the
ingredient requirement audit; saved/account backend behavior was preserved,
not newly exercised with a live authenticated write.

### Find My Drink UX direction — 2026-10-01

Planning-only checkpoint: `docs/find-my-drink-ux-direction.md` records the
proposed mobile-first discovery and making experience, aligned with the current
homepage and planner's cream/plum/berry editorial styling. It covers compact
search and filters, three explained choices, a reviewed-ingredient pantry pilot,
later One ingredient away suggestions, independent cocktail/mocktail pairings,
saved-recipe continuity, responsive layouts, error states and acceptance criteria.
All recommendations stay within the eligible selected recipes. The latest
recorded 28-recipe count was not live-verified; unknown recipe facts must remain
unknown. Guest device saving is proposed, not claimed as an existing feature.

Source inspection and documentation whitespace validation completed. No app,
backend, environment, dependency or asset changes; no build, TypeScript check or
production smoke was run for this documentation-only task. Usability targets
are proposed acceptance criteria, not measured results. Separate Astra review
did not finish because the delegated agent reached its usage limit; its saved
draft was inspected by the primary agent. Implementation is not started.

### Batch-2 two-mocktail publication and image backfill — 2026-10-01

Published the first two-row mocktail batch (mm-grapefruit-martino-mocktail,
mm-roy-rogers-drink) and backfilled their two source-verified images, after the
director's review found two issues in the prepared batch. (1) BLOCKING —
mm-pineapple-crush-mocktail's source lists '1 lime' and instructs only 'Blend
all ingredients together in a high-speed blender', never saying to peel, juice
or seed the lime, so faithful instructions would blend an intact lime: the row
is EXCLUDED from the batch with NO replacement selected; its DB row was never
touched — status stays 'draft' with its exact before-state flags
(ambiguous_ingredient_quantity_or_unit, unknown_unit,
source_classification_not_verified, template_preparation_needs_editorial_review)
intact, it appears in no UPDATE/image SQL, and it is covered by the
unrelated-row aggregate hash (9,460 rows) to prove nothing changed on it.
(2) The grapefruit source's final step says only 'garnish' without naming one
and lists no garnish ingredient: the closing step was reworded to the
reviewer-directed source-faithful "Pour into a glass and serve." (no
unspecified-garnish requirement, no six-word reuse; garnish stays NULL).
Roy Rogers kept its named garnish (source ingredient line + final step).

Editorial publication: guarded SQL in one atomic transaction (per-row
full-row md5 hash + status='draft' + editorial_ready=false + featured=false +
exact before-state flag list + unrelated-row aggregate re-verified inside the
transaction; exactly-two-updated assertion; rollback on mismatch — the do $$
block raises before any UPDATE applies). Fresh live hashes matched the
prepare-session informational hashes exactly (no drift: f93adbf796ba50842c0fe25632ecdbd5
/ 64110f7462dabd744e13ee89f7ef54fa); the unrelated-row aggregate over all
9,460 other rows (4c21a784156ba8223c738fbe5bad38bc — including the excluded
pineapple draft) was byte-identical before/after. Per-row changed keys
(53→53 keys): mm-grapefruit-martino-mocktail — description, editorial_ready,
ice_type, preparation, recipe_quality_issues, status, updated_at (7);
mm-roy-rogers-drink — the same plus garnish, glassware, preparation_method
(10); both subsets of the expected changed columns; ingredients,
ingredient_details, provenance, servings/recipe_yield/prep_time_min,
allergens/caffeine and featured preserved. Read-back: both rows
published/editorial_ready with exactly-empty issues and the reviewed editorial
fields; counts 9,462 total = 9,422 draft + 40 published; 28 eligible = 20
cocktails + 8 mocktails.

Image backfill: separate guarded transaction (per-row post-publish hash +
status='published' + editorial_ready=true + image_url IS NULL + the same
unrelated-row aggregate re-verified inside). Both source photos are the
retained full-size first entries from mindfulmocktail-recipes.jsonl (never
refetched) and were independently fetched and verified as correct
drink-specific images by the director before the backfill; image_alt equals
the stored name. Read-back: image_url/image_alt set on both rows (79- and
82-character https URLs), the aggregate byte-identical before/after the image
write, 28 eligible with 25 https-image rows (23 previous + these 2), counts
unchanged.

Evidence: output/recipe-batch2/batch2-publication-before.json (full JSONB
before-row snapshots, each md5-verified byte-for-byte against the DB's own
hash inside the writer helper), batch2-editorial.sql (reviewed placeholder
draft) + batch2-editorial.filled.sql (applied), batch2-post-editorial-rows.json
(full post-publication rows + hashes/aggregate), batch2-publication.evidence.json,
batch2-images.sql + batch2-images.filled.sql, batch2-publication-after.json
(full post-image rows), batch2-images.evidence.json, plus the earlier
prepare/review artifacts (batch2-live-before-state.json, batch2-updates.jsonl,
batch2-evidence.jsonl with the two publishes + the one exclusion record,
batch2-images.json). Generator script
scripts/recipe-catalogue/batch2_curate_mocktails.py (prepare-only; two-row
batch + one explicit exclusion; placeholder-hash guarded SQL drafts).

Verification (actually executed, all exit 0): node
scripts/recipe-metric-check.cjs (unit 89 fixture lines; live 28 eligible rows
/ 94 ingredient lines: 84 converted metric-first, 1 ambiguous, 9 verbatim —
the two new rows contribute 5 converted + 1 verbatim, verdicts cross-checked
against stored ingredient_details, no writes); Corepack pnpm build
(compiled successfully; build-time type validation skipped per the Next
config); node scripts/recipe-browse-check.cjs (unit + live gate-first
sections: six launch recipes surface via the featured rail, eligible detail
200s, legacy/draft/unknown 404s); node scripts/recipe-detail-check.cjs with
the cached Playwright env (PLAYWRIGHT_MODULE from the local ape-uprising
node_modules, PLAYWRIGHT_CHROMIUM_EXECUTABLE = cached Chromium 1228 —
production detail metadata/unknowns/checklist/step mode, 1440/390/320px, zero
page errors); standalone node node_modules/typescript/bin/tsc --noEmit;
git diff --check (pre-existing line-ending warnings only); production-server
smoke over plain HTTP with the eligibility cookie sent via curl.exe — desktop
grapefruit detail 200 with the reviewed steps ("Pour into a glass and
serve."), stored photo URL and name rendered, mobile roy-rogers detail 200
with all four reviewed steps and stored photo (the source-verbatim "Top with
Cola." correctly absent — the reviewed "Add the grenadine, then top with the
cola." wording renders), the listing surfaces both new recipes with their
photos and detail links, and all test-owned servers stopped (process trees
killed). Two tooling failures were hit and fixed without touching app or DB:
a first smoke attempt returned 200s without content because PowerShell 5.1's
Invoke-WebRequest ignores the Cookie header in -Headers (the gate rendered);
it passed once re-run with curl.exe — and the first filled-SQL generation
failed on an over-broad leftover-placeholder check (the header comment
legitimately documents the token format __FRESH_ROW_HASH:<id>__); it passed
once the check inspected only non-comment lines. No new dependencies, no
commits or deployments. Remaining: mm-pineapple-crush-mocktail stays in the
review queue (whole-lime preparation unresolved, flags intact); further
curation continues independently toward the 100 mocktails + 100 cocktails
target (now 20 cocktails + 8 mocktails published).

### Metric annotation for recipe ingredient checklists — 2026-09-30 (first pass; corrected 2026-10-01)

All eligible recipe checklists now show practical metric measurements wherever
safely convertible, with no DB writes and the exact source data still stored.
New pure helper `app/find-my-drink/metric.ts` (no imports; runs in server
components and the making client alike) annotates each exact source ingredient
line in place: US fl oz on liquids → mL (~29.57/oz), ounces on explicitly solid
foods (berries/fruit/herbs/ginger/spices) → grams (~28.35/oz), cups → mL
(240/cup) with a "by volume" label for non-liquid contents (never grams — no
density assumptions), tbsp (15 mL) and tsp (5 mL) → mL; practical rounding
(two decimals under 10 mL so ¼ tsp = 1.25 mL survives, whole units above).
Ambiguous ounces (the daiquiri's "0.67 oz. Lime"; sugar/salt/honey/egg/ice,
whole-citrus names) stay verbatim with an explicit per-line note "(kept in
source units — weight or volume unclear)", and a solid-plus-ambiguous compound
("1 oz strawberries or lime") also stays verbatim. Alternatives keep their
original separators and convert BOTH sides ("1 ounce alcohol free vodka or
1 teaspoon apple cider vinegar" → "~30 mL or … ~5 mL"); name-only alternatives
merge back into one quantity ("1 cup alcohol free Rosé or alternative (see
notes)" → "… ~240 mL"); unsupported Unicode fractions, malformed/zero/negative/
absurd amounts, counts ("8 strawberries"), dashes, pinches, slices, wedges and
variable quantities ("Juice of 1 lime") stay verbatim. `components/detail.tsx`
passes the formatted display lines to Making and adds the SSR note "Metric
amounts are approximate conversions from the source; no serving scaling." near
the checklist when any line converted; the old imported-units note became
"Original quantities are kept for every ingredient; metric equivalents, where
shown, are approximate."; `components/making.tsx` only gained an optional
`quantityNote` prop render (no state/behaviour change). queries.ts, DB, the
browse listing, gate, cards/related, checkbox ids, step mode, progress and
accessibility are unchanged; no new dependencies or commit.

Correction — 2026-10-01: the write-up above is stale — it described a
quantity-first rendering, different note texts and two-decimal sub-10 mL
rounding that do not match the actual current implementation. The current
`app/find-my-drink/metric.ts` emits metric-first lines: "~44 mL Vodka" (never
"1.5 oz Vodka ~44 mL"), a solid cup as "~480 mL (by volume) watermelon" (the
"(by volume)" label follows the metric value), berry ounces as
"~28 g Strawberries", and the ambiguous lime stays "0.67 oz. Lime (kept in
source units — weight or volume unclear)" with no guessed metric value.
Rounding is to the nearest 0.25 below 2 mL, nearest 0.5 for 2–10 mL and whole
units at 10 mL and above; 0.33 oz rounds to ~10 mL (not 9.76). The
near-checklist note in `components/detail.tsx` (and the `quantityNote` passed
to Making) reads "Approximate metric conversions; source quantities retained
internally. Where conversion is unclear, original unit shown." — the note
texts described above ("Metric amounts are approximate conversions from the
source; no serving scaling." and "Original quantities are kept for every
ingredient; metric equivalents, where shown, are approximate.") no longer
appear in the current source — and the browse disclaimer now reads "Quantities
are shown in approximate metric units when a safe conversion is possible."
(the earlier "imported with" wording no longer appears). The parent
independently ran on 2026-10-01, all exit 0: `node scripts/recipe-metric-check.cjs`
PASS (89 fixtures; live 26 eligible rows / 88 ingredient lines: 79 converted
metric-first, 1 ambiguous, 8 verbatim — the same counts as the first pass);
`node node_modules/typescript/bin/tsc --noEmit`; Corepack `pnpm build`;
`node scripts/recipe-browse-check.cjs`; `node scripts/recipe-detail-check.cjs`
with the cached Playwright env (1440/390/320 no overflow); `git diff --check`
(warnings only). The first browser-check attempt failed on a missing
PLAYWRIGHT_MODULE env and passed once the cached env was provided. The
first-pass verification below is retained as historical evidence; its
spot-check examples are written in the superseded quantity-first form.

First-pass verification (actually executed, all exit 0): `node scripts/recipe-metric-check.cjs`
(89 fixture lines over the real transpiled metric.ts covering every distinct
line shape of the live 26 plus malformed/unknown/variable/invalid/alternative/
Unicode cases, no NaN/Infinity, no input mutation, deterministic; then the live
read-only REST check with the identical eligible predicate — 26 eligible rows,
88 ingredient lines: 79 converted, 1 ambiguous, 8 verbatim, helper verdict
cross-checked against each row's stored ingredient_details, launch-six ids
present, no writes); standalone `node node_modules/typescript/bin/tsc --noEmit`;
Corepack production build (pre-existing drift/override warnings only);
`node scripts/recipe-detail-check.cjs` with the cached Playwright/Chromium
overrides (new metric assertions: "~44 mL", "~89 mL", verbatim wedge, note
present, old note gone; checklist, step mode, 1440/390/320px no overflow, zero
page errors); `node scripts/recipe-browse-check.cjs` (unchanged; unit + live
gate-first sections passed); `git diff --check` (pre-existing line-ending
warnings only); production-server SSR spot-check over plain HTTP with the
eligibility cookie — dn-cape-codder shows "1.5 oz. Vodka ~44 mL" / "3 oz.
Cranberry Juice ~89 mL" / "1 wedge Lime" with the note, mm-watermelon-strawberry-
mocktail shows "2 cups watermelon ~480 mL by volume" / "8 strawberries" /
"1/2 cup fresh lime juice ~120 mL", dn-strawberry-daiquiri shows "1 oz.
Strawberries ~28 g", dn-daiquiri shows "0.67 oz. Lime (kept in source units —
weight or volume unclear)" with no guessed metric value; all test-owned servers
stopped. Limitations: dash/pinch/slice/wedge/counts and "Juice of N lime" are
not convertible and stay verbatim; tsp/tbsp sub-10 mL values keep two decimals
(9.76 mL for ⅓ oz is honest but over-precise-looking); the browse listing
disclaimer still says "Quantities are shown in the units the recipe was imported
with" (browse.tsx is outside this task's allowed scope). Spot-check helper:
`tmp/recipe-metric-ssr-spotcheck.cjs` (throwaway).

### Batch-1 repair of the 20 published recipes — 2026-09-30

Parent read-only audit found five material errors among the 20 Batch-1 recipes
published on 2026-09-29 (that publish plus its 17-of-20 image backfill are the
Batch-1 session's work; its own checkpoint was not previously written). Repaired
exactly those five among the already-live 20; no new curation/publishing, no
other rows touched. (1) `mm-blood-orange-mocktail` steps omitted the mandatory
1-cup alcohol-free Rosé — step 2 now includes it with the source's
optional-alternative note ("Add the blood orange juice and lime juice with the
alcohol-free rosé (or alternative), then stir gently."), in the source's order.
(2) `mm-vodka-mocktail` steps omitted the optional "1 teaspoon sugar or
sweetener (optional)" from the checklist — step 1 now includes it honestly as
optional. (3) `mm-pina-colada-mocktail-recipe` steps omitted the optional
"1 oz non-alcoholic rum ((optional))" — step 1 now includes it honestly as
optional. (4) `dn-brandy-alexander` allergens were NULL with "(fresh) Cream" in
the ingredients — allergens now `["Milk (cream)"]`, the exact dn-white-russian
format. (5) `dn-whiskey-sour` allergens were NULL with the optional egg white —
allergens now `["Egg (optional)"]` while the steps keep "optional egg white".
Caffeine stays unknown everywhere; no allergen-free claims. Guarded UPDATEs
(id + before-state full-row hash + published + ready + exactly-empty issues)
applied remotely in one transaction via the Supabase tools only for these five
ids; per-id hashes matched `batch1.after-hashes.json` exactly (no drift since
the publish), the unrelated-row aggregate hash over all 9,457 other rows
(`1180e34af90b33df61c7173340d35c09`) was re-verified inside the transaction and
byte-identical before/after, and only preparation (3 rows) / allergens (2 rows)
/ trigger-managed updated_at changed per row (53 keys before and after each
row; ingredients, quantities, descriptions, provenance, featured, images and
statuses preserved). Photos: the three NULL-image rows
(`dn-madras`, `dn-vodka-gimlet`, `dn-white-lady`) were re-checked this session
with three sequential stdlib urllib GETs (browser UA, 10 s timeout, 2 s sleep) —
all three DrinkNation pages still expose only the generic og-default.png, so
image_url stays NULL, the SVG fallback renders, and nothing was fabricated.
Preview/evidence: `output/recipe-batch1/batch1-repair.sql`,
`batch1-repair.evidence.jsonl`, `batch1-repair.before-hashes.json`,
`batch1-repair.after-hashes.json`, `batch1-repair-changed-keys.json`,
`batch1-repair.og-recheck.json`.

Full-20 audit against the retained evidence (source ingredients/method): every
published preparation_method matches its source method; no mandatory-ingredient
omissions remain (remaining name-level differences are the reviewed paraphrases
chocolate liqueur/Dark Creme de Cacao, syrup/Gomme Syrup, tequila/White Tequila,
qualifier dropping, and the generic add step for dn-last-word whose description
names all four equal measures); and the six-word provenance check passes —
0 six-word windows of published wording appear in source prose, and the three
new step wordings were verified against the source descriptions + instructions
before writing.

Verification (actually executed): `py_compile` on both batch1 scripts (exit 0,
unedited); live read-back — all five rows published/ready with exactly-empty
issues, corrected preparation/allergens spot-read confirmed, counts unchanged
(9,462 total = 9,424 draft + 38 published, 26 eligible, 20 Batch-1
published+ready); standalone TypeScript (exit 0); Corepack production build
(exit 0, pre-existing drift/override warnings only); `git diff --check`
(exit 0, pre-existing line-ending warnings only); `node
scripts/recipe-browse-check.cjs` (exit 0 — its fixtures do not assert exactly
six: the live section asserts the six launch recipes surface, which they do via
the featured rail, plus legacy/draft/unknown 404s; unit section over synthetic
26-row data passed) and `node scripts/recipe-detail-check.cjs` with the cached
Playwright/Chromium overrides (exit 0 — fully mocked Cape Codder fixture,
detail metadata/unknowns, checklist, step mode, 1440/390/320px, zero page
errors). No new dependencies, commit or deployment.

### Recipe image backfill for the six published recipes — 2026-09-29

Backfilled image_url/image_alt for the six live published recipes only
(owner-approved): the four cocktails use their DrinkNation page og:image URLs
(two parent-verified in the prior session; Negroni and Margarita fetched this
session with a stdlib urllib GET only — browser UA header, 15 s timeout, 2 s
sleep, sequential) and the two mocktails use the full-size first entries already
retained in `output/recipe-extract/mindfulmocktail-recipes.jsonl` (never
refetched). image_alt is the drink name exactly as stored in public.drinks; no
photography claims. Guarded UPDATEs (exact id AND status='published' AND
editorial_ready=true AND image_url IS NULL) were applied remotely in one
transaction via the Supabase tools only for these six ids; no other rows,
columns, statuses, RLS/grants/policies, app code, migration files or
environment files changed, and no binaries were re-hosted. Preview and
evidence: `output/recipe-images/backfill-6.json`, `backfill-6.sql`,
`backfill-6.before-hash.json`, `backfill-6.after-hash.json`,
`backfill-6.before-rows.json`, `backfill-6.after-rows.json`,
`backfill-6.spot-check.json`; generator script
`scripts/recipe-catalogue/backfill_6_images.py` (stdlib only).

Verification (actually executed): `py_compile` (exit 0); identical before/after
hash SQL — six-row hash `33bcce7d8677ec16479c7ccb632c6532` and other-rows
aggregate hash `9da0fea045725fd8c98adb7b2572eaf6` byte-identical before/after,
proving every other column on the 6 rows and all 9,456 other rows unchanged
except the trigger-managed updated_at on the 6 (status counts unchanged: 9,444
draft + 18 published = 9,462); field-level before/after JSON comparison over
the full 6-row snapshots (exit 0 — exactly image_url/image_alt/updated_at
changed per row; an initial transcription slip in the after snapshot was caught
by the hash contradiction, corrected against a fresh live read and re-run);
live read-back 6/6 non-null absolute https URLs (83–118 characters) with
image_alt = drink name; standalone TypeScript (exit 0); Corepack production
build (exit 0, pre-existing drift/override warnings only); `git diff --check`
(exit 0, pre-existing line-ending warnings only); production-server spot-check
over plain HTTP — all six details return 200 with the stored image URL and alt
rendered, the listing shows photos for 6/6 rows, zero provenance leaks (no
Source link, no Retrieved date, no Wording/DrinkNation/Mindful Mocktail/Adapted
by/Illustrative artwork text), and the eligibility gate still precedes content;
an `imageFor()` in-memory unit check (exit 0 — the stored photo renders with
alt from image_alt/name, and the hand-authored SVG with a decorative empty alt
renders when image_url is nulled in memory, never written back); `node
scripts/recipe-browse-check.cjs` (exit 0 — unit section plus live gate-first
listing rendering all six published recipes with legacy/draft/unknown 404s, so
the new URLs passed the queries.ts fail-closed https validation); `node
scripts/recipe-detail-check.cjs` with the cached Playwright/Chromium overrides
(exit 0 — detail metadata/unknowns, checklist, step mode, 1440/390/320px, zero
page errors). No new dependencies, commit or deployment.

### Recipe provenance-credit removal and image wiring — 2026-09-28

Owner-confirmed removal of all rendered provenance credits from the recipe UI:
the detail page's Source/Retrieved/Wording section (DrinkNation/Mindful
Mocktail link, retrieved date, content-origin wording disclosure) and the false
"Illustrative artwork · not photography" absolute are gone everywhere; the
legal-drinking line and a neutral quantities note ("Quantities are shown in the
units the recipe was imported with") remain, and the browse introLine and page
metadata no longer claim source/wording disclosure. The frozen eligible
predicate (all 8 params), full-row re-checks and fail-closed behavior are
unchanged; reads only add image_url/image_alt to the select, RecipeRow and row
validation (image_url null or a non-empty https URL of at most 2048 characters,
image_alt null or a string; invalid values fail the read closed). Cards and the
new detail hero prefer the stored original image when present (alt from
image_alt, else the recipe name) and otherwise fall back to the hand-authored
SVG art (decorative empty alt); the hero sits at the top of the titleBlock as a
reserved 3:2 aspect-ratio well (width/height attributes, lazy, contain,
max-width 640px) so any backfilled image renders without layout shift. DB
backfill of original images is separate and not part of this change; all live
eligible rows still have NULL image_url, so the SVG fallback currently renders
everywhere. Unused .provenance CSS selectors remain in finder.module.css per
the minimal-CSS-change scope.

Verification (actually executed): standalone TypeScript (exit 0), Corepack
production build (exit 0, pre-existing drift/override warnings only), `git diff
--check` (exit 0, pre-existing line-ending warnings only), `node
scripts/recipe-browse-check.cjs` (exit 0 — real queries.ts unit section with the
identical eligible filter and fail-closed behavior, live gate-first listing,
six published recipes, legacy/draft/unknown 404s), `node
scripts/recipe-detail-check.cjs` with the cached Playwright/Chromium overrides
(exit 0 — detail metadata/unknowns, checklist, step mode, 1440/390/320px no
overflow, zero page errors, hero rendered), and a manual production-server
spot-check over plain HTTP asserting all six detail pages show no Source link,
no retrieved date, no DrinkNation/Mindful Mocktail/Wording/Adapted-by wording
and no listing provenance copy, with the SVG fallback hero and preserved
metaLine/unknownLine/related/back link (exit 0). Screenshots:
`output/playwright/recipe-detail/detail-1440.png` and `detail-320.png`. No new
dependencies, DB/RLS/data changes, commit or deployment.

### Recipe Phases 0–3 integrated completion — 2026-09-28

Published six reviewed recipes and completed recipe saves/private notes, distinct
likes, one-per-user editable reviews and typed comments/questions/tips. Existing
phone OTP/session reused; all catalogue reads remain eligible-only and all writes
require eligibility plus a verified session. Owner-only base-table RLS/column
grants prevent cross-user access, forged uid and moderation changes; approved
identity-free projections/stats use private hardened triggers, per-drink locking
and retained per-user rate buckets. Studio moderation can approve/reject; edited
reviews return to pending, rejected owner content is hidden, and unpublishing a
recipe hides its public community content. Saved-note cap is 500; public bodies
are capped at 2,000. Applied remote migrations
`recipe_saves_and_moderated_community`,
`recipe_community_read_indexes_and_private_limit_policy`,
`recipe_community_owner_and_save_indexes`; prior schema snapshot is in
`output/recipe-community/remote-before-schema.json`. No real community rows or
SMS were created by testing.

Live integration found and fixed the older detail/related REST equality quoting
bug: `eq."id"` returned zero matches while `eq.id` returned the reviewed recipe.
Regression now checks literal query values and live eligible detail 200s.
Additional integration fixes: conflict-target SELECT privileges, full-width
advisory hash (avoids integer overflow), explicit denied private rate table,
fail-closed private/aggregate payload validation, note PATCH projection, mobile
making/community bar overlap and auth-change form remount. Two executor repair
cycles were followed by a scope/interface reassessment; director explicitly took
final integration/test ownership, replacing placeholder verification with actual
mocked-action and database/browser tests. Bounded Sol security critique passed.

Executed and passed: Corepack production build, standalone TypeScript,
`git diff --check`, live read-only browse/detail regression (network-enabled
after initial sandbox EACCES), real action/read-helper mocked regression,
isolated PostgreSQL schema replay plus behavioral RLS tests (rolled back), and
production Playwright flow covering mocked OTP, save/note/like, review edit,
pending tip, making controls, deletions, saved list and sign-out. 320/390/1440px
have no overflow/page errors; mobile Save/Like and making controls meet 44px.
Screenshots: `output/playwright/recipe-platform/`; director reviewed the 320px
render. Security advisors retain only three pre-existing warnings; no new
security warning. Added indexes cover community reads and scoped foreign keys;
unused-index INFO is expected before traffic. Graphify refreshed (621 nodes,
1,152 edges). Plan status updated. No new dependencies, environment/early-access
changes, commit or website deployment. Phase 4 remains deferred; further recipe
curation continues independently of the six-recipe launch.

### Recipe Phase 0 launch checkpoint — 2026-09-28

Owner requested completion of Phases 0–3. Reviewed and atomically published the
six previously source-reviewed practical recipes (four cocktails, two mocktails),
with readiness=true, empty quality issues and featured selection. White Russian
now identifies its known milk/cream allergen; other unknowns remain unknown.
Full-row hash guards verified all six original rows and an aggregate hash verified
the other 9,456 catalogue rows unchanged. Live read-back confirms six eligible
recipes and 9,444 imported drafts remaining; the 12 legacy records are explicitly
excluded for missing provenance/classification. Evidence and pre-change backup:
`docs/recipe-launch-review.md`, `output/recipe-launch/remote-before.json` and
`publish-reviewed.sql`. Publication is authorized by the current owner request;
the earlier Studio-only workflow no longer blocks this bounded execution.
Source facts were compared with retained extraction evidence; no source images,
narrative, ratings or legal-clearance claim. Phases 1–3 integration/behavioral
checks remain in progress; no website deployment or commit.

### Recipe community backend Phase 2–3 checkpoint — 2026-09-28

Added authenticated server actions and read helpers for saves/private notes, likes,
one-per-user reviews, and typed comments. Writes verify eligibility, the authenticated
session, and the eligible recipe before sending owner-scoped REST mutations; duplicate
saves preserve the existing note and note updates only target existing rows. Added
reviewed local-only SQL for saved-drink grant/RLS hardening, moderated social tables,
sanitized approved projections/stats, trigger refreshes, moderation reset behavior, and
the database comment rate limit. No remote SQL or data was executed. Focused contract
check and standalone TypeScript passed; integrated build and SQL application remain
with the director.

### Recipe community UI checkpoint — 2026-09-28

Added the Phase 2–3 accessible community surface: authenticated Save/private notes, distinct Like, moderated review and typed comment forms, honest pending/unavailable states, public Community member labels, saved-recipes route, and mobile-safe action controls. Reused planner OTP actions and server-loaded community state; no backend, query, recipe or dependency files changed. Focused TypeScript/build verification awaits the parallel community backend module; a browser-check contract is included for mocked upstream action runs.

### Recipe essentials and detail quality - 2026-09-28

Verified 9,450 enriched imported drafts in EkQuarter; corrected six source-reviewed
recipes with recipe-specific steps and supported metadata. Applied the readiness,
provenance and quality-issue public-read gate and SELECT-only client grants.
Rollback assertions verified eligible visibility and flagged exclusion. Original
snapshots and reviewed output are in `output/recipe-curation/`; see
`docs/recipe-curation.md`. All recipes remain unpublished for this checkpoint;
9,444 imported recipes still need instruction/classification review.

Detail UI now displays known recipe essentials and explicit unknowns, retains
original quantities, and removes unsupported serving scaling. Production build,
standalone TypeScript and mocked production browser checks passed (1440/390/320px,
checklist, step mode, no overflow or page errors). Workers reached usage limits;
director completed and reviewed their bounded unfinished work directly. No new
dependencies, RAG installation, deployment or commit. Live read-only production
smoke and query regression passed after allowing Supabase network access; the
initial sandbox-only attempt failed with EACCES. Whitespace check and Graphify
refresh passed (508 nodes, 916 edges).

### Recipe browse/detail Phase 1 checkpoint — 2026-09-28

Replaced the taste-ranked `/find-my-drink` finder with a mobile-first, Supabase-backed read-only recipe browse/detail experience (retitled "Find a recipe"), keeping the existing regional eligibility gate on both the listing and detail routes. Every list/detail/related read applies the identical frozen eligible-publication predicate (status='published' AND editorial_ready=true AND alcohol_type IN ('cocktail','mocktail') AND non-null source_name/source_url/source_retrieved_at/content_origin AND exactly-empty recipe_quality_issues) with full row re-checks and fail-closed reads; ineligible IDs 404. Live audit confirms zero eligible rows by design (9,450 drafts, 12 legacy published rows all NULL alcohol_type/source_name, editorial_ready absent remotely), so the UI renders the honest empty state and drafts/legacy rows never surface. The local-only `supabase/migrations/20260927_drinks_publication_gate.sql` hardens the SELECT policy to the same predicate and restricts anon/authenticated to SELECT-only, but it is NOT applied remotely — RLS policy and broad grants are unchanged live, and publication remains a Studio-only owner action after per-row editorial/safety/rights review. No likes, reviews, comments, saves, invented ABV/attribution, or new dependencies. Repairs in this pass: detail provenance now renders content-origin wording disclosure; long-title overflow guard in CSS.

Verification (actually executed): executor ran `node node_modules/typescript/bin/tsc --noEmit` (exit 0), Corepack `pnpm build` (exit 0, pre-existing drift/override warnings only), `node scripts/recipe-browse-check.cjs` (exit 0, unit + gate-first/honest-empty-state/eligible-only-404 sections passed), `git diff --check` (clean apart from pre-existing line-ending warnings), plus Chromium SSR/browser smoke (zero page errors, 320–1440px no overflow, 44px gate targets). Director independently reran standalone TypeScript (exit 0), whitespace checks, and security/performance advisors (only pre-existing findings). Unrelated working-tree changes preserved; no commit or deployment. Remaining owner decisions: per-row publication, legacy-row attribution, remote grant-hardening apply. Staging note: the index currently holds an empty blob for the gate migration while the worktree holds its content — stage the worktree content before any future commit.

### Recipe detail essentials UX - 2026-09-28

Recipe reads now require an exactly empty `recipe_quality_issues` array and non-empty validated ingredients/method, and carry source yield, prep, method, ice, allergen and caffeine fields with explicit unknowns. Detail surfaces known metadata and concise unknown disclosures while retaining the source link. Making preserves checklist, steps, keyboard and wake lock; unsafe quantity scaling is disabled with original-quantity copy until source semantics are verified. Standalone TypeScript, production build and whitespace checks passed; browser smoke remains with the parent integration check.

### Recipe essentials live verification - 2026-09-28

Completed the first factual-enrichment pass in EkQuarter: 9,450 imported drafts now have ingredient details and quality issues; 9,249 have source-reported serving counts and 8,177 have source-method evidence. All 9,450 fabricated strength/sweetness/caffeine/allergen defaults were replaced with NULL. The 12 legacy published rows are unchanged (full original-row hash verified). All other pre-existing columns across all 9,462 rows are unchanged except the four intentionally cleared attributes and update timestamps (aggregate hash verified); original ingredient arrays match the new raw ingredient entries on every enriched row. Status counts remain 9,450 draft / 12 published. No RLS or grant changes.

Verification: executor ran the essentials self-check, fresh catalogue builder/validator, production build, standalone TypeScript and whitespace checks successfully. Director independently reran the self-check and whitespace check, performed a 100-row remote transaction trial with ROLLBACK, applied the same enrichment in compact 500-row updates guarded by snapshot update timestamps and original default/new-field state, checked all update counts and database-wide invariants, and compared a 100-row stored sample exactly with generated enrichment (normalizing numeric transport serialization and issue-array order). A larger SQL payload encountered a transport error; the successful rolled-back trial and final counts establish no unintended partial application. Security advisors retained only the three pre-existing warnings. Graphify refresh passed (500 nodes, 915 edges). No local PostgreSQL smoke test or UI change was made.

Limit: this is structural/factual enrichment, NOT completed editorial curation. All rows still flag generated preparation and provisional source-based alcohol classification; 3,254 flag ambiguous ingredient amounts/units, 978 flag carbonation-plus-shake candidates, and 201 lack explicit source serving counts. No automatic scaling, ABV, allergen-free or publication-readiness claim. Glassware suggestions remain local-only; garnish was not recovered. Review queue and backup are in `output/recipe-essentials/`; field-use guidance is in `docs/recipe-essentials.md`. Director review passed for this bounded enrichment; recipe correctness review remains outstanding.

### Recipe essentials enrichment checkpoint — 2026-09-28

Added the stdlib-only `enrich_essentials.py` source-derived enrichment and review queue for all 9,450 accepted draft recipes. It preserves source ingredient/preparation arrays, emits conservative parsed details and explicit nulls/flags for unknowns, keeps every generated template preparation under editorial review, and writes guarded draft-only SQL batches plus additive schema DDL. The catalogue builder now emits unknown strength/sweetness/caffeine/allergen fields as explicit nulls and the validator enforces that contract. No source files, app code, publication status, or remote data were changed by the script.

### Recipe essentials schema checkpoint - 2026-09-28

Owner selected recipe essentials first. A complete 9,462-row pre-change snapshot is saved in `output/recipe-essentials/remote-before.jsonl` (9,450 sourced drafts and 12 legacy published rows). Reviewed and applied `scripts/recipe-catalogue/essentials-schema.sql` remotely as `recipe_essentials_unknowns`: additive ingredient details, source yield, servings, source-method evidence and quality-issue columns; strength, sweetness, caffeine and allergens now permit unknown values and no longer default to fabricated assertions. Existing range constraints, recipes, publication statuses, RLS and grants are preserved. Live schema read-back confirmed all nine column changes. Data enrichment and its verification are still in progress; this checkpoint does not claim complete or reviewed recipes.

Director final review — 2026-09-21: reviewed the planner source diff and rendered desktop gate, populated shelf, drawer and receipt, plus mobile surface and drawer. Independently reran `node scripts/planner-redesign-check.cjs` and standalone TypeScript successfully. The browser check covers category remove/undo, empty-list drawer recovery and focus, restored quantities, 320–1440px overflow and touch targets, reduced motion and zero page errors. Existing model and mocked backend checks also passed. Backend/action/catalogue, global-style and homepage hashes match the session baseline. Build passed in the executor's final verification. Chromium/mock-only; no live SMS or cloud writes, commit or deployment. Graphify refreshed; final review passed.

### Owner decisions checkpoint — 2026-09-26

Owner decisions recorded in `docs/allcheers-recipe-platform-plan.md` (documentation only; no code, database, environment or other-doc changes): (1) keep `/find-my-drink` (retitled "Find a recipe"); (2) no fixed 100–200 launch count (the plan's earlier fixed-count recommendation is withdrawn) — Phase 0 prioritizes a reviewed selection of the best practical recipes whose ingredients are easy to obtain or commonly at home, keeping per-row editorial/safety/rights checks and making no claim that all 9,450 drafts can be published; (3) retain the existing regional eligibility gate initially; (4) keep Like distinct from Save, sequenced after Phase 1 as the plan already phases it (§12 Phase 3). The ambiguous owner phrase "just text the best once you like" is interpreted as a preference for best accessible-ingredient recipes, not permission to skip editorial review; the precise count, scoring and publication set remain undecided and are not silently fixed here. Moderation mode, display names, unit conversion, finder retirement, cocktail/mocktail balance, eligible-publication predicate schema and rejected-UGC visibility remain open (plan §16).

### Recipe platform planning checkpoint — 2026-09-26

Planning/research only; no app, database, dependency, environment or agent-file changes. Created `docs/allcheers-recipe-platform-plan.md`, which plans replacing the taste-ranked `/find-my-drink` (local 507-product JSON + localStorage shortlist) with Supabase-backed cocktail/mocktail recipes served only from published `public.drinks` rows — the 9,450 imported drafts stay hidden until curated — keeping `/find-my-drink` initially as "Find a recipe" and adding `/find-my-drink/[id]`. The plan covers goals/non-goals, guest/authenticated/mobile-making journeys, discovery and detail IA, the Save/Like/one-per-user Review/typed Comment-Question-Tip/owner-only Note model with auth required for writes, additive `drink_likes`/`drink_reviews`/`drink_comments` design with safe aggregates and reuse of `saved_drinks.note`, RLS/grants/API exposure and Studio-first moderation, the editorial gate (its earlier fixed-count recommendation was withdrawn by owner decision on 2026-09-26; see the owner-decision checkpoint above), phased delivery (0 curate → 1 read-only browse/detail → 2 save/notes → 3 likes/reviews/comments → 4 pantry/collections/cooksnaps) with an explicit recommendation against shipping all social features at once, reference research (Difford's Guide, Punch, BBC Good Food, NYT Cooking, Make Me a Cocktail, Cookpad, Tasty; public markup only, mobile behavior inferred, not viewport-tested), open owner decisions and a likely file map. No implementation, database or legal-clearance claims made. Correction (2026-09-26, live read-only recheck of remote data): the 12 pre-existing published `public.drinks` rows have ingredients + preparation but NULL `alcohol_type` and NULL `source_name`, with legacy categories such as 'After Dark', 'Aperitivo' and 'Zero Proof', so 'published only' is not a sufficient launch filter for the recipe UI and mocktail/base-spirit facets; the plan now has Phase 0 explicitly review/classify or deliberately exclude all 12 legacy rows with a provenance/copy-rights assessment (never treating them as pre-curated and never classifying NULL as cocktail), a frozen eligible-publication predicate (`status = 'published'` plus editorial readiness/classification, schema/flag decided before Phase 1) with 404 for ineligible IDs in the Phase 1 listing/detail queries while the 9,450 drafts stay inaccessible, guest browsing retaining the existing regional eligibility gate initially (owner decision 2026-09-26; open/no-gate and a mocktail-only exception not adopted under that decision), and an explicit §6 private-note row (authenticated owner of the `saved_drinks` row only, ≤500 chars). Live recheck (2026-09-26): the remote `drinks_public_read` policy is `SELECT` `TO public USING (status = 'published')` and broad legacy anon/authenticated grants need a prelaunch audit, with honest legacy provenance attribution and the missing local `public.drinks`/`saved_drinks` base migrations recorded as Phase 1/2 preconditions. Final review fix (docs-only, 2026-09-26): the plan's Phase 2 preconditions now explicitly require auditing live `public.saved_drinks` RLS, policies and table/column grants before any use — owner-scoped `auth.uid()` SELECT/INSERT/UPDATE/DELETE policies, narrow grants, no anon access, with owner/cross-user/anonymous access tested; only the primary key and `note` CHECK are verified live so far, and `saved_drinks` RLS/policies/grants are not yet verified.

### Recipe database provenance checkpoint — 2026-09-25

Built the deterministic recipe-catalogue pipeline (`scripts/recipe-catalogue/`) that turns 9,788 sourced inputs (9,637 DrinkNation, 151 Mindful Mocktail) into draft catalogue rows for `public.drinks`: 9,450 accepted draft rows (9,306 cocktails, 144 mocktails) and 338 rejected records (311 unsafe_content, 18 non_beverage_name, 6 non_beverage_ingredient, 3 non_beverage_category). Source descriptions, instructions, images, ratings, nutrition and author content are excluded; factual ingredient quantities are retained, and all AllCheers descriptions/preparation wording comes from finite templates generated from structured facts, never source prose. The additive `20260923_drink_provenance` migration added provenance/classification columns (source name/url/retrieved-at, content origin, alcohol type) and made unknown ABV nullable while retaining the 0–100 range check; it was applied to the remote Supabase project as `drink_recipe_provenance`. Remote `public.drinks` now holds the 9,450 new draft rows alongside the 12 pre-existing published rows; the temporary anon insert policy was removed afterwards (verified count zero), and nothing was newly published. No UI work.

Verification (all actually executed): `py_compile` passed on the pipeline; a double build produced 41 byte-identical artifacts; the validator passed 21/21 checks. Locally, the migration was applied twice to a throwaway PostgreSQL cluster and the first 500-row batch imported; the initial local import exposed a malformed SQL terminator, the builder/validator were fixed, and the catalogue was regenerated and revalidated. Remote verification confirmed 9,450 draft rows, 9,306 cocktails, 144 mocktails and 9,450 provenance-bearing rows; security advisors reported only the 3 pre-existing warnings and performance advisors only pre-existing findings. Corepack `pnpm build`, standalone `node node_modules/typescript/bin/tsc --noEmit` and `git diff --check` passed. The remote database remains editorially unreviewed and entirely draft; factual/formula reuse and source terms still need owner/legal review before any publication.

Final reviewer repair (same date): after review, ingredient-name parsing was fixed so numeric hyphenated brands such as `7-up` are no longer truncated to `up`, with module-level regression assertions added. Artifacts were rebuilt twice with unchanged counts (9,450 accepted / 338 rejected), all 41 byte-identical and the validator passing 21/21; exactly 336 accepted descriptions changed and no other row fields changed. The same 336 remote draft rows were refreshed (still drafts), and the temporary select/insert/update policies used for the refresh were removed and verified at count 0. This progress file's 27 encoding artifacts were also repaired without altering content.

### Party Planner browse redesign — 2026-09-22

Executed the bounded browse redesign in `app/party-planner/planner.tsx` and `planner.module.css`, with browser-check updates in `scripts/planner-redesign-check.cjs`; no backend/action/session/model/catalogue, global-style, homepage, dependency, environment or agent-file changes. Generic large-image product cards were replaced with flat border-separated compact menu entries (`<ul>`/`<li>`): small 44×49 existing category illustration, product name, distinct size/price (bold plum price), drag hint, over-budget label, and right-aligned Add / "Add anyway (over budget)" or card-stepper controls with unchanged quantity IDs, arithmetic and validation; drag-and-drop guards unchanged. The category strip left the sticky toolbar and became a dedicated `<nav>` category index inside the inventory layout: vertical two-line index (name + "N drinks · In list") alongside the catalogue at ≥901px (sticky top 200px, static below 560px viewport height), compact horizontal scrollable rail on mobile; the browsing category is plum-active with `aria-current="true"`, included categories are tinted with the × remove and its confirmation toast/undo retained. The redundant "Start with a category" chips were replaced by an index pointer hint. The filter toolbar keeps search + Filters trigger and gained a visible active-filter row (uppercase label, per-filter remove chips with aria-labels, Clear all filters) while the grouped Brand/Pack-size/Within-budget dialog is unchanged. Ivory/plum editorial styling retained; menu-entry transitions are reduced-motion-gated.

Verification (all actually executed): the director ran `corepack pnpm build` (passed, existing drift/override warnings only), standalone `node node_modules/typescript/bin/tsc --noEmit` (passed), `node scripts/party-planner-check.cjs` and `node scripts/party-planner-backend-check.cjs` (both passed). `node scripts/planner-redesign-check.cjs` first failed on a strict-mode locator collision (`[class*="activeFilters"]` matched both the container div and the `activeFiltersLabel` span); fixed script-only by narrowing to `div[class*="activeFilters"]` without weakening assertions, then passed against the director's existing production build (build newer than both planner edits, so no rebuild needed): gate, vertical index, flat menu shelf, active-filter row visible→hidden around Reset filters, Beer add/repeat, quantity increment, search reset, filter dialog, cart drawer, receipt, edit, draft reload, remove/undo, empty-list drawer recovery with shelf focus, 1440/1024/768/390/320 overflow and 44px touch targets, reduced motion (menu transitionDuration 0s), aria-current on the browsing tab, zero page errors. `git diff --check` passed with existing line-ending warnings. Screenshots captured and inspected: `output/playwright/planner-redesign/{gate,populated,categories,filter,drawer,receipt,mobile-shelf,mobile-drawer,mobile}.png` — desktop vertical index + flat menu shelf confirmed, grouped filter dialog with facet counts over the dimmed shelf, right-anchored drawer with line/subtotal, mobile rail scrollable with no page overflow and wrapped entry actions, mobile bottom drawer. Chromium/mock-only via the cached Playwright and Chromium 1228 overrides; no live writes, commit or deployment. Baseline copies: `tmp/planner-redesign-browse/*.before-browse`. Graphify code-only refresh passed after the checkpoint (374 nodes, 657 edges).

### Party Planner redesign polish — 2026-09-21

Consolidated the planner visual layer into base CSS Module rules: ivory/plum editorial styling, Georgia headings, sans-serif logo, consistent product art wells, flex-column cards with aligned actions, full-opacity over-budget cards, short-viewport sticky safeguards, and reduced-motion behavior. Category chips retain drink counts while the shelf retains price range context. Issue actions close the inventory drawer, focus the shelf, and use reduced-motion-aware scrolling. Replaced the incomplete redesign browser check with a production-only mocked Playwright flow covering gate, basics, Beer add/repeat, quantity increment, search reset, filters, cart drawer, receipt, edit, draft reload, responsive widths, overflow, touch targets, reduced motion, screenshots, and page errors.

Verification: `corepack pnpm build` passed; `node node_modules/typescript/bin/tsc --noEmit` passed; `git diff --check` passed with existing line-ending warnings; the production redesign check passed with the mocked upstream, zero page errors, reduced motion, gate/populated/drawer/receipt/mobile screenshots, 1440/1024/768/390/320 overflow checks, touch targets, quantity increment, search reset, filters, review/edit, and draft reload. Existing pnpm dependency-drift and ignored-override warnings remain. No dependencies, backend, catalogue, environment files, or unrelated pages were changed.

### Party Planner one-page Phase 1 checkpoint — 2026-09-19

Converted the party planner from a 3-step wizard into a one-page flow per the Phase 1 contract: gate (step 0) → build surface (step 1) → receipt on the same page (step 2). Deleted the stepper nav + `steps` array, all "Step N of 3" eyebrows, the old People & budget step, and the build-surface Back button; `move(1)`/`move(2)` retargeted (gate/saved flows → 1, review → 2). The guests/budget form moved into a new Guests & budget `<dialog>` (invalid-only hints, same preset chips, Done) opened via the meter row's Edit pill and auto-opened exactly once on reaching the build surface with invalid basics (`basicsPrompted` ref). The desktop inventory aside was removed in favor of a floating plum cart pill (≥901px) that opens the existing inventory dialog restyled as a right-anchored slide-over; drag-drop validation moved unchanged onto the pill and the open dialog, with `inventoryTrigger` set by whichever surface opened it. Ten hand-authored category SVGs (`public/images/drinks/*.svg`, viewBox 100×112) render on product cards, inventory lines and receipt lines with placeholder fallback via `categoryArt`/`artFor`. Product grid is now `repeat(auto-fill, minmax(210px, 1fr))` with the old fixed-column breakpoints removed; `inventoryPanel` and stepper CSS deleted. toggleCategory/removeCategory/undoRemoval/showToast/reviewList, steppers, filters dialog, modals, print and affordability rule untouched. Phase 2 (copy polish, localStorage draft, chip tweaks, lean-lines dedup) deliberately not started.

Verification executed: `node node_modules/typescript/bin/tsc --noEmit` exited 0; `$env:pnpm_config_verify_deps_before_run='warn'; corepack pnpm build` compiled successfully with /party-planner static (existing drift/override warnings only); `git diff --check` clean apart from pre-existing line-ending warnings; production smoke on port 3124 returned 200 with "Party Planner" content and 200 for `/images/drinks/beer.svg`; the smoke server was stopped after. Legacy `scripts/*.cjs` were not run (out of scope, assert older UI). No commit or deployment.

### Agent model update - 2026-09-18

All agents now use `nvidia/z-ai/glm-5.3-flash` (union-alpha stealth period expired; free qwen3.8-27b tier rate-limited; Supabase MCP temporarily disabled in opencode.jsonc).

### Budget-awareness - 2026-09-18

Step 3 now adds client-side budget awareness in `planner.tsx` (scoped styles in `planner.module.css`): ₹2,000/₹5,000/₹10,000 budget presets with pressed state cleared by manual edits, a shelf line reporting remaining and per-guest budget, per-card fit tiers that de-emphasise non-fitting cards with normal Add disabled plus an "Add anyway (over budget)" escape hatch sharing the same add path, a "Within budget (N)" narrowing chip, and polite post-add budget announcements. All client-side over already-valid plans: over-budget lists remain valid; a single `fitsBudget` helper drives the narrowing and never mutates inventory. `planner-inventory-check.cjs` covers presets, tiers, escape hatch and chip behaviour; its clear-all expectation now uses the raised `limit0` because "Clear all filters" resets filters/search but not the show-more pagination, so the shelf correctly renders `limit0` products after clearing. Limits: Chromium-only, mocked services. Verification executed: Corepack production build and standalone TypeScript exited 0; planner-inventory, planner-ux, design-polish, party-planner-backend and early-access suites all passed; `git diff --check` clean with existing line-ending warnings; no listeners remained on 311x/312x loopback ports. Existing pnpm drift/override warnings remain; nothing installed, committed or deployed.

### Category-shelf filters — 2026-09-17

Added client-only brand and pack-size toggle chips to step 3 in `planner.tsx` with scoped wrapping styles in `planner.module.css`. Facets and stable counts come from the entire browsed category; selections use per-category records, OR within each facet and AND across facets and text search. Clear-all and empty-state Reset filters clear only that category's facets/search. The polite result line reports matches out of category total, independent of the unchanged six-card/+6 limit. Inventory membership, quantities, Add/drop validation, backend and saved-plan behavior remain unchanged; the new filter records reset alongside search when starting/editing a plan.

Extended `planner-inventory-check.cjs` without removing assertions or changing fixtures. Actual production runs passed filter counts/touch targets, keyboard toggles, two-brand and two-size OR, cross-facet/search AND, A/B persistence and scoped clearing, empty reset, identical inventory IDs/quantities/totals, zero filter POST requests, and filtered Add/native desktop drag at 1440/390; wrapping also checked at 320. Existing catalogue sufficed; deny-by-default mocks unchanged.

Verification executed: `$env:pnpm_config_verify_deps_before_run='warn'; corepack.cmd pnpm build` exited 0; standalone TypeScript exited 0; `planner-inventory-check.cjs`, `planner-ux-check.cjs` (delegates to inventory suite), `design-polish-check.cjs`, `party-planner-backend-check.cjs` and `early-access-check.cjs` all passed. Production smoke curl returned 200; zero browser page errors. An additional isolated production browser probe printed/asserted `Showing 75 of 75 drinks` for both 6 and 12 rendered cards, `Showing 7 of 75 drinks` for Tuborg, and `Showing 0 of 75 drinks` for empty search, then successful reset. All test-owned process trees were stopped. Existing pnpm dependency-drift/ignored-override warnings remain; nothing installed, committed or deployed.

Evidence: `output/playwright/planner-inventory/filtered-shelf-{1440,390}.png`, `filter-empty-{1440,390,320}.png`, plus regenerated existing suite evidence. Mobile filtered shelf and desktop empty state opened and inspected. Full-page captures stitch fixed UI at viewport-relative positions; not evidence of physical-device behavior. Chromium/mock-only; no real SMS/cloud writes. Director/Astra review pending. No fixture/backend/catalogue/dependency changes.

### Saved-compatibility and sticky repair — 2026-09-17

Director initial review passed (source, model, CSS, screenshots) and the director personally executed planner-inventory-check and design-polish-check, both passing. This bounded repair closed the two named gaps; no other redesign.

1. Saved edge coverage: `scripts/fixtures/design-polish/mock-supabase.cjs` optionally seeds two complete, internally consistent historical snapshots (unique UUIDs, correct totals, guest counts 41/42) behind the test-process env flag `PLANNER_INVENTORY_SAVED_EDGES=1` — no app backdoor, no live data. One snapshot has two same-category Beer siblings with the second at a changed pack size (+100 ml); the other has one normal sibling plus one product ID absent from the current catalogue. `scripts/planner-inventory-check.cjs --saved-edges` passed against the production build: both snapshots pass normal `validSaved` validation, open and edit/reprice retain both siblings and quantities (2 and 3), the changed-size item blocks review with exactly one per-item review gate whose button focuses that item's own input, and the missing item blocks review, is labelled unavailable, and its removal preserves the valid sibling (quantity 2, review enabled). Exercised at 1440x900, 390x844, 320x480 (drawer) and 720x450.

2. Sticky/footer verification: per-control geometry evidence after focus + `scrollIntoView` is recorded in `output/playwright/planner-inventory/saved-edge-geometry.json` (control, footer, host rects, elementFromPoint hit test, sticky state) with viewport screenshots `edge-<kind>-<width>-<label>.png`. Measured separation held for the last item's quantity input, the size-review button and Remove at every tested viewport — no overlap was found, so no scroll-padding/bottom-reserve CSS change was made (`git diff --no-index` against the pre-repair CSS copy is empty). The 720x450 viewport is the documented 200% CSS-viewport-reflow equivalent of 1440x900; physical browser zoom was not available and is explicitly not claimed. Primary Review/Save actions remained reachable in every case.

3. Copy cleanup in `planner.tsx` only: singular item/pack wording in the add announcement, inventory count line, product badge, mobile bar button and receipt line; the subtotal now reads "Subtotal · incomplete" whenever any inventory item is unavailable, has an invalid/missing quantity or still needs size review, in both the desktop panel and mobile bar; existing `incompleteReason` text retained. No test assertion was weakened; the inventory suite additionally now asserts the per-item review-gate count and disabled review until review/removal.

Verification after the app edits, all executed: Corepack production build passed (existing pnpm drift/override warnings only), standalone `tsc --noEmit` passed, `party-planner-check`, `party-planner-backend-check` and `early-access-check` passed, `planner-inventory-check --saved-edges` passed, `design-polish-check` passed (including legacy saved flows), full `planner-inventory-check` passed with zero page errors and curl 200, and `planner-ux-check` passed. Pre-repair copies are `tmp/planner-inventory/*.before-director-repair`; app diff vs pre-repair is 9 insertions/6 deletions in planner.tsx only; CSS and actions.ts unchanged. Evidence screenshots `edge-*.png` were opened and inspected; only test-owned loopback servers were spawned and stopped. No deps/config/db/backend change, no commit or deployment. Director final approval remains pending on these returned results.

### Product inventory planner — 2026-09-17

Implemented the requested product-ID inventory (multiple distinct drinks per category), explicit +1-pack add/repeat merge, validated optional native desktop drop, active-category/search shelf, original neutral placeholder, per-item raw quantity validation/remove/size-review state, category-removal confirmation, sticky desktop inventory and mobile subtotal/review + native drawer. Added sticky step progression and final Save/Edit/export navigation. Existing wire/snapshot shapes remain; model permits distinct same-category lines while retaining canonical arithmetic/validation; the only action change deduplicates saved categories. No migration or live backend changes.

Final Corepack production build and standalone TypeScript passed. Model/backend/early-access checks passed (backend includes old/new saves, list/retry/edit and tampered snapshots). Final production design-polish, planner-ux and new planner-inventory scripts all executed and passed with curl 200, zero page errors, native drag/foreign drop, raw invalid/bounds, mixed/sibling totals, category confirmations, keyboard/touch drawer flow, deep-scroll actions, all-line guest exports and mocked sibling save/reopen/edit. Planner-ux now calls the stronger inventory suite instead of obsolete singleton/swap tests. Existing new/edit/delete and legacy saved regressions remain in design-polish. Browser checks use only loopback plus deny-by-default fixtures; only owned servers stopped. Existing pnpm/Git warnings remain; no installs, commit or deployment.

Before copies and dirty-tree evidence: `tmp/planner-inventory/`. Old-build second-Beer baseline intentionally failed; fresh build passes. Screenshots at 1440/768/390/320, drawer/reduced-height images, PDF, trace and results: `output/playwright/planner-inventory/`. Desktop shelf, mobile shelf/final, entry/category and drawer screenshots opened and inspected. Native Tab focus trace documents a browser-chrome BODY stop, then dialog return, never an underlying page control. Details and honest intermediate-failure account: `docs/planner-inventory.md`.

Limits requiring director review: Chromium/mock-only; no real device swipe/on-screen keyboard/browser zoom test; reduced-height 320x480 is not actual keyboard evidence. Unavailable saved product and changed-size per-product handling are implemented but not injected into browser fixtures. No director approval claimed. Final `git diff --check` passed with existing line-ending warnings; `graphify extract . --code-only --no-cluster --max-workers 2` passed (268 nodes, 435 edges).

### Planner UX repair - 2026-09-17

Director final review passed on source and desktop/mobile screenshots (reported by the director; not direct director browser execution), with one narrow accessibility finding: quantity input IDs `quantity-*`, `quantity-hint-*` and `quantity-status-*` interpolated raw category names, so a category containing a space would split the `aria-describedby` ID list and break label/help linkage. Fixed in `app/party-planner/planner.tsx` by encoding a whitespace-free token (`encodeURIComponent`) for those DOM IDs and references; product/selection/data keys and visible labels were not changed. The catalogue has no multiword category, so `scripts/planner-ux-check.cjs` now validates that every generated quantity ID and `aria-describedby` reference token is whitespace-free and resolves, and that describedby text content exists. The first assertion sweep also covered unrelated dialogs and caught the pre-existing conditional `confirmation-description` reference (rendered only while that dialog is open); the assertion was rescoped to quantity inputs per the finding's scope, and the app needed no further change. Rerun after the fix: Corepack production build, standalone TypeScript, `party-planner-check`, `party-planner-backend-check`, `early-access-check`, `git diff --check` (existing line-ending warnings), `design-polish-check.cjs` and `planner-ux-check.cjs` all passed; zero page errors. Director review is recorded as passed for the scoped UX after this linkage fix.

Implemented the frozen planner-only UX contract in `app/party-planner/planner.tsx` and `planner.module.css`. Replaced the perpetual hero with a 1.45rem Party Planner identity and 1.7–2rem step headings. Initial load no longer focuses the heading; user-driven step navigation and confirmed saved edits (including same-step edits) still do. Outline suppression is scoped to the noninteractive destination heading; keyboard skip-link, checkbox and input rings remain visible.

Production baseline diagnosis was observed before editing: Chromium focused the entry H2 on mount, with computed `rgb(16, 16, 16) auto 1px` outline. Clicking eligibility moved focus to INPUT and removed that H2 outline; checkbox border and geometry did not change. It was not a duplicate checkbox border. Baseline and after desktop/mobile entry screenshots plus activeElement/outline/geometry evidence are in `output/playwright/planner-ux/before-results.json` and `after-results.json`; after entry activeElement is BODY and heading outline remains absent before/after clicking.

First product click now selects directly, leaving quantity blank. Selected product, pack ml, per-pack price, explicit pack count and line total are grouped; chosen cards retain `aria-pressed=true` and Selected text. Searches may hide the card but never the selected-item group. Replacement cards are dashed/amber and labelled Previewing replacement, retain `aria-pressed=false`, and require Confirm swap or Cancel. Original selection/quantity stay intact during preview. Quantity controls are labelled 44px minimum buttons; empty + chooses 1, minus is disabled at empty/1, plus at 1000, and both disable on nonempty invalid text. Invalid values remain verbatim with inline correction text. Changed pack sizes preserve the explicit review gate, including across further swaps, and its button focuses the quantity input through a category ref (never search). Category/product/pack counts are explicit. Budget/shortfall/completeness feedback sits near review, labels incomplete subtotals and explicitly allows valid over-budget lists. Model/catalogue/actions/session/schema and all receipt/export/saved protections are unchanged.

Verification actually executed: Corepack fallback production build (`pnpm_config_verify_deps_before_run=warn corepack.cmd pnpm build`), standalone `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/party-planner-check.cjs`, `node scripts/party-planner-backend-check.cjs`, `node scripts/early-access-check.cjs`, and `git diff --check` passed. Existing pnpm dependency/override and Git line-ending warnings remain; no install/config change. Updated `scripts/design-polish-check.cjs` to assert first-click selection and blank quantity rather than redundant confirmation; its complete production regression passed including guest exports, saved save/open/edit, same-step destination focus, Cancel/Escape, failed/busy/retry deletion. New `scripts/planner-ux-check.cjs` passed its mock-only production curl 200 and browser regression: compact steps 1–4, task controls in view at 390x844, no overflow at 1440/768/390/320, keyboard rings and checkbox Space, first-click/persistent selection, blank/+/-/typed/bounds/invalid counts, show-more/search retention, two-category whole-basket arithmetic, replacement Cancel/Confirm, changed-size invalid-count gate and quantity focus, cheapest shortfall, canonical final receipt and category removal. Zero page errors. Cached Playwright and Chromium 1228 were used via the supplied environment overrides. Only test-owned loopback servers were stopped; no live SMS/persistence writes.

Evidence: before copies and preexisting dirty-tree capture in `tmp/planner-ux/*.baseline`, `status-before.txt`, `dirty-before.diff`; incremental per-file diffs in `tmp/planner-ux/*.diff`; screenshots of entry/form/categories/selection/quantity/replacement/final at the specified widths in `output/playwright/planner-ux/`. Entry before/after, selected mobile and replacement desktop were visually inspected. Graphify refresh `graphify extract . --code-only --no-cluster --max-workers 2` passed (256 nodes, 411 edges). Limits: Chromium-only, mocked account services; real phone/cloud setup deliberately untested. No commit/deployment. No known implementation blocker; independent director/Astra review remains pending.

### Design polish convergence - 2026-09-17

Director source/visual review of app diffs and home/dialog screenshots passed with no blocking UI issue (reported by the director; not direct director browser execution). Fixed the reproducibility finding: `scripts/design-polish-check.cjs` now loads maintained `scripts/fixtures/design-polish/mock-upstream.cjs`, which requires its sibling `mock-supabase.cjs`, not temporary mocks. Synthetic credentials, in-memory persistence and deny-by-default upstream behavior are retained. Audit output remains in `tmp/design-polish/`, created recursively if absent. Existing temporary mocks remain untouched. No app/backend/config/dependency/environment changes; prior production build remains valid, so no rebuild was run.

After final fixture/script edits, `node scripts/design-polish-check.cjs` exited 0 with: `PASS: production responsive homepage/planner, local font/icons, guest export, all confirmation cancel/Escape/focus/confirm, nested edit and mocked delete failure/busy/retry; no live writes.` Overrides: `PLAYWRIGHT_MODULE=C:\Users\vritr\AppData\Local\npm-cache\_npx\31e32ef8478fbf80\node_modules\playwright`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\Users\vritr\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`. Standalone `node node_modules/typescript/bin/tsc --noEmit` passed. `git diff --check` passed with existing line-ending warnings. `graphify extract . --code-only --no-cluster --max-workers 2` passed (238 nodes, 385 edges). Fresh screenshots/results are in `output/playwright/allcheers-design-polish/`; before copies are `tmp/design-polish/*.before-convergence`. Only the test-owned server was stopped. Chromium/mock-only limitations remain; no live SMS/data writes, commit or deployment. No remaining blocker for the scoped fixture repair.

### Design polish recheck - 2026-09-17

The requested website implementation and original baseline/diff evidence were already present at this session's start. Preserved that dirty tree rather than reimplementing it. This pass changed only `scripts/design-polish-check.cjs` and the two polish documentation files, plus permitted evidence/Graphify output. Added regression coverage for cancelling an edit with a divergent draft, confirmed saved edit while already on step 3 (both dialogs close and destination focus is restored), and denied-clipboard share fallback. Added full authoritative font/license links and verified both Git blob hashes. Corrected the model-swap note: Terra, not Terraform; other agents were unchanged by that swap.

Verification executed here: `$env:pnpm_config_verify_deps_before_run='warn'; corepack.cmd pnpm build` passed (pnpm absent from PATH); `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/party-planner-check.cjs`, `node scripts/party-planner-backend-check.cjs`, `node scripts/early-access-check.cjs`, and `git diff --check` passed. Existing dependency drift/ignored overrides and Git line-ending warnings remain; nothing was installed. The first production browser attempt could not launch because cached Playwright expected missing Chromium 1243. Rerun used existing Chromium 1228 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, with cached Playwright via `PLAYWRIGHT_MODULE`; passed responsive home/planner at 1440/768/390/320, local font and icon HTTP checks, guest export, Cancel/Escape focus/state, same-step edit, mocked delete failure/busy/duplicate suppression/retry. A subsequent full-suite run passed build/types/focused checks but exposed an overly strict exact accessible-name selector in the new clipboard-fallback test. Replaced it with an explicit fallback-status wait and readonly-textarea assertion; the complete production browser regression then passed, including fallback. No application change was needed. Only its own loopback production server was stopped. No live account/SMS/data writes. Graphify code-only refresh passed: 230 nodes, 377 edges.

Evidence: original pre-polish copies/diffs remain at `tmp/design-polish/baseline/` and `tmp/design-polish/diff/`. This session's before copies are `tmp/design-polish/*.before-recheck`, incremental diffs are `tmp/design-polish/recheck-*.diff`; fresh screenshots and results are `output/playwright/allcheers-design-polish/`. Desktop/mobile home and dialog screenshots were inspected. Limits: Chromium-only automated browser coverage; real phone/cloud-save setup remains deliberately untested; director/Astra review has NOT been performed for this checkpoint. Earlier statements below are historical evidence, not checks performed by this session.

### Design polish checkpoint - 2026-09-17

With the owner-approved bounded polish applied after the Luna model restart, verification passes: production build, standalone TypeScript, focused planner/backend/early-access checks, whitespace check and the new `scripts/design-polish-check.cjs` production browser regression (own server, deny-by-default in-memory mock upstream, external requests blocked) all passed. Homepage/`/party-planner` showed no horizontal overflow at 1440/768/390/320; local Nunito Sans and icon/favicon returned 200 from loopback; hero links/anchors resolve; guest export and copy fallback work; new/edit/delete confirmations cancel via button and Escape with state and trigger focus preserved; confirmed edit closes both dialogs and focuses the new heading; mocked saved delete shows failure/busy/async/error handling with no duplicate request and a successful retry; no real auth, persistence or SMS writes. Screenshots and `results.json` are in `output/playwright/allcheers-design-polish/`; baseline/incremental diff paths are in `tmp/design-polish/`. Existing pnpm drift/override warnings persist unchanged; no install was performed to mask them. The homepage links to the working Party Planner. No commit or deployment.

- Self-hosted properly licensed Nunito Sans variable (400–800, `app/fonts/NunitoSans-variable.ttf` + `OFL.txt` from google/fonts `ofl/nunitosans`; git hash-object verified against the API listing; via `next/font/local` swap with Arial fallback; body/controls inherit; no runtime external fonts).
- Tracking retuned (headings `-.055em`→`-.035em`, logo `-.07em`→`-.045em`); legibility confirmed in the four-width screenshots.
- Homepage keeps the emotional hero; concise lede replaces redundant copy; working-planner CTA first with honest future finder; helper explains guest print/share; list preview says "Print or share your list"; header prioritises the planner with early access retained below.
- All three `window.confirm` uses replaced by one small branded native `<dialog>` (branded copy, Cancel initial focus, Escape cancel via `cancel` event, native focus containment, trigger focus restored on cancel). Saved-plans dialog stays open on cancel; confirmed edit closes both and focuses the new heading; delete preserves busy/error/async semantics with no mutation before confirmation and no duplicate on repeated clicks; `autoFocus` may add a redundant `autofocus` attribute during hydration but did not break native focus in browser checks.
- New original favicon: `app/icon.svg` + `public/favicon.ico` (16/32/48 frames; no new dependency; served 200 in browser checks).
- Withdrawn contrast criticism not acted on; palette, reduced-motion behaviour and layout patterns preserved.

Evidence: baseline copies (`tmp/design-polish/baseline/`, suffixed `.baseline` so they are not compiler inputs), per-file incremental diffs (`tmp/design-polish/diff/`), production browser regression (`scripts/design-polish-check.cjs`, results/screenshots in `output/playwright/allcheers-design-polish/`, mock audit in `tmp/design-polish/mock-audit.json`, server log in `tmp/design-polish/production-server.log`). License provenance: Nunito Sans variable TTF and OFL.txt downloaded from google/fonts `ofl/nunitosans` main; git hash-object pins `ccc85657…`/`2ae17359…` match the GitHub API listing; OFL verified complete (correct header, closing section, 4393 bytes). Untouched: backend actions/session/model/catalogue, form fields/validation/consent, db/env/secrets, package/lock/config/agent files, noindex, existing images.

Limits: Chromium-only browser coverage and mocked account persistence; real phone/SMS/cloud-save behavior remains untested. The graphify code-only refresh passed (230 nodes, 377 edges).

### Luna executor model swap - 2026-09-17

The retired `nvidia/minimaxai/minimax-m3` model could not start, blocking the Luna executor. With explicit owner authorization, the single `model:` line in `.opencode/agents/luna-implementer.md` was replaced with `openrouter/stealth/union-alpha` (registered via the 2026-09-17 OpenRouter configuration below); no other agent content, permissions, credentials or configuration files were changed. `git diff --check` passed and the scoped diff confirmed the exact one-line replacement; `opencode models openrouter` confirmed `openrouter/stealth/union-alpha` remains registered. Because OpenCode loads configuration at startup, that running session kept the old Luna model until restart. This checkpoint changed Luna only: Terra (not Terraform) and all other agents were unchanged by the model swap. Website polish is tracked separately above. Configuration-only change; no build required.

### OpenCode OpenRouter model connection - 2026-09-17

Added `stealth/union-alpha` to the project OpenCode provider configuration so it appears as `openrouter/stealth/union-alpha` in the model picker and can accept image attachments. The existing OpenRouter credential remains in OpenCode auth storage; no API key was added to the repository. `opencode models openrouter` listed the model, the credential store reported OpenRouter authentication, and `opencode run --model openrouter/stealth/union-alpha` returned the expected `ROUTED` response.

## Reset checkpoint — 2026-09-10

The previous EkQuarter creative frontend and its supporting content, routes, assets, sitemap, theme configuration, and flowchart were removed. The root app now contains a neutral, accessible AllCheers placeholder with no forms, animation, analytics, external fonts, or design commitments.

`app/early-access/actions.ts` remains byte-identical and disconnected so its validation, consent, and Supabase insert-only behavior are available for a future rebuild. The isolated recovery archive is `.recovery/before-allcheers-reset-20260910-001516.zip`; it is excluded from active source and design references.

## Future work

### Party Planner Supabase activation checkpoint - 2026-09-17

Connected Supabase tools restored access to the existing EkQuarter project (`ojptrukzildmkilwponx`); no credentials were exposed or edited. Initial database operations timed out while the paused project resumed, then succeeded. The reviewed additive `party_plans` migration was applied verbatim and recorded as `20260917033539`; verification confirmed the table with row level security enabled, exactly four owner-scoped authenticated policies (`auth.uid() = user_id`), an active `updated_at` trigger, and no `anon` grants. Security advisors returned only three pre-existing WARN findings (the `quiz_throttle_count` SECURITY DEFINER function and disabled leaked-password protection); none originate from `party_plans`. Existing tables, waitlist data and all prior migrations are unchanged; no user-data writes were performed.

The full local check suite re-passed: `node scripts/party-planner-check.cjs`, `node scripts/party-planner-backend-check.cjs`, `node scripts/early-access-check.cjs`, production build, standalone TypeScript and whitespace checks. A stale generated `.next/types/validator.ts` referencing the removed pre-reset `app/api/chat` route caused a transient standalone-TypeScript failure; the fresh production build regenerated the validator cleanly and standalone TypeScript passed with no manual edits and no source changes. Existing pnpm dependency-drift/ignored-override warnings remain. Graphify code-only refresh passed (208 nodes, 342 edges).

Remaining owner steps before durable saves are live: enable/configure phone OTP and its SMS provider in the existing project's Auth settings, then perform one owner-operated login and save/reopen on the connected deployment. No real SMS was sent and no live user data was written. No homepage launch link, commit or deployment.

Workflow exception: Terra and Luna executor models were unavailable during this checkpoint, so the director performed the bounded documentation edits directly. A separate sol-reviewer independently verified the live database state and passed the checkpoint.

### Party Planner local implementation and review - 2026-09-15

Implemented `/party-planner` with regional eligibility, four steps, 507 supplied catalogue products, strict manual quantities/INR validation, category search, preserved selections, whole-basket swap previews, pack-size quantity review, minimum-price shortfalls, canonical server review and labelled over-budget lists. Native print/share/copy work before sign-in. Mobile OTP/server cookies and owner-scoped snapshot CRUD are implemented with idempotent new-save retries and stale-update detection. Existing homepage/backend/data/environment/dependencies are preserved; no homepage launch link, migration, SMS, commit or deployment.

Workflow exception disclosed to the owner: Luna's first UI delivery failed review; the same executor hit its usage limit on repair cycle 1. After the owner said continue, Astra completed the bounded UI repairs. Backend repair stayed with its original Luna executor. Astra performed source/production-browser review; no separate agent reviewed Astra's repairs.

Final production build, standalone TypeScript, focused model/backend checks, existing mocked early-access regression and whitespace checks passed after all refinements. Production browser checks passed at 1440/768/390/320px, including no overflow, decimal budgets, search retention, swap arithmetic, pack-size guard, canonical final list, aborted-request recovery and copy fallback. The final build's minimum-price shortfall, quantity-review button, planner title and 320px product flow were rechecked successfully. Isolated mock-upstream production checks passed OTP, save/open, edit/reprice, reload, delete and signout with no live SMS/data writes. Printed saved snapshot is a single-page PDF with correct numbers and no application controls. Artifacts are in `output/playwright/allcheers-planner/`.

Final Graphify refresh passed (208 nodes, 342 edges). All 12 protected file hashes and the workbook hash match the implementation baseline. Homepage, planner and robots HTTP checks returned 200; the initial planner HTML does not expose catalogue products before eligibility. Existing dependency-drift/ignored-override warnings and missing favicon remain. The mock-upstream server was stopped; the production preview is available at `http://127.0.0.1:3100/party-planner`. The live Supabase hostname still returns ENOTFOUND on recheck; activation steps and verification limits are recorded in `docs/allcheers-party-planner-implementation.md`. This is local implementation evidence, not a public-launch or live persistence completion claim.

### Party Planner calculation and database-rule checkpoint - 2026-09-14

Luna implemented the isolated calculation core and focused assertion check. Core checks and existing mocked early-access regression passed; initial standalone TypeScript passed before UI integration. Root reviewed the arithmetic contract and requested the exact list exclusions/price wording. UI/auth work remains in progress.

The additive party_plans migration passed execution against a new isolated PostgreSQL 17 cluster under `tmp/planner/`, bound only to localhost port 55434. Root's `tmp/planner/rls-check.sql` verified owner access, cross-user read/update/delete isolation, rejection of forged-owner insert, anonymous denial and stale timestamp rejection. This is local migration/RLS evidence, not live Supabase verification. Preservation hashes confirm all 12 baseline marketing/backend/config/environment files unchanged. No Supabase migration or SMS sent. Integrated build/browser verification remains pending.

### Party Planner implementation scope and catalogue checkpoint - 2026-09-14

Owner authorized implementation and explicitly chose host-entered quantities (no serving recommendation), mobile OTP saves, and regional eligibility confirmation. Scope, minimal catalogue audit and staged acceptance are in `docs/allcheers-party-planner-implementation.md`. The read-only workbook audit confirms 507 unique Jaipur products across ten categories with positive numeric prices/sizes; current prices, stock, price dates and content rights remain unverified. A minimal JSON projection excludes descriptions, ratings and images, preserving the source workbook.

Two Luna executors own disjoint core/UI and authentication/persistence files; root owns documentation, catalogue and review. Marketing and existing early-access surfaces are frozen. Supabase auth settings could not be read because the configured hostname returned ENOTFOUND; live phone-provider/database setup remains unverified. Implementation is in progress, not complete. No migration applied, SMS sent, commit or deployment.

### Party Planner competitor-informed plan review - 2026-09-14

At the owner's request, reviewed public LivCheers planner/product pages, Omni's Party Drink Calculator and Cocktailhire's planner. Sources, observed strengths, research limits and proposed AllCheers improvements are recorded in `docs/allcheers-party-planner-competitor-review.md`. The in-app browser was unavailable, so later LivCheers interactions were not verified; Total Wine was excluded after access/form-load failures.

Revised `docs/allcheers-party-planner-plan.md` with budget/swap previews, category-local search, quantity explanations, guest-first export, native print output and acceptance criteria. Changed the recommendation from blocking all over-budget saves to allowing fully priced plans with explicit shortfalls. These remain proposals; quantity, eligibility, catalogue and account decisions are unresolved. Documentation only: marketing, backend, data, dependencies and assets untouched; no implementation, commit or deployment. Whitespace verification passed; build/UI checks and code-graph refresh are not applicable to this research checkpoint.

### Functional Party Planner planning checkpoint - 2026-09-14

Reviewed AGENTS.md, this progress log, the AllCheers brief, current marketing homepage, preserved early-access action and retained handbook renders (including full-size page 7). The original handbook PDF is missing from its recorded path; the plan distinguishes direct page-render review from the brief's prior full-document review. No fresh catalogue audit was performed.

Proposed MVP scope, the four-step journey, measurable acceptance criteria, unresolved launch decisions and staged delivery are recorded in `docs/allcheers-party-planner-plan.md`. Quantity/allocation rules, eligibility, catalogue trust and authentication/persistence remain explicit launch decisions. One editable pack per category remains an internal-prototype allowance only. The proposal preserves the marketing site, existing backend/data and source materials; future additive backend work requires separate approval. No implementation, commit or deployment. Documentation-only whitespace verification passed; build and UI runtime checks are not applicable, and no code-graph refresh is needed for this planning-only checkpoint.

### Party hero and motion refinement - 2026-09-14

At the owner's request, replaced the seated social hero with a new imagined Jaipur-inspired night party: dancing adults, raised drinks and disco lighting. Built-in ImageGen created `public/images/allcheers-party-hero-v2.png`; the original remains preserved. The generation prompt and provenance are in `docs/allcheers-assets.md`.

Luna implemented the bounded page/CSS change; Astra reviewed source and desktop/mobile production screenshots. Added a 500ms staggered hero-copy entrance, one 4-second image settle, subtle drink-image hover zoom and button lift, entirely in CSS. All animation and transitions are gated by `prefers-reduced-motion: no-preference`; reduced-motion content stays fully visible and static. No dependencies, form/backend changes or new functionality.

Production build, standalone TypeScript and whitespace checks passed. Production browser checks confirmed the new hero loads, no overflow at 390/320px, finite single-run animations, and all animated targets static and opaque under reduced motion. Desktop/mobile crops passed visual review; screenshots are `output/playwright/allcheers-phase1/party-v2-desktop.png` and `party-v2-mobile.png`. Existing pnpm drift/override warnings and missing favicon remain. Graphify code-only refresh passed. The test server was stopped; no commit or deployment.

### Phase 1 implementation and verification - 2026-09-14

Implemented the approved marketing direction as responsive HTML/CSS: contrasted cream header, party hero, equal drink cards, a four-step planner and generic list, Jaipur launch band, early access, FAQ, responsible-use and privacy information. Finder/planner remain honest future-feature explanations; non-alcoholic catalogue coverage is explicitly still in development. The signup uses the byte-identical existing action, explicit Jaipur selection and consent, accessible feedback, retained values on validation/network errors and a disabled pending button. The automatic React form reset is prevented so checkbox selections survive a failed submission. There are no new dependencies, app backend, analytics, account flows or live catalogue claims. Search indexing remains disabled.

Luna delivered the first implementation/build. Astra's browser review rejected its layout and form recovery; the same executor was sent the repair contract but hit its usage limit. After telling the owner, Astra took over the bounded repairs rather than silently substituting another worker. Final source and visual review passed. This workflow exception is recorded explicitly; there was no separate reviewer agent for Astra's repairs.

Final production build (`pnpm_config_verify_deps_before_run=warn corepack.cmd pnpm build`), separate `node node_modules/typescript/bin/tsc --noEmit`, and `node scripts/early-access-check.cjs` passed. The runnable check mocks fetch and verifies validation, consent, honeypot, insert-only payload, 201 success, 409 duplicate, server error and network failure without using real credentials or making network requests. Existing pnpm dependency-drift and ignored-override warnings remain.

Production Playwright review passed at 1440, 768, 390 and 320px with no horizontal overflow or broken section anchors. Images loaded through Next's responsive image endpoint. Keyboard skip link/focus, mobile menu and FAQ were exercised. Browser checks verified required email/Jaipur/consent, server validation retaining every field, aborted-network recovery retaining every field, pending disabled state, honeypot success and mocked duplicate feedback. No live Supabase insertion was performed. Homepage/robots/new hero returned 200; retired early-access route and old hero returned 404. No application page errors were seen on clean load. The pre-existing missing favicon returns 404; viewport switching can produce an unused-image-preload warning, and the deliberate network-abort test logs an expected request error.

Final screenshots: `output/playwright/allcheers-phase1/desktop-1440.png`, `mobile-390.png` and `mobile-320.png`. Graphify code-only refresh passed (108 nodes, 116 edges), as did `git diff --check`. The generated hero and stock provenance/prompt are recorded in `docs/allcheers-assets.md`. Pinterest references, product data, mockup originals, recovery archive and legacy material were preserved. Backend, package/lock/config, environment and recovery hashes match the turn-start baseline. No commit or deployment. The production test server was stopped after verification.

### Phase 1 scope and asset checkpoint - 2026-09-14

The owner approved implementation from `output/allcheers-v2-party/home-desktop.png` and `home-mobile-refined.png`. Scope is frozen to one responsive marketing homepage with honest finder/planner previews, a generic planning list, Jaipur launch context, FAQ/responsible-use/privacy information and an early-access form reusing the unchanged server action. Acceptance includes desktop/mobile composition, keyboard access, visible consent and Jaipur selection, recoverable form states, independent-store purchasing language, production build, standalone TypeScript and production browser smoke. No app backend, account flow, analytics or live catalogue is included.

Astra inspected the instructions, brief, approved mockups, source and photo shortlist; Luna is the sole implementation/build executor. Built-in ImageGen produced a standalone imagined party hero (visually inspected); the three recommended stock photos were copied unchanged into `public/images/`. Asset provenance and the final generation prompt are in `docs/allcheers-assets.md`. Pinterest remains reference-only. Backend/config/environment/recovery hashes were captured for final preservation review. Implementation and verification are in progress; this is not a completion claim.

### Workspace readiness cleanup - 2026-09-14

Confirmed the old frontend source and public assets were already removed by the reset. Removed only the remaining empty `components/ui`, `components`, `lib`, `public/images`, and `public` directories, after resolving their workspace paths and checking emptiness. README now points to the approved desktop/mobile party mockups, Phase 1 brief and photo research. Backend, environment files, dependencies, recovery archive, product data, tool configuration and output references were preserved. Existing uncommitted reset changes were left intact.

Verification passed: production build using Corepack/pnpm, standalone TypeScript, production HTTP smoke (homepage 200 with placeholder text; retired early-access route and hero asset 404), and Graphify code-only refresh (94 nodes, 90 edges). Build retains existing dependency-drift and ignored-override warnings. Root review confirmed the bounded cleanup and accurate README; whitespace check passed. The temporary production server was stopped. Ready for the marketing frontend implementation; final hero selection and Pinterest reuse clearance remain asset decisions. No commit or deployment.

### Pinterest image review - 2026-09-13

At the owner's request, researched Pinterest and visually inspected eight downloaded previews. `output/photo-shortlist/pinterest-references/index.html` ranks the spritz close-up and warm gold party detail highest, records two secondary styling references and four rejected images. Metadata preserves pin URLs; the gold detail links to Disco Cubes on Instagram and the terracotta campaign was traced to Moriah Sawtelle's original portfolio. No commercial reuse clearance was obtained; these are research previews, not production assets. The evening Jaipur party hero remains unresolved. All eight JPEGs decoded and gallery file references exist. No application/backend changes; build and runtime checks are not applicable to this research-only checkpoint.

### Stock photo shortlist - 2026-09-13

The owner accepted the mockup direction and requested reusable web-sourced photography. Six candidates were downloaded and visually reviewed in `output/photo-shortlist/`; `index.html` presents them, and `manifest.json`/`README.md` record sources, photographers, licenses and limitations. Recommended section photos: amber cocktail, berry mocktail and Jaipur/Jal Mahal. The party toast is an alternate; the posed group photo is rejected as final hero. A stock image matching the evening Jaipur party hero has not yet been selected. Pexels and Unsplash license pages were checked, without asserting unverified model releases or endorsement. All six JPEGs decoded successfully; documentation whitespace check passed. No application/backend changes or build required for this asset-shortlisting checkpoint.

### Party visual direction checkpoint - 2026-09-11

The owner authorized using `output/` mockups as references and requested stronger alcoholic/non-alcoholic party expression. Reviewed all eight earlier design PNGs and researched Jimmy's, Seedlip and Ghia; sources and qualitative design conclusions are recorded in `output/allcheers-v2-party/research-and-direction.md`. Built-in ImageGen produced `home-desktop.png` and the selected single-column `home-mobile-refined.png`; exact prompts are alongside them. The earlier `home-mobile.png` is an intermediate tablet-like layout, superseded by the refined mobile concept.

Visual review confirmed prominent drinks, evening party context, equal cocktail/non-alcoholic imagery, early-access messaging and readable principal copy. Mobile was refined to stack drink cards and move the list below its steps. These are raster design proposals, not implemented or approved pages. Production design must use a consistently contrasted header and replace the desktop's illustrative ingredient list with the generic planning preview used on mobile; no verified ingredient catalogue is implied. Existing non-alcoholic catalogue gaps remain distinct from the inclusive marketing direction. Documentation/artifact checks passed; no application source, backend, credentials or dependencies changed, so no build/UI runtime checks were rerun.

Phase 1 scope confirmed by the owner: build the public marketing website first. The handbook supplies context for the two future product journeys; functional app work and dedicated support remain later phases. `docs/allcheers-brief.md` now records this boundary and a focused homepage/early-access proposal. Fresh visual direction is the next planning step. This documentation-only checkpoint passed `git diff --check`; no source changes or build/UI checks were needed.

Fresh planning starts in `docs/allcheers-brief.md`. On 2026-09-10, the full 12-page AllCheers Developer Handbook v1.0 supplied by the owner was reviewed, including visual inspection of its scope, planner and design tables. The brief now records the product purpose, Find My Drink and Plan My Party journeys, Jaipur launch, purchasing boundary, source design specifications, and proposed versus confirmed requirements with page references. Product purpose and visitor actions are resolved. The handbook describes a functional app and an earlier design approval; the current marketing-only scope and subsequent clean-reset instruction remain distinguished pending the next scope/design decision. Documentation only changed; no app or backend implementation was started. Whitespace verification passed; build and UI checks were not rerun for this documentation-only checkpoint.

1. Approve the AllCheers product brief and public information architecture.
2. Approve a visual direction and content before implementation.
3. Rebuild the public page and any routes deliberately from that brief.
4. Reconnect early access using the preserved validation, consent, and insert-only contract.
5. Add SEO, analytics, and assets only when their requirements are explicit; app and support remain future phases.

## Verification

The reset checkpoint was verified on 2026-09-10: `pnpm_config_verify_deps_before_run=warn corepack.cmd pnpm build` exited 0 and produced `.next/BUILD_ID`; `node node_modules/typescript/bin/tsc --noEmit` exited 0; and `git diff --check` exited 0. The build reported only existing pnpm dependency/lockfile and ignored override warnings. Production/dev browser smoke and Graphify refresh are handled separately.

Final Astra review passed. Production startup and HTTP checks passed: homepage 200 with neutral content and noindex, robots disallow, and 13 retired routes/assets returning 404. Browser review passed at 1440x900 in development and 320x568 in production; mobile had no horizontal overflow. Screenshots are in `output/playwright/`. The browser's automatic favicon request returns 404 because the old icon was removed; development logs the unchanged report-only CSP notices. No application runtime error was observed. Standalone TypeScript passed again after dev startup. Graphify code-only refresh passed (94 nodes, 90 edges).

The backend action, package manifest, lockfile, and Next/PostCSS/TypeScript configs match the recovery archive. Credentials and Supabase were not modified or exercised. Product data (the workbook and 507 images) and unapproved mockups remain stored separately and are not design references. No commit, push, or deployment was performed.

### Party Planner UX refinement - 2026-09-19

Implemented Option B redesign: merged the "Categories" and "Choose drinks" steps into one browse-and-build step (3 steps total), added card-level quantity steppers, a single budget meter, issue chips replacing completeness prose, an undo toast for category removal, auto-deselect of empty categories at review, and increased catalogue page size to 24. Files changed: app/party-planner/planner.tsx and app/party-planner/planner.module.css.

Verification: `node node_modules/typescript/bin/tsc --noEmit` passed, `corepack pnpm build` passed (with `pnpm_config_verify_deps_before_run=warn`), `git diff --check` clean aside from pre-existing line-ending warnings.

### Party Planner step 2 modernization - 2026-09-19

Rebuilt step 2 of `planner.tsx` + `planner.module.css` around a sticky command bar (`.controls`, top 8px, z-index 2): budget meter restructured to a single row (track bar + inline Budget/remaining-over/per-guest figures), a horizontally scrolling category strip (`.categoryStrip`) with three distinct tab states (unselected / selected / `.categoryTabSelected` / browsing `.categoryTabActive` - fixing the previously indistinguishable selected-inactive state) and inline from-prices, and a compact filter row (search with aria-label + "Filters (n)" dialog trigger with aria-haspopup/aria-expanded + inline clear) that stays visible while the grid scrolls. Brand, pack-size and within-budget facets moved behind a native Filters `<dialog>` (`.filterPanel`; Escape/x/Done close, trigger focus restore, live grid updates behind it). Shelf grid is 3 columns on desktop with compact cards (12px padding, 80px artwork, shortened Add label with full aria-label); 2 columns on mobile >=381px, 1 at <=380px. All Option B behavior preserved: toggleCategory select/activate/deselect-with-undo, undo toast, card steppers, review guard + empty-category auto-deselect, 24-page pagination. Only planner.tsx and planner.module.css changed; model/actions/session/catalogue, other steps and all flows untouched.

Verification executed: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `='warn'; corepack pnpm build` compiled successfully with /party-planner static (existing pnpm drift/override warnings only); production smoke `Invoke-WebRequest http://localhost:3123/party-planner` returned 200 with the shell rendering (step 2 markup is client-side only after the eligibility gate, by design); `git diff --check` clean apart from pre-existing line-ending warnings. Limits: no interactive browser pass in this checkpoint; scripts/*.cjs suites assert the older UI (already outdated after the Option B checkpoint) and were not run.

### Party Planner one-page planner - 2026-09-19

Phase 1 of the approved two-phase redesign. Wizard killed in planner.tsx: stepper nav, steps array, all "Step N of 3" eyebrows and the build-surface Back button removed; flow is now step 0 = eligibility gate, step 1 = build surface, step 2 = receipt rendered on the same page (Edit list returns to the surface). New guests-&-budget .basicsPanel dialog opened from the meter's "Edit" pill (inputs + presets moved verbatim, hints only when invalid), auto-opening exactly once on arrival with unset basics via a basicsPrompted flag that suppresses all later auto-prompts. Desktop sticky inventory aside deleted; replaced by a floating plum .cartPill (bottom-right, Your list · N items · ?subtotal, display:none <=900px) that is also the drag-drop zone and opens the .inventoryDrawer dialog restyled as a right-anchored slide-over (>=901px; mobile bottom sheet unchanged); drop handlers are shared by pill and dialog. Ten hand-authored per-category SVGs added under public/images/drinks/ with a categoryArt map + placeholder fallback, used on cards, inventory lines and receipt thumbnails. Product grid switched to auto-fill, minmax(210px, 1fr) with all breakpoint overrides removed. toggleCategory/removeCategory/undo-removal/showToast/reviewList, card steppers, filters dialog, OTP, print styles, affordability rule and all a11y patterns preserved; model/actions/session/catalogue untouched.

Verification executed (Sol review + checks): standalone TypeScript exit 0; $env:pnpm_config_verify_deps_before_run='warn'; corepack pnpm build compiled successfully with /party-planner static; production smoke returned 200 for /party-planner and two spot-checked category SVGs; git diff --check clean apart from pre-existing line-ending warnings. Line-by-line diff review confirmed all move call-sites retargeted, conditional hint wiring, shared drop zones, art map fallback, and removed .stepper/.inventoryPanel CSS. Limits: no interactive browser pass; scripts/*.cjs suites assert the older UI and were not run.

### Party Planner polish pass - 2026-09-19

Phase 2 of the approved redesign, on top of the one-page structure. Copy diet: always-visible "1–1,000 whole packs" hint lines deleted from card steppers and inventory lines (aria-describedby cleaned); invalid values show short corrective text only. Inventory lines are now lean readouts (N packs × ?price = ?total / "Set the quantity on the card") with cards as the only editable steppers; the pack-size review gate focuses and scroll-into-views the card input. Naming unified to "Your list" across drawer, mobile bar, receipt, confirmation eyebrow and share title (model.ts/planText untouched). additionStatus renders empty by default with the live region and min-height retained. localStorage auto-draft added (allcheers_planner_draft): mount-only restore validates every field (digits guests <=1000, parseBudget budget, non-empty string categories, inventory item shape with positive finite size/price, string quantities, boolean needsReview) and discards + removes the key on failure; the persist effect is declared after restore and guarded by a hydrated STATE flag so the empty-default mount run can never wipe a stored draft; gate button reads "Continue your list" when a draft was restored; confirmed start-new clears via the persist path. Category chips and the Showing line now show honest ?min–?max ranges (single price when equal). Empty shelf shows "Start with a category:" with one-tap chips for the three largest categories. A "Set guests & budget" chip prepends the issue-chip row when basics are unset and opens the basics dialog. Receipt thumbnails sit inline beside a text column via flex rules.

Verification executed (Sol review + checks): standalone TypeScript exit 0; Corepack production build compiled successfully with /party-planner static; production smoke returned 200 with the shell rendering; git diff --check clean apart from pre-existing line-ending warnings. Line-by-line diff review confirmed the hydration/persist ordering, lean-line readouts, range chips, quick-start chips, basics chip and receipt thumbnail restructure. Known minor cosmetic edge: an inventory line for a product genuinely absent from the catalogue can read "N packs × ?price = ?0.00" beside its own unavailable alert; no repair cycle opened for it. Limits: no interactive browser pass; scripts/*.cjs suites assert the older UI and were not run.

### Find My Drink planning checkpoint - 2026-09-19

Planned the Find My Drink feature (handbook Journey 1) at the owner's request. A fresh read-only workbook audit (original untouched, copy extracted to temp) confirmed the data reality: 507 Jaipur products, 10 categories / 45 subcategories, price INR 99-263,300, tasting_notes 95% filled (free prose), description 96%, rating 100% (2.3-5.0), review_count ~55%, botanicals 13%, body_type 2%; no structured taste tags, no occasion column, no ABV column; product images point at the livcheers.com competitor CDN with unverified rights. Plan recorded in `docs/allcheers-find-my-drink-plan.md`: product shape from the handbook, data implications (derived taste tags labelled per the inferred/verified distinction, occasion mapping or de-scoping, review counts only where present, no strength claims), proposed architecture (server-component eligibility check reusing the existing cookie, build-time keyword-dictionary tag extraction with no runtime NLP dependency, a `rankProducts` server action with server-side validation/scoring/reasons, UI reusing the planner's command-bar/a11y patterns, localStorage shortlist save in MVP, homepage flip + planner-section content refresh), four delivery stages (data, backend, UI, homepage) and acceptance criteria. Five owner decisions remain unresolved: occasion handling, tag-extraction approach, image rights, save mechanism, ranking defaults. Planning only: no app/backend/data/dependency changes, no implementation, commit or deployment.

### Find My Drink implementation - 2026-09-19

Implemented the approved Find My Drink feature across all four planned stages. Stage A (data + backend): dependency-free xlsx extraction script (`scripts/extract-taste-tags.cjs`, handles namespaced XML + inline strings, strength guard excludes strength-implying keywords per the handbook) emits `app/find-my-drink/drinks.json` — 507 products, 99.8% tagged, 21-tag vocabulary, reviewCount null for blanks (never zero); finder `model.ts` (types, 5-occasion category map, server-grade input validation, `rankDrinks` scoring with documented tunable weights TASTE_WEIGHT 10 / RATING_WEIGHT 4 / REVIEW_BONUS_CAP 10 and score-desc/rating/review/nulls-last/name sort); `actions.ts` (`getFinder` vocabulary + `rankProducts` with server-side validation and ranking, both gated on the existing eligibility cookie; planner files byte-identical). Stage B (UI): `/find-my-drink` server component renders the gate only when not already eligible (router.refresh after confirm); finder has occasion chips with labelled category suggestions, top-18 taste strip, category chips + "Help me choose", debounced max-price input + presets, people context, live server-ranked match cards (category art, matched taste tags, rating + review counts only where present, Save/Saved toggle, no score shown), no-match panel with three one-tap filter edits, honest provenance disclaimer, hydration-safe localStorage shortlist with floating pill + right slide-over/bottom sheet. Stage C (homepage): five live /find-my-drink links, "coming soon" removed, "Now live in Jaipur" section with CTA + honest provenance fine-print, planner section now three beats matching the built one-page planner, FAQ updated for both live features.

Verification executed (Sol review + checks at every stage): extraction script exit 0 with 507 rows and vocabulary summary; standalone TypeScript exit 0; Corepack production build compiled successfully (/find-my-drink dynamic server-rendered, /party-planner static); production smoke returned 200 for /find-my-drink (gate renders unauthenticated) and homepage (live links, no coming soon); `git diff --check` clean apart from pre-existing line-ending warnings. Line-by-line review confirmed the hydration/persist ordering, explicit-value re-rank, labelled suggestions, no-match edits, honest copy, and byte-identical planner. Known limits: no interactive browser pass; weights are tunable defaults; legacy scripts/*.cjs suites assert the older planner UI and were not run. No dependencies, installs, commit or deployment beyond the earlier owner-requested push.

### Premium homepage redesign - 2026-09-21

Rebuilt the homepage in `app/page.tsx` with a responsive editorial layout: split hero, benefit strip, live finder and planner journeys, illustrative shopping list, Jaipur rooftop story band, preserved EarlyAccessForm, honest FAQ/privacy/responsible-use copy, native mobile menu, semantic navigation and accessible headings. Added scoped `app/home.module.css` with ivory/plum/apricot tokens, local font inheritance, Georgia display type, responsive 320px+ layouts, 44px mobile controls and reduced-motion-safe CSS. Converted the three owner-supplied images to 1600px WebP derivatives in `public/images/updated/`; source assets untouched.

Verification: `corepack pnpm build` passed (Next 16.3.0; existing dependency/override warnings only), `node node_modules/typescript/bin/tsc --noEmit` passed, and `git diff --check` passed with existing line-ending warnings. Pending: director visual responsive review; no browser run by builder.

Responsive repair verification: after fresh production build, `scripts/home-design-check.cjs` with the documented Playwright environment and localhost:3125 preview passed at 1440, 1024, 768, 390 and 320px, including images, anchors, FAQ, signup validation and mobile menu. Fixed tablet hero overflow and widened finder image crop; production preview remains running on localhost:3125 for director review.

Final responsive cleanup verification: formatted and consolidated homepage CSS, removed the hero overflow mask, retained min-width guards, and rebuilt. `node scripts/home-design-check.cjs` with the existing Playwright environment passed all five widths plus keyboard skip link, product routes, zero page errors, reduced-motion checks, and no external requests/form writes. Preview remains on localhost:3125.

Director final review passed: source and rendered desktop/tablet/mobile screenshots reviewed, including 320px. The original 1024px overflow was caught by the new regression check and corrected before acceptance. Production build and standalone TypeScript passed after final CSS cleanup; the director also ran the mocked early-access regression successfully and refreshed Graphify (360 nodes, 634 edges). Signup action/form, global styles and product UI hashes match the session baseline. Evidence: `output/playwright/home-redesign/home-{1440,1024,768,390,320}.png`. Scope is the marketing homepage; existing finder/planner flows were preserved, with route smoke checks rather than a full product regression. Chromium only; no live signup, commit or deployment. Existing pnpm drift/override warnings remain.

### Owner decisions D3 + D4 — 2026-10-12

Owner approved D4 (new insert-only `public.table_requests` table + consent `table-request-v2`) and D3 (set Phase 0 exit targets before launch; working targets are the plan's example, ≥ 30 requests/week and ≥ 3 venues willing to use a dashboard, plus 5–10 user/venue interviews, until the owner states other numbers). D2 (hero CTA: "Request a table" vs waitlist only) is still open. Drafted `supabase/migrations/20261012_table_requests.sql` for owner review; it has **not** been applied, and no database, app or dependency changes were made.
D2 decided 2026-10-12: Phase 0 hero CTA stays **waitlist only** (no partner clubs yet). "Book tickets" (working title) is a Phase 1 TODO in the plan.
D4 reversed 2026-10-12 (owner): the waitlist is only for launch updates, so no extra fields and no migration in Phase 0. The draft `table_requests` migration was deleted unapplied; B4 is deferred. No database changes were made.

### "For venues" contact band — 2026-10-12

Added a "Run a club in Jaipur? Partner with us" band (`#for-venues`) to `app/page.tsx` after the booking section, with a mailto button to `partners@socifer.com` and a footer "For venues" link; styles in `app/home.module.css`. The WhatsApp button only appears once the `PARTNER_WHATSAPP` placeholder constant is filled in (it is empty for now). No backend or database changes. Verified: standalone TypeScript passed, Corepack `pnpm build` passed, production smoke (`next start`) returned 200 with the band, mailto link and footer anchor present and no WhatsApp link. No visual or browser screenshot review yet.
Hero lead copy changed (2026-10-12) from the booking-flow promise to "We're not taking bookings yet. Join the launch list and we'll tell you as soon as they open." TypeScript, build and production smoke passed (new copy present, old copy gone).
"How booking will work" reworded (2026-10-12) to the Phase 1 ticket flow: Pick a night → Choose tickets → Pay → Get your pass, labelled "Coming soon" with "details may change". TypeScript, build and production smoke passed.

### Owner decision D6 + B3 scope — 2026-10-12

D6 approved: neon magenta `#FF3EA5` replaces burnt red `#b73720`; dark landing, light tool surfaces; to be reviewed visually after B3. B3 (booking-first landing redesign) is to be done in one go, in a fresh session, using the new hero files already in `public/images/nightlife/hero-night-*`. D2 stays waitlist-only (no "Request a table"); B4 is deferred.

### B3 booking-first landing redesign ("Jaipur After Dark") — 2026-10-12

Rebuilt `app/page.tsx` + `app/home.module.css` per plan sections 0–10 and 4a: sticky dark header (How it works · For venues · Plan a party · Find a drink + "Get launch updates"), full-bleed hero with the new graded `hero-night-*` photo via `<picture>` (portrait AVIF/WebP ≤700px, desktop AVIF/WebP above; fetchPriority high), script eyebrow "Jaipur, after dark", H1 "BOOK THE NIGHT.", honest "not taking bookings yet" lead and waitlist-only CTA (D2), why-Socifer value props in future tense, "How booking will work" (Phase 1 ticket flow, "details may change"), existing For venues band (`partners@socifer.com`), decorative `aria-hidden` "Jaipur nights" divider, Party Planner / Find My Drink cards (copy kept truthful: Find My Drink still browses recipes until B6), waitlist panel beside its explanation (EarlyAccessForm unchanged, restyled by CSS only), expanded FAQ (who confirms, pricing TBD, age/responsible use), privacy, footer with responsible-use line and the new Wendy Wei/Pexels credit. Upcoming nights (section 6) and venue photos/names stay hidden: no real data or signed venues. D6 tokens applied (`--night #0E0B10`, `--neon #FF3EA5`, etc.); tool pages keep their light surface and are unchanged. New: `app/mobile-menu.tsx` (client; closes on link tap/Esc, returns focus), self-hosted Damion script face (Latin subset, 19 KB woff2, OFL in `app/fonts/OFL-Damion.txt`) wired in `app/layout.tsx` (D14). One test fix: `scripts/home-design-check.cjs` now waits for lazy images to load before decoding. No backend, action, database, dependency or lockfile changes; `club-crowd.jpg`/`cocktail.jpg` still used by the tool cards.

Verification executed: `node node_modules/typescript/bin/tsc --noEmit` exit 0; `corepack pnpm build` compiled (/ static); `node scripts/home-design-check.cjs` passed at 1440/1024/768/390/320 plus skip link, product routes and zero page errors (no external requests, no form writes). Custom check at 360/390/768/1024/1440/1920: no horizontal overflow, no interactive element under 44px. Contrast (computed): bone 17.3:1, mist 9.2:1, neon 6.0:1 on `--night`; night text on neon buttons 6.0:1; danger 7.1, success 11.1; input border 5.8:1. Hero text measured against the brightest background pixel under each element at every width: H1 ≥13:1, lead ≥13:1, secondary button ≥14:1, script eyebrow ≥4.66:1 (large text). Screenshots: `output/playwright/b3-landing/landing-{360,390,768,1024,1440,1920}.png`.

Not done / for owner: no Lighthouse run (plan asks for mobile ≥90, LCP ≤2.5s on mid-range Android over 4G); visual review of D6 magenta still pending; owner approval of the hero image was recorded under B2; `brewlist-home-check.cjs` not extended (it asserts the older design). Tool pages still use the older plum/berry tokens in `globals.css`, so a shared-token pass is a separate checkpoint. No commit.

Glow pass (2026-10-12): stronger static neon text-shadow on the hero script eyebrow, H1 and the "Jaipur nights" divider (magenta core, violet outer halo); removed `overflow: hidden` from the divider so the glow is not clipped. Still removed under `prefers-reduced-motion: reduce`. TypeScript and build passed; `home-design-check.cjs` passed; no overflow at 360-1920. Screenshots: `output/playwright/b3-landing/glow-*.png`.

Glow fix (2026-10-12): removed the reduced-motion rule that switched the glow off. The glow is static (no animation or flicker), and users with Windows animations off were seeing no glow. Computed text-shadow verified under both reduced-motion settings. TypeScript and build passed.

### B3 verification and completion — 2026-10-12

Lighthouse mobile (default simulated throttling, production `next start -p 3125`, 3 runs): Performance 95/95/96, LCP 2.8–2.9 s, CLS 0–0.002, TBT 40–80 ms. Lighthouse navigation mode does not report INP; event timing under 4x CPU throttle showed interactions (menu, anchor, form input) at ≤40 ms. Baseline before fixes was Performance 86, LCP 4.1 s. With applied (devtools) throttling LCP was 2.2 s. **LCP target (≤ 2.5 s) is still missed under the default simulated profile** by ~0.3–0.4 s; observed LCP is ~0.4 s locally. Remaining simulated delay is render-blocking CSS and JS under 4x CPU; no further cheap fix found. Performance ≥ 90, CLS < 0.1 and the INP proxy meet targets.

Fixes made: (1) Nunito Sans now served from a Latin-only, wght-axis woff2 subset (`app/fonts/NunitoSans-latin.woff2`, 27 KB, was a 266 KB font file; original TTF and OFL kept); (2) hero mobile image served as an 800×1200 derivative (`hero-night-mobile-800.avif/.webp`, 47/67 KB; 1200px originals kept unused). Hero text contrast re-measured with the glow on (brightest pixel under each element, text hidden but shadows kept): the script eyebrow failed (neon text on its own neon glow, 1.4–1.8:1), so its text colour is now `#FFE3F2` with a softer inner glow; it now measures 4.8–6.0:1. H1 ≥ 5.0:1, lead ≥ 13:1, buttons ≥ 6.0:1 at 360/390/768/1024/1440/1920. Note for the owner: the eyebrow is now pale pink with a magenta glow rather than solid magenta (relevant to D6 review). Screenshots retaken in `output/playwright/b3-landing/landing-*.png`.

Checks run: `tsc --noEmit` exit 0; `corepack pnpm build` compiled; `home-design-check.cjs` all PASS; `git diff --check` no whitespace errors (CRLF warnings only). D6 stays "approved, pending owner's visual review". B3 marked complete apart from the LCP note above.

B4 deferred to Phase 1 (re-scoped with B11).

### B3 LCP follow-up — 2026-10-12

Tried to bring simulated mobile LCP (2.8–2.9 s) under 2.5 s without changing the design. Measured and reverted (no gain): `experimental.inlineCss`, a 640px hero image (27 KB), a modern `.browserslistrc`, a data-URI blur-up background, extra hero preload links (Next already emits them). Findings: CPU slowdown does not matter (LCP identical at 1x); blocking all JS drops simulated LCP to 1.7 s, so the cost is the ~145 KB of framework JS and ~15 requests contending on Lighthouse's simulated 1.6 Mbps / 150 ms link, and `next start` locally serves HTTP/1.1 (6 connections) whereas Vercel serves HTTP/2. Real local LCP is ~0.4 s and Chrome-applied throttling gives 2.2 s. No code kept from this pass. Final state unchanged from the previous entry: Performance 95, LCP 2.9 s, CLS 0, TBT 60 ms; tsc, build, `home-design-check.cjs` and hero contrast (0 failures) re-run and passing. **Open: re-measure LCP on the Vercel staging deploy (HTTP/2, CDN) in B5; if still > 2.5 s, the remaining lever is cutting framework JS on `/` (e.g. a lighter form/menu or deferring hydration), which is a design-level change.**

### B5 Vercel staging deploy, LCP re-measure, planner save removed — 2026-10-12

**Staging deploy.** Linked the working tree to the existing Vercel project `vritraroe25-6598s-projects/drink` (Vercel CLI 63.1.2, installed globally; no package changes) and deployed previews with `vercel deploy --yes`. Added `.vercelignore` so `.env*`, `.opencode/`, `.fallow/`, `output/`, `tmp/`, `graphify-out/` and the product spreadsheet/images are not uploaded. Latest preview: `https://drink-hy50n7h4h-vritraroe25-6598s-projects.vercel.app` (behind Vercel Deployment Protection; automated access uses `vercel curl` or the `x-vercel-trusted-oidc-idp-token` header with the short-lived dev OIDC token). Env vars needed: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` (server-only, catalogue). They exist on Vercel but are scoped to **Production only**, so `/party-planner` cannot load the catalogue on previews until the owner also enables them for Preview. Note: `vercel link` appended a `VERCEL_OIDC_TOKEN` line to `.env.local`; it was removed again, existing keys untouched.

**Lighthouse mobile on staging (HTTP/2, default simulated throttling).** Before any change (5 runs): Performance 99/89/90/91/87, LCP 2.0/3.3/3.3/3.2/3.3 s, FCP 1.4–1.6 s, CLS 0, TBT 40–80 ms. All resources finish by ~0.6 s; on warm runs LCP is ~0.3 s TTFB + ~0.3 s load + ~1.8 s element render delay. The observed (unthrottled) first paint lands at ~2.4 s, right after the ~185 ms evaluation of the React/Next runtime chunk, so Lantern ties LCP to framework JS. Experiments, measured and reverted: removing `decoding="async"` from the hero (LCP 2.4/3.1/3.0/3.1/3.2 s, no gain); WebP instead of AVIF for the mobile hero (2.8/3.1/3.2/3.3 s, no gain). **LCP target (≤ 2.5 s) still missed on staging (median ~3.2 s simulated); Performance ≥ 90 met on most runs; CLS and TBT meet targets.** The remaining cost is the App Router runtime itself (React DOM ~73 KB), which ships even with no client components, so trimming `/` alone will not remove it. Proposed next step (not implemented): measure field LCP from real devices on production (e.g. Vercel Speed Insights, which needs owner approval for a new dependency) before any design-level change; options beyond that are a static, non-hydrated landing page or moving `/` off the App Router runtime, both are architecture changes.

**Party Planner save (owner decision).** The owner did not want account save, and no SMS provider is configured. Removed the OTP sign-in, Saved plans dialog and Save plan button from `app/party-planner/planner.tsx`. The list is kept on the device (existing localStorage auto-draft) and exported via Print/PDF, Copy and Share. Confirmation copy updated ("This clears your current list on this device"). No Supabase writes, migrations or data changes. `party_plans` table and migration untouched. Not done: removing the now-unused `listPlans`/`savePlan`/`deletePlan`/`getSession` server actions from `app/party-planner/actions.ts` (the edit was blocked by the local permission classifier). `sendOtp`/`verifyOtp`/`signOut` and `session.ts` must stay while Find My Drink uses them. `scripts/party-planner-backend-check.cjs` still asserts the old save flow (already outdated).

Checks run: `tsc --noEmit` exit 0; `corepack pnpm build` (verify-deps=warn) compiled, all routes generated; `git diff --check` no whitespace errors (CRLF warnings only); production smoke `next start -p 3131`: `/` 200, `/party-planner` 200, no "Saved plans"/"Send SMS code" in the HTML; preview `/` and `/party-planner` 200 via `vercel curl`. Not run: interactive browser pass of the planner on staging (catalogue needs the Preview env vars).

### B5 follow-up: dead save code removed, staging planner pass — 2026-10-12

Owner enabled the three Supabase env vars for Preview and Development, and approved removing the unused save code. `app/party-planner/actions.ts` now keeps only `confirmEligibility`, `getCatalogue`, `validatePlan` and the OTP trio (`sendOtp`/`verifyOtp`/`signOut`, still used by Find My Drink). Removed: `listPlans`, `savePlan`, `deletePlan`, `getSession`, `SavedPlan`, and their `party_plans` REST helpers. No code references the `party_plans` table any more. The table and migration are left in place; dropping them would be new backend work that needs approval.

Staging preview `https://drink-it1h4r64v-vritraroe25-6598s-projects.vercel.app`: scripted Playwright pass at 1280×900 (via the dev OIDC header): eligibility → catalogue loaded from Supabase (18 categories) → guests/budget → add product → Review list → receipt with Print/Copy/Share, no Save/Saved plans controls → reload offers "Continue your list" (device draft restored), 0 page errors. Not tested: mobile-width interactive pass.

Checks run: `tsc --noEmit` exit 0; `corepack pnpm build` compiled, `/party-planner` static; `git diff --check` clean (CRLF warnings only). B5 is complete apart from the LCP note above, which is still open (simulated LCP ~3.2 s on staging; field measurement proposed).

### B5 follow-up: drop `party_plans` (owner-approved) — 2026-10-12

Owner approved dropping `party_plans`. Read-only REST count on the live project showed 0 rows. Added `supabase/migrations/20261012_drop_party_plans.sql`: it aborts if any rows exist, then drops the table (policies and trigger go with it) and `party_plans_set_updated_at()`. **Pending: the owner runs it in the Supabase SQL editor.** No database credentials are available locally, and the REST API cannot run DDL. After it runs, confirm with `select to_regclass('public.party_plans');` (expect null).

### B5 follow-up: backend check trimmed — 2026-10-12

`scripts/party-planner-backend-check.cjs` was trimmed instead of deleted: the save/list/delete, conflict-retry, tamper and ownership-filter sections are gone, along with the `user_id`/`updated_at` source assertions. It still covers the eligibility gate (no catalogue read before consent), paginated `planner_products` reads, server-side price recalculation, unknown-product rejection, a malformed catalogue row failing closed, and OTP validation, cookie flags and offline failure (OTP is still used by Find My Drink). `node scripts/party-planner-backend-check.cjs` PASS; `git diff --check` clean.

### B6 Find My Drink rebuilt on `planner_products` — 2026-10-12

Rebuilt `app/find-my-drink/` per plan section 4c. The page is a server component that reads the catalogue only through the existing `readCatalogue()` in `app/party-planner/catalogue-server.ts`; there is no second reader and no new table. All state lives in URL parameters (`category`, `q`, `max`, `size`, `sort`, `all`), so results are shareable and filters work without JavaScript. Features: category chips with counts (from the catalogue), name/brand search, budget-per-bottle presets (₹500/1,000/2,000/5,000), sizes taken from the chosen category, sort by best value (price per 750 ml, the default), lowest price or name, a "3 picks" strip (cheapest, best value, premium within budget) and a capped list (48, then "Show all N"). Every card shows name, brand, size, listed price, price per 750 ml and **Add to plan**. Prices carry the D5 label "Listed price in Jaipur, checked 3 Oct 2026". Empty state: loosen budget, size or search, plus the 3 nearest prices. Catalogue down: "Retry". The age gate (`allcheers_eligible` cookie) is kept. New files: `finder.ts` (pure filter/sort logic) and `components/add-to-plan.tsx` (client). `finder.module.css` was cut down to the finder rules; light tool surface, Nunito Sans.

Add to plan writes to the Planner's device draft (`localStorage` `allcheers_planner_draft`). It appends the product and its category, sets 1 pack or adds a pack (max 1,000), and makes that category active. The Planner's draft check now accepts empty guests/budget so a draft started from Find My Drink isn't thrown away. The inventory summary now says "Budget not set" instead of showing "₹0.00 … over budget".

Retired: recipe detail `/[id]`, `/saved`, step/making mode, pantry, metric conversion, recipe queries and community (save, like, review, comment), plus phone OTP UI. `sendOtp`, `verifyOtp` and `signOut` were removed from `app/party-planner/actions.ts`. `session.ts` now only holds `eligibilityAccepted`/`setEligibility`, with no token cookies or auth helpers. No `drinks` table reference remains in `app/`. Landing copy updated: the Find My Drink card and the guest FAQ no longer mention recipes or accounts. `scripts/party-planner-backend-check.cjs` dropped its OTP assertions and now checks that no sign-in actions or token helpers remain. Added `scripts/find-my-drink-check.cjs`.

No Supabase writes, migrations, data, package, lockfile or env changes. The `drinks` table itself stays until B8 (owner approval).

Verification run: `node node_modules/typescript/bin/tsc --noEmit` exit 0 (after the build regenerated `.next/types`); `corepack pnpm build` with `pnpm_config_verify_deps_before_run=warn` compiled (`/find-my-drink` dynamic, `/[id]` and `/saved` gone); `git diff --check` exit 0 (CRLF warnings only); `party-planner-backend-check`, `party-planner-catalogue-server-check` and `party-planner-check` passed. Production smoke (`next start`, real env, read-only catalogue GETs): `/`, `/party-planner`, `/find-my-drink` 200, `/find-my-drink/saved` 404; gate shown without the cookie; with it, `?category=Gin&max=2000` renders 3 picks and the D5 label, and `max=1` renders the empty state with nearest prices. Browser pass `scripts/find-my-drink-check.cjs` at 390 and 1280: gate → Gin → ₹2,000, every price ≤ budget, no horizontal overflow, all main targets ≥44px, Add to plan twice → draft holds 2 packs, Planner shows "Continue your list" and the added product; zero page errors. `home-design-check.cjs` still passes. Screenshots: `output/playwright/b6-find-my-drink/`.

Not done / open: no Vercel preview (the CLI isn't installed on this machine). The old recipe/community harnesses (`recipe-*.cjs`, `brewlist-tools-style-check.cjs`, the `/find-my-drink/saved` route in `brewlist-home-check.cjs`) test retired code and will fail; retire or rewrite them. The browser pass reads the live catalogue rather than a mocked fixture. Add to plan needs JavaScript (localStorage). No automated contrast run beyond the existing tokens (muted `#625f59` and berry `#b73720` on `#fffdfa` are both above 4.5:1). Graphify not refreshed. No commit.

### B6 reversed — Find My Drink stays a recipe browser — 2026-10-12

Owner decision: the 50 cocktail/mocktail recipes in `drinks` are Socifer's to use. Find My Drink is meant to be the recipe browser (browse by mood/type, suggestions, recipe pages with method), not a bottle finder. The plan (`socifer-product-plan.md` item 2, B6, B8) is annotated: the bottle finder and the `drinks` removal are cancelled.

Done: restored `app/find-my-drink/` from commit `770e692` (browse, discovery picks, pantry, recipe detail, step mode, metric conversion). The bottle-finder files from the earlier B6 entry (`finder.ts`, `add-to-plan.tsx`, `scripts/find-my-drink-check.cjs`) were deleted. Community and sign-in stay retired: removed `actions.ts`, `community.ts`, `components/auth.tsx`, `components/community.tsx`, `/saved` and the "Saved recipes" header link, and detached community from the detail page. `party-planner/actions.ts`/`session.ts` stay without OTP or token helpers. The Planner draft fix and "Budget not set" summary from the earlier entry are kept. Landing card copy is back to "Browse recipes"; the guest FAQ keeps "no account needed, plan kept on this device".

Incident: during the restore `git checkout HEAD -- app/page.tsx` overwrote the uncommitted B3 landing. It was recovered exactly from the Turbopack source map of the previous build (`.next/server/chunks/ssr/*.js.map` sourcesContent), then the two Find My Drink card strings were set back to the recipe wording.

Verification run: `corepack pnpm build` compiled (`/find-my-drink`, `/find-my-drink/[id]`); `tsc --noEmit` exit 0; `git diff --check` exit 0; `party-planner-backend-check` passed. Production smoke (live read-only): `/` 200 with "Book the night" and "Browse recipes"; `/find-my-drink` lists 50 matching recipes with no "Saved recipes" link; `/find-my-drink/dn-cape-codder` renders Ingredients, Make it and Start making; `/find-my-drink/saved` 404 with the age cookie.

Open: no browser/screenshot pass of the restored recipe pages in this round. `recipe-community-check.cjs`, `recipe-platform-*` and the `/saved` parts of `brewlist-*` harnesses test retired community/sign-in code. Whether the recipe `sourceName`/`sourceUrl` attribution shown on detail pages should stay now that the recipes are owned content. Mood-based browsing and a "smart suggester" beyond the existing discovery picks are not built. No commit.

### Phase 1 backlog + script cleanup — 2026-10-12

Plan: added **B12, Find My Drink mood browsing + smart suggester (Phase 1)** to the backlog in `docs/socifer-product-plan.md`. It depends on owner-approved mood tags for the 50 recipes.

Scripts: removed test code for retired features (phone OTP sign-in, saved/liked/reviewed/commented recipes, Planner saved plans).
- Deleted, because they only tested retired features: `scripts/recipe-community-check.cjs`, `scripts/recipe-platform-actions-check.cjs`, `scripts/recipe-platform-browser-smoke.cjs`.
- Trimmed:
  - `brewlist-home-check.cjs`: dropped the `/find-my-drink/saved` route.
  - `brewlist-tools-style-check.cjs`: dropped the saved/community mock endpoints, the saved-page and auth steps, the Community heading and Save-recipe assertions.
  - `recipe-browse-check.cjs`: dropped the community-unavailable assertion.
  - `design-polish-check.cjs`: dropped the save/open/edit/delete saved-plan flow.
  - `planner-inventory-check.cjs`: dropped the `--saved-edges` mode and the save-plan flow; the footer check now uses "Copy list".
  - `fixtures/design-polish/mock-supabase.cjs`: dropped auth and `party_plans` mocks; every upstream call is refused.
  - `fixtures/design-polish/mock-upstream.cjs`: dropped the delete-failure simulation.
- Earlier this session: `party-planner-backend-check.cjs`, which now asserts that no sign-in actions remain.

Verification run: `node --check` passes on every `scripts/*.cjs` and fixture. A grep finds no remaining OTP, token-cookie, saved-plan, saved-recipe or community references in `scripts/*.cjs`. Python import scripts and `scripts/recipe-catalogue/*.sql` (DB history and DDL) were left alone.

Script run results after cleanup (all executed 2026-10-12):
- Pass: `party-planner-check`, `party-planner-backend-check`, `party-planner-catalogue-server-check`, `early-access-check`, `recipe-detail-check`, `recipe-metric-check` (incl. live read-only 50 rows), `recipe-pantry-check`, `recipe-pantry-browser-check`.
- Fail on stale expectations, not on the removed features:
  - `recipe-browse-check`: live assertion "unreviewed imported drafts must remain hidden". Needs a data/contract look.
  - `recipe-discovery-check`: waits for "Refine your matches"; the UI says "Refine matches".
  - `brewlist-tools-style-check`: finder/detail steps now pass; it fails at the old landing heading "Club bookings in Jaipur.".
  - `design-polish-check`: old `.hero-actions` landing.
  - `planner-inventory-check`: old planner h1 size.
  - `brewlist-home-check`: needs an externally started server on :3192 and asserts the pre-B3 landing.
- These need a separate refresh against the B3 landing and the current Planner.

### Test script refresh against B3 landing and one-page Planner — 2026-10-12

Scope: `scripts/` and `scripts/fixtures/design-polish/` only. No `app/`, package, lockfile, env, `.opencode/`, `.fallow/` or git changes. No Supabase writes; the only live access is the existing read-only checks.

- `recipe-discovery-check`: "Refine matches" wording. At 800px and below the filters now open from a "Filters" button into a dialog, so the 44px target check opens it there and checks the inline aside above that. The result-count status lookup is scoped to the results. The no-JS grapefruit search now expects every result to match instead of exactly one, because the 50-recipe catalogue has two grapefruit mocktails.
- `recipe-browse-check`: investigated before changing. A read-only anon GET shows `dn-mojito` is `published`, `editorial_ready=true`, `allcheers_original_from_facts`, and no row in `drinks` is non-published or unreviewed. So the app is correct: Mojito was a draft at launch and has since been reviewed. The assertion now expects the reviewed Mojito to render (200). Hiding of drafts and legacy rows is still asserted by the fail-closed unit checks, the legacy `negroni` 404 and the injection-id 404.
- `brewlist-tools-style-check`: landing heading is now H1 "Book the night.".
- `design-polish-check` and fixtures: landing assertions use the B3 hero ("Get launch updates" to `#early-access`, "How it works" to `#how-it-works`, no booking CTA, two tool cards). The Planner flow follows the one-page layout (nav link, Guests & budget dialog, category index, "Build your list.", review, copy/share/print, Start new plan). `favicon.ico` must have at least 3 sizes (it now has 4). `mock-supabase.cjs` now sets the expected Supabase origin plus an `sb_secret_` key and serves `planner_products` from `app/party-planner/catalogue.json` with `Content-Range` paging, refusing everything else. `mock-upstream.cjs` audits against that origin.
- `planner-inventory-check`: rewritten for the one-page Planner. The legacy `--baseline` mode (old swap UI) was dropped. Equivalents:
  - the filter facets now live in the Filters dialog;
  - the category checkbox and confirm flow is now "Remove <category> category" with a toast and Undo;
  - the mobile drawer is "View plan";
  - the drop zone is the "Your selected plan" aside;
  - the shelf page size is 24;
  - the budget split is derived from the loaded catalogue.
- `brewlist-home-check`: kept, not deleted. It covers what `home-design-check` does not: hero containment including 200% text, 44px targets, local nightlife imagery, keyboard menu (now below 1024px, five links, Escape returns focus) and FAQ. It now starts its own production server on :3192 unless `BREWLIST_HOME_ORIGIN` is set, and writes screenshots to `output/playwright/brewlist-home`.

Verification (all executed 2026-10-12 after `corepack pnpm build`): every `scripts/*.cjs` check passes except `planner-redesign-check` (see open items). `tsc --noEmit` exit 0; `git diff --check` exit 0 (CRLF warnings only); `node --check` passes on every script and fixture. `extract-taste-tags.cjs` is a workbook extractor, not a check, and was not run.

Follow-up (same day): `planner-redesign-check.cjs` refreshed (the `Increase` locator is scoped to the shelf card; the removed cart pill and "Your list" drawer steps are replaced by the desktop aside; the mobile bar uses "View plan" / "Close plan"; the shelf-focus assertion now waits for the deferred focus). It passes. `planner-inventory-check.cjs` passed 4 of 4 consecutive runs with the 500ms settle before the touch-flow tap, so the one-off "Target crashed" is treated as an unreproduced headless-Chromium flake.

### B9 partial: baseline DDL for waitlist and profiles — 2026-10-12

Scope: `supabase/` only, plus this log. No `app/`, package, lockfile, env or git changes. No Supabase writes.

Remote access: no Supabase MCP and no database connection string are available in this repo or session. The only read path was one GET of the PostgREST OpenAPI root (`/rest/v1/`), which returns column metadata only. No table rows were read.

- Added `supabase/migrations/20260801_waitlist_subscribers_baseline.sql` and `20260801_profiles_baseline.sql`. They hold the table definitions verified from the OpenAPI schema (columns, types, defaults, NOT NULL, comments), idempotent (`if not exists`), marked "do not re-run blindly".
- Not verifiable over REST, so left commented out as `[documented, UNVERIFIED]`: RLS flag, policies, grants, the `waitlist_email_unique` index, CHECK constraints, the `profiles` FK to `auth.users`, the `handle_new_user` function and trigger.
- Added `supabase/introspection/b9_readonly_introspection.sql` (SELECT only). Run it in Studio, then fill the commented sections in from the output.
- Findings: the remote OpenAPI still lists `party_plans`, so either the `20261012_drop_party_plans` migration has not been applied or the schema cache is stale. Also a `quiz_submissions` table (and `quiz_throttle_count` function) has no repo DDL; it is outside this task's named tables.

B9 is NOT complete: "repo matches remote" is unproven until the introspection output is in.

### B9 completed: waitlist and profiles DDL read back from remote — 2026-10-13

Read-only SELECTs through the Supabase MCP (no writes). Supersedes the "partial" entry above.

- `20260801_waitlist_subscribers_baseline.sql` and `20260801_profiles_baseline.sql` now contain the full remote definitions: columns (including `interests default '{}'`), 7 CHECKs on waitlist and 2 on profiles, `waitlist_email_unique`, RLS, policies (`waitlist_insert` INSERT with check true; `profiles_own_select/insert/update`), `profiles_id_fkey` to `auth.users`, `set_updated_at` and `handle_new_user` functions, and the `profiles_set_updated_at` and `on_auth_user_created` triggers. All idempotent.
- Early-access contract holds: RLS on, only INSERT policy on `waitlist_subscribers`, so no anon reads. Payload fields match the CHECKs (source, interests, preference, cta_source <= 40 chars, consent_version <= 40).
- Findings, not fixed:
  - Remote `anon` and `authenticated` hold full table grants (arwdDxtm) on both tables; only RLS blocks them. Revoking is a backend change needing approval.
  - `20261012_drop_party_plans` is NOT applied: `party_plans` still exists (RLS on, 0 rows) and is absent from remote migration history. Applying it is B8-adjacent and needs owner go-ahead.
  - Remote migration versions differ from repo files (e.g. `party_plans` is 20260917033539 remotely, `20260914_party_plans.sql` here). Remote also has migrations with no repo file: core tables, rls/auth bootstrap, seed drinks, revoke rpc exposure, quiz throttle fix, community, recipe essentials/quality gate, planner_products set. `quiz_submissions` and `quiz_throttle_count` still have no repo DDL.
- Not run against any database: the baseline SQL was not executed anywhere, only written from the readback.

### B9 Step 1: clean migration set and remote inventory — 2026-10-13

Scope: `supabase/` and this log. Remote access was SELECT-only through the Supabase MCP (no `apply_migration`, no DDL/DML, no rows read from `waitlist_subscribers` or `profiles`). No `app/`, package, lockfile, env, `.opencode/` or `.fallow/` changes. Nothing deleted, nothing staged or committed.

- Added `20260802_drinks_baseline.sql` (full `drinks` structure, publication-gate policy, trigger, select-only grants) and `20260803_planner_products_baseline.sql` (table, RLS with no policies, service_role INSERT/SELECT only). Structure only: the 9,462 `drinks` rows and 1,311 `planner_products` rows are not copied.
- Added `supabase/README.md` with the remote-version -> repo mapping (all 21 remote migrations). Comment-only edit to the profiles baseline header (no longer calls profiles the community FK target).
- Remote inventory: KEEP `waitlist_subscribers`, `profiles` (+ `handle_new_user`, `set_updated_at`, `on_auth_user_created`), `drinks`, `planner_products`. REMOVE `party_plans` (+ function), `saved_drinks`, `drink_likes`, `drink_reviews`, `drink_comments`, three public views, `private` schema (4 tables, 10 functions), `quiz_submissions` + `quiz_throttle_count`. Row counts: all removal candidates 0 rows except `quiz_submissions` (6).
- Findings: no edge functions; advisor flags `quiz_throttle_count` as anon/authenticated-executable SECURITY DEFINER (goes away with removal) and leaked-password protection off (Auth setting). `waitlist_subscribers` and `profiles` still grant anon/authenticated full table rights, RLS only. `drinks` holds 9,400 drafts and 12 legacy published-but-not-ready rows hidden by RLS.
- Step 2 lists (remote drops, grant tightening, repo file removals) await owner approval.

### B9 Step 2: remote clean-up applied — 2026-10-13

Scope: remote `public`/`private` clean-up approved by the owner on 2026-10-13, plus `supabase/`, `docs/` and one label in `scripts/recipe-catalogue/build_catalogue.py`. No `app/`, `.env*`, `.opencode/` or `.fallow/` changes; nothing staged or committed. `pnpm build` skipped (no `app/` change).

**How it was applied.** The Supabase MCP `apply_migration` call returned `cancelled` four times (also after adding an allow rule), and the owner declined routing destructive DDL through `execute_sql`. The owner therefore ran the DDL in Studio, one step at a time, and each step was read back with SELECT-only queries from here. Consequence: **none of these changes has a `supabase_migrations.schema_migrations` entry** (history is still the 21 old rows). The repo baselines are the record.

Applied remotely (no CASCADE anywhere):
1. `quiz_submissions` and `quiz_throttle_count(text)` dropped (no export, 6 rows discarded as approved).
2. Views `drink_comments_public`, `drink_reviews_public`, `drink_social_stats` dropped.
3. `drink_comments`, `drink_likes`, `drink_reviews`, `saved_drinks` dropped (0 rows each).
4. `private` schema: 4 tables, 10 functions and the schema dropped (0 rows).
5. `party_plans` and `party_plans_set_updated_at()` dropped (0 rows).
6. `drinks`: deleted the 9,412 rows where `(status = 'published' and editorial_ready) is not true`. Pre-check: 50 keep, 9,412 delete, 0 kept rows referencing a hidden row via `zero_proof_alt_id`.
7. Grants: `waitlist_subscribers` anon and authenticated INSERT only; `profiles` authenticated SELECT/INSERT/UPDATE only (anon none); `service_role` unchanged on both.

Verified after (SELECT only): `public` holds only `drinks`, `planner_products`, `profiles`, `waitlist_subscribers` and functions `handle_new_user`, `rls_auto_enable`, `set_updated_at`; no foreign keys into `drinks` except its own `zero_proof_alt_id`, no dangling values. Counts: 50 `drinks` (0 not publishable), 1,311 `planner_products`, 4 `waitlist_subscribers` (counts only; no rows read from `waitlist_subscribers` or `profiles`). RLS on for all four tables; policies unchanged (`drinks_public_read`, `waitlist_insert`, three `profiles_own_*`). Security advisor: the `quiz_throttle_count` SECURITY DEFINER warnings are gone; remaining: INFO `planner_products` has RLS and no policy (intended, service role only) and WARN leaked-password protection off (Auth dashboard setting, not SQL).

Repo:
- Deleted: `20260914_party_plans.sql`, `20261012_drop_party_plans.sql`, `20260923_drink_provenance.sql`, `20260927_drinks_publication_gate.sql`; `scripts/recipe-catalogue/` `community-schema.sql`, `community-rls-check.sql`, `saved-base-schema.sql`, `platform-rls-smoke.sql`, `local-bootstrap.sql`, `base-schema.sql`, `essentials-schema.sql`, `recipe-quality-gate.sql`, `check_local_schema.py` (deleted rather than trimmed; it only replayed the removed SQL).
- Moved `supabase/introspection/b9_readonly_introspection.sql` to `docs/`.
- Renamed `20260801_profiles_baseline.sql` to `20260801000001_profiles_baseline.sql` (unique CLI version).
- Added the final grants to the waitlist and profiles baselines; updated `supabase/README.md` mapping.
- Fixed doc references in `docs/recipe-essentials.md`, `docs/allcheers-recipe-platform-plan.md`, `docs/socifer-product-plan.md`; `build_catalogue.py` `MIGRATION` label now `20260802_drinks_baseline`. Older entries in this log still name the deleted files; left as history.

Checks run: `node scripts/early-access-check.cjs` PASS; `node node_modules/typescript/bin/tsc --noEmit` exit 0; `git diff --check` exit 0 (only LF/CRLF warnings).

Unexpected / open:
- The `20260801000001` rename target and the grant matrix were inferred from a truncated instruction and confirmed by the owner.
- Remote `waitlist_subscribers.source` CHECK still allows `'quiz'` (harmless; left as is).
- The baseline SQL files were not executed anywhere; the remote was changed by hand-run DDL that matches them.
- Leaked-password protection (Auth setting) is still off.

### B8 close-out: app and test cleanup after community and sign-in retirement — 2026-10-13

Scope: app CSS, scripts, docs. No `.env*`, package, lockfile, `.opencode/`, `.fallow/`, `app/early-access/actions.ts` or remote-database changes. Nothing staged or committed. Recipes and the `drinks` table stay (owner, 2026-10-12).

**Found (Grep, Graphify, a CSS-class usage scan and `tsc --noUnusedLocals`).** No code references to community, saved, OTP, `party_plans` or quiz remain in `app/`: `session.ts` only holds the eligibility cookie, `actions.ts` only `confirmEligibility`, `getCatalogue` and `validatePlan`. Env: `.env.example` and `.env.local` hold only `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SECRET_KEY` (names only checked); all three are still used. The Graphify graph was stale and still listed deleted files; it is refreshed now (847 nodes).

**Deleted (provably unused: no JSX or code reference):**
- `app/find-my-drink/finder.module.css`: `.authBox`, `.communityForm`, `.community*` (stats, actions, controller), `.commentType`, `.review*`, `.savedGrid`, `.savedPage`, `.savedRemoveStatus`, `.authPrompt` and their media-query overrides (23 lines). The `.makingBar` comment no longer says "community".
- `app/party-planner/planner.module.css`: `.savedRow` (3 rules plus the mobile override).

**Left, and why:**
- Unused CSS classes that are not from the retired features (not removed; separate cleanup): `finder.module.css` `.browseCard`, `.stripRow`, `.rail`, `.railRow`, `.provenance`, `.provenanceList`, `.moreFilters`; `planner.module.css` `.categoryTitle`, `.categoryBlock`, `.selectedItem`, `.selectedDetails`, `.selectionLabel`, `.stepToolbar`, `.cartPill`, `.taskNote`.
- `tsc --noUnusedLocals` flags three unrelated leftovers: `metric.ts:299` unused `index`, `catalogue-server.ts:17` unused type `DatabaseProduct`, `planner.tsx:72` unused `basicsOpen`. Not touched.
- Old docs that mention community or OTP are history (`docs/allcheers-*`, `brewlist-*`, `find-my-drink-ux-direction.md`, `jaipur-supabase-move-plan.md`, `planner-inventory.md`, older entries in this log). Only `allcheers-recipe-platform-plan.md` got a "superseded in part" note at the top.
- `remote waitlist_subscribers.source` CHECK still allows `'quiz'` (harmless, already noted in B9).

**Plan:** `docs/socifer-product-plan.md` section 4d is retitled "Retiring community objects safely". A note says "retire `drinks`" is cancelled and which steps no longer apply (struck through as history). Added the migration-history caveat: B9 Step 2 drops were run by hand, `schema_migrations` still has the 21 old entries, history has not been repaired. Options noted: a documented `supabase migration repair`, or leave the 21 old entries as-is. Both need owner approval.

**Script run** (production build, `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` set for browser checks; `home-design-check` needs a server on :3125, started and stopped by me):

| Script | Result | Action |
|---|---|---|
| party-planner-check | pass | none |
| party-planner-backend-check | pass | none |
| party-planner-catalogue-server-check | pass | none |
| party-planner-live-catalogue-check | pass (read-only) | none |
| early-access-check | pass | none |
| recipe-detail-check | pass | none |
| recipe-metric-check | pass (incl. live read-only 50 rows) | none |
| recipe-pantry-check | pass | none |
| recipe-pantry-browser-check | pass | none |
| recipe-browse-check | pass | none |
| recipe-discovery-check | pass | none |
| brewlist-home-check | pass | none |
| brewlist-tools-style-check | pass | none |
| home-design-check | pass (with :3125 server) | none |
| design-polish-check | pass | none |
| planner-inventory-check | pass | none |
| planner-redesign-check | pass | none |
| planner-ux-check | pass | none |
| recipe-platform-* | no longer exist | deleted 2026-10-12 (retired features) |
| recipe-community-check | no longer exists | deleted 2026-10-12 |
| extract-taste-tags | not run (workbook extractor, not a check) | none |

First attempt of `recipe-detail`, `recipe-pantry-browser` and `recipe-discovery` failed only because `PLAYWRIGHT_MODULE` was unset; they pass with it. No script failed because it tests retired code.

**Browser pass** (`node sc...` in the brief was cut off and no such script exists, so I used a throwaway Playwright script outside the repo; screenshots in `output/playwright/b8-closeout/`). Find My Drink at 390 and 1280px: age gate, list (20 cards of 50), Gin filter (6 cards, `?type=gin`; filter dialog at 390), recipe detail (Negroni: Ingredients, Make it), Step mode (Step 1 of 3, then Step 2 of 3). No horizontal overflow, no save/sign-in/community UI, zero page errors. Nothing broken by the cleanup. Cosmetic, not caused by it: at 390 the step-mode buttons ("View all steps", "Keep screen awake") render as large circles.

**Verification:** `tsc --noEmit` exit 0; `corepack pnpm build` (verify-deps warn) compiled, routes `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/[id]`; production smoke on `next start` (read-only live catalogue): `/`, `/party-planner`, `/find-my-drink` 200; with the age cookie 50 matching recipes, `/find-my-drink/dn-cape-codder` 200 with Ingredients, Make it and Start making, `/find-my-drink/saved` 404 (without the cookie it renders the age gate, 200, because `[id]` is gated first); `git diff --check` exit 0 (CRLF warnings only); `early-access-check` pass.

**Uncommitted state:** nothing has been committed since the B0 snapshot `770e692`; `git status` shows 78 entries (76 at the start of this pass). Suggested commit split (not done):
1. Landing page: `app/page.tsx`, `app/home.module.css`, `app/layout.tsx`, `app/mobile-menu.tsx`, `app/fonts/`, `public/images/nightlife/hero-*`, `docs/nightlife-image-credits.md`, `next.config.mjs`.
2. Planner: `app/party-planner/*` (save and OTP removed, draft fix, catalogue resilience).
3. Find My Drink: `app/find-my-drink/*` (community, sign-in and saved removed; CSS trimmed).
4. Supabase DDL and history: `supabase/`, `docs/b9_readonly_introspection.sql`, `scripts/recipe-catalogue/` SQL and `check_local_schema.py` deletions plus the `build_catalogue.py` label, `docs/recipe-essentials.md`.
5. Scripts and fixtures: `scripts/*.cjs`, `scripts/fixtures/`, including deletions of `recipe-community-check`, `recipe-platform-*`.
6. Docs: `docs/socifer-product-plan.md`, `docs/implementation-progress.md`, `docs/allcheers-recipe-platform-plan.md`.
7. Tooling config (review separately, likely not for the product history): `AGENTS.md`, `.opencode/`, `opencode.jsonc`, `.mcp.json`, `.vercelignore`.

Not started: B7, B10, B11, B12.

### B7 Planner polish and starting list — 2026-10-13

Owner decisions this checkpoint: D7 confirmed (optional deterministic starting list, labelled as an estimate). Servings rule approved. Category shares follow the categories that exist in the database. New category art approved. A redesign of Party Planner and Find My Drink with a shared, city-neutral palette ("dark night + warm gold", no magenta/pink; the pink accent is the Jaipur landing only) is a separate checkpoint after B7 and is not started.

Scope: `app/party-planner/` (`suggest.ts` new, `planner.tsx`, `model.ts`, `planner.module.css`), four SVGs in `public/images/drinks/`, `scripts/party-planner-suggest-check.cjs` (new), `party-planner-check.cjs` and `planner-redesign-check.cjs` updated. No backend, package, lockfile or env changes. Nothing staged or committed.

**Starting list contract** (`app/party-planner/suggest.ts`, pure: no Date, no randomness, no I/O):
- Inputs: guests (1–1,000), budget, party length 2/4/6 hours, non-drinking guests (at least one drinker), mix Balanced / Beer & wine / Spirits-led.
- Servings: drinkers × (hours + 1). Serving: beer 330 ml, wine 150 ml, spirits 60 ml, ready-to-drink 275 ml.
- Categories are grouped by name from the live catalogue (beer, wine incl. champagne/sparkling, spirits, ready to drink). Liqueurs, sake and unrecognised categories are never suggested. Group weights: Balanced beer 30 / wine 20 / spirits 45 / RTD 5; Beer & wine 55 / 40 / 0 / 5; Spirits-led 15 / 0 / 80 / 5. Within a group the largest categories by eligible product count are used (beer 1, wine 2, spirits 4, RTD 1), weighted by that count; ties by name. Categories under one serving are dropped and the rest renormalised; if all drop, the top category takes all servings.
- Pack sizes: beer 330–650 ml, wine 750 ml, spirits 375–1,000 ml, RTD any.
- Pick: products sorted by price per 750 ml, then price, then id (best value); start at the median (mid-priced). Quantity = ceil(ml needed / pack size), 1–1,000. While over budget, the category with the largest subtotal moves one product cheaper. If even the cheapest picks are over budget, the list is returned with an over-budget note.
- Output: label "Estimate. Edit anything.", drinkers, servings, lines, total, within-budget flag, per-guest cost, notes (mixers, soft drinks, water, ice and food not included).

**UI:** "Optional: suggest a starting list" in the Guests & budget dialog (length, mix, non-drinking guests, "Suggest a starting list"). If a list exists, "Replace your list?" asks first; Cancel keeps it, Replace swaps it and a toast offers Undo. An "Estimate. Edit anything." note with servings and cost per guest stays above the list until "Start a new plan". "How are quantities chosen?" explains the rules.

**Polish (plan 4b / G6):**
- Category art is matched by name pattern, so all 18 live categories get art. New: `wine.svg`, `liqueur.svg`, `rtd.svg`, `bottle.svg` (fallback). Wine art uses burgundy on a neutral ground (no pink).
- "Price verification date: unknown" replaced by the D5 label "Listed price in Jaipur, checked 3 Oct 2026" (`PRICE_LABEL` in `model.ts`) in the receipt, the Planner footnote and the copy/share text.
- Cost per guest added to the receipt and the export text.
- The age gate is skipped when the eligibility cookie is set: the Planner calls `getCatalogue()` on load (the server action checks the cookie) and shows "Loading planner…" meanwhile. `planner-redesign-check` now expects the gate to be skipped on reload.
- Bug found by the browser pass and fixed: at mobile widths the "Build your list." heading became visible while focused and collapsed on the next tap, moving the content by 38 px, so the first tap after closing any dialog was lost (for example "Edit" did nothing). The heading now stays visually hidden when focused (`planner.module.css`). This predates B7.

**Found, not changed:** `app/party-planner/catalogue.json` is stale (old category names such as "Beer"/"Whisky", 1,638 rows); the live catalogue has 18 different category names. The suggestion code works with both naming schemes. The pre-existing meter "per guest" is budget ÷ guests, while the estimate note shows list total ÷ guests.

**Verification (all executed 2026-10-13):** `party-planner-suggest-check` (grouping, shape and label, servings arithmetic, reproducible and order-independent, group caps, exclusions, median best-value pick, single-product category and catalogue, budget fit and over-budget flag, 1 guest/2 h and 1,000 guests/6 h, mixes, invalid input) PASS; `party-planner-check`, `party-planner-backend-check`, `party-planner-catalogue-server-check`, `party-planner-live-catalogue-check`, `planner-redesign-check`, `planner-inventory-check`, `planner-ux-check`, `design-polish-check`, `brewlist-tools-style-check`, `brewlist-home-check`, `home-design-check`, `early-access-check` PASS; `tsc --noEmit` exit 0; `corepack pnpm build` compiled; `git diff --check` exit 0. Browser pass on `next start` with the live read-only catalogue at 390 and 1280 px: 25 guests, ₹30,000, 6 hours, 5 non-drinking → 8 lines, 140 servings, ₹29,985 (within budget); second suggestion asks before replacing; Cancel keeps the list, Replace swaps it, Undo restores it; reload with the cookie skips the gate; no overflow, no targets under 44 px, zero page errors. Smoke: `/`, `/party-planner`, `/find-my-drink` 200; new SVGs 200. Screenshots: `output/playwright/b7-starting-list/`.

Not done: no Vercel preview. No real-device test. The tool-page redesign (city-neutral palette) is the next checkpoint and needs a design contract and mockups first.

### Tool-page redesign: shared "Tool Night" palette for Party Planner and Find My Drink — 2026-10-13

Owner decisions: the magenta/pink accent is the Jaipur landing only. The tools share one city-neutral dark palette with a warm gold accent, matching the landing's type, spacing, header and buttons. The design contract and mockups (`output/tool-redesign-mockups/`, `design-contract.md`) were approved before any code was written. Nothing staged or committed; no backend, package, lockfile, env, `.opencode/`, `.fallow/` or landing changes.

**Tokens** (`app/tool-theme.module.css`, class `.toolTheme`; both tool `.shell`s pull it in with `composes`, so no markup changes). Contrast was measured against the real backgrounds:
- Night `#0E0D10`, surface `#18171B`, raised `#232127`, line `#3A3740` (decorative only).
- Text `#F3EEE6`: 16.78 on night / 15.45 on surface / 13.79 on raised. Muted `#B8B1A7`: 9.12 / 8.40 / 7.50.
- Gold `#F2B544`: 10.58 / 9.74 / 8.70. Night text on gold: 10.58; hover `#FFC966` 12.73; pressed `#D99B2B` 8.00.
- Control borders `#8A8490`: 5.34 / 4.91 / 4.39 (needs 3). Danger `#FF8A7A`: 8.46 / 7.79. Success `#5EDB9B`: 11.15 / 10.26. Selected ground `#2A2417` with a gold border.
- Print (light, set by `@media print` inside the token class): ink `#1C1B18` 17.22, muted `#5C5850` 7.08, accent `#8A5A00` 5.93, all on white.
- Landing tokens stay in `.home`; the tools never read landing or city tokens, so adding a city never touches the tools.

**What changed:**
- `planner.module.css` and `finder.module.css`: the old vars now map to the tool tokens. Hard-coded light colours were replaced.
- Header 64px with an uppercase wordmark; page H1 uppercase, .06em; gold eyebrows.
- 4px radius on controls, 8px on cards and dialogs.
- Buttons: gold primary with dark text (hover, pressed, and a grey disabled state). Outline secondaries invert when active or pressed.
- Focus: a 2px gold ring with a 2px offset everywhere.
- Over budget and errors use danger text; within budget uses success text.
- Long reading: description and method at 1.0625rem / 1.7, max 65ch. Step text clamp(1.375rem, 2.6vw, 1.75rem).
- The step-mode bar buttons are now 48px wrapping buttons, which fixes the B8 "large circles" at 390. The "Ingredients ↓" jump link is 48px at 1rem.
- Planner `.printOnly` receipt accent is `#8A5A00`; Find My Drink print hides header and controls.
- 200% text: the Planner meter row and search bar now wrap; they overflowed at 390 before.
- Drink SVGs unchanged: they are self-contained light tiles and don't clash.

**Harness assertion updates (design-only, no behaviour or accessible names changed):**
- `brewlist-tools-style-check`: primary is gold, or its disabled grey, instead of red.
- `recipe-discovery-check`: card focus ring 2px instead of 3px, per the contract.
- `planner-inventory-check` (also used by `planner-ux-check`): reads the H1 `textContent` instead of `innerText`, because the visual uppercase changes `innerText`; the DOM text is still "Party Planner".

**Checks run (all on the final build, executed 2026-10-13):**
- `tsc --noEmit` exit 0; `corepack pnpm build` (verify-deps warn) compiled.
- PASS: party-planner-check, party-planner-backend-check, party-planner-catalogue-server-check, party-planner-live-catalogue-check (read-only), party-planner-suggest-check.
- PASS: planner-inventory-check, planner-redesign-check, planner-ux-check.
- PASS: recipe-browse-check, recipe-detail-check, recipe-discovery-check, recipe-metric-check, recipe-pantry-check, recipe-pantry-browser-check.
- PASS: brewlist-home-check, brewlist-tools-style-check, design-polish-check, home-design-check (server on :3125), early-access-check.
- Automated contrast audit (throwaway Playwright script outside the repo): Find My Drink list, detail and step mode; Planner dialog, build and receipt. Each at 390 and 1280, list, detail and build also at 200% text: 20 views, 2,027 text and control checks. Only finding: a false positive repeated in two views, the zero-size active category tab in the hidden 390 rail; its real colours are night on `#F3EEE6`, about 16:1. No overflow, zero page errors.
- Smoke on `next start`: `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder`, `/images/drinks/wine.svg` all 200. `git diff --check` exit 0 (CRLF warnings only).
- Landing unchanged: `app/home.module.css`, `app/page.tsx`, `app/layout.tsx` and `app/globals.css` were not edited (last modified 2026-10-12), and home-design-check and brewlist-home-check pass.
- Screenshots in `output/playwright/tool-redesign/`: final views, 200% zoom, keyboard focus, print previews.

**Open items:** no real-device or screen-reader pass. The body background outside the tool shell (overscroll) is still the global cream. In print at narrow widths the "More like this" grid is cramped (layout predates this checkpoint). Unused classes listed in B8 are still there. Not started: B10, B11, B12.

## Tool-page redesign v2 (2026-10-13)

Plan `docs/tool-redesign-v2-plan.md`, tracker `docs/tool-redesign-v2-tracker.md` (per-step evidence, harness edits and deviations are there). Rebuilt the layout, IA and components of the Party Planner and Find My Drink; behaviour, server actions, data layer, `suggest.ts`, the landing and all env/package/`.opencode/`/`.fallow/` files were not touched. Nothing staged or committed; no remote database changes.

**References used:** the research tables in the plan (section 1: Difford's, Cocktail Builder, NYT Cooking/Samsung Food/Paprika step modes, Supercook/Barback pantry matching, Instacart/Blinkit/Zepto carts, Linear/Vercel Geist/Stripe colour systems, GOV.UK, Inclusive Components, WCAG 2.2). Several sources were blocked (403) and are marked [X]/[S] in the plan. After the owner's review the design direction changed to "modern, text-light, not derived from the old UI", so the shipped layout departs from plan sections 3 and 4 where noted below.

**Owner decisions:** light paper receipt on screen (matches print); Planner catalogue-unavailable state with Try again; "Your plan" sheet opens after Suggest on mobile with focus on its heading. After reviewing the build: no big visible page titles (hidden h1 only, both tools); Planner desktop is two columns with category pills (no rail, no budget strip; budget is the hero of the plan panel); one filter toolbar; much less visible text (strings kept as sr-only where harnesses/screen readers need them); loading skeletons that mirror the real layout with no visible loading text.

**Token changes** (`app/tool-theme.module.css`, only change to tokens): `--tool-sheet #1d1c21`, `--tool-danger-soft #33191a`, `--tool-paper #fbf8f2`, `--tool-paper-ink #1c1b18`, `--tool-paper-muted #5c5850`, `--tool-paper-accent #8a5a00`, `--tool-paper-danger #a30038`, `--tool-paper-line #8f897e`; print values equal the screen values except paper/sheet/danger-soft print as white.

**What changed**
- Planner (`planner.tsx`, `planner.module.css`): shared tool header with switcher (`aria-current`); gate card without photo; catalogue-unavailable state with Try again (UI only, re-calls `getCatalogue()`); inline "Plan your party" setup card (dialog kept for edits via "Edit guests and budget"); two-column build view, pill categories, one toolbar, product rows with ADD → stepper, plan panel with budget hero, mobile bottom bar and plan sheet; paper receipt shared with print; layout-matched skeleton.
- Find My Drink (`app/find-my-drink/`): header, gate and states; search-first listing with segmented type control, filters (sheet below 800px, aside above), "Use what I have" panel (Ready to make / One ingredient away), picks row with Pick for me, photo-tile grid; recipe detail with hero, spec chips, checklist + numbered method, full-screen cook view (`<dialog>`), related rail, print; skeleton overlays on client navigations (new `cook-view.tsx`, `description.tsx`, `header.tsx`, `icons.tsx`, `pending-overlay.tsx`, `skeletons.tsx`, `start-button.tsx`).
- Harnesses edited (each logged in the tracker): `planner-inventory-check`, `planner-redesign-check`, `design-polish-check`, `brewlist-tools-style-check` (inline setup card, category chips, plan-sheet budget edit, "Start making"/"Done"), `recipe-detail-check` (new Escape/focus-return assertions), `recipe-discovery-check` (rename). New `scripts/planner-tool-shell-check.cjs` (tool switcher, gate, setup, plan sheet auto-open on mobile only, receipt contrast, unavailable state + Try again).

**Checks** (final build, all exit 0): `tsc --noEmit`; `corepack pnpm build` (verify-deps warn); party-planner-check/-backend/-catalogue-server/-live-catalogue (read-only)/-suggest; planner-inventory/-redesign/-ux/-tool-shell; design-polish; brewlist-home/-tools-style; early-access; recipe-browse/-detail/-discovery (3 consecutive runs)/-metric/-pantry/-pantry-browser; home-design (server :3125). S11 audit (throwaway Playwright, outside the repo): 498 checks, 0 FAIL after C3 — text contrast, 44px targets (56px step nav), no overflow incl. 200% root font, keyboard walkthroughs with 2px focus, reduced motion, print emulation, accessibility-tree snapshots, smoke of `/`, `/party-planner`, `/find-my-drink`, `/find-my-drink/dn-cape-codder`. Landing and keep-file hashes unchanged (`output/.landing-hashes-s0.txt`). Logs `output/tool-redesign-v2/logs/`, screenshots `output/tool-redesign-v2/{before,after,s2..s11,c1..c3}/`.

**Open items**
- Planner: desktop plan panel shows about 2–3 lines at 1280×844 (height capped so the drag harness passes at 1440×844); mobile/tablet budget is only in the bottom bar and plan sheet; icon-only controls ((i), trash, Edit); the mobile receipt actions row is tall (~236px); CSS is layered (C1/C2/C3 blocks over older rules) and a consolidation pass is advisable. During C3 an executor edit deleted ~223 CSS lines and was restored from the C1 backup; checks pass but the pre-incident file could not be diffed.
- Find My Drink: pantry checklist is not categorised (`pantryVocabulary` has no category field); sticky ingredients not exercised on a long recipe; wake lock only tested headless; skeleton overlays appear on client navigations only (no skeleton on hard loads, filter chips or cross-tool links); streaming skeletons (`loading.tsx`/Suspense) were rejected because they broke `notFound()` 404s and no-JS rendering.
- `#a30038` (dark crimson, danger on light/paper surfaces) is pink-adjacent; left unchanged for owner review.
- Limits: no real screen reader; contrast audit covers text nodes only; 200% test is root font-size not browser zoom; headless Chromium only.
- Not started: B10, B11, B12.


### Party Planner hands-on UX review — 2026-10-13

Review only, requested by owner; no application changes. Read current progress and roadmap; inspected planner.tsx, actions.ts and catalogue-server.ts. Used existing production build S-Xpga5U5eRTVIJB1yj8C (no app files newer than BUILD_ID) in Chromium at 1280x844 and 390x844. Initial local server on :3125 failed catalogue loading after eligibility with generic "Unable to complete that request." Root cause not established; not evidence of a deployed outage. Continued on :3126 with existing scripts/fixtures/design-polish/mock-upstream.cjs and its legacy catalogue fixture, so product names/prices/category distribution are not live-data findings.

Exercised starting suggestion (20 guests, 5 non-drinkers, 4 hours, Rs 10000 -> 7 lines, 29 packs, Rs 9975 in fixture), guest/budget edits, mobile plan sheet, receipt, category-scoped search, filter dialog, category removal/Undo and reload. Confirmed: changing 20 to 40 guests preserves quantities without prominent warning; reload preserves list/guests/budget but resets non-drinkers to 0, length to 4 hours and mix to Balanced; budget-per-guest label "each" differs from receipt actual cost per guest. Desktop panel shows roughly 2 full lines before internal scrolling; mobile receipt action block occupies roughly 236px. Recommendations: clear stale-estimate notice and explicit regeneration, persist suggestion inputs, unambiguous cost labels, easier category/search navigation, compact receipt actions, and useful first-entry catalogue failure recovery. No horizontal overflow in inspected mobile state.

No fresh build/TypeScript suite (review and log entry only), real-device/screen-reader check, live price verification, export dispatch, backend modification, commit or deployment. Local review servers stopped after review.


### Party Planner setup and navigation UX plan — 2026-10-13

Created docs/party-planner-ux-plan.md from the owner conversation and prior hands-on review. Proposed scope: standalone required guests/budget setup; remove budget presets; isolate suggestions with explicit category choices and disclosed quantities; wrapping desktop categories and mobile/tablet picker; browse-only category navigation; cross-category search; persistent settings and stale-estimate notices; compact plan/receipt actions; consistent catalogue retry. Direct servings input and equal category allocation are proposed replacement rules, not approved implementation decisions. Plan includes file boundaries, legacy draft compatibility, sequential checkpoints and responsive/accessibility/production acceptance checks. No feature implementation, backend/dependency changes, commit or deployment. Planning verification: git diff --check; fresh build/type/browser checks deferred to implementation because only documentation changed.


### B12 guided discovery checkpoint 2 — editorial records, 2026-10-14

Read-only SQL on the configured catalogue project returned 50 published editorial-ready recipes (35 cocktails, 15 mocktails). Reviewed ingredients and preparation for all 50; discovery-audit.json records six-vocabulary taste tags, rationale, exact primary base/additional alcohol, version/date and source signatures. No occasion records are approved. Reviewed all 15 mocktail preparation/pantry paths: 11 supported, four unresolved (blood orange, fig, quick cranberry, vodka mocktail) remain excluded from new recommendations. Piña Colada uses the explicitly optional-rum-free path; Paloma uses the recorded vinegar/maple path, with visible guidance. Added eight pantry audits to the existing 17, covering all 11 supported mocktails; unresolved alternatives stay disabled. Existing 17 source signatures matched the current read after SQL-to-REST serialization. Stored non-personal recipe fixtures for reproducible checks. No remote writes. Assertion harness follows in checkpoint 3; Graphify/CLI checks remain blocked by terminal startup.
