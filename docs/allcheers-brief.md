# AllCheers website brief

Status: Phase 1 public marketing scope confirmed by the owner, 2026-09-10. Product purpose is resolved; the fresh visual design remains to be selected.

## Source and interpretation

Source: `C:/Users/vritr/OneDrive/Desktop/AllCheers_Developer_Handbook.pdf`, 12 pages, Phase 1 implementation brief v1.0, dated 7 September 2026. Read in full; scope, planner and design tables also reviewed visually.

The handbook distinguishes confirmed requirements, proposed implementation defaults and launch decisions. Preserve those distinctions. Its catalogue audit is a reported finding, not a fresh verification performed during this review.

The owner confirmed that Phase 1 means the public marketing website first. The handbook's use of Phase 1 describes a broader functional product release; here it supplies product context, not the current implementation scope. The app and dedicated support site remain future phases. Authentication, new tables, ranking services and product backend implementation are outside this marketing phase.

The handbook also references an earlier approved mockup and editorial-serif direction. The subsequent clean-reset instruction excludes old layouts and creative references. Record the handbook's brand specifications as source guidance without automatically reinstating that mockup or selecting fonts.

Latest creative instruction (2026-09-10): the owner explicitly asks to reference the images in `output/` and improve them through research. Those mockups are now authorized references, not final designs. The requested change is a stronger party/drinks identity, including alcoholic and non-alcoholic occasions, rather than a generic gathering. Research and the new visual proposals live in `output/allcheers-v2-party/`. The removed website source remains retired.

## Product purpose and audience

AllCheers helps people choose a drink for their taste, occasion and budget, and build a party shopping list. Its two core features are Drink Recommendation and Party Planner. Launch city: Jaipur. Tagline: **Good Times Start Here.** (pp. 1-2)

The visitor is someone choosing a drink for a particular moment or organising drinks for a group. Specific demographic targeting is not defined. Do not invent it.

The output is advice and a shopping list. People buy independently at local stores. There is no alcohol checkout, order confirmation, delivery, venue booking or guaranteed stock. Events and standalone recipes are outside the two-feature release. (p. 2)

## What visitors should do first

The home experience presents two clear choices: **Find My Drink** and **Plan My Party**, with Jaipur visible. The handbook's product navigation is Discover Drinks, Party Planner, My Plans, Jaipur and account access. My Plans contains saved drinks and party lists. (pp. 2-3)

For the current marketing scope, present these two journeys clearly and explain their outcomes. Until the functional app exists, links must lead to honest feature explanations or clearly labelled previews, not pretend working tools. Early access is a possible launch-status action, not a substitute product purpose specified by the handbook.

Before alcoholic-product access, the product must apply the approved eligibility policy. Signup includes explicit Jaipur selection. Authentication method and the age-access rule are still launch decisions; mobile OTP is proposed, not selected. Do not invent an age threshold or build fake authentication. (pp. 2-3)

## Journey 1: Find My Drink

1. Capture occasion, taste preferences, optional categories or Help me choose, maximum price per bottle in INR, and people count.
2. Validate inputs and return ranked products while keeping preferences editable.
3. Explain each match with product image, name, brand/category, bottle size, listed Jaipur price, matched taste tags and supported reasons. Show source ratings and review counts only where available.
4. Provide product details and Save in the functional app.
5. When no match exists, explain the mismatch and offer explicit filter edits. Never silently exceed the bottle budget or describe a partial match as complete. (p. 4)

Occasion labels and ranking rules are proposed defaults. Taste evidence must distinguish inferred and verified information. Smooth taste does not establish alcohol strength. The handbook's ranking prior of 20 and initial six results are tunable proposals, not approved requirements. (pp. 4, 6)

## Journey 2: Plan My Party

1. **People and budget:** guest count and total drinks budget in INR.
2. **Categories:** multi-select available drink categories; retain choices on back navigation.
3. **Product options:** grouped products with pack size, unit price and editable quantities; initially one selected product per category.
4. **Shopping list:** Jaipur, people count, original budget, products, quantities, unit prices, subtotals, estimated total and remaining budget; Edit, Save, Download and Share. No extra taste questionnaire. (p. 7)

Swaps must remain affordable across the whole basket. Preserve the original budget, show exact shortfalls and never hide an unaffordable category. Prices are estimates, not live store offers. Saved lists must distinguish price snapshots from later catalogue changes. (pp. 7-8)

Headcount-to-bottle quantities are not approved. The example screenshot is not a universal formula. One editable pack per category is permitted by the handbook only as an explicitly labelled internal-prototype default. Mixers, snacks and supplies require their own verified catalogue before inclusion. (p. 7)

## Content and design guidance from the handbook

- Hero: Good Times Start Here.
- Supporting line: Your people. Your drinks. Your kind of night.
- Finder: Find your kind of flavour.
- Planner: Less planning. More together.
- List: Save your list. Shop at a local store.
- Price note: Estimated from our Jaipur catalogue. Store prices and availability may differ. (p. 11)

The handbook specifies ivory `#FAF7F2`, plum `#382040`, berry `#A33467`, coral `#EE715B` and subtle blush surfaces; a plum-to-berry wordmark with glasses and a golden spark; editorial serif headings and readable sans-serif body text. These are documented source specifications, not a new implementation decision. The earlier rounded-sans exploration and the later request for a fresh design still need reconciliation. The handbook describes logo assets but does not provide a standalone approved logo file. (p. 11)

Use accurate product imagery and realistic Jaipur atmosphere, mobile-first layouts, accessible labels and selected states, visible keyboard focus, and reduced-motion support. Never use a flattened homepage screenshot as the website. (p. 11)

A promotional hero slot is described, but it stays hidden without a real campaign. Paid placements require a Sponsored label and must not covertly affect ranking. No sample events, invented testimonials or unverified popularity claims. (pp. 2, 11)

## Proposed marketing homepage structure

This section translates the product handbook into the current marketing phase; it is a proposal, not the handbook's functional app specification.

1. Brand promise, Jaipur context, and two clear feature paths.
2. Find My Drink explanation with a truthful, labelled example of inputs and the resulting match information.
3. Four-step Party Planner explanation showing the shopping-list outcome.
4. Clear purchasing boundary: use the list to shop independently; catalogue prices and availability may differ.
5. Actual launch status and next step, followed by concise questions/contact/privacy content as needed.

Do not add account access or My Plans to marketing navigation before those destinations work. Do not reinstate the previous site's sitemap, animations or section layouts.

## Phase 1 delivery proposal

- Start with one focused homepage, using in-page navigation for Find My Drink, Party Planner and common questions. Add separate pages only for distinct content or necessary privacy/contact information.
- Explain the two upcoming features through concise copy and clearly labelled illustrative previews. Feature links navigate to those explanations.
- Proposed conversion: Join early access, with Coming first to Jaipur as launch context. Reuse the preserved server action and its validation/consent contract if this CTA is adopted; do not create an account flow.
- Show what the future product will produce without providing live recommendations, automatic quantity calculations, saved plans, checkout or catalogue browsing in this phase.
- Design the homepage for desktop and mobile before implementation. Palette, typography, imagery and motion remain design decisions, not inherited requirements from the removed site.

## Data and launch dependencies

The handbook reports 507 Jaipur products across ten categories. It reports no dedicated still-wine or alcohol-free category and no independently verified price freshness or stock. Do not advertise an available alcohol-free recommendation catalogue based on that source. Product identifiers, source ratings and image/content provenance must remain truthful. The workbook has not been re-audited in this planning pass. (p. 5)

Before the functional product launches, the handbook requires decisions on quantity/allocation assumptions, authentication, eligibility rules, price-maintenance ownership, inferred versus verified taste coverage, and content/image reuse rights. These are handbook requirements, not claims that the work is completed. (p. 12)

## Next checkpoints and acceptance

1. Phase 1 scope is resolved: public marketing only. Keep the current backend and credentials intact.
2. Choose a fresh visual direction, reconciling the handbook's brand specifications with the clean-reset instruction.
3. Design the full desktop/mobile marketing journey with real copy and truthful destinations.
4. Implement only the chosen scope. Verify production build, standalone TypeScript, production smoke, mobile layout, keyboard access and any form/motion states. Refresh Graphify after a code checkpoint.

Success for marketing: visitors understand the two features, Jaipur availability, what each journey produces, the independent-store purchasing boundary and the real next action. No false functionality or unsupported claims.

The product release has additional acceptance requirements on pp. 9-12: server-side validation and money calculations, authenticated record ownership, durable saves, evidence-backed ranking, infeasible-budget states and complete failure/recovery paths. These do not belong in the marketing reset by implication.
