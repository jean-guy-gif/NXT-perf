// agency-theme.ts — Extract dominant colors from logo & inject CSS custom properties
import { getColor, getPalette } from "colorthief";

const DEFAULT_PRIMARY = "#6C5CE7";
const DEFAULT_SECONDARY = "#4A3FB5";
const DEFAULT_DARK = "#1A1A2E";
const DEFAULT_LIGHT = "#EDE9FF";

// ── Color helpers ──────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

/** Relative luminance (WCAG 2.1) */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Contrast ratio against white (luminance 1.0) */
function contrastOnWhite(r: number, g: number, b: number): number {
  const lum = luminance(r, g, b);
  return (1.0 + 0.05) / (lum + 0.05);
}

function saturation(r: number, g: number, b: number): number {
  const [, s] = rgbToHsl(r, g, b);
  return s;
}

function lightness(r: number, g: number, b: number): number {
  const [, , l] = rgbToHsl(r, g, b);
  return l;
}

/** Filter out near-white, near-black, and low-saturation background noise */
function isUsableColor(r: number, g: number, b: number): boolean {
  const s = saturation(r, g, b);
  const l = lightness(r, g, b);
  // Reject near-white (L > 0.93), near-black (L < 0.05), and desaturated grays (S < 0.06 && L > 0.2)
  if (l > 0.93) return false;
  if (l < 0.05) return false;
  if (s < 0.06 && l > 0.2 && l < 0.8) return false;
  return true;
}

/** Ensure WCAG AA contrast, darken if needed */
function ensureContrast(r: number, g: number, b: number): [number, number, number] | null {
  let [h, s, l] = rgbToHsl(r, g, b);
  let [fr, fg, fb] = [r, g, b];

  if (contrastOnWhite(fr, fg, fb) < 4.5) {
    for (let step = 0; step < 10; step++) {
      l = Math.max(0, l - 0.10);
      [fr, fg, fb] = hslToRgb(h, s, l);
      if (contrastOnWhite(fr, fg, fb) >= 4.5) break;
    }
  }

  return contrastOnWhite(fr, fg, fb) >= 4.5 ? [fr, fg, fb] : null;
}

// ── Theme result type ─────────────────────────────────────────

export interface AgencyThemeColors {
  primary: string;
  secondary: string;
  dark: string;
  light: string;
}

const DEFAULTS: AgencyThemeColors = {
  primary: DEFAULT_PRIMARY,
  secondary: DEFAULT_SECONDARY,
  dark: DEFAULT_DARK,
  light: DEFAULT_LIGHT,
};

// ── Helper: RGB tuple type ────────────────────────────────────

type Rgb = { r: number; g: number; b: number };

// ── Derive theme from a palette of N colors ─────────────────

function deriveThemeFromPalette(
  colors: { rgb: () => Rgb }[]
): AgencyThemeColors {
  const rgbs = colors.map(c => c.rgb());

  // Filter out background noise (near-white, near-black, desaturated grays)
  const usable = rgbs.filter(c => isUsableColor(c.r, c.g, c.b));

  // If nothing usable, fall back to single-color path on the most saturated raw
  if (usable.length === 0) {
    const best = [...rgbs].sort((a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b))[0];
    if (!best) return DEFAULTS;
    const fixed = ensureContrast(best.r, best.g, best.b);
    if (!fixed) return DEFAULTS;
    const p = rgbToHex(...fixed);
    const [h, s, l] = rgbToHsl(...fixed);
    const [sr, sg, sb] = hslToRgb(h, s, Math.max(0, l - 0.15));
    const [dr, dg, db] = hslToRgb(h, Math.min(s, 0.35), 0.12);
    const [lr, lg, lb] = hslToRgb(h, Math.min(s, 0.25), 0.90);
    return { primary: p, secondary: rgbToHex(sr, sg, sb), dark: rgbToHex(dr, dg, db), light: rgbToHex(lr, lg, lb) };
  }

  // ── Fix 1: primary = most saturated usable color ──
  const bySat = [...usable].sort((a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b));
  const primaryRaw = bySat[0];
  const contrastFixed = ensureContrast(primaryRaw.r, primaryRaw.g, primaryRaw.b);
  const primary = contrastFixed ? rgbToHex(...contrastFixed) : DEFAULT_PRIMARY;
  const [ph, ps, pl] = contrastFixed ? rgbToHsl(...contrastFixed) : rgbToHsl(primaryRaw.r, primaryRaw.g, primaryRaw.b);

  // ── Fix 3: secondary = 2nd most saturated usable color if distinct ──
  let secondary: string;
  if (bySat.length >= 2) {
    const secRaw = bySat[1];
    const secFixed = ensureContrast(secRaw.r, secRaw.g, secRaw.b);
    secondary = secFixed ? rgbToHex(...secFixed) : rgbToHex(secRaw.r, secRaw.g, secRaw.b);
  } else {
    // Only one usable color — darken primary for secondary
    const [sr, sg, sb] = hslToRgb(ph, ps, Math.max(0, pl - 0.15));
    secondary = rgbToHex(sr, sg, sb);
  }

  // ── Dark = darkest from ALL palette colors (including filtered ones) ──
  const byLight = [...rgbs].sort((a, b) => lightness(a.r, a.g, a.b) - lightness(b.r, b.g, b.b));
  const darkRaw = byLight[0];
  let darkL = lightness(darkRaw.r, darkRaw.g, darkRaw.b);
  const [dh, ds] = rgbToHsl(darkRaw.r, darkRaw.g, darkRaw.b);
  if (darkL > 0.15) darkL = 0.12;
  const [dr, dg, db] = hslToRgb(dh, Math.min(ds, 0.35), darkL);
  const dark = rgbToHex(dr, dg, db);

  // ── Fix 2: light = lightest usable color, sanitized ──
  const lightCandidates = [...rgbs].sort((a, b) => lightness(b.r, b.g, b.b) - lightness(a.r, a.g, a.b));
  const lightRaw = lightCandidates[0];
  const ll = lightness(lightRaw.r, lightRaw.g, lightRaw.b);
  const ls = saturation(lightRaw.r, lightRaw.g, lightRaw.b);
  let light: string;
  if (ll > 0.92 || ls < 0.05) {
    // Too close to white or desaturated → derive tinted off-white from primary hue
    const [lr, lg, lb] = hslToRgb(ph, Math.max(ps * 0.4, 0.15), 0.90);
    light = rgbToHex(lr, lg, lb);
  } else if (ll < 0.75) {
    // "Lightest" is still quite dark → brighten it
    const [lh] = rgbToHsl(lightRaw.r, lightRaw.g, lightRaw.b);
    const [lr, lg, lb] = hslToRgb(lh, Math.min(ls, 0.30), 0.85);
    light = rgbToHex(lr, lg, lb);
  } else {
    light = rgbToHex(lightRaw.r, lightRaw.g, lightRaw.b);
  }

  if (process.env.NODE_ENV === "development") console.log("[agency-theme] Palette:", { primary, secondary, dark, light, usable: usable.length, sourceColors: rgbs });
  return { primary, secondary, dark, light };
}

// ── Derive from single color (legacy compat) ─────────────────

function deriveThemeColors(
  color: { rgb: () => Rgb }
): AgencyThemeColors {
  const { r, g, b } = color.rgb();
  const contrastFixed = ensureContrast(r, g, b);

  if (!contrastFixed) return DEFAULTS;

  const primary = rgbToHex(...contrastFixed);
  const [sh, ss, sl] = rgbToHsl(...contrastFixed);
  const [sr, sg, sb] = hslToRgb((sh + 30) % 360, ss, sl);
  const secondary = rgbToHex(sr, sg, sb);

  // Derive dark from primary hue at low lightness
  const [dr, dg, db] = hslToRgb(sh, Math.min(ss, 0.3), 0.12);
  const dark = rgbToHex(dr, dg, db);

  // Derive light from primary hue at high lightness
  const [lr, lg, lb] = hslToRgb(sh, Math.min(ss, 0.25), 0.85);
  const light = rgbToHex(lr, lg, lb);

  return { primary, secondary, dark, light };
}

// ── Extract colors from URL (may fail due to CORS) ───────────

export async function extractAgencyColors(
  imageUrl: string
): Promise<AgencyThemeColors> {
  try {
    const color = await getColor(imageUrl);
    if (!color) return DEFAULTS;
    return deriveThemeColors(color);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("[agency-theme] Color extraction from URL failed:", err);
    return DEFAULTS;
  }
}

// ── Extract colors from Blob (no CORS — local data) ──────────

export async function extractAgencyColorsFromBlob(
  blob: Blob
): Promise<AgencyThemeColors> {
  try {
    const bitmap = await createImageBitmap(blob);

    // Extract 3 colors for dark/primary/light classification
    const palette = await getPalette(bitmap, { colorCount: 5 });
    if (palette && palette.length >= 2) {
      bitmap.close();
      return deriveThemeFromPalette(palette);
    }

    // Fallback to single color
    const color = await getColor(bitmap);
    bitmap.close();
    if (!color) return DEFAULTS;
    return deriveThemeColors(color);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("[agency-theme] Color extraction from Blob failed:", err);
    return DEFAULTS;
  }
}

// ── Apply / Reset theme ────────────────────────────────────────

export function applyAgencyTheme(primary: string, secondary: string, dark?: string, light?: string): void {
  const root = document.documentElement;
  const darkValue = dark || DEFAULT_DARK;
  const lightValue = light || DEFAULT_LIGHT;
  root.style.setProperty("--agency-primary", primary);
  root.style.setProperty("--agency-secondary", secondary);
  root.style.setProperty("--agency-dark", darkValue);
  root.style.setProperty("--agency-light", lightValue);

  // In dark mode, override --background for full-screen dark tone
  if (root.classList.contains("dark")) {
    root.style.setProperty("--background", darkValue);
  }
}

export function resetToDefaultTheme(): void {
  const root = document.documentElement;
  root.style.setProperty("--agency-primary", DEFAULT_PRIMARY);
  root.style.setProperty("--agency-secondary", DEFAULT_SECONDARY);
  root.style.setProperty("--agency-dark", DEFAULT_DARK);
  root.style.setProperty("--agency-light", DEFAULT_LIGHT);

  // Reset --background to CSS default
  root.style.removeProperty("--background");
}
