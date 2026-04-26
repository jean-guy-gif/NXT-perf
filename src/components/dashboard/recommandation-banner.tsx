"use client";

import type { FormationRecommendation, FormationArea } from "@/types/formation";
import type { RatioConfig } from "@/types/ratios";
import { AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ACTION_MESSAGES: Record<FormationArea, { interpretation: string; action: string }> = {
  prospection: {
    interpretation: "Vos contacts ne se transforment pas assez en RDV",
    action: "Relancez vos prospects non contactés et qualifiez mieux vos leads entrants",
  },
  estimation: {
    interpretation: "Vos estimations ne génèrent pas assez de mandats",
    action: "Renforcez votre argumentation prix avec des comparables récents",
  },
  exclusivite: {
    interpretation: "Votre taux d'exclusivité est en dessous de l'objectif",
    action: "Préparez un argumentaire exclusivité structuré pour chaque RDV",
  },
  suivi_mandat: {
    interpretation: "Vos mandats simples ne se vendent pas assez",
    action: "Planifiez un suivi vendeur hebdomadaire et proposez des ajustements prix",
  },
  accompagnement_acheteur: {
    interpretation: "Vos visites ne génèrent pas assez d'offres",
    action: "Améliorez la qualification acheteur avant chaque visite",
  },
  negociation: {
    interpretation: "Vos offres ne se transforment pas assez en compromis",
    action: "Travaillez votre technique de closing et la gestion des objections",
  },
};

const MANAGER_MESSAGES: Record<FormationArea, string> = {
  prospection: "conseiller(s) en difficulté sur la prospection → coaching appel recommandé",
  estimation: "conseiller(s) en difficulté sur la conversion estimation → mandat",
  exclusivite: "conseiller(s) sous l'objectif exclusivité → travaillez l'argumentaire en équipe",
  suivi_mandat: "mandats simples stagnent → organisez une revue de portefeuille",
  accompagnement_acheteur: "visites sans offre → vérifiez la qualification acheteur",
  negociation: "offres non transformées → session closing recommandée",
};

interface RecommandationBannerProps {
  recommendations: FormationRecommendation[];
  ratioConfigs: Record<string, RatioConfig>;
  maxItems?: number;
  variant?: "compact" | "full";
  scope?: "conseiller" | "manager" | "directeur";
}

const PRIORITY_COLORS = {
  1: { border: "border-red-500/30", bg: "bg-red-500/5", icon: "text-red-500" },
  2: { border: "border-orange-500/30", bg: "bg-orange-500/5", icon: "text-orange-500" },
  3: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", icon: "text-yellow-500" },
} as const;

const FORMATION_LINKS: Record<string, string> = {
  conseiller: "/formation",
  manager: "/manager/formation",
  directeur: "/directeur/formation-collective",
};

export function RecommandationBanner({
  recommendations,
  maxItems = 3,
  variant = "compact",
  scope = "conseiller",
}: RecommandationBannerProps) {
  if (recommendations.length === 0) return null;

  const items = recommendations.slice(0, maxItems);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {items.map((rec) => {
          const colors = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS[3];
          const isManager = scope === "manager" || scope === "directeur";
          const msg = ACTION_MESSAGES[rec.area];
          const managerMsg = MANAGER_MESSAGES[rec.area];

          return (
            <div
              key={rec.area}
              className={cn(
                "rounded-xl border p-4 flex items-start gap-3",
                colors.border,
                colors.bg
              )}
            >
              <AlertTriangle className={cn("h-5 w-5 mt-0.5 shrink-0", colors.icon)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isManager ? `${rec.description} — ${managerMsg}` : msg.interpretation}
                </p>
                {!isManager && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{msg.action}</p>
                  </div>
                )}
                <Link
                  href={FORMATION_LINKS[scope] ?? "/formation"}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 hover:underline"
                >
                  Voir la formation
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Full variant — grid of cards
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((rec) => {
        const colors = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS[3];
        const msg = ACTION_MESSAGES[rec.area];

        return (
          <div
            key={rec.area}
            className={cn(
              "rounded-xl border p-5 space-y-3",
              colors.border,
              colors.bg
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", colors.icon)} />
              <h3 className="font-semibold text-sm">{rec.label}</h3>
            </div>
            <p className="text-sm">{msg.interpretation}</p>
            <div className="flex items-start gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{msg.action}</p>
            </div>
            <Link
              href={FORMATION_LINKS[scope] ?? "/formation"}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Voir la formation
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
