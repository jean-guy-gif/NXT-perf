"use client";

import { useState } from "react";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { useAppStore } from "@/stores/app-store";
import { GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";

const themes: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

function isCATheme(t: GPSTheme) {
  return t === "ca_compromis" || t === "ca_acte";
}

function fmt(value: number, theme: GPSTheme) {
  if (isCATheme(theme)) return formatCurrency(value);
  if (theme === "exclusivite") return `${value} %`;
  return formatNumber(value);
}

export default function PilotageAgencePage() {
  const { theme, setTheme, agencyGPS, teamDetails, agencyObjective } = useAgencyGPS();
  const setAgencyObjective = useAppStore(s => s.setAgencyObjective);
  const [showSaisie, setShowSaisie] = useState(!agencyObjective);
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 0);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 0);

  function handleSave() {
    if (annualCA > 0 && avgActValue > 0) {
      setAgencyObjective({ annualCA, avgActValue });
      setShowSaisie(false);
    }
  }

  const gps = agencyGPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pilotage Agence</h1>
          <p className="text-sm text-muted-foreground">GPS de performance agence</p>
        </div>
      </div>

      {/* Saisie objectif (collapsible) */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowSaisie(!showSaisie)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Objectif CA agence {agencyObjective ? `— ${formatCurrency(agencyObjective.annualCA)}/an` : "(non défini)"}</span>
          {showSaisie ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSaisie && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">CA annuel agence</label>
                <input
                  type="number"
                  value={annualCA || ""}
                  onChange={e => setAnnualCA(Number(e.target.value))}
                  placeholder="500000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Valeur moyenne d'un acte</label>
                <input
                  type="number"
                  value={avgActValue || ""}
                  onChange={e => setAvgActValue(Number(e.target.value))}
                  placeholder="8000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Enregistrer
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Si non renseigné, l'objectif agence = somme des objectifs individuels par catégorie.
            </p>
          </div>
        )}
      </div>

      {/* Theme selector */}
      <div className="flex flex-wrap gap-2">
        {themes.map(t => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              theme === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {GPS_THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* GPS Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{GPS_THEME_LABELS[theme]}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Objectif agence</p>
            <p className="text-xl font-bold">{fmt(gps.objectif, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Réalisé</p>
            <p className="text-xl font-bold">{fmt(gps.realise, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Écart</p>
            <p className={cn("text-xl font-bold", gps.ecart >= 0 ? "text-green-500" : "text-red-500")}>
              {gps.ecart >= 0 ? "+" : ""}{fmt(gps.ecart, theme)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projection annuelle</p>
            <p className="text-xl font-bold">{fmt(gps.projection, theme)}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            value={gps.avancement}
            label="Avancement"
            status={gps.avancement >= 100 ? "ok" : gps.avancement >= 80 ? "warning" : "danger"}
            size="lg"
          />
        </div>
      </div>

      {/* Team detail table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Détail par équipe</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Équipe</th>
                <th className="px-4 py-2 text-right">Objectif</th>
                <th className="px-4 py-2 text-right">Réalisé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {teamDetails.map(td => (
                <tr key={td.teamId} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{td.teamName}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.objectif, theme)}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.realise, theme)}</td>
                  <td className={cn("px-4 py-2 text-right", td.ecart >= 0 ? "text-green-500" : "text-red-500")}>
                    {td.ecart >= 0 ? "+" : ""}{fmt(td.ecart, theme)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      td.status === "ok" ? "bg-green-500/10 text-green-500" :
                      td.status === "warning" ? "bg-orange-500/10 text-orange-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {td.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
