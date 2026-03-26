import { jsPDF } from "jspdf";
import type { DPIScores, DPIAxisScore } from "./dpi-scoring";
import { computeDPIProjections } from "./dpi-projections";
import type { DPIAxis } from "./dpi-axes";

function fmt(value: number): string {
  const str = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return str + " \u20AC";
}

function scoreRGB(score: number): [number, number, number] {
  if (score < 30) return [239, 68, 68];
  if (score < 50) return [249, 115, 22];
  if (score < 70) return [51, 117, 255];
  if (score < 85) return [34, 197, 94];
  return [160, 85, 255];
}

function barRGB(score: number): [number, number, number] {
  if (score < 30) return [239, 68, 68];
  if (score < 50) return [249, 115, 22];
  if (score < 70) return [51, 117, 255];
  return [34, 197, 94];
}

function recoRGB(score: number): [number, number, number] {
  if (score < 40) return [239, 68, 68];
  if (score < 60) return [249, 115, 22];
  return [34, 197, 94];
}

const RECO: Record<string, string> = {
  intensite_commerciale: "Augmentez votre temps de prospection active",
  generation_opportunites: "Multipliez vos sources d'estimation",
  solidite_portefeuille: "Renforcez votre stock de mandats",
  maitrise_ratios: "Travaillez vos taux de transformation",
  valorisation_economique: "Négociez mieux vos honoraires",
  pilotage_strategique: "Structurez votre suivi d'activité",
};

// Short labels for radar (avoid overflow)
const SHORT_LABELS: Record<string, string> = {
  intensite_commerciale: "Intensité",
  generation_opportunites: "Opportunités",
  solidite_portefeuille: "Portefeuille",
  maitrise_ratios: "Ratios",
  valorisation_economique: "Valorisation",
  pilotage_strategique: "Pilotage",
};

// ── Draw radar polygon directly in jsPDF ──
function drawRadar(
  doc: jsPDF,
  axes: DPIAxisScore[],
  topPerformer: Record<string, number>,
  cx: number,
  cy: number,
  radius: number
) {
  const n = axes.length;

  function polarToXY(index: number, value: number): [number, number] {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / n;
    return [cx + Math.cos(angle) * radius * (value / 100), cy + Math.sin(angle) * radius * (value / 100)];
  }

  // Concentric circles (20/40/60/80/100%)
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  for (const pct of [20, 40, 60, 80, 100]) {
    const r = radius * (pct / 100);
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a1 = (2 * Math.PI * i) / steps;
      const a2 = (2 * Math.PI * (i + 1)) / steps;
      doc.line(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    }
  }

  // Axis lines from center to edge
  doc.setDrawColor(210);
  doc.setLineWidth(0.3);
  for (let i = 0; i < n; i++) {
    const [ex, ey] = polarToXY(i, 100);
    doc.line(cx, cy, ex, ey);
  }

  // Axis labels (short names)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const labelR = radius + 12;
    const lx = cx + Math.cos(angle) * labelR;
    const ly = cy + Math.sin(angle) * labelR;
    const align: "center" | "left" | "right" =
      Math.abs(Math.cos(angle)) < 0.1 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    doc.text(SHORT_LABELS[axes[i].id] ?? axes[i].label, lx, ly + 1, { align });
  }

  // Helper to draw a filled polygon
  function drawPolygon(values: number[], fillColor: [number, number, number], fillOpacity: boolean, strokeColor: [number, number, number], lineWidth: number, dashed: boolean) {
    const points: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      points.push(polarToXY(i, values[i]));
    }

    // Fill
    if (fillOpacity) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      const lines: [number, number][] = [];
      for (let i = 1; i < points.length; i++) {
        lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
      }
      lines.push([points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]]);
      doc.setLineWidth(0.1);
      doc.setDrawColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.lines(lines, points[0][0], points[0][1], [1, 1], "F");
    }

    // Stroke
    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    doc.setLineWidth(lineWidth);
    if (dashed) {
      for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        const [x1, y1] = points[i];
        const [x2, y2] = points[next];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const dashLen = 2;
        const gapLen = 2;
        let drawn = 0;
        let drawing = true;
        while (drawn < len) {
          const segLen = drawing ? dashLen : gapLen;
          const end = Math.min(drawn + segLen, len);
          if (drawing) {
            doc.line(
              x1 + (dx * drawn) / len, y1 + (dy * drawn) / len,
              x1 + (dx * end) / len, y1 + (dy * end) / len
            );
          }
          drawn = end;
          drawing = !drawing;
        }
      }
    } else {
      for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
      }
    }
  }

  // Top Performer -- grey dashed
  const topValues = axes.map((a) => topPerformer[a.id] ?? 80);
  drawPolygon(topValues, [200, 200, 200], false, [136, 136, 136], 0.5, true);

  // Potential -- violet dashed with fill
  const potValues = axes.map((a) => a.potential);
  drawPolygon(potValues, [230, 210, 255], true, [160, 85, 255], 0.8, true);

  // Current score -- blue solid with fill
  const curValues = axes.map((a) => a.score);
  drawPolygon(curValues, [200, 220, 255], true, [51, 117, 255], 1.5, false);
}

// ── Header bar helper ──
function drawHeader(doc: jsPDF, pw: number, h: number, text: string, fontSize: number) {
  doc.setFillColor(51, 117, 255);
  doc.rect(0, 0, pw, h, "F");
  doc.setFillColor(160, 85, 255);
  doc.rect(pw * 0.6, 0, pw * 0.4, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  doc.text(text, pw / 2, h * 0.62, { align: "center" });
}

// ── Footer helper ──
function drawFooter(doc: jsPDF, pw: number, ph: number) {
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text("nxt-performance.com - (c) 2026 NXT Performance", pw / 2, ph - 8, { align: "center" });
}

// ══════════════════════════════════════════════════════════════
export function generateDPIPDF(scores: DPIScores, email: string): void {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ══════════ PAGE 1 ══════════
  drawHeader(doc, pw, 25, "NXT Performance", 18);

  let y = 35;
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnostic de Performance Immobilière", pw / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`${new Date().toLocaleDateString("fr-FR")} - ${email}`, pw / 2, y, { align: "center" });
  y += 14;

  // Score circle
  const circleX = pw / 4;
  const circleY = y + 18;
  const circleR = 18;
  const [sr, sg, sb] = scoreRGB(scores.globalScore);
  doc.setFillColor(sr, sg, sb);
  doc.circle(circleX, circleY, circleR, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(`${scores.globalScore}`, circleX, circleY + 4, { align: "center" });
  doc.setFontSize(9);
  doc.text("/100", circleX, circleY + 10, { align: "center" });

  doc.setTextColor(sr, sg, sb);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(scores.level, circleX + circleR + 8, circleY - 2);
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Score actuel", circleX + circleR + 8, circleY + 6);

  // Potential circle
  const potX = pw * 0.65;
  const potR = 14;
  doc.setFillColor(160, 85, 255);
  doc.circle(potX, circleY, potR, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${scores.potentialScore}`, potX, circleY + 3, { align: "center" });
  doc.setFontSize(7);
  doc.text("/100", potX, circleY + 8, { align: "center" });

  doc.setTextColor(160, 85, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`+${scores.potentialScore - scores.globalScore} pts`, potX + potR + 6, circleY);
  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Potentiel", potX + potR + 6, circleY + 6);

  y = circleY + circleR + 8;

  // Percentile
  if (scores.percentileLabel) {
    doc.setTextColor(51, 117, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(scores.percentileLabel, pw / 2, y, { align: "center" });
    y += 5;
    if (scores.percentileRegion) {
      doc.setTextColor(120);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(scores.percentileRegion, pw / 2, y, { align: "center" });
      y += 4;
    }
    y += 4;
  }

  // CA estimation box
  if (scores.estimatedCAGain.max > 0) {
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(20, y, pw - 40, 18, 3, 3, "F");
    doc.setDrawColor(51, 117, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, y, pw - 40, 18, 3, 3, "S");
    doc.setTextColor(30, 30, 46);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Estimation CA additionnel", 26, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Entre ${fmt(scores.estimatedCAGain.min)} et ${fmt(scores.estimatedCAGain.max)}`, 26, y + 13);
    y += 24;
  }

  // RADAR (big, centered)
  const radarCY = y + 50;
  drawRadar(doc, scores.axes, scores.topPerformer, pw / 2, radarCY, 50);

  // Legend
  y = radarCY + 56;
  const legends: Array<{ label: string; color: [number, number, number] }> = [
    { label: "Score actuel", color: [51, 117, 255] },
    { label: "Potentiel", color: [160, 85, 255] },
    { label: "Top Performer", color: [136, 136, 136] },
  ];
  doc.setFontSize(7);
  for (let i = 0; i < legends.length; i++) {
    const lx = 45 + i * 48;
    doc.setFillColor(legends[i].color[0], legends[i].color[1], legends[i].color[2]);
    doc.rect(lx, y - 2, 4, 4, "F");
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    doc.text(legends[i].label, lx + 6, y + 1);
  }

  drawFooter(doc, pw, ph);

  // ══════════ PAGE 2 ══════════
  doc.addPage();
  drawHeader(doc, pw, 15, "NXT Performance - Diagnostic de Performance Immobiliere", 11);

  y = 25;

  // Axes detail table with bars (moved from page 1)
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détail par axe", 20, y);
  y += 7;

  doc.setFillColor(245, 245, 250);
  doc.rect(20, y - 3, pw - 40, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("Axe", 22, y + 1);
  doc.text("Score", 128, y + 1);
  doc.text("Potentiel", 155, y + 1);
  y += 7;

  for (const axis of scores.axes) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(7);
    doc.text(axis.label, 22, y + 1);

    const bx = 82; const bw = 40; const bh = 3.5;
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(bx, y - 1.5, bw, bh, 1, 1, "F");
    const fw = Math.max(1, (axis.score / 100) * bw);
    const [br, bg, bb] = barRGB(axis.score);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(bx, y - 1.5, fw, bh, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(br, bg, bb);
    doc.text(`${axis.score}`, 132, y + 1);
    doc.setTextColor(160, 85, 255);
    doc.text(`${axis.potential}`, 160, y + 1);
    y += 7;
  }
  y += 8;

  // Projections table
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Projections de progression", 20, y);
  y += 7;

  doc.setFillColor(245, 245, 250);
  doc.rect(20, y - 3, pw - 40, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("Axe", 22, y + 1);
  doc.text("Actuel", 92, y + 1);
  doc.text("+3 mois", 112, y + 1);
  doc.text("+6 mois", 132, y + 1);
  doc.text("+9 mois", 152, y + 1);
  doc.text("Potentiel", 172, y + 1);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (let i = 0; i < scores.axes.length; i++) {
    const axis = scores.axes[i];
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(20, y - 3, pw - 40, 7, "F");
    }
    doc.setTextColor(50);
    doc.text(axis.label, 22, y + 1);
    doc.setTextColor(51, 117, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${axis.score}`, 95, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`${axis.projection3m}`, 115, y + 1);
    doc.text(`${axis.projection6m}`, 135, y + 1);
    doc.text(`${axis.projection9m}`, 155, y + 1);
    doc.setTextColor(160, 85, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${axis.potential}`, 175, y + 1);
    doc.setFont("helvetica", "normal");
    y += 7;
  }
  y += 8;

  // Recommendations
  const recoAxes = [...scores.axes].sort((a, b) => a.score - b.score).slice(0, 3);
  if (recoAxes.length > 0) {
    doc.setTextColor(30, 30, 46);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Vos leviers de progression", 20, y);
    y += 8;

    for (const axis of recoAxes) {
      const [rc, gc, bc] = recoRGB(axis.score);

      doc.setFillColor(250, 250, 252);
      doc.roundedRect(20, y - 3, pw - 40, 18, 2, 2, "F");
      doc.setFillColor(rc, gc, bc);
      doc.rect(20, y - 3, 3, 18, "F");

      doc.setTextColor(30, 30, 46);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(axis.label, 28, y + 3);

      doc.setTextColor(rc, gc, bc);
      doc.setFontSize(8);
      doc.text(`${axis.score} > ${axis.potential}`, pw - 28, y + 3, { align: "right" });

      doc.setTextColor(100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(RECO[axis.id] ?? "", 28, y + 10);

      y += 22;
    }
  }
  y += 6;

  // Projections NXT
  const dpiAxes: DPIAxis[] = scores.axes.map((a) => ({ id: a.id, label: a.label, score: a.score }));
  const projections = computeDPIProjections(dpiAxes);
  if (projections.length > 0 && y < ph - 80) {
    doc.setTextColor(30, 30, 46);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Votre potentiel de progression", 20, y);
    y += 7;

    for (const proj of projections) {
      if (y > ph - 50) break;
      const color: [number, number, number] = proj.palier === "3m" ? [51, 117, 255] : proj.palier === "6m" ? [99, 102, 241] : [160, 85, 255];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(20, y - 2, 3, 12, "F");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${proj.label} : ${proj.globalScore}/100 (+${proj.deltaGlobal} pts)`, 28, y + 2);
      doc.setTextColor(100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const toolNames = proj.tools.map((t) => t.label + (t.disponible ? "" : " (bientôt)")).join(" + ");
      doc.text(`avec ${toolNames}`, 28, y + 8);
      if (proj.caAdditionnel.bas > 0) {
        doc.setTextColor(34, 197, 94);
        doc.text(`CA additionnel estimé : +${Math.round(proj.caAdditionnel.bas / 1000)}k\u20AC à +${Math.round(proj.caAdditionnel.haut / 1000)}k\u20AC`, 28, y + 13);
        doc.setTextColor(100);
      }
      y += 18;
    }
    y += 2;
  }

  // CTA block
  doc.setFillColor(51, 117, 255);
  doc.roundedRect(20, y, pw - 40, 30, 4, 4, "F");
  doc.setFillColor(160, 85, 255);
  doc.roundedRect(pw * 0.55, y, pw * 0.45 - 20, 30, 0, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Prêt à transformer votre performance ?", pw / 2, y + 11, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Créez votre compte NXT Performance", pw / 2, y + 19, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("nxt-performance.com", pw / 2, y + 26, { align: "center" });

  drawFooter(doc, pw, ph);

  doc.save("DPI-NXT-Performance.pdf");
}
