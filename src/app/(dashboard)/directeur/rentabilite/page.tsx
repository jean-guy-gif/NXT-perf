"use client";

import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { useAppStore, type DirectorCosts } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const defaultCosts: DirectorCosts = {
  commissionDirecteur: 0,
  commissionManagers: 0,
  commissionConseillers: 0,
  coutsFixes: 0,
  masseSalariale: 0,
  autresCharges: 0,
};

export default function RentabilitePage() {
  const { rentabilite, directorCosts } = useAgencyGPS();
  const setDirectorCosts = useAppStore(s => s.setDirectorCosts);
  const [showForm, setShowForm] = useState(!directorCosts);
  const [form, setForm] = useState<DirectorCosts>(directorCosts ?? defaultCosts);

  function handleSave() {
    setDirectorCosts(form);
    setShowForm(false);
  }

  function updateField(field: keyof DirectorCosts, value: number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const fields: { key: keyof DirectorCosts; label: string; suffix: string }[] = [
    { key: "commissionDirecteur", label: "% commission directeur", suffix: "%" },
    { key: "commissionManagers", label: "% commission managers", suffix: "%" },
    { key: "commissionConseillers", label: "% commission conseillers", suffix: "%" },
    { key: "coutsFixes", label: "Coûts fixes agence / mois", suffix: "€" },
    { key: "masseSalariale", label: "Masse salariale / mois", suffix: "€" },
    { key: "autresCharges", label: "Autres charges / mois", suffix: "€" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rentabilité</h1>
          <p className="text-sm text-muted-foreground">Simulation de rentabilité agence</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Paramètres de rentabilité {directorCosts ? "(configuré)" : "(à renseigner)"}</span>
          {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showForm && (
          <div className="border-t border-border px-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-muted-foreground">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form[f.key] || ""}
                      onChange={e => updateField(f.key, Number(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">{f.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSave}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Enregistrer
              </button>
              {directorCosts && (
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-md bg-muted px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted/80"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {!rentabilite ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <Calculator className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Renseignez vos paramètres de rentabilité pour afficher les projections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Revenu directeur (ses ventes)", value: rentabilite.revenuDirecteurVentes, color: "text-blue-500" },
            { label: "Revenu directeur (équipes)", value: rentabilite.revenuDirecteurEquipes, color: "text-violet-500" },
            { label: "Résultat agence estimé / mois", value: rentabilite.resultatAgenceMois, color: rentabilite.resultatAgenceMois >= 0 ? "text-green-500" : "text-red-500" },
            { label: "Projection revenu directeur / an", value: rentabilite.projectionRevenuAnnuel, color: rentabilite.projectionRevenuAnnuel >= 0 ? "text-green-500" : "text-red-500" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={cn("mt-1 text-2xl font-bold", kpi.color)}>
                {formatCurrency(kpi.value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
