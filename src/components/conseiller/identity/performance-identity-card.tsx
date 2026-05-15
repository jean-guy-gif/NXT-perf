"use client";

import {
  Compass,
  Trophy,
  Zap,
  Activity,
  Gem,
  Layers,
  CircleDot,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ARCHETYPES,
  type ArchetypeId,
  type IdentityProfile,
} from "@/lib/performance-identity";

/**
 * PerformanceIdentityCard — sous-PR Coach-25.
 *
 * Affiche le portrait typologique du conseiller (resultat de
 * `computePerformanceIdentity`). Mise en page :
 *   - Hero couleur d'accent + nom + tagline + description
 *   - 6 metrics de signature en grille (volume, mandats, exclu, etc.)
 *   - 2 panneaux Superpouvoir + Angle mort
 *   - Mini barres horizontales : repartition des scores sur les 7 archetypes
 *
 * Pas de RAG, pas de coaching. Pure lecture de la data.
 */

interface Props {
  profile: IdentityProfile;
}

const ARCHETYPE_ICONS: Record<ArchetypeId, React.ComponentType<{ className?: string }>> = {
  eclaireur: Compass,
  closer: Trophy,
  sprinter: Zap,
  regulier: Activity,
  encaisseur: Gem,
  volumeur: Layers,
  conseiller_plein: CircleDot,
  in_construction: HelpCircle,
};

const ACCENT_THEMES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
    iconColor: string;
    bar: string;
  }
> = {
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bar: "bg-indigo-500",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
  sky: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  slate: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-600 dark:text-slate-400",
    bar: "bg-slate-500",
  },
};

export function PerformanceIdentityCard({ profile }: Props) {
  const primary = ARCHETYPES[profile.primary];
  const PrimaryIcon = ARCHETYPE_ICONS[profile.primary];
  const theme = ACCENT_THEMES[primary.accentColor];

  return (
    <div className="space-y-6">
      {/* Hero portrait */}
      <section
        className={cn(
          "rounded-2xl border-2 p-6 md:p-8",
          theme.bg,
          theme.border,
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
              theme.iconBg,
            )}
          >
            <PrimaryIcon className={cn("h-8 w-8", theme.iconColor)} />
          </div>
          <div className="flex-1">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                theme.text,
              )}
            >
              Ton archétype de performance
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">
              {primary.name}
            </h1>
            <p
              className={cn("mt-1 text-sm font-medium md:text-base", theme.text)}
            >
              {primary.tagline}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground md:text-base">
              {primary.description}
            </p>
            {profile.secondary && (
              <p className="mt-3 text-xs text-muted-foreground">
                Profil secondaire :{" "}
                <span className="font-semibold text-foreground">
                  {ARCHETYPES[profile.secondary].name}
                </span>{" "}
                — {ARCHETYPES[profile.secondary].tagline.toLowerCase()}
              </p>
            )}
          </div>
        </div>

        {profile.insufficientData && profile.primary !== "in_construction" && (
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Profil basé sur {profile.monthsCovered} mois de saisie — il se
            précisera à mesure que ton historique s&apos;enrichit.
          </div>
        )}
      </section>

      {/* Si in_construction, on s'arrete la — le reste n'a pas de sens */}
      {profile.primary === "in_construction" ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Continue tes saisies hebdo. Ton portrait personnel apparaîtra
          automatiquement dès qu&apos;il y aura assez de matière.
        </div>
      ) : (
        <>
          {/* Superpouvoir + Angle mort */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Ton superpouvoir
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {primary.superpower}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Ton angle mort
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {primary.blindSpot}
              </p>
            </div>
          </section>

          {/* Signature : metrics qui caracterisent le profil */}
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold text-foreground">
              Ta signature en chiffres
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les 6 marqueurs qui caractérisent ta façon de produire. Lecture
              directe de tes saisies — pas de jugement, juste des faits.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.signatureMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {metric.interpretation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Repartition scores sur les 7 archetypes */}
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold text-foreground">
              Tes affinités sur les 7 archétypes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu n&apos;es pas qu&apos;un seul profil. Voici tes points
              d&apos;ancrage sur chacun — ça aide à comprendre où tu pourrais
              évoluer si tu choisis d&apos;investir un autre axe.
            </p>
            <div className="mt-4 space-y-2">
              {(Object.keys(ARCHETYPES) as ArchetypeId[])
                .filter((id) => id !== "in_construction")
                .sort((a, b) => profile.scores[b] - profile.scores[a])
                .map((id) => {
                  const arch = ARCHETYPES[id];
                  const Icon = ARCHETYPE_ICONS[id];
                  const score = profile.scores[id];
                  const isActive = id === profile.primary;
                  const t = ACCENT_THEMES[arch.accentColor];
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                        isActive
                          ? cn(t.bg, t.border)
                          : "border-border bg-background",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? t.iconColor : "text-muted-foreground",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isActive ? "text-foreground" : "text-foreground",
                            )}
                          >
                            {arch.name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              · {arch.tagline}
                            </span>
                          </span>
                          <span className="text-xs font-bold tabular-nums text-foreground">
                            {score}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", t.bar)}
                            style={{ width: `${Math.max(2, score)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
