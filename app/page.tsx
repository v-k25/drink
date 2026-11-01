import Link from 'next/link'
import EarlyAccessForm from './early-access/form'
import MobileMenu from './mobile-menu'
import { ArrowRightIcon } from './icons'
import { Wordmark } from './logo'
import LightBringer from './light-bringer'
import NavPending from './nav-pending'
import { archivo, manrope } from './fonts'
import styles from './home.module.css'

const PARTNER_EMAIL = 'partners@socifer.com'
// Placeholder: set to digits with country code (e.g. '919800000000') to show the WhatsApp button.
const PARTNER_WHATSAPP = ''

const navLinks = [
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
    <div className={`${styles.home} sf ${archivo.variable} ${manrope.variable}`} data-theme="landing">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={styles.header} id="top">
        <div className={`${styles.wrap} ${styles.headerRow}`}>
          <a className={styles.wordmark} href="#top" aria-label="Socifer home"><Wordmark label={null} /></a>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {navLinks.map(([href, label]) => href.startsWith('/') ? <Link href={href} key={href}>{label}<NavPending /></Link> : <a href={href} key={href}>{label}</a>)}
          </nav>
          {/* Secondary here: the hero's Join the list is the one pink button on the first screen. */}
          <a className={`sf-btn sf-btn--secondary ${styles.navCta}`} href="#early-access">Join the list</a>
          <MobileMenu className={styles.mobileMenu}>
            {navLinks.map(([href, label]) => href.startsWith('/') ? <Link href={href} key={href}>{label}<NavPending /></Link> : <a href={href} key={href}>{label}</a>)}
            <a className="sf-btn sf-btn--primary" href="#early-access">Join the list</a>
          </MobileMenu>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {/* Full-screen hero: the photo fills the first screen behind the copy, in black and white. Wide crop from 768px,
            portrait crop below; a black gradient (left on desktop, bottom on phones) keeps the text on a near-solid ground. */}
        <section className={styles.hero} aria-labelledby="hero-title" data-light-hero>
          <picture className={styles.heroMedia}>
            <source media="(min-width: 768px)" type="image/avif" srcSet="/images/nightlife/hero-night-desktop-1600.avif 1600w, /images/nightlife/hero-night-desktop.avif 2400w" sizes="100vw" />
            <source media="(min-width: 768px)" type="image/webp" srcSet="/images/nightlife/hero-night-desktop-1600.webp 1600w, /images/nightlife/hero-night-desktop.webp 2400w" sizes="100vw" />
            <source type="image/avif" srcSet="/images/nightlife/hero-night-mobile-800.avif 800w, /images/nightlife/hero-night-mobile.avif 1280w" sizes="100vw" />
            <source type="image/webp" srcSet="/images/nightlife/hero-night-mobile-800.webp 800w, /images/nightlife/hero-night-mobile.webp 1280w" sizes="100vw" />
            <img src="/images/nightlife/hero-night-mobile-800.webp" alt="" width={800} height={1000} fetchPriority="high" decoding="async" />
          </picture>
          {/* Light-bringer: the same photo in colour, shown only inside a circle round the mouse (BT4). Same sources, so no extra download. */}
          <picture className={styles.heroLight} aria-hidden="true">
            <source media="(min-width: 768px)" type="image/avif" srcSet="/images/nightlife/hero-night-desktop-1600.avif 1600w, /images/nightlife/hero-night-desktop.avif 2400w" sizes="100vw" />
            <source media="(min-width: 768px)" type="image/webp" srcSet="/images/nightlife/hero-night-desktop-1600.webp 1600w, /images/nightlife/hero-night-desktop.webp 2400w" sizes="100vw" />
            <source type="image/avif" srcSet="/images/nightlife/hero-night-mobile-800.avif 800w, /images/nightlife/hero-night-mobile.avif 1280w" sizes="100vw" />
            <source type="image/webp" srcSet="/images/nightlife/hero-night-mobile-800.webp 800w, /images/nightlife/hero-night-mobile.webp 1280w" sizes="100vw" />
            <img src="/images/nightlife/hero-night-mobile-800.webp" alt="" width={800} height={1000} decoding="async" />
          </picture>
          <div className={`${styles.wrap} ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <span className="sf-sticker">Coming soon</span>
              <h1 id="hero-title" className={styles.h1}>Jaipur nights,{' '}<br />booked.</h1>
              <p className={styles.lede}>Book clubs and tables in Jaipur, then walk in with a pass. <b>We’re not taking bookings yet.</b></p>
              <div className={styles.cta}>
                <a className="sf-btn sf-btn--primary" href="#early-access">Join the list</a>
                <a className="sf-btn sf-btn--secondary" href="#how-it-works">How it works</a>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.wrap}>

        <section className={styles.section} id="how-it-works" aria-labelledby="how-title">
          <h2 id="how-title" className={styles.h2}>How it’ll work</h2>
          <ol className={styles.steps}>{steps.map(([title, copy], index) => <li key={title}><b className={styles.stepNumber} aria-hidden="true">{index + 1}</b><h3 className={styles.h3}>{title}</h3><p>{copy}</p></li>)}</ol>
        </section>

        <section className={styles.section} id="tools" aria-labelledby="tools-title">
          <h2 id="tools-title" className={styles.h2}>Free tools, no sign-up</h2>
          <div className={styles.tools}>
            {/* Each card shows a small, static preview of what the tool gives you. Decorative: the heading and line carry the meaning. */}
            <Link className={`${styles.tool} sf-lit`} href="/party-planner" data-light-card>
              <picture className={styles.photo}><source type="image/avif" srcSet="/images/nightlife/planner-1200.avif" /><source type="image/webp" srcSet="/images/nightlife/planner-1200.webp" /><img src="/images/nightlife/planner-1200.webp" alt="" width={1200} height={800} loading="lazy" decoding="async" /></picture>
              <div className={styles.toolBody}>
                <div><h3>Party Planner</h3><p>Work out what to buy for your party and what it will cost.</p></div>
                <div className={styles.preview} aria-hidden="true">
                  <span className={styles.previewHead}>20 guests · ₹8,000</span>
                  <span className={styles.previewLine}><span>16× Lager, 330 ml</span><b>₹1,920</b></span>
                  <span className={styles.previewLine}><span>2× Blended Scotch</span><b>₹3,060</b></span>
                  <span className={`${styles.previewLine} ${styles.previewTotal}`}><span>Estimated total</span><b>₹4,980</b></span>
                </div>
                <span className={styles.go}>Plan a party <ArrowRightIcon size={18} /></span>
              </div>
              <NavPending label="Loading Party Planner…" />
            </Link>
            <Link className={`${styles.tool} sf-lit`} href="/find-my-drink" data-light-card>
              <picture className={styles.photo}><source type="image/avif" srcSet="/images/nightlife/drink-1200.avif" /><source type="image/webp" srcSet="/images/nightlife/drink-1200.webp" /><img src="/images/nightlife/drink-1200.webp" alt="" width={1200} height={1800} loading="lazy" decoding="async" /></picture>
              <div className={styles.toolBody}>
                <div><h3>Find My Drink</h3><p>Find a spirit you’ll like, then browse 50 cocktails and mocktails to make at home.</p></div>
                <div className={styles.preview} aria-hidden="true">
                  <span className={styles.previewHead}>How should it feel?</span>
                  <span className={styles.previewChips}><span>Light and fresh</span><span className={styles.previewPicked}>Smooth and rounded</span><span>Rich and warming</span></span>
                </div>
                <span className={styles.go}>Find a drink <ArrowRightIcon size={18} /></span>
              </div>
              <NavPending label="Loading Find My Drink…" />
            </Link>
          </div>
        </section>

        <section className={styles.section} id="for-venues" aria-labelledby="venues-title">
          <div className={styles.venue}>
            <div><h2 id="venues-title" className={styles.h2}>Run a club in Jaipur?</h2><p className={styles.venueLine}>Partner with us.</p></div>
            <div className={styles.venueActions}>
              <a className={`${styles.venueButton} ${styles.venueSolid}`} href={`mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent('Venue partnership')}`} aria-label={`Mail us at ${PARTNER_EMAIL}`}>
                <svg className={styles.mailIcon} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                Mail us
              </a>
              {PARTNER_WHATSAPP && <a className={`${styles.venueButton} ${styles.venueOutline}`} href={`https://wa.me/${PARTNER_WHATSAPP}`}>WhatsApp</a>}
            </div>
          </div>
        </section>

        <section className={styles.section} id="early-access" aria-labelledby="early-title">
          <div className={styles.join}>
            <div><h2 id="early-title" className={styles.h2}>Get launch updates</h2><p className={`${styles.lede} ${styles.joinLede}`}>One email when bookings open in Jaipur.</p></div>
            <EarlyAccessForm />
          </div>
        </section>

        <section className={styles.section} id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2}>Questions</h2>
          <div className={`sf-accordion ${styles.faq}`}>
            <details><summary>Are bookings live?</summary><div className="body">Not yet. Join the list and we’ll email you when they are.</div></details>
            <details><summary>Who confirms my booking?</summary><div className="body">The venue will. You’ll get your pass once they do.</div></details>
            <details><summary>What will it cost?</summary><div className="body">Pricing isn’t set yet. We’ll share it before bookings open.</div></details>
            <details><summary>Can I use the tools without an account?</summary><div className="body">Yes. Both are free and need no login. Your plan stays on this device.</div></details>
            <details><summary>Does Socifer sell alcohol?</summary><div className="body">No. We don’t sell or deliver alcohol.</div></details>
            <details id="responsible-use"><summary>Who is Socifer for?</summary><div className="body">Adults in Jaipur going out with friends, whether they drink or not. If you drink, stick to the legal age, drink responsibly and never drink and drive.</div></details>
          </div>
        </section>

        <section className={styles.privacy} id="privacy" aria-labelledby="privacy-title">
          <h2 id="privacy-title" className={styles.h3}>Privacy</h2>
          <p>When you join the list, we keep your email and the city you chose. We only use them to email you when bookings open in Jaipur. Joining doesn’t create an account.</p>
        </section>
        </div>
        <LightBringer />
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <a className={styles.wordmark} href="#top" aria-label="Socifer, back to top"><Wordmark label={null} /></a>
          <nav aria-label="Footer navigation"><Link href="/party-planner">Plan a party<NavPending /></Link><Link href="/find-my-drink">Find a drink<NavPending /></Link><a href="#faq">FAQ</a><a href="#for-venues">For venues</a><a href="#privacy">Privacy</a><a href="#responsible-use">Responsible use</a></nav>
          <p>For adults. Drink responsibly and never drink and drive.<br />Stock photos, not Socifer venues. Photos: <a href="https://unsplash.com/photos/group-of-people-enjoying-concert-r3XvSBEQQLo">A J.</a>, <a href="https://unsplash.com/photos/champagne-pouring-into-celebration-flutes-xzKtOI1Cnxo">Alexander Naglestad</a>, <a href="https://unsplash.com/photos/three-colorful-cocktails-arranged-on-a-dark-reflective-surface-RQIq-yBMPAA">mediha ekici</a> and <a href="https://unsplash.com/photos/a-dj-in-front-of-spotlights-on-a-stage-Xwq-AS-rIs8">Davide Brocca</a> on Unsplash.</p>
        </div>
      </footer>
    </div>
  )
}
