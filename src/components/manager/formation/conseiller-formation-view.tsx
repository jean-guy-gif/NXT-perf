"use client";

import { useMemo, useState } from "react";
import {
  Target,
  BookOpen,
  CalendarCheck,
  Dumbbell,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CircleDashed,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { generateFormationDiagnostic } from "@/lib/formation";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { ProgressBar } from "@/components/charts/progress-bar";
import { getMockIndividualNxtTraining } from "@/data/mock-nxt-training";
import type { User } from "@/types/user";

type ConseillerFormationTab = "diagnostic" | "plan30" | "entrainer" | "catalogue";

const priorityConfig = {
  1: { label: "P1", color: "bg-red-500/10 text-red-500" },
  2: { label: "P2", color: "bg-orange-500/10 text-orange-500" },
  3: { label: "P3", color: "bg-yellow-500/10 text-yellow-500" },
} as const;

const statusConfig = {
  ok: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    label: "Bon niveau",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    label: "Vigilance",
  },
  danger: {
    icon: XCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    label: "Action requise",
  },
};

interface ConseillerFormationViewProps {
  conseiller: User;
}

export function ConseillerFormationView({ conseiller }: ConseillerFormationViewProps) {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const results = useResults(conseiller.id);
  const [activeTab, setActiveTab] = useState<ConseillerFormationTab>("diagnostic");

  const diagnostic = useMemo(() => {
    if (!results) return null;
    const ratios = computeAllRatios(results, conseiller.category, ratioConfigs);
    return generateFormationDiagnostic(ratios, ratioConfigs, conseiller.id);
  }, [results, conseiller.category, conseiller.id, ratioConfigs]);

  if (!diagnostic) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-foreground">
            Aucune donnée pour {conseiller.firstName}
          </h3>
          <p className="text-base leading-relaxed text-muted-foreground">
            Le diagnostic sera généré dès que {conseiller.firstName} aura saisi sa première
            période.
          </p>
        </div>
      </section>
    );
  }

  const StatusIcon = statusConfig[diagnostic.overallStatus].icon;
  const statusCfg = statusConfig[diagnostic.overallStatus];

  return (
    <>
      {/* TABS */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          <TabButton
            active={activeTab === "diagnostic"}
            onClick={() => setActiveTab("diagnostic")}
            icon={Target}
          >
            Diagnostic
          </TabButton>
          <TabButton
            active={activeTab === "plan30"}
            onClick={() => setActiveTab("plan30")}
            icon={CalendarCheck}
          >
            Plan 30j
          </TabButton>
          <TabButton
            active={activeTab === "entrainer"}
            onClick={() => setActiveTab("entrainer")}
            icon={Dumbbell}
          >
            Entraînement
          </TabButton>
          <TabButton
            active={activeTab === "catalogue"}
            onClick={() => setActiveTab("catalogue")}
            icon={ExternalLink}
          >
            Catalogue
          </TabButton>
        </div>
      </div>

      {/* ========== DIAGNOSTIC ========== */}
      {activeTab === "diagnostic" && (
        <>
          <section className="mx-auto max-w-5xl px-4 py-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Target className="h-3.5 w-3.5" />
              Diagnostic
            </div>
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Bilan synthétique de {conseiller.firstName}
            </h2>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Vue d&apos;ensemble de la santé des ratios de {conseiller.firstName} ce
              mois-ci.
            </p>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                    statusCfg.iconBg,
                  )}
                >
                  <StatusIcon className={cn("h-6 w-6", statusCfg.iconColor)} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    Diagnostic synthétique
                  </h3>
                  <p className={cn("mb-3 text-sm font-semibold", statusCfg.iconColor)}>
                    {statusCfg.label}
                  </p>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {diagnostic.recommendations.length === 0
                      ? `${conseiller.firstName} atteint tous ses objectifs sur les ratios de transformation.`
                      : `${diagnostic.recommendations.length} domaine(s) de formation identifié(s). ${diagnostic.recommendations.filter((r) => r.priority === 1).length} priorité(s) haute(s).`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Recommandations */}
          {diagnostic.recommendations.length > 0 && (
            <section className="mx-auto max-w-5xl px-4 pb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                Recommandations
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground">
                Axes de formation prioritaires
              </h2>
              <p className="mb-8 max-w-2xl text-muted-foreground">
                Chaque carte indique un domaine à travailler, le niveau actuel et
                l&apos;objectif à atteindre.
              </p>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {diagnostic.recommendations.map((rec) => {
                  const pConfig = priorityConfig[rec.priority];
                  return (
                    <div
                      key={rec.area}
                      className="rounded-xl border border-border bg-card p-6"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            pConfig.color,
                          )}
                        >
                          {pConfig.label}
                        </span>
                      </div>

                      <h3 className="mb-3 text-base font-bold text-foreground">
                        {rec.label}
                      </h3>

                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Actuel</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {rec.currentRatio.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Objectif</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {rec.targetRatio}
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        value={
                          rec.targetRatio > 0
                            ? (rec.currentRatio / rec.targetRatio) * 100
                            : 0
                        }
                        status={
                          rec.priority === 1
                            ? "danger"
                            : rec.priority === 2
                              ? "warning"
                              : "ok"
                        }
                        showValue
                        size="sm"
                        className="mb-3"
                      />

                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ========== PLAN 30J — placeholder ========== */}
      {activeTab === "plan30" && (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CalendarCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-foreground">
              Plan personnel de {conseiller.firstName} — visible côté conseiller dans son
              espace.
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground">
              Pour une vue détaillée du plan personnel, le conseiller peut le consulter
              directement.
            </p>
          </div>
        </section>
      )}

      {/* ========== ENTRAÎNEMENT (mocké individuel) ========== */}
      {activeTab === "entrainer" && (
        <IndividualTrainingTab conseillerName={conseiller.firstName} />
      )}

      {/* ========== CATALOGUE ========== */}
      {activeTab === "catalogue" && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            Catalogue
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Outils de formation
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            4 outils accessibles : plan personnalisé, coaching, entraînement et
            formation certifiante.
          </p>
          <ImprovementCatalogue />
        </section>
      )}
    </>
  );
}

// ─── INDIVIDUAL TRAINING TAB ──────────────────────────────────────

function IndividualTrainingTab({ conseillerName }: { conseillerName: string }) {
  const data = getMockIndividualNxtTraining(conseillerName);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Dumbbell className="h-3.5 w-3.5" />
        Entraînement
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">
        Activité de {conseillerName} sur NXT Training
      </h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Historique des formations suivies par {conseillerName} sur la plateforme.
      </p>

      <div className="mb-6 flex items-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2 text-xs text-orange-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Aperçu mocké — raccordement NXT Training à venir
      </div>

      {/* 2 KPIs */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Dumbbell className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {data.totalSessions}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Sessions totales</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <CalendarCheck className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {data.totalHours}h
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Heures cumulées</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-bold text-foreground">
          Formations récentes
        </h3>
        <ul className="space-y-3">
          {data.formations.map((f, i) => {
            const isDone = f.status === "done";
            const Icon = isDone ? CheckCircle2 : CircleDashed;
            return (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    isDone ? "text-green-500" : "text-amber-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(f.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {f.durationHours}h ·{" "}
                    {isDone ? "Terminée" : "En cours"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
