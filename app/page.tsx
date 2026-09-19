import Image from 'next/image'
import { UsersRound, GlassWater, ClipboardList, ShoppingCart, Menu } from 'lucide-react'
import EarlyAccessForm from './early-access/form'

const steps = [
  { title: 'People & budget', Icon: UsersRound },
  { title: 'Categories', Icon: GlassWater },
  { title: 'Choose drinks', Icon: ClipboardList },
  { title: 'Shopping list', Icon: ShoppingCart },
]

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header" id="top">
        <a className="logo" href="#top" aria-label="AllCheers home">AllCheers</a>
        <nav aria-label="Main navigation">
          <a href="#finder">Find My Drink — coming soon</a>
          <a className="button" href="/party-planner">Plan my party</a>
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Navigation menu"><Menu aria-hidden="true" size={30} /></summary>
          <nav aria-label="Mobile navigation">
            <a href="/party-planner">Plan my party</a>
            <a href="#finder">Find My Drink — coming soon</a>
            <a href="#early-access">Join early access</a>
          </nav>
        </details>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-photo">
            <Image src="/images/allcheers-party-hero-v2.png" alt="Imagined adults dancing and raising drinks at a Jaipur-inspired night party." fill sizes="100vw" preload />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Jaipur / Party Planner beta</p>
            <h1 id="hero-title">Good Times<br />Start Here.</h1>
            <p className="hero-lede">Your drinks. Your budget. One clear party list.</p>
            <div className="hero-actions">
              <a className="button" href="/party-planner">Plan my party</a>
              <a className="button button-ghost" href="#finder">Find my drink — coming soon</a>
            </div>
            <p className="hero-helper">Try the planner as a guest. Print or share your list.</p>
          </div>
        </section>
        <section className="section finder" id="finder" aria-labelledby="finder-title">
          <p className="eyebrow">A look at what&apos;s coming</p>
          <h2 id="finder-title">Find your kind of drink.</h2>
          <p className="section-intro">Taste. Budget. A match explained.</p>
          <div className="drink-grid">
            <article className="drink-card">
              <Image src="/images/amber-cocktail.jpg" alt="An amber cocktail with ice and citrus peel." fill sizes="(max-width: 700px) 90vw, 45vw" />
              <h3>Cocktails</h3>
            </article>
            <article className="drink-card mocktail">
              <Image src="/images/berry-mocktail.jpg" alt="A berry drink garnished with fruit." fill sizes="(max-width: 700px) 90vw, 45vw" />
              <h3>Non-alcoholic</h3>
            </article>
          </div>
          <div className="finder-explanation">
            <p><strong>The idea:</strong> tell us your occasion, taste and maximum bottle budget. See a match with its name, bottle size, estimated Jaipur price and reasons it fits.</p>
            <p className="fine-print">Illustrative drink photography, not live recommendations. The finder is coming soon; non-alcoholic catalogue coverage is still being developed.</p>
          </div>
        </section>
        <section className="planner" id="planner" aria-labelledby="planner-title">
          <div className="planner-inner">
            <div className="planner-journey">
              <h2 id="planner-title">Your party. One clear list.</h2>
              <ol className="steps">
                {steps.map(({ title, Icon }, index) => (
                  <li key={title}>
                    <span className="step-icon"><span className="step-number">{index + 1}</span><Icon size={32} strokeWidth={1.7} aria-hidden="true" /></span>
                    <span>{title}</span>
                  </li>
                ))}
              </ol>
              <a className="button" href="/party-planner">Open Party Planner</a>
            </div>
            <div className="preview-wrap">
              <p className="preview-label">Illustrative preview</p>
              <div className="list-preview">
                <h3>Your party list</h3>
                <ul>{['Choose your drinks', 'Adjust quantities', 'Review your budget', 'Print or share your list'].map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
            <p className="planner-note">Build your list, then shop independently at local stores. Prices are estimates; store prices and availability may differ.</p>
          </div>
        </section>
        <section className="jaipur-band" aria-labelledby="jaipur-title">
          <Image src="/images/jaipur-jal-mahal.jpg" alt="" fill sizes="100vw" />
          <div>
            <h2 id="jaipur-title">Jaipur, you&apos;re first.</h2>
            <a className="button button-light" href="#early-access">Join early access</a>
          </div>
        </section>
        <section className="section narrow" id="early-access" aria-labelledby="early-title">
          <p className="eyebrow">Coming first to Jaipur</p>
          <h2 id="early-title">Good times are coming.</h2>
          <p className="section-intro">Tell us what you&apos;d like to explore. We&apos;ll share early-access and launch updates.</p>
          <EarlyAccessForm />
        </section>
        <section className="section narrow faq" id="faq" aria-labelledby="faq-title">
          <h2 id="faq-title">A few things to know.</h2>
          <details>
            <summary>Can I use the finder or planner now?</summary>
            <p>You can use the Party Planner now as a guest: build your list and print or share it. The finder is still coming soon. Cloud saving requires phone setup and is not yet verified. Early access is a way to hear about launch, not an account.</p>
          </details>
          <details>
            <summary>Where can I buy the drinks?</summary>
            <p>AllCheers will help you make a list to shop independently at local stores. We do not sell or deliver alcohol. Prices will be estimates, not live store offers or a guarantee of availability.</p>
          </details>
          <details id="responsible-use">
            <summary>What does responsible use mean?</summary>
            <p>There&apos;s room for everyone&apos;s choice, including not drinking. If you choose alcohol, follow local eligibility laws, drink responsibly and never drink and drive.</p>
          </details>
          <div className="privacy-note" id="privacy">
            <h3>Early-access privacy</h3>
            <p>When you join, AllCheers stores your email, selected interests, drinks preference, Jaipur selection and consent record in Supabase, along with the signup source. We use this information to manage the early-access list and send the updates you agree to receive. Joining does not create a product account.</p>
          </div>
        </section>
      </main>
      <footer>
        <a className="logo" href="#top">AllCheers</a>
        <nav aria-label="Footer navigation">
          <a href="#finder">Find My Drink</a><a href="/party-planner">Party Planner</a>
          <a href="#faq">FAQ</a><a href="#privacy">Privacy</a><a href="#responsible-use">Responsible use</a>
        </nav>
      </footer>
    </>
  )
}
