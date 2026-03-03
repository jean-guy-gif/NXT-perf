"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  Dumbbell,
  ExternalLink,
  User,
} from "lucide-react";
import { ProgressBar } from "@/components/charts/progress-bar";
import { BarChart } from "@/components/charts/bar-chart";
import { CATEGORY_LABELS, CATEGORY_COLORS, NXT_COLORS } from "@/lib/constants";
import { useDirectorData } from "@/hooks/use-director-data";
import { computeAllRatios } from "@/lib/ratios";
import { generateFormationDiagnostic } from "@/lib/formation";
import type { RatioId } from "@/types/ratios";
import { cn } from "@/lib/utils";

type PeriodMode = "semaine" | "mois" | "annee";

const periodButtons: { id: PeriodMode; label: string }[] = [
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "annee", label: "Année" },
];

export default function FormationCollectivePage() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mois");
  const { teams, allConseillers, allResults, ratioConfigs } = useDirectorData();

  /* ── Formation analysis ── */
  const teamAnalysis = useMemo(() => {
    const diagnosticsByUser: {
      userId: string;
      userName: string;
      diag: ReturnType<typeof generateFormationDiagnostic>;
    }[] = [];

    for (const user of allConseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const diag = generateFormationDiagnostic(ratios, ratioConfigs, user.id);
      diagnosticsByUser.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        diag,
      });
    }

    const areaCounts: Record<
      string,
      {
        count: number;
        totalGap: number;
        label: string;
        advisors: { name: string; priority: number; gap: number }[];
      }
    > = {};

    for (const { userName, diag } of diagnosticsByUser) {
      for (const rec of diag.recommendations) {
        if (!areaCounts[rec.area]) {
          areaCounts[rec.area] = {
            count: 0,
            totalGap: 0,
            label: rec.label,
            advisors: [],
          };
        }
        areaCounts[rec.area].count++;
        areaCounts[rec.area].totalGap += rec.gapPercentage;
        areaCounts[rec.area].advisors.push({
          name: userName,
          priority: rec.priority,
          gap: rec.gapPercentage,
        });
      }
    }

    return Object.entries(areaCounts)
      .map(([area, data]) => ({
        area,
        label: data.label,
        count: data.count,
        avgGap: Math.round(data.totalGap / data.count),
        advisors: data.advisors.sort(
          (a, b) => a.priority - b.priority || b.gap - a.gap
        ),
      }))
      .sort((a, b) => b.count - a.count);
  }, [allConseillers, allResults, ratioConfigs]);

  /* ── NXT Training mock data ── */
  const nxtTrainingData = useMemo(() => {
    return allConseillers.map((user) => {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results)
        return { user, sessions: 0, hours: 0, progress: 0, weakAreas: 0 };
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const weakCount = ratios.filter((r) => r.status !== "ok").length;
      const sessions = Math.max(
        0,
        7 - weakCount * 2 + Math.floor(Math.random() * 3)
      );
      const hours = +(sessions * 0.75).toFixed(1);
      const progress =
        weakCount === 0
          ? 100
          : Math.min(
              95,
              Math.round(((7 - weakCount) / 7) * 100 + Math.random() * 15)
            );
      return { user, sessions, hours, progress, weakAreas: weakCount };
    });
  }, [allConseillers, allResults, ratioConfigs]);

  /* ── Average ratios for bar chart ── */
  const avgRatioData = useMemo(() => {
    const ratioIds = Object.keys(ratioConfigs) as RatioId[];
    return ratioIds.map((ratioId) => {
      const config = ratioConfigs[ratioId];
      const values = allConseillers
        .map((user) => {
          const results = allResults.find((r) => r.userId === user.id);
          if (!results) return null;
          const ratios = computeAllRatios(results, user.category, ratioConfigs);
          return ratios.find((r) => r.ratioId === ratioId);
        })
        .filter(Boolean);
      const avgPerf =
        values.length > 0
          ? Math.round(
              values.reduce((s, v) => s + (v?.percentageOfTarget ?? 0), 0) /
                values.length
            )
          : 0;
      return {
        name: config.name.split("→")[0].trim().slice(0, 12),
        "Perf Moyenne": avgPerf,
      };
    });
  }, [allConseillers, allResults, ratioConfigs]);

  const totalTeamSessions = nxtTrainingData.reduce(
    (s, d) => s + d.sessions,
    0
  );
  const totalTeamHours = nxtTrainingData.reduce((s, d) => s + d.hours, 0);
  const avgTeamProgress =
    nxtTrainingData.length > 0
      ? Math.round(
          nxtTrainingData.reduce((s, d) => s + d.progress, 0) /
            nxtTrainingData.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header + period filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Formation Collective Agence
            </h1>
            <p className="text-sm text-muted-foreground">
              Analyse des besoins de formation et suivi NXT Training
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5">
          {periodButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriodMode(btn.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150",
                periodMode === btn.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority recommendation */}
      {teamAnalysis.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Formation collective prioritaire
              </h3>
              <p className="text-sm text-muted-foreground">
                <strong className="text-primary">
                  {teamAnalysis[0].label}
                </strong>{" "}
                — {teamAnalysis[0].count} conseiller(s) concerné(s) :{" "}
                <span className="font-medium text-foreground">
                  {teamAnalysis[0].advisors.map((a) => a.name).join(", ")}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Training areas */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          Domaines identifiés
        </h3>
        {teamAnalysis.map((area) => (
          <div
            key={area.area}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground">{area.label}</p>
              <span className="text-sm text-muted-foreground">
                {area.count}/{allConseillers.length} conseillers
              </span>
            </div>
            <ProgressBar
              value={(area.count / allConseillers.length) * 100}
              status={
                area.count >= 3
                  ? "danger"
                  : area.count >= 2
                    ? "warning"
                    : "ok"
              }
              showValue={false}
              size="sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {area.advisors.map((adv, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                    adv.priority === 1
                      ? "bg-red-500/15 text-red-500"
                      : "bg-orange-500/15 text-orange-500"
                  )}
                >
                  <User className="h-3 w-3" />
                  {adv.name}
                  <span className="opacity-60">({adv.gap}%)</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Team ratio averages chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-foreground">
          Performance moyenne agence par ratio (%)
        </h3>
        <BarChart
          data={avgRatioData}
          xKey="name"
          bars={[
            {
              dataKey: "Perf Moyenne",
              color: NXT_COLORS.green,
              name: "Perf Moyenne (%)",
            },
          ]}
          height={300}
        />
      </div>

      {/* NXT Training Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
            <Dumbbell className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              NXT Training — Suivi agence
            </h3>
            <p className="text-sm text-muted-foreground">
              Tableau de bord des performances d&apos;entraînement de
              l&apos;agence
            </p>
          </div>
        </div>

        {/* NXT Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-center">
            <p className="text-xs text-muted-foreground">Sessions totales</p>
            <p className="mt-1 text-3xl font-bold text-indigo-500">
              {totalTeamSessions}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-center">
            <p className="text-xs text-muted-foreground">
              Heures d&apos;entraînement
            </p>
            <p className="mt-1 text-3xl font-bold text-indigo-500">
              {totalTeamHours.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-center">
            <p className="text-xs text-muted-foreground">
              Progression moyenne
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold",
                avgTeamProgress >= 80
                  ? "text-green-500"
                  : avgTeamProgress >= 60
                    ? "text-orange-500"
                    : "text-red-500"
              )}
            >
              {avgTeamProgress}%
            </p>
          </div>
        </div>

        {/* NXT per advisor */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="mb-4 font-semibold text-foreground">
            Détail par conseiller
          </h4>
          <div className="space-y-3">
            {nxtTrainingData.map((d) => {
              const perfStatus =
                d.progress >= 80
                  ? "ok"
                  : d.progress >= 60
                    ? "warning"
                    : ("danger" as const);
              const team = teams.find((t) => t.teamId === d.user.teamId);
              return (
                <div
                  key={d.user.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {d.user.firstName[0]}
                      {d.user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {d.user.firstName} {d.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team?.teamName} · {d.sessions} sessions · {d.hours}h ·{" "}
                        {d.weakAreas} point(s) faible(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:w-48">
                    <div className="flex-1">
                      <ProgressBar
                        value={d.progress}
                        status={perfStatus}
                        showValue={false}
                        size="sm"
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold w-12 text-right",
                        perfStatus === "ok"
                          ? "text-green-500"
                          : perfStatus === "warning"
                            ? "text-orange-500"
                            : "text-red-500"
                      )}
                    >
                      {d.progress}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NXT CTA */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-7 w-7 text-indigo-500" />
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Plateforme NXT Training
                </h4>
                <p className="text-sm text-muted-foreground">
                  Gérez les parcours d&apos;entraînement de votre agence et
                  suivez leur progression en temps réel.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                window.open("https://nxt.antigravity.fr", "_blank")
              }
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
            >
              Accéder à NXT
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
