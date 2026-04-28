"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { DpiShareSection } from "@/components/director/leads-dpi/dpi-share-section";
import { DpiLeadsTable } from "@/components/director/leads-dpi/dpi-leads-table";
import { DpiLeadResultsView } from "@/components/director/leads-dpi/dpi-lead-results-view";
import { RecruitmentCoachingView } from "@/components/director/leads-dpi/recruitment-coaching-view";
import { getWeakestAxis } from "@/lib/recruitment-coaching";
import { MOCK_DPI_LEADS } from "@/data/mock-dpi-leads";
import type { DpiLead } from "@/types/dpi-lead";

/**
 * /directeur/leads-dpi — Outil de croissance/recrutement Directeur (PR2j).
 *
 * 4 sections :
 * 1. Lien partageable (DpiShareSection) — copier / Email / SMS / WhatsApp
 * 2. Tableau des leads (DpiLeadsTable) — statuts colorés, action "Voir résultats"
 * 3. Drawer résultats (DpiLeadResultsView) — radar 6 axes + axe faible en surbrillance
 * 4. Drawer coaching recrutement (RecruitmentCoachingView) — accroches + outils + projection
 *
 * Mode mocks PR2j : lit MOCK_DPI_LEADS. Tracking DB réel (filtré par referrer_id)
 * en PR2k après validation produit + application de la migration 031_*.sql.
 */
export default function DirecteurLeadsDpiPage() {
  const directeurId = useAppStore((s) => s.user?.id) ?? "";
  const isDemo = useAppStore((s) => s.isDemo);

  // PR2j — mocks uniquement. PR2k branchera supabase.from("dpi_results")
  // .select("*").eq("referrer_id", directeurId) avec RLS active.
  const leads: DpiLead[] = isDemo ? MOCK_DPI_LEADS : [];

  const [selectedLead, setSelectedLead] = useState<DpiLead | null>(null);
  const [coachingOpen, setCoachingOpen] = useState(false);

  function handleViewResults(lead: DpiLead) {
    setSelectedLead(lead);
    setCoachingOpen(false);
  }

  function handleCloseDrawer() {
    setSelectedLead(null);
    setCoachingOpen(false);
  }

  function handleOpenCoaching() {
    setCoachingOpen(true);
  }

  function handleBackFromCoaching() {
    setCoachingOpen(false);
  }

  const weakestAxis =
    selectedLead?.scores ? getWeakestAxis(selectedLead.scores.axes) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Croissance & recrutement
        </div>
        <h1 className="text-2xl font-bold text-foreground">Leads DPI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Partagez le test DPI à des candidats et suivez leur potentiel — pour recruter
          avec une approche personnalisée.
        </p>
      </header>

      {/* SECTION 1 — Lien partageable */}
      <DpiShareSection directeurId={directeurId} />

      {/* SECTION 2 — Tableau des leads */}
      <DpiLeadsTable leads={leads} onViewResults={handleViewResults} />

      {/* SECTION 3 — Drawer résultats */}
      {selectedLead && !coachingOpen && (
        <DpiLeadResultsView
          lead={selectedLead}
          onClose={handleCloseDrawer}
          onOpenCoaching={handleOpenCoaching}
        />
      )}

      {/* SECTION 4 — Drawer coaching recrutement (par-dessus la 3) */}
      {selectedLead && coachingOpen && weakestAxis && (
        <RecruitmentCoachingView
          lead={selectedLead}
          weakAxis={weakestAxis}
          onBack={handleBackFromCoaching}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}
