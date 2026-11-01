# Black Tie redesign: implementation plan

Status: **direction approved by the owner, 2026-11-01 (BT0). BT1–BT7 done; the redesign is built (not committed).** Still open: question 3 below (copy only). This plan supersedes `docs/pre-party-redesign-plan.md`.

## Owner decisions, 2026-11-01

1. **Black Tie and the Little Horns logo: approved.**
2. **Tool pages stay dark all the time**, but must not look black and white. There is no light tool theme. Inside the tools, photos show in full colour (the light is on once you're in), and cards keep the pink line on hover, focus and tap. The black-and-white photos with the light-bringer reveal are for the landing page.
3. **Showing the "light bringer" meaning in public copy:** not decided (see Open questions).
4. **Logo vector:** we redraw it here as SVG paths in BT2. No outside designer.

## Why

On 2026-10-31 the owner said the built Pre-Party design "doesn't look premium and happening". Four directions were researched and mocked (Velvet Room, Black Tie, Emerald Night, Deep Water). The owner chose Black Tie on 2026-11-01.

## What this replaces

Black Tie supersedes the Pre-Party look (plum and marigold, Bricolage Grotesque, rounded shapes) and the city-pink accent rule.

Functional contracts are **unchanged**:

- The early-access server action, with its validation, consent and insert-only behaviour, and the consent sentence for `early-access-v1`.
- Party Planner logic: `model.ts`, `suggest.ts` and `catalogue-server.ts`, and stored drafts.
- The Find My Drink guided contract in `docs/find-my-drink-guided-plan.md`, URL parameters and the no-JavaScript browse.
- Page structure and copy from the Pre-Party pass (R2–R5), including every "changed on purpose" decision logged there. This is a restyle, not a rewrite.

No new backend work.

## Sources of truth

- **Mockup canvas (private artifact):** https://claude.ai/artifact/GzCZwkJWVczG5T1cmUqC28
  - "Black Tie set": colour and type sheet, phone Planner and Find My Drink, light tool pages, the light-bringer hover demo, entry pass (future), social posts, wristband and stickers.
  - "Mockups": Black Tie landing (desktop and phone), Party Planner and Find My Drink.
  - "Logo ideas": the Little Horns logo sheet.
- **Research board:** https://claude.ai/artifact/WZ9tahzAwiaqiapeeZQc3f
- Handoff files (`docs/design/black-tie/`: tokens, logo SVGs) are written in BT1 and BT2 from the canvas.

## The design in short

- **Colour.** Black `#0a0a0b` page, smoke `#131315` / `#1a1a1d` surfaces, line `#2c2b2a`, strong line `#6f6a64`, bone `#eee8df` text, muted `#a7a097`, champagne `#d9c29c` for labels and small details, rani pink `#ff2d87` (text on it: black).
- **One rule.** Rani pink appears once per screen, on the main action, plus the O in the logo. Links that need pink use `#ff5aa0` on dark and `#b80d58` on light.
- **Tools are dark too** (owner decision 2). The light tool boards on the canvas are dropped.
- **Type.** Headings in Archivo ExtraBold at its widest (`font-stretch: 125%`), in capitals. Text stays Manrope.
- **Shape.** Square corners everywhere. No shadows. The only gradients are the fades over photos.
- **Photos.** On the landing page and in marketing: black and white (greyscale, a little extra contrast, slightly darker), brought to colour by the light-bringer hover. In the tools: full colour.
- **Logo.** "Little Horns": wide capitals SOCIFER, where the O is a rani-pink ring with two small horns. The horned O alone is the app icon and favicon.
- **Light-bringer hover.** The name says it: Lucifer means "light-bringer". Photos are black and white until the visitor brings light to them:
  - On the landing hero, a soft circle of full colour follows the cursor.
  - Landing cards turn to colour on hover and keyboard focus, and a thin pink line slides in at the bottom. On touch screens they turn to colour as they scroll into the middle of the screen.
  - Tool cards (recipes, products) are already in colour; they keep the pink line on hover, focus and tap.
  - The main button gets a soft pink glow on hover and focus.
  - Under `prefers-reduced-motion`, the colour still changes but without the fade. The hero circle stays on (it only moves with the visitor's own mouse) but appears without growing (changed in BT4: the first version switched it off, which hid it from everyone with animations turned off in Windows).

## Constraints

- No new runtime dependencies.
  - **Fonts:** Archivo (OFL) is added as a local woff2 in `app/fonts/` and loaded in `app/fonts.ts` with `next/font/local`, like Bricolage Grotesque today. Subset to Latin plus ₹, keep the width and weight axes only for the range used (wdth 125, wght 700–800). Fetching the font file needs owner approval in BT1.
  - **Hover effects:** plain CSS (`filter`, `mask-image`, transitions) plus one small client component for the cursor position and the scroll-into-view trigger (`IntersectionObserver`). No animation library.
- Keep the token pipeline from R1: regenerate `app/tokens.css` from a tokens file with a script, and keep the `--check` contrast gate. Keep the `sf-` primitives in `app/ui.css`; restyle them, don't rename them.
- Themes: `landing` and `tools`, both dark. `tools-dark` and the tool routes' `prefers-color-scheme` switch are removed. Print is black on white.
- Every checkpoint follows the AGENTS.md workflow:
  - `corepack pnpm build`, `node node_modules/typescript/bin/tsc --noEmit` and `git diff --check`.
  - A production smoke test, with screenshots at 360/390/768/1024/1440.
  - A progress-log entry in `docs/implementation-progress.md`.

## Checkpoints

| # | Scope | Files (main) | Acceptance |
|---|---|---|---|
| BT0 | **Owner approval.** Owner picks Black Tie, approves the logo direction and the light-bringer hover, and approves fetching Archivo. Update AGENTS.md "Scope and design" to point here. | `AGENTS.md`, this file | Done 2026-11-01 |
| BT1 | **Foundations.** New `docs/design/black-tie/tokens.json` and a generator (or a `--palette` option on `scripts/pre-party-tokens.cjs`) writing `app/tokens.css` for the two dark themes. Archivo in `app/fonts.ts` replacing Bricolage Grotesque. Restyle `app/ui.css` primitives: square corners, caps headings, chips, steppers, fields, sheets, accordion. Remove Bricolage Grotesque and its OFL file once unused. | `docs/design/black-tie/*`, `scripts/*-tokens.cjs`, `app/tokens.css`, `app/fonts.ts`, `app/fonts/*`, `app/ui.css` | Token values match the canvas; contrast check passes in all three themes, including pink links; ₹ and tabular figures render in both faces |
| BT2 | **Logo and icons.** Redraw the Little Horns logo here as SVG paths (not a font plus overlay), owner decision 4. Ship the wordmark as an inline SVG component, the horned O as `app/icon.svg`, `public/favicon.ico` and an Apple touch icon. Replace the type-set wordmark in the landing header and footer and the tool header. | `app/logo.tsx` (new), `app/icon.svg`, `public/favicon.ico`, `app/page.tsx`, `app/tool-shell.tsx` | Logo reads at 16px; accessible name "Socifer"; no layout shift in the headers |
| BT3 | **Landing.** Restyle `/` to the Black Tie landing boards: full-height black-and-white hero photo with the fade, caps headline, pink "Join the list", numbered steps with rules, tool cards with photos, bone "For venues" band, launch-list form, footer. Copy unchanged. | `app/page.tsx`, `app/home.module.css`, `app/early-access/form.module.css`, `app/mobile-menu.tsx` | Matches the boards at all five widths; form states and server action unchanged; LCP ≤ 2.5 s on the preview |
| BT4 | **Light-bringer hover.** A `LightBringer` client component for the hero (cursor circle of colour via `mask-image`) and a shared `.sf-lit` card treatment: black and white to colour plus the pink line on the landing; pink line only on tool cards, which are already in colour. | `app/light-bringer.tsx` (new), `app/ui.css`, card components | Works with mouse, keyboard and touch; off or instant under reduced motion; no jank (no layout or React re-render per mouse move on cards) |
| BT5 | **Tool shell and Party Planner.** Tool header and footer with the new logo; Planner in the dark `tools` theme: stages, setup, suggest, build (index, shelf, plan panel, summary bar on phones), ready for the shops, dialogs, receipt and print. Pink only on the main action of each step. | `app/tool-shell.*`, `app/age-check.*`, `app/party-planner/planner.module.css` | Logic and drafts unchanged; 44/52px targets; print black on white |
| BT6 | **Find My Drink.** Entry, Guide me, Surprise me, Browse all, Use what I have, recipe page, cook mode, states, in the dark `tools` theme. Recipe photos in full colour with the pink-line card treatment. | `app/find-my-drink/finder.module.css`, `app/find-my-drink/components/*` | Guided contract and no-JS browse unchanged; recipe checks pass |
| BT7 | **Regression and copy pass.** Update the harness scripts that assert Pre-Party colours or fonts; 200% text and 320px pass; contrast scan in all themes; update `<title>`, meta and the 404. Retire `docs/design/pre-party/` to a "superseded" note. | `scripts/*-check.cjs`, `app/layout.tsx`, `app/not-found.*` | All harnesses pass; findings logged |

## Status

- **BT0: done, 2026-11-01.** Owner decisions above; Archivo fetch approved the same day.
- **BT1: done, 2026-11-01** (not committed). Things the next checkpoints rely on:
  - **Tokens.** `docs/design/black-tie/tokens.json` → `app/tokens.css` via `node scripts/design-tokens.cjs --write` (`--check` fails on drift or any pair below AA). The script is the old `pre-party-tokens.cjs`, renamed. Token names are unchanged so every page still resolves; `landing` and `tools` hold the same dark values, `tools-dark` and the `prefers-color-scheme` switch are gone, print is black on white. One new token, `--detail` (champagne), for eyebrows and small details. `highlight` is now bone (selected chips, current stage), `city` is bone with black text (For venues). Radius tokens are all `0px`; shadows are a 1px `line` edge.
  - **Fonts.** `app/fonts/Archivo-latin.woff2` (20 KB, OFL in `OFL-Archivo.txt`): fontTools instance pinned to `wdth 125`, weights 700–800, Latin + ₹. So any `--font-display` text is wide; capitals still need `text-transform: uppercase`. `app/fonts.ts` exports `archivo` (variable `--font-archivo`) instead of `bricolage`; the Bricolage files are deleted.
  - **Primitives.** `app/ui.css`: 1px control borders, `.sf-display`, dialog and sheet titles, recipe and event card titles and the age-check mark in capitals; eyebrow and sticker in champagne, the sticker no longer tilted; chips and secondary buttons get a bone border on hover; the summary bar's main button is pink (it was marigold) and its status colours use tokens.
  - **Whole site changed colour at once.** Unlike Pre-Party R1, every page already sets `data-theme`, so the new tokens re-skin everything now. Headings on pages are wide but not yet in capitals, and the landing still shows pink twice (header and hero buttons). BT3, BT5 and BT6 fix those per page.
  - **Contrast fix pulled forward (BT1).** The landing tool cards and For venues photo used a plum wash and a marigold card; with the new tokens the Party Planner card text was hard to read. `home.module.css` now uses a black wash and the `surface-raised` card. Comments in `home.module.css`, `planner.module.css` and `finder.module.css` still say plum and marigold; they are rewritten in BT3/5/6.
- **BT2: done, 2026-11-01** (not committed). Things the next checkpoints rely on:
  - **Logo component.** `app/logo.tsx` exports `Wordmark` and `LogoMark`, inline SVG with no font dependency. Letters fill `currentColor`; the horned O fills `var(--accent, #ff2d87)`, so it turns black in print. Pass `label={null}` when the surrounding link already has an accessible name (the headers do: "Socifer home"); otherwise the SVG is `role="img"` named "Socifer".
  - **How it was drawn.** The letters S, C, I, F, E, R are Archivo at wdth 125, wght 800, converted to outlines with fontTools. The O is a drawn ring as thick as the I stem, with two horns from the mockup, and 36 units of extra space either side. The generator lived in the session scratchpad; the outputs are the source of truth now: `app/logo.tsx` and `docs/design/black-tie/logo-wordmark-dark.svg`, `logo-wordmark-light.svg`, `logo-mark.svg`.
  - **Sizes.** Header and footer logo is 16px tall under 768px (107px wide) and 22px from 768px on the tools, 1024px on the landing page.
  - **Icons.** `app/icon.svg` (pink horned O on black), `app/apple-icon.png` (180px) and `public/favicon.ico` (16, 32 and 48px PNGs) replace the Pre-Party S. Next adds the `icon` and `apple-touch-icon` links itself.
  - **Not swapped.** The Planner's print-only brand line (`printBrand` in `planner.tsx`) is still the text "socifer"; it changes in BT5 with the receipt.
  - **Tool header at 320px** wraps the nav onto a second row (header 89px tall). At 360px and up it fits on one row.
- **BT3: done, 2026-11-01** (not committed). Landing page restyled; copy unchanged. Things the next checkpoints rely on:
  - **Pink once per screen.** The hero's Join the list is the only pink button on the first screen; the header button is now secondary (bone outline). The mobile menu keeps its pink Join the list (only the menu is visible when open). The Find a drink link and the FAQ "+" signs are no longer pink (the "+" is champagne, in `ui.css`). The form's submit button stays pink: it is the one action on that screen.
  - **Type.** `.h1`, `.h2`, `.h3`, tool titles, the form's success heading and the mobile-menu links are Archivo in capitals. The hero headline is `min(2.75rem, 11.5vw)` on phones, `min(3.5rem, 7vw)` from 768px, `min(clamp(3.5rem, 6vw, 6rem), 7vw)` from 1024px; it fits at 320px and at 200% text.
  - **Photos are black and white** (`filter: grayscale(1) contrast(1.15) brightness(.85)`) in the hero and on the tool cards. BT4 brings the colour back on hover.
  - **Tool cards** are now a photo strip on top and the text, preview and link below on a smoke card with a 1px line (`.toolBody`). The `toolYellow` / `toolPlum` classes are gone.
  - **How it'll work** steps have champagne numbers and 1px rules.
  - **For venues** is a bone band with black text and a black Mail us button. Its background photo is removed, so `public/images/nightlife/club-1200.{avif,webp}` are no longer used by any page.
  - **Harness updates.** `brewlist-home-check` expected one image and five menu links; the page has had three images and four menu links since the 2026-10-31 design review, so both counts were stale and are updated. `design-polish-check` now expects the pink icon colour.
  - **Not done.** The `planner.module.css` and `finder.module.css` comments still describe Pre-Party (BT5, BT6).
- **BT4: done, 2026-11-01** (not committed). Things the next checkpoints rely on:
  - **`app/light-bringer.tsx`** (client, renders nothing). It wires up `[data-light-hero]` (mouse or pen position written to `--lx` / `--ly` with `requestAnimationFrame`, plus `data-lit`; no React re-render per move) and, on `(hover: none)` screens, `[data-light-card]` (an `IntersectionObserver` sets `data-lit` while the card is in the middle 30% of the screen). Put `<LightBringer />` once on any page that uses either attribute.
  - **Hero.** A second `<picture>` (`.heroLight`, same sources, so the browser fetches one file) shows the photo in colour, masked to a circle (`@property --lr`, 0 → 240px over .4s). It carries the same gradient as the black and white layer, so the text keeps its contrast.
  - **Cards.** `.sf-lit` in `ui.css`: the image is black and white until hover, keyboard focus or `data-lit`, then full colour, and a 3px pink line scales in along the bottom. Used on the two landing tool cards. BT5 and BT6 use the pink line on tool cards whose photos are already in colour (they need a variant without the grayscale).
  - **Button glow.** `.sf-btn--primary:hover` has a soft pink glow. Focus keeps the usual ring (the page's focus rule wins over the glow).
  - **Harness.** `brewlist-home-check` now expects four `main img` (the hero's colour copy is the fourth).
- **BT5: done, 2026-11-01** (not committed). Tool shell, age check and Party Planner on Black Tie; logic, copy and stored drafts unchanged.
  - **Built on unlogged Planner edits.** Before BT5 the working tree already had uncommitted, unlogged changes to `planner.tsx` and `planner.module.css` (not from this redesign): the plan lives in the bottom bar and its sheet at every width (the desktop plan panel is hidden), the bar floats centred from 1024px, the suggestion opens the sheet on every width, the "What you'll get" aside is gone, Set your party is centred, and some copy is shorter. BT5 keeps them as the current state.
  - **Pink.** One pink action per screen: Continue (setup), Generate list, View plan (the bar's button was bone), Review list (in the sheet), Share list. Link buttons ("Suggest my list", "Start a new plan", product "Remove") are bone and underlined instead of pink. The primary button has the pink hover glow.
  - **Type and detail.** Step headings and dialog titles are Archivo capitals, sized to fit 320px; plan group labels and receipt labels are champagne. All 1.5px borders are 1px. The over-budget meter and the bar's status colours use `--error` / `--success` instead of Pre-Party literals; the skeleton sweep is dimmed for the dark ground.
  - **Print.** The printed list's brand line is the SVG `Wordmark` (black, the O black too in print) instead of the text "socifer".
  - **Product rows** have no photos (bottle icons), so the `.sf-lit` pink line is not used there.
  - **Harness drift, fixed 2026-11-01 (owner chose to keep the bar-and-sheet layout).** `design-polish-check`, `planner-ux-production-check`, `planner-inventory-check`, `planner-tool-shell-check` and `brewlist-tools-style-check` were written for the desktop plan panel. They now open the plan sheet ("View plan") to read or change the list and close it ("Close plan") to use the shelf, expect the sheet to open after Generate list at every width, and check that Review list can be reached inside the sheet at 1280×844 and 1440×500. All five pass.
  - **Lost with the panel: drag to add.** Dragging a drink onto the plan only worked on the desktop panel, which the bar-and-sheet layout hides, so it can no longer be done. The drag code in `planner.tsx` is still there. `planner-inventory-check` no longer tests drag or foreign drops; it adds with the keyboard and the sheet's + button instead. Bringing drag back would need a drop target on the bar.
- **BT6: done, 2026-11-01** (not committed). Find My Drink on Black Tie, CSS only (`finder.module.css`); components, copy, the guided contract and no-JS browse unchanged.
  - **Pink.** The main action per screen: Next in Guide me, the search button, View recipe, Start making, Next in cook mode (was bone), Show N recipes in the filter sheet. Back links, Clear all and More are bone and underlined; match reasons, the source "+" and links are no longer pink.
  - **Type and detail.** Headings, recipe card names, the cook-mode recipe name and step text are Archivo capitals; card names scale with the screen (`min(1rem, 4.4vw)`) and entry route titles (`min(1rem, 4.2vw)`, whole words only) so wide capitals fit 320px. Eyebrows, chip labels, spec chip labels, the type line, spirit facts, step numbers (01, 02… in a square) and the cook step counter are champagne. Borders are 1px; spec chips, the pantry panel and the filter fallback get a 1px line; choices and ticked ingredients get a 3px bone edge.
  - **Cards.** Recipe photos stay in full colour. A 3px pink line scales in under the photo on hover or keyboard focus, and under the entry route cards on hover or focus. Done in `finder.module.css`, not with `.sf-lit` (that greys the photo), and not on touch scroll: a grid of cards would light several at once.
  - **Fixed in passing.** The open state of "Source & recipe context" showed a stray control character and "2" (a mangled minus sign); it is now a minus. The uncommitted centring edit (`margin-inline: auto` on `.entry`, `.guideSetup`, `.stages`, `.guideRandom`) shrank those grid items to their content, so the six-step quiz bar collapsed on phones with "Start" stacked one letter per line; they now also have `width: 100%`.
  - **Harness.** `recipe-detail-check` and `recipe-guided-browser-check` read rendered text, which is now in capitals; their name checks ignore case or read `textContent`.
  - **Metric note restored (owner, 2026-11-01).** An uncommitted, unlogged edit to `detail.tsx` (not from this redesign) had removed "Metric amounts are approximate. Where a conversion is unclear, the original unit is shown." The owner chose to keep it, so it is back under the ingredient checklist whenever a line was converted or unclear. That edit's shorter source copy is kept. `recipe-detail-check` passes.
- **BT7: done, 2026-11-01** (not committed). Regression and copy pass.
  - **Every check run.** All browser and logic checks pass on the final build: the seven Planner browser checks, the six recipe browser checks, `home-design-check`, `brewlist-home-check`, `early-access-check`, `booking-check`, `spirit-check`, the Planner and recipe logic checks, `recipe-browse-check`, `recipe-metric-check` (live, read-only) and `design-tokens --check`. Not run: `party-planner-backend-check`, `party-planner-catalogue-server-check` and `party-planner-live-catalogue-check`, which use the backend keys; no backend code changed.
  - **Harness updates.** `planner-redesign-check` was the last check written for the desktop plan panel; it now opens the plan sheet for Edit guests and budget, Review list and Remove/Undo. `brewlist-tools-style-check` expects Archivo (not Bricolage) as a heading font; the `brewlist-home-check` header comment names Black Tie.
  - **Audit.** A one-off script loaded the landing, Planner, Find My Drink entry and browse, and the 404 at 320/390/1280/1440px, at 200% text at 390 and 1280, and in print: no sideways scroll, no page errors, and every text pair on a solid background meets AA (4.5:1, 3:1 for large text). Text over photos (the hero, under the colour circle) was not sampled.
  - **Title and meta.** The site title is "Socifer | Jaipur nights, booked" (the landing headline; it was the slogan "Good Times Start Here"). `app/layout.tsx` now sets `theme-color` #0a0a0b and `color-scheme: dark`, so the browser bar and built-in controls match.
  - **404.** Archivo capitals title, champagne 404, one pink action. `.sf-btn--ghost` in `ui.css` is now bone and underlined instead of pink text, because both places that use it (the 404 and the age check's "No thanks") sit beside the pink main button.
  - **Pre-Party retired.** `docs/design/pre-party/SUPERSEDED.md` and a banner on `docs/pre-party-redesign-plan.md` point here; the files are kept for reference. AGENTS.md no longer says the code shows Pre-Party.
  - **Still open.** Owner question 3 (say the light-bringer meaning or not); desktop drag to add in the Planner (BT5); `club-1200` images unused since BT3; licensed Jaipur photos (D12).

## Not in this plan

- **Entry pass and booking screens.** The pass on the canvas shows the future look; it is built with the booking flow in Phase 1 (B11).
- **Social posts, wristband and stickers.** Brand material for the owner, not website code.
- **Photos.** The stand-in Unsplash photos work in black and white for now. Licensed Jaipur photos (D12) are still to be chosen; colour photos are needed because the hover reveals colour.

## Open questions for the owner

Questions 1, 2 and 4 are answered above. Still open:

- **Saying the meaning out loud.** "Socifer" comes from social + Lucifer, and Lucifer means "light-bringer". Should the site or brand material ever say that, for example a "Light bringer" sticker or one line on an About page? Or should the meaning stay hidden in the logo and the hover, for people to notice on their own? This changes copy only, not the build.
