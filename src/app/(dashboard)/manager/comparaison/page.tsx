// @ts-nocheck
// TODO: Align RatioId/PeriodResults types between branches
"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";
import type { RatioId } from "@/types/ratios";

type TabType = "conseillers" | "equipes" | "classement" | "dpi";

// ── Volume metrics extracted from results ──────────────────────────────────

interface VolumeRow {
  label: string;
  valueA: number;
  valueB: number;
  format?: "currency";
}

function extractVolumes(results: PeriodResults | null, label: string): Record<string, number> {
  if (!results) return {};
  return {
    "Contacts": results.prospection?.contactsTotaux ?? 0,
    "Mandats": results.vendeurs?.mandatsSignes ?? 0,
    "Visites": results.acheteurs?.nombreVisites ?? 0,
    "Offres": results.acheteurs?.offresRecues ?? 0,
    "Compromis": results.acheteurs?.compromisSignes ?? 0,
    "Actes": results.ventes?.actesSignes ?? 0,
    "CA": results.ventes?.chiffreAffaires ?? 0,
  };
}

function buildVolumeRows(volA: Record<string, number>, volB: Record<string, number>): VolumeRow[] {
  const keys = ["Contacts", "Mandats", "Visites", "Offres", "Compromis", "Actes", "CA"];
  return keys.map((k) => ({
    label: k,
    valueA: volA[k] ?? 0,
    valueB: volB[k] ?? 0,
    format: k === "CA" ? "currency" : undefined,
  }));
}

interface RatioRow {
  label: string;
  valueA: number;
  valueB: number;
}

function extractRatioRows(
  resultsA: PeriodResults | null,
  userA: User | undefined,
  resultsB: PeriodResults | null,
  userB: User | undefined,
  ratioConfigs: Parameters<typeof computeAllRatios>[2],
): RatioRow[] {
  const ratiosA = resultsA && userA ? computeAllRatios(resultsA, userA.category, ratioConfigs) : [];
  const ratiosB = resultsB && userB ? computeAllRatios(resultsB, userB.category, ratioConfigs) : [];

  const displayRatios: RatioId[] = ["rdv_mandats", "visites_offre", "offres_compromis"];
  const ratioLabels: Record<string, string> = {
    rdv_mandats: "Taux mandat",
    visites_offre: "Taux visite",
    offres_compromis: "Taux closing",
  };

  return displayRatios.map((id) => ({
    label: ratioLabels[id] ?? id,
    valueA: ratiosA.find((r) => r.ratioId === id)?.value ?? 0,
    valueB: ratiosB.find((r) => r.ratioId === id)?.value ?? 0,
  }));
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function fmtValue(v: number, format?: "currency") {
  if (format === "currency") return `${v.toLocaleString("fr-FR")} €`;
  return v.toLocaleString("fr-FR");
}

function fmtRatio(v: number) {
  return v.toFixed(2);
}

// ── Comparison table component ─────────────────────────────────────────────

function ComparisonTable({
  labelA,
  labelB,
  volumes,
  ratios,
}: {
  labelA: string;
  labelB: string;
  volumes: VolumeRow[];
  ratios: RatioRow[];
}) {
  return (
    <div className="space-y-6">
      {/* Volumes */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">Volumes</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Métrique</th>
              <th className="px-4 py-2.5 text-right">{labelA}</th>
              <th className="px-4 py-2.5 text-right">{labelB}</th>
            </tr>
          </thead>
          <tbody>
            {volumes.map((row) => {
              const best = row.valueA > row.valueB ? "A" : row.valueB > row.valueA ? "B" : "equal";
              return (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.label}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right",
                    best === "A" ? "bg-green-500/10 font-semibold text-green-600 dark:text-green-400" : "text-foreground"
                  )}>
                    {fmtValue(row.valueA, row.format)}
                  </td>
                  <td className={cn(
                    "px-4 py-2.5 text-right",
                    best === "B" ? "bg-green-500/10 font-semibold text-green-600 dark:text-green-400" : "text-foreground"
                  )}>
                    {fmtValue(row.valueB, row.format)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ratios */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">Ratios de transformation</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Ratio</th>
              <th className="px-4 py-2.5 text-right">{labelA}</th>
              <th className="px-4 py-2.5 text-right">{labelB}</th>
            </tr>
          </thead>
          <tbody>
            {ratios.map((row) => {
              const best = row.valueA < row.valueB ? "A" : row.valueB < row.valueA ? "B" : "equal";
              return (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.label}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right",
                    best === "A" ? "bg-green-500/10 font-semibold text-green-600 dark:text-green-400" : "text-foreground"
                  )}>
                    {fmtRatio(row.valueA)}
                  </td>
                  <td className={cn(
                    "px-4 py-2.5 text-right",
                    best === "B" ? "bg-green-500/10 font-semibold text-green-600 dark:text-green-400" : "text-foreground"
                  )}>
                    {fmtRatio(row.valueB)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Aggregate results for a group of users ─────────────────────────────────

function aggregateResults(userIds: string[], allResults: PeriodResults[]): PeriodResults | null {
  const latestByUser = new Map<string, PeriodResults>();
  for (const r of allResults) {
    if (!userIds.includes(r.userId)) continue;
    const existing = latestByUser.get(r.userId);
    if (!existing || r.periodStart > existing.periodStart) {
      latestByUser.set(r.userId, r);
    }
  }
  if (latestByUser.size === 0) return null;

  const results = Array.from(latestByUser.values());
  const sum = (fn: (r: PeriodResults) => number) => results.reduce((s, r) => s + fn(r), 0);

  return {
    id: "agg",
    userId: "agg",
    periodType: "month",
    periodStart: results[0].periodStart,
    periodEnd: results[0].periodEnd,
    prospection: {
      contactsTotaux: sum((r) => r.prospection?.contactsTotaux ?? 0),
      rdvEstimation: sum((r) => r.prospection?.rdvEstimation ?? 0),
    },
    vendeurs: {
      rdvEstimation: sum((r) => r.vendeurs?.rdvEstimation ?? 0),
      estimationsRealisees: sum((r) => r.vendeurs?.estimationsRealisees ?? 0),
      mandatsSignes: sum((r) => r.vendeurs?.mandatsSignes ?? 0),
      mandats: results.flatMap((r) => r.vendeurs?.mandats ?? []),
      rdvSuivi: sum((r) => r.vendeurs?.rdvSuivi ?? 0),
      requalificationSimpleExclusif: sum((r) => r.vendeurs?.requalificationSimpleExclusif ?? 0),
      baissePrix: sum((r) => r.vendeurs?.baissePrix ?? 0),
    },
    acheteurs: {
      acheteursSortisVisite: sum((r) => r.acheteurs?.acheteursSortisVisite ?? 0),
      nombreVisites: sum((r) => r.acheteurs?.nombreVisites ?? 0),
      offresRecues: sum((r) => r.acheteurs?.offresRecues ?? 0),
      compromisSignes: sum((r) => r.acheteurs?.compromisSignes ?? 0),
      chiffreAffairesCompromis: sum((r) => r.acheteurs?.chiffreAffairesCompromis ?? 0),
    },
    ventes: {
      actesSignes: sum((r) => r.ventes?.actesSignes ?? 0),
      chiffreAffaires: sum((r) => r.ventes?.chiffreAffaires ?? 0),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ManagerComparaisonPage() {
  const [tab, setTab] = useState<TabType>("conseillers");
  const { user } = useUser();
  const allResults = useAllResults();
  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const institutions = useAppStore((s) => s.institutions);

  // Manager's institution and team
  const myInstitutionId = user?.institutionId;
  const myTeamId = user?.teamId;

  // All conseillers in the same institution
  const institutionConseillers = useMemo(() =>
    users.filter((u) =>
      u.role === "conseiller" &&
      u.institutionId === myInstitutionId
    ),
    [users, myInstitutionId]
  );

  // Teams in the same institution (excluding mine)
  const otherTeams = useMemo(() => {
    // Find all teams for this institution from teamInfos
    const instTeams = teamInfos.filter((t) => t.institutionId === myInstitutionId && t.id !== myTeamId);
    if (instTeams.length > 0) return instTeams;

    // Fallback: derive teams from user data
    const teamIds = new Set<string>();
    users.forEach((u) => {
      if (u.institutionId === myInstitutionId && u.teamId && u.teamId !== myTeamId) {
        teamIds.add(u.teamId);
      }
    });
    return Array.from(teamIds).map((tid) => {
      const manager = users.find((u) => u.teamId === tid && (u.role === "manager" || u.role === "directeur"));
      return { id: tid, name: manager ? `Équipe de ${manager.firstName}` : tid, institutionId: myInstitutionId ?? "", managerId: manager?.id ?? "", inviteCode: "" };
    });
  }, [teamInfos, users, myInstitutionId, myTeamId]);

  // My team members (conseillers)
  const myTeamMembers = useMemo(() =>
    users.filter((u) => u.teamId === myTeamId && u.role === "conseiller"),
    [users, myTeamId]
  );

  // ── Tab 1: Comparer deux conseillers ──
  const [advisorAId, setAdvisorAId] = useState("");
  const [advisorBId, setAdvisorBId] = useState("");

  const userA = users.find((u) => u.id === advisorAId);
  const userB = users.find((u) => u.id === advisorBId);
  const resultsA = useMemo(() => allResults.find((r) => r.userId === advisorAId) ?? null, [allResults, advisorAId]);
  const resultsB = useMemo(() => allResults.find((r) => r.userId === advisorBId) ?? null, [allResults, advisorBId]);

  // Auto-select first two conseillers
  const effectiveAdvisorA = advisorAId || institutionConseillers[0]?.id || "";
  const effectiveAdvisorB = advisorBId || institutionConseillers[1]?.id || "";

  // ── Tab 2: Mon équipe vs autre ──
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const effectiveTeamId = selectedTeamId || otherTeams[0]?.id || "";

  const myTeamIds = useMemo(() => myTeamMembers.map((u) => u.id), [myTeamMembers]);
  const otherTeamMemberIds = useMemo(() =>
    users.filter((u) => u.teamId === effectiveTeamId && u.role === "conseiller").map((u) => u.id),
    [users, effectiveTeamId]
  );

  const myTeamAgg = useMemo(() => aggregateResults(myTeamIds, allResults), [myTeamIds, allResults]);
  const otherTeamAgg = useMemo(() => aggregateResults(otherTeamMemberIds, allResults), [otherTeamMemberIds, allResults]);

  const myTeamName = useMemo(() => {
    const mgr = users.find((u) => u.teamId === myTeamId && (u.role === "manager" || u.role === "directeur"));
    return mgr ? `Équipe de ${mgr.firstName}` : "Mon équipe";
  }, [users, myTeamId]);

  const otherTeamName = useMemo(() => {
    const team = otherTeams.find((t) => t.id === effectiveTeamId);
    return team?.name ?? "Autre équipe";
  }, [otherTeams, effectiveTeamId]);

  // ── Tab 1 data with effective IDs ──
  const effUserA = users.find((u) => u.id === effectiveAdvisorA);
  const effUserB = users.find((u) => u.id === effectiveAdvisorB);
  const effResultsA = useMemo(() => allResults.find((r) => r.userId === effectiveAdvisorA) ?? null, [allResults, effectiveAdvisorA]);
  const effResultsB = useMemo(() => allResults.find((r) => r.userId === effectiveAdvisorB) ?? null, [allResults, effectiveAdvisorB]);

  const tab1Volumes = useMemo(() =>
    buildVolumeRows(extractVolumes(effResultsA, "A"), extractVolumes(effResultsB, "B")),
    [effResultsA, effResultsB]
  );
  const tab1Ratios = useMemo(() =>
    extractRatioRows(effResultsA, effUserA, effResultsB, effUserB, ratioConfigs),
    [effResultsA, effUserA, effResultsB, effUserB, ratioConfigs]
  );

  // ── Tab 2 data ──
  const tab2Volumes = useMemo(() =>
    buildVolumeRows(extractVolumes(myTeamAgg, "A"), extractVolumes(otherTeamAgg, "B")),
    [myTeamAgg, otherTeamAgg]
  );
  // For team ratios, use a synthetic "confirme" user for computation
  const dummyUser = { category: "confirme" as const } as User;
  const tab2Ratios = useMemo(() =>
    extractRatioRows(myTeamAgg, dummyUser, otherTeamAgg, dummyUser, ratioConfigs),
    [myTeamAgg, otherTeamAgg, ratioConfigs]
  );

  // ── Classement NXT (reuse from agent page) ──
  const leaderboard = useMemo(() => {
    const conseillers = users.filter((u) => u.role === "conseiller" || u.role === "manager");
    const entries = conseillers.map((u) => {
      const userResults = allResults.filter((r) => r.userId === u.id);
      const totalCA = userResults.reduce((sum, r) => sum + (r.ventes?.chiffreAffaires ?? 0), 0);
      const totalMandats = userResults.reduce((sum, r) => sum + (r.vendeurs?.mandatsSignes ?? 0), 0);
      return { userId: u.id, prenom: u.firstName, ca: totalCA, mandats: totalMandats };
    });
    return entries.sort((a, b) => b.ca - a.ca).slice(0, 20);
  }, [users, allResults]);

  const tabs: { id: TabType; label: string }[] = [
    { id: "conseillers", label: "Comparer deux conseillers" },
    { id: "equipes", label: "Mon équipe vs autre équipe" },
    { id: "classement", label: "Classement NXT" },
    { id: "dpi", label: "Comparaison DPI" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Comparaison</h1>

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== ONGLET 1 — Comparer deux conseillers ========== */}
      {tab === "conseillers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Conseiller A</label>
              <select
                value={effectiveAdvisorA}
                onChange={(e) => setAdvisorAId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {institutionConseillers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.teamId === myTeamId ? " (mon équipe)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Conseiller B</label>
              <select
                value={effectiveAdvisorB}
                onChange={(e) => setAdvisorBId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {institutionConseillers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.teamId === myTeamId ? " (mon équipe)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {institutionConseillers.length < 2 ? (
            <EmptyState message="Pas assez de conseillers dans l'agence pour effectuer une comparaison." />
          ) : !effResultsA || !effResultsB ? (
            <EmptyState message="Données insuffisantes pour l'un des conseillers sélectionnés." />
          ) : (
            <ComparisonTable
              labelA={effUserA ? `${effUserA.firstName} ${effUserA.lastName}` : "Conseiller A"}
              labelB={effUserB ? `${effUserB.firstName} ${effUserB.lastName}` : "Conseiller B"}
              volumes={tab1Volumes}
              ratios={tab1Ratios}
            />
          )}
        </div>
      )}

      {/* ========== ONGLET 2 — Mon équipe vs autre équipe ========== */}
      {tab === "equipes" && (
        <div className="space-y-6">
          {otherTeams.length === 0 ? (
            <EmptyState message="Aucune autre équipe à comparer dans votre agence." />
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Comparer avec</label>
                <select
                  value={effectiveTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {otherTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {!myTeamAgg || !otherTeamAgg ? (
                <EmptyState message="Données insuffisantes pour comparer les équipes." />
              ) : (
                <ComparisonTable
                  labelA={myTeamName}
                  labelB={otherTeamName}
                  volumes={tab2Volumes}
                  ratios={tab2Ratios}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ========== ONGLET 3 — Classement NXT ========== */}
      {tab === "classement" && (
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
                  const isMe = entry.userId === user?.id;
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
        </div>
      )}

      {/* ========== ONGLET 4 — Comparaison DPI ========== */}
      {tab === "dpi" && (
        <DPIComparisonView />
      )}
    </div>
  );
}
