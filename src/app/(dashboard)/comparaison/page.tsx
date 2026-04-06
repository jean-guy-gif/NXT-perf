"use client";

import { useState, useMemo } from "react";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { BarChart } from "@/components/charts/bar-chart";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import { CATEGORY_LABELS, NXT_COLORS } from "@/lib/constants";
import type { UserCategory } from "@/types/user";
import type { RatioId } from "@/types/ratios";

type CompareMode = "advisor" | "profile";
type TabType = "interne" | "classement" | "dpi";

export default function ComparaisonPage() {
  const [tab, setTab] = useState<TabType>("interne");
  const [mode, setMode] = useState<CompareMode>("advisor");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("u-demo-2");
  const [selectedProfile, setSelectedProfile] =
    useState<UserCategory>("expert");

  const { user, category } = useUser();
  const myResults = useResults();
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);

  const otherResults =
    mode === "advisor"
      ? allResults.find((r) => r.userId === selectedAdvisorId) ?? null
      : null;

  const myRatios = useMemo(() => {
    if (!myResults) return [];
    return computeAllRatios(myResults, category, ratioConfigs);
  }, [myResults, category, ratioConfigs]);

  const otherRatios = useMemo(() => {
    if (mode === "advisor" && otherResults) {
      const otherUser = users.find((u) => u.id === selectedAdvisorId);
      const otherCat = otherUser?.category ?? "confirme";
      return computeAllRatios(otherResults, otherCat, ratioConfigs);
    }
    if (mode === "profile") {
      if (!myResults) return [];
      return computeAllRatios(myResults, selectedProfile, ratioConfigs);
    }
    return [];
  }, [mode, otherResults, myResults, selectedAdvisorId, selectedProfile, ratioConfigs, users]);

  const comparisonData = myRatios.map((r, idx) => {
    const config = ratioConfigs[r.ratioId as RatioId];
    return {
      name: config?.name.split("→")[0].trim().slice(0, 12) ?? r.ratioId,
      Moi: r.percentageOfTarget,
      Autre: otherRatios[idx]?.percentageOfTarget ?? 0,
    };
  });

  const otherUsers = users.filter(
    (u) => u.id !== user?.id && u.role === "conseiller"
  );

  return (
    <LockedFeature feature="comparaison" featureName="Comparaison N-1" featureDescription="Comparez vos résultats avec l'année précédente">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Comparaison</h1>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("interne")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "interne"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison Interne
        </button>
        <button
          onClick={() => setTab("classement")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "classement"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Classement NXT
        </button>
        <button
          onClick={() => setTab("dpi")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "dpi"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison DPI
        </button>
      </div>

      {/* ========== CLASSEMENT NXT ========== */}
      {tab === "classement" && (
        <LeaderboardSection currentUserId={user?.id ?? ""} currentUserFirstName={user?.firstName ?? ""} />
      )}

      {/* ========== INTERNE ========== */}
      {tab === "interne" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("advisor")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "advisor"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un conseiller
              </button>
              <button
                onClick={() => setMode("profile")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "profile"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un profil
              </button>
            </div>

            {mode === "advisor" && (
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            )}

            {mode === "profile" && (
              <select
                value={selectedProfile}
                onChange={(e) =>
                  setSelectedProfile(e.target.value as UserCategory)
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {(["debutant", "confirme", "expert"] as UserCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Performance comparée (% objectif)
            </h3>
            <BarChart
              data={comparisonData}
              xKey="name"
              bars={[
                { dataKey: "Moi", color: NXT_COLORS.green, name: "Moi" },
                { dataKey: "Autre", color: NXT_COLORS.yellow, name: "Autre" },
              ]}
              height={300}
            />
            <div className="mt-3 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">Moi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  {mode === "advisor"
                    ? otherUsers.find((u) => u.id === selectedAdvisorId)
                        ?.firstName ?? "Autre"
                    : CATEGORY_LABELS[selectedProfile]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== COMPARAISON DPI ========== */}
      {tab === "dpi" && (
        <DPIComparisonView />
      )}
    </div>
    </LockedFeature>
  );
}

// ── Classement NXT anonyme ──────────────────────────────────────────────────

function LeaderboardSection({ currentUserId, currentUserFirstName }: { currentUserId: string; currentUserFirstName: string }) {
  const isDemo = useAppStore((s) => s.isDemo);
  const allResults = useAllResults();
  const users = useAppStore((s) => s.users);

  // In demo mode: build leaderboard from mock data
  const leaderboard = useMemo(() => {
    const conseillers = users.filter((u) => u.role === "conseiller" || u.role === "manager");
    const entries = conseillers.map((u) => {
      const userResults = allResults.filter((r) => r.userId === u.id);
      const totalCA = userResults.reduce((sum, r) => sum + (r.ventes?.chiffreAffaires ?? 0), 0);
      const totalMandats = userResults.reduce((sum, r) => sum + (r.vendeurs?.mandatsSignes ?? 0), 0);
      const totalActes = userResults.reduce((sum, r) => sum + (r.ventes?.actesSignes ?? 0), 0);
      return { userId: u.id, prenom: u.firstName, ca: totalCA, mandats: totalMandats, actes: totalActes };
    });
    return entries.sort((a, b) => b.ca - a.ca).slice(0, 20);
  }, [users, allResults]);

  const currentUserRank = leaderboard.findIndex((e) => e.userId === currentUserId);
  const currentEntry = leaderboard.find((e) => e.userId === currentUserId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Classement NXT Performance — Top 20</h2>
        <p className="text-xs text-muted-foreground">Comparaison anonyme entre conseillers NXT — Prénoms uniquement</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Prénom</th>
              <th className="px-4 py-2.5 text-right">CA</th>
              <th className="px-4 py-2.5 text-right hidden sm:table-cell">Mandats</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isMe = entry.userId === currentUserId;
              return (
                <tr key={entry.userId} className={cn(
                  "border-b border-border/50 last:border-0",
                  isMe && "bg-primary/10 font-semibold"
                )}>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      idx === 0 ? "bg-amber-500/20 text-amber-500" :
                      idx === 1 ? "bg-slate-400/20 text-slate-400" :
                      idx === 2 ? "bg-orange-600/20 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {isMe ? `${entry.prenom} (vous)` : entry.prenom}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">
                    {entry.ca.toLocaleString("fr-FR")} €
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                    {entry.mandats}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentUserRank === -1 && currentUserFirstName && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Votre position : #{leaderboard.length + 1} — CA : {currentEntry?.ca?.toLocaleString("fr-FR") ?? 0} €
        </div>
      )}
    </div>
  );
}
