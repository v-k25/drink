import Image from 'next/image'
import EarlyAccessForm from './early-access/form'
import styles from './home.module.css'

const tools = [
  {
    title: 'Plan a private party.',
    copy: 'Build a drinks list for a private party and estimate the cost.',
    detail: 'Select catalogue products and quantities manually, then adjust the list for your plan.',
    href: '/party-planner',
    label: 'Open Party Planner',
    image: '/images/nightlife/club-crowd.jpg',
    imageAlt: 'A crowd gathered under nightclub lights',
    imageClass: 'plannerImage',
  },
  {
    title: 'Find a drink.',
    copy: 'Browse cocktail and mocktail recipes.',
    detail: 'Search by ingredients, type, or spirit to find a recipe to make.',
    href: '/find-my-drink',
    label: 'Browse recipes',
    image: '/images/nightlife/cocktail.jpg',
    imageAlt: 'A red cocktail on a table in a dark bar',
    imageClass: 'drinkImage',
  },
]

export default function Home() {
  return (
    <div className={styles.home}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={styles.header} id="top">
        <a className={styles.wordmark} href="#top" aria-label="Socifer home">Socifer</a>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="/party-planner">Party Planner</a><a href="/find-my-drink">Find My Drink</a><a href="#how-it-works">How bookings will work</a><a className={styles.navCta} href="#early-access">Get launch updates</a>
        </nav>
        <details className={styles.mobileMenu}>
          <summary>Menu <span aria-hidden="true">+</span></summary>
          <nav aria-label="Mobile navigation"><a href="/party-planner">Party Planner</a><a href="/find-my-drink">Find My Drink</a><a href="#how-it-works">How bookings will work</a><a href="#early-access">Get launch updates</a></nav>
        </details>
      </header>
      <main id="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <Image className={styles.heroImage} src="/images/nightlife/club-crowd.jpg" alt="Crowd dancing beneath coloured lights in a nightclub" fill preload sizes="100vw" />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.status}>Jaipur · pre-launch</p>
            <h1 id="hero-title">Club bookings<br />in Jaipur.</h1>
            <p className={styles.comingSoon}>Coming soon.</p>
            <p className={styles.heroLead}>Request a booking, get venue approval, then pay and receive your booking pass.</p>
            <div className={styles.actions}><a className={styles.primaryButton} href="#early-access">Get launch updates</a><a className={styles.secondaryButton} href="/party-planner">Try Party Planner <span aria-hidden="true">→</span></a></div>
          </div>
        </section>

        <aside className={styles.statusStrip} aria-label="Service status"><span>Jaipur</span><span>Clubs coming soon</span><span>Tools available now</span></aside>

        <section className={styles.tools} aria-labelledby="tools-title">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>Available now</p><h2 id="tools-title">Party planning and drink recipes.</h2></div>
          <div className={styles.toolGrid}>{tools.map((tool, index) => <article className={`${styles.toolFeature} ${index === 1 ? styles.toolFeatureOffset : ''}`} key={tool.title}>
            <div className={`${styles.toolImage} ${styles[tool.imageClass]}`}><Image src={tool.image} alt={tool.imageAlt} fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
            <p className={styles.cardIndex}>0{index + 1}</p><h3>{tool.title}</h3><p>{tool.copy}</p><p className={styles.detail}>{tool.detail}</p><a href={tool.href}>{tool.label} <span aria-hidden="true">→</span></a>
          </article>)}</div>
        </section>

        <section className={styles.booking} id="how-it-works" aria-labelledby="booking-title">
          <div className={styles.bookingIntro}><p className={styles.eyebrow}>Future booking flow</p><h2 id="booking-title">How booking will work.</h2><p>Club bookings are coming soon. When they launch, this is the order to expect.</p></div>
          <ol className={styles.bookingSteps}><li><b>01</b><div><h3>Request</h3><p>Tell us when you want to go and who is joining you.</p></div></li><li><b>02</b><div><h3>Venue approval</h3><p>The venue reviews your request before you are asked to pay.</p></div></li><li><b>03</b><div><h3>Payment</h3><p>Pay only after approval, using the quote you receive.</p></div></li><li><b>04</b><div><h3>Booking pass</h3><p>Receive your pass after payment is confirmed.</p></div></li></ol>
        </section>

        <section className={styles.faq} id="faq" aria-labelledby="faq-title">
          <p className={styles.eyebrow}>FAQ</p><h2 id="faq-title">Good to know.</h2>
          <details><summary>Are club bookings live?</summary><p>No. Club bookings are coming soon. You can join the launch list for updates.</p></details>
          <details><summary>Can I use the tools as a guest?</summary><p>You can browse recipes as a guest. Party Planner has an eligibility step, and saving a plan requires an account.</p></details>
          <details><summary>Does Socifer sell alcohol or show live stock?</summary><p>No. Party Planner estimates costs from its catalogue; it does not show store stock. Socifer does not sell or deliver alcohol.</p></details>
          <details id="responsible-use"><summary>What does responsible use mean?</summary><p>There is room for everyone&apos;s choice, including not drinking. If you choose alcohol, follow local eligibility laws, drink responsibly and never drink and drive.</p></details>
        </section>

        <section className={styles.earlyAccess} id="early-access" aria-labelledby="early-title"><div><p className={styles.eyebrow}>Launch updates</p><h2 id="early-title">Get booking launch updates.</h2><p>Join the Jaipur launch list for Socifer updates and early news.</p></div><EarlyAccessForm /></section>
        <section className={styles.privacy} id="privacy" aria-labelledby="privacy-title"><h2 id="privacy-title">Early-access privacy</h2><p>We store your email, selected interests, drinks preference, Jaipur selection and consent record in Supabase, along with the signup source, to manage the early-access list and send the updates you agree to receive. Joining does not create a product account.</p></section>
      </main>
      <footer className={styles.footer}><a className={styles.wordmark} href="#top">Socifer</a><nav aria-label="Footer navigation"><a href="/party-planner">Party Planner</a><a href="/find-my-drink">Find My Drink</a><a href="#faq">FAQ</a><a href="#privacy">Privacy</a><a href="#responsible-use">Responsible use</a></nav><p>© Socifer · Jaipur</p><p className={styles.photoCredit}>Stock imagery; not listed Jaipur venues. Photos: <a href="https://www.pexels.com/photo/people-dancing-inside-dim-room-2114365/">Jerome Govender / Pexels</a> · <a href="https://www.pexels.com/photo/glass-of-red-cocktail-on-a-wooden-table-in-a-darkly-lit-bar-17541202/">Thu Huynh / Pexels</a></p></footer>
    </div>
  )
}
