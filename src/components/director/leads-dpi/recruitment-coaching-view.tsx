"use client";

import {
  ArrowLeft,
  X,
  User as UserIcon,
  MessageSquare,
  Wrench,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  COACHING_BY_AXIS,
  type DpiAxisId,
  type NxtTool,
} from "@/lib/recruitment-coaching";
import type { DPIAxisScore } from "@/lib/dpi-scoring";
import type { DpiLead } from "@/types/dpi-lead";

interface RecruitmentCoachingViewProps {
  lead: DpiLead;
  weakAxis: DPIAxisScore;
  onBack: () => void;
  onClose: () => void;
}

/** Couleur d'accent par outil NXT (cohérente avec la marque). */
const TOOL_COLOR: Record<NxtTool, string> = {
  "NXT Data": "bg-blue-500/10 text-blue-500 border-blue-500/30",
  "NXT Training": "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  "NXT Profiling": "bg-violet-500/10 text-violet-500 border-violet-500/30",
  "NXT Finance": "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

export function RecruitmentCoachingView({
  lead,
  weakAxis,
  onBack,
  onClose,
}: RecruitmentCoachingViewProps) {
  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
  const content = COACHING_BY_AXIS[weakAxis.id as DpiAxisId];

  // Sécurité : si l'axe n'a pas de coaching mappé (cas improbable), on n'affiche rien.
  if (!content) {
    return null;
  }

  // Score sur 10 (l'axe DPI est sur 100, on convertit pour l'affichage).
  const scoreOver10 = (weakAxis.score / 10).toFixed(1).replace(".", ",");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Retour aux résultats"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">
              Recruter {fullName}
            </h2>
            <p className="text-xs text-muted-foreground">Approche personnalisée</p>
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

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Diagnostic en haut */}
          <div className="rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
              Score faible identifié
            </p>
            <p className="mt-1 text-base font-bold text-foreground">
              {weakAxis.label}
              <span className="ml-2 text-orange-500">({scoreOver10}/10)</span>
            </p>
          </div>

          {/* Section a — Comprendre son profil */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserIcon className="h-4 w-4 text-primary" />
              Comprendre son profil
            </h3>
            <p className="text-sm leading-relaxed text-foreground">
              {content.profileInterpretation}
            </p>
          </section>

          {/* Section b — Accroches recommandées */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" />
              Vos accroches recommandées
            </h3>
            <ul className="space-y-2">
              {content.approachTips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm text-foreground"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section c — Outils NXT */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-primary" />
              Ses outils NXT pour décoller
            </h3>
            <div className="space-y-2">
              {content.recommendedTools.map((tool) => (
                <div
                  key={tool.name}
                  className={`rounded-lg border p-3 ${TOOL_COLOR[tool.name]}`}
                >
                  <p className="text-sm font-bold">{tool.name}</p>
                  <p className="mt-1 text-xs leading-relaxed">{tool.reason}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section d — Projection 6 mois */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              Projection à 6 mois
            </h3>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {content.projection6Months}
              </p>
            </div>
          </section>
        </div>

        {/* Footer NXT Croissance */}
        <footer className="border-t border-border bg-muted/30 px-6 py-4">
          <p className="flex items-center justify-center gap-2 text-xs italic text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Offert par NXT Croissance
          </p>
        </footer>
      </aside>
    </div>
  );
}
