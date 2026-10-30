# Pre-Party redesign: implementation plan

Status: **design approved by the owner, 2026-10-30. Implementation not started.**

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

Not built in this pass: the launch state (Upcoming nights, Book a table) and the booking flow. Both are designed and wait for Phase 1 (B11).

## Open items

- **Hero photo (B2 / D12).** The stand-in is the concert crowd in `public/images/nightlife`. A quieter, licensed photo is still to be chosen: silhouettes, hands with glasses or a backlit doorway, ≤ 200 KB per crop.
- **Logo.** None. The wordmark is set in type.
- **Harness scripts.** Several scripts check the current design (for example `home-design-check.cjs` and `brewlist-tools-style-check.cjs`). Each checkpoint updates only the assertions its own pages change; R6 finishes the job.
