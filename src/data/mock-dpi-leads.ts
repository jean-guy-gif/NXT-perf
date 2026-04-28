import type { DpiLead } from "@/types/dpi-lead";
import { TOP_PERFORMER } from "@/lib/dpi-scoring";

/**
 * Mocks démo PR2j — 6 leads variés pour démontrer toutes les variantes UI :
 * statuts, progressions, axes faibles différents (coaching adaptatif).
 *
 * En PR2k (DB réelle), ces mocks sont remplacés par un fetch supabase
 * filtré par referrer_id du Directeur connecté.
 */
const REFERRER_ID = "user-directeur"; // ID du Directeur démo

/** Helper : construit un DPIScores complet à partir des 6 axes (score + potentiel). */
function buildScores(
  axesData: Array<{ id: string; label: string; score: number; potential: number }>,
  globalScore: number,
  potentialScore: number,
  level: string,
  estimatedCAGain: { min: number; max: number },
) {
  return {
    axes: axesData.map((a) => ({
      id: a.id,
      label: a.label,
      score: a.score,
      potential: a.potential,
      projection3m: Math.min(100, a.score + Math.round((a.potential - a.score) * 0.3)),
      projection6m: Math.min(100, a.score + Math.round((a.potential - a.score) * 0.6)),
      projection9m: a.potential,
    })),
    globalScore,
    potentialScore,
    estimatedCAGain,
    topPerformer: TOP_PERFORMER,
    level,
    percentile: Math.round((globalScore / 10) * 100),
    percentileLabel: level,
  };
}

const AXIS_LABELS = {
  intensite_commerciale: "Intensité commerciale",
  generation_opportunites: "Génération d'opportunités",
  solidite_portefeuille: "Solidité du portefeuille",
  maitrise_ratios: "Maîtrise des ratios",
  valorisation_economique: "Valorisation économique",
  pilotage_strategique: "Pilotage stratégique",
} as const;

export const MOCK_DPI_LEADS: DpiLead[] = [
  // ── 1. Camille Vernet — sent ──
  {
    id: "lead-1",
    referrerId: REFERRER_ID,
    email: "camille.vernet@example.com",
    firstName: "Camille",
    lastName: "Vernet",
    status: "sent",
    sentAt: "2026-04-26T14:00:00Z",
  },
  // ── 2. Théo Legrand — opened ──
  {
    id: "lead-2",
    referrerId: REFERRER_ID,
    email: "theo.legrand@example.com",
    firstName: "Théo",
    lastName: "Legrand",
    phone: "06 12 34 56 78",
    status: "opened",
    progressPct: 0,
    sentAt: "2026-04-25T10:30:00Z",
    lastOpenedAt: "2026-04-27T09:15:00Z",
  },
  // ── 3. Inès Cottin — in_progress 45% ──
  {
    id: "lead-3",
    referrerId: REFERRER_ID,
    email: "ines.cottin@example.com",
    firstName: "Inès",
    lastName: "Cottin",
    status: "in_progress",
    progressPct: 45,
    sentAt: "2026-04-24T16:00:00Z",
    lastOpenedAt: "2026-04-28T11:20:00Z",
  },
  // ── 4. Jules Mercier — completed — axe faible : generation_opportunites ──
  {
    id: "lead-4",
    referrerId: REFERRER_ID,
    email: "jules.mercier@example.com",
    firstName: "Jules",
    lastName: "Mercier",
    phone: "06 87 65 43 21",
    status: "completed",
    progressPct: 100,
    sentAt: "2026-04-20T09:00:00Z",
    lastOpenedAt: "2026-04-22T14:30:00Z",
    completedAt: "2026-04-22T15:10:00Z",
    scores: buildScores(
      [
        { id: "intensite_commerciale", label: AXIS_LABELS.intensite_commerciale, score: 65, potential: 80 },
        { id: "generation_opportunites", label: AXIS_LABELS.generation_opportunites, score: 35, potential: 75 },
        { id: "solidite_portefeuille", label: AXIS_LABELS.solidite_portefeuille, score: 60, potential: 75 },
        { id: "maitrise_ratios", label: AXIS_LABELS.maitrise_ratios, score: 55, potential: 70 },
        { id: "valorisation_economique", label: AXIS_LABELS.valorisation_economique, score: 70, potential: 85 },
        { id: "pilotage_strategique", label: AXIS_LABELS.pilotage_strategique, score: 55, potential: 70 },
      ],
      57,
      76,
      "Confirmé",
      { min: 40000, max: 60000 },
    ),
  },
  // ── 5. Anaïs Roussel — pdf_downloaded — axe faible : pilotage_strategique ──
  {
    id: "lead-5",
    referrerId: REFERRER_ID,
    email: "anais.roussel@example.com",
    firstName: "Anaïs",
    lastName: "Roussel",
    phone: "06 23 45 67 89",
    status: "pdf_downloaded",
    progressPct: 100,
    sentAt: "2026-04-18T11:00:00Z",
    lastOpenedAt: "2026-04-21T08:45:00Z",
    completedAt: "2026-04-21T09:30:00Z",
    pdfDownloadedAt: "2026-04-21T09:35:00Z",
    scores: buildScores(
      [
        { id: "intensite_commerciale", label: AXIS_LABELS.intensite_commerciale, score: 75, potential: 85 },
        { id: "generation_opportunites", label: AXIS_LABELS.generation_opportunites, score: 70, potential: 85 },
        { id: "solidite_portefeuille", label: AXIS_LABELS.solidite_portefeuille, score: 65, potential: 75 },
        { id: "maitrise_ratios", label: AXIS_LABELS.maitrise_ratios, score: 60, potential: 80 },
        { id: "valorisation_economique", label: AXIS_LABELS.valorisation_economique, score: 70, potential: 85 },
        { id: "pilotage_strategique", label: AXIS_LABELS.pilotage_strategique, score: 30, potential: 70 },
      ],
      62,
      80,
      "Confirmé",
      { min: 50000, max: 70000 },
    ),
  },
  // ── 6. Maxime Joubert — restarted — axe faible : maitrise_ratios ──
  {
    id: "lead-6",
    referrerId: REFERRER_ID,
    email: "maxime.joubert@example.com",
    firstName: "Maxime",
    lastName: "Joubert",
    status: "restarted",
    progressPct: 100,
    sentAt: "2026-04-10T13:00:00Z",
    lastOpenedAt: "2026-04-27T16:00:00Z",
    completedAt: "2026-04-15T17:20:00Z",
    restartedAt: "2026-04-27T16:30:00Z",
    scores: buildScores(
      [
        { id: "intensite_commerciale", label: AXIS_LABELS.intensite_commerciale, score: 70, potential: 80 },
        { id: "generation_opportunites", label: AXIS_LABELS.generation_opportunites, score: 65, potential: 80 },
        { id: "solidite_portefeuille", label: AXIS_LABELS.solidite_portefeuille, score: 60, potential: 75 },
        { id: "maitrise_ratios", label: AXIS_LABELS.maitrise_ratios, score: 25, potential: 65 },
        { id: "valorisation_economique", label: AXIS_LABELS.valorisation_economique, score: 65, potential: 80 },
        { id: "pilotage_strategique", label: AXIS_LABELS.pilotage_strategique, score: 60, potential: 75 },
      ],
      58,
      76,
      "Confirmé",
      { min: 35000, max: 55000 },
    ),
  },
];
