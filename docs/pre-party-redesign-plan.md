# Pre-Party redesign: implementation plan

Status: **design approved by the owner, 2026-10-30. R1–R5 built; R6 pending.**

## What this replaces

The visual direction in `docs/socifer-product-plan.md` section 3 ("Jaipur After Dark") is superseded by the Pre-Party design system, along with the decisions that depend on it:

- D6: the magenta accent.
- D14: the Damion script face.
- The B12 note naming the Tool Night palette as the visual reference.

Functional contracts are **unchanged**:

- The early-access server action, with its validation, consent and insert-only behaviour.
- Party Planner logic: `model.ts`, `suggest.ts` and `catalogue-server.ts`.
- The Find My Drink guided contract in `docs/find-my-drink-guided-plan.md`.

This is a restyle and copy pass, not new backend work.

## Sources of truth

- **Design system (private artifact):** https://claude.ai/artifact/5ACGtEEdZn8wKknfZzZiUU. It holds the brand book, the writing rules, the 14 screen boards at 1440 and 390, and the components.
- **Handoff files in this repo (`docs/design/pre-party/`):**
  - `tokens.json` and `tokens.css`: three themes, `landing` (default), `tools` and `tools-dark`.
  - `components.css`: the reference CSS for every component, prefixed `sf-`.
  - `landing-prototype.html`: the approved responsive landing page. Open it straight from disk; it uses the stand-in photo in `public/images/nightlife`.
- **Copy:** use the boards and the prototype word for word. The writing rules are in the design system README under "Writing".

## Constraints

- No new runtime dependencies.
  - **Fonts:** Bricolage Grotesque and Manrope (both OFL) are added as local woff2 files in `app/fonts/`, loaded with `next/font/local` the same way Nunito Sans is today. Fetching the two font files needs owner approval at R1.
  - **Icons:** inline SVG; extend `app/find-my-drink/components/icons.tsx` rather than adding a library.
- Keep the existing CSS-module structure. Tokens go into `app/globals.css` as CSS variables under `[data-theme]`, mapped into Tailwind 4 `@theme inline` as the design system README shows.
- Theme:
  - The landing page uses `data-theme="landing"`.
  - Tool routes use `tools`, and switch to `tools-dark` under `prefers-color-scheme: dark`.
  - Print always uses `tools`, in black on white.
- Every checkpoint follows the AGENTS.md workflow:
  - `corepack pnpm build`, `node node_modules/typescript/bin/tsc --noEmit` and `git diff --check`.
  - A production smoke test, with screenshots at 360/390/768/1024/1440.
  - A progress-log entry.

## Checkpoints

| # | Scope | Files (main) | Acceptance |
|---|---|---|---|
| R1 | **Foundations.** Tokens and themes in `globals.css`; Tailwind `@theme` mapping; Bricolage Grotesque and Manrope via `next/font/local`; shared primitives (button, chip, stepper, field, choice card, sticker, arch, accordion, sheet); remove Damion and Nunito Sans once nothing uses them. | `app/globals.css`, `app/layout.tsx`, `app/fonts/*`, a new shared styles module | Token values match `tokens.json`; ₹ and tabular figures render; no visual regressions beyond fonts; build and tsc pass |
| R2 | **Landing, pre-launch.** Rebuild `/` to match `landing-prototype.html`: header and mobile menu, hero with arch photo, How it'll work, tools, For venues, launch-list form (same fields and action), Questions, Privacy, footer. | `app/page.tsx`, `app/home.module.css`, `app/mobile-menu.tsx` | Matches the prototype at all five widths; all six form states as on the board; early-access action untouched; LCP ≤ 2.5 s on the preview |
| R3 | **Tool shell and age check.** Tool header and footer, theme switching, age gate restyle with the inline error. | `app/tool-theme.module.css`, `app/find-my-drink/gate.tsx`, planner gate | Gate still remembered on device and works without JS |
| R4 | **Party Planner.** Set your party, Suggest my list, Build your list (category sheet, notices, both dialogs, summary bar), Ready for the shops, print layout, states. "How are quantities chosen?" copy as on the board. | `app/party-planner/planner.tsx`, `planner.module.css` | Logic and stored drafts unchanged (existing planner checks pass); 44/52px targets; print is black on white |
| R5 | **Find My Drink.** Entry, Guide me, Surprise me, Browse all (no-JS), Use what I have, recipe page, cook mode, skeletons and states. | `app/find-my-drink/components/*`, `finder.module.css` | Guided contract and no-JS browse unchanged; recipe checks pass |
| R6 | **Regression and copy pass.** Update the mocked harness scripts that assert old colours, fonts or strings; full accessibility, responsive and 200% text pass; Lighthouse mobile on the preview. | `scripts/*-check.cjs` | All harnesses pass against the new design; findings logged |

## Status

- **R1: done, 2026-10-30** (not committed). Differences from the table above:
  - Tokens are in a generated `app/tokens.css`, not edited into `globals.css`. Regenerate with `node scripts/pre-party-tokens.cjs --write`; `--check` fails on drift or if any text or border pair drops below AA.
  - The primitives are a global `app/ui.css` with `sf-` classes, imported in `app/layout.tsx` after `tokens.css`.
  - Nunito Sans and Damion stay until their last user is redesigned (Damion in R2, Nunito Sans when R4 and R5 land), then they are removed. R2 moved the two new fonts out of `app/layout.tsx` into `app/fonts.ts`; see R2.
  - Bricolage Grotesque ships at weights 700–800 with its optical size pinned at 48 (39 KB; the full axis range was 68 KB). Manrope ships at 500–800 (23 KB). Both include ₹ and tabular figures.
  - The Tailwind `@theme` mapping is not wired: the app never imports Tailwind in its CSS, and importing it would add its reset to the existing pages. Add it only if a later checkpoint adopts Tailwind utilities.
  - Nothing sets `data-theme` yet, so existing pages are unchanged. R2 sets it (`landing` on `/`); R3 sets it on tool routes.
  - Headings inside a `[data-theme]` element take the theme text colour, because `globals.css` still colours every heading plum. Remove that old rule in R2 or later when nothing needs it.

- **R2: done, 2026-10-30** (not committed). `/` now follows `docs/design/pre-party/landing-prototype.html`. Things the next checkpoints rely on:
  - **Fonts are per page.** `app/fonts.ts` exports `bricolage` and `manrope`. A themed page puts `${bricolage.variable} ${manrope.variable}` on its root element next to `data-theme`, and imports `app/fonts.ts`; that is what makes next/font preload the files on that route only. The font stacks in `tokens.css` moved from `:root` to `[data-theme]` so they resolve on that element. R3–R5 do the same on the tool routes; when every page uses them, they can move back into the layout.
  - **Sizes are `rem`.** R1's `ui.css` used `px` for text although the brand book says `rem`; R2 converted font sizes and line heights in `ui.css`, `home.module.css` and `form.module.css`. Headlines are also capped by viewport width (`min(…, 14.5vw)`), so a 200% text setting cannot push them off a 320–390px screen.
  - **Old global rules fought the new page.** `globals.css` has `footer { display: flex }`, `section[id] { scroll-margin-top }` and an orange focus ring. R2 overrides them in `home.module.css` and removed the landing-only `#privacy, #responsible-use` scroll rule. The rest of the old landing rules in `globals.css` (hero, planner, steps, buttons and so on) are now unused by any page and can be deleted in R6.
  - **Menu and header.** The link row and "Get launch updates" button show from 1024px; below that the existing `MobileMenu` (a `<details>`, closes on link tap and on Escape, returns focus) shows as a ≡ button. The design brief said 768px; at 768 the row does not fit, so it is 1024px (same as before).
  - **Form.** Same fields, same server action, same consent sentence and `early-access-v1`; only markup and styles changed (chip-styled checkboxes, choice cards, error text with "!" and a border, a "Try again" button label after a server error). Visible labels follow the design: "Email", "Drinks" with Undecided / Alcoholic / Non-alcoholic / Both.
  - **Copy changed from the prototype, on purpose.** (1) What will it cost? now says pricing and fees are not decided yet (the prototype said venues set prices, which is not decided, D11). (2) Who confirms? says "The venue will", in the future tense. (3) The privacy note keeps its original text, which names Supabase and every field stored; the prototype's version added an unsubscribe-link promise that nothing backs yet. (4) The consent checkbox keeps its original sentence, because the stored consent version `early-access-v1` refers to it; the prototype's shorter "Email me launch updates" would need a new consent version, which is a backend change.
  - **Still open on this page.** The page `<title>` and meta description in `app/layout.tsx` still use the old tagline "Good Times Start Here". The hero photo is still the stand-in (Wendy Wei, Pexels 1190298), credited in the footer. `club-crowd.jpg` and `cocktail.jpg` are no longer used by any page.

- **R3: done, 2026-10-30** (not committed). Tool shell and age check on both tool routes. Things R4 and R5 rely on:
  - **Shell.** `app/tool-shell.tsx` exports `ToolHeader`, `ToolFooter` and `toolRoot` (the `sf` class, the two font variables and the focus ring and skip-link styles from `tool-shell.module.css`). A tool root is `<div className={`${styles.shell} ${toolRoot}`} data-theme="tools">`. Importing it imports `app/fonts.ts`, so the two faces preload on the tool routes only.
  - **Theme.** `app/tool-theme.module.css` keeps the old `--tool-*` names but now reads them from the tokens (`--tool-night` is `--bg`, `--tool-accent` is `--accent`, and so on), so the Planner and Find My Drink content follows the light and dark `tools` theme with no layout change. R4 and R5 move their styles onto the token names and can then delete this file. The paper receipt values stay literal. Print resolves to the light theme through `tokens.css`; the print-only receipt div carries its own `data-theme="tools"` and the font classes.
  - **Header and footer.** Wordmark `socifer`, nav "Plan a party" / "Find a drink" (same words as the landing page), and "Saved on this device · no account needed" from 768px up (the board shows it on mobile instead of the nav; the nav stays on mobile so people can still switch tools). The footer is new: Home, both tools, Privacy and Responsible use (both link to the landing page anchors) and the adults-only line. Both are hidden in print. "Jaipur prices" is gone from the Planner header; the price label still shows where prices do.
  - **Planner structure.** The root is now a `div`; `<main>` wraps the heading and `#planner-content` only, so header and footer are real landmarks. Dialogs stay inside the root.
  - **Age check.** Shared `app/age-check.tsx` (+ `age-check.module.css`) on the `.sf-age` card: large tool name, "One quick check first.", the choice card, Continue, "No thanks, take me home". Continue is now always enabled; pressing it unticked shows "! Tick the box to continue", a red border, `aria-invalid`, and moves focus to the checkbox. The h2 is still the focus target in the Planner. Each tool keeps its own confirm call and Continue label ("Continue" in Find My Drink, "Continue to planner" or "Continue your list" in the Planner).
  - **Copy changed from the board, on purpose.** The board's note "You'll only see this once on this device" is "We'll remember this on this device for 30 days.", because the cookie `allcheers_eligible` lasts 30 days.
  - **Not true yet: "works without JavaScript".** The gate has always needed JavaScript to pass (a client-side button calling the `confirmEligibility` server action; the Planner is a client-side step machine). R3 did not change that. Once passed, the cookie is read on the server, so Find My Drink's list, detail and no-JS browse work without JavaScript. Making the gate itself a plain form needs a form-action wrapper around `setEligibility`; that is a small backend-adjacent change and is left for the owner to approve.
  - **Nunito Sans removed.** Nothing uses it any more: the layout font, `globals.css` body font (now Arial for unthemed pages such as the 404) and `app/fonts/NunitoSans-*` with its OFL text are gone.
  - **Old rules removed.** The tool-header, logo, tool-nav, gate-card and old focus-ring rules in `finder.module.css` and `planner.module.css`. Content styles are untouched except the font family, which is now Manrope.

- **R4: done, 2026-10-30** (not committed). Party Planner content on the tokens and `sf-` primitives. `planner.module.css` is rewritten and no longer composes or reads `tool-theme.module.css` (Find My Drink still does until R5). Things R5 and R6 rely on:
  - **Structure.** New `Stages` indicator (Set your party, Build your list, Ready for the shops; Party, List, Shops under 768px) above each step. Setup is guests, budget, then a "How do you want to start?" radio pair and one Continue (same `finishSetup` call as the old two buttons). Visible step headings are h2s; the sr-only h1 "Party Planner" stays. Receipt, dialogs and states follow the boards. Under 1024px the category index is the existing picker and sheet, the plan is a sheet behind the summary bar; from 1024px the index, shelf and plan panel are three columns.
  - **Copy changed from the boards, on purpose.** (1) Not drinking and Drinks each stay on the Suggest step, not on Set your party, because they are only needed for a suggestion and the validation order is unchanged. (2) Field errors keep their real limits ("Enter a whole number from 1 to 1,000.", the ₹0.01–₹10,00,000 range) instead of the board's shorter "Up to 1,000 guests". (3) The receipt keeps the full price caveat ("Estimated from our Jaipur catalogue. Store prices and availability may differ.") next to the board's "Listed price in Jaipur, checked 3 Oct 2026. Not a guaranteed price.", and shows "Over budget by ₹X" when it applies. (4) The Replace dialog says "You can undo right after", which is true (the toast has Undo). (5) The category sheet is kept on mobile instead of the board's chip rail; the board shows both. (6) The party card ("24 guests · 4 not drinking") is not built; the budget card has an Edit button for guests and budget, and a not-drinking count is not part of the plan.
  - **Receipt.** Prices show whole rupees (₹11,520) and keep paise when they exist. The paper-receipt colours are gone: the receipt is a surface card, and the print-only copy is forced to black on white. Copy, Share, Print / Save as PDF, Edit list and Start a new plan are all visible now (the "More options" disclosure is gone).
  - **Not done.** The estimate chip and the party card are not rendered. The unavailable state and the print preview were checked as CSS only (see the progress log).

- **R5: done, 2026-10-30** (not committed). Find My Drink content on the tokens. `finder.module.css` is rewritten on the token names (no `--tool-*` names), and **`app/tool-theme.module.css` is deleted**: neither tool uses it any more. Behaviour, URL parameters, the guided contract, recipe data and filtering are unchanged. Things R6 relies on:
  - **Entry.** Four route cards: Guide me (marigold), Surprise me, Browse all, Use what I have, under "Your next recipe starts here" and "{n} cocktails and mocktails." (n is the real count). The old top row (Guide me / Surprise me / Browse recipes) is replaced by "← All ways to find a drink" on every other screen. Use what I have links to Browse all with `#use-what-i-have`; the existing panel opens when that hash is present.
  - **Guide me.** Stage bar Type / Taste / Results, type as three choice cards (Cocktail, Mocktail, Both), tastes as chips with Any, "Show drinks" / "Skip" / "Back". Results show "A few good choices", a summary line, "Edit preferences" (full-screen sheet under 1024px, panel beside the results from 1024px) with Cancel / Apply, and "Cocktails" and "Mocktails" sections. Labels are now Cocktail / Mocktail / Both instead of Alcoholic / Non-alcoholic / Both for a group.
  - **Surprise me.** Heading "Surprise me", "What kind of drink?", then the card, "View recipe" and "Pick for me", with "No repeats until you start again." "Start again" appears only once every recipe of that type has been seen, as before.
  - **Browse all.** "All {n} recipes", search, type chips, filters (links, so it works without JavaScript), active chips with ✕ and "Clear all", "Next recipes (N more)". Under 800px the Filters button opens a bottom sheet titled "Filters" with "Clear all" and "Show N recipes"; Escape closes it and focus returns to the button (this return is new: the native dialog only did it when the button had focus).
  - **Recipe page and cook mode.** Back link "← Back to results", 4:5 hero from 1024px, spec chips kept, numbered steps, "Source & recipe context", "More like this". Cook mode is plum in every theme, with a ✕ close button, "Step n of N", Keep screen awake, View all steps, Previous / Next / Done; Escape closes it and focus returns to Start making.
  - **States.** Unavailable is "Recipes are temporarily unavailable / Check your connection, then try again." with a Try again button. Skeleton bones use the Planner's sweep, static under reduced motion.
  - **Copy changed from the boards, on purpose.** (1) No "Both" in Surprise me, and no Continue button in Guide me (choosing a type moves on, as before): both would change the guided contract. (2) Browse all keeps the "A few good choices" / Pick for me section above "All matches" because it is existing behaviour; the board shows only the grid. (3) Filters stay links that apply at once, not the board's Apply form (they already work without JavaScript). (4) Browse all has no page numbers: results use cursor paging, so "Next recipes (N more)" stays. (5) Use what I have stays a panel on Browse all, not its own page, and shows no "Other matches" group because the matcher has none. (6) The entry has no recipe grid under the cards. (7) Card facts show the stored method word as it is ("Build", "Shake"), not "Shaken". (8) The note under a mocktail section still says it is not a 0.0% claim, and the beer, champagne and "not in ingredient matching yet" notes are kept.
  - **Not done / not checked.** The unavailable and nothing-published states were checked as markup and CSS only (they need the catalogue read to fail). The Playwright scripts were updated for the new strings and pass `node --check`, but have not been run.

Not built in this pass: the launch state (Upcoming nights, Book a table) and the booking flow. Both are designed and wait for Phase 1 (B11).

## Open items

- **Hero photo (B2 / D12).** The stand-in is the concert crowd in `public/images/nightlife`. A quieter, licensed photo is still to be chosen: silhouettes, hands with glasses or a backlit doorway, ≤ 200 KB per crop.
- **Logo.** None. The wordmark is set in type.
- **Harness scripts.** Several scripts check the current design (for example `home-design-check.cjs` and `brewlist-tools-style-check.cjs`). Each checkpoint updates only the assertions its own pages change; R6 finishes the job.
