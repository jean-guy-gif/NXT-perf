"use client";

import { useState } from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ListChecks,
  BarChart3,
  Lightbulb,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/charts/progress-bar";
import { getActionsForRatio } from "@/lib/formation";
import type { RatioId, ComputedRatio, RatioConfig } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

interface RatioDrillDownModalProps {
  ratioId: RatioId;
  computedRatio: ComputedRatio;
  ratioConfig: RatioConfig;
  results: PeriodResults;
  onClose: () => void;
}

const statusConfig = {
  ok: {
    icon: CheckCircle,
    label: "Conforme",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
  },
  danger: {
    icon: XCircle,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
  },
};

type Tab = "details" | "actions";

function RatioDetailContent({
  ratioId,
  results,
}: {
  ratioId: RatioId;
  results: PeriodResults;
}) {
  const { prospection, vendeurs, acheteurs, ventes } = results;

  switch (ratioId) {
    case "contacts_rdv":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Contacts totaux" value={prospection.contactsTotaux} />
            <Metric label="Contacts entrants" value={prospection.contactsEntrants} />
            <Metric label="RDV estimation" value={prospection.rdvEstimation} />
          </div>
          <ItemList
            title="Informations vente"
            items={prospection.informationsVente.map((v) => ({
              id: v.id,
              primary: v.nom,
              secondary: v.commentaire,
              badge: v.statut,
            }))}
          />
        </div>
      );

    case "estimations_mandats":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Estimations réalisées" value={vendeurs.estimationsRealisees} />
            <Metric label="Mandats signés" value={vendeurs.mandatsSignes} />
          </div>
          <ItemList
            title="Mandats"
            items={vendeurs.mandats.map((m) => ({
              id: m.id,
              primary: m.nomVendeur,
              secondary: m.type === "exclusif" ? "Exclusif" : "Simple",
              badge: m.type,
            }))}
          />
        </div>
      );

    case "pct_mandats_exclusifs": {
      const exclusifs = vendeurs.mandats.filter((m) => m.type === "exclusif");
      const simples = vendeurs.mandats.filter((m) => m.type === "simple");
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Exclusifs" value={exclusifs.length} />
            <Metric label="Simples" value={simples.length} />
            <Metric label="Total" value={vendeurs.mandats.length} />
          </div>
          <ItemList
            title="Mandats"
            items={vendeurs.mandats.map((m) => ({
              id: m.id,
              primary: m.nomVendeur,
              secondary: m.type === "exclusif" ? "Exclusif" : "Simple",
              badge: m.type,
            }))}
          />
        </div>
      );
    }

    case "visites_offre":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Nombre de visites" value={acheteurs.nombreVisites} />
            <Metric label="Offres reçues" value={acheteurs.offresRecues} />
          </div>
          <ItemList
            title="Acheteurs chauds"
            items={acheteurs.acheteursChauds.map((a) => ({
              id: a.id,
              primary: a.nom,
              secondary: a.commentaire,
              badge: a.statut,
            }))}
          />
        </div>
      );

    case "offres_compromis":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Offres reçues" value={acheteurs.offresRecues} />
            <Metric label="Compromis signés" value={acheteurs.compromisSignes} />
          </div>
          <ItemList
            title="Acheteurs chauds"
            items={acheteurs.acheteursChauds.map((a) => ({
              id: a.id,
              primary: a.nom,
              secondary: a.commentaire,
              badge: a.statut,
            }))}
          />
        </div>
      );

    case "mandats_simples_vente": {
      const simples = vendeurs.mandats.filter((m) => m.type === "simple");
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Mandats simples" value={simples.length} />
            <Metric label="Actes signés" value={ventes.actesSignes} />
          </div>
          <ItemList
            title="Mandats simples"
            items={simples.map((m) => ({
              id: m.id,
              primary: m.nomVendeur,
              secondary: "Simple",
              badge: m.type,
            }))}
          />
        </div>
      );
    }

    case "mandats_exclusifs_vente": {
      const exclusifs = vendeurs.mandats.filter((m) => m.type === "exclusif");
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Mandats exclusifs" value={exclusifs.length} />
            <Metric label="Actes signés" value={ventes.actesSignes} />
          </div>
          <ItemList
            title="Mandats exclusifs"
            items={exclusifs.map((m) => ({
              id: m.id,
              primary: m.nomVendeur,
              secondary: "Exclusif",
              badge: m.type,
            }))}
          />
        </div>
      );
    }
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  exclusif: "bg-primary/10 text-primary",
  simple: "bg-muted text-muted-foreground",
  en_cours: "bg-blue-500/10 text-blue-500",
  deale: "bg-green-500/10 text-green-500",
  abandonne: "bg-red-500/10 text-red-500",
};

function ItemList({
  title,
  items,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; badge: string }[];
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">Aucun élément</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">
        {title} ({items.length})
      </p>
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-foreground">
                {item.primary}
              </span>
            </div>
            <span
              className={cn(
                "ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                badgeColors[item.badge] ?? "bg-muted text-muted-foreground"
              )}
            >
              {item.secondary}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RatioDrillDownModal({
  ratioId,
  computedRatio,
  ratioConfig,
  results,
  onClose,
}: RatioDrillDownModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const sc = statusConfig[computedRatio.status];
  const StatusIcon = sc.icon;
  const actions = getActionsForRatio(ratioId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {ratioConfig.name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  sc.bg,
                  sc.color
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {sc.label}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Value + Progress */}
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-baseline justify-between">
            <span className={cn("text-3xl font-bold", sc.color)}>
              {ratioConfig.isPercentage
                ? `${Math.round(computedRatio.value)}%`
                : computedRatio.value.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              Objectif :{" "}
              <span className="font-semibold text-foreground">
                {ratioConfig.isPercentage
                  ? `${computedRatio.thresholdForCategory}%`
                  : `${computedRatio.thresholdForCategory} ${ratioConfig.unit}`}
              </span>
            </span>
          </div>
          <ProgressBar
            value={computedRatio.percentageOfTarget}
            status={computedRatio.status}
            showValue
            className="mt-3"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "details"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Détails
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "actions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Actions
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === "details" ? (
            <RatioDetailContent ratioId={ratioId} results={results} />
          ) : (
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {action.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
