"use client";

import { Users } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { cn } from "@/lib/utils";

const themes: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

export default function EquipesPage() {
  const { theme, setTheme, entityBars } = useAgencyGPS();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Équipes</h1>
          <p className="text-sm text-muted-foreground">Comparaison par thème — Agence / Managers / Conseillers</p>
        </div>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        {/* Niveau tags */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#6366f1" }}>AGC</span>
          <span>Agence</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>MGR</span>
          <span>Manager</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/60">abc</span>
          <span>Conseiller</span>
        </div>
        <div className="h-4 w-px bg-border" />
        {/* Performance */}
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-t-2 border-dashed border-foreground/60" />
          <span>Objectif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>≥ 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span>80–99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>&lt; 80%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4 overflow-x-hidden">
        <h2 className="mb-4 text-sm font-semibold">
          {GPS_THEME_LABELS[theme]} — Comparaison tous niveaux
        </h2>
        <ComparisonBarChart data={entityBars} />
      </div>
    </div>
  );
}
