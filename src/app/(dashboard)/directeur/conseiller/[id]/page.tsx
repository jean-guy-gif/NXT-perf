"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  FileSignature,
  FileCheck,
  DollarSign,
  Phone,
  Users,
  ClipboardCheck,
  Gauge,
} from "lucide-react";
import { ProgressBar } from "@/components/charts/progress-bar";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import type { RatioId } from "@/types/ratios";
import { cn } from "@/lib/utils";

const RATIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contacts_rdv: Phone,
  rdv_mandats: FileSignature,
  pct_mandats_exclusifs: ClipboardCheck,
  acheteurs_visites: Users,
  visites_offre: Users,
  offres_compromis: FileCheck,
  compromis_actes: FileCheck,
  honoraires_moyens: FileSignature,
};

export default function ConseillerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "mois";

  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();
  const teams = useAppStore((s) => s.users);

  const user = users.find((u) => u.id === id);
  const results = allResults.find((r) => r.userId === id);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg text-muted-foreground">Conseiller introuvable</p>
        <Link
          href="/directeur/pilotage"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au pilotage
        </Link>
      </div>
    );
  }

  const ratios = results
    ? computeAllRatios(results, user.category, ratioConfigs)
    : [];
  const avgPerf =
    ratios.length > 0
      ? Math.round(
          ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length
        )
      : 0;

  const teamUser = teams.find(
    (u) => (u.role === "manager" || u.role === "directeur") && u.teamId === user.teamId
  );
  const teamName = teamUser
    ? `Équipe ${teamUser.firstName} ${teamUser.lastName}`
    : "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/directeur/pilotage" className="hover:text-foreground transition-colors">
          Pilotage Agence
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Conseiller</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">
          {user.firstName} {user.lastName}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {teamName && <span>{teamName}</span>}
              {teamName && <span>·</span>}
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
        </div>
        <Link
          href={`/directeur/pilotage`}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au pilotage
        </Link>
      </div>

      {/* Performance overview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Performance globale
          </h2>
          <span
            className={cn(
              "ml-auto text-2xl font-bold",
              avgPerf >= 80
                ? "text-green-500"
                : avgPerf >= 60
                  ? "text-orange-500"
                  : "text-red-500"
            )}
          >
            {avgPerf} %
          </span>
        </div>
        <ProgressBar
          value={avgPerf}
          status={
            avgPerf >= 80 ? "ok" : avgPerf >= 60 ? "warning" : "danger"
          }
          showValue={false}
          size="md"
        />
      </div>

      {/* KPI Grid */}
      {results && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <KpiTile
            label="Estimations"
            value={String(results.vendeurs.estimationsRealisees)}
            icon={FileSignature}
          />
          <KpiTile
            label="Mandats"
            value={String(results.vendeurs.mandats.length)}
            icon={ClipboardCheck}
          />
          <KpiTile
            label="Actes signés"
            value={String(results.ventes.actesSignes)}
            icon={FileCheck}
          />
          <KpiTile
            label="Contacts"
            value={String(results.prospection.contactsTotaux)}
            icon={Phone}
          />
          <KpiTile
            label="CA Actes Auth."
            value={formatCurrency(results.ventes.chiffreAffaires)}
            icon={DollarSign}
            highlight
          />
          <KpiTile
            label="Compromis"
            value={String(results.acheteurs.compromisSignes)}
            icon={FileCheck}
          />
          <KpiTile
            label="Visites"
            value={String(results.acheteurs.nombreVisites)}
            icon={Users}
          />
          <KpiTile
            label="Offres reçues"
            value={String(results.acheteurs.offresRecues)}
            icon={ClipboardCheck}
          />
        </div>
      )}

      {/* Ratios */}
      {ratios.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Détail des 7 ratios
          </h2>
          <div className="space-y-4">
            {ratios.map((ratio) => {
              const config = ratioConfigs[ratio.ratioId as RatioId];
              const Icon = RATIO_ICONS[ratio.ratioId] ?? Gauge;
              return (
                <div
                  key={ratio.ratioId}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        ratio.status === "ok"
                          ? "bg-green-500/15 text-green-500"
                          : ratio.status === "warning"
                            ? "bg-orange-500/15 text-orange-500"
                            : "bg-red-500/15 text-red-500"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {config.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valeur : {ratio.value.toFixed(2)} — Seuil{" "}
                        {CATEGORY_LABELS[user.category]} :{" "}
                        {config.thresholds[user.category].toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:w-56">
                    <div className="flex-1">
                      <ProgressBar
                        value={Math.min(ratio.percentageOfTarget, 150)}
                        status={ratio.status}
                        showValue={false}
                        size="sm"
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold w-14 text-right",
                        ratio.status === "ok"
                          ? "text-green-500"
                          : ratio.status === "warning"
                            ? "text-orange-500"
                            : "text-red-500"
                      )}
                    >
                      {ratio.percentageOfTarget}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "text-xl font-bold",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
