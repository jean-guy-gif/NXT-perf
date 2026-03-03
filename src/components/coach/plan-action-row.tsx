"use client";

import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { CoachPlanAction } from "@/types/coach";
import type { RatioId } from "@/types/ratios";
import { Trash2 } from "lucide-react";

/* ────── Channel options ────── */
const CHANNEL_OPTIONS = [
  { value: "téléphone", label: "Téléphone" },
  { value: "terrain", label: "Terrain" },
  { value: "email", label: "Email" },
  { value: "visio", label: "Visio" },
  { value: "bureau", label: "Bureau" },
  { value: "mixte", label: "Mixte" },
];

/* ────── Ratio select options ────── */
const RATIO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Aucun" },
  ...Object.entries(defaultRatioConfigs).map(([id, config]) => ({
    value: id,
    label: config.name,
  })),
];

/* ────── Input base style ────── */
const INPUT_CLASS =
  "text-sm rounded-md border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/40";

/* ────── Props ────── */
interface PlanActionRowProps {
  action: CoachPlanAction;
  onChange: (updated: CoachPlanAction) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

/* ────── Component ────── */
export function PlanActionRow({
  action,
  onChange,
  onRemove,
  readOnly = false,
}: PlanActionRowProps) {
  const update = (partial: Partial<CoachPlanAction>) => {
    onChange({ ...action, ...partial });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={action.done}
        disabled={readOnly}
        onChange={(e) => update({ done: e.target.checked })}
        className="h-4 w-4 rounded border-muted-foreground/30 accent-primary shrink-0"
      />

      {/* Label */}
      {readOnly ? (
        <span className="flex-1 min-w-0 text-sm truncate">{action.label}</span>
      ) : (
        <input
          type="text"
          value={action.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Action..."
          className={`${INPUT_CLASS} flex-1 min-w-0`}
        />
      )}

      {/* Frequency */}
      {readOnly ? (
        <span className="w-28 text-xs text-muted-foreground truncate">
          {action.frequency}
        </span>
      ) : (
        <input
          type="text"
          value={action.frequency}
          onChange={(e) => update({ frequency: e.target.value })}
          placeholder="Fréquence"
          className={`${INPUT_CLASS} w-28`}
        />
      )}

      {/* Channel */}
      {readOnly ? (
        <span className="w-28 text-xs text-muted-foreground truncate">
          {action.channel}
        </span>
      ) : (
        <select
          value={action.channel}
          onChange={(e) => update({ channel: e.target.value })}
          className={`${INPUT_CLASS} w-28`}
        >
          <option value="">Canal</option>
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Proof */}
      {readOnly ? (
        <span className="w-32 text-xs text-muted-foreground truncate">
          {action.proof}
        </span>
      ) : (
        <input
          type="text"
          value={action.proof}
          onChange={(e) => update({ proof: e.target.value })}
          placeholder="Preuve"
          className={`${INPUT_CLASS} w-32`}
        />
      )}

      {/* Linked KPI */}
      {readOnly ? (
        <span className="w-40 text-xs text-muted-foreground truncate">
          {action.linkedKpi
            ? defaultRatioConfigs[action.linkedKpi as RatioId]?.name ?? action.linkedKpi
            : "Aucun"}
        </span>
      ) : (
        <select
          value={action.linkedKpi ?? ""}
          onChange={(e) =>
            update({
              linkedKpi: e.target.value ? (e.target.value as RatioId) : null,
            })
          }
          className={`${INPUT_CLASS} w-40`}
        >
          {RATIO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Remove button */}
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
