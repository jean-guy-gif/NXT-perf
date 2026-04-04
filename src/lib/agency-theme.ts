// agency-theme.ts — Extract dominant colors from logo & inject CSS custom properties
import { getColor, getPalette } from "colorthief";

const DEFAULT_PRIMARY = "#6C5CE7";
const DEFAULT_SECONDARY = "#4A3FB5";
const DEFAULT_DARK = "#1A1A2E";

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

/** HSL saturation for a given RGB */
function saturation(r: number, g: number, b: number): number {
  const [, s] = rgbToHsl(r, g, b);
  return s;
}

/** HSL lightness for a given RGB */
function lightness(r: number, g: number, b: number): number {
  const [, , l] = rgbToHsl(r, g, b);
  return l;
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
}

// ── Derive theme from a palette of 2 colors ──────────────────

function deriveThemeFromPalette(
  colors: { rgb: () => { r: number; g: number; b: number } }[]
): AgencyThemeColors {
  // Get RGB values from each color
  const rgbs = colors.map(c => {
    const { r, g, b } = c.rgb();
    return { r, g, b };
  });

  // Sort by saturation descending → most colorful first
  const bySaturation = [...rgbs].sort(
    (a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b)
  );
  // Sort by lightness ascending → darkest first
  const byDarkness = [...rgbs].sort(
    (a, b) => lightness(a.r, a.g, a.b) - lightness(b.r, b.g, b.b)
  );

  // Primary = most saturated (with WCAG contrast fix)
  const primaryRgb = bySaturation[0];
  const contrastFixed = ensureContrast(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const primary = contrastFixed
    ? rgbToHex(...contrastFixed)
    : DEFAULT_PRIMARY;

  // Secondary = hue rotation +30° on primary
  const [pr, pg, pb] = contrastFixed ?? [108, 92, 231]; // fallback to default
  const [sh, ss, sl] = rgbToHsl(pr, pg, pb);
  const [sr, sg, sb] = hslToRgb((sh + 30) % 360, ss, sl);
  const secondary = rgbToHex(sr, sg, sb);

  // Dark = darkest color from palette, ensure it's genuinely dark
  const darkRgb = byDarkness[0];
  let darkL = lightness(darkRgb.r, darkRgb.g, darkRgb.b);
  let [dh, ds] = rgbToHsl(darkRgb.r, darkRgb.g, darkRgb.b);
  // If not dark enough (L > 0.25), force it darker
  if (darkL > 0.25) darkL = 0.12;
  const [dr, dg, db] = hslToRgb(dh, Math.min(ds, 0.3), darkL);
  const dark = rgbToHex(dr, dg, db);

  console.log("[agency-theme] Palette:", { primary, secondary, dark, sourceColors: rgbs });
  return { primary, secondary, dark };
}

// ── Derive from single color (legacy compat) ─────────────────

function deriveThemeColors(
  color: { rgb: () => { r: number; g: number; b: number } }
): AgencyThemeColors {
  const { r, g, b } = color.rgb();
  const contrastFixed = ensureContrast(r, g, b);

  if (!contrastFixed) {
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, dark: DEFAULT_DARK };
  }

  const primary = rgbToHex(...contrastFixed);
  const [sh, ss, sl] = rgbToHsl(...contrastFixed);
  const [sr, sg, sb] = hslToRgb((sh + 30) % 360, ss, sl);
  const secondary = rgbToHex(sr, sg, sb);

  // Derive dark from primary hue at low lightness
  const [dr, dg, db] = hslToRgb(sh, Math.min(ss, 0.3), 0.12);
  const dark = rgbToHex(dr, dg, db);

  return { primary, secondary, dark };
}

// ── Extract colors from URL (may fail due to CORS) ───────────

export async function extractAgencyColors(
  imageUrl: string
): Promise<AgencyThemeColors> {
  try {
    const color = await getColor(imageUrl);
    if (!color) return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, dark: DEFAULT_DARK };
    return deriveThemeColors(color);
  } catch (err) {
    console.error("[agency-theme] Color extraction from URL failed:", err);
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, dark: DEFAULT_DARK };
  }
}

// ── Extract colors from Blob (no CORS — local data) ──────────

export async function extractAgencyColorsFromBlob(
  blob: Blob
): Promise<AgencyThemeColors> {
  try {
    const bitmap = await createImageBitmap(blob);

    // Try getPalette with 2 colors for richer extraction
    const palette = await getPalette(bitmap, { colorCount: 2 });
    if (palette && palette.length >= 2) {
      bitmap.close();
      return deriveThemeFromPalette(palette);
    }

    // Fallback to single color
    const color = await getColor(bitmap);
    bitmap.close();
    if (!color) return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, dark: DEFAULT_DARK };
    return deriveThemeColors(color);
  } catch (err) {
    console.error("[agency-theme] Color extraction from Blob failed:", err);
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, dark: DEFAULT_DARK };
  }
}

// ── Apply / Reset theme ────────────────────────────────────────

export function applyAgencyTheme(primary: string, secondary: string, dark?: string): void {
  const root = document.documentElement.style;
  root.setProperty("--agency-primary", primary);
  root.setProperty("--agency-secondary", secondary);
  root.setProperty("--agency-dark", dark || DEFAULT_DARK);
}

export function resetToDefaultTheme(): void {
  const root = document.documentElement.style;
  root.setProperty("--agency-primary", DEFAULT_PRIMARY);
  root.setProperty("--agency-secondary", DEFAULT_SECONDARY);
  root.setProperty("--agency-dark", DEFAULT_DARK);
}
