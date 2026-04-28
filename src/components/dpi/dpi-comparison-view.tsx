"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { computeDPIAxes, computeGlobalDPIScore, type DPIAxis } from "@/lib/dpi-axes";
import { MiniRadar } from "@/components/dpi/mini-radar";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

function computeUserDPI(
  userId: string,
  users: User[],
  allResults: PeriodResults[],
  ratioConfigs: Parameters<typeof computeAllRatios>[2]
): { user: User; scores: DPIAxis[]; globalScore: number } | null {
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  const results = allResults.find((r) => r.userId === userId);
  if (!results) return null;
  const ratios = computeAllRatios(results, user.category, ratioConfigs);
  const axes = computeDPIAxes(results, user.category, ratios);
  const globalScore = computeGlobalDPIScore(axes);
  return { user, scores: axes, globalScore };
}

export function DPIComparisonView() {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const comparableUsers = useMemo(() =>
    users.filter((u) => u.role === "conseiller" || u.role === "manager"),
    [users]
  );

  const [userAId, setUserAId] = useState("");
  const [userBId, setUserBId] = useState("");

  // Initialisation différée : Zustand (currentUser, users) hydrate de manière
  // asynchrone après le premier render. Sans cet effect, useState fige les
  // valeurs au tout premier render (souvent currentUser=null et users=[]),
  // ce qui désynchronise le <select> du state. Cet effect alimente A/B dès
  // que les données deviennent disponibles, sans écraser les sélections
  // utilisateur ultérieures (conditionné sur !userAId / !userBId).
  useEffect(() => {
    if (!userAId && (currentUser?.id || comparableUsers.length > 0)) {
      setUserAId(currentUser?.id ?? comparableUsers[0]?.id ?? "");
    }
    if (!userBId && comparableUsers.length > 0) {
      const firstNonCurrent = comparableUsers.find((u) => u.id !== currentUser?.id);
      setUserBId(firstNonCurrent?.id ?? comparableUsers[1]?.id ?? comparableUsers[0]?.id ?? "");
    }
  }, [currentUser?.id, comparableUsers, userAId, userBId]);

  const dpiA = useMemo(() => computeUserDPI(userAId, users, allResults, ratioConfigs), [userAId, users, allResults, ratioConfigs]);
  const dpiB = useMemo(() => computeUserDPI(userBId, users, allResults, ratioConfigs), [userBId, users, allResults, ratioConfigs]);

  const statusColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-orange-500" : "text-red-500";
  const radarColor = (score: number) =>
    score >= 80 ? "#39C97E" : score >= 60 ? "#FFA448" : "#EF7550";

  return (
    <div className="space-y-6">
      {/* Sélecteurs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Conseiller A</label>
          <select
            value={userAId}
            onChange={(e) => setUserAId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {comparableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}{u.id === currentUser?.id ? " (moi)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Conseiller B</label>
          <select
            value={userBId}
            onChange={(e) => setUserBId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {comparableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}{u.id === currentUser?.id ? " (moi)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Double radar */}
      {dpiA && dpiB && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="mb-1 font-semibold text-foreground">{dpiA.user.firstName} {dpiA.user.lastName}</p>
              <p className={cn("text-3xl font-bold mb-4", statusColor(dpiA.globalScore))}>{dpiA.globalScore}/100</p>
              <div className="flex justify-center">
                <MiniRadar scores={dpiA.scores} color={radarColor(dpiA.globalScore)} size={220} showLabels />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="mb-1 font-semibold text-foreground">{dpiB.user.firstName} {dpiB.user.lastName}</p>
              <p className={cn("text-3xl font-bold mb-4", statusColor(dpiB.globalScore))}>{dpiB.globalScore}/100</p>
              <div className="flex justify-center">
                <MiniRadar scores={dpiB.scores} color={radarColor(dpiB.globalScore)} size={220} showLabels />
              </div>
            </div>
          </div>

          {/* Tableau comparatif */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 font-semibold text-foreground">Comparaison axe par axe</p>
            <div className="space-y-3">
              {dpiA.scores.map((axisA, idx) => {
                const axisB = dpiB.scores[idx];
                if (!axisB) return null;
                const delta = axisA.score - axisB.score;
                const winner = delta > 0 ? "A" : delta < 0 ? "B" : "equal";
                return (
                  <div key={axisA.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">{axisA.label}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn("text-xs font-bold", winner === "A" ? "text-green-500" : "text-muted-foreground")}>{axisA.score}%</span>
                        <div className="h-2 w-full max-w-[80px] rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-agency-primary" style={{ width: `${axisA.score}%` }} />
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "w-12 text-center text-xs font-bold shrink-0",
                      delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? "=" : String(delta)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full max-w-[80px] rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-orange-400" style={{ width: `${axisB.score}%` }} />
                        </div>
                        <span className={cn("text-xs font-bold", winner === "B" ? "text-green-500" : "text-muted-foreground")}>{axisB.score}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full bg-agency-primary" />
                <span>{dpiA.user.firstName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full bg-orange-400" />
                <span>{dpiB.user.firstName}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
