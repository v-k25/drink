import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

/* ================================================================
   EKQUARTER — a liquid recommendation index
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

const HERO_WORDS = [
  { word: "NEGRONI", id: "negroni" },
  { word: "PALOMA", id: "paloma" },
  { word: "OLD FASHIONED", id: "oldfashioned" },
  { word: "GIMLET", id: "gimlet" },
  { word: "SPRITZ", id: "spritz" },
];

const TICKER = ["Negroni", "Paloma", "Old Fashioned", "Garden Gimlet", "Aperitivo hour", "Mezcal Sour", "Espresso Martini", "Hot Toddy", "Stirred, never shaken", "Zero proof, full volume", "Paper Plane", "One large cube"];

/* --------------------------- HELPERS ---------------------------- */

const AXES = {
  bitter: { bitterness: 1, herbal: .4, complexity: .3 }, citrus: { fruitiness: 1, carbonation: .5, sourness: .4 },
  herbal: { herbal: 1, spice: .4, complexity: .3 }, smoky: { smokiness: 1, bitterness: .4, spice: .3 },
  sweet: { creaminess: .7, fruitiness: .5, spice: .2 }, creamy: { creaminess: 1, spice: .3, herbal: .2 },
};
const scoreV2 = (d, p) => {
  const mood = (d.moods || []).includes(p.mood) ? 30 : 8;
  const delta = Math.abs((d.str ?? 0) - p.strength);
  const strength = delta === 0 ? 20 : delta === 1 ? 10 : 0;
  const temp = p.temp === "any" || d.temp === p.temp ? 15 : 0;
  const sweet = Math.round(15 * (1 - Math.abs((d.sweet ?? 0) - p.sweet) / 10));
  const weights = AXES[p.mood] || {};
  const values = Object.keys(weights).map(k => d[k]);
  const affinity = !values.length || values.some(v => v === null || v === undefined)
    ? 10 : Object.entries(weights).reduce((sum, [k, w]) => sum + w * d[k], 0) / Object.values(weights).reduce((a, b) => a + b, 0) * 2;
  return { match: Math.round(mood + strength + temp + sweet + affinity), components: { mood, strength, temp, sweet, affinity } };
};
const rankDrinks = (drinks, p) => {
  const gated = drinks.filter(d => p.pour === "zero-proof" ? d.abv <= 0 : p.pour === "alcohol" ? d.abv > 0 : true);
  const pool = gated.length ? gated : drinks;
  const ranked = pool.map((d, index) => ({ ...d, ...scoreV2(d, p), index })).sort((a, b) => b.match - a.match || a.index - b.index);
  if (ranked.length < 2) return ranked;
  const top = ranked[0];
  ranked.slice(1).sort((a, b) => {
    const ad = a.base_spirit !== top.base_spirit && a.cat !== top.cat ? 1 : 0;
    const bd = b.base_spirit !== top.base_spirit && b.cat !== top.cat ? 1 : 0;
    return bd - ad;
  }).forEach((d, i) => { ranked[i + 1] = d; });
  return ranked;
};
const tierFor = n => n >= 85 ? "Top match" : n >= 70 ? "Strong" : "Exploratory";
const axisLabel = { bitterness: "bitter", fruitiness: "fruit", carbonation: "bubbles", sourness: "sour", herbal: "herbal", spice: "spice", smokiness: "smoke", creaminess: "cream", complexity: "complex" };
const randomAnswers = () => ({ pour: ["alcohol", "zero-proof", "either"][Math.floor(Math.random() * 3)], mood: MOODS[Math.floor(Math.random() * MOODS.length)].tag, strength: 1 + Math.floor(Math.random() * 3), temp: ["iced", "hot", "any"][Math.floor(Math.random() * 3)], sweet: Math.floor(Math.random() * 11) });

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
    if (reduced) { const t = setInterval(() => setIdx(i => (i + 1) % words.length), 2600); return () => clearInterval(t); }
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
  return reduced ? words[idx] : text;
}

function useCountUp(target, reduced) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (reduced) return;
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
  return reduced ? target : v;
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

function SaveToggle({ drink, saved, onToggle }) {
  return <button className={`save-toggle ${saved ? "saved" : ""}`} type="button" aria-pressed={saved}
    aria-label={saved ? `${drink.name} saved — remove from shelf` : `Save ${drink.name} to your shelf`}
    onClick={() => onToggle(drink)}><span className="row-cat">{saved ? "Saved ✳" : "Save to your shelf ✳"}</span></button>;
}

function AuthModal({ mode, onClose, onSuccess }) {
  const [authStep, setAuthStep] = useState(1), [authEmail, setAuthEmail] = useState("");
  const [code, setCode] = useState(""), [authBusy, setAuthBusy] = useState(false), [authError, setAuthError] = useState(""), [authNotice, setAuthNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef(null), codeRef = useRef(null), panelRef = useRef(null);
  const title = mode === "save" ? "Sign in to keep this pour." : "Sign in, save your pours.";
  useEffect(() => { const t = setTimeout(() => (authStep === 1 ? emailRef : codeRef).current?.focus(), 0); return () => clearTimeout(t); }, [authStep]);
  useEffect(() => { if (!cooldown) return undefined; const t = setInterval(() => setCooldown(v => Math.max(0, v - 1)), 1000); return () => clearInterval(t); }, [cooldown]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  useEffect(() => {
    const key = e => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = [...panelRef.current.querySelectorAll("button:not([disabled]),input:not([disabled])")];
      if (!items.length) return; const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const send = async (resend = false) => {
    if (!authEmail.trim() || authBusy || (resend && cooldown)) return;
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail.trim(), options: { shouldCreateUser: true } });
    setAuthBusy(false);
    if (error) setAuthError("Something went sideways — try again in a moment.");
    else { setAuthStep(2); setCode(""); setCooldown(30); if (resend) setAuthNotice("Fresh code sent."); }
  };
  const verify = async value => {
    if (value.length !== 6 || authBusy) return;
    setAuthBusy(true); setAuthError("");
    const { data, error } = await supabase.auth.verifyOtp({ email: authEmail.trim(), token: value, type: "email" });
    setAuthBusy(false);
    if (error || !data.session) { setAuthError("That code didn't take — request a fresh one."); setCode(""); setTimeout(() => codeRef.current?.focus(), 0); }
    else onSuccess(data.session);
  };
  return <div className="auth-scrim"><div className="auth-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button className="auth-close" type="button" aria-label="Close" onClick={onClose}>×</button>
    <p className="eyebrow">The house list <span className="auth-star">✳</span></p><h2 id="auth-title" className="auth-title">{title}</h2>
    {authStep === 1 ? <form onSubmit={e => { e.preventDefault(); send(); }}>
      <label className="field-lab" htmlFor="auth-email">Email address</label>
      <input ref={emailRef} id="auth-email" className="auth-input" type="email" autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck="false" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
      <p className="auth-micro">No passwords here — we send a six-digit code instead.</p><button className="btn auth-submit" disabled={authBusy} type="submit">{authBusy ? "Sending…" : "Send the code →"}</button>
    </form> : <div>
      <p className="auth-sent">Six digits, sent to {authEmail.trim()}.</p>
      <label className="sr-only" htmlFor="auth-code">Six digit code</label><input ref={codeRef} id="auth-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => { const v = e.target.value.replace(/\D/g, ""); setCode(v); if (v.length === 6) verify(v); }} />
      <button className="btn auth-submit" disabled={code.length !== 6 || authBusy} onClick={() => verify(code)}>{authBusy ? "Checking…" : "Verify code →"}</button>
      {cooldown ? <span className="auth-resend countdown" aria-live="polite">Fresh code in 0:{String(cooldown).padStart(2, "0")}</span> : <button className="next-ghost auth-resend" onClick={() => send(true)}>Send a fresh code</button>}
      <button className="next-ghost auth-different" onClick={() => { setAuthStep(1); setCode(""); setAuthError(""); }}>← Different email</button>
    </div>}
    {authNotice && <p className="auth-notice" role="status">{authNotice}</p>}
    {authError && <p className="ft-err auth-error" role="alert">{authError}</p>}
  </div></div>;
}

/* ----------------------------- APP ------------------------------ */

export default function App() {
  const reduced = useReduced();
  const authEnabled = !!supabase;
  const [session, setSession] = useState(null), [sessionLoading, setSessionLoading] = useState(authEnabled);
  const sessionRef = useRef(null);
  const [savedIds, setSavedIds] = useState(new Set()), [savedRows, setSavedRows] = useState([]);
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState("header"), pendingSave = useRef(null), invokingRef = useRef(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const showToast = message => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 4000); };
  const closeAuth = (clearPending = true) => { if (clearPending) pendingSave.current = null; setAuthOpen(false); setTimeout(() => invokingRef.current?.focus(), 0); };
  const openAuth = (mode = "header", trigger = null) => { setAuthMode(mode); invokingRef.current = trigger || document.activeElement; setAuthOpen(true); };
  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) { sessionRef.current = data.session; setSession(data.session); setSessionLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { sessionRef.current = next; setSession(next); setSessionLoading(false); if (!next) { setSavedIds(new Set()); setSavedRows([]); } });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase || !session) return undefined;
    let mounted = true;
    supabase.from("saved_drinks").select("drink_id, saved_at").eq("user_id", session.user.id).order("saved_at", { ascending: false })
      .then(({ data }) => { if (mounted) { setSavedRows(data || []); setSavedIds(new Set((data || []).map(row => row.drink_id))); } }).catch(() => {});
    return () => { mounted = false; };
  }, [session]);
  const consumePendingSave = async currentSession => {
    const id = pendingSave.current; pendingSave.current = null;
    if (id) await saveDrink(BY_ID[id], currentSession, true);
  };
  const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  const [drinks, setDrinks] = useState(DRINKS);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase
      .from("drinks")
       .select("id,name,category,abv,serving_temp,mood_tags,strength,sweetness,prep_time_min,garnish,featured,ingredients,preparation,description,image_url,base_spirit,sourness,bitterness,smokiness,fruitiness,herbal,creaminess,spice,carbonation,complexity")
      .eq("status", "published")
      .then(({ data, error }) => {
        if (mounted && !error && data?.length) {
          setDrinks(data.map(row => ({
            id: row.id,
            name: row.name,
            cat: row.category,
            abv: Number(row.abv),
            temp: row.serving_temp,
             moods: row.mood_tags || [],
            str: row.strength,
            sweet: row.sweetness,
            time: row.prep_time_min ? `${row.prep_time_min} min` : "3 min",
            garnish: row.garnish,
            featured: row.featured,
            desc: row.description,
             ing: row.ingredients || [],
             build: row.preparation || [],
             seed: row.image_url?.match(/seed\/([^/]+)\//)?.[1] || row.id,
             base_spirit: row.base_spirit, sourness: row.sourness, bitterness: row.bitterness, smokiness: row.smokiness,
             fruitiness: row.fruitiness, herbal: row.herbal, creaminess: row.creaminess, spice: row.spice, carbonation: row.carbonation, complexity: row.complexity,
          })));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const BY_ID = Object.fromEntries(drinks.map(d => [d.id, d]));

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
  const [answers, setAnswers] = useState({ pour: "either", mood: null, strength: null, temp: null, sweet: 5 });
  const [step, setStep] = useState(1), [pouring, setPouring] = useState(false), [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null), legendRef = useRef(null), timerRef = useRef(null), resultNameRef = useRef(null), firstFocus = useRef(true), focusTimer = useRef(null), scrollTimer = useRef(null);
  const ranked = result?.ranked || [], best = result?.best, runners = ranked.slice(1, 4);
  const pct = useCountUp(best?.match || 0, reduced);
  const commitStep = n => { clearTimeout(timerRef.current); setStep(n); };
  useEffect(() => { if (firstFocus.current) { firstFocus.current = false; return undefined; } if (pouring || revealed) return undefined; focusTimer.current = setTimeout(() => legendRef.current?.focus(), 0); return () => clearTimeout(focusTimer.current); }, [step, pouring, revealed]);
  useEffect(() => { if (!revealed) return undefined; focusTimer.current = setTimeout(() => resultNameRef.current?.focus(), 0); return () => clearTimeout(focusTimer.current); }, [revealed]);
  useEffect(() => { if (revealed && typeof window !== "undefined" && window.innerWidth <= 1000) { scrollTimer.current = setTimeout(() => document.querySelector(".result")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 0); } return () => clearTimeout(scrollTimer.current); }, [revealed, reduced]);
  const logReveal = (a, r, source) => {
    if (!supabase || !r?.best) return;
    let clientId;
    try { clientId = localStorage.getItem("ekquarter_client_id"); if (!clientId) { clientId = crypto.randomUUID(); localStorage.setItem("ekquarter_client_id", clientId); } } catch (error) { console.warn("Could not identify match client", error); return; }
     const user_id = sessionRef.current?.user?.id;
     void supabase.from("quiz_submissions").insert({ client_id: clientId, ...(user_id ? { user_id } : {}), answers: { ...a, ...(source ? { source } : {}), quiz_version: 2 }, result_drink_id: r.best.id, result_scores: r.ranked.slice(0, 4).map(x => ({ id: x.id, match: x.match })) }).then(({ error }) => { if (error) console.warn("Could not log match", error); }).catch(error => console.warn("Could not log match", error));
  };
  const reveal = (a, source) => {
    const rnk = rankDrinks(drinks, a), r = { ranked: rnk, best: rnk[0] };
    setResult(r); setPouring(true); setRevealed(false);
    if (reduced) { setPouring(false); setRevealed(true); logReveal(a, r, source); }
    else timerRef.current = setTimeout(() => { setPouring(false); setRevealed(true); logReveal(a, r, source); }, 700);
  };
  const choose = (key, value) => { const next = { ...answers, [key]: value }; setAnswers(next); if (step < 5) timerRef.current = setTimeout(() => commitStep(step + 1), 300); };
  const radioKey = (e, key, options) => { if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return; e.preventDefault(); const i = options.indexOf(answers[key]), next = options[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length]; choose(key, next); };
  const surprise = () => { const a = randomAnswers(); setAnswers(a); reveal(a, "surprise"); };

  /* cellar */
  const [catFilter, setCatFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const cellarRows = drinks.filter(d => catFilter === "All" || d.cat === catFilter);
  const openInCellar = id => {
    setOpenId(id); setCatFilter("All");
    setTimeout(() => document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }), 80);
  };

  /* footer */
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const featured = drinks.filter(d => d.featured);

  const saveDrink = async (drink, currentSession = sessionRef.current, fromPending = false) => {
    if (!drink || !currentSession) return;
    const already = savedIds.has(drink.id);
    setSavedIds(prev => { const next = new Set(prev); already ? next.delete(drink.id) : next.add(drink.id); return next; });
    if (already) setSavedRows(prev => prev.filter(row => row.drink_id !== drink.id));
    else setSavedRows(prev => [{ drink_id: drink.id, saved_at: new Date().toISOString() }, ...prev]);
    const query = already
      ? supabase.from("saved_drinks").delete().eq("user_id", currentSession.user.id).eq("drink_id", drink.id)
      : supabase.from("saved_drinks").insert({ user_id: currentSession.user.id, drink_id: drink.id });
    const { error } = await query;
    if (error) {
      setSavedIds(prev => { const next = new Set(prev); already ? next.add(drink.id) : next.delete(drink.id); return next; });
      if (already) setSavedRows(prev => [...prev, { drink_id: drink.id, saved_at: new Date().toISOString() }]);
      else setSavedRows(prev => prev.filter(row => row.drink_id !== drink.id));
      showToast("Something went sideways — try again in a moment.");
    } else if (fromPending) showToast(`✳ ${drink.name} — on your shelf.`);
    else showToast(already ? `✳ ${drink.name} returned to the cellar.` : `✳ ${drink.name} — on your shelf.`);
  };
  const handleSave = drink => {
    if (!authEnabled) return;
    if (!session) { pendingSave.current = drink.id; openAuth("save"); return; }
    void saveDrink(drink);
  };
  const handleAuthSuccess = async next => {
    sessionRef.current = next; setSession(next); closeAuth(false); showToast(`✳ Signed in as ${next.user.email}.`);
    await consumePendingSave(next);
  };
  const signOut = async () => { await supabase.auth.signOut(); showToast("✳ Signed out. The shelf keeps your seat."); };

  const handleWaitlistSubmit = async e => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setErr("");
    setBusy(true);
    if (!supabase) {
      setErr("The list is offline right now — try again later.");
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.from("waitlist_subscribers").insert({ email: email.trim(), source: "footer" });
      if (!error || error.code === "23505") setSent(true);
      else setErr("Something went sideways — try again in a moment.");
    } catch {
      setErr("Something went sideways — try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <Cursor enabled={fine && !reduced} />
      <div className="noise" aria-hidden="true" />
      <div className="page-content" inert={authOpen}>

      {/* ---------- HEADER ---------- */}
      <header className="hd">
        <a href="#top" className="logo">EkQuarter<span>✳</span></a>
        <nav className="hd-nav">
           <a href="#match">The Match</a><a href="#cellar">Cellar</a><a href="#pours">House Pours</a><a href="#ritual">Ritual</a>{session && <a href="#shelf">Your Shelf</a>}
        </nav>
        <div className="hd-clock"><span>{clock.split(" — ")[0]}</span><span className="clock-phase"> — {phase}</span></div>
        {authEnabled && <div className="hd-account">{sessionLoading ? <span className="account-placeholder" /> : session ? <><span className="account-email">{session.user.email?.split("@")[0]}</span><button className="next-ghost" aria-label={`Sign out (${session.user.email})`} onClick={signOut}>Sign out</button></> : <button className="hd-signin" onClick={e => openAuth("header", e.currentTarget)}>Sign in</button>}</div>}
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
               <p className="hero-sub">Answer five small questions. Get one perfect pour. No lists, no noise — just the drink your evening has been describing.</p>
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
             {!revealed && !pouring && <Reveal className="panel quiz-card">
               <div className="quiz-progress"><button className="quiz-back" onClick={() => commitStep(step - 1)} disabled={step === 1}>← Back</button><div className="progress-line" role="progressbar" aria-valuenow={step} aria-valuemin="1" aria-valuemax="5"><i style={{ width: `${step * 20}%` }} /><span className="sr-only">Step {step} of 5</span></div><span className="step-count">0{step} / 05</span></div>
               <fieldset className="quiz-step">
                 <legend ref={legendRef} tabIndex={-1}>{["", "First — what's tonight's pour?", "Which way should the flavour lean?", "How much kick?", "And the glass?", `Where should the sweetness land? — ${sweetWord(answers.sweet)}`][step]}</legend>
                  {step === 1 && <div className="seg quiz-options" role="radiogroup">{[["alcohol","With alcohol"],["zero-proof","Zero-proof"],["either","Either way"]].map(([v,l], i) => <button role="radio" type="button" aria-checked={answers.pour === v} tabIndex={answers.pour != null ? (answers.pour === v ? 0 : -1) : (i === 0 ? 0 : -1)} className={`seg-b ${answers.pour === v ? "on" : ""}`} key={v} onKeyDown={e => radioKey(e,"pour",["alcohol","zero-proof","either"])} onClick={() => choose("pour",v)}>{l}</button>)}</div>}
                 {step === 2 && <div className="chips quiz-options" role="radiogroup">{MOODS.map((m, i) => <button role="radio" type="button" aria-checked={answers.mood === m.tag} tabIndex={answers.mood != null ? (answers.mood === m.tag ? 0 : -1) : (i === 0 ? 0 : -1)} className={`chip ${answers.mood === m.tag ? "on" : ""}`} key={m.tag} onKeyDown={e => radioKey(e,"mood",MOODS.map(x => x.tag))} onClick={() => choose("mood",m.tag)}>{m.label}</button>)}</div>}
                 {step === 3 && <div className="seg quiz-options" role="radiogroup">{STRENGTHS.map((s, i) => <button role="radio" type="button" aria-checked={answers.strength === s.v} tabIndex={answers.strength != null ? (answers.strength === s.v ? 0 : -1) : (i === 0 ? 0 : -1)} className={`seg-b ${answers.strength === s.v ? "on" : ""}`} key={s.v} onKeyDown={e => radioKey(e,"strength",STRENGTHS.map(x => x.v))} onClick={() => choose("strength",s.v)}>{s.l}</button>)}</div>}
                 {step === 4 && <div className="seg quiz-options" role="radiogroup">{TEMPS.map((t, i) => <button role="radio" type="button" aria-checked={answers.temp === t.v} tabIndex={answers.temp != null ? (answers.temp === t.v ? 0 : -1) : (i === 0 ? 0 : -1)} className={`seg-b ${answers.temp === t.v ? "on" : ""}`} key={t.v} onKeyDown={e => radioKey(e,"temp",TEMPS.map(x => x.v))} onClick={() => choose("temp",t.v)}>{t.l}</button>)}</div>}
                 {step === 5 && <><label className="field-lab" htmlFor="sweetness">{sweetWord(answers.sweet)}</label><input id="sweetness" type="range" min="0" max="10" value={answers.sweet} aria-label="Sweetness" aria-valuetext={sweetWord(answers.sweet)} onChange={e => setAnswers(a => ({ ...a, sweet: +e.target.value }))} /><div className="range-ends"><span>bone dry</span><span>dessert</span></div></>}
               </fieldset>
               <div className="quiz-actions">{step < 5 ? <button className="next-ghost" disabled={!answers[["", "pour", "mood", "strength", "temp"][step]]} onClick={() => commitStep(step + 1)}>Next →</button> : <button className="btn" onClick={() => reveal(answers)}>Pour it →</button>}</div>
             </Reveal>}
             {pouring && <div className="panel pouring"><Glass id="pouring" fill={75} width={120} /><p>Pouring your match…</p><span className="sr-only" role="status">Pouring your match…</span></div>}
            {/* result */}
              {(revealed || result) && best && <div className={`result ${!revealed ? "dim" : ""}`} key={best.id} aria-live="polite" aria-hidden={!revealed}>
              <div className="result-top">
                <Glass id="meter" fill={pct} width={92} className="meter" />
                <div>
                  <p className="result-eyebrow">Your match</p>
                   <div className="pct"><span className="pct-n">{pct}</span><span className="pct-d">/100</span><span className={`tier tier-${tierFor(best.match).split(" ")[0].toLowerCase()}`}>{tierFor(best.match)}</span></div>
                </div>
              </div>
               <h3 className="result-name" ref={resultNameRef} tabIndex={-1}>{best.name}</h3>
              <p className="result-meta">{best.cat} · {best.temp} · {best.time} · {best.abv}% abv</p>
               {best.abv <= 0 && <span className="zero-tag">Zero proof</span>}<p className="result-desc">{best.desc}</p>
                <div className="why"><p className="field-lab">Why this pour</p><ul>{Object.entries(best.components).filter(([k,v]) => v >= ({mood:21,strength:14,temp:10.5,sweet:10.5,affinity:14}[k])).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => <li key={k}>{k === "mood" ? `${MOODS.find(m => m.tag === answers.mood)?.label || "Your direction"} — your direction, exactly` : k === "strength" ? `${strengthWord(answers.strength)}, as ordered` : k === "temp" ? `Served ${answers.temp === "any" ? "your way" : answers.temp}, as you asked` : k === "sweet" ? `Lands at ${sweetWord(answers.sweet)} on the dial` : `Built around ${axisLabel[Object.keys(AXES[answers.mood] || {})[0]] || "balanced"} notes`}</li>)}</ul></div>
               {Object.entries(best.components).every(([k,v]) => v < ({mood:21,strength:14,temp:10.5,sweet:10.5,affinity:14}[k])) && <p className="why-fallback">The closest pour in the cellar tonight</p>}
              <div className="notes">
                {best.moods.map(m => <span className="note" key={m}>{m}</span>)}
                <span className="note">{strengthWord(best.str)}</span>
                <span className="note">{sweetWord(best.sweet)}</span>
              </div>
                  <div className="result-actions"><button className="btn" onClick={() => openInCellar(best.id)}>Open recipe in the cellar <span className="arr">↓</span></button>{authEnabled && <SaveToggle drink={best} saved={savedIds.has(best.id)} onToggle={handleSave} />}</div>
                 <div className="quiz-ghosts"><button className="next-ghost" onClick={() => { clearTimeout(timerRef.current); setRevealed(false); commitStep(1); }}>Tune your pour</button><button className="next-ghost" onClick={surprise}>Surprise me ↻</button></div>

                   <div className="runners">
                <p className="field-lab">Also worth the glass</p>
                {runners.map(r => (
                  <button className="runner" key={r.id} onClick={() => openInCellar(r.id)}>
                    <span className="runner-n">{r.name}</span>
                    <span className="runner-bar"><i style={{ width: `${r.match}%` }} /></span>
                    <span className="runner-p">{r.match}%</span>
                  </button>
                ))}
                 </div></div>}
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
                   {c} <small>{c === "All" ? drinks.length : drinks.filter(d => d.cat === c).length}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="cellar-rows">
            {cellarRows.map((d, i) => {
              const open = openId === d.id;
              return (
                <div className={`row ${open ? "open" : ""}`} id={`row-${d.id}`} key={d.id}>
                   <div className="row-head-grid" onClick={e => { if (e.target.closest(".save-toggle")) return; setOpenId(open ? null : d.id); }}><button className="row-head" onClick={e => { if (e.detail === 0) { e.stopPropagation(); setOpenId(open ? null : d.id); } }} aria-expanded={open}>
                     <span className="row-num">{String(i + 1).padStart(2, "0")}</span>
                     <span className="row-name">{d.name}</span>
                     <span className="row-cat">{d.cat}</span>
                     <span className="row-abv">{d.abv}%</span>
                     <span className="row-x">{open ? "–" : "+"}</span>
                   </button>{authEnabled && <SaveToggle drink={d} saved={savedIds.has(d.id)} onToggle={handleSave} />}</div>
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
                   <div className="pcard-head"><h3 className="pcard-name">{d.name}</h3>{authEnabled && <SaveToggle drink={d} saved={savedIds.has(d.id)} onToggle={handleSave} />}</div>
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

      {session && authEnabled && <section id="shelf" className="sec shelf-sec"><div className="wrap"><Reveal><p className="eyebrow">05 — Your Shelf</p></Reveal><MaskTitle lines={["Kept for another", "evening."]} className="sec-title" />
        <div className="shelf-rows">{savedRows.filter(row => BY_ID[row.drink_id]).map((row, i) => { const d = BY_ID[row.drink_id]; return <div className="shelf-row" key={d.id}><span className="row-num">{String(i + 1).padStart(2, "0")}</span><span className="row-name">{d.name}</span><span className="row-cat">{d.cat}</span><span className="row-abv">{d.abv}%</span><SaveToggle drink={d} saved onToggle={handleSave} /></div>; })}</div>
        {!savedRows.some(row => BY_ID[row.drink_id]) && <div className="shelf-empty"><p>Nothing shelved yet.</p><a className="btn ghost" href="#match">Find your pour <span className="arr">↓</span></a></div>}
      </div></section>}

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
                   <form className="ft-form" onSubmit={handleWaitlistSubmit}>
                     <input type="email" required placeholder="you@evenings.com" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
                     <button className="btn" type="submit" disabled={busy}>Pour it in <span className="arr">→</span></button>
                     {err && <p className="ft-err" role="alert" aria-live="polite">{err}</p>}
                   </form>
                )}
            </div>
            <div className="ft-links">
               <a href="#match">The Match</a><a href="#cellar">Cellar</a><a href="#pours">House Pours</a>{session && <a href="#shelf">Your Shelf</a>}<a href="#top">Back to top ↑</a>
            </div>
          </div>
          <div className="ft-base">
            <span>© 2026 EkQuarter</span>
            <span>Drink with intention. Legal age only.</span>
            <span>Stirred, never shaken*</span>
          </div>
        </div>
      </footer>
      </div>
      {authOpen && <AuthModal mode={authMode} onClose={closeAuth} onSuccess={handleAuthSuccess} />}
      <div className={`toast ${toast ? "toast-show" : ""}`} aria-live="polite">{toast}</div>
    </>
  );
}

/* ----------------------------- CSS ------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Archivo:wght@400;500;600;700&display=swap');

:root{
  --paper:#F6EFE4; --paper2:#EDE2D0; --ink:#17110F; --ink60:rgba(23,17,15,.66);
   --line:rgba(23,17,15,.16); --accent:#A24812; --pour:#F1B35B; --focus:#A24812; --err:#B3261E; --ok:#2E5E3A; --warn:var(--accent); --tag-zero:#54233C; --match-excellent:var(--ink); --match-strong:var(--accent); --match-exploratory:var(--ink60); --hd:64px;
  --disp:"Fraunces",Georgia,serif; --body:"Archivo","Helvetica Neue",sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--paper);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--ink);color:var(--paper)}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{font-family:inherit;color:inherit;background:none;border:none;cursor:pointer}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
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
.hd{position:fixed;inset:0 0 auto;height:var(--hd);display:flex;align-items:center;justify-content:space-between;padding:0 5vw;background:rgba(246,239,228,.86);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:80}
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
.btn:disabled{opacity:.55;cursor:default}

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
.quiz-card{min-height:330px;padding-bottom:env(safe-area-inset-bottom)}
.quiz-progress{height:32px;display:grid;grid-template-columns:80px 1fr 60px;align-items:center;gap:14px}
.quiz-back,.next-ghost{min-height:44px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink60)}
.quiz-back{text-align:left}.quiz-back:disabled{visibility:hidden}.progress-line{height:1px;background:var(--line)}.progress-line i{display:block;height:2px;background:var(--accent);transition:width .25s}.step-count{font-variant-numeric:tabular-nums;text-align:right;font-size:12px;letter-spacing:.12em}.quiz-step{border:0;margin-top:38px}.quiz-step legend{font-family:var(--disp);font-size:clamp(1.8rem,3vw,2.7rem);line-height:1.1;margin-bottom:28px;outline:none}.quiz-options{width:100%}.quiz-actions{margin-top:28px;text-align:right}.next-ghost:hover{color:var(--accent)}.pouring{display:grid;place-items:center;align-content:center;gap:8px;min-height:330px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.tier{font-family:var(--body);font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;border-radius:999px;margin-left:14px;vertical-align:middle}.tier-top{background:var(--ink);color:var(--pour)}.tier-strong{border:1px solid var(--accent);color:var(--accent)}.tier-exploratory{border:1px solid var(--line);color:var(--ink60)}.zero-tag{display:inline-block;border:1px solid var(--tag-zero);color:var(--tag-zero);padding:4px 9px;border-radius:999px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:14px}.why{margin:22px 0}.why ul{list-style:none}.why li{padding:7px 0;border-bottom:1px solid var(--line);font-family:var(--disp);font-style:italic}.why-fallback{font-family:var(--disp);font-style:italic;color:var(--ink60);margin:22px 0}.quiz-ghosts{display:flex;gap:22px;margin-top:20px;flex-wrap:wrap}

.result{border:1px solid var(--ink);padding:38px;background:var(--paper);animation:pop-in .5s ease both;position:relative}
.result.dim{opacity:.55;pointer-events:none}
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
.row-head:hover{padding-left:20px;background:rgba(23,17,15,.04)}
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
.pcard{position:sticky;top:calc(var(--hd) + 26px + var(--i)*26px);border:1px solid var(--ink);background:var(--paper);display:grid;grid-template-columns:1.05fr .95fr;min-height:440px;overflow:hidden;box-shadow:0 -8px 30px rgba(23,17,15,.06)}
.pcard.dark{background:var(--ink);color:var(--paper);--line:rgba(246,239,228,.2);--focus:var(--pour)}
.pcard.dark .pill{border-color:rgba(246,239,228,.45)}
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
.pcard.dark .pcard-build li::before{color:var(--pour)}
.pcard-img{overflow:hidden;border-left:1px solid var(--line)}
.pcard.dark .pcard-img{border-color:rgba(246,239,228,.2)}
.row-img img,.pcard-img img{filter:sepia(.16) saturate(1.05)}

/* ritual */
.ritual{border-top:1px solid var(--ink)}
.rrow{display:grid;grid-template-columns:130px 1fr 1.4fr 40px;gap:20px;align-items:center;padding:30px 18px;border-bottom:1px solid var(--line);transition:background .35s,color .35s,padding-left .35s}
.rrow:hover{background:var(--ink);color:var(--paper);padding-left:32px;--focus:var(--pour)}
.rrow:hover .r-note{color:rgba(246,239,228,.65)}
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
.ft-ok{font-family:var(--disp);font-style:italic;font-size:20px;color:var(--ok);animation:pop-in .5s ease both}
.ft-err{font-size:13px;letter-spacing:.02em;color:var(--err);margin-top:10px}
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
   .seg{width:100%}.seg-b{flex:1;padding:10px 8px}.quiz-card{padding-bottom:env(safe-area-inset-bottom)}
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
@media (pointer:coarse){.chip,.seg-b,.quiz-back,.next-ghost,.btn{min-height:44px}.seg-b{padding:12px 10px}input[type=range]{height:44px}input[type=range]::-webkit-slider-thumb{width:28px;height:28px;margin-top:-13px}input[type=range]::-moz-range-thumb{width:28px;height:28px}}

/* reduced motion */
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .rv,.mtitle .ln-i,.h1 .ln-i{opacity:1!important;transform:none!important}
  .c-dot,.c-ring{display:none}
}

/* account, saves, auth */
.hd-account{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:132px;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.hd-signin{font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:4px 0;position:relative}.hd-signin::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:1px;background:var(--accent)}
.account-email{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-placeholder{display:block;width:132px;height:20px}
.row-head-grid{display:grid;grid-template-columns:54px 1fr auto auto 150px 30px;align-items:baseline;gap:18px;width:100%;padding:24px 8px;transition:padding-left .35s,background .35s;cursor:pointer}.row-head-grid:hover{padding-left:20px;background:rgba(23,17,15,.04)}.row-head-grid:has(.row-head:focus-visible){outline:2px solid var(--focus);outline-offset:-2px}
.row-head{display:contents}.row-head-grid .row-num,.row-head-grid .row-name,.row-head-grid .row-cat,.row-head-grid .row-abv,.row-head-grid .row-x{padding:0}.row-head-grid .row-x{grid-column:6}
.save-toggle{min-height:44px;display:flex;align-items:center;justify-content:flex-start;text-align:left}.save-toggle .row-cat{color:var(--ink60);white-space:nowrap;margin:0;font-size:10px;letter-spacing:.1em}.save-toggle .row-cat::first-letter{color:var(--ink60)}.save-toggle.saved .row-cat{color:var(--accent)}.pcard.dark .save-toggle.saved .row-cat{color:var(--pour)}
.result-actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap}.result-actions .save-toggle{padding:0 4px}.pcard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.pcard-head .save-toggle{position:relative;z-index:2}
.shelf-sec{background:var(--paper2)}.shelf-rows{border-top:1px solid var(--ink)}.shelf-row{display:grid;grid-template-columns:54px 1fr auto auto 150px;align-items:center;gap:18px;padding:20px 8px;border-bottom:1px solid var(--line)}.shelf-empty{display:flex;align-items:center;gap:24px}.shelf-empty p{font-family:var(--disp);font-style:italic;font-size:20px;color:var(--ink60)}
.auth-scrim{position:fixed;inset:0;z-index:140;background:rgba(23,17,15,.5);overflow:auto;overscroll-behavior:contain;display:grid;place-items:center;padding:30px}.auth-panel{position:relative;width:min(440px,90vw);border:1px solid var(--ink);background:var(--paper);padding:42px 34px 34px;animation:pop-in .4s ease both}.auth-close{position:absolute;right:8px;top:8px;width:44px;height:44px;font-size:28px;font-weight:300}.auth-star{font-size:18px;margin-left:8px}.auth-title{font-family:var(--disp);font-size:clamp(2rem,6vw,3rem);font-weight:500;line-height:1.05;margin-bottom:32px}.auth-input{display:block;width:100%;background:transparent;border:0;border-bottom:1px solid var(--ink);padding:10px 2px;font:inherit;font-size:18px;outline:none}.auth-input:focus{border-color:var(--accent)}.auth-micro,.auth-sent{color:var(--ink60);font-size:13px;margin:14px 0 24px}.auth-submit{width:100%;justify-content:center}.auth-code{display:block;width:100%;background:transparent;border:1px solid var(--ink);padding:12px;text-align:center;font-size:30px;letter-spacing:.45em;font-variant-numeric:tabular-nums;outline:none;margin:20px 0 18px}.auth-code:focus{border-color:var(--accent)}.auth-resend{display:block;margin:20px auto 0}.countdown{display:block;text-align:center;color:var(--ink60);font-size:12px;letter-spacing:.08em;font-variant-numeric:tabular-nums}.auth-different{display:block;margin:12px auto 0}.auth-error{margin-top:18px}.auth-notice{font-size:13px;color:var(--ok);margin-top:16px;text-align:center}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:150;background:var(--ink);color:var(--paper);border-radius:999px;padding:11px 18px;font-size:13px;white-space:nowrap;opacity:0;pointer-events:none}.toast-show{opacity:1;animation:pop-in .35s ease both}
@media (max-width:600px){.clock-phase{display:none}.hd-account{min-width:92px}.account-placeholder{width:92px}.hd{padding-inline:4vw}.hd-clock{font-size:10px}.shelf-row{grid-template-columns:34px 1fr auto 100px;gap:8px}.shelf-row .row-abv{display:none}.row-head-grid{grid-template-columns:34px 1fr auto 110px 24px;gap:8px}.row-head-grid .row-cat{display:none}.row-head-grid .save-toggle{grid-column:4}.row-head-grid .row-x{grid-column:5}.save-toggle .row-cat{font-size:9px}.auth-panel{padding-inline:24px}}
@media (prefers-reduced-motion:reduce){.auth-panel,.toast{animation-duration:.001ms!important;animation-iteration-count:1!important}}
@media (prefers-reduced-motion:reduce){.toast-show{animation-duration:.001ms!important;animation-iteration-count:1!important}}
`;
