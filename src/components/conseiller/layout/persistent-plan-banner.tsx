"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2, ListTodo, ArrowRight } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { PLAN_30J_DURATION_DAYS } from "@/config/coaching";
import type { Plan30jPayload } from "@/config/coaching";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export function PersistentPlanBanner() {
  const { getActivePlan } = useImprovementResources();
  const activePlan = getActivePlan();

  const banner = useMemo(() => {
    if (!activePlan) return null;
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;

    const startedAt = new Date(activePlan.created_at);
    const elapsedDays = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
      )
    );

    const ratioId = payload.pain_ratio_id as ExpertiseRatioId;
    const expertise = RATIO_EXPERTISE[ratioId];
    const lever = expertise?.label ?? "Plan ciblé";

    return { lever, total, done, elapsedDays };
  }, [activePlan]);

  if (!banner) return null;

  const { lever, total, done, elapsedDays } = banner;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3">
      <Link
        href="/conseiller/ameliorer"
        className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Plan 30j en cours · {lever}
            </p>
            <p className="text-xs text-muted-foreground">
              J+{elapsedDays}/{PLAN_30J_DURATION_DAYS} ·{" "}
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {done}/{total} actions
              </span>
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Reprendre
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
