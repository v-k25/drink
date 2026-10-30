# Claude Design prompt: Socifer redesign

Paste everything below the line into Claude Design.

---

## Your role and the task

You are the lead product designer for **Socifer**, a pre-launch nightlife product for Jaipur, India. Re-imagine the whole website from scratch: a modern, minimal design that still feels like going out at night.

**Clean-slate rule:** do not look at, reference or carry over anything from the current socifer.com. That covers its layout, colours, fonts, imagery, script lettering and section order. Only the **functions** listed below are fixed: what each page does, what the user can enter, and what states it must handle. Everything visual, and the order of content within a page, is yours to redesign.

## What Socifer is

- **Core product (coming soon):** club and table bookings in Jaipur. The user picks a night, chooses tickets for their group, pays online, the venue confirms, and the user shows a digital pass at the door. **Bookings are not live yet.** For now, the site collects launch-list signups and venue partnership leads.
- **Two companion tools, live now and free, no account needed:**
  1. **Party Planner:** builds a drinks shopping list for a house party and estimates the cost in ₹ from a catalogue of 1,311 Jaipur-listed products in 18 categories.
  2. **Find My Drink:** a curated collection of 50 cocktail and mocktail recipes (35 cocktails, 15 mocktails). It offers guided discovery, random picks, browsing and "what can I make with what I have".
- **Audience:** adults in Jaipur aged roughly 21–35 who go out in groups, plus the people who host the pre-party. They are mobile-first: assume a mid-range Android phone on 4G. Non-drinkers are explicitly welcome.
- **Socifer does not sell or deliver alcohol** and does not show store stock.

## The vibe

The site should feel **modern, minimal, confident, a little nocturnal**: the moment before a good night out. It should be premium but not exclusive or intimidating. It should feel local to Jaipur without being a tourism cliché: avoid generic pink-city, palace or camel motifs unless you make them feel genuinely contemporary.

Words to design toward: *after-hours, warm, social, crisp, effortless, trustworthy.*
Avoid: casino or Vegas glitz, flickering neon, cluttered event-poster layouts, stock "party people" collages, and heavy glassmorphism everywhere.

The two tools are utilities people use with their hands busy (shopping, mixing a drink). They should feel calm and very legible, but clearly part of the same brand as the landing page.

## How to find inspiration

Before designing, research references **by job, not by aesthetic**. For each page, work out what that page must do, find real products that do that job well, and borrow **patterns**: hierarchy, flow, density, interaction. Never borrow branding. Name each reference you use and say what you took from it.

Places to search: Godly, Awwwards, Land-book, Lapa Ninja, SiteInspire, Minimal Gallery, One Page Love (for marketing pages), and Mobbin, Refero and Page Flows (for real app flows and screens).

Starting points per page. Check each one yourself and add better ones if you find them:

| Page | Job it must do | References to study | What to look for |
|---|---|---|---|
| **Home** | Sell a booking product that isn't live yet; capture signups and venue leads; route people to the tools | DICE, Resident Advisor, Shotgun, Posh, Partiful, Zomato's District (India's going-out app), Hakkasan Group's site, Linear/Arc-style pre-launch pages | How event apps make "tonight" feel immediate. How minimal sites build atmosphere with one strong image and type. How pre-launch pages make a waitlist feel worth joining. |
| **Booking (future)** | Browse upcoming nights → choose tickets/table → pay → pass | DICE, Discotech, Tablelist, Resy, Tock, Fever, BookMyShow/District checkout | Date tabs, event cards, ticket-count steppers, checkout summary, wallet-style pass |
| **Party Planner** | Guests + budget in → editable shopping list with live ₹ total out | Omni Calculator's party drink calculator, Blinkit/Swiggy Instamart/Zepto cart UX, Apple Store bag, Splitwise-style summaries | Stepper inputs, category browsing at scale, a persistent running-total bar, a printable/shareable receipt |
| **Find My Drink** | Help someone choose a recipe in two taps, or find what they can make with what they have | NYT Cooking (Cook Mode), Difford's Guide, Punch, cocktail apps such as Cocktail Flow, Old Sport and BarKeeper/"Highball", plus Typeform-style one-question-at-a-time flows | Quiz-to-results flows, ingredient checklists with "one ingredient away", recipe pages with a full-screen step-by-step mode |

## Fixed functional skeleton

These are fixed. Design every listed element and state, but you may regroup or reorder them.

### Global
- **Header:** wordmark; links to How it works, For venues, Plan a party (Party Planner), Find a drink (Find My Drink); one primary CTA (Get launch updates). Mobile menu closes on link tap and on Escape.
- **Footer:** links to both tools, FAQ, For venues, Privacy, Responsible use; the line "For adults. Drink responsibly and never drink and drive."; a photo-credit line ("Stock imagery; not listed Jaipur venues").
- **Age check** before either tool shows alcohol content: one checkbox ("I meet the legal drinking-age requirements where I live"), a continue button, and a "No thanks, take me home" exit. It is remembered once passed. Design it as a moment, not an obstacle.
- **Shared states** for every data view: loading skeletons, empty, "temporarily unavailable" with Try again, and a no-JavaScript fallback where noted.

### 1. Home page (pre-launch state)
Content blocks (you may reorder):
1. **Hero:** the promise of booking Jaipur's nights out, honestly marked as launching soon ("We're not taking bookings yet"). Primary CTA: join the launch list. Secondary: How it works.
2. **Why Socifer:** four planned benefits: venue-confirmed entry, price shown upfront, a digital pass on your phone, no calls or DMs.
3. **How booking will work:** four steps: pick a night → choose tickets → pay → get your pass.
4. **For venues:** "Run a club in Jaipur? Partner with us." Email CTA, plus an optional WhatsApp button.
5. **Tools:** cards for Party Planner and Find My Drink, each with a one-line description and a link.
6. **Launch-list form** with these exact fields:
   - email (required);
   - interests, optional multi-select: Finding my drink / Planning a party / Non-alcoholic drinks;
   - drinks preference select: Undecided / Alcoholic / Non-alcoholic / Both;
   - required checkbox: "I'm joining early access for Jaipur";
   - required consent checkbox for email updates, with a link to the privacy note;
   - submit button.
   Design these states: idle, submitting, success ("You're on the list"), duplicate email, field errors, server error with entries kept.
7. **FAQ:** six accordions: are bookings live; who confirms; what will it cost; can I use the tools as a guest; does Socifer sell alcohol or show stock; who is Socifer for / responsible use.
8. **Privacy note** for the early-access list.

**Also design the launch state** of the same page, so it can switch over without a redesign. In the launch state, the hero CTA becomes "Book a table", and a new "Upcoming nights" section appears: day tabs and event cards showing venue, date, price from ₹ and ticket availability. Mark it clearly as a future state.

### 2. Party Planner (`/party-planner`)
A three-stage flow with the stage clearly shown: **Set your party → Build your list → Ready for the shops.**
- **Set your party:** guests (a stepper plus typed input, 1–1,000), drinks budget in INR, number of non-drinking guests, and estimated servings per drinking guest. Note: "Alcohol budget only. Mixers, water, ice and food are not included."
- **Two ways to build:**
  - **Suggest my list:** pick the categories guests would like, then Generate list. The result is a deterministic starting list, labelled "Estimate. Edit anything."
  - **Choose drinks myself.**
- **Build your list:** a browser over 18 categories (Beers, Blended Scotch, Brandy, Champagne, Gin, Liqueurs, Made in India Whisky, RTD, Red Wine, Rosé, Rum, Sake, Single Malts, Sparkling, Tequila, Vodka, White Wine, World Whisky) holding 1,311 products in total.
  - Each product shows name, brand, size in ml and price in ₹. Add it with a quantity stepper.
  - Filters with active-filter chips, a category index (a sheet on mobile), and "No matching drinks".
  - A **persistent plan summary** showing item count, estimated total, cost per guest, and a within-budget/over-budget indicator, with View plan.
  - Notices: "Guests changed; quantities have not been updated", "Pack size changed", "No longer in the catalogue".
  - Confirm dialogs: Replace your list? and Start a new plan?
  - An info panel: "How are quantities chosen?"
- **Ready for the shops:** a clean receipt-style list with totals and the price caveat "Listed price in Jaipur, checked 3 Oct 2026. Not a guaranteed price." Actions: Copy list, Share list, Print / Save as PDF (design the print layout too), Edit list, Start a new plan.
- **Storage:** the plan is saved **on this device only**, with no account and no login. Say so reassuringly.

### 3. Find My Drink (`/find-my-drink`)
- **Entry:** "Your next recipe starts here" offers four routes: **Guide me**, **Surprise me**, **Browse all**, **Use what I have**.
- **Guide me:**
  1. Drink type: cocktail, mocktail or both. "Both" shows separate cocktail and mocktail sections. There is no default alcohol choice.
  2. Up to two tastes, or Skip.
  3. Results: "A few good choices", three recipes per section. Optional refinements are base spirit (cocktails only) and method, each with an Any option. An Edit preferences dialog (full-screen on mobile) has Apply and Cancel.
  Answers survive switching modes and returning from a recipe.
- **Surprise me:** pick a drink type → one random recipe. "Pick for me" again shows no repeats until Start again.
- **Browse all:**
  - search by name or ingredient;
  - filters: drink type, method (shake/stir/blend/build/batch/hot) and max ingredients (3 or 5), as a filter sheet on mobile;
  - active chips, result counts, Clear all, and pagination (Previous/Next);
  - "No matches just yet" empty state;
  - works without JavaScript.
- **Use what I have:** a searchable ingredient checklist ("Ingredients I have"). Results are grouped into **Ready to make**, **One ingredient away** (showing the missing item) and other matches. Caveats: "check quantities and equipment"; some recipes are not yet included in ingredient matching.
- **Recipe card:** image, name, type (cocktail/mocktail), short facts.
- **Recipe page:**
  - hero image, name, type and description;
  - ingredients with metric conversions, and method steps;
  - "Source & recipe context";
  - "More like this" (related recipes);
  - a back link that returns to the exact results the user came from;
  - a **Start making** button that opens a **full-screen cook mode**: one step at a time, Previous/Next, a "View all steps" ingredient list, a **Keep screen awake** toggle, and Escape to close.

## Design system requirements
- **Accessibility, WCAG 2.2 AA throughout:**
  - text contrast ≥ 4.5:1, including text over photography;
  - visible focus states;
  - 44px minimum touch targets, and 48px for primary actions;
  - labelled fieldsets;
  - reduced-motion variants and no flashing;
  - layouts that survive 200% text size.
- **Responsive:** design for 360, 390, 768, 1024 and 1440 widths. Mobile is the primary canvas.
- **Typography:** propose a pairing: one characterful display face plus one highly legible text face, both with good ₹ and numeral support (use tabular figures for prices). Use free/OFL fonts only.
- **Colour:** propose tokens for background, surface, text, muted text, accent, success, warning and error, plus dark/light behaviour. Explain how the landing page and the two tools relate: one brand, possibly different temperatures.
- **Imagery:** photography-led but restrained. People are silhouettes with no identifiable faces, and images are never presented as a specific Jaipur venue. Every hero needs an art-directed mobile crop with a calm area for text. No autoplay video by default.
- **Motion:** subtle and purposeful (step transitions, the running-total update, card hover). Give a reduced-motion version of each.
- **Performance:** the hero image is ≤ 200 KB per variant, with no heavy decorative libraries. LCP ≤ 2.5 s on 4G is a real constraint.
- **Components to define:** buttons (primary/secondary/ghost), steppers, chips, checkbox/radio cards, select, text input with error, accordion, tabs, bottom sheet/dialog, toast/status, skeletons, product card, recipe card, event card (future), plan summary bar, receipt, age-check card.

## Content and honesty rules (non-negotiable)
- Never imply bookings are live, and never invent venues, DJs, events, prices, reviews, testimonials, partner logos, user counts or press quotes. Where real content will go later, use clearly marked placeholders.
- Prices are "listed" estimates, never official MRP and never guaranteed. Make no stock or delivery claims.
- Include non-drinkers in copy and visuals (mocktails and non-drinking guests). There is no pressure-to-drink language.
- Write copy in plain, warm English for Indian users. Use ₹ formatting such as ₹1,250.

## What to deliver
1. **Research board:** 8–12 references grouped by page, each with one line on the pattern borrowed.
2. **Three distinct visual directions**, each with a name, a one-paragraph rationale, type and colour tokens, and the home hero plus one tool screen at mobile and desktop. Make them genuinely different, for example: editorial-minimal, warm-cinematic and playful-graphic.
3. **After I pick a direction, deliver high-fidelity screens at 390 and 1440:**
   - Home (pre-launch and launch states);
   - the age check;
   - Party Planner: set party, suggest, build list with summary bar, review/receipt and the print view;
   - Find My Drink: entry, guided steps and results, surprise, browse with filters, use-what-I-have, recipe page and cook mode;
   - empty, error and loading states.
4. **Component sheet and design tokens**, named so they can be implemented in Tailwind 4 / CSS variables.

Ask me clarifying questions only if something blocks you. Otherwise, make a decision and note your assumption.
