import { jsPDF } from "jspdf";
import type { DPIScores } from "./dpi-scoring";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function scoreColor(score: number): [number, number, number] {
  if (score < 30) return [239, 68, 68];     // red
  if (score < 50) return [249, 115, 22];    // orange
  if (score < 70) return [51, 117, 255];    // blue
  if (score < 85) return [34, 197, 94];     // green
  return [160, 85, 255];                     // purple
}

function barColor(score: number): [number, number, number] {
  if (score < 30) return [239, 68, 68];
  if (score < 50) return [249, 115, 22];
  if (score < 70) return [51, 117, 255];
  return [34, 197, 94];
}

function recommendationBorderColor(score: number): [number, number, number] {
  if (score < 40) return [239, 68, 68];
  if (score < 60) return [249, 115, 22];
  return [34, 197, 94];
}

const RECOMMENDATIONS: Record<string, string> = {
  intensite_commerciale: "Augmentez votre temps de prospection active — c'est le carburant de votre activité",
  generation_opportunites: "Multipliez vos sources d'estimation pour alimenter votre pipeline",
  solidite_portefeuille: "Renforcez votre stock de mandats pour sécuriser votre flux de ventes",
  maitrise_ratios: "Travaillez vos taux de transformation à chaque étape du tunnel",
  valorisation_economique: "Négociez mieux vos honoraires — chaque point compte sur votre CA",
  pilotage_strategique: "Structurez votre suivi d'activité avec des indicateurs hebdomadaires",
};

export function generateDPIPDF(scores: DPIScores, email: string, radarImage?: string | null): void {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════

  // Header gradient bar
  doc.setFillColor(51, 117, 255);
  doc.rect(0, 0, pw, 22, "F");
  doc.setFillColor(160, 85, 255);
  doc.rect(pw * 0.6, 0, pw * 0.4, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("NXT Performance", pw / 2, 14, { align: "center" });

  // Subtitle
  let y = 32;
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnostic de Performance Immobilière", pw / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`${new Date().toLocaleDateString("fr-FR")} — ${email}`, pw / 2, y, { align: "center" });
  y += 14;

  // Score global circle
  const circleX = pw / 4;
  const circleY = y + 18;
  const circleR = 16;
  const [sr, sg, sb] = scoreColor(scores.globalScore);
  doc.setFillColor(sr, sg, sb);
  doc.circle(circleX, circleY, circleR, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${scores.globalScore}`, circleX, circleY + 3, { align: "center" });
  doc.setFontSize(8);
  doc.text("/100", circleX, circleY + 9, { align: "center" });

  // Level text next to score
  doc.setTextColor(sr, sg, sb);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(scores.level, circleX + circleR + 8, circleY - 2);

  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Score actuel", circleX + circleR + 8, circleY + 6);

  // Potential score
  const potX = pw * 0.65;
  const potR = 12;
  doc.setFillColor(160, 85, 255);
  doc.circle(potX, circleY, potR, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${scores.potentialScore}`, potX, circleY + 2, { align: "center" });
  doc.setFontSize(7);
  doc.text("/100", potX, circleY + 7, { align: "center" });

  doc.setTextColor(160, 85, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`+${scores.potentialScore - scores.globalScore} pts`, potX + potR + 6, circleY);
  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Potentiel", potX + potR + 6, circleY + 6);

  y = circleY + circleR + 12;

  // CA estimation box
  if (scores.estimatedCAGain.max > 0) {
    doc.setFillColor(240, 244, 255);
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
    doc.text(
      `Entre ${formatCurrency(scores.estimatedCAGain.min)} et ${formatCurrency(scores.estimatedCAGain.max)}`,
      26, y + 13
    );
    y += 24;
  }

  // Axes table with progress bars
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détail par axe", 20, y);
  y += 8;

  // Table header
  doc.setFillColor(245, 245, 250);
  doc.rect(20, y - 4, pw - 40, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("Axe", 22, y);
  doc.text("Score", 125, y);
  doc.text("Potentiel", 155, y);
  y += 8;

  for (const axis of scores.axes) {
    // Axis name
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(8);
    doc.text(axis.label, 22, y);

    // Progress bar background
    const barX = 80;
    const barW = 40;
    const barH = 4;
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(barX, y - 3, barW, barH, 1, 1, "F");

    // Progress bar fill
    const fillW = Math.max(1, (axis.score / 100) * barW);
    const [br, bg, bb] = barColor(axis.score);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(barX, y - 3, fillW, barH, 1, 1, "F");

    // Score text
    doc.setFont("helvetica", "bold");
    doc.setTextColor(br, bg, bb);
    doc.text(`${axis.score}`, 130, y);

    // Potential text
    doc.setTextColor(160, 85, 255);
    doc.text(`${axis.potential}`, 160, y);

    y += 9;
  }

  // Footer page 1
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text("Ce diagnostic a été réalisé sur nxt-performance.com — © 2026 NXT Performance", pw / 2, ph - 8, { align: "center" });

  // ════════════════════════════════════════════════════════════
  // PAGE 2
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = 20;

  // Header bar page 2
  doc.setFillColor(51, 117, 255);
  doc.rect(0, 0, pw, 16, "F");
  doc.setFillColor(160, 85, 255);
  doc.rect(pw * 0.6, 0, pw * 0.4, 16, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("NXT Performance — Diagnostic de Performance Immobilière", pw / 2, 11, { align: "center" });

  y = 26;

  // Radar section
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Votre radar de performance", pw / 2, y, { align: "center" });
  y += 8;

  if (radarImage) {
    const imgW = 140;
    const imgH = 100;
    const imgX = (pw - imgW) / 2;
    doc.addImage(radarImage, "PNG", imgX, y, imgW, imgH);
    y += imgH + 6;

    // Legend
    const legendItems = [
      { label: "Score actuel", color: [51, 117, 255] as [number, number, number] },
      { label: "Potentiel", color: [160, 85, 255] as [number, number, number] },
      { label: "Top Performer", color: [136, 136, 136] as [number, number, number] },
    ];
    const legendX = 40;
    doc.setFontSize(8);
    for (let i = 0; i < legendItems.length; i++) {
      const item = legendItems[i];
      const lx = legendX + i * 50;
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.circle(lx, y, 2, "F");
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, lx + 4, y + 1);
    }
    y += 10;
  } else {
    // Fallback: text table if radar capture failed
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "italic");
    doc.text("(Radar non disponible dans cette version du PDF)", pw / 2, y + 10, { align: "center" });
    y += 24;
  }

  // Projections table
  doc.setTextColor(30, 30, 46);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Projections de progression", 20, y);
  y += 7;

  doc.setFillColor(245, 245, 250);
  doc.rect(20, y - 4, pw - 40, 8, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("Axe", 22, y);
  doc.text("Actuel", 95, y);
  doc.text("+3 mois", 115, y);
  doc.text("+6 mois", 135, y);
  doc.text("+9 mois", 155, y);
  doc.text("Potentiel", 175, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const axis of scores.axes) {
    doc.setTextColor(50);
    doc.text(axis.label, 22, y);
    doc.setTextColor(51, 117, 255);
    doc.text(`${axis.score}`, 98, y);
    doc.setTextColor(80);
    doc.text(`${axis.projection3m}`, 118, y);
    doc.text(`${axis.projection6m}`, 138, y);
    doc.text(`${axis.projection9m}`, 158, y);
    doc.setTextColor(160, 85, 255);
    doc.text(`${axis.potential}`, 178, y);
    y += 7;
  }
  y += 6;

  // Recommendations
  const allAxesSorted = [...scores.axes].sort((a, b) => a.score - b.score);
  const recoAxes = allAxesSorted.slice(0, 3);

  if (recoAxes.length > 0) {
    doc.setTextColor(30, 30, 46);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Recommandations prioritaires", 20, y);
    y += 8;

    for (const axis of recoAxes) {
      const [rc, gc, bc] = recommendationBorderColor(axis.score);

      // Background
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(20, y - 4, pw - 40, 18, 2, 2, "F");

      // Left border
      doc.setFillColor(rc, gc, bc);
      doc.rect(20, y - 4, 3, 18, "F");

      // Text
      doc.setTextColor(30, 30, 46);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${axis.label}`, 28, y + 2);

      doc.setTextColor(rc, gc, bc);
      doc.setFontSize(8);
      doc.text(`${axis.score} → ${axis.potential}`, pw - 28, y + 2, { align: "right" });

      doc.setTextColor(100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(RECOMMENDATIONS[axis.id] ?? "", 28, y + 9);

      y += 22;
    }
  }

  // Footer page 2
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text("Ce diagnostic a été réalisé sur nxt-performance.com — © 2026 NXT Performance", pw / 2, ph - 8, { align: "center" });

  doc.save("DPI-NXT-Performance.pdf");
}
