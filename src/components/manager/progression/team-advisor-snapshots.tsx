"use client";

import { useMemo } from "react";
import { ChevronRight, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useManagerView } from "@/hooks/use-manager-view";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { CATEGORY_LABELS, CATEGORY_OBJECTIVES } from "@/lib/constants";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  determineRhythmStatus,
  getProRationFactor,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

/**
 * TeamAdvisorSnapshots — liste des conseillers à suivre
 * (PR3.8.6 — Manager Collectif).
 *
 * Pour chaque conseiller :
 *   - nom + niveau
 *   - statut rythme global (calculé sur le pire des 4 indicateurs ci-dessous)
 *   - indicateur le plus en retard à date
 *
 * Clic → setMode("individual") + selectAdvisor(c.id) → la même page
 * `/manager/progression` rend alors la vue Conseiller via ConseillerProxy
 * (PR3.8.5).
 */

interface IndicatorDef {
  key: string;
  label: string;
  read: (r: PeriodResults) => number;
  target: (cat: keyof typeof CATEGORY_OBJECTIVES) => number;
}

// Mêmes 4 indicateurs que TeamProductionTrends — cohérence du signal.
const INDICATORS: IndicatorDef[] = [
  {
    key: "contacts",
    label: "Contacts",
    read: (r) => r.prospection.contactsTotaux,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).estimations *
      15,
  },
  {
    key: "mandats",
    label: "Mandats",
    read: (r) => r.vendeurs.mandatsSignes,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).mandats,
  },
  {
    key: "visites",
    label: "Visites",
    read: (r) => r.acheteurs.nombreVisites,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).visites,
  },
  {
    key: "actes",
    label: "Actes",
    read: (r) => r.ventes.actesSignes,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).actes,
  },
];

const RHYTHM_PILL: Record<RhythmStatus, string> = {
  ahead: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  on_track: "bg-muted text-muted-foreground",
  behind: "bg-red-500/10 text-red-600 dark:text-red-500",
};

interface AdvisorRow {
  user: User;
  rhythm: RhythmStatus;
  worstLabel: string | null;
  worstPct: number;
}

export function TeamAdvisorSnapshots() {
  const { conseillers, perConseillerResults } = useTeamResults();
  const { setMode, selectAdvisor } = useManagerView();

  const rows = useMemo<AdvisorRow[]>(() => {
    if (conseillers.length === 0) return [];
    const today = new Date();
    const factor = getProRationFactor(today);

    return conseillers
      .map((c) => {
        const results = perConseillerResults.get(c.id);
        if (!results) {
          return {
            user: c,
            rhythm: "on_track" as RhythmStatus,
            worstLabel: null,
            worstPct: 100,
          };
        }
        const cat = c.category as keyof typeof CATEGORY_OBJECTIVES;

        let worstPct = Number.POSITIVE_INFINITY;
        let worstLabel: string | null = null;
        let anyBehind = false;
        let allAhead = true;

        for (const ind of INDICATORS) {
          const monthly = ind.target(cat);
          if (monthly <= 0) continue;
          const toDate = Math.max(1, Math.ceil(monthly * factor));
          const realised = ind.read(results);
          const pct = (realised / toDate) * 100;
          if (pct < worstPct) {
            worstPct = pct;
            worstLabel = ind.label;
          }
          const status = determineRhythmStatus(realised, toDate);
          if (status === "behind") anyBehind = true;
          if (status !== "ahead") allAhead = false;
        }

        const rhythm: RhythmStatus = anyBehind
          ? "behind"
          : allAhead
            ? "ahead"
            : "on_track";

        return {
          user: c,
          rhythm,
          worstLabel,
          worstPct: Math.round(Number.isFinite(worstPct) ? worstPct : 100),
        };
      })
      .sort((a, b) => {
        // Tri : behind d'abord, puis on_track, puis ahead. Au sein du groupe :
        // pct ascendant (le plus en retard en haut).
        const order: Record<RhythmStatus, number> = {
          behind: 0,
          on_track: 1,
          ahead: 2,
        };
        const oa = order[a.rhythm];
        const ob = order[b.rhythm];
        if (oa !== ob) return oa - ob;
        return a.worstPct - b.worstPct;
      });
  }, [conseillers, perConseillerResults]);

  if (rows.length === 0) return null;

  const handleClick = (advisorId: string) => {
    selectAdvisor(advisorId);
    setMode("individual");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Conseillers à suivre
        </h3>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const fullName = `${row.user.firstName} ${row.user.lastName}`;
          const level = CATEGORY_LABELS[row.user.category] ?? row.user.category;
          return (
            <li key={row.user.id}>
              <button
                type="button"
                onClick={() => handleClick(row.user.id)}
                className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                aria-label={`Voir la vue individuelle de ${fullName}`}
              >
                <UserAvatar
                  src={row.user.avatarUrl}
                  name={fullName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {level}
                    {row.worstLabel && row.rhythm !== "ahead" && (
                      <>
                        {" • Le plus en retard : "}
                        <span className="font-medium text-foreground">
                          {row.worstLabel}
                        </span>{" "}
                        ({row.worstPct}%)
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    RHYTHM_PILL[row.rhythm],
                  )}
                >
                  {RHYTHM_LABEL[row.rhythm]}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
