// @ts-nocheck
"use client";

import { useState } from "react";
import {
  X,
  Phone,
  Home,
  Users,
  DollarSign,
  History,
  Lightbulb,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSaisieTips } from "@/lib/formation";
import type { SaisieSection } from "@/lib/formation";
import type { PeriodResults } from "@/types/results";

interface SaisieDrillDownModalProps {
  section: SaisieSection;
  previousResults: PeriodResults | null;
  onClose: () => void;
}

const sectionConfig: Record<
  SaisieSection,
  { label: string; icon: typeof Phone; color: string; bg: string }
> = {
  prospection: {
    label: "Prospection",
    icon: Phone,
    color: "text-blue-500",
    bg: "bg-blue-500/15",
  },
  vendeurs: {
    label: "Vendeurs",
    icon: Home,
    color: "text-green-500",
    bg: "bg-green-500/15",
  },
  acheteurs: {
    label: "Acheteurs",
    icon: Users,
    color: "text-orange-500",
    bg: "bg-orange-500/15",
  },
  ventes: {
    label: "Ventes",
    icon: DollarSign,
    color: "text-purple-500",
    bg: "bg-purple-500/15",
  },
};

type Tab = "historique" | "conseils";

function Metric({ label, value }: { label: string; value: string | number }) {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function HistoriqueContent({
  section,
  results,
}: {
  section: SaisieSection;
  results: PeriodResults | null;
}) {
  if (!results) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune saisie précédente trouvée.
      </p>
    );
  }

  switch (section) {
    case "prospection":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Contacts totaux" value={results.prospection.contactsTotaux} />
            <Metric label="RDV estimation" value={results.prospection.rdvEstimation} />
          </div>
        </div>
      );

    case "vendeurs":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Estimations réalisées" value={results.vendeurs.estimationsRealisees} />
            <Metric label="Mandats signés" value={results.vendeurs.mandatsSignes} />
            <Metric label="RDV suivi" value={results.vendeurs.rdvSuivi} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Requalification" value={results.vendeurs.requalificationSimpleExclusif} />
            <Metric label="Baisse prix" value={results.vendeurs.baissePrix} />
          </div>
          <ItemList
            title="Mandats"
            items={results.vendeurs.mandats.map((m) => ({
              id: m.id,
              primary: m.nomVendeur,
              secondary: m.type === "exclusif" ? "Exclusif" : "Simple",
              badge: m.type,
            }))}
          />
        </div>
      );

    case "acheteurs":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Sortis en visite" value={results.acheteurs.acheteursSortisVisite} />
            <Metric label="Nombre de visites" value={results.acheteurs.nombreVisites} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Offres reçues" value={results.acheteurs.offresRecues} />
            <Metric label="Compromis signés" value={results.acheteurs.compromisSignes} />
            <Metric label="CA compromis" value={formatCurrency(results.acheteurs.chiffreAffairesCompromis)} />
          </div>
        </div>
      );

    case "ventes":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Actes signés" value={results.ventes.actesSignes} />
            <Metric label="Chiffre d'affaires" value={formatCurrency(results.ventes.chiffreAffaires)} />
          </div>
        </div>
      );
  }
}

export function SaisieDrillDownModal({
  section,
  previousResults,
  onClose,
}: SaisieDrillDownModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("historique");
  const config = sectionConfig[section];
  const SectionIcon = config.icon;
  const tips = getSaisieTips(section);

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
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                config.bg
              )}
            >
              <SectionIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {config.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("historique")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "historique"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Historique
          </button>
          <button
            onClick={() => setActiveTab("conseils")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "conseils"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Conseils
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === "historique" ? (
            <HistoriqueContent section={section} results={previousResults} />
          ) : (
            <div className="space-y-2">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {tip.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {tip.description}
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
