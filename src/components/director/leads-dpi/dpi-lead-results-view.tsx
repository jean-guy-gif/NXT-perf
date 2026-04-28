"use client";

import { X, Target, Mail, Phone, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DPIRadar } from "@/components/dpi/dpi-radar";
import { getWeakestAxis } from "@/lib/recruitment-coaching";
import type { DpiLead } from "@/types/dpi-lead";

interface DpiLeadResultsViewProps {
  lead: DpiLead;
  onClose: () => void;
  onOpenCoaching: () => void;
}

export function DpiLeadResultsView({
  lead,
  onClose,
  onOpenCoaching,
}: DpiLeadResultsViewProps) {
  if (!lead.scores) return null;

  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
  const initials =
    `${lead.firstName?.[0] ?? ""}${lead.lastName?.[0] ?? ""}`.toUpperCase() ||
    lead.email[0].toUpperCase();
  const weakestAxis = getWeakestAxis(lead.scores.axes);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{fullName}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.email}
              </span>
              {lead.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {lead.phone}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Score global + niveau */}
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Score global
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
                {lead.scores.globalScore}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  / 100
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Potentiel
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#A055FF]">
                {lead.scores.potentialScore}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Niveau
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {lead.scores.level}
              </p>
            </div>
          </div>

          {/* Radar 6 axes */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Profil DPI — 6 axes
            </h3>
            <DPIRadar
              axes={lead.scores.axes}
              topPerformer={lead.scores.topPerformer}
              showProjection="potential"
            />
          </div>

          {/* Axe faible mis en surbrillance */}
          {weakestAxis && (
            <div className="rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-5">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                    Axe le plus faible
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-foreground">
                    {weakestAxis.label}
                  </h3>
                  <p className="mt-1 text-sm tabular-nums text-foreground">
                    Score actuel :{" "}
                    <span className="font-bold text-orange-500">
                      {weakestAxis.score} / 100
                    </span>
                    {" — "}potentiel : <span className="font-medium">{weakestAxis.potential}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenCoaching}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Target className="h-4 w-4" />
                Stratégie de recrutement personnalisée
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Tableau récap 6 axes */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Détail par axe
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Axe</th>
                    <th className="pb-2 text-right font-medium">Actuel</th>
                    <th className="pb-2 text-right font-medium">3 mois</th>
                    <th className="pb-2 text-right font-medium">6 mois</th>
                    <th className="pb-2 text-right font-medium">Potentiel</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.scores.axes.map((axis) => {
                    const isWeakest = weakestAxis?.id === axis.id;
                    return (
                      <tr
                        key={axis.id}
                        className={cn(
                          "border-b border-border/50 last:border-0",
                          isWeakest && "bg-orange-500/5",
                        )}
                      >
                        <td className="py-2 font-medium text-foreground">
                          {axis.label}
                          {isWeakest && (
                            <span className="ml-2 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-500">
                              Faible
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {axis.score}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {axis.projection3m}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {axis.projection6m}
                        </td>
                        <td className="py-2 text-right tabular-nums text-[#A055FF]">
                          {axis.potential}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
