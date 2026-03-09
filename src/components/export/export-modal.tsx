"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, X, FileSpreadsheet, ChevronDown, Check, AlertCircle } from "lucide-react";
import type { UserRole } from "@/types/user";
import { useAppStore } from "@/stores/app-store";
import { useCoachData } from "@/hooks/use-coach-data";
import { cn } from "@/lib/utils";
import {
  generateExcelExport,
  getScopeOptionsForRole,
  needsDetailLevel,
  getAvailableMonths,
  type ExportConfig,
  type ExportScope,
  type ExportDataType,
  type ExportDetailLevel,
  type ExportInput,
} from "@/lib/export";

const DATA_TYPE_OPTIONS: { value: ExportDataType; label: string }[] = [
  { value: "all", label: "Toutes les données" },
  { value: "volumes", label: "Volumes d'activité" },
  { value: "ratios", label: "Ratios de performance" },
];

const DETAIL_LEVEL_OPTIONS: { value: ExportDetailLevel; label: string }[] = [
  { value: "global", label: "Vue globale" },
  { value: "detail", label: "Détail par collaborateur" },
  { value: "global-detail", label: "Vue globale + détail" },
];

export function ExportModal({ onClose }: { onClose: () => void }) {
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  const isCoach = !!user?.availableRoles?.includes("coach");
  const effectiveRole = (user?.role ?? "conseiller") as UserRole;

  // Coach data (only used if coach role)
  const coachData = useCoachData(user?.id ?? "");

  const scopeOptions = useMemo(
    () => getScopeOptionsForRole(effectiveRole, !!isCoach),
    [effectiveRole, isCoach]
  );

  const availableMonths = useMemo(
    () => getAvailableMonths(results),
    [results]
  );

  // Form state
  const [scope, setScope] = useState<ExportScope>(scopeOptions[0]?.value ?? "mes-donnees");
  const [dataType, setDataType] = useState<ExportDataType>("all");
  const [periodStart, setPeriodStart] = useState(availableMonths[0] ?? "2026-01");
  const [periodEnd, setPeriodEnd] = useState(availableMonths[availableMonths.length - 1] ?? "2026-02");
  const [detailLevel, setDetailLevel] = useState<ExportDetailLevel>("global-detail");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Reset scope when options change
  useEffect(() => {
    if (scopeOptions.length > 0 && !scopeOptions.find((o) => o.value === scope)) {
      setScope(scopeOptions[0].value);
    }
  }, [scopeOptions, scope]);

  // Coach clients for selection
  const coachClients = useMemo(() => {
    if (!isCoach || !coachData) return [];
    return coachData.portfolioClients.map((pc) => ({
      assignmentId: pc.assignment.id,
      name: pc.name,
      targetType: pc.targetType,
      memberUserIds: (() => {
        // Resolve member IDs based on assignment type
        if (pc.targetType === "AGENT") return [pc.targetId];
        if (pc.targetType === "MANAGER") {
          const teamAgents = users
            .filter((u) => u.managerId === pc.targetId || u.id === pc.targetId);
          return teamAgents.map((u) => u.id);
        }
        if (pc.targetType === "INSTITUTION") {
          return users
            .filter((u) => u.institutionId === pc.targetId)
            .map((u) => u.id);
        }
        return [];
      })(),
    }));
  }, [isCoach, coachData, users]);

  const showDetailLevel = needsDetailLevel(scope);
  const showClientSelector = scope === "client-coach";
  const showPortfolioSelector = scope === "portefeuille-coach" && coachClients.length > 1;

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (!user) return;
    setError(null);
    setIsExporting(true);

    // Validate period
    if (periodStart > periodEnd) {
      setError("La date de début doit être antérieure à la date de fin.");
      setIsExporting(false);
      return;
    }

    // Validate coach client selection
    if (scope === "client-coach" && selectedClientIds.length === 0) {
      setError("Veuillez sélectionner un client à exporter.");
      setIsExporting(false);
      return;
    }

    const config: ExportConfig = {
      scope,
      dataType,
      periodStart,
      periodEnd,
      detailLevel: showDetailLevel ? detailLevel : "detail",
      selectedClientIds: (showClientSelector || showPortfolioSelector) ? selectedClientIds : undefined,
    };

    const input: ExportInput = {
      config,
      currentUser: user,
      allUsers: users,
      allResults: results,
      ratioConfigs,
      coachClients: isCoach ? coachClients : undefined,
    };

    try {
      const result = generateExcelExport(input);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de l'export.");
      } else {
        onClose();
      }
    } catch {
      setError("Une erreur est survenue lors de la génération du fichier.");
    } finally {
      setIsExporting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const monthNames = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-2)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Exporter les données
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            Choisissez le périmètre, les indicateurs et la période à exporter au format Excel.
          </p>

          {/* Scope */}
          <fieldset className="space-y-2">
            <label className="text-sm font-medium text-foreground">Périmètre de l'export</label>
            <div className="relative">
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as ExportScope);
                  setSelectedClientIds([]);
                  setError(null);
                }}
                className="w-full appearance-none rounded-[var(--radius-button)] border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                {scopeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </fieldset>

          {/* Coach client selector */}
          {showClientSelector && coachClients.length > 0 && (
            <fieldset className="space-y-2">
              <label className="text-sm font-medium text-foreground">Client à exporter</label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted">
                {coachClients.map((client) => (
                  <button
                    key={client.assignmentId}
                    type="button"
                    onClick={() => setSelectedClientIds([client.assignmentId])}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      selectedClientIds.includes(client.assignmentId)
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted-foreground/5 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                      selectedClientIds.includes(client.assignmentId)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedClientIds.includes(client.assignmentId) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{client.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {client.targetType === "AGENT" ? "Agent" :
                         client.targetType === "MANAGER" ? "Manager" : "Agence"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Coach portfolio multi-select */}
          {showPortfolioSelector && (
            <fieldset className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Sélection de clients
                <span className="ml-1 text-xs text-muted-foreground">(optionnel, tout le portefeuille par défaut)</span>
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted">
                {coachClients.map((client) => (
                  <button
                    key={client.assignmentId}
                    type="button"
                    onClick={() => toggleClientSelection(client.assignmentId)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      selectedClientIds.includes(client.assignmentId)
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted-foreground/5 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                      selectedClientIds.includes(client.assignmentId)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedClientIds.includes(client.assignmentId) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{client.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {client.targetType === "AGENT" ? "Agent" :
                         client.targetType === "MANAGER" ? "Manager" : "Agence"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Data type */}
          <fieldset className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type de données</label>
            <div className="relative">
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as ExportDataType)}
                className="w-full appearance-none rounded-[var(--radius-button)] border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </fieldset>

          {/* Period */}
          <fieldset className="space-y-2">
            <label className="text-sm font-medium text-foreground">Période</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <select
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full appearance-none rounded-[var(--radius-button)] border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">à</span>
              <div className="relative flex-1">
                <select
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full appearance-none rounded-[var(--radius-button)] border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </fieldset>

          {/* Detail level */}
          {showDetailLevel && (
            <fieldset className="space-y-2">
              <label className="text-sm font-medium text-foreground">Niveau de détail</label>
              <div className="relative">
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value as ExportDetailLevel)}
                  className="w-full appearance-none rounded-[var(--radius-button)] border border-border bg-muted px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                  {DETAIL_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </fieldset>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110",
              isExporting && "pointer-events-none opacity-50"
            )}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Export en cours..." : "Exporter"}
          </button>
        </div>
      </div>
    </div>
  );
}
