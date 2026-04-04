// agency-theme.ts — Extract dominant color from logo & inject CSS custom properties
import { getColor } from "colorthief";

const DEFAULT_PRIMARY = "#6C5CE7";
const DEFAULT_SECONDARY = "#4A3FB5";

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

/** Contrast ratio between two colors (against white = luminance 1.0) */
function contrastOnWhite(r: number, g: number, b: number): number {
  const lum = luminance(r, g, b);
  return (1.0 + 0.05) / (lum + 0.05);
}

// ── Shared color derivation from a colorthief Color ───────────

function deriveThemeColors(color: { rgb: () => { r: number; g: number; b: number } }): { primary: string; secondary: string } {
  const { r, g, b } = color.rgb();

  // Ensure WCAG AA contrast on white (≥ 4.5:1)
  let [h, s, l] = rgbToHsl(r, g, b);
  let [fr, fg, fb] = [r, g, b];

  if (contrastOnWhite(fr, fg, fb) < 4.5) {
    for (let step = 0; step < 10; step++) {
      l = Math.max(0, l - 0.10);
      [fr, fg, fb] = hslToRgb(h, s, l);
      if (contrastOnWhite(fr, fg, fb) >= 4.5) break;
    }
  }

  if (contrastOnWhite(fr, fg, fb) < 4.5) {
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
  }

  const primary = rgbToHex(fr, fg, fb);

  const [sh, ss, sl] = rgbToHsl(fr, fg, fb);
  const [sr, sg, sb] = hslToRgb((sh + 30) % 360, ss, sl);
  const secondary = rgbToHex(sr, sg, sb);

  console.log("[agency-theme] Extracted:", { primary, secondary, sourceRgb: { r, g, b } });
  return { primary, secondary };
}

// ── Extract colors from URL (may fail due to CORS) ───────────

export async function extractAgencyColors(
  imageUrl: string
): Promise<{ primary: string; secondary: string }> {
  try {
    const color = await getColor(imageUrl);
    if (!color) return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
    return deriveThemeColors(color);
  } catch (err) {
    console.error("[agency-theme] Color extraction from URL failed:", err);
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
  }
}

// ── Extract colors from Blob (no CORS — local data) ──────────

export async function extractAgencyColorsFromBlob(
  blob: Blob
): Promise<{ primary: string; secondary: string }> {
  try {
    const bitmap = await createImageBitmap(blob);
    const color = await getColor(bitmap);
    bitmap.close();
    if (!color) return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
    return deriveThemeColors(color);
  } catch (err) {
    console.error("[agency-theme] Color extraction from Blob failed:", err);
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
  }
}

// ── Apply / Reset theme ────────────────────────────────────────

export function applyAgencyTheme(primary: string, secondary: string): void {
  document.documentElement.style.setProperty("--agency-primary", primary);
  document.documentElement.style.setProperty("--agency-secondary", secondary);
}

export function resetToDefaultTheme(): void {
  document.documentElement.style.setProperty("--agency-primary", DEFAULT_PRIMARY);
  document.documentElement.style.setProperty("--agency-secondary", DEFAULT_SECONDARY);
}
