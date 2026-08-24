# Phase 1 implementation plan and progress

Last updated: 2026-08-24

## Working agreement

- Keep the active implementation plan and meaningful progress in this `docs/` folder.
- Implement Phase 1 in small, independently verifiable checkpoints.
- Update this document after every completed checkpoint.
- Commit and push each completed checkpoint to the current GitHub branch.

## Product boundary

Phase 1 is the Jaipur-first public marketing site for a drink-first nightlife companion. It explains and validates the product, captures segmented early-access intent, and prepares visitors for future product and support subdomains.

The product answers: **“Given my taste, mood, occasion, budget, preferences, and location, what should I drink tonight?”**

- **Hero feature:** Find My Sip, presented as structured and explainable matching.
- **Secondary feature:** Party Planner, always flowing from party details to drinks, quantities, and a shopping list before any supporting venue context.
- **First-class path:** 0% recommendations for non-drinkers, designated drivers, health-conscious visitors, personal preference, and visitors ineligible for alcohol-related paths.
- **Launch market:** Jaipur only. Architecture may scale to later cities, but Phase 1 copy and examples remain Jaipur-first.
- **Future ecosystem:** `app.mywebsite.in` and `support.mywebsite.in` appear only as clearly labeled Coming Soon or Early Access destinations.

## Phase roadmap

### Phase 1 — `mywebsite.in` marketing website (active)

**Objective:** Establish the drink-first proposition, validate Jaipur demand, demonstrate the product logic, publish useful editorial content, and capture segmented early-access intent.

**Includes:**

- Marketing sitemap and responsive editorial design system.
- Find My Sip and Party Planner explanation/teasers.
- Signature loading-glass and scroll-built-cocktail motion stories.
- Jaipur launch and first-class 0% narratives.
- Guides, FAQs, responsible-use framing, contact, and early-access capture.
- SEO, analytics taxonomy, accessibility, performance, and compliance review surfaces.

**Excludes:** Functional recommendation engine, accounts, booking, ticketing, delivery, alcohol sales, payments, marketplace operations, vendor/promoter tools, and production support center.

**Success criteria:** Visitors understand the positioning and can express measurable Jaipur, Find My Sip, Party Planner, or 0% intent.

### Phase 2 — `app.mywebsite.in` product experience (future)

Structured Find My Sip engine first, then drink-first Party Planner. Accounts are added only if saved preferences or results justify them. Events and venues remain supporting context.

### Phase 3 — `support.mywebsite.in` support experience (future)

Searchable help, eligibility and responsible-use guidance, app troubleshooting, privacy/account help, and escalation paths informed by real support demand.

## Phase 1 sitemap

- `/` — primary drink-first narrative and conversion journey
- `/how-it-works` — explainable matching logic
- `/find-my-sip` — marketing teaser, not the full app
- `/party-planner` — drink-first planning teaser
- `/jaipur` — Jaipur launch and local intent
- `/zero-percent` — complete 0% proposition
- `/guides` — editorial index
- `/guides/[slug]` — extensible article template
- `/about` — brand positioning and principles
- `/faq` — product, launch, 0%, and eligibility answers
- `/contact` — business contact surface
- `/responsible-use` — eligibility, safety, and compliance framing
- `/early-access` — segmented demand capture

## Homepage narrative order

1. Responsible Jaipur-first hero with Early Access and Find My Sip teaser actions.
2. Find My Sip inputs and explainable matching proposition.
3. Signature scroll-built cocktail: glass → ice → mixer → layers → garnish → match.
4. Drink-first Party Planner flow.
5. Complete 0% story.
6. Jaipur launch story.
7. Jaipur guides and responsible nightlife editorial previews.
8. Segmented waitlist conversion block.
9. Coming Soon references for the future app and support center.
10. Responsible-use and legal-review footer.

## Design and motion direction

### Jaipur Editorial

- Warm limestone and paper surfaces, carbon ink, controlled lac red, and a small muted-saffron accent.
- Authored editorial display serif paired with a restrained humanist/grotesk sans.
- Asymmetric magazine composition, measured rules, folio details, ingredient notes, and generous whitespace.
- Ingredient studies, vessels, hands, 0% serves, and Jaipur architectural details instead of bottle glamour or consumption-heavy party imagery.
- No neon nightlife cliché, purple/pink gradients, glassmorphism, decorative glows, or generic AI-dashboard styling.

### Signature motion

Motion uses the official `motion` package and motion.dev patterns. The requested Motion MCP is unavailable in this environment, so official documentation is the source of truth and this limitation remains recorded.

- **Loading glass:** lightweight clipped SVG liquid fill; no fake delay; content remains accessible; static filled-glass fallback under reduced motion.
- **Scroll-built cocktail:** compositor-friendly SVG/CSS transforms driven by scroll progress. The illustration may be sticky on larger screens but remains in-flow and shortened on mobile.
- **Supporting motion:** restrained reveals and tactile hover/focus feedback only.
- **Avoid:** ambient loops, cursor followers, large parallax backgrounds, layout-property animation, long mobile sticky traps, and motion on essential copy.

## Compliance assumptions

- Public marketing remains alcohol-adjacent, not a direct alcohol advertisement or purchase surface.
- 0% content remains fully useful and never becomes a dead end.
- Copy and visuals must not target minors or imply risky, excessive, status-based, or performance-enhancing consumption.
- Eligibility and state sensitivity are acknowledged without blocking general or 0% content.
- All launch copy, imagery, promotions, consent language, and state-specific treatment require qualified India-focused legal review.

## Content and data requirements

- Drink taxonomy, taste attributes, strength and budget bands, mood/occasion mappings, preference exclusions, and explainable match language.
- 0% category definitions with equal recommendation depth.
- Party-size and future quantity assumptions plus shopping-list definitions.
- Jaipur neighborhoods, local nightlife categories, credible sources, and city visual assets.
- Approved brand story, FAQ, privacy/data-use, eligibility, responsible-use, consent, and legal-review copy.
- Editorial briefs for Jaipur discovery, occasions/moods, drink education, 0% culture, and responsible nightlife.

## Analytics and validation framework

Phase 1 events:

- Early-access form viewed, started, submitted, succeeded, and failed.
- CTA source and destination.
- Find My Sip teaser started/completed.
- Party Planner teaser engaged.
- Scroll-built cocktail milestones reached.
- Jaipur interest and 0% interest selected.
- Feature navigation and guide engagement.
- Returning visitor signal with privacy-conscious implementation.

Primary metrics are waitlist conversion, CTA click-through, teaser interaction, Jaipur-interest capture, 0% interest, content engagement, and returning visitors.

A future **Sip Intent** score will weight stronger actions more heavily: completed recommendation, saved/shared match, shopping-list generation, and context exploration. It is not treated as a Phase 1 product KPI.

## Risks and review gates

- India alcohol-adjacent marketing is legally and state sensitive; qualified legal review is mandatory before launch.
- Motion may harm low-end mobile performance; simplify aggressively based on measurement.
- Jaipur localization must use credible local knowledge rather than generic nightlife SEO copy.
- Production waitlist persistence requires explicit provider, consent, privacy, and retention decisions.
- Any feature serving transactions, operators, vendors, or logistics must be re-evaluated against the drink-first boundary.

## Checkpoint log

- [x] **0.1 — Phase 1 architecture:** Reframed scope as the marketing website, defined roadmap, sitemap, boundaries, motion direction, content needs, metrics, compliance assumptions, and risks.
- [x] **0.2 — Brand foundation:** Replaced the dark rose/brass theme with Jaipur Editorial limestone, carbon ink, lac red and muted saffron; changed typography to Newsreader and Manrope; updated metadata, browser theme and security headers.
- [x] **0.3 — Motion foundation:** Installed Motion and added an accessible, non-blocking clipped-SVG glass loader plus reduced-motion-aware section reveals.
- [x] **1.1 — Homepage shell:** Rebuilt the responsive navigation, hero, Find My Sip explanation, Party Planner/0%/Jaipur supporting stories, early-access conversion hierarchy and shared footer.
- [ ] **1.2 — Signature story:** Implement the scroll-built cocktail interaction and reduced-motion/mobile fallbacks.
- [ ] **1.3 — Supporting stories:** Add Party Planner, 0%, Jaipur, editorial previews, future ecosystem, and responsible footer.
- [ ] **2.1 — Marketing routes:** Build the complete Phase 1 sitemap with shared structure and substantive copy.
- [ ] **3.1 — Early access:** Add segmented, consent-aware demand capture after integration approval.
- [ ] **4.1 — SEO and analytics:** Route metadata, sitemap/robots, structured data, event taxonomy, and internal linking.
- [ ] **5.1 — Final validation:** Responsive, keyboard, reduced motion, progressive enhancement, route integrity, console, build, and performance checks.

## Current checkpoint

**1.2 — Signature story** is next. The visual and motion foundations plus homepage narrative shell are complete; the next checkpoint turns the cocktail placeholder into the required scroll-built interaction.
