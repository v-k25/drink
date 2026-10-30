# Brewlist Jaipur pre-launch redesign plan

> **Current direction — 2026-10-05:** The user explicitly rejected the former
> blue/abstract technology-prototype system. The implemented homepage direction
> is photography-led nightlife: near-black, off-white, and burnt-red, using
> licensed stock photos that are visibly credited and never presented as Jaipur
> venues. This supersedes prior conflicting visual guidance in this plan.

> **Direction supersession — 2026-10-05:** The earlier dark booking-prelaunch
> prototype and its blue/grey conceptual flow illustration are superseded for
> the homepage by the implemented photography-led nightlife direction: an
> immersive club-crowd hero, compact utility navigation, condensed display
> typography, burnt-red accent, off-white editorial tools section, and a ruled
> booking sequence. This direction follows the documented Fabric London browser
> review (immersive dark editorial photograph, compact navigation, high-contrast
> title, outlined CTA, and poster/image-led content); it does not copy that
> site or its assets. Printworks was a holding page and was not used as visual
> inspiration. RA content was accessible but browser inspection was blocked, so
> no visual claims are made for it. MotionSites informed only selective motion
> and display-type restraint; Refero informed editorial composition and
> whitespace, not SaaS-card treatment. Local Pexels stock imagery is credited
> separately and is not represented as Jaipur venues.

## Status and guardrails

**Homepage prototype approved and implemented for review on 2026-10-05; no booking service is live.** The approved scope is a homepage-only private-party drinks-planner prototype, using the exact booking-prelaunch and factual available-tools copy. Brewlist is a Jaipur-first nightlife discovery and booking product. The first booking scope is clubs; bars and events are later work. Keep existing backend validation, consent, insert-only early-access behavior, credentials, environment files, eligibility/session gate, private saved plans, recipe publication/moderation gates, saved recipes, and private notes unchanged unless an explicitly audited follow-up approves a change.

Do not use existing project creative documents or assets as design inspiration. Use original or licensed real imagery only; do not imply a Jaipur venue or partner relationship that is not real.

## Research boundary and visual direction

Research is inspiration, not validation:

- A freshly re-fetched public MotionSites homepage lists **EMBER.dsgn, Zenith Realty, RIVR, Impressive Hero**, and **backgrounds**. They are shortlist candidates only: none has been visually audited or interaction-tested. Borrow composition and selective motion only after browser review.
- Refero’s [Analogue aF-1](https://styles.refero.design/style/6607e4ff-2de6-4a6a-a7ed-53a9e4b550b9) suggests photography-first light/dark bands, a constrained accent, and asymmetric product detail. Reject serif nostalgia, giant illegible type, and ornamental film strips.
- [Linear](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1) suggests dark surfaces and hairline hierarchy; avoid a SaaS appearance.
- [teenage engineering](https://styles.refero.design/style/aecf9dda-5cba-4dc7-9e73-59b65d895cdf) suggests a photo-first grid; reject its thin 13px typography.

Refero-generated specs are interpretations, not usability evidence. Do not claim award, performance, or “best” proof. The external browser reference audit was not completed for this prototype; a desktop and mobile browser reference review is required before visual lock.

**Proposed system:** dark hero `#101114`; light tools background `#F7F8FA`; white panels; cobalt `#3155E7` with white text only after contrast verification; charcoal type; one clean licensed sans (for example, Manrope, subject to font approval); 16px body, fluid approximately 40–80px headings, 8px spacing grid, 8–16px radii, and a maximum content width of approximately 1240px.

## Homepage proposal

### Exact top-level copy and navigation

- Status: `Pre-launch · Jaipur`
- Heading: `Club bookings in Jaipur. Coming soon.`
- Body: `Request a booking, get venue approval, then pay and receive your booking pass.`
- Primary CTA: `Get launch updates`
- Secondary CTA: `Try Party Planner`
- Navigation: `Party Planner` / `Find My Drink` / `How bookings will work` / `Get launch updates`
- `For venues` is secondary navigation only.

Homepage sequence: hero → two available tools → coming booking flow → compact FAQ → waitlist. Do not show fake availability, “book now,” unsupported smart features, or a venue claim. The tools section accurately describes what is available now and links to the existing routes.

The future booking explainer is: request a club booking → venue approval and a held quote → payment → booking pass. It must say “coming soon” until the service exists.

## Existing product facts to preserve

| Surface | Current evidence | Redesign implication |
| --- | --- | --- |
| `app/page.tsx` | Current finder copy makes claims beyond the current finder. | Replace it only in a future approved implementation with factual tool descriptions. |
| `app/party-planner/planner.tsx` | Users manually select catalogue products and quantities; totals are estimates, not area stock. | Do not call it a recommender or availability tool. |
| `app/party-planner/model.ts` | Validates input and calculates totals; it does not recommend. | Keep calculations and validation as the factual baseline. |
| `app/party-planner/catalogue-server.ts` | Exact 1,311-row / 18-category histogram validation fails closed. | Preserve this safety behavior. |
| Planner auth and storage | Phone eligibility/session gate and private saved plans exist. | Preserve access and privacy behavior. |
| `app/find-my-drink/queries.ts` | Search/filtering is recipe name/ingredient, type, spirit, method, and ingredient count with publication gates. | Do not claim mood or personal recommendations. |
| Early access | Validated, consented, insert-only action with existing interest codes. | Retain unchanged until an explicit audited extension. |

## Tool UX targets

### Party Planner (bounded separate feature)

Inputs: budget, group size, preferences, exclusions, optional mocktail preference, and Jaipur scope. Explain any future output as **deterministic ranked, budget-fitting basket suggestions**, with editable items and per-person estimate. Provide unavailable-combination and no-results states.

Do not infer consumption, inventory, area stock, or venue spend. Decide the budget scope before implementation: the current packaged-products estimate excludes food, mixers, taxes, water, ice, and supplies. Do not add area-availability UI until verified outlet offers exist.

### Find My Drink (browse-first)

Keep browse-first search plus cocktail/mocktail filters. Add only reviewed taste tags; optional mood-to-taste mapping must be labelled as a preference aid, never a health promise. Preserve URL filters and back-state, provide a mobile filter sheet with active count, and route cards to details. Browsing requires no new authentication beyond the existing eligibility behavior; authentication remains for save/community functions. Show match reasons only from reviewed data, and never fabricate mood tags from recipe titles.

## Data and commerce plan

### Immediate database decision

**No live remaster now; visual refresh means no database changes.** Local SQL is incomplete relative to the deployed schema; there is no waitlist DDL locally; and the historical seven-field planner schema has not been freshly verified. First perform a read-only inventory of actual schema, RLS, grants, indexes, constraints, tables, and privacy; take a recovery snapshot; then compare it with local material. Preserve `planner_products`, `party_plans`, `drinks`, waitlist, and auth/community behavior.

Only if absent and required after that inspection, propose: reviewed recipe-tag taxonomy/join records with provenance (unknown excluded); nullable freshness/provenance fields or separate price observations; verified area/outlet product offers only when data exists; and planner algorithm version/input snapshots only if old saved JSON remains compatible. Extend waitlist interest codes only after verifying the actual contract, retaining historical values and consent. Never convert retail price to venue price.

### Future booking commerce (separate approved program)

Later model: venues, memberships, offers, `booking_requests`, immutable approved quotes, payment attempts/provider events, passes, status history, and refunds. States are `requested` → `awaiting_payment` (venue approved and held until expiry) → `confirmed` (payment verified) → pass issued; decline, expiry, cancellation, and refund are separate states.

Require transactional holds and double-booking protection; idempotent signed webhooks with amount/currency verification; reconciliation for late payments after expiry; scoped venue authorization/ownership RLS; server-priced quotes; and revocable opaque hashed pass tokens with no PII in QR plus atomic single redemption. No migrations occur before approved schema design and fresh inspection.

## Accessibility, motion, and performance targets

Design and test at 360, 390, 768, and 1440px. Provide keyboard operation, visible focus, reduced-motion support, controls at least 44px, WCAG AA contrast, no hover-only content, and no scroll hijacking. Motion: 150–250ms controls, at most 400ms reveals, and no autoplay audio.

Targets are unmeasured: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Validate in lab first, then field; do not claim these metrics are achieved beforehand.

## Delivery checkpoints and acceptance checklist

1. Preserve the dirty baseline; complete browser reference review and approve desktop/mobile wireframes.
2. Implement homepage and shared system only after approval.
3. Improve tools UX, then add smart-feature increments with testable rules and incremental, verified migrations.
4. QA and pre-launch production smoke. Make the launch-indexing decision explicit: current robots `noindex` remains unchanged without approval.
5. Treat commerce as a separate future program.

Before implementation approval, resolve: budget scope and area catalogue availability; image/font/asset rights; venue operations; payment and refund rules.

Future implementation acceptance: exact homepage copy and honest tool copy; no fake booking/availability; responsive and accessibility requirements met; focused planner and recipe fixtures; privacy/auth tests; zero pending/draft recipe leakage; legacy saves intact; and no real waitlist submission or payment during UI smoke. Run `pnpm build` (Corepack fallback with `pnpm_config_verify_deps_before_run=warn`), `node node_modules/typescript/bin/tsc --noEmit`, and `git diff --check`; there is no lint script.
