"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import {
  Award,
  Trophy,
  Medal,
  TrendingDown,
  Download,
  User as UserIcon,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { AvatarDisplay } from "@/components/profile/avatar-upload";
import { PeriodSelector } from "@/components/ui/period-selector";
import { aggregateResults } from "@/lib/aggregate-results";
import { formatCurrency } from "@/lib/formatters";
import { computeAllRatios } from "@/lib/ratios";
import { computeDPIAxes, computeGlobalDPIScore } from "@/lib/dpi-axes";
import { computeExclusivityRate } from "@/lib/comparison";
import {
  COMPARISON_PERIOD_OPTIONS,
  formatPeriodRange,
  getPeriodBounds,
  type ComparisonPeriod,
} from "@/lib/date-periods";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

type RankSubMode = "conseillers" | "equipes";

type ToastState = { type: "success" | "error" | "info"; message: string } | null;

/**
 * Retourne la couleur de fond du dashboard pour aligner l'export JPEG sur le
 * rendu écran (light → blanc, dark → --agency-dark dynamique selon thème agence).
 * SSR-safe : fallback #1A1A2E hors browser.
 */
function getDashboardBackgroundColor(): string {
  if (typeof window === "undefined") return "#1A1A2E";
  const html = document.documentElement;
  if (!html.classList.contains("dark")) return "#ffffff";
  const agencyDark = getComputedStyle(html).getPropertyValue("--agency-dark").trim();
  return agencyDark || "#1A1A2E";
}

type MetricKey =
  | "ca"
  | "actes"
  | "mandats"
  | "estimations"
  | "contacts"
  | "visites"
  | "exclusivite"
  | "dpi";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "ca", label: "CA Acte" },
  { key: "actes", label: "Nombre actes" },
  { key: "mandats", label: "Nombre mandats" },
  { key: "estimations", label: "Estimations réalisées" },
  { key: "contacts", label: "Contacts totaux" },
  { key: "visites", label: "Visites" },
  { key: "exclusivite", label: "% Exclusivité" },
  { key: "dpi", label: "Score DPI" },
];

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const RANK_BG = [
  "border-yellow-500/30 bg-yellow-500/5",
  "border-gray-400/30 bg-gray-400/5",
  "border-orange-600/30 bg-orange-600/5",
];

interface RankingEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  meta?: string; // ex: "5 conseillers" pour équipes
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function metricValue(
  agg: PeriodResults | null,
  metric: MetricKey,
  user: User | null,
  ratioConfigs: ReturnType<typeof useAppStore.getState>["ratioConfigs"],
): number {
  if (!agg) return 0;
  switch (metric) {
    case "ca":
      return agg.ventes.chiffreAffaires;
    case "actes":
      return agg.ventes.actesSignes;
    case "mandats":
      return agg.vendeurs.mandatsSignes;
    case "estimations":
      return agg.vendeurs.estimationsRealisees;
    case "contacts":
      return agg.prospection.contactsTotaux;
    case "visites":
      return agg.acheteurs.nombreVisites;
    case "exclusivite":
      return computeExclusivityRate(agg);
    case "dpi": {
      const category = user?.category ?? "confirme";
      const ratios = computeAllRatios(agg, category, ratioConfigs);
      const axes = computeDPIAxes(agg, category, ratios);
      return computeGlobalDPIScore(axes);
    }
  }
}

function formatMetricValue(value: number, metric: MetricKey): string {
  if (metric === "ca") return formatCurrency(value);
  if (metric === "exclusivite" || metric === "dpi") return `${value}%`;
  return value.toLocaleString("fr-FR");
}

export function EnrichedLeaderboardTab() {
  const { user: currentUser } = useUser();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const [subMode, setSubMode] = useState<RankSubMode>("conseillers");
  const [metric, setMetric] = useState<MetricKey>("ca");
  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const myInstitutionId = currentUser?.institutionId;

  // Conseillers ranking — institution-scoped
  const conseillerRankings = useMemo<RankingEntry[]>(() => {
    if (subMode !== "conseillers") return [];
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const conseillers = users.filter(
      (u) => u.role === "conseiller" && u.institutionId === myInstitutionId,
    );
    const entries: RankingEntry[] = conseillers.map((u) => {
      const inPeriod = allResults.filter((r) => {
        if (r.userId !== u.id) return false;
        const ts = new Date(r.periodStart).getTime();
        return ts >= startMs && ts <= endMs;
      });
      const agg = aggregateResults(inPeriod);
      const value = metricValue(agg, metric, u, ratioConfigs);
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        avatarUrl: u.avatarUrl,
        value,
      };
    });
    return entries.sort((a, b) => b.value - a.value);
  }, [subMode, users, allResults, myInstitutionId, periodBounds, metric, ratioConfigs]);

  // Equipes ranking — institution-scoped
  const teamRankings = useMemo<RankingEntry[]>(() => {
    if (subMode !== "equipes") return [];
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const teams = teamInfos.filter((t) => t.institutionId === myInstitutionId);
    if (teams.length === 0) {
      const teamIds = new Set<string>();
      users.forEach((u) => {
        if (u.institutionId === myInstitutionId && u.teamId) teamIds.add(u.teamId);
      });
      const fallback = Array.from(teamIds).map((tid) => {
        const mgr = users.find(
          (u) => u.teamId === tid && (u.role === "manager" || u.role === "directeur"),
        );
        return {
          id: tid,
          name: mgr ? `Équipe de ${mgr.firstName}` : tid,
          institutionId: myInstitutionId ?? "",
          managerId: mgr?.id ?? "",
          inviteCode: "",
        };
      });
      teams.push(...fallback);
    }

    const entries: RankingEntry[] = teams.map((team) => {
      const conseillers = users.filter(
        (u) => u.teamId === team.id && u.role === "conseiller",
      );
      const ids = conseillers.map((u) => u.id);
      const inPeriod = allResults.filter((r) => {
        if (!ids.includes(r.userId)) return false;
        const ts = new Date(r.periodStart).getTime();
        return ts >= startMs && ts <= endMs;
      });
      const agg = aggregateResults(inPeriod);

      // For team-level "exclusivite" / "dpi", use confirme as reference category
      const refUser = (conseillers[0] as User | undefined) ?? null;
      const value = metricValue(agg, metric, refUser, ratioConfigs);
      return {
        id: team.id,
        name: team.name,
        avatarUrl: undefined,
        value,
        meta: `${conseillers.length} conseiller${conseillers.length > 1 ? "s" : ""}`,
      };
    });
    return entries.sort((a, b) => b.value - a.value);
  }, [subMode, teamInfos, users, allResults, myInstitutionId, periodBounds, metric, ratioConfigs]);

  const rankings = subMode === "conseillers" ? conseillerRankings : teamRankings;

  const top3 = rankings.slice(0, 3);
  const bottom3 = subMode === "conseillers" ? [...rankings].reverse().slice(0, 3) : [];

  const handleExportJpeg = useCallback(async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    // Force un commit DOM (rendre le header conditionnel `exporting && ...`)
    // avant la capture toJpeg — sinon React n'a pas encore peint le header.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.92,
        backgroundColor: getDashboardBackgroundColor(),
        cacheBust: true,
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;
      a.download = `classement-${subMode}-${metricLabel.toLowerCase().replace(/\s/g, "-")}.jpg`;
      a.click();
      showToast("success", "Export JPEG téléchargé");
    } catch (err) {
      console.error("[leaderboard] Export JPEG failed:", err);
      showToast("error", "L'export JPEG est temporairement indisponible. Une mise à jour est en cours.");
    } finally {
      setExporting(false);
    }
  }, [exporting, metric, subMode, showToast]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {toast && (
        <div className="mb-4">
          <Toast state={toast} onDismiss={() => setToast(null)} />
        </div>
      )}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Award className="h-3.5 w-3.5" />
        Classement
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">Classement de votre agence</h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Classement de vos collaborateurs et équipes au sein de votre agence. Triez par
        KPI, période et niveau, exportez en image pour le partager.
      </p>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-toggle Conseillers / Équipes */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setSubMode("conseillers")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                subMode === "conseillers"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UserIcon className="h-3.5 w-3.5" />
              Conseillers
            </button>
            <button
              type="button"
              onClick={() => setSubMode("equipes")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                subMode === "equipes"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              Équipes
            </button>
          </div>

          {/* Tri KPI */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                Trier par : {m.label}
              </option>
            ))}
          </select>

          {/* Période */}
          <PeriodSelector options={COMPARISON_PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          <span className="text-xs text-muted-foreground">({formatPeriodRange(periodBounds)})</span>
        </div>

        <button
          type="button"
          onClick={handleExportJpeg}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Export…" : "Exporter JPEG"}
        </button>
      </div>

      {/* Exportable area */}
      <div ref={exportRef} className="space-y-6">
        {/* Header contextuel — visible uniquement pendant l'export JPEG.
            Styles inline pour fiabilité html-to-image (pas de classes Tailwind purgeables). */}
        {exporting && (
          <div
            style={{
              padding: "32px 24px 24px",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: "24px",
            }}
          >
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              Classement de l&apos;agence
            </h1>
            <div
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.85)",
                marginBottom: "4px",
              }}
            >
              Classement par {METRICS.find((m) => m.key === metric)?.label ?? metric} ·{" "}
              {subMode === "conseillers" ? "Conseillers" : "Équipes"}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.65)",
                marginBottom: "12px",
              }}
            >
              {COMPARISON_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period} ·{" "}
              {formatPeriodRange(periodBounds)}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.45)",
                fontStyle: "italic",
              }}
            >
              Exporté le{" "}
              {new Date().toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        )}

        {/* Top 3 + À suivre (conseillers only) */}
        <div
          className={cn(
            "grid gap-6",
            subMode === "conseillers" ? "lg:grid-cols-2" : "",
          )}
        >
          {/* Top 3 */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 3
            </h3>
            {top3.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
            ) : (
              top3.map((entry, idx) => {
                const Icon = RANK_ICONS[idx] ?? Trophy;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-4",
                      RANK_BG[idx] ?? "border-border bg-card",
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                      <Icon className={cn("h-5 w-5", RANK_COLORS[idx] ?? "text-muted-foreground")} />
                    </div>
                    {subMode === "conseillers" && (
                      <AvatarDisplay
                        avatarUrl={entry.avatarUrl}
                        initials={getInitials(entry.name)}
                        size={40}
                        className="flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{entry.name}</p>
                      {entry.meta && <p className="text-xs text-muted-foreground">{entry.meta}</p>}
                      <p className="text-sm text-muted-foreground">#{idx + 1}</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatMetricValue(entry.value, metric)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* À suivre — conseillers only */}
          {subMode === "conseillers" && bottom3.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                <TrendingDown className="h-5 w-5 text-red-400" />
                À suivre
              </h3>
              {bottom3.map((entry) => {
                const idx = rankings.findIndex((r) => r.id === entry.id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-500">
                      {idx + 1}
                    </div>
                    <AvatarDisplay
                      avatarUrl={entry.avatarUrl}
                      initials={getInitials(entry.name)}
                      size={40}
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{entry.name}</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatMetricValue(entry.value, metric)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tableau complet */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {subMode === "conseillers" ? "Conseiller" : "Équipe"}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    {METRICS.find((m) => m.key === metric)?.label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Aucune donnée sur cette période.
                    </td>
                  </tr>
                ) : (
                  rankings.map((entry, idx) => {
                    const isMe = subMode === "conseillers" && entry.id === currentUser?.id;
                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          "border-b border-border/50 last:border-0 transition-colors",
                          isMe && "bg-primary/10 font-semibold",
                        )}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                              idx === 0
                                ? "bg-yellow-500/20 text-yellow-500"
                                : idx === 1
                                  ? "bg-gray-400/20 text-gray-400"
                                  : idx === 2
                                    ? "bg-orange-600/20 text-orange-600"
                                    : "text-muted-foreground",
                            )}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {subMode === "conseillers" && (
                              <AvatarDisplay
                                avatarUrl={entry.avatarUrl}
                                initials={getInitials(entry.name)}
                                size={36}
                                className="flex-shrink-0"
                              />
                            )}
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                {entry.name}
                                {isMe && (
                                  <span className="ml-2 text-xs font-normal text-primary">
                                    (vous)
                                  </span>
                                )}
                              </span>
                              {entry.meta && (
                                <p className="text-xs text-muted-foreground">{entry.meta}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-foreground">
                          {formatMetricValue(entry.value, metric)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// Pattern toast local — copie du composant inline défini dans
// src/components/formation/plan-30-jours.tsx (auto-dismiss 4s côté hook).
function Toast({ state, onDismiss }: { state: NonNullable<ToastState>; onDismiss: () => void }) {
  const styles =
    state.type === "success"
      ? { bg: "border-green-500/30 bg-green-500/5", Icon: CheckCircle2, iconClass: "text-green-500" }
      : state.type === "error"
        ? { bg: "border-red-500/30 bg-red-500/5", Icon: XCircle, iconClass: "text-red-500" }
        : { bg: "border-amber-500/30 bg-amber-500/5", Icon: AlertTriangle, iconClass: "text-amber-500" };
  const Icon = styles.Icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", styles.bg)}>
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", styles.iconClass)} />
      <p className="flex-1 text-sm text-foreground">{state.message}</p>
      <button
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Fermer
      </button>
    </div>
  );
}
