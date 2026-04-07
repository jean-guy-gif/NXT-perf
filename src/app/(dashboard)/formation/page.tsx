"use client";

import { useState } from "react";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { useRatios } from "@/hooks/use-ratios";
import { useUser } from "@/hooks/use-user";
import { generateFormationDiagnostic } from "@/lib/formation";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/charts/progress-bar";
import { Plan30Jours } from "@/components/formation/plan-30-jours";
import { AgeficeWizard } from "@/components/formation/agefice-wizard";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  BookOpen,
  Dumbbell,
  Target,
  ExternalLink,
  CalendarCheck,
  Wallet,
  FileText,
} from "lucide-react";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";

type FormationTab = "diagnostic" | "plan30" | "entrainer" | "financement";

const priorityConfig = {
  1: { label: "P1", color: "bg-red-500/20 text-red-500", border: "border-red-500/30" },
  2: { label: "P2", color: "bg-orange-500/20 text-orange-500", border: "border-orange-500/30" },
  3: { label: "P3", color: "bg-yellow-500/20 text-yellow-400", border: "border-yellow-500/30" },
} as const;

const statusConfig = {
  ok: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Bon niveau" },
  warning: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Vigilance" },
  danger: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Action requise" },
};

// Catalogue des formations pour le dropdown AGEFICE
const formationCatalogOptions = [
  "Prospection immobilière",
  "Estimation et prise de mandat",
  "Exclusivité et valorisation du service",
  "Accompagnement acheteur",
  "Négociation et closing",
  "Suivi de portefeuille et organisation",
];

export default function FormationPage() {
  const { user } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const [activeTab, setActiveTab] = useState<FormationTab>("diagnostic");
  const [showAgeficeWizard, setShowAgeficeWizard] = useState(false);

  const diagnostic = user
    ? generateFormationDiagnostic(computedRatios, ratioConfigs, user.id)
    : null;

  if (!diagnostic) {
    return (
      <LockedFeature feature="formation" featureName="Ma Formation" featureDescription="Identifiez vos axes d'amélioration et progressez">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
            <BookOpen className="h-8 w-8 text-primary/50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Votre plan de formation personnalisé</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
            Votre diagnostic sera généré après votre première saisie de résultats. Il identifiera vos axes de progression prioritaires.
          </p>
          <a href="/saisie" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Faire ma première saisie
          </a>
        </div>
      </LockedFeature>
    );
  }

  const StatusIcon = statusConfig[diagnostic.overallStatus].icon;

  // Points d'amélioration basés sur le diagnostic
  const weakPoints = diagnostic.recommendations.filter((r) => r.priority <= 2);

  // Options pour le dropdown AGEFICE (priorités + catalogue)
  const priorityLabels = diagnostic.recommendations
    .filter((r) => r.priority <= 2)
    .map((r) => r.label);
  const ageficeFormationOptions = [
    ...priorityLabels,
    ...formationCatalogOptions.filter((o) => !priorityLabels.includes(o)),
  ];

  return (
    <LockedFeature feature="formation" featureName="Ma Formation" featureDescription="Accédez à votre plan de formation personnalisé">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ma Formation</h1>

      {/* Outils pour progresser */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Outils pour progresser</h2>
        <ImprovementCatalogue />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("diagnostic")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "diagnostic"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="h-4 w-4" />
          Diagnostic
        </button>
        <button
          onClick={() => setActiveTab("plan30")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "plan30"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarCheck className="h-4 w-4" />
          Plan 30 jours
        </button>
        <button
          onClick={() => setActiveTab("entrainer")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "entrainer"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Dumbbell className="h-4 w-4" />
          S&apos;entraîner
        </button>
        <button
          onClick={() => setActiveTab("financement")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "financement"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="h-4 w-4" />
          Financement
        </button>
      </div>

      {/* ========== DIAGNOSTIC ========== */}
      {activeTab === "diagnostic" && (
        <>
          {/* Diagnostic Summary */}
          <div
            className={cn(
              "rounded-xl border p-6",
              diagnostic.overallStatus === "ok"
                ? "border-green-500/30 bg-green-500/5"
                : diagnostic.overallStatus === "warning"
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  statusConfig[diagnostic.overallStatus].bg
                )}
              >
                <StatusIcon
                  className={cn("h-6 w-6", statusConfig[diagnostic.overallStatus].color)}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Diagnostic synthétique
                </h2>
                <p className={cn("text-sm", statusConfig[diagnostic.overallStatus].color)}>
                  {statusConfig[diagnostic.overallStatus].label}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {diagnostic.recommendations.length === 0
                ? "Félicitations ! Tous vos ratios sont conformes aux objectifs de votre catégorie."
                : `${diagnostic.recommendations.length} domaine(s) de formation identifié(s). ${diagnostic.recommendations.filter((r) => r.priority === 1).length} priorité(s) haute(s).`}
            </p>
          </div>

          {/* Recommendations */}
          {diagnostic.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Recommandations de formation
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {diagnostic.recommendations.map((rec) => {
                  const pConfig = priorityConfig[rec.priority];
                  return (
                    <div
                      key={rec.area}
                      className={cn(
                        "rounded-xl border bg-card p-5",
                        pConfig.border
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">
                            {rec.label}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            pConfig.color
                          )}
                        >
                          {pConfig.label}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Actuel</span>
                          <span className="font-medium text-foreground">
                            {rec.currentRatio.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Objectif</span>
                          <span className="font-medium text-foreground">
                            {rec.targetRatio}
                          </span>
                        </div>
                        <ProgressBar
                          value={
                            rec.targetRatio > 0
                              ? (rec.currentRatio / rec.targetRatio) * 100
                              : 0
                          }
                          status={rec.priority === 1 ? "danger" : rec.priority === 2 ? "warning" : "ok"}
                          showValue
                          size="sm"
                          className="mt-2"
                        />
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== PLAN 30 JOURS ========== */}
      {activeTab === "plan30" && (
        <Plan30Jours diagnostic={diagnostic} ratioConfigs={ratioConfigs} />
      )}

      {/* ========== S'ENTRAÎNER ========== */}
      {activeTab === "entrainer" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-5 w-5 text-orange-500" />
              <div>
                <h2 className="font-semibold text-foreground">
                  Entraînez vos points d&apos;amélioration
                </h2>
                <p className="text-sm text-muted-foreground">
                  {weakPoints.length > 0
                    ? `${weakPoints.length} domaine(s) à travailler identifié(s) depuis votre diagnostic.`
                    : "Aucun point faible détecté. Continuez à performer !"}
                </p>
              </div>
            </div>
          </div>

          {/* Weak points to train on */}
          {weakPoints.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Vos axes de travail
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {weakPoints.map((rec) => {
                  const pConfig = priorityConfig[rec.priority];
                  return (
                    <div
                      key={rec.area}
                      className={cn(
                        "rounded-xl border bg-card p-5",
                        pConfig.border
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold text-foreground">
                            {rec.label}
                          </h4>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            pConfig.color
                          )}
                        >
                          {pConfig.label}
                        </span>
                      </div>

                      <div className="mt-3">
                        <ProgressBar
                          value={
                            rec.targetRatio > 0
                              ? (rec.currentRatio / rec.targetRatio) * 100
                              : 0
                          }
                          status={rec.priority === 1 ? "danger" : "warning"}
                          showValue
                          size="sm"
                        />
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        {rec.description}
                      </p>

                      {/* CTA vers NXT */}
                      <button
                        onClick={() =>
                          window.open("https://train-my-agent.vercel.app/", "_blank")
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Dumbbell className="h-4 w-4" />
                        S&apos;entraîner sur NXT
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All ratios status - quick view */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Vue complète de vos ratios
            </h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {computedRatios.map((ratio) => {
                const config = ratioConfigs[ratio.ratioId as keyof typeof ratioConfigs];
                const isWeak = ratio.status !== "ok";
                return (
                  <div
                    key={ratio.ratioId}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          ratio.status === "ok"
                            ? "bg-green-500"
                            : ratio.status === "warning"
                              ? "bg-orange-500"
                              : "bg-red-500"
                        )}
                      />
                      <span className="text-sm text-foreground truncate">
                        {config?.name ?? ratio.ratioId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          ratio.status === "ok"
                            ? "text-green-500"
                            : ratio.status === "warning"
                              ? "text-orange-500"
                              : "text-red-500"
                        )}
                      >
                        {ratio.percentageOfTarget}%
                      </span>
                      {isWeak && (
                        <button
                          onClick={() =>
                            window.open("https://train-my-agent.vercel.app/", "_blank")
                          }
                          className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          <Dumbbell className="h-3 w-3" />
                          NXT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NXT Connection banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
                <Dumbbell className="h-7 w-7 text-indigo-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Plateforme NXT Training
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entraînez-vous sur vos points faibles avec des exercices interactifs,
                  des mises en situation et un suivi personnalisé de votre progression.
                </p>
              </div>
              <button
                onClick={() =>
                  window.open("https://train-my-agent.vercel.app/", "_blank")
                }
                className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
              >
                Accéder à NXT
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== FINANCEMENT ========== */}
      {activeTab === "financement" && (
        <div className="space-y-6">
          {/* Banner AGEFICE */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <Wallet className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Financement AGEFICE
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  En tant que dirigeant d&apos;entreprise non salarié, vous pouvez
                  bénéficier d&apos;un financement AGEFICE pour vos formations.
                  Constituez votre dossier en quelques minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Infos clés */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-2xl font-bold text-emerald-500">100%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prise en charge possible
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-2xl font-bold text-emerald-500">3 min</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pour constituer le dossier
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-2xl font-bold text-emerald-500">0 €</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reste à charge estimé
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <FileText className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              Constituez votre dossier de financement
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Répondez à quelques questions, remplissez le formulaire prérempli
              et téléchargez votre dossier complet prêt à envoyer.
            </p>
            <button
              onClick={() => setShowAgeficeWizard(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              <FileText className="h-4 w-4" />
              Constituer mon dossier
            </button>
          </div>
        </div>
      )}

      {/* AGEFICE Wizard Modal */}
      {showAgeficeWizard && (
        <AgeficeWizard
          onClose={() => setShowAgeficeWizard(false)}
          formationOptions={ageficeFormationOptions}
        />
      )}
    </div>
    </LockedFeature>
  );
}
