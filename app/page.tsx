import Image from 'next/image'
import EarlyAccessForm from './early-access/form'
import MobileMenu from './mobile-menu'
import styles from './home.module.css'

const PARTNER_EMAIL = 'partners@socifer.com'
// Placeholder: set to digits with country code (e.g. '919800000000') to show the WhatsApp button.
const PARTNER_WHATSAPP = ''

const navLinks = [
  ['#how-it-works', 'How it works'],
  ['#for-venues', 'For venues'],
  ['/party-planner', 'Plan a party'],
  ['/find-my-drink', 'Find a drink'],
] as const

const values = [
  ['Venue-confirmed entry', 'Each booking is meant to be confirmed by the club, so you know before you go.'],
  ['Price shown upfront', 'You should see what a night costs before you commit.'],
  ['A digital pass', 'Your pass is meant to live on your phone, ready at the door.'],
  ['No calls or DMs', 'Planned to replace the back-and-forth with one place to book.'],
]

const steps = [
  ['Pick a night', 'Browse upcoming nights at Jaipur clubs.'],
  ['Choose tickets', 'Select how many tickets you need for your group.'],
  ['Pay', 'Pay online to confirm your tickets.'],
  ['Get your pass', 'Show your pass at the door.'],
]

const tools = [
  {
    title: 'Party Planner',
    copy: 'Build a drinks list for a private party and estimate the cost in ₹.',
    href: '/party-planner',
    label: 'Open Party Planner',
    image: '/images/nightlife/club-crowd.jpg',
    imageAlt: 'A crowd gathered under nightclub lights',
  },
  {
    title: 'Find My Drink',
    copy: 'Browse cocktail and mocktail recipes by ingredient, type or spirit.',
    href: '/find-my-drink',
    label: 'Browse recipes',
    image: '/images/nightlife/cocktail.jpg',
    imageAlt: 'A red cocktail on a table in a dark bar',
  },
]

export default function Home() {
  return (
    <div className={styles.home}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={styles.header} id="top">
        <a className={styles.wordmark} href="#top" aria-label="Socifer home">Socifer</a>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navLinks.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
          <a className={styles.navCta} href="#early-access">Get launch updates</a>
        </nav>
        <MobileMenu className={styles.mobileMenu}>
          {navLinks.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
          <a href="#early-access">Get launch updates</a>
        </MobileMenu>
      </header>

      <main id="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <picture>
            <source media="(max-width: 700px)" type="image/avif" srcSet="/images/nightlife/hero-night-mobile-800.avif" />
            <source media="(max-width: 700px)" type="image/webp" srcSet="/images/nightlife/hero-night-mobile-800.webp" />
            <source type="image/avif" srcSet="/images/nightlife/hero-night-desktop.avif" />
            <img className={styles.heroImage} src="/images/nightlife/hero-night-desktop.webp" alt="A silhouetted crowd with raised hands in front of a stage lit in magenta and violet, with sparks rising" width={2400} height={1600} fetchPriority="high" decoding="async" />
          </picture>
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.script}>Jaipur, after dark</p>
            <h1 id="hero-title">Book the night.</h1>
            <p className={styles.heroLead}>Club bookings in Jaipur are launching soon. We&apos;re not taking bookings yet. Join the launch list and we&apos;ll tell you as soon as they open.</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#early-access">Get launch updates</a>
              <a className={styles.secondaryButton} href="#how-it-works">How it works</a>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="why-title">
          <div className={styles.intro}><p className={styles.eyebrow}>Why Socifer</p><h2 id="why-title">Going out, without the chasing.</h2><p>This is what we&apos;re building. None of it is live yet.</p></div>
          <ul className={styles.valueGrid}>{values.map(([title, copy]) => <li key={title}><h3>{title}</h3><p>{copy}</p></li>)}</ul>
        </section>

        <section className={`${styles.section} ${styles.raised}`} id="how-it-works" aria-labelledby="booking-title">
          <div className={styles.intro}><p className={styles.eyebrow}>Coming soon</p><h2 id="booking-title">How booking will work.</h2><p>Ticket booking isn&apos;t live yet. This is the plan for launch, and details may change.</p></div>
          <ol className={styles.steps}>{steps.map(([title, copy], index) => <li key={title}><b aria-hidden="true">0{index + 1}</b><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </section>

        <section className={`${styles.section} ${styles.venues}`} id="for-venues" aria-labelledby="venues-title">
          <div><p className={styles.eyebrow}>For venues</p><h2 id="venues-title">Run a club in Jaipur? Partner with us.</h2><p>We&apos;re talking to Jaipur clubs ahead of launch. Get in touch to hear how Socifer could work with your venue.</p></div>
          <div className={styles.venueActions}>
            <a className={styles.primaryButton} href={`mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent('Venue partnership')}`}>Email {PARTNER_EMAIL}</a>
            {PARTNER_WHATSAPP && <a className={styles.secondaryButton} href={`https://wa.me/${PARTNER_WHATSAPP}`}>WhatsApp us</a>}
          </div>
        </section>

        <p className={styles.divider} aria-hidden="true">Jaipur nights</p>

        <section className={styles.section} aria-labelledby="tools-title">
          <div className={styles.intro}><p className={styles.eyebrow}>Available now</p><h2 id="tools-title">Plan the pre-party.</h2><p>Two free tools to use while clubs come on board.</p></div>
          <div className={styles.toolGrid}>{tools.map(tool => <article className={styles.tool} key={tool.title}>
            <div className={styles.toolImage}><Image src={tool.image} alt={tool.imageAlt} fill sizes="(max-width: 700px) 100vw, 50vw" /></div>
            <div className={styles.toolBody}><h3>{tool.title}</h3><p>{tool.copy}</p><a href={tool.href}>{tool.label} <span aria-hidden="true">→</span></a></div>
          </article>)}</div>
        </section>

        <section className={`${styles.section} ${styles.reserve}`} id="early-access" aria-labelledby="early-title">
          <div className={styles.reserveCopy}><p className={styles.eyebrow}>Launch updates</p><h2 id="early-title">Want to be first in?</h2><p>Join the Jaipur launch list for Socifer updates and early news. Bookings aren&apos;t open yet, so there&apos;s nothing to reserve today.</p></div>
          <div className={styles.reservePanel}><EarlyAccessForm /></div>
        </section>

        <section className={`${styles.section} ${styles.faq}`} id="faq" aria-labelledby="faq-title">
          <p className={styles.eyebrow}>FAQ</p><h2 id="faq-title">Good to know.</h2>
          <details><summary>Are club bookings live?</summary><p>No. Club bookings are coming soon. You can join the launch list for updates.</p></details>
          <details><summary>Who will confirm a booking?</summary><p>The plan is for the club to confirm each booking. We&apos;ll share the details when bookings open.</p></details>
          <details><summary>What will it cost?</summary><p>Pricing and any fees haven&apos;t been decided yet. We&apos;ll publish them before bookings open.</p></details>
          <details><summary>Can I use the tools as a guest?</summary><p>Yes. Both tools have a quick age check, and no account is needed. Your party plan is kept on this device only.</p></details>
          <details><summary>Does Socifer sell alcohol or show live stock?</summary><p>No. Party Planner estimates costs from its catalogue; it does not show store stock. Socifer does not sell or deliver alcohol.</p></details>
          <details id="responsible-use"><summary>Who is Socifer for, and what does responsible use mean?</summary><p>Socifer is for adults. There is room for everyone&apos;s choice, including not drinking. If you choose alcohol, follow local eligibility laws, drink responsibly and never drink and drive.</p></details>
        </section>

        <section className={`${styles.section} ${styles.privacy}`} id="privacy" aria-labelledby="privacy-title"><h2 id="privacy-title">Early-access privacy</h2><p>We store your email, selected interests, drinks preference, Jaipur selection and consent record in Supabase, along with the signup source, to manage the early-access list and send the updates you agree to receive. Joining does not create a product account.</p></section>
      </main>

      <footer className={styles.footer}>
        <a className={styles.wordmark} href="#top">Socifer</a>
        <nav aria-label="Footer navigation"><a href="/party-planner">Party Planner</a><a href="/find-my-drink">Find My Drink</a><a href="#faq">FAQ</a><a href="#for-venues">For venues</a><a href="#privacy">Privacy</a><a href="#responsible-use">Responsible use</a></nav>
        <p>© Socifer · Jaipur. For adults. Drink responsibly and never drink and drive.</p>
        <p className={styles.photoCredit}>Stock imagery; not listed Jaipur venues. Photos: <a href="https://www.pexels.com/photo/1190298/">Wendy Wei / Pexels</a> · <a href="https://www.pexels.com/photo/people-dancing-inside-dim-room-2114365/">Jerome Govender / Pexels</a> · <a href="https://www.pexels.com/photo/glass-of-red-cocktail-on-a-wooden-table-in-a-darkly-lit-bar-17541202/">Thu Huynh / Pexels</a></p>
      </footer>
    </div>
  )
}
