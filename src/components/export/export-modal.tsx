"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, X, FileSpreadsheet, ChevronDown, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import type { UserRole } from "@/types/user";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import {
  generateExcelExport,
  getScopeOptionsForRole,
  needsDetailLevel,
  getAvailableMonths,
  getAvailableFields,
  getDefaultFieldIds,
  FIELD_GROUPS,
  type ExportConfig,
  type ExportScope,
  type ExportDataType,
  type ExportDetailLevel,
  type ExportFieldId,
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

  const effectiveRole = (user?.role ?? "conseiller") as UserRole;

  const scopeOptions = useMemo(
    () => getScopeOptionsForRole(effectiveRole),
    [effectiveRole]
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
  const [selectedFields, setSelectedFields] = useState<Set<ExportFieldId>>(() => getDefaultFieldIds("all"));
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  // Available fields based on data type
  const availableFields = useMemo(
    () => getAvailableFields(dataType),
    [dataType]
  );

  // Grouped fields for UI
  const groupedFields = useMemo(() => {
    const groups: Map<string, typeof availableFields> = new Map();
    for (const f of availableFields) {
      const arr = groups.get(f.group) ?? [];
      arr.push(f);
      groups.set(f.group, arr);
    }
    return groups;
  }, [availableFields]);

  // When data type changes, reset field selection to defaults
  useEffect(() => {
    setSelectedFields(getDefaultFieldIds(dataType));
  }, [dataType]);

  // Reset scope when options change
  useEffect(() => {
    if (scopeOptions.length > 0 && !scopeOptions.find((o) => o.value === scope)) {
      setScope(scopeOptions[0].value);
    }
  }, [scopeOptions, scope]);

  const showDetailLevel = needsDetailLevel(scope);

  const toggleField = useCallback((fieldId: ExportFieldId) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  }, []);

  const selectAllFields = useCallback(() => {
    setSelectedFields(new Set(availableFields.map((f) => f.id)));
  }, [availableFields]);

  const deselectAllFields = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const allSelected = availableFields.length > 0 && availableFields.every((f) => selectedFields.has(f.id));
  const noneSelected = availableFields.every((f) => !selectedFields.has(f.id));

  const handleExport = () => {
    if (!user) return;
    setError(null);
    setSuccessFilename(null);
    setIsExporting(true);

    if (periodStart > periodEnd) {
      setError("La date de début doit être antérieure à la date de fin.");
      setIsExporting(false);
      return;
    }

    if (selectedFields.size === 0) {
      setError("Veuillez sélectionner au moins un champ à exporter.");
      setIsExporting(false);
      return;
    }

    const config: ExportConfig = {
      scope,
      dataType,
      periodStart,
      periodEnd,
      detailLevel: showDetailLevel ? detailLevel : "detail",
      selectedFields,
    };

    const input: ExportInput = {
      config,
      currentUser: user,
      allUsers: users,
      allResults: results,
      ratioConfigs,
    };

    try {
      const result = generateExcelExport(input);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de l'export.");
      } else {
        setSuccessFilename(result.filename ?? null);
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
      <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-2)]">
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

          {/* Success toast */}
          {successFilename && (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Export généré avec succès
                </p>
                <p className="mt-0.5 truncate text-xs text-green-600/80 dark:text-green-400/80 font-mono">
                  {successFilename}
                </p>
              </div>
            </div>
          )}

          {/* Scope */}
          <fieldset className="space-y-2">
            <label className="text-sm font-medium text-foreground">Périmètre</label>
            <div className="relative">
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as ExportScope);
                  setError(null);
                  setSuccessFilename(null);
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

          {/* Data type */}
          <fieldset className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type de données</label>
            <div className="relative">
              <select
                value={dataType}
                onChange={(e) => {
                  setDataType(e.target.value as ExportDataType);
                  setSuccessFilename(null);
                }}
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

          {/* Field selection */}
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Champs à exporter</label>
              <button
                type="button"
                onClick={allSelected ? deselectAllFields : selectAllFields}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-muted">
              {FIELD_GROUPS.map((group) => {
                const fields = groupedFields.get(group.key);
                if (!fields || fields.length === 0) return null;
                return (
                  <div key={group.key}>
                    <div className="sticky top-0 z-10 bg-muted-foreground/5 px-3 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {group.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 px-2 pb-1">
                      {fields.map((field) => {
                        const checked = selectedFields.has(field.id);
                        return (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => toggleField(field.id)}
                            className={cn(
                              "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                              checked
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                              checked
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            )}>
                              {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            <span className="truncate">{field.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {noneSelected && (
              <p className="text-xs text-muted-foreground">
                Sélectionnez au moins un champ pour générer l'export.
              </p>
            )}
          </fieldset>

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
            {successFilename ? "Fermer" : "Annuler"}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || noneSelected}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110",
              (isExporting || noneSelected) && "pointer-events-none opacity-50"
            )}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Export en cours..." : successFilename ? "Exporter à nouveau" : "Exporter"}
          </button>
        </div>
      </div>
    </div>
  );
}
