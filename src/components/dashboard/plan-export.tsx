"use client";

import { useState, useRef } from "react";
import { Download, X, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface PlanWeek {
  week: number;
  focus: string;
  actions: string[];
  target: string;
}

interface PlanExportProps {
  title: string;
  subtitle?: string;
  weakRatios: { name: string; current: number; target: number; unit: string }[];
  onClose: () => void;
}

function generatePlan(weakRatios: PlanExportProps["weakRatios"]): PlanWeek[] {
  const r1 = weakRatios[0];
  const r2 = weakRatios[1];

  return [
    {
      week: 1,
      focus: r1 ? `Priorité : ${r1.name}` : "Diagnostic initial",
      actions: r1
        ? [`Analyser les causes du déficit (${r1.current} vs objectif ${r1.target}${r1.unit})`, "Identifier 3 leviers d'amélioration concrets", "Mettre en place une routine quotidienne"]
        : ["Revoir les résultats du mois", "Identifier les 3 ratios les plus faibles"],
      target: r1 ? `Objectif : +10% sur ${r1.name}` : "Établir la baseline",
    },
    {
      week: 2,
      focus: r1 ? `Accélération : ${r1.name}` : "Plan d'action",
      actions: ["Appliquer les leviers identifiés en semaine 1", "Mesurer les premiers résultats", "Ajuster la stratégie si nécessaire"],
      target: r1 ? `Objectif : atteindre ${Math.round(r1.current * 1.15)}${r1.unit}` : "Premiers résultats visibles",
    },
    {
      week: 3,
      focus: r2 ? `Nouveau focus : ${r2.name}` : "Consolidation",
      actions: r2
        ? [`Attaquer le ratio ${r2.name} (${r2.current} vs ${r2.target}${r2.unit})`, "Maintenir les acquis sur le ratio précédent", "Demander un feedback à son manager"]
        : ["Maintenir les bonnes pratiques", "Affiner les processus"],
      target: r2 ? `Objectif : +10% sur ${r2.name}` : "Consolidation des acquis",
    },
    {
      week: 4,
      focus: "Bilan et projection",
      actions: ["Mesurer les progrès sur tous les ratios ciblés", "Documenter ce qui a fonctionné", "Planifier le mois suivant"],
      target: "Bilan complet et plan mois suivant",
    },
  ];
}

export function PlanExport({ title, subtitle, weakRatios, onClose }: PlanExportProps) {
  const [exporting, setExporting] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);
  const plan = generatePlan(weakRatios);

  const handleExport = async (format: "jpeg" | "pdf") => {
    if (!planRef.current) return;
    setExporting(true);

    const canvas = await html2canvas(planRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    if (format === "jpeg") {
      const link = document.createElement("a");
      link.download = `plan-30-jours-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
    } else {
      // PDF via print
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`<html><body style="margin:0"><img src="${canvas.toDataURL("image/jpeg", 0.92)}" style="width:100%"/></body></html>`);
        win.document.close();
        win.print();
      }
    }

    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Plan 30 jours</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleExport("jpeg")} disabled={exporting}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              JPEG
            </button>
            <button type="button" onClick={() => handleExport("pdf")} disabled={exporting}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
              <Download className="h-3 w-3" /> PDF
            </button>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Exportable content */}
        <div ref={planRef} className="bg-white p-8 space-y-6 text-black">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold" style={{ color: "var(--agency-primary, #6C5CE7)" }}>{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            <p className="text-xs text-gray-400">Généré le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>

          {/* Ratios cibles */}
          {weakRatios.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Ratios ciblés</h2>
              <div className="flex gap-3">
                {weakRatios.slice(0, 3).map((r) => (
                  <div key={r.name} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center flex-1">
                    <p className="text-xs text-gray-500">{r.name}</p>
                    <p className="text-lg font-bold text-red-600">{r.current}{r.unit}</p>
                    <p className="text-[10px] text-gray-400">Objectif : {r.target}{r.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly plan */}
          <div className="space-y-4">
            {plan.map((w) => (
              <div key={w.week} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Semaine {w.week}</h3>
                  <span className="text-xs text-gray-500">{w.focus}</span>
                </div>
                <ul className="space-y-1 mb-2">
                  {w.actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-gray-400 mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-medium" style={{ color: "var(--agency-primary, #6C5CE7)" }}>{w.target}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-gray-300">Généré par NXT Performance</p>
        </div>
      </div>
    </div>
  );
}
