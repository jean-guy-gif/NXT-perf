import { jsPDF } from "jspdf";
import type { DPIScores } from "./dpi-scoring";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function generateDPIPDF(scores: DPIScores, email: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NXT Performance", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Diagnostic de Performance Immobilière", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Date & email
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 20, y);
  doc.text(`Email : ${email}`, pageWidth - 20, y, { align: "right" });
  y += 10;

  // Separator
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 12;

  // Global scores
  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Score global : ${scores.globalScore}/100`, 20, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Niveau : ${scores.level}`, 20, y);
  y += 8;

  doc.text(`Score potentiel : ${scores.potentialScore}/100 (+${scores.potentialScore - scores.globalScore} pts)`, 20, y);
  y += 14;

  // Axes table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Détail par axe", 20, y);
  y += 8;

  // Table header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 245);
  doc.rect(20, y - 4, pageWidth - 40, 8, "F");
  doc.text("Axe", 22, y);
  doc.text("Score", 110, y, { align: "center" });
  doc.text("Potentiel", 135, y, { align: "center" });
  doc.text("Écart", 160, y, { align: "center" });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  for (const axis of scores.axes) {
    const gap = axis.potential - axis.score;
    doc.text(axis.label, 22, y);
    doc.text(`${axis.score}`, 110, y, { align: "center" });
    doc.text(`${axis.potential}`, 135, y, { align: "center" });
    doc.text(`+${gap}`, 160, y, { align: "center" });
    y += 7;
  }

  y += 8;

  // CA estimation
  if (scores.estimatedCAGain.max > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Estimation CA additionnel", 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Entre ${formatCurrency(scores.estimatedCAGain.min)} et ${formatCurrency(scores.estimatedCAGain.max)}`,
      20,
      y
    );
    y += 12;
  }

  // Recommendations
  const weakAxes = scores.axes
    .filter((a) => a.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (weakAxes.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recommandations", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const recommendations: Record<string, string> = {
      intensite_commerciale: "Augmentez votre temps de prospection active",
      generation_opportunites: "Multipliez vos sources d'estimation",
      solidite_portefeuille: "Renforcez votre stock de mandats",
      maitrise_ratios: "Travaillez vos taux de transformation",
      valorisation_economique: "Négociez mieux vos honoraires",
      pilotage_strategique: "Structurez votre suivi d'activité",
    };

    for (const axis of weakAxes) {
      doc.text(`• ${axis.label} (${axis.score}/100) : ${recommendations[axis.id] ?? ""}`, 22, y);
      y += 6;
    }
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Ce diagnostic a été réalisé sur nxt-performance.com", pageWidth / 2, y, { align: "center" });
  doc.text("© 2026 NXT Performance", pageWidth / 2, y + 5, { align: "center" });

  doc.save("DPI-NXT-Performance.pdf");
}
