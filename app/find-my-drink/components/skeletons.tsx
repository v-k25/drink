import styles from '../finder.module.css'

// Loading placeholders that mirror the real listing and detail layouts. Decorative only: no visible text.
// They are shown by the pending-link overlays (client side only), never streamed, so no-JS visitors never see them.

function CardPlaceholder({ wide }: { wide?: boolean }) {
  return <div className={`${styles.skCard} ${wide ? styles.skCardWide : ''}`.trim()}><span className={styles.skCardImage} /><span className={styles.skBar} style={{ width: wide ? '64%' : '78%' }} /><span className={styles.skBarSm} style={{ width: '52%' }} /></div>
}

export function ListingSkeletonBody() {
  return <div className={styles.listing}>
      <div className={styles.skRoot} aria-hidden="true" style={{ display: 'contents' }}>
        <section className={styles.discoveryControls}>
          <span className={styles.skSearch} />
          <span className={styles.skType} />
        </section>
        <div className={styles.filterPanel}>
          <span className={styles.skMobileFilter} />
          <div className={styles.skFacets}>{[5, 4, 3].map((count, group) => <div key={group} className={styles.skFacetGroup}>
            <span className={styles.skBarSm} style={{ width: 96 }} />
            <div className={styles.skChips}>{Array.from({ length: count }, (_, index) => <span key={index} className={styles.skChip} style={{ width: 64 + ((index * 23 + group * 11) % 40) }} />)}</div>
          </div>)}</div>
        </div>
        <div className={styles.resultsPanel}>
          <span className={styles.skPantry} />
          <div className={styles.discovery}>
            <section>
              <div className={styles.skHeading}><span className={styles.skBar} style={{ width: 190, height: 22 }} /><span className={styles.skPick} /></div>
              <div className={styles.choiceGrid}>{[0, 1, 2].map(card => <CardPlaceholder key={card} wide />)}</div>
            </section>
            <section>
              <div className={styles.skHeading}><span className={styles.skBar} style={{ width: 160, height: 22 }} /></div>
              <div className={styles.productGrid}>{Array.from({ length: 8 }, (_, card) => <CardPlaceholder key={card} />)}</div>
            </section>
          </div>
        </div>
      </div>
  </div>
}

export function DetailSkeletonBody() {
  return <div className={styles.detailBody}>
    <article className={styles.detailPage}>
      <div className={styles.skRoot} aria-hidden="true" style={{ display: 'contents' }}>
        <span className={styles.skBack} />
        <div className={styles.skHero} />
        <div className={styles.titleBlock}>
          <span className={styles.skBarSm} style={{ width: 120 }} />
          <span className={styles.skTitle} />
          <span className={styles.skBar} style={{ width: '90%' }} />
          <span className={styles.skBar} style={{ width: '78%' }} />
          <span className={styles.skBar} style={{ width: '64%' }} />
          <div className={styles.specChips}>{[96, 84, 110].map((width, index) => <span key={index} className={styles.skSpec} style={{ width }} />)}</div>
          <div className={styles.detailJumps}><span className={styles.skPrimary} /><span className={styles.skSecondary} /></div>
        </div>
        <section className={styles.makeSection}>
          <div className={styles.making}>
            <div className={styles.ingredientsBlock}>
              <span className={styles.skBar} style={{ width: 140, height: 22, marginBottom: 14 }} />
              <div className={styles.skRows}>{[0, 1, 2, 3].map(row => <span key={row} className={styles.skIngredient} />)}</div>
            </div>
            <div>
              <span className={styles.skBar} style={{ width: 110, height: 22, marginBottom: 14 }} />
              <div className={styles.skSteps}>{[0, 1, 2].map(row => <div key={row} className={styles.skStep}><span className={styles.skDot} /><div className={styles.skStepText}><span className={styles.skBar} style={{ width: '92%' }} /><span className={styles.skBar} style={{ width: row === 1 ? '48%' : '70%' }} /></div></div>)}</div>
            </div>
          </div>
        </section>
      </div>
    </article>
  </div>
}
