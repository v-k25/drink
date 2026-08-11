import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================================================================
   POUR — a liquid recommendation index
   Single-file React app · drop in as App.jsx (Vite react template)
================================================================ */

/* ----------------------------- DATA ----------------------------- */

const MOODS = [
  { tag: "citrus", label: "Citrus & bright" },
  { tag: "bitter", label: "Bitter & bold" },
  { tag: "herbal", label: "Herbal & green" },
  { tag: "smoky",  label: "Smoky & deep" },
  { tag: "sweet",  label: "Sweet & slow" },
  { tag: "creamy", label: "Soft & creamy" },
];

const CATS = ["Aperitivo", "Long & Cold", "After Dark", "Zero Proof"];
const STRENGTHS = [{ v: 1, l: "Session" }, { v: 2, l: "Standard" }, { v: 3, l: "Stiff" }];
const TEMPS = [{ v: "iced", l: "Iced" }, { v: "hot", l: "Hot" }, { v: "any", l: "Either" }];

const DRINKS = [
  { id: "negroni", name: "Negroni", cat: "Aperitivo", abv: 24, temp: "iced", moods: ["bitter", "herbal"], str: 3, sweet: 3, time: "3 min", garnish: "Flamed orange peel", seed: "negroni-orange-glass", featured: true,
    desc: "Equal parts, zero apologies. Gin, Campari and sweet vermouth stirred to silk — aperitivo hour's sharpest suit.",
    ing: ["30ml gin", "30ml Campari", "30ml sweet vermouth"],
    build: ["Build over ice in a mixing glass", "Stir for thirty slow seconds", "Strain over one large cube"] },
  { id: "paloma", name: "Paloma", cat: "Long & Cold", abv: 11, temp: "iced", moods: ["citrus", "sweet"], str: 2, sweet: 5, time: "2 min", garnish: "Grapefruit wedge", seed: "paloma-grapefruit-salt", featured: true,
    desc: "Tequila's brightest hour — grapefruit, lime and a salted rim, long and cold over crushed ice.",
    ing: ["50ml blanco tequila", "15ml lime juice", "Grapefruit soda", "Pinch of salt"],
    build: ["Salt half the rim", "Build tequila & lime over crushed ice", "Top with grapefruit soda"] },
  { id: "gimlet", name: "Garden Gimlet", cat: "Long & Cold", abv: 18, temp: "iced", moods: ["herbal", "citrus"], str: 2, sweet: 4, time: "4 min", garnish: "Basil leaf", seed: "garden-gimlet-basil", featured: true,
    desc: "Gin pressed through basil and cucumber — a gimlet that spent the afternoon in a greenhouse.",
    ing: ["50ml gin", "20ml lime cordial", "6 basil leaves", "2 cucumber slices"],
    build: ["Press basil & cucumber with gin", "Shake with lime cordial", "Double strain over ice"] },
  { id: "oldfashioned", name: "Old Fashioned", cat: "After Dark", abv: 32, temp: "iced", moods: ["smoky", "bitter"], str: 3, sweet: 4, time: "4 min", garnish: "Orange coin", seed: "old-fashioned-whiskey", featured: true,
    desc: "Whiskey, sugar, bitters — three notes played perfectly. The drink that never has to introduce itself.",
    ing: ["60ml rye or bourbon", "1 sugar cube", "3 dashes aromatic bitters"],
    build: ["Muddle sugar with bitters", "Stir with whiskey over ice", "Express orange oils on top"] },
  { id: "spritz", name: "Aperitivo Spritz", cat: "Aperitivo", abv: 8, temp: "iced", moods: ["bitter", "citrus"], str: 1, sweet: 6, time: "1 min", garnish: "Orange slice", seed: "aperol-spritz-sunset",
    desc: "Three parts bubbles, two parts bitter, one part soda — a sunset you can drink.",
    ing: ["90ml prosecco", "60ml aperitivo bitter", "30ml soda water"],
    build: ["Build over ice in a wine glass", "Stir once, gently", "Finish with orange"] },
  { id: "espressomartini", name: "Espresso Martini", cat: "After Dark", abv: 16, temp: "iced", moods: ["bitter", "sweet"], str: 2, sweet: 6, time: "5 min", garnish: "Three beans", seed: "espresso-martini-foam",
    desc: "Vodka shaken violent with fresh espresso — the only alarm clock that works at midnight.",
    ing: ["45ml vodka", "25ml coffee liqueur", "1 shot espresso"],
    build: ["Pull the espresso fresh", "Shake hard with plenty of ice", "Fine strain, admire the foam"] },
  { id: "mezcalsour", name: "Mezcal Sour", cat: "After Dark", abv: 21, temp: "iced", moods: ["smoky", "citrus"], str: 2, sweet: 5, time: "4 min", garnish: "Chili-salt rim", seed: "mezcal-sour-smoke",
    desc: "Smoke with a smile — mezcal, lime and agave shaken cloudy, tasting of embers and citrus groves.",
    ing: ["50ml mezcal", "25ml lime juice", "15ml agave", "15ml aquafaba"],
    build: ["Dry shake first", "Shake with ice", "Strain up, dust the rim"] },
  { id: "toddy", name: "Hot Toddy", cat: "After Dark", abv: 12, temp: "hot", moods: ["herbal", "sweet"], str: 1, sweet: 7, time: "5 min", garnish: "Clove-studded lemon", seed: "hot-toddy-honey-lemon",
    desc: "Honey, lemon and warm whiskey — a wool blanket in liquid form, prescribed for cold evenings.",
    ing: ["50ml whiskey", "1 tbsp honey", "15ml lemon juice", "Clove-studded lemon wheel"],
    build: ["Dissolve honey in warm water", "Add whiskey & lemon", "Steep with the clove wheel"] },
  { id: "irishcoffee", name: "Irish Coffee", cat: "After Dark", abv: 10, temp: "hot", moods: ["creamy", "sweet"], str: 1, sweet: 8, time: "4 min", garnish: "Grated nutmeg", seed: "irish-coffee-cream",
    desc: "Hot coffee under a cold cream cloud — sweet, strong, and quietly dangerous.",
    ing: ["40ml Irish whiskey", "120ml hot coffee", "10ml demerara syrup", "Lightly whipped cream"],
    build: ["Warm the glass", "Stir coffee, whiskey, syrup", "Float cream over a spoon"] },
  { id: "paperplane", name: "Paper Plane", cat: "Aperitivo", abv: 23, temp: "iced", moods: ["bitter", "herbal"], str: 3, sweet: 3, time: "3 min", garnish: "None — it flies clean", seed: "paper-plane-amaro",
    desc: "Bourbon, aperitivo, amaro, lemon — folded sharp, served ice cold. Bitterness with excellent posture.",
    ing: ["22ml bourbon", "22ml aperitivo", "22ml amaro", "22ml lemon juice"],
    build: ["Equal parts into the shaker", "Shake hard, fine strain", "Serve up in a coupe"] },
  { id: "zerogrove", name: "Zero Grove", cat: "Zero Proof", abv: 0, temp: "iced", moods: ["citrus", "herbal"], str: 1, sweet: 5, time: "2 min", garnish: "Charred rosemary", seed: "zero-proof-grapefruit",
    desc: "Zero proof, full volume — grapefruit, rosemary and tonic complexity without the octane.",
    ing: ["60ml non-alcoholic gin", "40ml grapefruit juice", "Rosemary sprig", "Tonic to top"],
    build: ["Torch the rosemary tip", "Build over ice", "Top with tonic"] },
  { id: "goldenhour", name: "Golden Hour", cat: "Zero Proof", abv: 0, temp: "hot", moods: ["sweet", "creamy"], str: 1, sweet: 8, time: "6 min", garnish: "Turmeric dust", seed: "golden-milk-turmeric",
    desc: "Turmeric oat milk warmed with ginger and honey — the nightcap for people who wake up early.",
    ing: ["200ml oat milk", "1 tsp turmeric", "10ml ginger syrup", "Honey to taste"],
    build: ["Warm the milk gently", "Whisk in the spices", "Froth, pour, dust"] },
];

const BY_ID = Object.fromEntries(DRINKS.map(d => [d.id, d]));

const HERO_WORDS = [
  { word: "NEGRONI", id: "negroni" },
  { word: "PALOMA", id: "paloma" },
  { word: "OLD FASHIONED", id: "oldfashioned" },
  { word: "GIMLET", id: "gimlet" },
  { word: "SPRITZ", id: "spritz" },
];

const TICKER = ["Negroni", "Paloma", "Old Fashioned", "Garden Gimlet", "Aperitivo hour", "Mezcal Sour", "Espresso Martini", "Hot Toddy", "Stirred, never shaken", "Zero proof, full volume", "Paper Plane", "One large cube"];

/* --------------------------- HELPERS ---------------------------- */

const score = (d, p) => {
  let s = 2;
  s += d.moods.includes(p.mood) ? 40 : 8;
  const sd = Math.abs(d.str - p.strength);
  s += sd === 0 ? 24 : sd === 1 ? 12 : 0;
  s += p.temp === "any" ? 12 : d.temp === p.temp ? 18 : 0;
  s += Math.round(16 * (1 - Math.abs(d.sweet - p.sweet) / 10));
  return Math.min(100, s);
};

const sweetWord = v => (v <= 2 ? "Bone dry" : v <= 4 ? "Dry-ish" : v <= 6 ? "Balanced" : v <= 8 ? "Sweet" : "Dessert");
const strengthWord = v => ["", "Session-strength", "Standard proof", "Properly stiff"][v];

function useReduced() {
  const [r] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return r;
}

function useInView(threshold = 0.18) {
  const ref = useRef();
  const [inView, set] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); io.disconnect(); } },
      { threshold, rootMargin: "0px 0px -8% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function useScramble(words, reduced) {
  const [text, setText] = useState(words[0]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (reduced) { setText(words[idx]); const t = setInterval(() => setIdx(i => (i + 1) % words.length), 2600); return () => clearInterval(t); }
    const CH = "AEKMNORSTXZ#%&*+";
    const target = words[idx]; let frame = 0, t1, t2;
    const step = () => {
      frame++;
      const solved = Math.floor(frame / 3);
      let out = "";
      for (let i = 0; i < target.length; i++)
        out += i < solved ? target[i] : (target[i] === " " ? " " : CH[Math.floor(Math.random() * CH.length)]);
      setText(out);
      if (solved < target.length) t1 = setTimeout(step, 28);
      else t2 = setTimeout(() => setIdx(i => (i + 1) % words.length), 2400);
    };
    step();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx]);
  return text;
}

function useCountUp(target, reduced) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (reduced) { setV(target); prev.current = target; return; }
    const from = prev.current, t0 = performance.now(), dur = 700;
    let raf;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

/* --------------------------- PIECES ----------------------------- */

function Reveal({ children, delay = 0, className = "" }) {
  const { ref, inView } = useInView();
  return <div ref={ref} className={`rv ${inView ? "in" : ""} ${className}`} style={{ "--d": `${delay}ms` }}>{children}</div>;
}

function MaskTitle({ lines, className = "" }) {
  const { ref, inView } = useInView(0.3);
  return (
    <h2 ref={ref} className={`mtitle ${inView ? "in" : ""} ${className}`}>
      {lines.map((l, i) => (
        <span className="ln" key={i}><span className="ln-i" style={{ transitionDelay: `${i * 110}ms` }}>{l}</span></span>
      ))}
    </h2>
  );
}

function Glass({ fill = 60, id, width = 220, className = "" }) {
  const y = 118 - (fill / 100) * 94;
  return (
    <svg className={`glass ${className}`} viewBox="0 0 120 142" style={{ width }} aria-hidden="true">
      <defs>
        <clipPath id={`gc-${id}`}>
          <path d="M23 25 L97 25 L90.5 121 Q89.5 127 83.5 127 L36.5 127 Q30.5 127 29.5 121 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#gc-${id})`}>
        <g className="liquid" style={{ transform: `translateY(${y}px)` }}>
          <path className="wave" fill="var(--pour)"
            d="M-120 6 Q-105 0 -90 6 T-60 6 T-30 6 T0 6 T30 6 T60 6 T90 6 T120 6 T150 6 T180 6 V170 H-120 Z" />
        </g>
      </g>
      <path d="M18 16 L102 16 L94 124 Q93 132 85 132 L35 132 Q27 132 26 124 Z"
        fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <line x1="26" y1="118" x2="94" y2="118" stroke="var(--ink)" strokeWidth="1" opacity=".25" />
    </svg>
  );
}

function Cursor({ enabled }) {
  const dot = useRef(), ring = useRef();
  useEffect(() => {
    if (!enabled) return;
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, s = 1, ts = 1, raf;
    const mv = e => { x = e.clientX; y = e.clientY; if (dot.current) dot.current.style.transform = `translate(${x - 4}px,${y - 4}px)`; };
    const ov = e => { ts = e.target.closest && e.target.closest("a,button,.chip,.row-head,input,label") ? 1.9 : 1; };
    const loop = () => {
      rx += (x - rx) * .13; ry += (y - ry) * .13; s += (ts - s) * .16;
      if (ring.current) ring.current.style.transform = `translate(${rx - 19}px,${ry - 19}px) scale(${s})`;
      raf = requestAnimationFrame(loop);
    };
    addEventListener("mousemove", mv); addEventListener("mouseover", ov);
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener("mousemove", mv); removeEventListener("mouseover", ov); cancelAnimationFrame(raf); };
  }, [enabled]);
  if (!enabled) return null;
  return <><div className="c-dot" ref={dot} /><div className="c-ring" ref={ring} /></>;
}

function Marquee({ items, reverse = false }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className={`marquee-track ${reverse ? "rev" : ""}`}>
        {row.map((t, i) => <span key={i}><em>{t}</em><i>✺</i></span>)}
      </div>
    </div>
  );
}

/* ----------------------------- APP ------------------------------ */

export default function App() {
  const reduced = useReduced();
  const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  /* header clock */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  const h = now.getHours();
  const phase = h >= 5 && h < 11 ? "slow morning" : h < 16 ? "afternoon light" : h < 19 ? "golden hour · apéro" : h < 23 ? "evening pour" : "nightcap";
  const clock = `${String(h).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} — ${phase}`;

  /* hero scramble */
  const word = useScramble(HERO_WORDS.map(w => w.word), reduced);
  const heroDrink = BY_ID[HERO_WORDS.find(w => w.word === word)?.id || "negroni"] || BY_ID.negroni;

  /* recommendation engine */
  const [prefs, setPrefs] = useState({ mood: "bitter", strength: 2, temp: "iced", sweet: 4 });
  const ranked = useMemo(() => [...DRINKS].map(d => ({ ...d, match: score(d, prefs) })).sort((a, b) => b.match - a.match), [prefs]);
  const best = ranked[0], runners = ranked.slice(1, 4);
  const pct = useCountUp(best.match, reduced);
  const surprise = () => setPrefs({ mood: MOODS[Math.floor(Math.random() * MOODS.length)].tag, strength: 1 + Math.floor(Math.random() * 3), temp: ["iced", "hot", "any"][Math.floor(Math.random() * 3)], sweet: Math.floor(Math.random() * 11) });

  /* cellar */
  const [catFilter, setCatFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const cellarRows = DRINKS.filter(d => catFilter === "All" || d.cat === catFilter);
  const openInCellar = id => {
    setOpenId(id); setCatFilter("All");
    setTimeout(() => document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }), 80);
  };

  /* footer */
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const featured = DRINKS.filter(d => d.featured);

  return (
    <>
      <style>{CSS}</style>
      <Cursor enabled={fine && !reduced} />
      <div className="noise" aria-hidden="true" />

      {/* ---------- HEADER ---------- */}
      <header className="hd">
        <a href="#top" className="logo">POUR<span>✳</span><small>vol. 04</small></a>
        <nav className="hd-nav">
          <a href="#match">The Match</a><a href="#cellar">Cellar</a><a href="#pours">House Pours</a><a href="#ritual">Ritual</a>
        </nav>
        <div className="hd-clock">{clock}</div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <Reveal><p className="eyebrow">Liquid recommendations — stirred slowly since aperitivo hour</p></Reveal>
            <h1 className="h1">
              <span className="ln"><span className="ln-i" style={{ transitionDelay: "80ms" }}>Tonight</span></span>
              <span className="ln"><span className="ln-i" style={{ transitionDelay: "180ms" }}>calls for a</span></span>
              <span className="ln"><span className="ln-i scramble" style={{ transitionDelay: "280ms" }}>{word}</span></span>
            </h1>
            <Reveal delay={400}>
              <p className="hero-sub">Answer four small questions. Get one perfect pour. No lists, no noise — just the drink your evening has been describing.</p>
              <a className="btn" href="#match">Find your pour <span className="arr">↓</span></a>
            </Reveal>
          </div>

          <div className="hero-stage">
            <div className="badge" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <defs><path id="bcirc" d="M60 60 m -44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
                <text className="badge-t"><textPath href="#bcirc">FIND YOUR POUR ✦ SIP SLOWLY ✦ FIND YOUR POUR ✦ SIP SLOWLY ✦ </textPath></text>
              </svg>
              <span className="badge-star">✳</span>
            </div>
            <Glass id="hero" fill={Math.min(96, heroDrink.abv * 3.4)} width={265} className="hero-glass" />
            <span className="float-chip fc1" key={heroDrink.id + "a"}>{heroDrink.abv}% ABV</span>
            <span className="float-chip fc2" key={heroDrink.id + "b"}>{heroDrink.moods[0]} · {heroDrink.temp}</span>
            <span className="float-chip fc3" key={heroDrink.id + "c"}>{heroDrink.garnish}</span>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true"><span className="cue-dot" />scroll</div>
      </section>

      <Marquee items={TICKER} />

      {/* ---------- 01 · THE MATCH ---------- */}
      <section id="match" className="sec">
        <div className="wrap">
          <Reveal><p className="eyebrow">01 — The Match</p></Reveal>
          <MaskTitle lines={["Tell us your evening.", "We'll pour the answer."]} className="sec-title" />

          <div className="match-grid">
            {/* controls */}
            <Reveal className="panel">
              <div className="field">
                <label className="field-lab">Mood</label>
                <div className="chips">
                  {MOODS.map(m => (
                    <button key={m.tag} className={`chip ${prefs.mood === m.tag ? "on" : ""}`}
                      aria-pressed={prefs.mood === m.tag}
                      onClick={() => setPrefs(p => ({ ...p, mood: m.tag }))}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-lab">Strength</label>
                <div className="seg">
                  {STRENGTHS.map(s => (
                    <button key={s.v} className={`seg-b ${prefs.strength === s.v ? "on" : ""}`}
                      onClick={() => setPrefs(p => ({ ...p, strength: s.v }))}>{s.l}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-lab">Temperature</label>
                <div className="seg">
                  {TEMPS.map(t => (
                    <button key={t.v} className={`seg-b ${prefs.temp === t.v ? "on" : ""}`}
                      onClick={() => setPrefs(p => ({ ...p, temp: t.v }))}>{t.l}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-lab">Sweetness — <strong>{sweetWord(prefs.sweet)}</strong></label>
                <input type="range" min="0" max="10" value={prefs.sweet} aria-label="Sweetness"
                  onChange={e => setPrefs(p => ({ ...p, sweet: +e.target.value }))} />
                <div className="range-ends"><span>bone dry</span><span>dessert</span></div>
              </div>
              <button className="btn ghost" onClick={surprise}>Surprise me <span className="arr">↻</span></button>
            </Reveal>

            {/* result */}
            <div className="result" key={best.id}>
              <div className="result-top">
                <Glass id="meter" fill={pct} width={92} className="meter" />
                <div>
                  <p className="result-eyebrow">Your match</p>
                  <div className="pct"><span className="pct-n">{pct}</span><span className="pct-d">/100</span></div>
                </div>
              </div>
              <h3 className="result-name">{best.name}</h3>
              <p className="result-meta">{best.cat} · {best.temp} · {best.time} · {best.abv}% abv</p>
              <p className="result-desc">{best.desc}</p>
              <div className="notes">
                {best.moods.map(m => <span className="note" key={m}>{m}</span>)}
                <span className="note">{strengthWord(best.str)}</span>
                <span className="note">{sweetWord(best.sweet)}</span>
              </div>
              <button className="btn" onClick={() => openInCellar(best.id)}>Open recipe in the cellar <span className="arr">↓</span></button>

              <div className="runners">
                <p className="field-lab">Also worth the glass</p>
                {runners.map(r => (
                  <button className="runner" key={r.id} onClick={() => openInCellar(r.id)}>
                    <span className="runner-n">{r.name}</span>
                    <span className="runner-bar"><i style={{ width: `${r.match}%` }} /></span>
                    <span className="runner-p">{r.match}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 02 · THE CELLAR ---------- */}
      <section id="cellar" className="sec sec-alt">
        <div className="wrap cellar-grid">
          <div className="cellar-left">
            <Reveal><p className="eyebrow">02 — The Cellar</p></Reveal>
            <MaskTitle lines={["Every pour,", "indexed."]} className="sec-title" />
            <Reveal delay={150}><p className="cellar-blurb">Twelve recipes, four disciplines, one rule: stir slowly. Filter by mood of the house, then open a row for the full build.</p></Reveal>
            <div className="cat-filter">
              {["All", ...CATS].map(c => (
                <button key={c} className={`chip ${catFilter === c ? "on" : ""}`} onClick={() => setCatFilter(c)}>
                  {c} <small>{c === "All" ? DRINKS.length : DRINKS.filter(d => d.cat === c).length}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="cellar-rows">
            {cellarRows.map((d, i) => {
              const open = openId === d.id;
              return (
                <div className={`row ${open ? "open" : ""}`} id={`row-${d.id}`} key={d.id}>
                  <button className="row-head" onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open}>
                    <span className="row-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="row-name">{d.name}</span>
                    <span className="row-cat">{d.cat}</span>
                    <span className="row-abv">{d.abv}%</span>
                    <span className="row-x">{open ? "–" : "+"}</span>
                  </button>
                  <div className="row-body"><div className="row-inner">
                    <div className="row-img kb"><img src={`https://picsum.photos/seed/${d.seed}/560/420`} alt={d.name} loading="lazy" /></div>
                    <div className="row-txt">
                      <p className="row-desc">{d.desc}</p>
                      <div className="row-cols">
                        <div><p className="field-lab">Build with</p><ul>{d.ing.map(x => <li key={x}>{x}</li>)}</ul></div>
                        <div><p className="field-lab">Method</p><ol>{d.build.map(x => <li key={x}>{x}</li>)}</ol></div>
                      </div>
                      <p className="row-gar">Garnish — {d.garnish} · Ready in {d.time}</p>
                    </div>
                  </div></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 03 · HOUSE POURS (stacked cards) ---------- */}
      <section id="pours" className="sec">
        <div className="wrap">
          <Reveal><p className="eyebrow">03 — House Pours</p></Reveal>
          <MaskTitle lines={["Four drinks we'd", "defend with our lives."]} className="sec-title" />
          <div className="stack">
            {featured.map((d, i) => (
              <article className={`pcard ${i % 2 ? "dark" : ""}`} key={d.id} style={{ "--i": i }}>
                <div className="pcard-c">
                  <span className="pcard-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="pcard-name">{d.name}</h3>
                  <p className="pcard-cat">{d.cat} · {d.abv}% abv · {d.time}</p>
                  <p className="pcard-desc">{d.desc}</p>
                  <div className="pills">{d.ing.map(x => <span className="pill" key={x}>{x}</span>)}</div>
                  <ol className="pcard-build">{d.build.map(x => <li key={x}>{x}</li>)}</ol>
                </div>
                <div className="pcard-img kb"><img src={`https://picsum.photos/seed/${d.seed}/800/900`} alt={d.name} loading="lazy" /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 04 · THE RITUAL ---------- */}
      <section id="ritual" className="sec">
        <div className="wrap">
          <Reveal><p className="eyebrow">04 — The Ritual</p></Reveal>
          <MaskTitle lines={["The arc of a", "well-spent evening."]} className="sec-title" />
          <div className="ritual">
            {[
              ["18:00", "The Apéro", "Low ABV, high spirits. Bitter things in the dying sun."],
              ["20:00", "The Main Pour", "Stiff, stirred, unhurried. The drink the night is about."],
              ["22:30", "The Nightcap", "Something dark or something warm. One, never two."],
              ["00:00", "The Water", "The most underrated drink on any menu. Two glasses."],
            ].map(([t, n, d], i) => (
              <Reveal key={t} delay={i * 90}>
                <div className="rrow"><span className="r-time">{t}</span><span className="r-name">{n}</span><span className="r-note">{d}</span><span className="r-arrow">→</span></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Marquee items={["Bitter", "Sweet", "Iced", "Stirred", "Zero proof", "Golden hour", "One large cube", "Sip slowly"]} reverse />

      {/* ---------- FOOTER ---------- */}
      <footer className="ft">
        <div className="wrap">
          <h2 className="ft-big">Stay thirsty</h2>
          <div className="ft-grid">
            <div>
              <p className="field-lab">The Friday Pour — one recipe a week</p>
              {sent
                ? <p className="ft-ok">✳ You're on the list. First pour this Friday.</p>
                : (
                  <form className="ft-form" onSubmit={e => { e.preventDefault(); if (email.trim()) setSent(true); }}>
                    <input type="email" required placeholder="you@evenings.com" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
                    <button className="btn" type="submit">Pour it in <span className="arr">→</span></button>
                  </form>
                )}
            </div>
            <div className="ft-links">
              <a href="#match">The Match</a><a href="#cellar">Cellar</a><a href="#pours">House Pours</a><a href="#top">Back to top ↑</a>
            </div>
          </div>
          <div className="ft-base">
            <span>© 2025 POUR Index — vol. 04</span>
            <span>Drink with intention. Legal age only.</span>
            <span>Stirred, never shaken*</span>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ----------------------------- CSS ------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Archivo:wght@400;500;600;700&display=swap');

:root{
  --paper:#F3EFE6; --paper2:#EAE4D5; --ink:#191510; --ink60:rgba(25,21,16,.62);
  --line:rgba(25,21,16,.16); --accent:#DF4B1B; --pour:#DE9A3B; --hd:64px;
  --disp:"Fraunces",Georgia,serif; --body:"Archivo","Helvetica Neue",sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--paper);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--ink);color:var(--paper)}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{font-family:inherit;color:inherit;background:none;border:none;cursor:pointer}
section{scroll-margin-top:calc(var(--hd) + 10px)}
.wrap{max-width:1240px;margin:0 auto;padding:0 5vw}
.sec{padding:110px 0}
.sec-alt{background:var(--paper2)}
.eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:18px}
.sec-title{font-family:var(--disp);font-weight:500;font-size:clamp(2.3rem,5vw,4rem);line-height:1.02;letter-spacing:-.02em;margin-bottom:56px}

/* reveal + line mask */
.rv{opacity:0;transform:translateY(26px);transition:opacity .9s cubic-bezier(.2,.6,.1,1) var(--d,0ms),transform .9s cubic-bezier(.2,.6,.1,1) var(--d,0ms)}
.rv.in{opacity:1;transform:none}
.mtitle .ln{display:block;overflow:hidden}
.mtitle .ln-i{display:inline-block;transform:translateY(112%);transition:transform 1.05s cubic-bezier(.19,1,.22,1)}
.mtitle.in .ln-i{transform:none}
.h1 .ln{display:block;overflow:hidden}
.h1 .ln-i{display:inline-block;transform:translateY(112%);transition:transform 1.05s cubic-bezier(.19,1,.22,1)}
body .h1 .ln-i{transform:translateY(112%)}
body.loaded .h1 .ln-i{transform:none}

/* header */
.hd{position:fixed;inset:0 0 auto;height:var(--hd);display:flex;align-items:center;justify-content:space-between;padding:0 5vw;background:rgba(243,239,230,.86);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:80}
.logo{font-family:var(--disp);font-weight:600;font-size:20px;letter-spacing:.01em}
.logo span{color:var(--accent);display:inline-block;margin:0 6px}
.logo small{font-family:var(--body);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink60)}
.hd-nav{display:flex;gap:28px}
.hd-nav a{font-size:12px;letter-spacing:.14em;text-transform:uppercase;position:relative;padding:4px 0}
.hd-nav a::after{content:"";position:absolute;left:0;bottom:0;height:1px;width:100%;background:var(--accent);transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.hd-nav a:hover::after{transform:scaleX(1);transform-origin:left}
.hd-clock{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink60);font-variant-numeric:tabular-nums}

/* hero */
.hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;padding-top:calc(var(--hd) + 40px);position:relative}
.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;width:100%}
.h1{font-family:var(--disp);font-weight:500;font-size:clamp(3.2rem,8.6vw,7.4rem);line-height:.96;letter-spacing:-.025em}
.h1 .scramble{font-style:italic;color:var(--accent);white-space:nowrap}
.hero-sub{max-width:44ch;margin:28px 0 34px;color:var(--ink60);font-size:17px}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--paper);border:1px solid var(--ink);padding:14px 24px;border-radius:999px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;transition:background .3s,border-color .3s,transform .3s}
.btn .arr{transition:transform .3s}
.btn:hover{background:var(--accent);border-color:var(--accent)}
.btn:hover .arr{transform:translateX(4px)}
.btn.ghost{background:transparent;color:var(--ink)}
.btn.ghost:hover{background:var(--ink);color:var(--paper)}

.hero-stage{position:relative;display:flex;justify-content:center;padding:20px 0}
.hero-glass{transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.hero-stage:hover .hero-glass{transform:rotate(-4deg)}
.liquid{transition:transform 1.1s cubic-bezier(.25,.8,.25,1)}
.wave{animation:wavex 5.5s linear infinite}
@keyframes wavex{to{transform:translateX(60px)}}
.badge{position:absolute;top:-14px;right:4%;width:118px;height:118px}
.badge svg{width:100%;height:100%;animation:spin 18s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.badge-t{font-size:10.5px;letter-spacing:.16em;fill:var(--ink);font-family:var(--body);text-transform:uppercase}
.badge-star{position:absolute;inset:0;display:grid;place-items:center;font-size:24px;color:var(--accent)}
.float-chip{position:absolute;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border:1px solid var(--ink);border-radius:999px;padding:7px 14px;background:var(--paper);animation:floaty 5s ease-in-out infinite alternate,pop-in .6s ease both}
.fc1{top:8%;left:2%}
.fc2{top:46%;right:-2%;animation-delay:1.2s,.1s}
.fc3{bottom:6%;left:10%;animation-delay:2.2s,.2s}
@keyframes floaty{from{transform:translateY(-6px)}to{transform:translateY(6px)}}
@keyframes pop-in{from{opacity:0;transform:translateY(12px)}}
.scroll-cue{position:absolute;bottom:26px;left:5vw;display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink60)}
.cue-dot{width:1px;height:34px;background:var(--ink60);position:relative;overflow:hidden}
.cue-dot::after{content:"";position:absolute;top:-12px;left:0;width:1px;height:12px;background:var(--accent);animation:cue 1.8s ease-in-out infinite}
@keyframes cue{to{top:40px}}

/* marquee */
.marquee{overflow:hidden;border-block:1px solid var(--line);padding:16px 0}
.marquee-track{display:flex;width:max-content;animation:scroll-x 30s linear infinite}
.marquee-track.rev{animation-direction:reverse}
.marquee-track span{display:flex;align-items:center;font-family:var(--disp);font-style:italic;font-size:20px;white-space:nowrap}
.marquee-track i{font-style:normal;color:var(--accent);margin:0 22px;font-size:14px}
@keyframes scroll-x{to{transform:translateX(-50%)}}

/* match section */
.match-grid{display:grid;grid-template-columns:440px 1fr;gap:44px;align-items:start}
.panel{border:1px solid var(--ink);padding:30px;display:flex;flex-direction:column;gap:26px;background:var(--paper)}
.field-lab{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink60);display:block;margin-bottom:12px;font-weight:600}
.field-lab strong{color:var(--accent)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:13px;transition:all .25s cubic-bezier(.2,.7,.2,1)}
.chip small{color:var(--ink60);margin-left:4px}
.chip:hover{border-color:var(--ink)}
.chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink);animation:chip-pop .3s ease}
.chip.on small{color:var(--paper)}
@keyframes chip-pop{50%{transform:scale(.94)}}
.seg{display:flex;border:1px solid var(--line);border-radius:999px;padding:3px;width:max-content}
.seg-b{padding:8px 18px;border-radius:999px;font-size:13px;transition:all .25s}
.seg-b.on{background:var(--ink);color:var(--paper)}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:26px;background:transparent;cursor:pointer}
input[type=range]::-webkit-slider-runnable-track{height:2px;background:var(--line)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--ink);margin-top:-8px;transition:transform .2s,background .2s}
input[type=range]:active::-webkit-slider-thumb{transform:scale(1.3);background:var(--accent)}
input[type=range]::-moz-range-track{height:2px;background:var(--line)}
input[type=range]::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:50%;background:var(--ink)}
.range-ends{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink60);margin-top:6px}

.result{border:1px solid var(--ink);padding:38px;background:var(--paper);animation:pop-in .5s ease both;position:relative}
.result::before{content:"✳";position:absolute;top:20px;right:26px;color:var(--accent);font-size:18px}
.result-top{display:flex;align-items:center;gap:28px;margin-bottom:8px}
.result-eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink60);font-weight:600}
.pct{display:flex;align-items:baseline;gap:4px}
.pct-n{font-family:var(--disp);font-size:clamp(4rem,7vw,6.4rem);line-height:1;font-weight:500;font-variant-numeric:tabular-nums}
.pct-d{font-family:var(--disp);font-style:italic;color:var(--ink60);font-size:22px}
.result-name{font-family:var(--disp);font-style:italic;font-weight:500;font-size:clamp(2rem,3.6vw,3rem);letter-spacing:-.01em;margin:6px 0 4px}
.result-meta{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:14px}
.result-desc{color:var(--ink60);max-width:52ch;margin-bottom:18px}
.notes{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:26px}
.note{font-size:11px;letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid var(--accent);padding-bottom:3px}
.runners{margin-top:36px;border-top:1px solid var(--line);padding-top:22px}
.runner{display:grid;grid-template-columns:150px 1fr 48px;align-items:center;gap:16px;width:100%;padding:11px 0;border-bottom:1px solid var(--line);text-align:left;transition:padding-left .3s}
.runner:hover{padding-left:10px}
.runner-n{font-family:var(--disp);font-size:18px}
.runner-bar{height:3px;background:var(--line);overflow:hidden}
.runner-bar i{display:block;height:100%;background:var(--accent);transition:width .8s cubic-bezier(.2,.7,.2,1)}
.runner-p{font-size:12px;color:var(--ink60);font-variant-numeric:tabular-nums;text-align:right}

/* cellar */
.cellar-grid{display:grid;grid-template-columns:340px 1fr;gap:60px;align-items:start}
.cellar-left{position:sticky;top:calc(var(--hd) + 30px)}
.cellar-left .sec-title{margin-bottom:22px}
.cellar-blurb{color:var(--ink60);margin-bottom:26px;max-width:32ch}
.cat-filter{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.cat-filter .chip{border-radius:0;padding:8px 2px;border:none;border-bottom:1px solid var(--line);width:100%;text-align:left;font-size:15px;font-family:var(--disp)}
.cat-filter .chip.on{background:none;color:var(--accent);border-color:var(--accent)}
.row{border-bottom:1px solid var(--line)}
.row-head{display:grid;grid-template-columns:54px 1fr auto auto 30px;align-items:baseline;gap:18px;width:100%;padding:24px 8px;text-align:left;transition:padding-left .35s cubic-bezier(.2,.7,.2,1),background .35s}
.row-head:hover{padding-left:20px;background:rgba(25,21,16,.04)}
.row-num{font-family:var(--disp);font-style:italic;color:var(--accent);font-size:15px}
.row-name{font-family:var(--disp);font-size:clamp(1.4rem,2.4vw,1.9rem);font-weight:500;letter-spacing:-.01em}
.row-cat,.row-abv{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink60)}
.row-x{font-size:22px;font-weight:300;justify-self:end;transition:transform .4s}
.row.open .row-x{transform:rotate(180deg);color:var(--accent)}
.row-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .6s cubic-bezier(.2,.7,.2,1)}
.row.open .row-body{grid-template-rows:1fr}
.row-inner{overflow:hidden}
.row.open .row-inner{display:grid;grid-template-columns:240px 1fr;gap:28px;padding:6px 8px 30px 54px}
.row-img{overflow:hidden;border:1px solid var(--line)}
.kb img{width:100%;height:100%;object-fit:cover;animation:kb 16s ease-in-out infinite alternate}
@keyframes kb{from{transform:scale(1.05)}to{transform:scale(1.16) translate(-2%,2%)}}
.row-desc{font-family:var(--disp);font-style:italic;font-size:17px;margin-bottom:16px}
.row-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.row-cols ul,.row-cols ol{list-style:none;font-size:14px;color:var(--ink60)}
.row-cols li{padding:5px 0;border-bottom:1px solid var(--line)}
.row-cols ol{counter-reset:s}
.row-cols ol li{counter-increment:s}
.row-cols ol li::before{content:counter(s,decimal-leading-zero) "  ";color:var(--accent);font-size:11px}
.row-gar{margin-top:16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}

/* stacked house pours */
.stack{display:grid;gap:34px}
.pcard{position:sticky;top:calc(var(--hd) + 26px + var(--i)*26px);border:1px solid var(--ink);background:var(--paper);display:grid;grid-template-columns:1.05fr .95fr;min-height:440px;overflow:hidden;box-shadow:0 -8px 30px rgba(25,21,16,.06)}
.pcard.dark{background:var(--ink);color:var(--paper)}
.pcard.dark .pill{border-color:rgba(243,239,230,.3)}
.pcard.dark .pcard-cat{color:var(--pour)}
.pcard-c{padding:44px 46px;position:relative}
.pcard-num{position:absolute;top:18px;right:26px;font-family:var(--disp);font-size:96px;font-weight:300;opacity:.12;line-height:1}
.pcard-name{font-family:var(--disp);font-style:italic;font-weight:500;font-size:clamp(1.9rem,3.4vw,2.9rem);letter-spacing:-.01em}
.pcard-cat{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:10px 0 16px}
.pcard-desc{color:inherit;opacity:.72;max-width:46ch;margin-bottom:20px}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.pill{font-size:11px;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.pcard-build{list-style:none}
.pcard-build li{padding:8px 0;border-top:1px solid var(--line);font-size:14px;opacity:.85}
.pcard-build li::before{content:"— ";color:var(--accent)}
.pcard-img{overflow:hidden;border-left:1px solid var(--line)}
.pcard.dark .pcard-img{border-color:rgba(243,239,230,.2)}

/* ritual */
.ritual{border-top:1px solid var(--ink)}
.rrow{display:grid;grid-template-columns:130px 1fr 1.4fr 40px;gap:20px;align-items:center;padding:30px 18px;border-bottom:1px solid var(--line);transition:background .35s,color .35s,padding-left .35s}
.rrow:hover{background:var(--ink);color:var(--paper);padding-left:32px}
.rrow:hover .r-note{color:rgba(243,239,230,.65)}
.rrow:hover .r-arrow{color:var(--pour)}
.r-time{font-family:var(--disp);font-style:italic;font-size:clamp(1.5rem,2.6vw,2.1rem);font-variant-numeric:tabular-nums}
.r-name{font-size:13px;letter-spacing:.2em;text-transform:uppercase;font-weight:600}
.r-note{color:var(--ink60);transition:color .35s}
.r-arrow{justify-self:end;font-size:20px;color:var(--accent)}

/* footer */
.ft{padding:110px 0 40px;border-top:1px solid var(--ink)}
.ft-big{font-family:var(--disp);font-weight:500;font-size:clamp(3.6rem,11vw,10rem);line-height:.95;letter-spacing:-.03em;color:transparent;-webkit-text-stroke:1.5px var(--ink);transition:color .5s,-webkit-text-stroke-color .5s;margin-bottom:56px}
.ft-big:hover{color:var(--accent);-webkit-text-stroke-color:var(--accent)}
.ft-grid{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end;margin-bottom:70px}
.ft-form{display:flex;gap:16px;align-items:flex-end;max-width:460px}
.ft-form input{flex:1;background:transparent;border:none;border-bottom:1px solid var(--ink);padding:12px 2px;font-family:var(--body);font-size:16px;color:var(--ink);outline:none;transition:border-color .3s}
.ft-form input:focus{border-color:var(--accent)}
.ft-ok{font-family:var(--disp);font-style:italic;font-size:20px;color:var(--accent);animation:pop-in .5s ease both}
.ft-links{display:flex;flex-direction:column;gap:8px;text-align:right;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
.ft-links a:hover{color:var(--accent)}
.ft-base{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid var(--line);padding-top:22px;font-size:12px;letter-spacing:.08em;color:var(--ink60)}

/* noise + cursor */
.noise{position:fixed;inset:0;z-index:90;pointer-events:none;opacity:.055;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")}
.c-dot{position:fixed;top:0;left:0;width:8px;height:8px;border-radius:50%;background:var(--accent);z-index:200;pointer-events:none}
.c-ring{position:fixed;top:0;left:0;width:38px;height:38px;border-radius:50%;border:1px solid var(--ink);z-index:199;pointer-events:none}

/* responsive */
@media (max-width:1000px){
  .hd-nav{display:none}
  .hero-grid{grid-template-columns:1fr;gap:24px}
  .hero-stage{order:-1;padding:0 0 8px}
  .badge{right:14%}
  .match-grid,.cellar-grid{grid-template-columns:1fr}
  .cellar-left{position:static}
  .cat-filter{flex-direction:row;flex-wrap:wrap}
  .cat-filter .chip{width:auto;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-family:var(--body);font-size:13px}
  .pcard{grid-template-columns:1fr;position:static;min-height:0}
  .pcard-img{border-left:none;border-top:1px solid var(--line);height:240px}
  .row.open .row-inner{grid-template-columns:1fr;padding-left:8px}
  .rrow{grid-template-columns:90px 1fr;grid-template-rows:auto auto}
  .r-arrow,.r-note{display:none}
  .ft-grid{grid-template-columns:1fr}
  .ft-links{text-align:left;flex-direction:row;flex-wrap:wrap;gap:18px}
}

/* reduced motion */
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .rv,.mtitle .ln-i,.h1 .ln-i{opacity:1!important;transform:none!important}
  .c-dot,.c-ring{display:none}
}
`;