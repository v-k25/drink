import EarlyAccessForm from './early-access/form'
import MobileMenu from './mobile-menu'
import { bricolage, manrope } from './fonts'
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

// Each step carries one of the four planned benefits. Copy describes the plan, under a "How it'll work" heading.
const steps = [
  ['Pick a night', 'See what’s on in Jaipur.'],
  ['Send a request', 'Choose tickets or a table. The price is shown upfront.'],
  ['Venue confirms', 'The venue says yes before you pay.'],
  ['Show your pass', 'It’s on your phone. No calls or DMs.'],
]

export default function Home() {
  return (
    <div className={`${styles.home} sf ${bricolage.variable} ${manrope.variable}`} data-theme="landing">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={styles.header} id="top">
        <div className={`${styles.wrap} ${styles.headerRow}`}>
          <a className={styles.wordmark} href="#top" aria-label="Socifer home">socifer</a>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {navLinks.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
          </nav>
          <a className={`sf-btn sf-btn--primary ${styles.navCta}`} href="#early-access">Get launch updates</a>
          <MobileMenu className={styles.mobileMenu}>
            {navLinks.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
            <a className="sf-btn sf-btn--primary" href="#early-access">Get launch updates</a>
          </MobileMenu>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className="sf-sticker">Coming soon</span>
            <h1 id="hero-title" className={styles.h1}>Jaipur nights,{' '}<br />booked.</h1>
            <p className={styles.lede}>Book clubs and tables in Jaipur, then walk in with a pass. <b>We’re not taking bookings yet.</b></p>
            <div className={styles.cta}>
              <a className="sf-btn sf-btn--primary" href="#early-access">Join the list</a>
              <a className={`sf-btn sf-btn--secondary ${styles.secondary}`} href="#how-it-works">How it works</a>
            </div>
          </div>
          <div>
            <div className={styles.arch}>
              <picture>
                <source type="image/avif" srcSet="/images/nightlife/hero-night-mobile-800.avif 800w, /images/nightlife/hero-night-mobile.avif 1200w" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 340px, 420px" />
                <source type="image/webp" srcSet="/images/nightlife/hero-night-mobile-800.webp 800w, /images/nightlife/hero-night-mobile.webp 1200w" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 340px, 420px" />
                <img src="/images/nightlife/hero-night-mobile-800.webp" alt="" width={800} height={1200} fetchPriority="high" decoding="async" />
              </picture>
            </div>
            <p className={styles.credit}>Stock imagery; not listed Jaipur venues</p>
          </div>
        </section>

        <section className={styles.section} id="how-it-works" aria-labelledby="how-title">
          <h2 id="how-title" className={styles.h2}>How it’ll work</h2>
          <ol className={styles.steps}>{steps.map(([title, copy], index) => <li key={title}><b className={styles.stepNumber} aria-hidden="true">{index + 1}</b><h3 className={styles.h3}>{title}</h3><p>{copy}</p></li>)}</ol>
        </section>

        <section className={styles.section} id="tools" aria-labelledby="tools-title">
          <h2 id="tools-title" className={styles.h2}>Free tools, no sign-up</h2>
          <div className={styles.tools}>
            <a className={`${styles.tool} ${styles.toolYellow}`} href="/party-planner"><div><h3>Party Planner</h3><p>Work out the drinks and the cost for a house party.</p></div><span className={styles.go}>Plan a party <span aria-hidden="true">→</span></span></a>
            <a className={`${styles.tool} ${styles.toolPlum}`} href="/find-my-drink"><div><h3>Find My Drink</h3><p>50 cocktails and mocktails you can make at home.</p></div><span className={styles.go}>Find a drink <span aria-hidden="true">→</span></span></a>
          </div>
        </section>

        <section className={styles.section} id="for-venues" aria-labelledby="venues-title">
          <div className={styles.venue}>
            <div><h2 id="venues-title" className={styles.h2}>Run a club in Jaipur?</h2><p className={styles.venueLine}>Partner with us.</p></div>
            <div className={styles.venueActions}>
              <a className={`${styles.venueButton} ${styles.venueSolid}`} href={`mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent('Venue partnership')}`}>Email {PARTNER_EMAIL}</a>
              {PARTNER_WHATSAPP && <a className={`${styles.venueButton} ${styles.venueOutline}`} href={`https://wa.me/${PARTNER_WHATSAPP}`}>WhatsApp</a>}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.join}`} id="early-access" aria-labelledby="early-title">
          <div><h2 id="early-title" className={styles.h2}>Get launch updates</h2><p className={`${styles.lede} ${styles.joinLede}`}>One email when bookings open in Jaipur.</p></div>
          <div className={styles.card}><EarlyAccessForm /></div>
        </section>

        <section className={styles.section} id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2}>Questions</h2>
          <div className={`sf-accordion ${styles.faq}`}>
            <details><summary>Are bookings live?</summary><div className="body">Not yet. Join the list and we’ll email you when they are.</div></details>
            <details><summary>Who confirms my booking?</summary><div className="body">The venue will. You’ll get your pass once they do.</div></details>
            <details><summary>What will it cost?</summary><div className="body">We haven’t decided pricing or fees yet. We’ll share them before bookings open.</div></details>
            <details><summary>Can I use the tools without an account?</summary><div className="body">Yes. Party Planner and Find My Drink are free and don’t need a login. Your plan stays on this device.</div></details>
            <details><summary>Does Socifer sell alcohol?</summary><div className="body">No. We don’t sell or deliver alcohol, and we can’t tell you which shops carry what.</div></details>
            <details id="responsible-use"><summary>Who is Socifer for?</summary><div className="body">Adults in Jaipur going out with friends, drinking or not. If you drink, follow local eligibility laws, drink responsibly and never drink and drive.</div></details>
          </div>
        </section>

        <section className={styles.privacy} id="privacy" aria-labelledby="privacy-title">
          <h2 id="privacy-title" className={styles.h3}>Privacy</h2>
          <p>We store your email, your Jaipur selection and your consent record in Supabase, along with the signup source, to manage the early-access list and send the updates you agree to receive. Joining does not create a product account.</p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <a className={styles.wordmark} href="#top" aria-label="Socifer, back to top">socifer</a>
          <nav aria-label="Footer navigation"><a href="/party-planner">Plan a party</a><a href="/find-my-drink">Find a drink</a><a href="#faq">FAQ</a><a href="#for-venues">For venues</a><a href="#privacy">Privacy</a><a href="#responsible-use">Responsible use</a></nav>
          <p>For adults. Drink responsibly and never drink and drive.<br />Stock imagery; not listed Jaipur venues. Photo: <a href="https://www.pexels.com/photo/1190298/">Wendy Wei / Pexels</a>.</p>
        </div>
      </footer>
    </div>
  )
}
