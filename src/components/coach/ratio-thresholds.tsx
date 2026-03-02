"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { ComputedRatio, RatioId } from "@/types/ratios";
import type { CoachTargetType } from "@/types/coach";
import { cn } from "@/lib/utils";
import {
  STATUS_COLORS,
  STATUS_BG_COLORS,
  STATUS_BORDER_COLORS,
  CATEGORY_LABELS,
} from "@/lib/constants";
import { AlertTriangle, Save, RotateCcw } from "lucide-react";

/* ────── Props ────── */
interface RatioThresholdsProps {
  userId: string;
  ratios: ComputedRatio[];
  targetType: CoachTargetType;
}

/* ────── Status label map ────── */
const STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  warning: "Attention",
  danger: "Alerte",
};

/* ────── Single ratio row ────── */
function RatioRow({
  ratio,
  ratioName,
  unit,
  isPercentage,
  isLowerBetter,
  editedValue,
  onEdit,
}: {
  ratio: ComputedRatio;
  ratioName: string;
  unit: string;
  isPercentage: boolean;
  isLowerBetter: boolean;
  editedValue: number | null;
  onEdit: (value: number) => void;
}) {
  const displayValue = isPercentage
    ? `${ratio.value.toFixed(1)}%`
    : ratio.value.toFixed(1);

  const currentThreshold = editedValue ?? ratio.thresholdForCategory;
  const displayThreshold = isPercentage
    ? `${currentThreshold}%`
    : `${currentThreshold}`;

  const isEdited = editedValue !== null && editedValue !== ratio.thresholdForCategory;

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg border p-3 transition-colors",
        ratio.status !== "ok" && STATUS_BG_COLORS[ratio.status],
        ratio.status !== "ok" && STATUS_BORDER_COLORS[ratio.status],
        ratio.status === "ok" && "bg-card"
      )}
    >
      {/* Name + unit */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{ratioName}</p>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>

      {/* Current value */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Valeur</p>
        <p className="text-sm font-semibold tabular-nums">{displayValue}</p>
      </div>

      {/* Threshold input */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Seuil</p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step={isPercentage ? 1 : 0.5}
            min={0}
            value={currentThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0) onEdit(val);
            }}
            className={cn(
              "w-16 rounded-md border bg-background px-2 py-1 text-sm text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40",
              isEdited && "border-primary/50 bg-primary/5"
            )}
          />
          {isPercentage && (
            <span className="text-xs text-muted-foreground">%</span>
          )}
        </div>
      </div>

      {/* Performance % */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Perf.</p>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            STATUS_COLORS[ratio.status]
          )}
        >
          {ratio.percentageOfTarget.toFixed(0)}%
        </p>
      </div>

      {/* Status badge */}
      <div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_BG_COLORS[ratio.status],
            STATUS_COLORS[ratio.status]
          )}
        >
          {STATUS_LABELS[ratio.status]}
        </span>
      </div>
    </div>
  );
}

/* ────── Main component ────── */
export function RatioThresholds({
  userId,
  ratios,
  targetType,
}: RatioThresholdsProps) {
  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const updateRatioThreshold = useAppStore((s) => s.updateRatioThreshold);

  // Find user category
  const targetUser = users.find((u) => u.id === userId);
  const category = targetUser?.category ?? "debutant";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  // Local edited thresholds (null = not edited)
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [applyToScope, setApplyToScope] = useState(false);

  // Sort: alert/warning first, then ok
  const sortedRatios = [...ratios].sort((a, b) => {
    const order = { danger: 0, warning: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });

  const alertCount = ratios.filter((r) => r.status !== "ok").length;

  const handleEdit = (ratioId: string, value: number) => {
    setEdits((prev) => ({ ...prev, [ratioId]: value }));
  };

  const hasEdits = Object.keys(edits).some(
    (key) => {
      const ratio = ratios.find((r) => r.ratioId === key);
      return ratio && edits[key] !== ratio.thresholdForCategory;
    }
  );

  const handleSave = () => {
    for (const [ratioId, value] of Object.entries(edits)) {
      const ratio = ratios.find((r) => r.ratioId === ratioId);
      if (ratio && value !== ratio.thresholdForCategory) {
        updateRatioThreshold(ratioId as RatioId, category, value);
      }
    }
    setEdits({});
  };

  const handleReset = () => {
    setEdits({});
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Seuils des ratios</h3>
          <p className="text-xs text-muted-foreground">
            Niveau : {categoryLabel}
            {alertCount > 0 && (
              <span className="ml-2 text-orange-500">
                — {alertCount} ratio{alertCount > 1 ? "s" : ""} en alerte
              </span>
            )}
          </p>
        </div>

        {/* Alert indicator */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-orange-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{alertCount}</span>
          </div>
        )}
      </div>

      {/* Ratio list */}
      <div className="space-y-2">
        {sortedRatios.map((ratio) => {
          const config = ratioConfigs[ratio.ratioId as RatioId];
          if (!config) return null;

          return (
            <RatioRow
              key={ratio.ratioId}
              ratio={ratio}
              ratioName={config.name}
              unit={config.unit}
              isPercentage={config.isPercentage}
              isLowerBetter={config.isLowerBetter}
              editedValue={edits[ratio.ratioId] ?? null}
              onEdit={(value) => handleEdit(ratio.ratioId, value)}
            />
          );
        })}
      </div>

      {/* Scope checkbox */}
      {targetType === "MANAGER" && (
        <label className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted/70 transition-colors">
          <input
            type="checkbox"
            checked={applyToScope}
            onChange={(e) => setApplyToScope(e.target.checked)}
            className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            Appliquer à l&apos;équipe
          </span>
        </label>
      )}

      {targetType === "INSTITUTION" && (
        <label className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted/70 transition-colors">
          <input
            type="checkbox"
            checked={applyToScope}
            onChange={(e) => setApplyToScope(e.target.checked)}
            className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            Appliquer à tous (sauf exclusions)
          </span>
        </label>
      )}

      {/* Save / Reset buttons */}
      {hasEdits && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Enregistrer
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
