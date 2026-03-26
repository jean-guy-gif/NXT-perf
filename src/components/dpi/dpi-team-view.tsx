"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { MiniRadar } from "@/components/dpi/mini-radar";
import { cn } from "@/lib/utils";

const RATIO_LABELS: Record<string, string> = {
  contacts_rdv: "Prospection",
  estimations_mandats: "Mandatement",
  pct_mandats_exclusifs: "Exclusivité",
  visites_offre: "Transformation",
  offres_compromis: "Concrétisation",
  mandats_simples_vente: "Vente simple",
  mandats_exclusifs_vente: "Vente exclu.",
};

export function DPITeamView() {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);

  const teamMembers = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === currentUser?.teamId;
      return u.managerId === currentUser?.id;
    });
  }, [users, currentUser, isDemo]);

  const memberDPIs = useMemo(() => {
    return teamMembers.map((member) => {
      const results = allResults.find((r) => r.userId === member.id);
      const ratios = results ? computeAllRatios(results, member.category, ratioConfigs) : [];
      const axes = ratios.map((r) => ({
        label: RATIO_LABELS[r.ratioId] ?? r.ratioId,
        score: Math.min(100, Math.round(r.percentageOfTarget)),
      }));
      const globalScore = axes.length > 0 ? Math.round(axes.reduce((a, b) => a + b.score, 0) / axes.length) : 0;
      const status: "ok" | "warning" | "danger" = globalScore >= 80 ? "ok" : globalScore >= 60 ? "warning" : "danger";
      return { member, axes, globalScore, status };
    });
  }, [teamMembers, allResults, ratioConfigs]);

  const teamAvg = useMemo(() => {
    if (!memberDPIs.length) return 0;
    return Math.round(memberDPIs.reduce((a, m) => a + m.globalScore, 0) / memberDPIs.length);
  }, [memberDPIs]);

  if (!memberDPIs.length) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">Score DPI Équipe moyen</p>
          <span className={cn("text-2xl font-bold",
            teamAvg >= 80 ? "text-green-500" : teamAvg >= 60 ? "text-orange-500" : "text-red-500"
          )}>{teamAvg}/100</span>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          <span className="text-green-500 font-medium">{memberDPIs.filter((m) => m.status === "ok").length} conformes</span>
          <span className="text-orange-500 font-medium">{memberDPIs.filter((m) => m.status === "warning").length} vigilance</span>
          <span className="text-red-500 font-medium">{memberDPIs.filter((m) => m.status === "danger").length} sous-perf</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {memberDPIs.map(({ member, axes, globalScore, status }) => {
          const color = status === "ok" ? "#39C97E" : status === "warning" ? "#FFA448" : "#EF7550";
          return (
            <div key={member.id} className={cn(
              "rounded-xl border bg-card p-3 text-center",
              status === "ok" ? "border-green-500/30" : status === "warning" ? "border-orange-500/30" : "border-red-500/30"
            )}>
              <div className="flex justify-center mb-2">
                <MiniRadar scores={axes} color={color} size={80} />
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {member.firstName} {member.lastName.charAt(0)}.
              </p>
              <p className={cn("text-lg font-bold mt-0.5",
                status === "ok" ? "text-green-500" : status === "warning" ? "text-orange-500" : "text-red-500"
              )}>{globalScore}/100</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
