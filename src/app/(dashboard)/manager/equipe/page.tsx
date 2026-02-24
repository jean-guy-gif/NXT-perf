"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import type { RatioConfig, RatioId, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import { Users as UsersIcon, Trash2 } from "lucide-react";

type ViewMode = "individual" | "collective";

export default function EquipePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("collective");
  const [selectedUserId, setSelectedUserId] = useState<string>("u1");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const removeUser = useAppStore((s) => s.removeUser);
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);

  const conseillers = users.filter((u) => u.role === "conseiller");
  const selectedUser = conseillers.find((u) => u.id === selectedUserId);
  const selectedResults = allResults.find((r) => r.userId === selectedUserId);
  const selectedRatios =
    selectedResults && selectedUser
      ? computeAllRatios(
          selectedResults,
          selectedUser.category,
          ratioConfigs
        )
      : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Équipe</h1>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setViewMode("collective")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "collective"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Collective
        </button>
        <button
          onClick={() => setViewMode("individual")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "individual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Individuelle
        </button>
      </div>

      {viewMode === "collective" && (
        <div className="space-y-6">
          {/* ── Ratios moyens équipe ── */}
          <TeamAverageRatios
            conseillers={conseillers}
            allResults={allResults}
            ratioConfigs={ratioConfigs}
          />

          {/* ── Fiches individuelles ── */}
          <h3 className="text-base font-semibold text-foreground">
            Détail par conseiller
          </h3>
          {conseillers.map((user) => {
            const results = allResults.find((r) => r.userId === user.id);
            const ratios = results
              ? computeAllRatios(results, user.category, ratioConfigs)
              : [];
            const avgPerf =
              ratios.length > 0
                ? Math.round(
                    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) /
                      ratios.length
                  )
                : 0;

            return (
              <div
                key={user.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          CATEGORY_COLORS[user.category]
                        )}
                      >
                        {CATEGORY_LABELS[user.category]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">CA</p>
                      <p className="font-bold text-foreground">
                        {results
                          ? formatCurrency(results.ventes.chiffreAffaires)
                          : "N/A"}
                      </p>
                    </div>
                    {confirmDeleteId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            removeUser(user.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        title="Supprimer ce conseiller"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={avgPerf}
                  label="Performance"
                  status={
                    avgPerf >= 80
                      ? "ok"
                      : avgPerf >= 60
                        ? "warning"
                        : "danger"
                  }
                  className="mt-3"
                />
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "individual" && (
        <div className="space-y-6">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {conseillers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>

          {selectedUser && selectedResults && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {selectedUser.firstName[0]}
                    {selectedUser.lastName[0]}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        CATEGORY_COLORS[selectedUser.category]
                      )}
                    >
                      {CATEGORY_LABELS[selectedUser.category]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {selectedRatios.map((ratio) => {
                  const config =
                    ratioConfigs[ratio.ratioId as RatioId];
                  if (!config) return null;
                  return (
                    <div
                      key={ratio.ratioId}
                      className={cn(
                        "rounded-xl border bg-card p-4",
                        ratio.status === "ok"
                          ? "border-green-500/20"
                          : ratio.status === "warning"
                            ? "border-orange-500/20"
                            : "border-red-500/20"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        {config.name}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-bold",
                          ratio.status === "ok"
                            ? "text-green-500"
                            : ratio.status === "warning"
                              ? "text-orange-500"
                              : "text-red-500"
                        )}
                      >
                        {config.isPercentage
                          ? `${Math.round(ratio.value)}%`
                          : ratio.value.toFixed(1)}
                      </p>
                      <ProgressBar
                        value={ratio.percentageOfTarget}
                        status={ratio.status}
                        showValue={false}
                        size="sm"
                        className="mt-2"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────── Team Average Ratios Component ────── */
function TeamAverageRatios({
  conseillers,
  allResults,
  ratioConfigs,
}: {
  conseillers: User[];
  allResults: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
}) {
  const teamRatios = useMemo(() => {
    const allComputedByUser: ComputedRatio[][] = [];
    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      allComputedByUser.push(computeAllRatios(results, user.category, ratioConfigs));
    }
    if (allComputedByUser.length === 0) return [];

    const ratioIds = Object.keys(ratioConfigs) as RatioId[];
    return ratioIds.map((id) => {
      const config = ratioConfigs[id];
      const values = allComputedByUser
        .map((ratios) => ratios.find((r) => r.ratioId === id))
        .filter(Boolean) as ComputedRatio[];
      const avgValue = values.length > 0
        ? values.reduce((s, r) => s + r.value, 0) / values.length
        : 0;
      const avgPct = values.length > 0
        ? Math.round(values.reduce((s, r) => s + r.percentageOfTarget, 0) / values.length)
        : 0;
      const status: "ok" | "warning" | "danger" =
        avgPct >= 80 ? "ok" : avgPct >= 60 ? "warning" : "danger";
      return { id, config, avgValue, avgPct, status };
    });
  }, [conseillers, allResults, ratioConfigs]);

  if (teamRatios.length === 0) return null;

  const globalAvg = Math.round(
    teamRatios.reduce((s, r) => s + r.avgPct, 0) / teamRatios.length
  );
  const globalStatus: "ok" | "warning" | "danger" =
    globalAvg >= 80 ? "ok" : globalAvg >= 60 ? "warning" : "danger";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <UsersIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Performance moyenne de l&apos;équipe
            </h2>
            <p className="text-sm text-muted-foreground">
              Moyenne des {conseillers.length} conseillers sur chaque ratio
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Score global</p>
          <p className={cn(
            "text-2xl font-bold",
            globalStatus === "ok" ? "text-green-500" : globalStatus === "warning" ? "text-orange-500" : "text-red-500"
          )}>
            {globalAvg}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teamRatios.map((r) => (
          <div
            key={r.id}
            className={cn(
              "rounded-xl border bg-card p-4",
              r.status === "ok"
                ? "border-green-500/20"
                : r.status === "warning"
                  ? "border-orange-500/20"
                  : "border-red-500/20"
            )}
          >
            <p className="text-xs text-muted-foreground">{r.config.name}</p>
            <p className={cn(
              "mt-1 text-xl font-bold",
              r.status === "ok" ? "text-green-500" : r.status === "warning" ? "text-orange-500" : "text-red-500"
            )}>
              {r.config.isPercentage
                ? `${Math.round(r.avgValue)}%`
                : r.avgValue.toFixed(1)}
            </p>
            <ProgressBar
              value={r.avgPct}
              status={r.status}
              showValue={false}
              size="sm"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {r.avgPct}% de l&apos;objectif
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
