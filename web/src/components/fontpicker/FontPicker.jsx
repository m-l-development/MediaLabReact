// FontPicker.jsx – fontvelger for Thumbnail Studio (høy rullegardin som åpner seg nedover fra Font-feltet)
// Usage:
//   import fontData from "./fonts.json";
//   <FontPicker fonts={fontData.fonter} categories={fontData.kategorier}
//               value={layer.fontFamilyName} onChange={(font) => update({ font })}
//               onPreview={(font) => setPreviewFont(font)} previewText={layer.text} />
//
// The font files live in /public/fonts/<id>/ (copy the fonts folder from the font pack).
// Before canvas drawing / export: await loadFont(font, 700, "normal").

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./FontPicker.css";
import { DEFAULT_TEXT_STYLE, EFFECTS, SHAPES, PRESETS, StyledText, normalizeStyle, cloudWords, CLOUD_SIZES, LAYER_FX, EFFECT_SETTINGS, fxParams, CLOUD_SETTINGS, cloudParams, cloudPalette, retroColorsOf, stripeColorsOf, SHAPE_SETTINGS, shapeParams } from "./TextStyle.jsx";

const BASE = "/"; // where the fonts folder sits (public/)
const LS_FAV = "fontpicker:favoritter";
const LS_RECENT = "fontpicker:nylig";

/* ---------- loading ---------- */
const loadedCss = new Set();
export function ensureFontCss(font, base = BASE) {
  if (!font?.css || loadedCss.has(font.id)) return;
  loadedCss.add(font.id);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = base + font.css;
  document.head.appendChild(l);
}

/** Load the font (with ÆØÅ) and wait until it is ready – use before canvas drawing/export. */
export async function loadFont(font, weight = 400, style = "normal", base = BASE) {
  ensureFontCss(font, base);
  await document.fonts.load(`${style} ${weight} 64px '${font.navn}'`, "AaÆæØøÅå");
  return font.familie;
}

/** Does the font have a real cut? (stil: "regular" | "bold" | "italic" | "boldItalic") */
export function hasStyle(font, stil) {
  return !!font?.stiler?.[stil];
}

const readLS = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
};
const writeLS = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "o").replace(/æ/g, "ae");

/* ---------- a single row ---------- */
function FontRow({ font, active, selected, fav, sample, onPick, onHover, onFav, base }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { ensureFontCss(font, base); io.disconnect(); } },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [font, base]);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const s = font.stiler || {};
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      className={"fp-row" + (active ? " is-active" : "") + (selected ? " is-selected" : "")}
      onMouseEnter={() => onHover(font)}
      onClick={() => onPick(font)}
    >
      <div className="fp-row-main">
        <span className="fp-sample" style={{ fontFamily: font.familie, fontStretch: font.bredde ? font.bredde + "%" : undefined }}>
          {sample || font.navn}
        </span>
        <span className="fp-meta">
          {sample ? font.navn + " · " : ""}
          {font.lignerPa ? "Ligner " + font.lignerPa : font.stil}
          {font.iMalene ? <em className="fp-tag">Mal</em> : null}
          {font.harAeOeAa === false ? <em className="fp-tag fp-warn" title="Fonten har ikke Æ Ø Å – norske bokstaver vises i en annen font">Uten ÆØÅ</em> : null}
        </span>
      </div>
      <div className="fp-cuts" aria-label="Snitt som finnes">
        <span className={s.bold ? "" : "off"} title="Fet">B</span>
        <span className={s.italic ? "fp-i" : "fp-i off"} title="Kursiv">I</span>
      </div>
      <button
        type="button"
        className={"fp-star" + (fav ? " on" : "")}
        aria-label={fav ? "Fjern favoritt" : "Legg til favoritt"}
        onClick={(e) => { e.stopPropagation(); onFav(font); }}
      >
        {fav ? "★" : "☆"}
      </button>
    </div>
  );
}

/* ---------- the picker ---------- */
export default function FontPicker({
  fonts,
  categories = ["Titler", "Brødtekst", "Logo", "Elegant", "Sitat", "Håndskrift", "Retro", "Effekt", "Moro", "Teknisk", "Skilt"],
  value,
  onChange,
  onPreview,
  previewText = "",
  base = BASE,
  label = "Font",
  textStyle = DEFAULT_TEXT_STYLE,
  onTextStyleChange,
  textColor = "#ffffff",
  palette = ["#ffffff", "#f4b53f", "#000000", "#2b2b2b", "#3b8fd4", "#2ea8a0", "#7b55e8", "#e04f9a", "#e8603c"],
  backgroundImage, // URL of the image in the design – used by «Bildefyll»
  onTextColorChange, // optional: ready-made looks can also set the text colour
  baseSize = 90,     // the layer's text size in px (shown when textStyle.size is not set)
}) {
  const st = normalizeStyle(textStyle || {});
  const setSt = (patch) => onTextStyleChange?.({ ...st, ...patch });
  const setFx = (patch) => setSt({ effect: { ...st.effect, ...patch } });
  const [pane, setPane] = useState("font"); // font | stil | effekter
  const [ulOpen, setUlOpen] = useState(false);
  const ready = useMemo(() => fonts.filter((f) => f.status === "klar"), [fonts]);
  const current = ready.find((f) => f.navn === value || f.id === value) || null;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("anbefalt"); // anbefalt | alle | favoritter
  const [cat, setCat] = useState(null);
  const [useOwnText, setUseOwnText] = useState(false);
  const [favs, setFavs] = useState(() => readLS(LS_FAV));
  const [recent, setRecent] = useState(() => readLS(LS_RECENT));
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const searchRef = useRef(null);

  if (current) ensureFontCss(current, base);

  /* placement: tall dropdown that opens downward from the field */
  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const margin = 12;
    const width = Math.max(r.width, 340);
    let left = r.right - width; // aligned to the field's right edge (the panel sits on the right)
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    let top = r.bottom + 6;
    // the popup is as tall as its content (three fonts in the list, app-fontpicker.css)
    const height = Math.min(600, window.innerHeight - margin * 2);
    if (top + height > window.innerHeight - margin) {
      if (r.left - width - 8 >= margin) { // PC: beside the field, so the text box above stays visible
        left = r.left - width - 8;
        top = Math.max(margin, Math.min(r.top - 160, window.innerHeight - height - margin));
      } else top = margin; // phone: at the top of the screen, over the canvas (the panel stays visible)
    }
    setPos({ left, top, width, height });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    setTimeout(() => searchRef.current?.focus(), 0);
    const onDoc = (e) => {
      if (!popRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) close();
    };
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, place]);

  const close = () => {
    setOpen(false);
    onPreview?.(null);
  };

  /* filtering */
  const list = useMemo(() => {
    let l = ready;
    if (tab === "anbefalt") l = l.filter((f) => f.anbefalt || f.iMalene);
    if (tab === "favoritter") l = l.filter((f) => favs.includes(f.id));
    if (cat) l = l.filter((f) => f.kategorier?.includes(cat));
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (words.length) {
      l = l
        .map((f) => {
          const name = norm(f.navn);
          const hay = norm(f.sok || f.navn);
          if (!words.every((w) => hay.includes(w))) return null;
          const score = name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2;
          return [score, f];
        })
        .filter(Boolean)
        .sort((a, b) => a[0] - b[0] || a[1].navn.localeCompare(b[1].navn, "nb"))
        .map((x) => x[1]);
    } else {
      l = [...l].sort((a, b) => a.navn.localeCompare(b.navn, "nb"));
    }
    return l;
  }, [ready, tab, cat, q, favs]);

  const recentFonts = useMemo(
    () => (q || cat || tab === "favoritter" ? [] : recent.map((id) => ready.find((f) => f.id === id)).filter(Boolean)),
    [recent, ready, q, cat, tab]
  );
  const rows = useMemo(() => [...recentFonts, ...list.filter((f) => !recentFonts.includes(f))], [recentFonts, list]);

  const catCounts = useMemo(() => {
    let base0 = ready;
    if (tab === "anbefalt") base0 = base0.filter((f) => f.anbefalt || f.iMalene);
    if (tab === "favoritter") base0 = base0.filter((f) => favs.includes(f.id));
    const c = {};
    for (const f of base0) for (const k of f.kategorier || []) c[k] = (c[k] || 0) + 1;
    return c;
  }, [ready, tab, favs]);

  useEffect(() => setActive(0), [q, cat, tab]);

  const pick = (font) => {
    const r = [font.id, ...recent.filter((id) => id !== font.id)].slice(0, 6);
    setRecent(r);
    writeLS(LS_RECENT, r);
    onChange?.(font);
    close();
  };
  const toggleFav = (font) => {
    const f = favs.includes(font.id) ? favs.filter((id) => id !== font.id) : [...favs, font.id];
    setFavs(f);
    writeLS(LS_FAV, f);
  };

  const onKey = (e) => {
    if (pane !== "font" && e.key !== "Escape") return;
    if (e.key === "Escape") { e.preventDefault(); close(); triggerRef.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); onPreview?.(rows[Math.min(active + 1, rows.length - 1)]); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); onPreview?.(rows[Math.max(active - 1, 0)]); }
    else if (e.key === "Enter" && rows[active]) { e.preventDefault(); pick(rows[active]); }
  };

  const sample = useOwnText && previewText.trim() ? previewText.trim().slice(0, 40) : "";

  return (
    <div className="fp">
      {label ? <div className="fp-label">{label}</div> : null}
      <button
        ref={triggerRef}
        type="button"
        className="fp-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span style={{ fontFamily: current?.familie, fontStretch: current?.bredde ? current.bredde + "%" : undefined }}>{current?.navn || "Velg font"}</span>
        <span className="fp-chev" aria-hidden="true">⌃⌄</span>
      </button>

      {open && pos ? (
        <div
          ref={popRef}
          className="fp-pop"
          style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
          onKeyDown={onKey}
          onMouseLeave={() => onPreview?.(null)}
          role="dialog"
          aria-label="Velg font"
        >
          <TopBar st={st} setSt={setSt} font={current} ulOpen={ulOpen} setUlOpen={setUlOpen} baseSize={baseSize} />
          <div className="fp-head">
            <div className="fp-tabs" role="tablist">
              {[["font", "Font"], ["stil", "Stil"], ["effekter", "Effekter"]].map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? "on" : ""}
                  onClick={() => setPane(k)}>{t}</button>
              ))}
            </div>
            <button type="button" className="fp-x" onClick={close} aria-label="Lukk">×</button>
          </div>
          {pane === "stil" ? <StylePane st={st} setSt={setSt} font={current} ulOpen={ulOpen} setUlOpen={setUlOpen} palette={palette} textColor={textColor} text={previewText} /> : null}
          {pane === "effekter" ? <EffectPane st={st} setFx={setFx} setSt={setSt} font={current} palette={palette} textColor={textColor} backgroundImage={backgroundImage} onTextColorChange={onTextColorChange} /> : null}
          {pane === "font" ? (<>

          <input
            ref={searchRef}
            className="fp-search"
            type="search"
            placeholder="Søk: bebas, tittel, elegant, håndskrift …"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="fp-seg" role="tablist">
            {[["anbefalt", "Anbefalt"], ["alle", "Alle"], ["favoritter", "★ Favoritter"]].map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k}
                className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t}</button>
            ))}
          </div>

          <div className="fp-cats">
            <button type="button" className={!cat ? "on" : ""} onClick={() => setCat(null)}>Alle</button>
            {categories.map((c) => (
              <button key={c} type="button" className={cat === c ? "on" : ""} disabled={!catCounts[c]}
                onClick={() => setCat(cat === c ? null : c)}>
                {c}<span>{catCounts[c] || 0}</span>
              </button>
            ))}
          </div>



          <div className="fp-list" role="listbox">
            {recentFonts.length ? <div className="fp-section">Nylig brukt</div> : null}
            {rows.map((f, i) => (
              <div key={f.id}>
                {recentFonts.length && i === recentFonts.length ? (
                  <div className="fp-section">{cat || (tab === "anbefalt" ? "Anbefalt for design" : tab === "favoritter" ? "Favoritter" : "Alle fonter")}</div>
                ) : null}
                <FontRow
                  font={f}
                  active={i === active}
                  selected={current?.id === f.id}
                  fav={favs.includes(f.id)}
                  sample={sample}
                  base={base}
                  onPick={pick}
                  onHover={(font) => { setActive(i); onPreview?.(font); }}
                  onFav={toggleFav}
                />
              </div>
            ))}
            {!rows.length ? (
              <div className="fp-empty">
                {tab === "favoritter" ? "Trykk ☆ på en font for å lagre den her." : "Ingen fonter passer. Prøv et annet ord."}
              </div>
            ) : null}
          </div>

          <div className="fp-foot" title="↑↓ flytt · Enter velg · Esc lukk">
            <label className="fp-own">
              <input type="checkbox" checked={useOwnText} onChange={(e) => setUseOwnText(e.target.checked)} />
              Vis min tekst
            </label>
            <span>{rows.length} fonter</span>
          </div>
          </>) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Stil: B I U S, placement 3×3, direction, curve ---------- */
const UL = [["none", "Ingen"], ["single", "Enkel"], ["double", "Dobbel"], ["wavy", "Bølget"], ["dotted", "Prikket"]];
const H = ["left", "center", "right"];
const V = ["top", "middle", "bottom"];
const HN = { left: "venstre", center: "midt", right: "høyre" };
const VN = { top: "topp", middle: "midt", bottom: "bunn" };
const DIRS = [
  ["horizontal", "Vannrett", <span key="h" className="fp-dir">Aa</span>],
  ["stacked", "Stablet", <span key="s" className="fp-dir fp-dir-stack">A<br />a</span>],
  ["up", "Opp", <span key="u" className="fp-dir" style={{ transform: "rotate(-90deg)" }}>A→</span>],
  ["down", "Ned", <span key="d" className="fp-dir" style={{ transform: "rotate(90deg)" }}>A→</span>],
];

function StylePane({ st, setSt, font, ulOpen, setUlOpen, palette, textColor, text }) {
  const canB = !font || hasStyle(font, "bold");
  const canI = !font || hasStyle(font, "italic");
  return (
    <div className="fp-pane">
      <div className="fp-row2">
        <div>
          <div className="fp-sec">Plassering</div>
          <div className="fp-grid" role="radiogroup" aria-label="Plassering i boksen">
            {V.map((v) => H.map((h) => (
              <button key={v + h} type="button" role="radio" aria-checked={st.alignH === h && st.alignV === v}
                title={`${VN[v]} ${HN[h]}`} className={st.alignH === h && st.alignV === v ? "on" : ""}
                onClick={() => setSt({ alignH: h, alignV: v })}>
                <span className={`fp-gl fp-gl-${h} fp-gl-${v}`}><i /><i /></span>
              </button>
            )))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="fp-sec">Tekstretning</div>
          <div className="fp-dirs">
            {DIRS.map(([k, t, icon]) => (
              <button key={k} type="button" className={st.direction === k ? "on" : ""} onClick={() => setSt({ direction: k })}>
                {icon}<small>{t}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fp-sec">Roter</div>
      <div className="fp-curve">
        <input type="range" min="-180" max="180" step="1" value={st.rotate || 0} onChange={(e) => setSt({ rotate: Math.round(+e.target.value) })} aria-label="Roter" />
        <span className="fp-val">{st.rotate || 0}°</span>
        <button type="button" className="fp-reset" disabled={!st.rotate} onClick={() => setSt({ rotate: 0 })}>0°</button>
      </div>
      <div className="fp-rotq">
        {[-90, -45, -15, 15, 45, 90, 180].map((d) => (
          <button key={d} type="button" className={(st.rotate || 0) === d ? "on" : ""} onClick={() => setSt({ rotate: d })}>{d > 0 ? "+" : ""}{d}°</button>
        ))}
      </div>

      <div className="fp-sec">Speilvend</div>
      <div className="fp-dirs fp-flip">
        <button type="button" className={st.flipH ? "on" : ""} onClick={() => setSt({ flipH: !st.flipH })}>
          <span className="fp-dir" style={{ transform: "scaleX(-1)" }}>Aa</span><small>Vannrett</small></button>
        <button type="button" className={st.flipV ? "on" : ""} onClick={() => setSt({ flipV: !st.flipV })}>
          <span className="fp-dir" style={{ transform: "scaleY(-1)" }}>Aa</span><small>Loddrett</small></button>
      </div>

      <div className="fp-sec">Form</div>
      <div className="fp-fx fp-shapes">
        {SHAPES.map((sh) => (
          <button key={sh.type} type="button" className={st.shape.type === sh.type ? "on" : ""} title={sh.tip || sh.navn}
            onClick={() => setSt({ shape: { ...st.shape, type: sh.type, amount: st.shape.type === sh.type ? st.shape.amount : sh.type === "cloud" ? 30 : 50 } })}>
            <span className="fp-fx-prev"><ShapeIcon type={sh.type} /></span>
            <small>{sh.navn}</small>
          </button>
        ))}
      </div>
      {st.shape.type !== "none" ? (() => {
        const sh = SHAPES.find((x) => x.type === st.shape.type);
        const off = st.direction !== "horizontal" && sh.kind !== "cloud" && sh.type !== "skew";
        if (sh.type === "cloud") return (<><CloudSettings st={st} setSt={setSt} palette={palette} textColor={textColor} /><CloudWords st={st} setSt={setSt} text={text} /></>);
        return (
          <>
            <ShapeSettings st={st} setSt={setSt} sh={sh} off={off} />
            <p className="fp-hint">{off ? "Formen virker bare med vannrett tekstretning." : sh.tip}</p>
            {sh.type === "ribbon" ? (<><div className="fp-sec">Farge på båndet</div><Swatches value={st.shape.color} palette={palette} onPick={(c) => setSt({ shape: { ...st.shape, color: c } })} /></>) : null}
            {sh.type === "cloud" ? <CloudWords st={st} setSt={setSt} text={text} /> : null}
          </>
        );
      })() : null}
    </div>
  );
}

/* ---------- Effekter: preview tiles + settings ---------- */
function EffectPane({ st, setFx, setSt, font, palette, textColor, backgroundImage, onTextColorChange }) {
  const fx = st.effect;
  const meta = EFFECTS.find((e) => e.type === fx.type) || EFFECTS[0];
  const needs2 = ["glitch", "gradient", "stripes", "retro3d"].includes(fx.type);
  const blockShape = ["cloud", "pattern"].includes(st.shape.type);
  return (
    <div className="fp-pane">
      {fx.type !== "none" ? <div className="fp-fxactive">
      {true ? (
        <>
          <FxSettings fx={fx} setFx={setFx} navn={meta.navn} />
          {fx.type === "imagefill" ? (
            <>
              <div className="fp-sec">Bilde i teksten</div>
              <div className="fp-presets">
                {backgroundImage ? <button type="button" onClick={() => setFx({ image: backgroundImage })}>Bruk bildet i designet</button> : null}
                <label className="fp-upload">Last opp bilde
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFx({ image: URL.createObjectURL(f) }); }} />
                </label>
              </div>
            </>
          ) : null}
          {fx.type === "retro3d" ? (
            <><div className="fp-sec">Fargene i båndene (øverst først)</div>
              <ColorSlots values={retroColorsOf(fx)} palette={palette} min={retroColorsOf(fx).length} max={retroColorsOf(fx).length} onChange={(v) => setFx({ colors: v })} />
              <div className="fp-presets"><button type="button" onClick={() => setFx({ colors: undefined })}>Lag fargene på nytt fra to farger</button></div></>
          ) : fx.type === "stripes" ? (() => {
            const SC = stripeColorsOf(fx), dir = fxParams(fx).dir;
            return (<>
              {dir !== "down" ? (<><div className="fp-sec">Stripene over (nærmest teksten først)</div>
                <ColorSlots values={SC.up} palette={palette} min={SC.up.length} max={SC.up.length} onChange={(v) => setFx({ colorsUp: v })} /></>) : null}
              {dir !== "up" ? (<><div className="fp-sec">Stripene under (nærmest teksten først)</div>
                <ColorSlots values={SC.down} palette={palette} min={SC.down.length} max={SC.down.length} onChange={(v) => setFx({ colorsDown: v })} /></>) : null}
              <div className="fp-presets"><button type="button" onClick={() => setFx({ colorsUp: undefined, colorsDown: undefined })}>Tilbakestill fargene</button></div>
            </>);
          })() : fx.type === "imagefill" ? null : needs2 ? (
            <><div className="fp-sec">Farger</div>
              <ColorSlots values={[fx.color, fx.color2]} palette={palette} min={2} max={2} onChange={(v) => setFx({ color: v[0], color2: v[1] })} /></>
          ) : (
            <><div className="fp-sec">Farge</div><Swatches value={fx.color} palette={palette} onPick={(c) => setFx({ color: c })} /></>
          )}
        </>
      ) : null}
      </div> : null}
      <div className="fp-sec">Ferdige oppsett</div>
      <div className="fp-fx fp-presets-grid">
        {PRESETS.map((pr) => {
          const style = { ...pr.style, effect: { ...pr.style.effect, image: pr.style.effect.type === "imagefill" ? (backgroundImage || SAMPLE_IMG) : undefined } };
          return (
            <button key={pr.navn} type="button" title={pr.navn}
              onClick={() => { setSt({ ...style, bold: !!style.bold && hasStyle(font, "bold") }); if (onTextColorChange) onTextColorChange(pr.color); }}>
              <span className="fp-fx-prev" style={{ background: pr.bg }}>
                <StyledText text={pr.style.shape.type === "cloud" ? "tro håp kjærlighet nåde fred lys liv" : pr.style.shape.type === "pattern" ? "GUDS HUS" : "Aa"} fontFamily={font?.familie}
                  fontSize={pr.style.shape.type === "cloud" ? 22 : 28} color={pr.color} width={92} height={60} textStyle={{ ...style, alignH: "center", alignV: "middle", direction: "horizontal" }} />
              </span>
              <small>{pr.navn}</small>
            </button>
          );
        })}
      </div>
      {!onTextColorChange ? <p className="fp-hint">Ferdige oppsett endrer form og effekt. Tekstfargen velger du selv i panelet.</p> : null}
      <div className="fp-sec">Velg effekt</div>
      {blockShape ? <p className="fp-hint" style={{ marginTop: 0, marginBottom: 8 }}>Gjenta, Skyggelag, Retro-striper, Speiling og Brettet er slått av for {st.shape.type === "cloud" ? "Ordsky" : "Mønster"}. Bytt form i Stil for å bruke dem.</p> : null}
      <div className="fp-fx">
        {EFFECTS.map((e) => {
          const tileSt = { ...st, effect: { type: e.type, color: e.color || "#000", color2: e.color2 || "#f4b53f", strength: 55, image: e.type === "imagefill" ? (fx.image || backgroundImage || SAMPLE_IMG) : undefined }, underline: "none", strike: false };
          return (
            <button key={e.type} type="button" className={fx.type === e.type && !(blockShape && LAYER_FX.includes(e.type)) ? "on" : ""}
              disabled={blockShape && LAYER_FX.includes(e.type)} title={blockShape && LAYER_FX.includes(e.type) ? "Virker ikke med Ordsky og Mønster" : e.navn}
              onClick={() => setFx({ type: e.type, p: e.type === fx.type ? fx.p : undefined, color: e.type === fx.type ? fx.color : e.color || fx.color, color2: e.color2 || fx.color2, image: e.type === "imagefill" ? (fx.image || backgroundImage || SAMPLE_IMG) : fx.image })}>
              <span className="fp-fx-prev">
                <StyledText text="Aa" fontFamily={font?.familie} fontSize={30} color={textColor} width={92} height={60}
                  textStyle={{ ...tileSt, shape: { type: "none" }, direction: "horizontal", alignH: "center", alignV: "middle" }} />
              </span>
              <small>{e.navn}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Swatches({ value, palette, onPick }) {
  return (
    <div className="fp-sw">
      {palette.map((c) => (
        <button key={c} type="button" aria-label={c} className={value?.toLowerCase() === c.toLowerCase() ? "on" : ""}
          style={{ background: c }} onClick={() => onPick(c)} />
      ))}
      <label className="fp-sw-custom" title="Egen farge">
        <input type="color" value={value} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  );
}

/* sample image for «Bildefyll» before the user picks one: forest with fog */
const SAMPLE_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd8dc"/><stop offset="1" stop-color="#455a64"/></linearGradient></defs><rect width="400" height="240" fill="url(#a)"/><g fill="#1f2d33">' +
  Array.from({ length: 16 }, (_, i) => `<path d="M${i * 26} 240 L${i * 26 + 13} ${90 + (i % 5) * 18} L${i * 26 + 26} 240Z"/>`).join("") +
  '</g><rect width="400" height="240" fill="#fff" opacity=".15"/></svg>'
);

/* small icons for the forms */
function ShapeIcon({ type }) {
  const st = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" };
  const P = (d) => <path d={d} {...st} />;
  const icons = {
    none: P("M10 22 H50"),
    arc: P("M8 30 Q30 2 52 30"),
    wave: P("M6 20 Q16 6 26 20 T46 20 T56 14"),
    circle: <circle cx="30" cy="20" r="13" {...st} />,
    spiral: P("M30 20 m0 0 a3 3 0 1 1 3 3 a7 7 0 1 1 -7 -7 a11 11 0 1 1 11 11 a15 15 0 1 1 -15 -15"),
    ribbon: <path d="M6 24 Q20 8 30 18 T54 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity=".8" />,
    archlines: <>{P("M10 14 Q30 4 50 14")}{P("M10 22 Q30 12 50 22")}{P("M10 30 Q30 20 50 30")}</>,
    flag: <>{P("M10 14 Q20 8 30 14 T50 14")}{P("M10 22 Q20 16 30 22 T50 22")}{P("M10 30 Q20 24 30 30 T50 30")}</>,
    bulge: <>{P("M10 12 Q30 2 50 12")}{P("M10 28 Q30 38 50 28")}</>,
    pinch: <>{P("M10 8 Q30 18 50 8")}{P("M10 32 Q30 22 50 32")}</>,
    perspective: <>{P("M10 16 L50 6")}{P("M10 24 L50 34")}</>,
    skew: <path d="M18 30 L26 10 H48 L40 30 Z" {...st} />,
    pattern: <>{P("M6 10 Q18 4 30 10 T54 10")}{P("M6 20 Q18 14 30 20 T54 20")}{P("M6 30 Q18 24 30 30 T54 30")}</>,
    cloud: <><rect x="8" y="8" width="22" height="9" rx="2" {...st} /><rect x="33" y="8" width="7" height="22" rx="2" {...st} /><rect x="12" y="21" width="17" height="9" rx="2" {...st} /><rect x="43" y="14" width="9" height="9" rx="2" {...st} /></>,
  };
  return <svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true">{icons[type]}</svg>;
}

/* ---------- always-visible bar: B I U S, size, line spacing, letter spacing ---------- */
const LINE_STEPS = [1.0, 1.15, 1.5, 2.0, 2.5, 3.0];
const TRACK_STEPS = [["Svært tett", -80], ["Tett", -40], ["Normal", 0], ["Luftig", 80], ["Svært luftig", 200], ["Sperret", 400]];
const SIZE_STEPS = [12, 16, 20, 24, 32, 40, 48, 64, 72, 90, 110, 140, 180, 220];
const fmt = (n) => String(n).replace(".", ",");

function Dropdown({ label, title, children, open, setOpen, wide }) {
  return (
    <div className="fp-dd">
      <button type="button" className={"fp-ddbtn" + (open ? " on" : "")} title={title} aria-label={title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}<span className="fp-caret2">⌄</span>
      </button>
      {open ? <div className={"fp-menu fp-menu-r" + (wide ? " wide" : "")} role="menu">{children}</div> : null}
    </div>
  );
}

function TopBar({ st, setSt, font, ulOpen, setUlOpen, baseSize }) {
  const [menu, setMenu] = useState(null); // "size" | "line" | "track"
  const toggle = (m) => (v) => { setMenu(v ? m : null); setUlOpen(false); };
  const canB = !font || hasStyle(font, "bold");
  const canI = !font || hasStyle(font, "italic");
  const size = st.size ?? baseSize;
  const setSize = (v) => setSt({ size: Math.max(6, Math.min(600, Math.round(v))) });
  const lh = st.lineHeight ?? 1.1;
  const tr = st.tracking ?? 0;
  return (
    <div className="fp-top">
      <div className="fp-tool">
        <button type="button" className={st.bold ? "on" : ""} disabled={!canB && !st.bold}
          title={canB ? "Fet" : "Fonten har ikke ekte fet"} onClick={() => setSt({ bold: !st.bold })}><b>B</b></button>
        <button type="button" className={st.italic ? "on" : ""} disabled={!canI && !st.italic}
          title={canI ? "Kursiv" : "Fonten har ikke ekte kursiv"} onClick={() => setSt({ italic: !st.italic })}>
          <i style={{ fontFamily: "Georgia, serif" }}>I</i></button>
        <div className="fp-split">
          <button type="button" className={st.underline !== "none" ? "on" : ""} title="Understrek"
            onClick={() => setSt({ underline: st.underline === "none" ? "single" : "none" })}><u>U</u></button>
          <button type="button" className="fp-caret" aria-label="Velg understrek" onClick={() => { setUlOpen(!ulOpen); setMenu(null); }}>⌄</button>
          {ulOpen ? (
            <div className="fp-menu" role="menu">
              {UL.map(([k, t]) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={st.underline === k}
                  className={st.underline === k ? "on" : ""} onClick={() => { setSt({ underline: k }); setUlOpen(false); }}>
                  <span style={{ textDecoration: k === "none" ? "none" : `underline ${k === "single" ? "solid" : k}`, textUnderlineOffset: 4 }}>{t}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className={st.strike ? "on" : ""} title="Gjennomstreking" onClick={() => setSt({ strike: !st.strike })}><s>ab</s></button>
      </div>

      <div className="fp-tool fp-tool2">
        <div className="fp-size" title="Tekststørrelse (px)">
          <button type="button" aria-label="Mindre tekst" onClick={() => setSize(size - (size > 40 ? 4 : 1))}>−</button>
          <input type="number" min="6" max="600" value={size} aria-label="Tekststørrelse"
            onChange={(e) => e.target.value && setSize(+e.target.value)} />
          <button type="button" aria-label="Større tekst" onClick={() => setSize(size + (size >= 40 ? 4 : 1))}>+</button>
          <Dropdown label={null} title="Velg størrelse" open={menu === "size"} setOpen={toggle("size")}>
            {SIZE_STEPS.map((v) => (
              <button key={v} type="button" className={size === v ? "on" : ""} onClick={() => { setSize(v); setMenu(null); }}>{v} px</button>
            ))}
            {st.size != null ? <><hr /><button type="button" onClick={() => { setSt({ size: null }); setMenu(null); }}>Tilpass til boksen</button></> : null}
          </Dropdown>
        </div>

        <Dropdown title="Linjeavstand" open={menu === "line"} setOpen={toggle("line")} wide
          label={<span className="fp-ico"><svg viewBox="0 0 20 16" width="18" height="15" aria-hidden="true"><path d="M3 2v12M1 4l2-2 2 2M1 12l2 2 2-2M8 3h11M8 8h11M8 13h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>{fmt(lh)}</span>}>
          {LINE_STEPS.map((v) => (
            <button key={v} type="button" className={Math.abs(lh - v) < 0.001 ? "on" : ""} onClick={() => { setSt({ lineHeight: v }); setMenu(null); }}>{fmt(v.toFixed(v === 1.15 ? 2 : 1))}</button>
          ))}
          <hr />
          <div className="fp-menu-slider">
            <span>Egendefinert</span>
            <input type="range" min="0.7" max="3" step="0.05" value={lh} onChange={(e) => setSt({ lineHeight: Math.round(+e.target.value * 100) / 100 })} aria-label="Linjeavstand egendefinert" />
            <b>{fmt(lh.toFixed(2))}</b>
          </div>
        </Dropdown>

        <Dropdown title="Bokstavavstand (tetthet)" open={menu === "track"} setOpen={toggle("track")} wide
          label={<span className="fp-ico"><svg viewBox="0 0 22 17" width="19" height="15" aria-hidden="true"><path d="M5 12L8 3l3 9M6 9h4M14 3v9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 15h18M4 13.5L2 15l2 1.5M18 13.5l2 1.5-2 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>{tr > 0 ? "+" : ""}{tr}</span>}>
          {TRACK_STEPS.map(([t, v]) => (
            <button key={v} type="button" className={tr === v ? "on" : ""} onClick={() => { setSt({ tracking: v }); setMenu(null); }}>
              <span style={{ letterSpacing: `${v / 1000}em` }}>{t}</span><small>{v > 0 ? "+" : ""}{v}</small>
            </button>
          ))}
          <hr />
          <div className="fp-menu-slider">
            <span>Egendefinert</span>
            <input type="range" min="-150" max="500" step="5" value={tr} onChange={(e) => setSt({ tracking: Math.round(+e.target.value) })} aria-label="Bokstavavstand egendefinert" />
            <b>{tr}</b>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}

/* ---------- Ordsky: choose size and direction for each word ---------- */
function CloudWords({ st, setSt, text }) {
  const words = cloudWords(text || "", cloudParams(st.shape).merge !== "off");
  const conf = st.shape.words || {};
  const setWord = (key, patch) => setSt({ shape: { ...st.shape, words: { ...conf, [key]: { ...(conf[key] || {}), ...patch } } } });
  const setAll = (fn) => setSt({ shape: { ...st.shape, words: Object.fromEntries(words.map((w, i) => [w.key, { ...(conf[w.key] || {}), ...fn(w, i) }])) } });
  if (!words.length) return <p className="fp-hint">Skriv noen ord i tekstfeltet, så kan du velge størrelsen på hvert ord her.</p>;
  return (
    <>
      <div className="fp-sec">Størrelse på ordene</div>
      <div className="fp-presets">
        <button type="button" onClick={() => setAll((w, i) => ({ size: i === 0 ? 5 : Math.max(1, 4 - Math.floor((i - 1) / 2)) }))}>Første ord størst</button>
        <button type="button" onClick={() => setAll(() => ({ size: 3 }))}>Like store</button>
        <button type="button" onClick={() => setSt({ shape: { ...st.shape, words: {} } })}>Automatisk</button>
      </div>
      <div className="fp-words">
        {words.map((w) => {
          const c = conf[w.key] || {};
          return (
            <div key={w.key} className="fp-word">
              <span className="fp-word-name" title={w.count > 1 ? `${w.word} – brukt ${w.count} ganger` : w.word}>{w.word}{w.count > 1 ? <em className="fp-word-n">×{w.count}</em> : null}</span>
              <div className="fp-sizes" role="radiogroup" aria-label={`Størrelse på ${w.word}`}>
                {CLOUD_SIZES.map(([navn], i) => (
                  <button key={navn} type="button" role="radio" aria-checked={c.size === i + 1} title={navn}
                    className={c.size === i + 1 ? "on" : ""} onClick={() => setWord(w.key, { size: c.size === i + 1 ? undefined : i + 1 })}>
                    <span style={{ fontSize: 9 + i * 2.5 }}>A</span>
                  </button>
                ))}
              </div>
              <button type="button" className={"fp-rot" + (c.rot ? " on" : "")} title={c.rot === "v" ? "Loddrett" : c.rot === "h" ? "Vannrett" : "Automatisk retning"}
                onClick={() => setWord(w.key, { rot: c.rot === "h" ? "v" : c.rot === "v" ? undefined : "h" })}>
                {c.rot === "v" ? "↕" : c.rot === "h" ? "↔" : "⤢"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="fp-hint">A-knappene går fra minst til størst. Pilen bytter mellom vannrett ↔, loddrett ↕ og automatisk ⤢. På automatisk følger ordet «Vinkler» og «Andel ord med vinkel» i innstillingene over.</p>
    </>
  );
}

/* ---------- settings for the chosen effect ---------- */
function FxSettings({ fx, setFx, navn }) {
  const defs = EFFECT_SETTINGS[fx.type] || [];
  const P = fxParams(fx);
  const ref = useRef(null);
  useEffect(() => { ref.current?.closest(".fp-pane")?.scrollTo({ top: 0, behavior: "smooth" }); }, [fx.type]);
  const set = (k, v) => setFx({ p: { ...(fx.p || {}), [k]: v } });
  const changed = defs.some((d) => fx.p && fx.p[d.k] !== undefined && fx.p[d.k] !== d.def);
  return (
    <div ref={ref} className="fp-fxset">
      <div className="fp-fxset-head">
        <span>{navn}: innstillinger</span>
        <button type="button" className="fp-reset" disabled={!changed} onClick={() => setFx({ p: undefined })}>Tilbakestill</button>
      </div>
      {defs.map((d) => d.choices ? (
        <div key={d.k} className="fp-set">
          <span className="fp-set-l">{d.navn}</span>
          <div className="fp-seg fp-seg-sm" role="radiogroup" aria-label={d.navn} style={{ gridTemplateColumns: `repeat(${d.choices.length}, 1fr)` }}>
            {d.choices.map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={P[d.k] === v} className={P[d.k] === v ? "on" : ""} onClick={() => set(d.k, v)}>{t}</button>
            ))}
          </div>
        </div>
      ) : (
        <label key={d.k} className="fp-set">
          <span className="fp-set-l">{d.navn}<b>{P[d.k]}{d.unit || ""}</b></span>
          <input type="range" min={d.min ?? 0} max={d.max ?? 100} step="1" value={P[d.k]} onChange={(e) => set(d.k, Math.round(+e.target.value))} />
        </label>
      ))}
    </div>
  );
}

/* ---------- settings for the chosen shape ---------- */
function ShapeSettings({ st, setSt, sh, off }) {
  const defs = SHAPE_SETTINGS[sh.type] || [];
  const P = shapeParams(st.shape);
  const set = (k, v) => setSt({ shape: k === "amount" ? { ...st.shape, amount: v } : { ...st.shape, p: { ...(st.shape.p || {}), [k]: v } } });
  const amt = defs.find((d) => d.k === "amount");
  const changed = !!st.shape.p || (amt && st.shape.amount !== amt.def);
  const reset = () => setSt({ shape: { ...st.shape, p: undefined, amount: amt ? amt.def : st.shape.amount } });
  if (!defs.length) return null;
  return (
    <div className={"fp-fxset" + (off ? " is-off" : "")}>
      <div className="fp-fxset-head">
        <span>{sh.navn}: innstillinger</span>
        {amt && amt.min < 0 ? <button type="button" className="fp-reset" disabled={off} onClick={() => set("amount", -P.amount)}>Snu</button> : null}
        <button type="button" className="fp-reset" disabled={!changed || off} onClick={reset}>Tilbakestill</button>
      </div>
      {defs.map((d) => d.choices ? (
        <div key={d.k} className="fp-set">
          <span className="fp-set-l">{d.navn}</span>
          <div className="fp-seg fp-seg-sm" role="radiogroup" aria-label={d.navn} style={{ gridTemplateColumns: `repeat(${d.choices.length}, 1fr)` }}>
            {d.choices.map(([v, t]) => (
              <button key={v} type="button" role="radio" disabled={off} aria-checked={P[d.k] === v} className={P[d.k] === v ? "on" : ""} onClick={() => set(d.k, v)}>{t}</button>
            ))}
          </div>
        </div>
      ) : (
        <label key={d.k} className="fp-set">
          <span className="fp-set-l">{d.navn}<b>{d.scale ? (P[d.k] * d.scale).toFixed(1).replace(".", ",") : (P[d.k] > 0 && d.min < 0 ? "+" : "") + P[d.k]}{d.unit || ""}</b></span>
          <input type="range" min={d.min ?? 0} max={d.max ?? 100} step="1" value={P[d.k]} disabled={off} onChange={(e) => set(d.k, Math.round(+e.target.value))} />
        </label>
      ))}
    </div>
  );
}

/* ---------- Ordsky: settings ---------- */
function CloudSettings({ st, setSt, palette, textColor }) {
  const C = cloudParams(st.shape);
  const set = (k, v) => setSt({ shape: { ...st.shape, cloud: { ...(st.shape.cloud || {}), [k]: v }, ...(k === "vertical" ? { amount: v } : {}) } });
  const changed = CLOUD_SETTINGS.some((d) => st.shape.cloud?.[d.k] !== undefined && st.shape.cloud[d.k] !== d.def);
  return (
    <div className="fp-fxset">
      <div className="fp-fxset-head">
        <span>Ordsky: innstillinger</span>
        <button type="button" className="fp-reset" disabled={!changed} onClick={() => setSt({ shape: { ...st.shape, cloud: undefined, amount: 30 } })}>Tilbakestill</button>
      </div>
      {CLOUD_SETTINGS.map((d) => {
        const off = d.k === "vertical" && C.angles === "h";
        return d.choices ? (
          <div key={d.k} className="fp-set">
            <span className="fp-set-l">{d.navn}</span>
            <div className="fp-seg fp-seg-sm" role="radiogroup" aria-label={d.navn} style={{ gridTemplateColumns: `repeat(${d.choices.length}, 1fr)` }}>
              {d.choices.map(([v, t]) => (
                <button key={v} type="button" role="radio" aria-checked={C[d.k] === v} className={C[d.k] === v ? "on" : ""} onClick={() => set(d.k, v)}>{t}</button>
              ))}
            </div>
          </div>
        ) : (
          <label key={d.k} className="fp-set" style={off ? { opacity: 0.35 } : undefined}>
            <span className="fp-set-l">{d.navn}<b>{C[d.k]}{d.unit || ""}</b></span>
            <input type="range" min="0" max="100" step="1" value={C[d.k]} disabled={off} onChange={(e) => set(d.k, Math.round(+e.target.value))} />
          </label>
        );
      })}
      {C.colors !== "text" ? (() => {
        const all = cloudPalette(st.shape, palette, textColor);
        const vals = C.colors === "alt" ? all.slice(0, 2) : all;
        return (
          <div className="fp-set">
            <span className="fp-set-l">{C.colors === "alt" ? "De to fargene" : "Fargene i paletten"}</span>
            <ColorSlots values={vals} palette={palette} min={C.colors === "alt" ? 2 : 1} max={C.colors === "alt" ? 2 : 10}
              onChange={(v) => set("palette", C.colors === "alt" ? [...v, ...all.slice(2)] : v)} />
          </div>
        );
      })() : null}
      <div className="fp-presets" style={{ marginTop: 0 }}>
        <button type="button" onClick={() => setSt({ shape: { ...st.shape, seed: (st.shape.seed || 1) + 1 } })}>Bland plassering</button>
      </div>
    </div>
  );
}

/* ---------- several colours: pick a slot, then a colour; add or remove slots ---------- */
function ColorSlots({ values, onChange, palette, min = 1, max = 8 }) {
  const [sel, setSel] = useState(0);
  const i = Math.min(sel, values.length - 1);
  const setAt = (c) => onChange(values.map((v, k) => (k === i ? c : v)));
  return (
    <div className="fp-slots">
      <div className="fp-slot-row">
        {values.map((c, k) => (
          <button key={k} type="button" className={"fp-slot" + (k === i ? " on" : "")} style={{ background: c }}
            aria-label={`Farge ${k + 1}: ${c}`} title={`Farge ${k + 1}`} onClick={() => setSel(k)}><span>{k + 1}</span></button>
        ))}
        {values.length < max ? <button type="button" className="fp-slot-add" aria-label="Legg til farge" title="Legg til farge" onClick={() => { onChange([...values, values[values.length - 1] || "#ffffff"]); setSel(values.length); }}>+</button> : null}
        {values.length > min ? <button type="button" className="fp-slot-add" aria-label="Fjern valgt farge" title="Fjern valgt farge" onClick={() => { onChange(values.filter((_, k) => k !== i)); setSel(Math.max(0, i - 1)); }}>−</button> : null}
      </div>
      <Swatches value={values[i]} palette={palette} onPick={setAt} />
    </div>
  );
}
