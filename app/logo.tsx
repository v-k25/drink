// Little Horns logo (Black Tie, BT2). Letters are Archivo ExtraBold at its widest width, converted to outlines; the O is a
// drawn ring with two horns. Paths were generated once from the font with fontTools (see docs/implementation-progress.md, BT2).
// The letters take currentColor; the O takes --accent (rani pink, black in print).
const LETTERS = 'M451.6 876Q367.6 876 294.7 866Q221.8 855.9 167 830.9Q112.2 805.8 81.3 761Q50.3 716.2 50.3 647.2Q50.3 645.2 50.3 641.9Q50.3 638.7 51.3 635.6H250.8Q249.8 639.6 249.5 644Q249.3 648.4 249.3 653.2Q249.3 683.7 272.5 701.3Q295.7 718.9 338.1 726Q380.5 733.1 436.6 733.1Q460.2 733.1 484.8 731.7Q509.4 730.2 532.3 726.6Q555.2 723 573.5 716.1Q591.7 709.3 602.6 698.5Q613.5 687.7 613.5 672.5Q613.5 650.8 590.5 638.3Q567.5 625.8 528.4 618.2Q489.2 610.7 440.5 604.8Q391.9 598.8 339.8 590.6Q287.6 582.4 239 567.9Q190.3 553.4 151.1 529.3Q112 505.2 89 467.4Q66 429.5 66 374.9Q66 320.3 93.7 280.6Q121.3 240.9 171.2 215.1Q221.1 189.4 289 176.9Q357 164.5 437.1 164.5Q518.7 164.5 585.2 177.1Q651.6 189.7 699.3 215.2Q747 240.7 772.7 279.3Q798.3 318 798.3 370.1V383.9H600.9V375.8Q600.9 354.9 582.9 338.7Q564.8 322.5 530.4 312.8Q495.9 303 446.6 303Q387.7 303 349.7 310.4Q311.8 317.8 293.8 330.6Q275.8 343.3 275.8 358.5Q275.8 378.8 298.7 390.7Q321.7 402.5 360.9 409.3Q400 416.2 448.7 422.1Q497.3 428 549.5 436.2Q601.6 444.4 650.2 458.1Q698.9 471.9 738.1 495.6Q777.3 519.4 800.2 555.7Q823.2 592 823.2 645.1Q823.2 727.8 775.3 778.8Q727.4 829.7 643.5 852.9Q559.6 876 451.6 876Z M2439.5 876Q2295 876 2198.8 835.5Q2102.7 795 2054.9 715.8Q2007 636.5 2007 520Q2007 349.5 2117.8 257Q2228.5 164.5 2440.1 164.5Q2558.3 164.5 2648.1 199.9Q2738 235.3 2788.6 299.8Q2839.2 364.2 2839.2 451.7H2640.7Q2640.7 409.3 2615.1 378.8Q2589.6 348.3 2543.8 331.8Q2498 315.4 2436.5 315.4Q2365.2 315.4 2316 339.5Q2266.7 363.7 2241.5 406.8Q2216.3 449.9 2216.3 507V532Q2216.3 588.5 2241.5 632.1Q2266.7 675.7 2315.4 700.4Q2364.1 725.1 2434.3 725.1Q2500.4 725.1 2547.8 709.4Q2595.1 693.7 2620.7 663.8Q2646.3 633.8 2646.3 591.8H2839.6Q2839.6 676.8 2790.9 740.9Q2742.2 805.1 2652.5 840.6Q2562.9 876 2439.5 876Z M2978.5 864V176.5H3182.1V864Z M3351.5 864V176.5H4028.3V327.4H3555.1V466.2H3976V617.1H3555.1V864Z M4150.5 864V176.5H4867.2V327.4H4354.7V442.8H4803.4V588.9H4354.7V713.1H4875.2V864Z M5013.5 864V176.5H5585.8Q5660.9 176.5 5710.2 207.3Q5759.4 238.2 5784 288.6Q5808.6 339 5808.6 398.5Q5808.6 463.9 5777.7 517.4Q5746.7 570.9 5684.5 602L5825.1 864H5595.4L5481.3 635.3H5217.1V864ZM5217.1 484.8H5519.3Q5556 484.8 5577.9 462.8Q5599.9 440.7 5599.9 404.2Q5599.9 379.6 5590 362.3Q5580.1 345.1 5562.2 336.2Q5544.2 327.4 5519.3 327.4H5217.1Z'
const HORNED_O = 'M958.0 520.2A451.2 355.8 0 1 1 1860.5 520.2A451.2 355.8 0 1 1 958.0 520.2ZM1161.7 520.2A247.6 192.9 0 1 0 1656.9 520.2A247.6 192.9 0 1 0 1161.7 520.2ZM1138.5 299.6L1075.4 4.0L1292.0 200.0ZM1526.6 200.0L1743.2 4.0L1680.0 299.6Z'

export function Wordmark({ className, label = 'Socifer' }: { className?: string; label?: string | null }) {
  const named = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return <svg className={className} viewBox="50 0 5775 864" {...named} focusable="false">
    <path d={LETTERS} fill="currentColor" />
    <path d={HORNED_O} fill="var(--accent, #ff2d87)" />
  </svg>
}

export function LogoMark({ className, label = 'Socifer' }: { className?: string; label?: string | null }) {
  const named = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return <svg className={className} viewBox="958 -26 903 903" {...named} focusable="false">
    <path d={HORNED_O} fill="var(--accent, #ff2d87)" />
  </svg>
}

// Loading animation (Little Horns loader, "the Devil's Circle"): the pink horned O wakes up. Sharp white eyes with slit
// pupils open across the middle of the hole (each spilling over its edge onto the pink), a black grin with two fangs
// opens in the ring below the hole, a red tongue drops past the ring's bottom edge, a pointed tail curls out, it winks, then everything resets to the plain logo O. Decorative: the caller supplies
// the spoken status. Timing and the reduced-motion fallback (the plain O, still) are .sf-loader in ui.css.
export function HornLoader({ className }: { className?: string }) {
  return <svg className={className ? `sf-loader ${className}` : 'sf-loader'} viewBox="900 -54 1250 1070" aria-hidden="true" focusable="false">
    <g className="sf-horn-tail"><path className="sf-horn-tail-line" d="M1823 694C1890 740 1960 730 1985 650C2005 585 2030 540 2075 520" /><path className="sf-horn-tip" d="M2058 488L2142 512L2068 550L2077 518Z" /></g>
    <path className="sf-horn-o" d={HORNED_O} />
    <g className="sf-horn-eye"><path className="sf-horn-white" d="M1122 419L1334 496Q1330 586 1232 590Q1140 582 1122 419Z" /><ellipse className="sf-horn-pupil" cx="1270" cy="522" rx="14" ry="34" /></g>
    <g className="sf-horn-eye sf-horn-wink"><path className="sf-horn-white" d="M1696 419L1484 496Q1488 586 1586 590Q1678 582 1696 419Z" /><ellipse className="sf-horn-pupil" cx="1548" cy="522" rx="14" ry="34" /></g>
    <g className="sf-horn-grin"><path className="sf-horn-mouth" d="M1248 724Q1413 806 1579 724Q1413 960 1248 724Z" /></g>
    <g className="sf-horn-tongue"><path className="sf-horn-tongue-fill" d="M1354 777L1472 777L1472 930Q1472 996 1413 996Q1354 996 1354 930Z" /><path className="sf-horn-tongue-line" d="M1413 800L1413 942" /></g>
    <g className="sf-horn-grin"><path className="sf-horn-fang" d="M1295 741L1350 757L1320 810Z" /><path className="sf-horn-fang" d="M1531 741L1476 757L1506 810Z" /></g>
  </svg>
}

// Branded loading screen contents, shared by the once-per-visit intro (app/layout.tsx) and slow page loads
// (app/nav-pending.tsx): the loader in a soft pink glow with a thin pink line sweeping beneath it.
// Decorative; the caller supplies any spoken status. Styles are .sf-ls in ui.css.
export function LoadingScreen() {
  return <div className="sf-ls">
    <span className="sf-ls-glow" />
    <HornLoader />
    <span className="sf-ls-bar"><span /></span>
  </div>
}
