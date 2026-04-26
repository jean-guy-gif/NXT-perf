"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
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
  ArrowRight,
} from "lucide-react";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";

type FormationTab = "diagnostic" | "plan30" | "entrainer" | "financement" | "catalogue";

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
      <LockedFeature
        feature="formation"
        featureName="Ma Formation"
        featureDescription="Identifiez vos axes d'amélioration et progressez"
      >
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              Votre plan de formation personnalisé
            </h2>
            <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Votre diagnostic sera généré après votre première saisie de résultats. Il
              identifiera vos axes de progression prioritaires.
            </p>
            <a
              href="/saisie"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            >
              Faire ma première saisie
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </LockedFeature>
    );
  }

  const StatusIcon = statusConfig[diagnostic.overallStatus].icon;
  const statusCfg = statusConfig[diagnostic.overallStatus];

  // Points d'amélioration (priorités hautes/moyennes)
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
    <LockedFeature
      feature="formation"
      featureName="Ma Formation"
      featureDescription="Accédez à votre plan de formation personnalisé"
    >
      <div>
        {/* PAGE HEADER */}
        <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Target className="h-3.5 w-3.5" />
            Plan personnalisé
          </div>
          <h1 className="text-3xl font-bold text-foreground">Ma Formation</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Identifiez vos axes faibles, suivez votre plan 30 jours, entraînez-vous sur les
            bons leviers et financez vos formations.
          </p>
        </header>

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
              Plan 30 jours
            </TabButton>
            <TabButton
              active={activeTab === "entrainer"}
              onClick={() => setActiveTab("entrainer")}
              icon={Dumbbell}
            >
              S&apos;entraîner
            </TabButton>
            <TabButton
              active={activeTab === "financement"}
              onClick={() => setActiveTab("financement")}
              icon={Wallet}
            >
              Financement
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
            {/* Section 3 — Bilan synthétique */}
            <section className="mx-auto max-w-5xl px-4 py-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Target className="h-3.5 w-3.5" />
                Diagnostic
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground">
                Votre bilan synthétique
              </h2>
              <p className="mb-6 max-w-2xl text-muted-foreground">
                Vue d&apos;ensemble de la santé de vos ratios ce mois-ci.
              </p>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                      statusCfg.iconBg
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
                        ? "Félicitations ! Tous vos ratios sont conformes aux objectifs de votre catégorie."
                        : `${diagnostic.recommendations.length} domaine(s) de formation identifié(s). ${diagnostic.recommendations.filter((r) => r.priority === 1).length} priorité(s) haute(s).`}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 — Recommandations */}
            {diagnostic.recommendations.length > 0 && (
              <section className="mx-auto max-w-5xl px-4 py-12">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  Recommandations
                </div>
                <h2 className="mb-3 text-3xl font-bold text-foreground">
                  Vos axes de formation prioritaires
                </h2>
                <p className="mb-8 max-w-2xl text-muted-foreground">
                  Chaque carte indique un domaine à travailler, son niveau actuel et
                  l&apos;objectif à atteindre, classés P1 à P3.
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
                              pConfig.color
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

            {/* Section Outils — déplacée dans Diagnostic */}
            <section className="mx-auto max-w-6xl px-4 py-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                Outils
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground">
                Pour progresser dès aujourd&apos;hui
              </h2>
              <p className="mb-8 max-w-2xl text-muted-foreground">
                Modules de formation accessibles immédiatement, sans attendre votre
                prochain diagnostic.
              </p>
              <ImprovementCatalogue />
            </section>
          </>
        )}

        {/* ========== PLAN 30 JOURS ========== */}
        {activeTab === "plan30" && (
          <section className="mx-auto max-w-6xl px-4 py-12">
            <Plan30Jours />
          </section>
        )}

        {/* ========== S'ENTRAÎNER ========== */}
        {activeTab === "entrainer" && (
          <>
            {weakPoints.length > 0 ? (
              <>
                {/* Section 5 — Axes faibles à entraîner */}
                <section className="mx-auto max-w-5xl px-4 py-12">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Dumbbell className="h-3.5 w-3.5" />
                    Entraînement
                  </div>
                  <h2 className="mb-3 text-3xl font-bold text-foreground">
                    Travaillez vos points d&apos;amélioration
                  </h2>
                  <p className="mb-8 max-w-2xl text-muted-foreground">
                    {weakPoints.length} domaine(s) prioritaire(s) à travailler. Lancez une
                    session ciblée sur la plateforme NXT Training.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    {weakPoints.map((rec) => {
                      const pConfig = priorityConfig[rec.priority];
                      return (
                        <div
                          key={rec.area}
                          className="rounded-xl border border-border bg-card p-6"
                        >
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                              <Dumbbell className="h-5 w-5 text-primary" />
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

                          <h3 className="mb-3 text-base font-bold text-foreground">
                            {rec.label}
                          </h3>

                          <ProgressBar
                            value={
                              rec.targetRatio > 0
                                ? (rec.currentRatio / rec.targetRatio) * 100
                                : 0
                            }
                            status={rec.priority === 1 ? "danger" : "warning"}
                            showValue
                            size="sm"
                            className="mb-3"
                          />

                          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                            {rec.description}
                          </p>

                          <button
                            onClick={() =>
                              window.open("https://train-my-agent.vercel.app/", "_blank")
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            <Dumbbell className="h-4 w-4" />
                            S&apos;entraîner sur NXT
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Section 7 — CTA NXT Training (encart primary) */}
                <section className="mx-auto max-w-3xl px-4 py-16">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Dumbbell className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-3 text-2xl font-bold text-foreground">
                      Accédez à NXT Training
                    </h3>
                    <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                      Exercices interactifs, mises en situation et suivi personnalisé de
                      votre progression.
                    </p>
                    <button
                      onClick={() =>
                        window.open("https://train-my-agent.vercel.app/", "_blank")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                    >
                      Accéder à NXT
                      <ArrowRight className="h-5 w-5" />
                    </button>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Plateforme externe — accès via votre compte NXT
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <section className="mx-auto max-w-3xl px-4 py-12">
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    Tous vos ratios sont au vert
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Continuez comme ça.
                  </p>
                </div>
              </section>
            )}
          </>
        )}

        {/* ========== FINANCEMENT ========== */}
        {activeTab === "financement" && (
          <>
            {/* Section 8 — AGEFICE */}
            <section className="mx-auto max-w-5xl px-4 py-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Wallet className="h-3.5 w-3.5" />
                Financement
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground">
                Financement AGEFICE
              </h2>
              <p className="mb-8 max-w-2xl text-muted-foreground">
                En tant que dirigeant non salarié, vous pouvez bénéficier d&apos;une prise
                en charge AGEFICE pour vos formations professionnelles.
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-foreground">100%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prise en charge possible
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CalendarCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">3 min</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pour constituer le dossier
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">0 €</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reste à charge estimé
                  </p>
                </div>
              </div>
            </section>

            {/* Section 9 — CTA Constituer dossier (encart primary) */}
            <section className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                  <FileText className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-foreground">
                  Constituez votre dossier
                </h3>
                <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                  Répondez à quelques questions, remplissez le formulaire prérempli et
                  téléchargez votre dossier complet prêt à envoyer.
                </p>
                <button
                  onClick={() => setShowAgeficeWizard(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                >
                  Constituer mon dossier
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Dossier prérempli — prêt à envoyer en 3 minutes
                </p>
              </div>
            </section>
          </>
        )}

        {/* ========== CATALOGUE ========== */}
        {activeTab === "catalogue" && <CatalogueTab />}

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
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function CatalogueTab() {
  const profile = useAppStore((s) => s.profile);
  const networks = useAppStore((s) => s.networks);
  const [iframeError, setIframeError] = useState(false);

  const userNetwork = networks.find((n) =>
    n.institutionIds.includes(profile?.org_id ?? "")
  );
  const catalogueUrl =
    (userNetwork as { catalogue_url?: string } | undefined)?.catalogue_url ||
    "https://www.start-academy.fr/consultez-catalogue-formation-immobiliere/";

  if (iframeError) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Catalogue indisponible en intégré
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Le catalogue ne peut pas être affiché directement. Ouvrez-le dans un nouvel
            onglet.
          </p>
          <a
            href={catalogueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-5 w-5" />
            Ouvrir le catalogue
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <ExternalLink className="h-3.5 w-3.5" />
        Catalogue
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">Catalogue de formations</h2>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted-foreground">
          Parcourez l&apos;ensemble des formations professionnelles disponibles via votre
          réseau.
        </p>
        <a
          href={catalogueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
        >
          Ouvrir dans un nouvel onglet <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          src={catalogueUrl}
          className="w-full border-0"
          style={{ height: "calc(100vh - 280px)", minHeight: 400 }}
          onError={() => setIframeError(true)}
          onLoad={(e) => {
            try {
              const frame = e.currentTarget;
              if (frame.contentDocument?.title === "") setIframeError(true);
            } catch {
              // Cross-origin — iframe loaded successfully
            }
          }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </section>
  );
}
