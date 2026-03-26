import { jsPDF } from "jspdf";
import type { DPIScores, DPIAxisScore } from "./dpi-scoring";
import { computeDPIProjections } from "./dpi-projections";
import type { DPIAxis } from "./dpi-axes";

// ── Dark NXT palette ──
const C = {
  bg:      [10, 12, 30] as [number, number, number],
  card:    [18, 22, 48] as [number, number, number],
  card2:   [24, 30, 62] as [number, number, number],
  border:  [40, 50, 90] as [number, number, number],
  primary: [51, 117, 255] as [number, number, number],
  violet:  [140, 85, 255] as [number, number, number],
  green:   [57, 201, 126] as [number, number, number],
  orange:  [255, 164, 72] as [number, number, number],
  red:     [239, 117, 80] as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
  gray:    [140, 155, 190] as [number, number, number],
  lgray:   [190, 200, 225] as [number, number, number],
};

function scoreColor(score: number): [number, number, number] {
  if (score >= 70) return C.green;
  if (score >= 50) return C.orange;
  return C.red;
}

function drawProgressBar(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  value: number, color: [number, number, number]
) {
  doc.setFillColor(30, 35, 65);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  const filled = Math.max(h, (Math.min(value, 100) / 100) * w);
  doc.setFillColor(...color);
  doc.roundedRect(x, y, filled, h, h / 2, h / 2, "F");
}

const SHORT: Record<string, string> = {
  "Intensité Commerciale":     "Intensité",
  "Génération d'Opportunités": "Opportunités",
  "Solidité du Portefeuille":  "Portefeuille",
  "Maîtrise des Ratios":      "Ratios",
  "Valorisation Économique":   "Valorisation",
  "Pilotage Stratégique":      "Pilotage",
  "Intensité commerciale":     "Intensité",
  "Génération d'opportunités": "Opportunités",
  "Solidité du portefeuille":  "Portefeuille",
  "Maîtrise des ratios":      "Ratios",
  "Valorisation économique":   "Valorisation",
  "Pilotage stratégique":      "Pilotage",
};

function drawRadarDark(
  doc: jsPDF, cx: number, cy: number, R: number,
  axes: DPIAxisScore[]
) {
  const n = axes.length;
  function pt(idx: number, val: number) {
    const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
    const r = (val / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  }

  // Grid
  for (const level of [20, 40, 60, 80, 100]) {
    const pts = Array.from({ length: n }, (_, i) => pt(i, level));
    doc.setDrawColor(level === 100 ? 55 : 35, level === 100 ? 68 : 45, level === 100 ? 115 : 80);
    doc.setLineWidth(level === 100 ? 0.4 : 0.15);
    for (let i = 0; i < n; i++) {
      const next = pts[(i + 1) % n];
      doc.line(pts[i][0], pts[i][1], next[0], next[1]);
    }
  }

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const outer = pt(i, 100);
    doc.setDrawColor(40, 52, 95);
    doc.setLineWidth(0.15);
    doc.line(cx, cy, outer[0], outer[1]);

    const lp = pt(i, 122);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray);
    doc.setFont("helvetica", "normal");
    doc.text(SHORT[axes[i].label] ?? axes[i].label, lp[0], lp[1] + 1, { align: "center" });
  }

  // Potential polygon (violet)
  const potPts = axes.map((a, i) => pt(i, a.potential));
  doc.setDrawColor(...C.violet);
  doc.setLineWidth(0.8);
  for (let i = 0; i < n; i++) {
    const next = potPts[(i + 1) % n];
    doc.line(potPts[i][0], potPts[i][1], next[0], next[1]);
  }

  // Fill current polygon using doc.lines
  const actPts = axes.map((a, i) => pt(i, a.score));
  doc.setFillColor(51, 117, 255);
  const lines: [number, number][] = [];
  for (let i = 1; i < actPts.length; i++) {
    lines.push([actPts[i][0] - actPts[i - 1][0], actPts[i][1] - actPts[i - 1][1]]);
  }
  lines.push([actPts[0][0] - actPts[actPts.length - 1][0], actPts[0][1] - actPts[actPts.length - 1][1]]);
  doc.setDrawColor(51, 117, 255);
  doc.setLineWidth(0.1);
  doc.lines(lines, actPts[0][0], actPts[0][1], [1, 1], "F");

  // Current stroke
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1.5);
  for (let i = 0; i < n; i++) {
    const next = actPts[(i + 1) % n];
    doc.line(actPts[i][0], actPts[i][1], next[0], next[1]);
  }
  // Vertex dots
  for (const p of actPts) {
    doc.setFillColor(...C.primary);
    doc.circle(p[0], p[1], 1.8, "F");
    doc.setDrawColor(...C.white);
    doc.setLineWidth(0.3);
    doc.circle(p[0], p[1], 2.2, "S");
  }
}

function drawGradientBar(doc: jsPDF, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < w; i++) {
    const t = i / w;
    doc.setFillColor(
      Math.round(51 + (140 - 51) * t),
      Math.round(117 + (85 - 117) * t),
      255
    );
    doc.rect(x + i, y, 1.1, h, "F");
  }
}

// ══════════════════════════════════════════════════════════════
function buildPage1(doc: jsPDF, scores: DPIScores, email: string): void {
  const W = 210, H = 297;

  // Background
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, "F");

  // Header gradient
  drawGradientBar(doc, 0, 0, W, 28);

  // Logo
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("NXT", 14, 13);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text("Performance", 14, 19);

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Diagnostic de Performance Immobilière", W / 2, 13, { align: "center" });

  // Email + date
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 255);
  doc.text(email, W - 14, 13, { align: "right" });
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), W - 14, 19, { align: "right" });

  // ── 3 Score badges ──
  const badgeY = 52;

  // Score Actuel
  const sc = scoreColor(scores.globalScore);
  doc.setFillColor(...sc);
  doc.circle(52, badgeY, 20, "F");
  doc.setFillColor(...C.card);
  doc.circle(52, badgeY, 16, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sc);
  doc.text(String(scores.globalScore), 52, badgeY + 3, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...C.gray);
  doc.text("/100", 52, badgeY + 9, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...sc);
  doc.text("Score Actuel", 52, badgeY + 18, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...C.gray);
  doc.text(scores.level, 52, badgeY + 23, { align: "center" });

  // Potentiel
  doc.setFillColor(...C.violet);
  doc.circle(W / 2, badgeY, 20, "F");
  doc.setFillColor(...C.card);
  doc.circle(W / 2, badgeY, 16, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.violet);
  doc.text(String(scores.potentialScore), W / 2, badgeY + 3, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...C.gray);
  doc.text("/100", W / 2, badgeY + 9, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...C.violet);
  doc.text("Potentiel", W / 2, badgeY + 18, { align: "center" });
  const delta = scores.potentialScore - scores.globalScore;
  doc.setFontSize(6);
  doc.setTextColor(...C.green);
  doc.text(`+${delta > 0 ? delta : 0} pts`, W / 2, badgeY + 23, { align: "center" });

  // Top %
  const topPct = scores.topPercentage ?? Math.min(99, Math.max(1, 100 - scores.globalScore));
  doc.setFillColor(...C.orange);
  doc.circle(158, badgeY, 20, "F");
  doc.setFillColor(...C.card);
  doc.circle(158, badgeY, 16, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.orange);
  doc.text(`${topPct}%`, 158, badgeY + 2, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(...C.gray);
  doc.text("Top France", 158, badgeY + 8, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...C.orange);
  doc.text("Classement", 158, badgeY + 18, { align: "center" });

  // Separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, 82, W - 14, 82);

  // ── Radar ──
  drawRadarDark(doc, W / 2, 142, 48, scores.axes);

  // Legend
  const legY = 198;
  const legItems: Array<{ color: [number, number, number]; label: string }> = [
    { color: C.primary, label: "Score actuel" },
    { color: C.violet, label: "Potentiel" },
  ];
  legItems.forEach((item, i) => {
    const lx = 60 + i * 50;
    doc.setFillColor(...item.color);
    doc.circle(lx, legY, 2, "F");
    doc.setTextColor(...C.gray);
    doc.setFontSize(7);
    doc.text(item.label, lx + 5, legY + 1);
  });

  // ── CA estimation box ──
  if (scores.estimatedCAGain.max > 0) {
    const caY = 208;
    doc.setFillColor(...C.card);
    doc.roundedRect(14, caY, W - 28, 22, 3, 3, "F");
    doc.setFillColor(...C.green);
    doc.roundedRect(14, caY, 4, 22, 2, 2, "F");
    doc.rect(16, caY, 2, 22, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text("Estimation CA additionnel", 24, caY + 8);
    doc.setFontSize(12);
    doc.setTextColor(...C.green);
    const caMin = Math.round(scores.estimatedCAGain.min).toLocaleString("fr-FR");
    const caMax = Math.round(scores.estimatedCAGain.max).toLocaleString("fr-FR");
    doc.text(`${caMin} \u20AC — ${caMax} \u20AC`, 24, caY + 17);
  }

  // Percentile
  if (scores.percentileLabel) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.primary);
    doc.text(scores.percentileLabel, W / 2, 240, { align: "center" });
    if (scores.percentileRegion) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.gray);
      doc.text(scores.percentileRegion, W / 2, 246, { align: "center" });
    }
  }

  // Footer
  doc.setFillColor(8, 10, 25);
  doc.rect(0, H - 18, W, 18, "F");
  drawGradientBar(doc, 0, H - 18, W, 0.8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("nxt-performance.com", W / 2, H - 8, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 100);
  doc.text("© 2026 NXT Performance — Document confidentiel", W / 2, H - 3, { align: "center" });
}

// ══════════════════════════════════════════════════════════════
function buildPage2(doc: jsPDF, scores: DPIScores): void {
  const W = 210, H = 297;

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, "F");

  // Mini header
  doc.setFillColor(...C.card);
  doc.rect(0, 0, W, 14, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray);
  doc.text("NXT Performance — Analyse détaillée", 14, 9);
  doc.text("2 / 2", W - 14, 9, { align: "right" });

  let y = 22;

  // ── SECTION 1 : 6 Axes ──
  doc.setFillColor(...C.primary);
  doc.roundedRect(14, y, 3, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Vos 6 axes de performance", 21, y + 6);
  y += 12;

  const sortedAxes = [...scores.axes].sort((a, b) => a.score - b.score);
  for (let idx = 0; idx < sortedAxes.length; idx++) {
    const axis = sortedAxes[idx];
    const color = scoreColor(axis.score);
    if (idx % 2 === 0) {
      doc.setFillColor(16, 20, 45);
      doc.roundedRect(14, y - 2, W - 28, 14, 2, 2, "F");
    }
    // Score badge
    doc.setFillColor(...color);
    doc.roundedRect(17, y, 18, 8, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.bg);
    doc.text(String(axis.score), 26, y + 5.5, { align: "center" });
    // Label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.white);
    doc.text(axis.label, 39, y + 5.5);
    // Progress bar
    drawProgressBar(doc, 105, y + 1.5, 58, 5, axis.score, color);
    // Delta
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(`+${axis.potential - axis.score}`, 167, y + 5.5);
    // Performance label
    const perfLabel = axis.score >= 70 ? "Solide" : axis.score >= 50 ? "À renforcer" : "Prioritaire";
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray);
    doc.text(perfLabel, W - 16, y + 5.5, { align: "right" });
    y += 14;
  }
  y += 4;

  // Separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  y += 6;

  // ── SECTION 2 : 3 Paliers ──
  doc.setFillColor(...C.violet);
  doc.roundedRect(14, y, 3, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Votre plan de progression", 21, y + 6);
  y += 12;

  const dpiAxes: DPIAxis[] = scores.axes.map((a) => ({ id: a.id, label: a.label, score: a.score }));
  const projections = computeDPIProjections(dpiAxes, scores.caBase ?? 175000);
  const cardW = (W - 28 - 6) / 3;
  const cardH = 48;
  const palierColors: [number, number, number][] = [C.primary, [99, 102, 241], C.violet];

  for (let i = 0; i < projections.length; i++) {
    const proj = projections[i];
    const cx = 14 + i * (cardW + 3);
    const pc = palierColors[i];

    doc.setFillColor(...C.card2);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");
    doc.setFillColor(...pc);
    doc.roundedRect(cx, y, cardW, 4, 2, 2, "F");
    doc.rect(cx, y + 2, cardW, 2, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...pc);
    doc.text(proj.label, cx + cardW / 2, y + 10, { align: "center" });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(String(proj.globalScore), cx + cardW / 2, y + 22, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.text("/100", cx + cardW / 2 + 10, y + 22);

    doc.setFontSize(8);
    doc.setTextColor(...C.green);
    doc.text(`+${proj.deltaGlobal} pts`, cx + cardW / 2, y + 30, { align: "center" });

    const toolsText = proj.tools.filter((t) => t.disponible).map((t) => t.label.replace("NXT ", "")).join(" + ");
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray);
    doc.text(toolsText, cx + cardW / 2, y + 37, { align: "center" });

    if (proj.caAdditionnel.haut > 1000) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.green);
      doc.text(`+${(proj.caAdditionnel.bas / 1000).toFixed(0)}k–${(proj.caAdditionnel.haut / 1000).toFixed(0)}k\u20AC`, cx + cardW / 2, y + 44, { align: "center" });
    }
  }
  y += cardH + 6;

  // Separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  y += 6;

  // ── SECTION 3 : 3 Leviers prioritaires ──
  doc.setFillColor(...C.green);
  doc.roundedRect(14, y, 3, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Vos 3 leviers prioritaires", 21, y + 6);
  y += 12;

  const ADVICE: Record<string, string> = {
    pilotage_strategique: "Structurez votre suivi avec objectifs clairs et tableau de bord",
    intensite_commerciale: "Consacrez 6h/semaine à la prospection et diversifiez vos sources",
    generation_opportunites: "Multipliez vos RDV estimation et optimisez la transformation",
    solidite_portefeuille: "Augmentez votre taux d'exclusivité et consolidez votre stock",
    maitrise_ratios: "Travaillez vos ratios clés avec des exercices ciblés et réguliers",
    valorisation_economique: "Valorisez votre prestation et défendez vos honoraires",
  };

  const TOOL: Record<string, { label: string; color: [number, number, number] }> = {
    pilotage_strategique: { label: "NXT Data", color: C.primary },
    intensite_commerciale: { label: "NXT Training", color: C.green },
    generation_opportunites: { label: "NXT Profiling", color: C.violet },
    solidite_portefeuille: { label: "NXT Profiling", color: C.violet },
    maitrise_ratios: { label: "NXT Training", color: C.green },
    valorisation_economique: { label: "NXT Training", color: C.green },
  };

  const top3 = sortedAxes.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    const axis = top3[i];
    const color = scoreColor(axis.score);
    const tool = TOOL[axis.id];

    doc.setFillColor(...color);
    doc.circle(20, y + 4, 4, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.bg);
    doc.text(String(i + 1), 20, y + 5, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(axis.label, 28, y + 2);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray);
    doc.text(`${axis.score} → ${axis.potential} pts`, 28, y + 7);
    doc.setFontSize(6);
    doc.setTextColor(...C.lgray);
    doc.text(ADVICE[axis.id] ?? "", 28, y + 12, { maxWidth: 115 });

    if (tool) {
      doc.setFillColor(...tool.color);
      doc.roundedRect(W - 46, y - 1, 32, 8, 2, 2, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text(tool.label, W - 30, y + 4, { align: "center" });
    }
    y += 18;
  }

  // ── CTA ──
  const ctaY = H - 48;
  drawGradientBar(doc, 14, ctaY, W - 28, 36);
  doc.setDrawColor(80, 140, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, ctaY, W - 28, 36, 4, 4, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Prêt à transformer votre performance ?", W / 2, ctaY + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text("Pilotez vos vrais chiffres chaque mois — données réelles, alertes, projections", W / 2, ctaY + 17, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Créer mon compte — nxt-performance.com", W / 2, ctaY + 27, { align: "center" });

  // Footer
  doc.setFillColor(8, 10, 25);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setFontSize(6);
  doc.setTextColor(50, 60, 100);
  doc.text("© 2026 NXT Performance — Document confidentiel", W / 2, H - 3, { align: "center" });
}

// ══════════════════════════════════════════════════════════════
export function generateDPIPDF(scores: DPIScores, email: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  buildPage1(doc, scores, email);
  doc.addPage();
  buildPage2(doc, scores);

  const name = scores.lastName ?? email.split("@")[0] ?? "diagnostic";
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`NXT-Diagnostic-${name}-${date}.pdf`);
}
