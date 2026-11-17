import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// TextStyle.jsx – text style model, CSS helpers and <StyledText> for Thumbnail Studio
//
// textStyle = {
//   bold, italic, strike: boolean,
//   underline: "none" | "single" | "double" | "wavy" | "dotted",
//   alignH: "left" | "center" | "right", alignV: "top" | "middle" | "bottom",
//   direction: "horizontal" | "stacked" | "up" | "down",
//   size: px | null, lineHeight: 1.0..3.0, tracking: -100..400 (1/1000 em),
//   shape: { type, amount: -100..100, color, seed }   // see SHAPES
//   effect: { type, color, color2, p: { setting: value }, image } // see EFFECTS and EFFECT_SETTINGS
// }

export const DEFAULT_TEXT_STYLE = {
  bold: false, italic: false, strike: false, underline: "none",
  alignH: "center", alignV: "middle", direction: "horizontal",
  size: null,        // px – null = the layer's own size
  lineHeight: 1.1,   // line spacing (1.0 – 3.0)
  tracking: 0,       // letter spacing in 1/1000 em (−100 – 400)
  weight: null,      // 100–900 for variable fonts (null = Bold on/off)
  flipH: false, flipV: false, // mirror horizontally / vertically
  rotate: 0,          // rotate the whole text, −180…180 degrees
  shape: { type: "none", amount: 50, color: "#e04f9a", seed: 1 },
  effect: { type: "none", color: "#000000", color2: "#f4b53f", strength: 50 },
};

/* Forms. kind: path = text follows a line, warp = every letter is scaled/moved, css = transform, cloud = word cloud */
export const SHAPES = [
  { type: "none", navn: "Ingen", kind: "css" },
  { type: "arc", navn: "Bue", kind: "path", tip: "Pluss = bue opp, minus = smil" },
  { type: "wave", navn: "Bølge", kind: "path", tip: "Høyde og retning på bølgen" },
  { type: "circle", navn: "Sirkel", kind: "path", tip: "Pluss = utenpå, minus = innsiden. Styrke = hvor mye av sirkelen" },
  { type: "spiral", navn: "Spiral", kind: "path", tip: "Antall runder. Minus = motsatt vei" },
  { type: "ribbon", navn: "Bånd", kind: "path", tip: "Tekst på et farget bånd" },
  { type: "archlines", navn: "Buede linjer", kind: "warp", tip: "Hver linje bøyes" },
  { type: "flag", navn: "Flagg", kind: "warp", tip: "Teksten vaier som et flagg" },
  { type: "bulge", navn: "Bule", kind: "warp", tip: "Midten blir større" },
  { type: "pinch", navn: "Klem", kind: "warp", tip: "Midten blir mindre" },
  { type: "perspective", navn: "Perspektiv", kind: "warp", tip: "Pluss = større mot høyre" },
  { type: "skew", navn: "Skjev", kind: "css", tip: "Skrår teksten" },
  { type: "pattern", navn: "Mønster", kind: "pattern", tip: "Teksten gjentas over hele boksen og bølger" },
  { type: "cloud", navn: "Ordsky", kind: "cloud", tip: "Styrke = andel loddrette ord" },
];

export const EFFECTS = [
  { type: "none", navn: "Ingen" },
  { type: "shadow", navn: "Skygge", color: "#000000" },
  { type: "lift", navn: "Løftet", color: "#000000" },
  { type: "outline", navn: "Kontur", color: "#000000" },
  { type: "hollow", navn: "Uthulet", color: "#ffffff" },
  { type: "glow", navn: "Glød", color: "#f4b53f" },
  { type: "neon", navn: "Neon", color: "#ff3fa4" },
  { type: "extrude", navn: "3D", color: "#f4b53f" },
  { type: "echo", navn: "Ekko", color: "#ffffff" },
  { type: "repeat", navn: "Gjenta", color: "#ffffff" },
  { type: "slices", navn: "Skyggelag", color: "#ffffff" },
  { type: "stripes", navn: "Retro-striper", color: "#e2552e", color2: "#2a7f86" },
  { type: "retro3d", navn: "Retro 3D", color: "#ef9a0a", color2: "#11908f" },
  { type: "reflect", navn: "Speiling", color: "#ffffff" },
  { type: "split", navn: "Brettet", color: "#e8822f" },
  { type: "imagefill", navn: "Bildefyll", color: "#ffffff" },
  { type: "grunge", navn: "Slitt", color: "#ffffff" },
  { type: "spray", navn: "Spray", color: "#000000" },
  { type: "dust", navn: "Støv", color: "#000000" },
  { type: "glitch", navn: "Glitch", color: "#00e5ff", color2: "#ff2d55" },
  { type: "gradient", navn: "Gradient", color: "#f4b53f", color2: "#ff3fa4" },
  { type: "box", navn: "Boks", color: "#f4b53f" },
];

/* Ready-made looks taken from the reference images (text colour + background shown in the tile). */
export const PRESETS = [
  { navn: "Retro", bg: "#16213a", color: "#f6e7c8", style: { bold: true, shape: { type: "none" }, effect: { type: "stripes", color: "#e2552e", color2: "#2a7f86", strength: 50 } } },
  { navn: "Retro 3D", bg: "#06141c", color: "#ead7a6", style: { bold: true, shape: { type: "none" }, effect: { type: "retro3d", color: "#ef9a0a", color2: "#11908f", strength: 50 } } },
  { navn: "Skyggelag", bg: "#000000", color: "#ffffff", style: { shape: { type: "none" }, effect: { type: "slices", color: "#ffffff", strength: 50 } } },
  { navn: "Text warp", bg: "#2f3df5", color: "#ffffff", style: { bold: true, shape: { type: "bulge", amount: 70 }, effect: { type: "repeat", color: "#ffffff", strength: 50 } } },
  { navn: "Brettet", bg: "#6cc6de", color: "#f4ecd8", style: { bold: true, shape: { type: "none" }, effect: { type: "split", color: "#e8822f", strength: 50 } } },
  { navn: "Slitt", bg: "#111111", color: "#f2f2f2", style: { shape: { type: "none" }, effect: { type: "grunge", color: "#ffffff", strength: 55 } } },
  { navn: "Støv", bg: "#e6e3df", color: "#111111", style: { shape: { type: "none" }, effect: { type: "dust", color: "#000000", strength: 55 } } },
  { navn: "Spray", bg: "#efece6", color: "#1b1b1b", style: { shape: { type: "none" }, effect: { type: "spray", color: "#000000", strength: 50 } } },
  { navn: "Bildefyll", bg: "#e9edef", color: "#ffffff", style: { bold: true, shape: { type: "none" }, effect: { type: "imagefill", strength: 50 } } },
  { navn: "Mønster", bg: "#000000", color: "#ffffff", style: { shape: { type: "pattern", amount: 60 }, effect: { type: "none" } } },
  { navn: "Bølge", bg: "#ffffff", color: "#111111", style: { bold: true, shape: { type: "wave", amount: 70 }, effect: { type: "none" } } },
  { navn: "Bånd", bg: "#ffd3e6", color: "#ffffff", style: { bold: true, shape: { type: "ribbon", amount: 55, color: "#ff1f8e" }, effect: { type: "none" } } },
  { navn: "Sirkel", bg: "#ff9f4a", color: "#111111", style: { bold: true, shape: { type: "circle", amount: 100 }, effect: { type: "none" } } },
  { navn: "Skjev", bg: "#f4b53f", color: "#e8501a", style: { bold: true, shape: { type: "skew", amount: 45 }, effect: { type: "none" } } },
  { navn: "Buede linjer", bg: "#3a3a2a", color: "#f3f05a", style: { shape: { type: "archlines", amount: 35 }, effect: { type: "shadow", color: "#000000", strength: 40 } } },
];

/* ---------- settings for each shape (Form) ----------
   "amount" is stored in shape.amount (−100…100), the rest in shape.p. */
const AMT = (navn, def = 50, min = -100) => ({ k: "amount", navn, def, min, max: 100 });
export const SHAPE_SETTINGS = {
  arc: [AMT("Bue (minus = smil)"), { k: "pos", navn: "Plassering langs buen", def: 50, unit: "%" }, { k: "height", navn: "Høyde på buen", def: 100, min: 20, max: 100, unit: "%" }],
  wave: [AMT("Bølgehøyde"), { k: "waves", navn: "Antall bølger", def: 13, min: 3, max: 40, scale: 0.1 }, { k: "phase", navn: "Forskyv bølgen", def: 0, min: 0, max: 360, unit: "°" }, { k: "pos", navn: "Plassering", def: 50, unit: "%" }],
  circle: [{ k: "side", navn: "Teksten står", def: "out", choices: [["out", "Utenpå"], ["in", "Innsiden"]] }, { k: "share", navn: "Hvor mye av sirkelen", def: 50, min: 15, max: 100, unit: "%" },
    { k: "start", navn: "Roter rundt sirkelen", def: 0, min: -180, max: 180, unit: "°" }, { k: "radius", navn: "Størrelse på sirkelen", def: 100, min: 30, max: 100, unit: "%" }],
  spiral: [{ k: "turns", navn: "Antall runder", def: 20, min: 10, max: 50, scale: 0.1 }, { k: "dir", navn: "Retning", def: "cw", choices: [["cw", "Med klokka"], ["ccw", "Mot klokka"]] }, { k: "inner", navn: "Innerste runde", def: 22, min: 5, max: 80, unit: "%" }],
  ribbon: [AMT("Bølgehøyde", 55), { k: "waves", navn: "Antall bølger", def: 13, min: 3, max: 40, scale: 0.1 }, { k: "band", navn: "Båndbredde", def: 145, min: 110, max: 260, unit: "%" }, { k: "phase", navn: "Forskyv bølgen", def: 0, min: 0, max: 360, unit: "°" }],
  archlines: [AMT("Bøy (minus = smil)")],
  flag: [AMT("Bølgehøyde"), { k: "waves", navn: "Antall bølger", def: 10, min: 3, max: 30, scale: 0.1 }, { k: "phase", navn: "Forskyv bølgen", def: 0, min: 0, max: 360, unit: "°" }],
  bulge: [AMT("Styrke", 50, 0), { k: "center", navn: "Midtpunkt", def: 50, unit: "%" }],
  pinch: [AMT("Styrke", 50, 0), { k: "center", navn: "Midtpunkt", def: 50, unit: "%" }],
  perspective: [AMT("Styrke (minus = større til venstre)"), { k: "vertical", navn: "Retning", def: "h", choices: [["h", "Vannrett"], ["v", "Loddrett"]] }],
  skew: [AMT("Skjev vannrett", 45), { k: "skewY", navn: "Skjev loddrett", def: 0, min: -45, max: 45, unit: "°" }],
  pattern: [AMT("Bølgehøyde", 60), { k: "waves", navn: "Antall bølger", def: 9, min: 0, max: 30, scale: 0.1 }, { k: "size", navn: "Tekststørrelse", def: 45, min: 15, max: 100, unit: "%" },
    { k: "rowgap", navn: "Avstand mellom radene", def: 100, min: 70, max: 220, unit: "%" }, { k: "shift", navn: "Forskyvning per rad", def: 37, unit: "%" }],
};
/** Shape settings with defaults filled in (amount included). */
export function shapeParams(shape = {}) {
  const P = {};
  for (const d of SHAPE_SETTINGS[shape.type] || []) P[d.k] = d.k === "amount" ? shape.amount ?? d.def : shape.p?.[d.k] ?? d.def;
  // older layers: circle used the sign/size of amount
  if (shape.type === "circle" && !shape.p && shape.amount != null) { P.side = shape.amount < 0 ? "in" : "out"; P.share = Math.max(25, Math.abs(shape.amount)); }
  if (shape.type === "spiral" && !shape.p && shape.amount != null) { P.turns = Math.round(10 + Math.abs(shape.amount) * 0.2); P.dir = shape.amount < 0 ? "ccw" : "cw"; }
  return P;
}

/** Font weight: `weight` (100–900) wins, otherwise Bold = 700. */
export const wOf = (st) => st.weight || (st.bold ? 700 : 400);

const hexA = (hex = "#000", a = 1) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const mix = (a, b, t) => {
  const p = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
/* ---------- settings for each effect ----------
   Every effect has its own settings (sliders 0–100 unless min/max is given, or choices).
   They are stored in effect.p = { key: value }. The defaults reproduce the original look. */
export const EFFECT_SETTINGS = {
  shadow: [
    { k: "distance", navn: "Avstand", def: 40 },
    { k: "angle", navn: "Vinkel", def: 90, min: 0, max: 360, unit: "°" },
    { k: "blur", navn: "Uskarphet", def: 40 },
    { k: "opacity", navn: "Synlighet", def: 60, unit: "%" },
  ],
  lift: [
    { k: "height", navn: "Høyde", def: 60 },
    { k: "softness", navn: "Mykhet", def: 55 },
    { k: "opacity", navn: "Synlighet", def: 50, unit: "%" },
  ],
  outline: [
    { k: "width", navn: "Tykkelse", def: 33 },
    { k: "position", navn: "Plassering", def: "outside", choices: [["outside", "Utenfor"], ["center", "På kanten"]] },
  ],
  hollow: [{ k: "width", navn: "Tykkelse", def: 37 }],
  glow: [
    { k: "size", navn: "Størrelse", def: 50 },
    { k: "intensity", navn: "Styrke", def: 90, unit: "%" },
  ],
  neon: [
    { k: "size", navn: "Størrelse", def: 50 },
    { k: "intensity", navn: "Styrke", def: 85, unit: "%" },
    { k: "core", navn: "Rør", def: "white", choices: [["white", "Hvitt"], ["color", "Tekstfarge"]] },
  ],
  extrude: [
    { k: "depth", navn: "Dybde", def: 25 },
    { k: "angle", navn: "Vinkel", def: 45, min: 0, max: 360, unit: "°" },
    { k: "shade", navn: "Mørkere bakover", def: 0, unit: "%" },
  ],
  echo: [
    { k: "count", navn: "Antall", def: 3, min: 1, max: 8 },
    { k: "distance", navn: "Avstand", def: 50 },
    { k: "angle", navn: "Vinkel", def: 45, min: 0, max: 360, unit: "°" },
    { k: "fade", navn: "Uttoning", def: 50, unit: "%" },
  ],
  repeat: [
    { k: "count", navn: "Antall kopier", def: 4, min: 1, max: 8 },
    { k: "gap", navn: "Avstand", def: 62, min: 30, max: 160, unit: "%" },
    { k: "width", navn: "Strektykkelse", def: 25 },
    { k: "fade", navn: "Uttoning", def: 50, unit: "%" },
    { k: "dir", navn: "Retning", def: "both", choices: [["both", "Begge"], ["up", "Opp"], ["down", "Ned"]] },
  ],
  slices: [
    { k: "count", navn: "Antall lag", def: 2, min: 1, max: 5 },
    { k: "gap", navn: "Avstand", def: 50 },
    { k: "width", navn: "Strektykkelse", def: 25 },
    { k: "dir", navn: "Retning", def: "both", choices: [["both", "Begge"], ["up", "Opp"], ["down", "Ned"]] },
  ],
  stripes: [
    { k: "count", navn: "Antall striper", def: 3, min: 1, max: 6 },
    { k: "gap", navn: "Avstand", def: 50 },
    { k: "blur", navn: "Uskarphet", def: 50 },
    { k: "dir", navn: "Retning", def: "both", choices: [["both", "Begge"], ["up", "Opp"], ["down", "Ned"]] },
  ],
  retro3d: [
    { k: "depth", navn: "Dybde", def: 50 },
    { k: "border", navn: "Hvit kant", def: 50 },
    { k: "bands", navn: "Antall farger", def: "6", choices: [["3", "3"], ["4", "4"], ["6", "6"]] },
  ],
  reflect: [
    { k: "distance", navn: "Avstand", def: 50 },
    { k: "opacity", navn: "Synlighet", def: 45, unit: "%" },
    { k: "fade", navn: "Lengde", def: 75, unit: "%" },
  ],
  split: [
    { k: "cut", navn: "Brettelinje", def: 50, min: 20, max: 80, unit: "%" },
    { k: "shift", navn: "Forskyvning", def: 50 },
    { k: "side", navn: "Retning", def: "left", choices: [["left", "Venstre"], ["right", "Høyre"]] },
  ],
  imagefill: [
    { k: "zoom", navn: "Zoom", def: 100, min: 100, max: 300, unit: "%" },
    { k: "x", navn: "Bildets plass vannrett", def: 50, unit: "%" },
    { k: "y", navn: "Bildets plass loddrett", def: 50, unit: "%" },
  ],
  grunge: [
    { k: "wear", navn: "Slitasje", def: 55 },
    { k: "rough", navn: "Ujevne kanter", def: 50 },
    { k: "splatter", navn: "Sprut", def: 50 },
  ],
  spray: [
    { k: "halo", navn: "Spraysky", def: 50 },
    { k: "grain", navn: "Korn", def: 50 },
  ],
  dust: [
    { k: "drift", navn: "Drift", def: 55 },
    { k: "scatter", navn: "Spredning", def: 55 },
    { k: "side", navn: "Retning", def: "right", choices: [["right", "Høyre"], ["left", "Venstre"]] },
  ],
  glitch: [
    { k: "offset", navn: "Forskyvning", def: 50 },
    { k: "angle", navn: "Vinkel", def: 0, min: 0, max: 180, unit: "°" },
  ],
  gradient: [{ k: "angle", navn: "Vinkel", def: 180, min: 0, max: 360, unit: "°" }],
  box: [
    { k: "padding", navn: "Luft rundt", def: 50 },
    { k: "radius", navn: "Runde hjørner", def: 50 },
    { k: "opacity", navn: "Synlighet", def: 100, unit: "%" },
  ],
};

/** Effect settings with defaults filled in. Numbers 0–100 are also given as 0–1 in P._(key). */
export function fxParams(effect = {}) {
  const P = {};
  for (const s of EFFECT_SETTINGS[effect.type] || []) P[s.k] = effect.p?.[s.k] ?? s.def;
  return P;
}
const u = (v) => v / 100;
const polar = (dist, deg) => [Math.cos((deg * Math.PI) / 180) * dist, Math.sin((deg * Math.PI) / 180) * dist];
const f3 = (n) => +n.toFixed(4);

/** Retro 3D: colour bands straight down – warm (color) on top, cool (color2) below. */
function retroColors(color, color2, n = 6, custom) {
  if (custom?.length === n) return custom;
  const all = [color, mix(color, "#7a2400", 0.32), mix(color, "#7a2400", 0.5), mix(color2, "#ffffff", 0.55), color2, mix(color2, "#00283a", 0.45)];
  return n === 3 ? [all[0], all[2], all[4]] : n === 4 ? [all[0], all[2], all[3], all[5]] : all;
}
/** All band colours for Retro 3D (custom ones from effect.colors, otherwise made from color/color2). */
export const retroColorsOf = (fx) => retroColors(fx.color || "#ef9a0a", fx.color2 || "#11908f", +fxParams(fx).bands, fx.colors);
/** Stripe colours for Retro-striper, nearest the text first: { up: [...], down: [...] }. */
export function stripeColorsOf(fx) {
  const n = fxParams(fx).count;
  const t = (i) => (n === 1 ? 1 : (n - i) / (n - 1)); // 1 = nearest the text
  const up = Array.from({ length: n }, (_, k) => mix(fx.color || "#e2552e", "#ffd9a0", t(k + 1) * 0.55));
  const down = Array.from({ length: n }, (_, k) => mix(fx.color2 || "#2a7f86", "#d6f2ea", t(k + 1) * 0.6));
  return { up: fx.colorsUp?.length === n ? fx.colorsUp : up, down: fx.colorsDown?.length === n ? fx.colorsDown : down };
}
function retroBands(color, color2, P, custom) {
  const cols = retroColors(color, color2, +P.bands, custom);
  const band = (0.06 + u(P.depth) * 0.06) * (6 / cols.length); // em per band
  const step = 0.01;
  const out = [];
  for (let b = 0; b < cols.length; b++) for (let y = band * b + step; y <= band * (b + 1) + 0.0001; y += step) out.push(`0 ${y.toFixed(3)}em 0 ${cols[b]}`);
  return out;
}

/* ---------- HTML/CSS effects (in em, so they scale with the text) ---------- */
export function effectCss(effect = {}, filterId, textColor) {
  const { type = "none", color = "#000", color2 = "#f4b53f" } = effect;
  const P = fxParams(effect);
  switch (type) {
    case "shadow": {
      const [dx, dy] = polar(u(P.distance) * 0.15, P.angle);
      return { textShadow: `${f3(dx)}em ${f3(dy)}em ${f3(u(P.blur) * 0.35)}em ${hexA(color, u(P.opacity))}` };
    }
    case "lift": {
      const h = u(P.height) * 0.2, op = u(P.opacity);
      return { textShadow: `0 ${f3(h * 0.15)}em 0.01em ${hexA(color, Math.min(1, op * 1.2))}, 0 ${f3(h)}em ${f3(u(P.softness) * 0.5)}em ${hexA(color, op * 0.7)}` };
    }
    case "outline": {
      const w = u(P.width) * 0.15;
      return P.position === "center" ? { WebkitTextStroke: `${f3(w)}em ${color}` } : { WebkitTextStroke: `${f3(w)}em ${color}`, paintOrder: "stroke fill" };
    }
    case "hollow": return { color: "transparent", WebkitTextStroke: `${f3(Math.max(0.004, u(P.width) * 0.08))}em ${color}` };
    case "glow": {
      const s = u(P.size) * 0.8, op = u(P.intensity);
      return { textShadow: `0 0 ${f3(s * 0.3)}em ${hexA(color, op)}, 0 0 ${f3(s)}em ${hexA(color, op * 0.7)}` };
    }
    case "neon": {
      const s = u(P.size), op = u(P.intensity);
      return {
        color: P.core === "white" ? "#ffffff" : undefined,
        textShadow: `0 0 0.03em ${P.core === "white" ? "#fff" : color}, 0 0 ${f3(0.04 + s * 0.12)}em ${hexA(color, op)}, 0 0 ${f3(0.1 + s * 0.35)}em ${hexA(color, op)}, 0 0 ${f3(0.25 + s * 0.9)}em ${hexA(color, op * 0.8)}`,
      };
    }
    case "extrude": {
      const n = Math.round(u(P.depth) * 25) + 1;
      const [sx, sy] = polar(0.012, P.angle);
      return { textShadow: Array.from({ length: n }, (_, i) => `${f3((i + 1) * sx)}em ${f3((i + 1) * sy)}em 0 ${mix(color, "#000000", (u(P.shade) * (i + 1)) / n)}`).join(",") };
    }
    case "echo": {
      const [sx, sy] = polar(0.02 + u(P.distance) * 0.1, P.angle);
      return { textShadow: Array.from({ length: P.count }, (_, k) => { const i = k + 1; return `${f3(i * sx)}em ${f3(i * sy)}em 0 ${hexA(color, Math.max(0.05, 1 - (u(P.fade) * i) / (P.count * 0.9 + 0.1)) * 0.9)}`; }).join(",") };
    }
    case "glitch": {
      const [sx, sy] = polar(0.01 + u(P.offset) * 0.1, P.angle);
      return { textShadow: `${f3(-sx)}em ${f3(-sy)}em 0 ${color}, ${f3(sx)}em ${f3(sy)}em 0 ${color2}` };
    }
    case "gradient": return { backgroundImage: `linear-gradient(${P.angle}deg, ${color}, ${color2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
    case "retro3d": return { WebkitTextStroke: `${f3(u(P.border) * 0.07)}em #ffffff`, paintOrder: "stroke fill", textShadow: retroBands(color, color2, P, effect.colors).join(",") };
    case "imagefill": return effect.image
      ? { backgroundImage: `url("${effect.image}")`, backgroundSize: P.zoom === 100 ? "cover" : `${P.zoom}%`, backgroundPosition: `${P.x}% ${P.y}%`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
      : { color: "#888" };
    case "grunge": case "spray": case "dust": return filterId ? { filter: `url(#${filterId})` } : {};
    case "box": return {
      backgroundColor: hexA(color, u(P.opacity)), padding: `${f3(0.03 + u(P.padding) * 0.16)}em ${f3(0.08 + u(P.padding) * 0.34)}em`,
      boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", borderRadius: `${f3(u(P.radius) * 0.2)}em`,
    };
    default: return {};
  }
}

/* ---------- SVG effects (for shapes) ---------- */
function svgPaint(effect = {}, color, fontSize, gradId) {
  const { type = "none", color: c = "#000", color2 = "#f4b53f" } = effect;
  const P = fxParams(effect);
  const px = (em) => em * fontSize;
  const p = { fill: color, stroke: "none", strokeWidth: 0, paintOrder: "stroke fill", strokeLinejoin: "round" };
  let filter;
  switch (type) {
    case "outline": Object.assign(p, { stroke: c, strokeWidth: px(u(P.width) * 0.15) * (P.position === "center" ? 1 : 2) }); if (P.position === "center") p.paintOrder = "fill stroke"; break;
    case "hollow": Object.assign(p, { fill: "none", stroke: c, strokeWidth: px(Math.max(0.004, u(P.width) * 0.08)) }); break;
    case "gradient": p.fill = `url(#${gradId})`; break;
    case "neon": if (P.core === "white") p.fill = "#ffffff"; filter = `drop-shadow(0 0 ${px(0.04 + u(P.size) * 0.12)}px ${hexA(c, u(P.intensity))}) drop-shadow(0 0 ${px(0.15 + u(P.size) * 0.5)}px ${hexA(c, u(P.intensity))})`; break;
    case "glow": filter = `drop-shadow(0 0 ${px(u(P.size) * 0.25)}px ${hexA(c, u(P.intensity))}) drop-shadow(0 0 ${px(u(P.size) * 0.6)}px ${hexA(c, u(P.intensity) * 0.7)})`; break;
    case "shadow": { const [dx, dy] = polar(px(u(P.distance) * 0.15), P.angle); filter = `drop-shadow(${dx}px ${dy}px ${px(u(P.blur) * 0.3)}px ${hexA(c, u(P.opacity))})`; break; }
    case "lift": filter = `drop-shadow(0 ${px(u(P.height) * 0.2)}px ${px(u(P.softness) * 0.4)}px ${hexA(c, u(P.opacity))})`; break;
    case "extrude": { const n = Math.min(12, Math.round(u(P.depth) * 25) + 1); const [sx, sy] = polar(px(0.012), P.angle); filter = Array.from({ length: n }, () => `drop-shadow(${sx}px ${sy}px 0 ${c})`).join(" "); break; }
    case "echo": { const [sx, sy] = polar(px(0.02 + u(P.distance) * 0.1), P.angle); filter = Array.from({ length: Math.min(4, P.count) }, () => `drop-shadow(${sx}px ${sy}px 0 ${hexA(c, 0.5)})`).join(" "); break; }
    case "glitch": { const [sx, sy] = polar(px(0.01 + u(P.offset) * 0.1), P.angle); filter = `drop-shadow(${-sx}px ${-sy}px 0 ${c}) drop-shadow(${sx}px ${sy}px 0 ${color2})`; break; }
    case "retro3d": {
      Object.assign(p, { stroke: "#ffffff", strokeWidth: px(u(P.border) * 0.07) });
      const cols = retroColors(c, color2, +P.bands, effect.colors), band = (0.06 + u(P.depth) * 0.06) * (6 / cols.length);
      filter = cols.map((col) => `drop-shadow(0 ${px(band)}px 0 ${col})`).join(" ");
      break;
    }
    case "imagefill": p.fill = effect.image ? `url(#${gradId}-img)` : "#888"; break;
    case "grunge": case "spray": case "dust": filter = `url(#${gradId}-fx)`; break;
    default: break;
  }
  return { paint: p, filter, gradient: type === "gradient" ? [c, color2, P.angle] : null, image: type === "imagefill" ? effect.image : null };
}

/** Full CSS for HTML text (no shape). */
export function textStyleCss(st = DEFAULT_TEXT_STYLE, color = "#ffffff") {
  const deco = [];
  if (st.underline && st.underline !== "none") deco.push("underline");
  if (st.strike) deco.push("line-through");
  const css = {
    color, fontWeight: wOf(st), fontStyle: st.italic ? "italic" : "normal", fontSynthesis: "none",
    textDecorationLine: deco.join(" ") || "none",
    textDecorationStyle: ["double", "wavy", "dotted"].includes(st.underline) ? st.underline : "solid",
    textDecorationThickness: "0.06em", textUnderlineOffset: "0.12em", textAlign: st.alignH,
    letterSpacing: st.tracking ? `${st.tracking / 1000}em` : undefined,
  };
  if (st.direction === "stacked") Object.assign(css, { writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "-0.1em" });
  if (st.direction === "up") Object.assign(css, { writingMode: "vertical-rl", transform: "rotate(180deg)" });
  if (st.direction === "down") Object.assign(css, { writingMode: "vertical-rl" });
  return { ...css, ...effectCss(st.effect) };
}

/** Places the text in the layer box (3×3 grid). */
export function boxCss(st = DEFAULT_TEXT_STYLE) {
  return {
    display: "flex", flexDirection: "column",
    alignItems: { left: "flex-start", center: "center", right: "flex-end" }[st.alignH],
    justifyContent: { top: "flex-start", middle: "center", bottom: "flex-end" }[st.alignV],
  };
}

/** Fills in defaults. Old layers with `curve` become shape "arc". */
export function normalizeStyle(textStyle = {}) {
  const st = { ...DEFAULT_TEXT_STYLE, ...textStyle };
  st.effect = { ...DEFAULT_TEXT_STYLE.effect, ...(textStyle.effect || {}) };
  st.shape = { ...DEFAULT_TEXT_STYLE.shape, ...(textStyle.shape || {}) };
  if (textStyle.curve && (!textStyle.shape || textStyle.shape.type === "none")) st.shape = { ...st.shape, type: "arc", amount: textStyle.curve };
  return st;
}

/* ---------- text measuring (warp and word cloud) ---------- */
let mctx;
const STRETCH_KW = [[50, "ultra-condensed"], [62.5, "extra-condensed"], [75, "condensed"], [87.5, "semi-condensed"], [100, "normal"], [112.5, "semi-expanded"], [125, "expanded"], [150, "extra-expanded"], [200, "ultra-expanded"]];
let curStretch = "normal"; // set by StyledText, so wide fonts (Expanded) are measured as wide as they are drawn
function measure(text, font) {
  mctx = mctx || document.createElement("canvas").getContext("2d");
  mctx.font = font;
  if ("fontStretch" in mctx) mctx.fontStretch = curStretch;
  return mctx.measureText(text).width;
}
/** Re-render (and re-measure) when web fonts finish loading. Returns a counter that changes each time. */
function useFontsReady(fontFamily) {
  const [n, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((t) => t + 1);
    document.fonts?.addEventListener?.("loadingdone", f);
    if (fontFamily && document.fonts?.load) document.fonts.load(`64px ${fontFamily}`, "AaÆØÅ").then(f, () => {});
    return () => document.fonts?.removeEventListener?.("loadingdone", f);
  }, [fontFamily]);
  return n;
}

let uid = 0;

/** SVG filters for Slitt (grunge), Spray and Støv (dust) – modelled on the reference images. */
function FxFilter({ id, effect }) {
  const type = effect.type;
  const P = fxParams(effect);
  if (type === "grunge") {
    // DISTORT: torn edges, cracks and small splatter around the letters
    const w = u(P.wear), r = u(P.rough), sp = u(P.splatter);
    return (
      <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="7" result="big" />
        <feDisplacementMap in="SourceGraphic" in2="big" scale={r * 16} xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="big" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 ${-(8.1 - w * 2.4)}`} result="holes" />
        <feComposite in="rough" in2="holes" operator="out" result="cut" />
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" result="fine" />
        <feColorMatrix in="fine" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 ${-(11.1 - w * 2.4)}`} result="pits" />
        <feComposite in="cut" in2="pits" operator="out" result="worn" />
        <feMorphology in="SourceAlpha" operator="dilate" radius={2 + sp * 20} result="near" />
        <feColorMatrix in="fine" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  16 0 0 0 ${-(13.6 - sp * 2.4)}`} result="dots" />
        <feComposite in="dots" in2="near" operator="in" result="splat0" />
        <feComposite in="splat0" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" result="splat" />
        <feComposite in="SourceGraphic" in2="splat" operator="in" result="tint" />
        <feMerge><feMergeNode in="tint" /><feMergeNode in="worn" /></feMerge>
      </filter>
    );
  }
  if (type === "dust") {
    // DUST: crisp core that breaks into grain and drifts sideways with motion blur
    const d = u(P.drift) * (P.side === "left" ? -1 : 1), sc = u(P.scatter);
    return (
      <filter id={id} x="-40%" y="-30%" width="180%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3.2 -1.3" result="grain" />
        <feComposite in="SourceGraphic" in2="grain" operator="in" result="grainy" />
        <feDisplacementMap in="grainy" in2="n" scale={10 + sc * 90} xChannelSelector="R" yChannelSelector="G" result="scatter" />
        <feOffset in="scatter" dx={d * 50} dy="0" result="drift" />
        <feGaussianBlur in="drift" stdDeviation={`${1 + Math.abs(d) * 20} 0.6`} result="smear" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={`${0.5 + sc * 5} 0.3`} result="soft" />
        <feComposite in="soft" in2="grain" operator="arithmetic" k1="0.6" k2="0.55" k3="0" k4="0" result="core" />
        <feMerge><feMergeNode in="smear" /><feMergeNode in="scatter" /><feMergeNode in="core" /></feMerge>
      </filter>
    );
  }
  // SPRAY: grainy letters with a soft sprayed halo
  const h = u(P.halo), g = u(P.grain);
  return (
    <filter id={id} x="-30%" y="-40%" width="160%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="9" result="n" />
      <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${2 + g * 1.2} ${-(0.4 + g * 0.7)}`} result="grain" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={1 + h * 22} result="halo" />
      <feComposite in="halo" in2="grain" operator="in" result="sprayHalo" />
      <feComponentTransfer in="sprayHalo" result="haloA"><feFuncA type="linear" slope={0.6 + h * 1.2} /></feComponentTransfer>
      <feDisplacementMap in="SourceGraphic" in2="n" scale={1 + g * 8} xChannelSelector="R" yChannelSelector="G" result="edge" />
      <feComposite in="edge" in2="grain" operator="arithmetic" k1={0.2 + g * 0.6} k2={1 - g * 0.5} k3="0" k4="0" result="core" />
      <feMerge><feMergeNode in="haloA" /><feMergeNode in="core" /></feMerge>
    </filter>
  );
}
const FILTER_FX = ["grunge", "spray", "dust"];
export const LAYER_FX = ["repeat", "slices", "stripes", "reflect", "split"];

/**
 * <StyledText> draws the text with style, effect, direction and shape.
 * Use it both on the canvas preview and when exporting (e.g. html-to-image).
 */
export function StyledText({ text, fontFamily, fontSize = 64, color = "#ffffff", textStyle, width = 600, height = 200, palette, fontStretch }) {
  const st = normalizeStyle(textStyle);
  if (st.size) fontSize = st.size;
  // effects made of copies of the whole text block do not work with word clouds and patterns
  const kind = (SHAPES.find((x) => x.type === st.shape.type) || {}).kind;
  const layered = LAYER_FX.includes(st.effect.type) && kind !== "cloud" && kind !== "pattern";
  const inner = layered
    ? <Layered {...{ text, fontFamily, fontSize, color, st, width, height, palette }} />
    : <Single {...{ text, fontFamily, fontSize, color, st, width, height, palette }} />;
  // font-stretch (wide variants, e.g. "Archivo Expanded" = 125%) is inherited by every text element inside
  const sp = parseFloat(fontStretch) || 100;
  curStretch = STRETCH_KW.reduce((a, b) => (Math.abs(b[0] - sp) < Math.abs(a[0] - sp) ? b : a))[1];
  const flip = [st.rotate ? `rotate(${st.rotate}deg)` : "", st.flipH || st.flipV ? `scale(${st.flipH ? -1 : 1}, ${st.flipV ? -1 : 1})` : ""].filter(Boolean).join(" ") || undefined;
  if (!fontStretch && !flip) return inner;
  return <div style={{ width, height, fontStretch, transform: flip }}>{inner}</div>;
}

/** CSS font-stretch for a font entry from fonts.json (wide variants have `bredde`). */
export const stretchOf = (font) => (font?.bredde ? font.bredde + "%" : undefined);

function Single({ text, fontFamily, fontSize, color, st, width, height, palette }) {
  const shape = SHAPES.find((s) => s.type === st.shape.type) || SHAPES[0];
  const vertical = st.direction !== "horizontal";
  if (shape.kind === "path" && !vertical) return <PathText {...{ text, fontFamily, fontSize, color, st, width, height }} />;
  if (shape.kind === "warp" && !vertical) return <WarpText {...{ text, fontFamily, fontSize, color, st, width, height }} />;
  if (shape.kind === "cloud") return <CloudText {...{ text, fontFamily, fontSize, color, st, width, height, palette }} />;
  if (shape.kind === "pattern") return <PatternText {...{ text, fontFamily, fontSize, color, st, width, height }} />;
  return <HtmlText {...{ text, fontFamily, fontSize, color, st, width, height, shape }} />;
}

function HtmlText({ text, fontFamily, fontSize, color, st, width, height, shape }) {
  const [fid] = useState(() => "stf-" + ++uid);
  const css = { ...textStyleCss(st, color), ...effectCss(st.effect, fid) };
  const SP = shapeParams(st.shape);
  const skew = shape.type === "skew" ? `skew(${-SP.amount * 0.45}deg, ${SP.skewY}deg)` : "";
  const transform = [css.transform, skew].filter(Boolean).join(" ") || undefined;
  return (
    <div style={{ width, height, ...boxCss(st) }}>
      {FILTER_FX.includes(st.effect.type) ? <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><FxFilter id={fid} effect={st.effect} /></svg> : null}
      <span style={{ fontFamily, fontSize, lineHeight: st.lineHeight || 1.1, whiteSpace: "pre-wrap", display: "inline-block", ...css, transform }}>{text}</span>
    </div>
  );
}

/* Effects built from several copies of the text:
   Gjenta (TEXT WARP), Skyggelag (SHADOW), Retro-striper (RETRO), Speiling, Brettet (FOLDED) */
function Layered({ text, fontFamily, fontSize, color, st, width, height, palette }) {
  const fx = st.effect;
  const P = fxParams(fx);
  const plain = { ...st, effect: { ...fx, type: "none" } };
  const lines = text.split("\n").length;
  const lh = fontSize * (st.lineHeight || 1.1);
  const blockH = lines * lh;
  const top = { top: 0, middle: (height - blockH) / 2, bottom: height - blockH }[st.alignV];
  const L = []; // layers behind the main text: { t, color, st, op, clip, blur }
  const hollow = { ...st, effect: { type: "hollow", color: fx.color, p: { width: P.width } } };
  const signs = (dir) => (dir === "up" ? [-1] : dir === "down" ? [1] : [-1, 1]);

  if (fx.type === "repeat") {
    // full outline copies overlapping above and below
    const n = P.count, gap = blockH * u(P.gap);
    for (let i = n; i >= 1; i--) for (const sg of signs(P.dir))
      L.push({ t: `translateY(${sg * i * gap}px)`, color: "transparent", st: hollow, op: Math.max(0.08, 1 - (u(P.fade) * i) / (n + 0.5)) });
  }
  if (fx.type === "slices") {
    // outline copies where only the part that sticks out is visible (like stacked cards)
    const n = P.count, gap = fontSize * (0.12 + u(P.gap) * 0.4);
    for (let i = n; i >= 1; i--) {
      const op = Math.max(0.15, 1 - (i - 1) * 0.25);
      if (signs(P.dir).includes(-1)) L.push({ t: `translateY(${-i * gap}px)`, color: "transparent", st: hollow, op, clip: `inset(${top}px 0 ${height - top - gap}px 0)` });
      if (signs(P.dir).includes(1)) L.push({ t: `translateY(${i * gap}px)`, color: "transparent", st: hollow, op, clip: `inset(${top + blockH - gap}px 0 ${height - top - blockH}px 0)` });
    }
  }
  if (fx.type === "stripes") {
    // RETRO: warm copies above and cool below, stacked close, outer ones softer
    const n = P.count, gap = fontSize * (0.13 + u(P.gap) * 0.1);
    const SC = stripeColorsOf(fx);
    for (let i = n; i >= 1; i--) {
      if (signs(P.dir).includes(-1)) L.push({ t: `translateY(${-i * gap}px)`, color: SC.up[i - 1], st: plain, blur: (i - 1) * u(P.blur) * 1.2 });
      if (signs(P.dir).includes(1)) L.push({ t: `translateY(${i * gap}px)`, color: SC.down[i - 1], st: plain, blur: i * u(P.blur) * 1.8 });
    }
  }
  if (fx.type === "reflect") {
    L.push({ t: `translateY(${blockH * (1.0 + u(P.distance) * 0.15)}px) scaleY(-1)`, color, st: plain, op: u(P.opacity),
      mask: `linear-gradient(to top, rgba(0,0,0,.95) ${top}px, transparent ${top + blockH * u(P.fade)}px)`, origin: `50% ${top + blockH / 2}px` });
  }
  const box = (l, i) => (
    <div key={i} style={{ position: "absolute", inset: 0, zIndex: 0, transform: l.t, transformOrigin: l.origin, opacity: l.op ?? 1, pointerEvents: "none",
      clipPath: l.clip, WebkitMaskImage: l.mask, maskImage: l.mask, filter: l.blur ? `blur(${l.blur}px)` : undefined }}>
      <Single {...{ text, fontFamily, fontSize, color: l.color, st: l.st, width, height, palette }} />
    </div>
  );
  // FOLDED: the top of each line is folded – coloured back side, front shifted sideways
  let fold = null;
  if (fx.type === "split") {
    const cut = lh * u(P.cut);
    const stripe = (h0, h1) => `repeating-linear-gradient(to bottom, transparent 0, transparent ${h0}px, #000 ${h0}px, #000 ${h1}px, transparent ${h1}px, transparent ${lh}px)`;
    const topMask = stripe(0, cut);
    const botMask = stripe(cut, lh);
    const m = (mask) => ({ WebkitMaskImage: mask, maskImage: mask, WebkitMaskPosition: `0 ${top}px`, maskPosition: `0 ${top}px` });
    const shift = fontSize * u(P.shift) * 0.16 * (P.side === "right" ? 1 : -1);
    fold = (
      <>
        <div style={{ position: "absolute", inset: 0, ...m(botMask) }}><Single {...{ text, fontFamily, fontSize, color, st: plain, width, height, palette }} /></div>
        <div style={{ position: "absolute", inset: 0, ...m(topMask) }}>
          <Single {...{ text, fontFamily, fontSize, color: "transparent", st: { ...plain, effect: { type: "gradient", color: mix(fx.color, "#ffffff", 0.15), color2: mix(fx.color, "#7a2400", 0.35) } }, width, height, palette }} />
        </div>
        <div style={{ position: "absolute", inset: 0, ...m(topMask), transform: `translate(${shift}px, ${-fontSize * 0.02}px)` }}>
          <Single {...{ text, fontFamily, fontSize, color, st: plain, width, height, palette }} />
        </div>
      </>
    );
  }
  return (
    <div style={{ position: "relative", width, height, isolation: "isolate" }}>
      {L.map(box)}
      {fold || <div style={{ position: "absolute", inset: 0, zIndex: 1 }}><Single {...{ text, fontFamily, fontSize, color, st: plain, width, height, palette }} /></div>}
    </div>
  );
}

/* ---------- text on a path: arc, wave, circle, spiral, ribbon ---------- */
function shapePath(type, P, w, h, fs) {
  const cx = w / 2, cy = h / 2;
  const k = (P.amount ?? 50) / 100;
  if (type === "arc") {
    const sag = k * (h - fs) * 0.5 * ((P.height ?? 100) / 100);
    const y = cy + sag / 2 + fs * 0.35;
    return { d: `M 0 ${y} Q ${cx} ${y - sag * 2} ${w} ${y}`, offset: P.pos ?? 50 };
  }
  if (type === "wave" || type === "ribbon") {
    const amp = k * Math.max(0, h - fs * (type === "ribbon" ? (P.band ?? 145) / 72 : 1.2)) * 0.45;
    const cycles = (P.waves ?? 13) / 10, ph = ((P.phase ?? 0) * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * w;
      pts.push(`${x.toFixed(1)} ${(cy + fs * (type === "ribbon" ? 0 : 0.35) + amp * Math.sin((i / 120) * Math.PI * 2 * cycles + ph)).toFixed(1)}`);
    }
    return { d: "M " + pts.join(" L "), offset: P.pos ?? 50 };
  }
  if (type === "circle") {
    const r = Math.max(10, ((Math.min(w, h) - fs * 1.3) / 2) * ((P.radius ?? 100) / 100));
    // outside: starts at the bottom going clockwise, so the middle of the text sits on top.
    // inside: starts at the top going counter-clockwise, so the text sits readable along the bottom.
    const inside = P.side === "in";
    const y0 = inside ? cy - r : cy + r, y1 = inside ? cy + r : cy - r, sweep = inside ? 0 : 1;
    const d = `M ${cx} ${y0} A ${r} ${r} 0 1 ${sweep} ${cx} ${y1} A ${r} ${r} 0 1 ${sweep} ${cx} ${y0}`;
    return { d, circ: 2 * Math.PI * r, share: (P.share ?? 50) / 100, rotate: P.start ?? 0, offset: 50 };
  }
  if (type === "spiral") {
    const turns = (P.turns ?? 20) / 10;
    const R = (Math.min(w, h) - fs) / 2;
    const inner = (P.inner ?? 22) / 100;
    const pts = [];
    for (let i = 0; i <= 300; i++) {
      const t = i / 300;
      const a = -Math.PI / 2 + t * turns * Math.PI * 2 * (P.dir === "ccw" ? -1 : 1);
      const r = R * (1 - (1 - inner) * t);
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return { d: "M " + pts.join(" L "), offset: 50 };
  }
  return { d: `M 0 ${cy} L ${w} ${cy}`, offset: 50 };
}

function PathText({ text, fontFamily, fontSize, color, st, width, height }) {
  useFontsReady();
  const [id] = useState(() => "st-" + ++uid);
  const pathRef = useRef(null);
  const textRef = useRef(null);
  const [fit, setFit] = useState(1);
  const P = shapeParams(st.shape);
  const type = st.shape.type;
  const fs = fontSize * fit;
  const geo = shapePath(type, P, width, height, fs);
  const line = text.replace(/\s*\n\s*/g, "  ");
  useLayoutEffect(() => {
    // shrink the text so it never runs past the end of the path
    const p = pathRef.current, t = textRef.current;
    if (!p || !t) return;
    const avail = (geo.circ ? geo.circ * geo.share : p.getTotalLength()) * 0.97;
    const used = t.getComputedTextLength() / fit;
    const next = used > avail ? avail / used : 1;
    if (Math.abs(next - fit) > 0.01) setFit(next);
  });
  const { paint, filter, gradient } = svgPaint(st.effect, color, fs, id + "-g");
  const deco = [st.underline !== "none" && "underline", st.strike && "line-through"].filter(Boolean).join(" ");
  const spread = geo.circ && fit === 1 ? { textLength: geo.circ * geo.share * 0.97, lengthAdjust: "spacing" } : {};
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible", filter }}>
      <defs>
        <path ref={pathRef} id={id} d={geo.d} fill="none" />
        {gradient ? (<linearGradient id={id + "-g"} x1="0" y1="0" x2="0" y2="1" gradientTransform={`rotate(${(gradient[2] ?? 180) - 180} 0.5 0.5)`}><stop offset="0" stopColor={gradient[0]} /><stop offset="1" stopColor={gradient[1]} /></linearGradient>) : null}
        <SvgExtras id={id} st={st} width={width} height={height} />
      </defs>
      <g transform={geo.rotate ? `rotate(${geo.rotate} ${width / 2} ${height / 2})` : undefined}>
      {type === "ribbon" ? <use href={`#${id}`} stroke={st.shape.color} strokeWidth={fs * (P.band ?? 145) / 100} fill="none" /> : null}
      <text ref={textRef} dominantBaseline={type === "ribbon" ? "central" : "auto"}
        style={{ fontFamily, fontSize: fs, fontWeight: wOf(st), fontStyle: st.italic ? "italic" : "normal", textDecoration: deco || "none", letterSpacing: st.tracking ? `${st.tracking / 1000}em` : undefined, ...paint }}>
        <textPath href={`#${id}`} startOffset={`${geo.offset ?? 50}%`} textAnchor="middle" {...spread}>{line}</textPath>
      </text>
      </g>
    </svg>
  );
}

/* ---------- warp: each letter scaled/moved ---------- */
function warpAt(type, k, u, P = {}) {
  const m = (P.center ?? 50) / 100;
  const d = u < m ? (u - m) / Math.max(m, 0.01) : (u - m) / Math.max(1 - m, 0.01);
  const c = 1 - d * d; // 0 at the edges, 1 at the chosen centre
  switch (type) {
    case "bulge": return { s: 1 + Math.abs(k) * 1.5 * c, dy: 0 };
    case "pinch": return { s: 1 - Math.abs(k) * 0.7 * c, dy: 0 };
    case "perspective": return { s: Math.max(0.15, 1 + k * 1.8 * (u - 0.5)), dy: 0 };
    case "flag": return { s: 1, dy: k * Math.sin(u * Math.PI * 2 * ((P.waves ?? 10) / 10) + ((P.phase ?? 0) * Math.PI) / 180) * 0.9 };
    case "archlines": return { s: 1, dy: -k * Math.sin(u * Math.PI) * 1.2 };
    default: return { s: 1, dy: 0 };
  }
}

function WarpText({ text, fontFamily, fontSize, color, st, width, height }) {
  useFontsReady();
  const [id] = useState(() => "st-" + ++uid);
  const P = shapeParams(st.shape);
  const k = (P.amount ?? 50) / 100;
  const type = st.shape.type;
  const vert = type === "perspective" && P.vertical === "v";
  const weight = wOf(st), fstyle = st.italic ? "italic" : "normal";
  const lines = text.split("\n");
  const font = (fs) => `${fstyle} ${weight} ${fs}px ${fontFamily}`;
  const grow = type === "bulge" ? 1 + Math.abs(k) * 1.0 : type === "perspective" ? 1 + Math.abs(k) * 0.7 : 1;
  const bend = type === "flag" ? Math.abs(k) * 1.8 : type === "archlines" ? Math.abs(k) * 1.2 : 0;
  const lh = (st.lineHeight || 1.1) * grow;
  const tr = (st.tracking || 0) / 1000;
  const widest = Math.max(...lines.map((l) => measure(l, font(fontSize)) + Array.from(l).length * tr * fontSize), 1);
  let fs = Math.min(fontSize, (fontSize * width * 0.98) / widest);
  fs = Math.min(fs, height / (lines.length * lh + bend));
  const lineH = fs * lh;
  const totalH = lines.length * lineH;
  const top = { top: 0, middle: (height - totalH) / 2, bottom: height - totalH }[st.alignV] + (type === "archlines" ? k * fs * 0.6 : 0);
  const { paint, filter, gradient } = svgPaint(st.effect, color, fs, id + "-g");
  const glyphs = [];
  const defs = <defs>{gradient ? (<linearGradient id={id + "-g"} x1="0" y1="0" x2="0" y2="1" gradientTransform={`rotate(${(gradient[2] ?? 180) - 180} 0.5 0.5)`}><stop offset="0" stopColor={gradient[0]} /><stop offset="1" stopColor={gradient[1]} /></linearGradient>) : null}<SvgExtras id={id} st={st} width={width} height={height} /></defs>;
  lines.forEach((ln, li) => {
    const lw = measure(ln, font(fs)) + Array.from(ln).length * tr * fs;
    let x = { left: 0, center: (width - lw) / 2, right: width - lw }[st.alignH];
    const cy = top + (li + 0.5) * lineH;
    for (const ch of Array.from(ln)) {
      const adv = measure(ch, font(fs)) + tr * fs;
      const u = vert ? Math.min(1, Math.max(0, (li + 0.5) / lines.length)) : Math.min(1, Math.max(0, (x + adv / 2) / width));
      const { s: s0, dy } = warpAt(type, k, u, P);
      const s = vert ? 1 : s0;
      const sx = vert ? s0 : 1;
      glyphs.push(
        <text key={glyphs.length} transform={`translate(${(x + adv / 2).toFixed(1)} ${(cy + dy * fs).toFixed(1)}) scale(${sx.toFixed(3)} ${(vert ? s0 : s).toFixed(3)})`}
          y={fs * 0.35} textAnchor="middle" style={{ fontFamily, fontSize: fs, fontWeight: weight, fontStyle: fstyle, ...paint }}>{ch}</text>
      );
      x += adv;
    }
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible", filter }}>
      {defs}
      {glyphs}
    </svg>
  );
}

/* ---------- word cloud ---------- */
function rand(seed) {
  let s = Math.abs(seed | 0) + 1;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/** Words in the cloud with a stable key (word + occurrence), used by the size list in the picker. */
/** Words in the cloud. With merge on (default), the same word written several times becomes ONE word
    with `count` = how many times it appears (ignores upper/lower case and , . ! ? : ; " at the ends).
    Sorted with the most frequent first; `index` is the rank, `max` the highest count. */
export function cloudWords(text = "", merge = true) {
  const raw = text.split(/\s+/).filter(Boolean);
  const clean = (w) => w.replace(/^[«»"'“”‘’(\[]+|[«»"'“”‘’)\],.!?:;…]+$/g, "") || w;
  if (!merge) {
    const seen = {};
    return raw.map((w, i) => {
      const n = (seen[w.toLowerCase()] = (seen[w.toLowerCase()] || 0) + 1);
      return { key: `${w.toLowerCase()}#${n}`, word: w, index: i, count: 1, max: 1 };
    });
  }
  const groups = new Map();
  raw.forEach((w, i) => {
    const c = clean(w), id = c.toLocaleLowerCase("nb");
    const g = groups.get(id) || groups.set(id, { key: `${id}#1`, first: i, count: 0, forms: {} }).get(id);
    g.count++;
    g.forms[c] = (g.forms[c] || 0) + 1; // "Tro", "tro" and "TRO" are the same word
  });
  // show the spelling used most often (on a tie: the first one written)
  for (const g of groups.values()) g.word = Object.entries(g.forms).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const list = [...groups.values()].sort((a, b) => b.count - a.count || a.first - b.first);
  const max = list[0]?.count || 1;
  return list.map((g, i) => ({ key: g.key, word: g.word, index: i, count: g.count, max }));
}
/** Settings for the word cloud (stored in shape.cloud). */
export const CLOUD_SETTINGS = [
  { k: "merge", navn: "Like ord", def: "on", choices: [["on", "Slå sammen (flere = større)"], ["off", "Hver for seg"]] },
  { k: "layout", navn: "Form på skyen", def: "oval", choices: [["oval", "Oval"], ["rect", "Firkant"], ["circle", "Sirkel"], ["heart", "Hjerte"]] },
  { k: "angles", navn: "Vinkler", def: "hv", choices: [["h", "Vannrett"], ["hv", "+ Loddrett"], ["diag", "+ Skrå"], ["free", "Fritt"]] },
  { k: "vertical", navn: "Andel ord med vinkel", def: 30, unit: "%" },
  { k: "contrast", navn: "Størrelsesforskjell", def: 50 },
  { k: "spacing", navn: "Avstand mellom ord", def: 10 },
  { k: "colors", navn: "Farger", def: "palette", choices: [["palette", "Palett"], ["alt", "To farger"], ["text", "Tekstfarge"]] },
  { k: "case", navn: "Bokstaver", def: "orig", choices: [["orig", "Som skrevet"], ["upper", "STORE"], ["lower", "små"]] },
];
export function cloudParams(shape = {}) {
  const P = {};
  for (const d of CLOUD_SETTINGS) P[d.k] = shape.cloud?.[d.k] ?? d.def;
  if (shape.cloud?.vertical == null && shape.amount != null) P.vertical = Math.abs(shape.amount); // older layers
  return P;
}
/** Colours used by the word cloud (custom ones from shape.cloud.palette, otherwise the app palette). */
export function cloudPalette(shape = {}, palette, color = "#ffffff") {
  const own = shape.cloud?.palette;
  if (own?.length) return own.length === 1 ? [own[0], own[0]] : own;
  const base = palette?.length ? palette : [color, "#f4b53f", "#5aa9f0", "#e04f9a", "#2ea8a0"];
  return base.length === 1 ? [base[0], base[0]] : base;
}
function inLayout(layout, x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  if (layout === "rect") return x >= 0 && y >= 0 && x <= w && y <= h;
  if (layout === "circle") { const r = Math.min(w, h) / 2; return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; }
  const u = (x - cx) / (w / 2), v = (y - cy) / (h / 2);
  if (layout === "heart") { const X = u * 1.18, Y = -v * 1.25 + 0.22; return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0; }
  return u * u + v * v <= 1; // oval
}

/** Size steps for the word cloud: 1 = smallest … 5 = largest. */
export const CLOUD_SIZES = [["Minst", 0.3], ["Liten", 0.45], ["Middels", 0.62], ["Stor", 0.85], ["Størst", 1.15]];

function CloudText({ text, fontFamily, fontSize, color, st, width, height, palette }) {
  const fontsReady = useFontsReady(fontFamily);
  const C = cloudParams(st.shape);
  const pal = cloudPalette(st.shape, palette, color);
  const colors = C.colors === "text" ? [color] : C.colors === "alt" ? pal.slice(0, 2) : pal;
  const share = C.vertical / 100;
  const weight = wOf(st);
  const words = useMemo(() => cloudWords(text, C.merge !== "off"), [text, C.merge]);
  const conf = st.shape.words || {}; // { [key]: { size: 1..5, rot: "h" | "v" } }
  // safety net: if the browser draws words wider than measured, measure again with a correction
  const [corr, setCorr] = useState(1);
  const boxRef = useRef(null);
  const mw = (w, size) => measure(w, `${weight} ${size}px ${fontFamily}`) * corr;
  const placed = useMemo(() => {
    const r = rand(st.shape.seed || 1);
    const out = [];
    const boxes = [];
    const hit = (b) => boxes.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const caseOf = (w) => (C.case === "upper" ? w.toLocaleUpperCase("nb") : C.case === "lower" ? w.toLocaleLowerCase("nb") : w);
    const k = C.contrast / 50; // 0 = all the same size, 1 = normal, 2 = strong difference
    let list = words.map((w) => {
      const c = conf[w.key] || {};
      // words used more often are bigger; when every word is used once, the first words are biggest
      const auto = w.max > 1
        ? 0.3 + 0.95 * Math.pow((w.count - 1) / (w.max - 1), 0.7) * (0.9 + r() * 0.1) + r() * 0.06
        : 0.3 + 0.9 * Math.pow(1 - w.index / Math.max(words.length, 1), 1.5) * (0.6 + r() * 0.4);
      const base = c.size ? CLOUD_SIZES[c.size - 1][1] : auto;
      const scale = Math.max(0.12, 0.62 + (base - 0.62) * k);
      const pick = r(), turn = r() < share;
      let ang = 0;
      if (c.rot === "v") ang = -90;
      else if (c.rot === "h") ang = 0;
      else if (turn && C.angles === "hv") ang = -90;
      else if (turn && C.angles === "diag") ang = [-90, -45, 45][Math.floor(pick * 3)];
      else if (turn && C.angles === "free") ang = Math.round(-90 + pick * 180);
      return { ...w, word: caseOf(w.word), size: fontSize * scale, ang, color: colors[w.index % colors.length] };
    });
    const bbox = (tw, size, ang) => {
      const h = size * 1.05, a = (ang * Math.PI) / 180;
      return [Math.abs(tw * Math.cos(a)) + Math.abs(h * Math.sin(a)), Math.abs(tw * Math.sin(a)) + Math.abs(h * Math.cos(a))];
    };
    // each word is capped so it fits inside the box on its own
    const room = C.layout === "rect" ? 0.95 : 0.8;
    const cap = (it) => {
      const [bw, bh] = bbox(mw(it.word, it.size), it.size, it.ang);
      return { ...it, size: it.size * Math.min(1, (width * room) / bw, (height * room) / bh) };
    };
    list = list.map(cap);
    // scale all words together so their total area matches the cloud: few words get bigger, many words get smaller
    const areaOf = (it) => { const [bw, bh] = bbox(mw(it.word, it.size), it.size, it.ang); const pd = it.size * (C.spacing / 100) * 1.2; return (bw + pd) * (bh + pd); };
    const fill = { rect: 0.6, oval: 0.48, circle: 0.42, heart: 0.36 }[C.layout] ?? 0.48;
    const total = list.reduce((sum, it) => sum + areaOf(it), 0);
    const dens = Math.max(0.2, Math.min(2, Math.sqrt((width * height * fill) / Math.max(1, total))));
    list = list.map((it) => cap({ ...it, size: it.size * dens })).sort((a, b) => b.size - a.size); // biggest first, in the middle
    const aspect = width / Math.max(1, height);
    for (const it of list) {
      let size = it.size;
      for (let attempt = 0; attempt < 16 && size > 7; attempt++, size *= 0.86) {
        const tw = mw(it.word, size);
        const [bw, bh] = bbox(tw, size, it.ang);
        const pad = size * (C.spacing / 100) * 0.6;
        let ok = null;
        for (let t = 0; t < 4000 && !ok; t++) {
          const a = t * 0.3, rr = t * 0.35;
          const b = { x: width / 2 + rr * Math.cos(a) * aspect - bw / 2, y: height / 2 + rr * Math.sin(a) - bh / 2, w: bw, h: bh };
          if (b.x < 0 || b.y < 0 || b.x + bw > width || b.y + bh > height) continue;
          if (!(inLayout(C.layout, b.x, b.y, width, height) && inLayout(C.layout, b.x + bw, b.y, width, height) &&
                inLayout(C.layout, b.x, b.y + bh, width, height) && inLayout(C.layout, b.x + bw, b.y + bh, width, height))) continue;
          const padded = { x: b.x - pad, y: b.y - pad, w: bw + 2 * pad, h: bh + 2 * pad };
          if (!hit(padded)) ok = b;
        }
        if (ok) { boxes.push({ x: ok.x - pad / 2, y: ok.y - pad / 2, w: bw + pad, h: bh + pad }); out.push({ ...it, w: it.word, size, box: ok, tw }); break; }
      }
    }
    return out;
  }, [words, JSON.stringify(conf), JSON.stringify(C), fontSize, fontFamily, weight, width, height, st.shape.seed, colors.join(), fontsReady, curStretch, corr]);
  useLayoutEffect(() => {
    const spans = boxRef.current?.querySelectorAll("[data-tw]") || [];
    let worst = 1;
    spans.forEach((el) => { worst = Math.max(worst, el.offsetWidth / (+el.dataset.tw || el.offsetWidth)); });
    if (worst > 1.02 && corr < 3) setCorr((c) => c * worst * 1.01);
  }, [placed]);
  useEffect(() => setCorr(1), [fontFamily, curStretch, fontsReady]);
  const fx = effectCss(st.effect);
  return (
    <div ref={boxRef} style={{ position: "relative", width, height }}>
      {placed.map((p, i) => (
        <span key={i} style={{
          position: "absolute", left: p.box.x, top: p.box.y, width: p.box.w, height: p.box.h,
          fontFamily, fontSize: p.size, fontWeight: weight, fontStyle: st.italic ? "italic" : "normal", lineHeight: 1, color: p.color, whiteSpace: "nowrap", ...fx,
        }}>
          <span data-tw={p.tw} style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%)${p.ang ? ` rotate(${p.ang}deg)` : ""}` }}>{p.w}</span>
        </span>
      ))}
    </div>
  );
}

function SvgExtras({ id, st, width, height }) {
  const fx = st.effect;
  return (
    <>
      {fx.type === "imagefill" && fx.image ? (
        <pattern id={id + "-g-img"} patternUnits="userSpaceOnUse" width={width} height={height}>
          <image href={fx.image} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
        </pattern>
      ) : null}
      {FILTER_FX.includes(fx.type) ? <FxFilter id={id + "-g-fx"} effect={fx} /> : null}
    </>
  );
}

/* ---------- Mønster: the text repeated over the whole box, waving ---------- */
function PatternText({ text, fontFamily, fontSize, color, st, width, height }) {
  useFontsReady();
  const [id] = useState(() => "st-" + ++uid);
  const P = shapeParams(st.shape);
  const k = (P.amount ?? 60) / 100;
  const weight = wOf(st), fstyle = st.italic ? "italic" : "normal";
  const fs = Math.max(8, fontSize * (P.size / 100));
  const font = `${fstyle} ${weight} ${fs}px ${fontFamily}`;
  const unit = text.replace(/\s+/g, " ").trim() + "  ";
  const uw = Math.max(measure(unit, font), 1);
  const lhp = P.rowgap / 100;
  const tr = (st.tracking || 0) / 1000;
  const rows = Math.ceil(height / (fs * lhp)) + 2;
  const { paint, filter, gradient } = svgPaint(st.effect, color, fs, id + "-g");
  const glyphs = [];
  for (let r = -1; r < rows; r++) {
    const base = r * fs * lhp;
    let x = -((r * uw * (P.shift / 100)) % uw) - uw;
    const chars = Array.from(unit.repeat(Math.ceil((width + 2 * uw) / uw) + 1));
    for (const ch of chars) {
      const adv = measure(ch, font) + tr * fs;
      if (x > width + adv) break;
      if (x + adv > -adv) {
        const u = x / width;
        const wv = P.waves / 10;
        const ph = u * Math.PI * 2 * wv + r * 0.32;
        const dy = Math.sin(ph) * k * fs * 2.2;
        const slope = Math.cos(ph) * k * fs * 2.2 * ((Math.PI * 2 * wv) / width);
        const rot = (Math.atan(slope) * 180) / Math.PI;
        const sc = Math.max(0.25, 1 + Math.cos(ph + r * 0.2) * k * 0.75);
        if (ch.trim()) glyphs.push(
          <text key={glyphs.length} transform={`translate(${(x + adv / 2).toFixed(1)} ${(base + dy).toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${sc.toFixed(3)})`}
            y={fs * 0.35} textAnchor="middle" style={{ fontFamily, fontSize: fs, fontWeight: weight, fontStyle: fstyle, ...paint }}>{ch}</text>
        );
      }
      x += adv;
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "hidden", filter }}>
      <defs>{gradient ? (<linearGradient id={id + "-g"} x1="0" y1="0" x2="0" y2="1" gradientTransform={`rotate(${(gradient[2] ?? 180) - 180} 0.5 0.5)`}><stop offset="0" stopColor={gradient[0]} /><stop offset="1" stopColor={gradient[1]} /></linearGradient>) : null}<SvgExtras id={id} st={st} width={width} height={height} /></defs>
      {glyphs}
    </svg>
  );
}
