# Brewlist tools redesign — approval checkpoint

Status: approved by owner, 2026-10-08. Implementation authorized sequentially: Planner, then Finder. This document supersedes conflicting tool styling in historical design plans; the current homepage remains unchanged.

## Recommended direction

Make the tools feel like the practical part of Brewlist's nightlife experience: compact near-black navigation, warm off-white working surfaces, clear Nunito Sans typography, fine rules, and burnt-red actions. Photography supplies context only where it is useful and honest. Product identity, recipe facts and the next task take priority over decorative imagery.

Party Planner becomes a catalogue beside an always-visible plan on desktop, with an accessible selected-items sheet on mobile. Find My Drink becomes a compact browse surface with prominent search and type navigation, a visible ingredient-matching entry point, and recipes leading directly into ingredients and preparation. These are structural changes, not another colour refresh.

## Evidence and current capabilities

Read `AGENTS.md`, `docs/agent-workflow.md`, the latest implementation checkpoints, `app/home.module.css`, the planner view/model, Finder route parsing, query types, browse/discovery/pantry/card/image/detail/making/community/auth/saved/gate components, and the existing tools smoke harness. Historical `docs/find-my-drink-ux-direction.md` and `docs/brewlist-redesign-plan.md` are contextual only: their earlier plum/serif and blue/condensed directions are superseded.

The in-app browser was unavailable after documented discovery; local rendering used the repository's existing isolated Playwright harness. The original `scripts/brewlist-tools-style-check.cjs` passed against BUILD_ID `o7PeQDJcztQejgFQUNpzA`. No file under `app/` or `public/` was newer than that artifact at inspection. A temporary companion retained the same synthetic fixtures and blocked external requests, added homepage and 360/768px captures, and also passed. This is current-artifact research evidence, not verification of the proposed redesign. No application or tracked harness was changed, and no real backend writes occurred.

Inspected screenshots at 1440 and 390px for planner, Finder and recipe detail, plus planner at 768px and Finder at 360px. Evidence is in `%LOCALAPPDATA%/Temp/opencode/brewlist-tools-*.png` and `brewlist-tools-research-*.png`. The first homepage captures were too early; the companion was rerun with an explicit loaded-image check. Its replacement 1440px and 390px captures were visually inspected: crowd photography, near-black overlay, normal-width Nunito Sans heading, off-white text, red CTA and restrained navigation match the source. The rerun passed.

### Party Planner audit

- `/party-planner` is a client workflow: eligibility confirmation and catalogue load, build, server-validated review, then optional authenticated save. There is no checkout.
- Guests and budget already exist in a dialog, including presets. Draft data uses the existing local-storage key and must retain compatibility. Guest count does not calculate consumption or quantities.
- Category selection also includes that category in the draft; removing a populated category removes its items and offers Undo. Search, brand, pack-size and within-budget filters are scoped to the active category. Pagination reveals another bounded set of products.
- Product controls support Add, increment/decrement and typed quantities (1–1,000), explicit over-budget addition, desktop drag/drop, unavailable-product removal and changed-pack review. Preserve the exact one-pack affordability calculation, including exclusion of the product's current line cost.
- Review uses server validation. Saved plans retain immutable price snapshots until explicit Edit & reprice and save; stale-update/conflict handling is part of the existing action contract. Preserve sign-in, OTP/resend behavior, private saved-plan list, deletion confirmation, sign-out, print/PDF, copy fallback and native sharing.
- Rendered problems: desktop hides selected items behind a floating pill despite ample width; the guest count itself is not visible in the budget line; introductory content and the separate toolbar push products down; mobile rows repeat a desktop drag hint and spend considerable space on each Add control. Selected-list quantities currently require returning to catalogue cards to edit. In the inspected scrolled mobile/tablet state, the sticky toolbar covered the top of the category rail; treat this as a specific observed focus/scroll risk to address and test.

### Find My Drink audit

- `/find-my-drink`, `/find-my-drink/[id]` and `/find-my-drink/saved` share eligibility/session behavior. No new authentication is needed to browse after the existing eligibility gate.
- URL state includes `q`, `drink`, repeated `type`, `method`, `max`, `pick`, `cursor`, and safe detail `from` links/anchors. Search covers recipe name or ingredient text. Multiple spirits use OR; other facets combine. Recorded method and listed-ingredient-count filters are supported; taste/mood filters are not.
- Initial choices are existing featured/stable matches; Pick for me offers variety within the current filtered pool and tracks seen items in the session. Preserve this feature without presenting it as personal recommendation logic.
- Use what I have already exists, including reviewed exact-form ingredient vocabulary, session retention, storage-unavailable notice, exact matches and one-ingredient-away results with quantity/equipment caveats. Historical documents calling one-away a future feature are stale.
- Cards currently link to details and use supplied original images or decorative illustration fallback. Actual community likes/reviews/average ratings are exposed on detail; retain those supported facts, but do not invent ratings or add unsupported card popularity.
- Detail already contains conditional recorded metadata, explicit unknown allergens/caffeine, metric conversion caveats, checklist, step mode, supported wake lock, provenance, related recipes, authenticated saves/likes/private notes/reviews/comments/questions/tips and moderation states. No serving-scale control is currently rendered despite an old comment describing it.
- Saved recipes are filtered through current eligible publication data; unavailable/unpublished recipes must not be recovered into public UI. Saved-list removal currently uses browser alerts for failure.
- Rendered problems: desktop search is cramped in a narrow sidebar; mobile filters occupy a large panel before results, and the first recipe begins around 790–835px in the observed 390/360px captures. Intro, pantry button, result count and large choices heading compete. The large decorative fallback delays ingredients on mobile detail. Existing mobile making and community bars require one coordinated layout to avoid competing sticky controls.

## Reference-to-design mapping

External observations supplied by the coordinating agent's browser audit at 1440×900 and 390×844. These are visual observations, distinct from historical repository notes and the source audit above. No proprietary assets, copy or complete layouts will be copied.

| Reference and inspected pattern | Brewlist use | Deliberately reject / evidence limit |
| --- | --- | --- |
| [District](https://www.district.in/): desktop compact navigation, active pill, six-across image cards with facts below; mobile prominent search below location row, horizontal icon categories and two-column poster cards | Put Finder search/type choices before refinements; keep catalogue/recipe identity and factual metadata easy to scan; use clear current-category treatment | District branding, location selector, booking/offers/payment, copied iconography and poster layouts. Its mobile search results clipped the second column in the inspected viewport; do not copy that behavior. |
| District search: desktop compact thumbnail/name/type results; clicking Movies visibly filtered types on mobile and All restored mixed results | Clear type selection and visible selected state; concise recipe rows at narrow widths | No claim of accessible behavior based on appearance. Brewlist must independently meet keyboard, focus, target and overflow criteria. |
| [Fabric London](https://www.fabriclondon.com/): full-width dark photograph, small ruled desktop navigation, outlined CTA, four poster tiles; mobile menu, cropped portrait photograph and horizontal posters | Preserve Brewlist's nightlife context, sparse dark header and editorial rules; image-led detail only when a true recipe image exists | Full-screen hero/poster carousel on tools, Fabric typography/assets/layout. Initial cookie/newsletter overlays obstructed inspection; resolved without form submission before final desktop/mobile review. |
| [MotionSites](https://motionsites.ai/): black catalogue page with large gradient headline, category strip and labelled media cards; desktop sort/pricing controls, mobile filter icon and two-column cards | Clear active category and labelled media hierarchy | Giant hero/glow/promotional banners and unverified animation templates. Named historical examples were not interaction-tested. A similarly named [motionsites.org](https://motionsites.org/) catalogue was also inspected, but is not asserted to be the historical source. |
| [Refero — Analogue aF-1](https://styles.refero.design/style/6607e4ff-2de6-4a6a-a7ed-53a9e4b550b9): embedded website preview and design interpretation | Restrained image hierarchy and breathing room around meaningful content | Blue accents, serif nostalgia and decorative film treatment. |
| [Refero — teenage engineering](https://styles.refero.design/style/aecf9dda-5cba-4dc7-9e73-59b65d895cdf): product-led preview, fine rules | Product facts and useful media ahead of ornament | Thin/small text and copying distinctive product layouts. |
| [Refero — Linear](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1): dark interface preview and hierarchy | Only disciplined grouping and hierarchy | Dashboard composition, glow and SaaS styling. |

The three exact Refero links were recovered from `docs/brewlist-redesign-plan.md`; its prose described Fabric and MotionSites but contained no exact URLs. Their URLs above were freshly reconstructed through public research, not recovered from the repository. MotionSites exact-name research found https://motionsites.ai/?prompt=ember-dsgn-hero and https://motionsites.ai/?prompt=impressive-hero; these are research leads, not audited template interactions. The precise historical MotionSites domain remains unproven. Refero was inspected as a **style-reference website**, whose desktop view pairs an embedded desktop preview with interpreted design notes and whose mobile view stacks preview/tabs/description. This does not constitute a live mobile inspection of Analogue, Linear or teenage engineering themselves. Prior notes are not current UI authority.

External screenshot evidence is in browser tool artifacts under `.playwright-mcp/page-2026-10-07T*.png`: District home `16-05-31-719Z`/`16-05-41-764Z`, search `19-09-29-773Z`/`19-09-13-427Z` and `19-09-35-051Z`; Fabric `19-06-34-560Z`/`19-06-37-308Z`; MotionSites `.ai` `19-11-30-774Z`/`19-11-36-746Z` and incidental `.org` `19-07-08-749Z`/`19-07-05-213Z`; Refero Analogue `19-07-32-551Z`/`19-07-35-934Z`, Linear `19-08-01-625Z`/`19-07-58-926Z`, teenage engineering `19-08-21-950Z`/`19-08-24-402Z`. Artifact identifiers are browser output references; no project source assets were changed.

## Shared visual rules

- Match `app/home.module.css`: Nunito Sans with existing Arial fallback; near-black `#121210`, warm off-white `#f4f1ea`, ink `#1c1b18`, burnt red `#b73720`. No global CSS/font changes.
- Tool titles approximately 28–36px mobile and 36–44px desktop, sentence case and normal width; body/input text at least 16px, secondary facts normally 14px with adequate contrast. Product/recipe names lead their rows. Do not truncate essential names, price, pack size or quantities.
- Compact 64–72px header, 16–20px mobile gutters, approximately 1240px desktop working width. Fine dividers, modest 4–8px corners and little shadow; avoid nested dashboard cards and oversized heroes.
- Red marks the primary next action; selection also has text, outline/weight and programmatic state. Budget errors include signed amount and words, not colour alone. Check AA contrast on actual rendered pairs, including muted labels and disabled explanations.
- Every interactive target has a 44px hit area, visible focus, keyboard operation and meaningful label. Motion is optional short colour/border feedback only, disabled under reduced motion.
- At 1440px use desktop layouts; at 768px use a single working column and mobile sheets rather than compressing three columns. At 360/390px use compact rows with wrapping labels. No horizontal document overflow; horizontally scrollable category navigation must include a clearly labelled all-category alternative.

## Wireframes

Counts, names and prices below are schematic examples, not live catalogue assertions.

### Party Planner — desktop 1440px

```text
Brewlist     Party Planner / Find My Drink                 Saved plans
Party Planner                         Jaipur catalogue · estimate only
[20 guests · Edit] [Budget ₹5,000 · Edit]   explanatory disclosure
--------------------------------------------------------------------
Categories       Catalogue                            Your plan
Beers 107        [Search Beers                 ][Filters] 20 guests
Gin 84           [active chips / Clear]                Budget ₹5,000
...              107 matching products               ----------------
                 Product name                         Selected item
                 750 ml · ₹100 / pack  [−][2][+]      750 ml · 2 packs
                 Line ₹200                            [quantity/remove]
                 --------------------------------    ----------------
                 Product name · size · price [Add]    Estimate ₹200
                 ...                                  ₹4,800 remaining
                 [Show more]                          [Review list]
                                                      estimate caveat
```

Category rail approximately 180px, plan column approximately 320px, catalogue takes remaining space. The plan is sticky only where viewport height permits; long item lists scroll in a labelled region without hiding totals or trapping the page. Existing desktop drag/drop targets move to the plan panel.

### Party Planner — mobile 360/390px; tablet 768px

```text
Brewlist                         Saved plans
Party Planner
20 guests · Budget ₹5,000              [Edit]
[Beers 107] [Gin 84] ...       [All categories]
[Search Beers                    ][Filters 2]
[selected filter chips]       12 matches
Product name
750 ml · ₹100 / pack                  [Add]
-------------------------------------------
Selected product              [−] [2] [+]
Line total ₹200
... content padded below final item ...
===========================================
1 item · ₹200   ₹4,800 left     [View plan]
```

View plan opens a labelled native dialog with selected items, editable quantities, guest/budget context, complete budget status and Review list. The catalogue footer has one compact summary entry point; review remains in the selected-items panel, eliminating competing catalogue CTAs. On empty lists the panel explains how to add an item and returns focus to the catalogue.

### Find My Drink — desktop 1440px

```text
Brewlist     Party Planner / Find My Drink              Saved recipes
Find My Drink
[Search by name or ingredient                              ][Search]
[All] [Cocktails] [Mocktails]                       [Use what I have]
--------------------------------------------------------------------
Refine              [active chips / Reset]          24 matching recipes
Base spirit         A few choices from your matches       [Pick for me]
Recorded method     [image]       [image]       [image]
Listed ingredients  Recipe name   Recipe name   Recipe name
                    Type/spirit   Type/spirit   Type/spirit
                    4 ingredients · recorded method when present
                    Browse all matches · remaining cards · pagination
```

The default choices remain the existing feature and current ordering; reduce their introductory height rather than silently remove/reorder their algorithm. Search and type navigation span the working area. A modest 220–240px refinement column shows existing facets without making search narrower.

### Find My Drink — mobile 360/390px; tablet 768px

```text
Brewlist                         Saved recipes
Find My Drink
[Search name or ingredient           ][Search]
[All] [Cocktails] [Mocktails]
[Filters 2]                 [Use what I have]
[Gin ×] [Shake ×] [Reset]
12 recipes                      [Pick for me]
--------------------------------------------
[small photo] Recipe name
              Cocktail · Gin
              4 listed ingredients · Shake
--------------------------------------------
... choices, then remaining matches ...
[Next recipes] / [Back to first matches]
```

Filter sheet: title/Close, actual spirit/method/ingredient-count controls, Clear and Done. Keep immediate URL-based filter application; do not introduce an unapproved second draft/apply state. Each choice retains the open sheet through navigation, announces refreshed counts, and remains keyboard reachable. Back/forward restores URL selection; closing returns focus to Filters. Without hydration, ordinary links/native disclosure remain usable.

Use what I have expands the existing inline workflow immediately below discovery controls, with selected chips, ingredient search/checklist and honest exact/one-away results. The ordinary-results return link remains. It is not a fabricated inventory or quantity checker.

### Recipe detail and saved recipes

```text
Desktop: Back to results | name/type + compact real image
         Ingredients/checklist     Method + step controls
         Save/Like, private note   Source and known/unknown facts
         Community/reviews/comments below making; related recipes last

Mobile:  Back to results, name/type, concise known facts
         Ingredients / Start making jumps; compact save entry
         Ingredients → Method → note/source → community → related
         Real image stays modest; decorative fallback never blocks making
```

Keep one mounted community controller and one instance of each auth/note input. Reposition its existing save/like actions through a small local presentation split if needed, preserving callbacks and action contracts. Do not duplicate forms or create a second save state. Saved page retains phone sign-in, sign-out, private notes and removal; add a clear Browse recipes link and inline per-item failure/retry status.

## Interaction and state specifications

| Area/state | Required presentation and behavior |
| --- | --- |
| Planner eligibility/loading/failure | Existing unchecked gate and consent wording; disabled continue until eligible; busy status and duplicate-submit prevention. Failed catalogue load stays at gate with retained checkbox and retry through the existing action. Never show invalid/partial catalogue. |
| Basics | Show guest number and budget by name at all widths; existing Edit dialog and presets. Invalid fields have associated messages; missing basics lead to the same dialog. Editing changes budget context only, not quantities. |
| Catalogue/filtering | Preserve per-category search/facets and count semantics; no-results state offers Clear for that category. Category selection remains inclusion in the plan; its removal, item removal and Undo remain explicit. Add an all-category disclosure on mobile without changing selected categories merely by opening it. |
| Quantities/selected plan | Same state and 1–1,000 validation from card or selected panel; unique IDs by rendered context. Invalid or stale lines mark estimate incomplete and block review as today. Missing product and changed pack size retain repair instructions. |
| Over budget | Preserve explicit Add anyway, over-budget increments and review/save eligibility. Display exact shortfall in card, summary and review; never cap or silently replace choices. Within-budget remains the existing one-pack affordability rule. |
| Review/save | Review runs existing validation and handles price/product changes. Preserve guest export, copy fallback, private OTP save, saved confirmation, conflict/error messages, snapshot date and explicit Edit & reprice. No optimistic saved claim before success. |
| Plan dialogs | Labelled dialog, initial heading/first logical field focus, Escape/Close, focus containment and return to trigger; on removed trigger return to section heading. Existing destructive confirmation remains. No hidden duplicate controls in keyboard order. |
| Finder loading | Keep route shell and reserved result space, meaningful loading status with no fake count/cards. Use a route loading boundary or small transition state only after reading current Next guidance; no new data fetching contract. |
| Filters/history | Preserve all URL parameters and existing reset semantics; filter changes reset cursor/picks as current helper does. Search submits on Enter/Search, not on every key. Active chips remove one facet, Reset clears facets; counts come from current ListingData only. |
| Finder empty/error | Distinguish zero matches (change/reset filters), zero published/not-ready (honest collection empty), and unavailable (retry same route). Do not replace failed reads with synthetic or unpublished recipes. Detail missing vs unavailable remains distinct. |
| Pantry | Preserve reviewed vocabulary, exact forms, ice/garnish, session persistence, blocked-storage notice, filter intersection, quantity/equipment caveats and safe recipe-return anchor. Empty ingredient search is distinct from no recipe match. |
| Detail imagery/metadata | Existing image validation/fallback remains; failed image uses decorative treatment. Show optional facts only when supplied; no invented preparation time, taste, ABV or allergens. Keep conversion/source disclosures. |
| Making | Retain checklist progress, all-steps/step mode, previous/next bounds and optional wake lock. Only one mobile sticky control region; hide or make it static where keyboard/short viewport would obscure content. |
| Auth/community/saved | Preserve exact server actions and privacy/moderation gates. Pending work gets text status; failures retain edits and retry. Private notes remain unavailable until saved. Actual ratings/likes stay only where backed by community data. Signed-out save reveals existing auth and explains returning to save; no silent auto-save. |

Sticky elements must reserve document space, include safe-area padding, use scroll-padding/scroll-margin for focus and anchors, and fall back to static positioning in short viewports. Verify with keyboard open and at 200% text size. Dialog content scrolls independently with reachable Close/actions, and background content is inert while modal.

## Explicit proposed behavior changes requiring this approval

1. Desktop selected plan becomes persistent; mobile bottom bar opens the plan, where Review list lives.
2. Selected-plan quantities become directly editable using the existing quantity state/validation; no new arithmetic or persistence.
3. Guests and budget are visibly named together; mobile gets an all-category disclosure, preserving category inclusion/removal semantics.
4. Finder search/type controls move above results; mobile refinement becomes an accessible sheet with URL-driven selections and individual active-filter chips.
5. Recipe making moves ahead of large decorative imagery; existing Save/Like becomes easier to find without duplicating its controller. Community remains after practical content.
6. Saved-recipe remove failures use inline status/retry instead of a browser alert. Add truthful loading/retry presentation where missing.

No change to recommendation/pick logic, pantry matching, price calculations, publication/moderation, authorization, snapshots, URL parsing or backend behavior is proposed.

## File boundaries and frozen interfaces

| Checkpoint | Allowed implementation boundary after approval |
| --- | --- |
| Planner | `app/party-planner/planner.tsx`, `planner.module.css`; focused extensions to existing mocked planner/tools harnesses. A small planner-local presentation component only if it avoids duplicated interactive markup. |
| Finder | `app/find-my-drink/finder.module.css`, presentation components `browse`, `shell`, `discovery`, `recipe-card`, `recipe-image`, `pantry`, `detail`, `making`, `community`, `auth`, `states`, plus `gate.tsx` and saved-page presentation. One small filter-sheet component and route loading UI if needed. |
| Evidence | Existing relevant browser/check scripts, this plan and implementation progress. Keep planner/Finder edits sequential. |

Freeze Finder route parsing in `app/find-my-drink/page.tsx` and existing detail-route eligibility/read logic; freeze `app/page.tsx`, `app/home.module.css`, global/layout/font files, early-access surfaces, all planner/Finder action modules, `session.ts`, `model.ts`, catalogue files/server validation, `queries.ts`, recipe/pantry/metric/community data helpers, migrations/schema, credentials/environment, dependencies/lockfile, source imagery/spreadsheets, recovery archives and legacy agent configuration. Preserve `Product`, `PlannerInput`, `Plan`, `SavedPlan`, `RecipeRow`, `ListingData`, `ListingFilters`, `CommunityState`, action responses, storage keys and saved JSON shapes. Presentation-only changes to saved route must leave eligibility/read/filter logic unchanged. No new shared design-system package or backend work.

## Future concepts — explicitly not live functionality

District-style discovery can inform grouping, search prominence and compact cards now. Venue discovery, city selection, bookings, offers, inventory and payment remain a separate future concept. No concept screen is required to ship this tool redesign; if later requested it must be a labelled standalone mockup, with no live-tool navigation or pretend action. No current photo, price, card or plan may imply stock, a Jaipur venue partnership, official MRP or checkout.

## Implementation phases and acceptance criteria

1. **Approval:** complete reference mapping and approve this one direction/behavior list. No application edit before user approval. Read relevant installed Next documentation before implementation.
2. **Planner checkpoint:** one narrow native executor contract; implement layout and selected-plan interactions only. Astra reviews code and desktop/mobile evidence. Verify eligibility, category add/remove/undo, scoped search/facets, quantities, explicit over-budget path, review, exports, saved snapshot/reprice/conflicts/auth with synthetic responses. Preserve the repaired harness and its assertions.
3. **Finder checkpoint:** sequential executor contract, no overlapping planner files. Verify deep links, all facets/counts/chips, search, reset, Back/Forward, pagination/picks, pantry session/exact/one-away cases, detail checklist/step mode/image fallback, saved/auth/private notes/community moderation and error states using mocks.
4. **Integrated closeout:** one designated build runner executes `pnpm build` (Corepack fallback with `pnpm_config_verify_deps_before_run=warn`), standalone `node node_modules/typescript/bin/tsc --noEmit`, relevant existing functional scripts and `git diff --check`. Run production browser smoke against that fresh artifact; inspect actual images at 360, 390, 768 and 1440px plus fully loaded homepage regression views. Record exact outcomes/limitations and refresh Graphify. No real writes, deployment or commit.

Acceptance: desktop selected plan remains visible while browsing; mobile first catalogue/results content follows compact task controls with no oversized hero; all existing features remain reachable; URL/history/storage/save behavior matches existing contracts; all four widths have readable names/facts, 44px controls, AA contrast, visible focus, no overflow, functional sheets and no obscured errors/focus under sticky controls. Test long names, many filters/items, empty data, unavailable reads, invalid quantities, reduced motion, short viewport and 200% text. Mocked network isolation must reject unexpected requests and assertions must retain the fixture Content-Range contract and synthetic provenance.

Owner explicitly approved `gpt-6-luna` as the native implementation executor substitution for the unavailable legacy Luna identifier. Astra directs/reviews; one executor works sequentially without recursive delegation.
