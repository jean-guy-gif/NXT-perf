"use client";

import { useState } from "react";
import {
  Target,
  BookOpen,
  CalendarCheck,
  Dumbbell,
  ExternalLink,
  Sparkles,
  CheckCircle,
  Users,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamFormation } from "@/hooks/team/use-team-formation";
import type { AggregatedFormationArea } from "@/hooks/team/use-team-formation";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { ProgressBar } from "@/components/charts/progress-bar";
import { mockTeamNxtTrainingData } from "@/data/mock-nxt-training";
import type { FormationArea } from "@/types/formation";

type TeamFormationTab = "diagnostic" | "plan30" | "entrainer" | "catalogue";

interface CollectivePlanState {
  area: FormationArea;
  label: string;
  startedAt: string;
}

const priorityConfig = {
  1: { label: "P1", color: "bg-red-500/10 text-red-500" },
  2: { label: "P2", color: "bg-orange-500/10 text-orange-500" },
  3: { label: "P3", color: "bg-yellow-500/10 text-yellow-500" },
} as const;

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ManagerTeamFormationView() {
  const { perConseillerDiagnostic, prioritizedAreas } = useTeamFormation();
  const [activeTab, setActiveTab] = useState<TeamFormationTab>("diagnostic");
  const [collectivePlan, setCollectivePlan] = useState<CollectivePlanState | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>("");

  const totalConseillers = perConseillerDiagnostic.size;

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
            Plan 30j collectif
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
          {/* Bilan synthétique équipe */}
          <section className="mx-auto max-w-5xl px-4 py-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Target className="h-3.5 w-3.5" />
              Diagnostic collectif
            </div>
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Bilan synthétique de votre équipe
            </h2>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Vue d&apos;ensemble des axes de formation prioritaires pour votre équipe.
            </p>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                    prioritizedAreas.length === 0
                      ? "bg-green-500/10"
                      : "bg-orange-500/10",
                  )}
                >
                  {prioritizedAreas.length === 0 ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    {prioritizedAreas.length === 0
                      ? "Tous les ratios sont conformes"
                      : `${prioritizedAreas.length} domaine(s) à travailler`}
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {prioritizedAreas.length === 0
                      ? `Tous les conseillers de votre équipe (${totalConseillers}) atteignent leurs objectifs sur les ratios de transformation.`
                      : `${prioritizedAreas.reduce((s, a) => s + a.count, 0)} situation(s) prioritaire(s) détectée(s) sur ${totalConseillers} conseiller(s). Lancez un plan d'équipe pour cibler le levier dominant.`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Cards areas */}
          {prioritizedAreas.length > 0 && (
            <section className="mx-auto max-w-5xl px-4 pb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                Recommandations
              </div>
              <h2 className="mb-3 text-3xl font-bold text-foreground">
                Vos axes de formation prioritaires
              </h2>
              <p className="mb-8 max-w-2xl text-muted-foreground">
                Chaque carte indique un domaine à travailler, le nombre de conseillers
                concernés et le gap moyen.
              </p>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {prioritizedAreas.map((area) => (
                  <AreaCard key={area.area} area={area} totalConseillers={totalConseillers} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ========== PLAN 30J COLLECTIF ========== */}
      {activeTab === "plan30" && (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <CalendarCheck className="h-3.5 w-3.5" />
            Plan 30 jours collectif
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Plan d&apos;équipe 30 jours
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            Choisissez un axe prioritaire et lancez un plan d&apos;équipe ciblé sur 30 jours.
          </p>

          {!collectivePlan ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">
                  Démarrer un plan d&apos;équipe
                </h3>
                <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
                  Sélectionnez l&apos;axe sur lequel concentrer l&apos;effort de votre équipe.
                </p>

                {prioritizedAreas.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    Aucun axe prioritaire détecté — tous les ratios sont conformes.
                  </p>
                ) : (
                  <div className="flex w-full max-w-md flex-col gap-3">
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Choisir un axe prioritaire…</option>
                      {prioritizedAreas.map((a) => (
                        <option key={a.area} value={a.area}>
                          {a.label} ({a.count} conseiller{a.count > 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedArea}
                      onClick={() => {
                        const target = prioritizedAreas.find((a) => a.area === selectedArea);
                        if (!target) return;
                        setCollectivePlan({
                          area: target.area,
                          label: target.label,
                          startedAt: new Date().toISOString(),
                        });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Démarrer le plan d&apos;équipe
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <p className="mt-4 text-xs italic text-muted-foreground">
                  Démo — plan non persisté entre sessions
                </p>
              </div>
            </div>
          ) : (
            <ActiveCollectivePlanCard
              plan={collectivePlan}
              onTerminate={() => setCollectivePlan(null)}
            />
          )}
        </section>
      )}

      {/* ========== ENTRAÎNEMENT (mocké) ========== */}
      {activeTab === "entrainer" && <TeamTrainingTab />}

      {/* ========== CATALOGUE ========== */}
      {activeTab === "catalogue" && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            Catalogue
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Pour faire progresser votre équipe
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            4 outils pour améliorer la performance de votre équipe : plan personnalisé,
            coaching, entraînement et formation certifiante.
          </p>
          <ImprovementCatalogue />
        </section>
      )}
    </>
  );
}

// ─── AREA CARD (Diagnostic) ───────────────────────────────────────

function AreaCard({
  area,
  totalConseillers,
}: {
  area: AggregatedFormationArea;
  totalConseillers: number;
}) {
  const pConfig = priorityConfig[area.priority];
  const coverage = totalConseillers > 0 ? (area.count / totalConseillers) * 100 : 0;
  const status =
    area.priority === 1 ? "danger" : area.priority === 2 ? "warning" : "ok";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
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

      <h3 className="mb-3 text-base font-bold text-foreground">{area.label}</h3>

      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Conseillers concernés</span>
          <span className="font-medium tabular-nums text-foreground">
            {area.count}/{totalConseillers}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gap moyen</span>
          <span className="font-medium tabular-nums text-foreground">
            {area.avgGap}%
          </span>
        </div>
      </div>

      <ProgressBar value={coverage} status={status} showValue size="sm" className="mb-3" />

      <div className="flex flex-wrap gap-1.5">
        {area.conseillerNames.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            <Users className="h-2.5 w-2.5" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ACTIVE COLLECTIVE PLAN CARD ──────────────────────────────────

function ActiveCollectivePlanCard({
  plan,
  onTerminate,
}: {
  plan: CollectivePlanState;
  onTerminate: () => void;
}) {
  const elapsed = daysSince(plan.startedAt);
  const xOfThirty = Math.min(30, elapsed);
  const progress = Math.min(100, (xOfThirty / 30) * 100);

  // Mock 4 actions équipe
  const mockActions = [
    "Brief équipe : présentation de l'axe et objectifs",
    "Atelier collectif : techniques avancées",
    "Mise en pratique terrain (semaine 2-3)",
    "Bilan d'équipe : retours et ajustements",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Plan en cours</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              J+{xOfThirty}/30
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Focus :{" "}
            <span className="font-medium text-foreground">{plan.label}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Terminer le plan
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progression</span>
          <span className="text-sm font-bold text-foreground">
            {xOfThirty}/30 jours
          </span>
        </div>
        <ProgressBar value={progress} status="ok" showValue size="md" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-3 text-sm font-bold text-foreground">
          Actions d&apos;équipe
        </h4>
        <ul className="space-y-2">
          {mockActions.map((action, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs italic text-muted-foreground">
        Démo — plan non persisté entre sessions
      </p>
    </div>
  );
}

// ─── TEAM TRAINING TAB (mocké) ────────────────────────────────────

function TeamTrainingTab() {
  const data = mockTeamNxtTrainingData;
  const conseillersActifs = data.perConseillerSummary.filter(
    (c) => c.formationsCount > 0,
  ).length;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Dumbbell className="h-3.5 w-3.5" />
        Entraînement
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">
        Activité NXT Training de votre équipe
      </h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Suivi de l&apos;activité d&apos;entraînement des conseillers de votre équipe ce mois.
      </p>

      {/* Bandeau transparence mock */}
      <div className="mb-6 flex items-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2 text-xs text-orange-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Aperçu mocké — raccordement NXT Training à venir
      </div>

      {/* 3 KPIs */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Dumbbell className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {data.totalFormationsThisMonth}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Formations ce mois
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <CalendarCheck className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {data.totalHoursCumulated}h
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Heures cumulées</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {conseillersActifs}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Conseillers actifs</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-bold text-foreground">
          Activité par conseiller
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Conseiller</th>
                <th className="pb-2 font-medium">Formations</th>
                <th className="pb-2 font-medium">Heures</th>
                <th className="pb-2 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {data.perConseillerSummary.map((c) => (
                <tr key={c.name} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 tabular-nums text-foreground">
                    {c.formationsCount}
                  </td>
                  <td className="py-3 tabular-nums text-foreground">{c.hours}h</td>
                  <td className="py-3 text-muted-foreground">
                    {formatRelativeDate(c.lastConnection)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
