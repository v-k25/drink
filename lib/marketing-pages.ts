import type { MarketingPageData } from '@/components/marketing-page'

export const marketingPages: Record<string, MarketingPageData> = {
  'how-it-works': {
    eyebrow: 'How it works · 01', title: 'Your night, translated into a better sip.',
    intro: 'Find My Sip turns a few human choices into an explainable recommendation—without vague AI magic or a wall of bottles.',
    sections: [
      { label: 'Tell us the night', title: 'Start with context, not categories.', body: 'Mood, occasion, budget, strength, taste and drink type shape the answer. Location adds useful city context without taking over the experience.', items: ['Mood and occasion', 'Taste and strength', 'Budget and preferences', 'Alcoholic or complete 0% path'] },
      { label: 'Structured matching', title: 'A recommendation you can understand.', body: 'A structured taxonomy maps your inputs to drink attributes. The result explains why it fits, so discovery feels useful rather than mysterious.', items: ['No LLM recommendation core', 'Clear attribute matching', 'Exclusions respected', 'Reasoning in plain language'] },
      { label: 'Supporting context', title: 'Then decide where the night goes.', body: 'Jaipur guides, venue mood and event context support the sip. We do not sell tickets, take bookings or turn your choice into a transaction.' },
    ],
    cta: { title: 'See the matching idea before launch.', body: 'Explore the Find My Sip preview, then tell us what kind of release you want first.', primary: 'Preview Find My Sip', href: '/find-my-sip', secondary: 'Join early access', secondaryHref: '/early-access' },
  },
  'find-my-sip': {
    eyebrow: 'Hero feature · 02', title: 'Not “what is popular?” What fits you tonight?',
    intro: 'Find My Sip is a future structured recommendation experience for alcoholic and 0% drinks, beginning in Jaipur.',
    note: 'Phase 1 is a marketing preview. The full matching experience will launch later at app.mywebsite.in.',
    sections: [
      { label: 'The inputs', title: 'Seven signals, one considered answer.', body: 'Taste, mood, occasion, budget, drink type, strength and personal preferences create a useful profile for the moment.', items: ['Bright, bitter, smoky, sweet or dry', 'Quiet catch-up or full celebration', 'Budget-aware suggestions', 'Ingredient and strength preferences'] },
      { label: 'The result', title: 'A match with a reason—not a roulette wheel.', body: 'Each recommendation will show the attributes that made it fit, suitable 0% alternatives and useful Jaipur context when available.' },
      { label: 'The promise', title: 'Discovery without pressure to purchase.', body: 'Find My Sip is designed as guidance. It does not sell alcohol, arrange delivery, accept bookings or promote irresponsible consumption.' },
    ],
    cta: { title: 'Help shape the first sip matches.', body: 'Choose Find My Sip in early access and tell us whether your preference is alcoholic, 0%, or both.', primary: 'Request early access', href: '/early-access', secondary: 'Explore 0%', secondaryHref: '/zero-percent' },
  },
  'party-planner': {
    eyebrow: 'Supporting feature · 03', title: 'Plan the drinks first. Let the rest support them.',
    intro: 'Party Planner extends Find My Sip from one person to a group—without becoming a booking, vendor or logistics product.',
    sections: [
      { label: 'Party details', title: 'The shape of the gathering comes first.', body: 'People, occasion, mood, budget and preferences establish the brief, including complete 0% participation.', items: ['Guest count and occasion', 'Shared mood and budget', 'Alcoholic and 0% split', 'Dietary and ingredient preferences'] },
      { label: 'Drink plan', title: 'Recommendations become useful quantities.', body: 'The future planner turns suitable serves into quantities and a simple shopping list. This is guidance, not delivery or commerce.' },
      { label: 'Supporting suggestions', title: 'Venue context comes last, deliberately.', body: 'Only after the drink plan will Jaipur venue or event ideas appear, and only when they genuinely fit the occasion.' },
    ],
    cta: { title: 'Planning a Jaipur gathering?', body: 'Register Party Planner interest so we can prioritize the most useful group-planning needs.', primary: 'Register interest', href: '/early-access', secondary: 'How it works', secondaryHref: '/how-it-works' },
  },
  jaipur: {
    eyebrow: 'Launch city · 04', title: 'Built Jaipur-first, not India-generic.',
    intro: 'The first release will learn one city properly: its neighborhoods, occasions, seasons, 0% culture and different kinds of nights.',
    sections: [
      { label: 'Local lens', title: 'City context that earns its place.', body: 'Jaipur content will connect weather, setting, mood and occasion to drink discovery—not flatten the city into a generic nightlife list.', items: ['Neighborhood-aware guides', 'Seasonal Jaipur moments', 'Rooftop, lounge and gathering moods', 'Credible local editorial sources'] },
      { label: 'Supporting discovery', title: 'Events and venues remain context.', body: 'A DJ night, poetry set, pool gathering or cruise-style party can explain the mood. It does not become a ticketing or booking flow.' },
      { label: 'Future cities', title: 'A local model designed to travel carefully.', body: 'The route structure can expand later, but only after Jaipur content and demand establish what deserves to scale.' },
    ],
    cta: { title: 'Tell us you want Jaipur first.', body: 'Join the Jaipur list and select the experiences—Find My Sip, Party Planner or 0%—that matter to you.', primary: 'Join Jaipur access', href: '/early-access', secondary: 'Read the guides', secondaryHref: '/guides' },
  },
  'zero-percent': {
    eyebrow: 'First-class path · 05', title: 'Zero percent. One hundred percent part of the night.',
    intro: '0% is a complete discovery path for non-drinkers, designated drivers, health-conscious guests, ineligible users and anyone who simply prefers it.',
    sections: [
      { label: 'Not a fallback', title: 'Built with the same depth as every recommendation.', body: 'Taste, texture, mood, occasion, budget and ingredients still matter. A 0% result should feel considered, grown-up and complete.', items: ['Spirit-free mixed drinks', 'Botanical and tea-led serves', 'Fresh, bitter and savory profiles', 'Celebratory options without alcohol'] },
      { label: 'Inclusive by design', title: 'No dead ends based on eligibility.', body: 'Anyone not eligible for alcohol-related features continues into a useful 0% experience with the same quality of explanation and city context.' },
      { label: 'Public surface', title: 'A more responsible way to lead.', body: 'The 0% story gives the public marketing site a broad, compliant and genuinely inclusive entry point without disguising the brand purpose.' },
    ],
    cta: { title: 'Put 0% on the Jaipur launch list.', body: 'Register your interest and help us learn which alcohol-free profiles and occasions matter most.', primary: 'Choose 0% interest', href: '/early-access', secondary: 'See Find My Sip', secondaryHref: '/find-my-sip' },
  },
  guides: {
    eyebrow: 'Editorial · 06', title: 'Notes for a more considered night in Jaipur.',
    intro: 'Guides connect taste, mood, occasion and local context. They inform discovery without becoming promotions or “best venue” listicles.',
    sections: [
      { label: 'Drink discovery', title: 'Learn the language of what you like.', body: 'Editorial explainers will make taste profiles, strength, ingredients and formats easier to navigate.', items: ['Bright versus dry', 'How bitterness works', 'Understanding strength', 'Building a balanced 0% serve'] },
      { label: 'Jaipur nights', title: 'Plan around the moment, not a ranking.', body: 'Seasonal rooftop evenings, intimate gatherings, live performances and late-night energy become useful context for choosing a drink.' },
      { label: 'Responsible culture', title: 'Good nights include good decisions.', body: 'Eligibility, pacing, hydration, transport planning and complete 0% options are part of the editorial system—not hidden legal copy.' },
    ],
    cta: { title: 'Get the first Jaipur field notes.', body: 'Join early access to hear when the first guides and product preview are published.', primary: 'Notify me', href: '/early-access', secondary: 'Responsible use', secondaryHref: '/responsible-use' },
  },
  about: {
    eyebrow: 'About · 07', title: 'A drink-first answer to nightlife overload.',
    intro: 'We are building a companion for choosing what fits the night—not another marketplace asking you to book, buy or scroll forever.',
    sections: [
      { label: 'Our belief', title: 'The drink is a useful starting point.', body: 'Taste and occasion can make a night feel personal. Find My Sip turns that simple idea into structured, explainable discovery.' },
      { label: 'Our boundary', title: 'Focused enough to be trustworthy.', body: 'We are not building ticketing, delivery, bookings, payments, vendor management or logistics. Supporting context must improve the sip decision.' },
      { label: 'Our launch', title: 'Jaipur deserves specificity.', body: 'Starting with one city lets the product learn local moments and language before considering broader expansion.' },
    ],
    cta: { title: 'Follow the Jaipur build.', body: 'Join the early group helping us validate a more focused kind of nightlife companion.', primary: 'Join early access', href: '/early-access', secondary: 'Contact us', secondaryHref: '/contact' },
  },
  faq: {
    eyebrow: 'Questions · 08', title: 'Clear answers before the first recommendation.',
    intro: 'What is live, what comes later, and where we draw the line.',
    sections: [
      { label: 'Is the app live?', title: 'Not yet. Phase 1 is the public preview.', body: 'This website explains the product and captures Jaipur interest. The future app will live at app.mywebsite.in and support at support.mywebsite.in.' },
      { label: 'Do you sell or book?', title: 'No sales, delivery, tickets or reservations.', body: 'The product focuses on drink recommendations and drink-first planning. Venue and event information is supporting context only.' },
      { label: 'Is 0% supported?', title: 'Yes—from the first screen to the final result.', body: '0% is a complete path for preference, eligibility and occasion. It is not a secondary “other” category.' },
    ],
    cta: { title: 'Still have a question?', body: 'Send a note or register for launch updates. We will expand support content as real questions emerge.', primary: 'Contact us', href: '/contact', secondary: 'Join access', secondaryHref: '/early-access' },
  },
  contact: {
    eyebrow: 'Contact · 09', title: 'Tell us what Jaipur needs from a drink-first companion.',
    intro: 'For launch feedback, editorial collaboration or responsible-use questions, write to hello@mywebsite.in.',
    sections: [
      { label: 'Product feedback', title: 'Help sharpen the first release.', body: 'Share the occasions, taste questions, 0% needs or group-planning friction you think Find My Sip should understand.' },
      { label: 'Editorial', title: 'Local knowledge over generic listicles.', body: 'We welcome credible Jaipur perspectives on neighborhoods, culture, seasonality and responsible nightlife.' },
      { label: 'Support', title: 'A dedicated help center comes later.', body: 'support.mywebsite.in is reserved for the future product. Until then, the responsible-use and FAQ pages hold essential guidance.' },
    ],
    cta: { title: 'Prefer launch updates?', body: 'Early access is the best place to register feature interest while the Jaipur release is being shaped.', primary: 'Join early access', href: '/early-access', secondary: 'Read FAQ', secondaryHref: '/faq' },
  },
  'responsible-use': {
    eyebrow: 'Responsible use · 10', title: 'A better night never requires alcohol.',
    intro: 'Eligibility, local rules, personal limits and safe choices come before any recommendation.',
    note: 'Launch copy, imagery and promotional treatment require final review by qualified India and Rajasthan legal counsel.',
    sections: [
      { label: 'Eligibility', title: 'Alcohol-related paths are for eligible adults only.', body: 'The future experience must account for applicable age and state rules. Ineligible visitors continue into a complete 0% experience without a dead end.' },
      { label: 'Your night', title: 'Plan transport, pace and alternatives.', body: 'Recommendations are informational, never pressure to consume. Hydration, food, safe transport and choosing 0% are part of a considered night.' },
      { label: 'Our responsibility', title: 'No direct sales or irresponsible promotion.', body: 'We avoid purchase pressure, youth-coded creative, exaggerated claims and consumption-led imagery. State sensitivity remains a launch gate.' },
    ],
    cta: { title: 'Explore the complete 0% path.', body: 'The most inclusive version of Find My Sip starts with a satisfying choice for everyone.', primary: 'Explore 0%', href: '/zero-percent', secondary: 'Read FAQ', secondaryHref: '/faq' },
  },
}

export const marketingSlugs = Object.keys(marketingPages)
