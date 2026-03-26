"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Settings2,
  X,
  Check,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import {
  calculateCashNetReel,
  calculatePointMort,
  calculateSalaryRatio,
  calculateRevenueBreakdown,
  calculateHealthScore,
  buildExecutiveRecommendation,
  detectMissingFields,
  FINANCIAL_FIELD_LABELS,
} from "@/lib/finance";
import type { FinancialFieldId, HealthStatus } from "@/types/finance";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ── Status color utilities ──

const STATUS_TEXT: Record<HealthStatus, string> = {
  ok: "text-green-500",
  warning: "text-orange-500",
  danger: "text-red-500",
};

const STATUS_BG: Record<HealthStatus, string> = {
  ok: "bg-green-500/10",
  warning: "bg-orange-500/10",
  danger: "bg-red-500/10",
};

const STATUS_BORDER: Record<HealthStatus, string> = {
  ok: "border-green-500/30",
  warning: "border-orange-500/30",
  danger: "border-red-500/30",
};

function fmtPercent(value: number): string {
  return `${value.toFixed(1)} %`;
}

function fmtMonths(value: number): string {
  if (value < 0) return `${value.toFixed(1)} mois`;
  return `${value.toFixed(1)} mois`;
}

// ── Main page ──

// All 9 financial fields in display order
const ALL_FIELDS: FinancialFieldId[] = [
  "caTransaction", "caGestion", "caSyndic", "caAutres",
  "chargesFixesMensuelles", "masseSalarialeMensuelle",
  "tresorerieDisponible", "dettesCourtTerme", "fondsMandants",
];

export default function PilotageFinancierPage() {
  const financialData = useAppStore((s) => s.financialData);
  const updateField = useAppStore((s) => s.updateFinancialField);
  const [showEditor, setShowEditor] = useState(false);

  const cashNet = useMemo(() => calculateCashNetReel(financialData), [financialData]);
  const pointMort = useMemo(() => calculatePointMort(financialData), [financialData]);
  const salaryRatio = useMemo(() => calculateSalaryRatio(financialData), [financialData]);
  const revenueBreakdown = useMemo(() => calculateRevenueBreakdown(financialData), [financialData]);
  const healthScore = useMemo(() => calculateHealthScore(financialData), [financialData]);
  const recommendation = useMemo(() => buildExecutiveRecommendation(financialData), [financialData]);
  const missingFields = useMemo(() => detectMissingFields(financialData), [financialData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pilotage financier</h1>
            <p className="text-sm text-muted-foreground">
              Mini cockpit dirigeant — lecture en 10 secondes
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            showEditor
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {showEditor ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          {showEditor ? "Fermer" : "Modifier les données"}
        </button>
      </div>

      {/* ── Panneau d'édition des données ── */}
      {showEditor && (
        <DataEditorPanel
          data={financialData}
          onUpdate={updateField}
        />
      )}

      {/* ── Ligne 1 : 3 KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <CashNetCard result={cashNet} />
        <PointMortCard result={pointMort} />
        <SalaryRatioCard result={salaryRatio} />
      </div>

      {/* ── Ligne 2 : Répartition du CA ── */}
      <RevenueBreakdownSection data={revenueBreakdown} />

      {/* ── Ligne 3 : Score santé + recommandation ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <HealthScoreSection score={healthScore} />
        <RecommendationSection
          recommendation={recommendation}
          scoreStatus={healthScore.status}
        />
      </div>

      {/* ── Ligne 4 : Données manquantes ── */}
      {missingFields.length > 0 && !showEditor && (
        <MissingDataSection
          fields={missingFields}
          onSave={updateField}
        />
      )}
    </div>
  );
}

// ── Panneau d'édition complet ──

const FIELD_GROUPS: { title: string; fields: FinancialFieldId[] }[] = [
  { title: "Chiffre d'affaires mensuel", fields: ["caTransaction", "caGestion", "caSyndic", "caAutres"] },
  { title: "Charges", fields: ["chargesFixesMensuelles", "masseSalarialeMensuelle"] },
  { title: "Trésorerie", fields: ["tresorerieDisponible", "dettesCourtTerme", "fondsMandants"] },
];

function DataEditorPanel({
  data,
  onUpdate,
}: {
  data: Partial<Record<FinancialFieldId, number>>;
  onUpdate: (field: FinancialFieldId, value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Données financières</h3>
        <span className="text-xs text-muted-foreground">— modification en temps réel</span>
      </div>
      <div className="space-y-5">
        {FIELD_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.fields.map((fieldId) => (
                <EditableField
                  key={fieldId}
                  fieldId={fieldId}
                  currentValue={data[fieldId]}
                  onSave={onUpdate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableField({
  fieldId,
  currentValue,
  onSave,
}: {
  fieldId: FinancialFieldId;
  currentValue: number | undefined;
  onSave: (field: FinancialFieldId, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const isFilled = currentValue !== undefined && currentValue !== null;

  const startEditing = useCallback(() => {
    setInputValue(isFilled ? String(currentValue) : "");
    setEditing(true);
  }, [isFilled, currentValue]);

  function handleSave() {
    const num = parseFloat(inputValue.replace(/\s/g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0) {
      onSave(fieldId, num);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-muted/30 p-3">
        <label className="mb-1 block text-xs font-medium text-foreground">
          {FINANCIAL_FIELD_LABELS[fieldId]}
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="0"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={handleSave}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:brightness-110"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      className={cn(
        "group flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30",
        isFilled ? "border-border" : "border-dashed border-orange-500/30"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {FINANCIAL_FIELD_LABELS[fieldId]}
        </p>
        {isFilled ? (
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {formatCurrency(currentValue)}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-orange-500">Non renseigné</p>
        )}
      </div>
      <Pencil className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// ── KPI Card : Cash net réel ──

function CashNetCard({ result }: { result: ReturnType<typeof calculateCashNetReel> }) {
  if (result.value === null) {
    return (
      <KpiUnavailable
        title="Cash net réel"
        message="Données manquantes pour calculer le cash net réel."
        fields={result.missing}
      />
    );
  }

  const status = result.status ?? "ok";

  return (
    <div className={cn("rounded-xl border bg-card p-5", STATUS_BORDER[status])}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Cash net réel</span>
        {result.value >= 0 ? (
          <TrendingUp className={cn("h-4 w-4", STATUS_TEXT[status])} />
        ) : (
          <TrendingDown className={cn("h-4 w-4", STATUS_TEXT[status])} />
        )}
      </div>
      <p className={cn("text-2xl font-bold", STATUS_TEXT[status])}>
        {formatCurrency(result.value)}
      </p>
      {result.coverageMonths !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Couverture : <span className={cn("font-medium", STATUS_TEXT[status])}>{fmtMonths(result.coverageMonths)}</span> de charges fixes
        </p>
      )}
      <StatusBadge status={status} />
    </div>
  );
}

// ── KPI Card : Point mort mensuel ──

function PointMortCard({ result }: { result: ReturnType<typeof calculatePointMort> }) {
  if (result.pointMort === null) {
    return (
      <KpiUnavailable
        title="Point mort mensuel"
        message="Charges fixes non renseignées."
        fields={result.missing}
      />
    );
  }

  const status = result.status ?? "ok";

  return (
    <div className={cn("rounded-xl border bg-card p-5", result.status ? STATUS_BORDER[status] : "border-border")}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Point mort mensuel</span>
        <span className="text-[10px] text-muted-foreground/60">marge {(result.tauxMarge * 100).toFixed(0)} %</span>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {formatCurrency(result.pointMort)}
      </p>
      {result.productionMensuelle !== null && result.delta !== null && (
        <div className="mt-1 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Production : {formatCurrency(result.productionMensuelle)}
          </p>
          <p className={cn("text-xs font-medium", STATUS_TEXT[status])}>
            {result.delta >= 0 ? "+" : ""}{formatCurrency(result.delta)} vs point mort
          </p>
        </div>
      )}
      {result.status && <StatusBadge status={status} />}
    </div>
  );
}

// ── KPI Card : Masse salariale ──

function SalaryRatioCard({ result }: { result: ReturnType<typeof calculateSalaryRatio> }) {
  if (result.ratio === null) {
    return (
      <KpiUnavailable
        title="Masse salariale"
        message="Donnée manquante pour calculer le ratio."
        fields={result.missing}
      />
    );
  }

  const status = result.status ?? "ok";

  return (
    <div className={cn("rounded-xl border bg-card p-5", STATUS_BORDER[status])}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Masse salariale</span>
        {status === "ok" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className={cn("h-4 w-4", STATUS_TEXT[status])} />
        )}
      </div>
      <p className={cn("text-2xl font-bold", STATUS_TEXT[status])}>
        {fmtPercent(result.ratio)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">du chiffre d'affaires</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            status === "ok" ? "bg-green-500" : status === "warning" ? "bg-orange-500" : "bg-red-500"
          )}
          style={{ width: `${Math.min(result.ratio, 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
        <span>0 %</span>
        <span className="text-green-500/60">35 %</span>
        <span className="text-orange-500/60">45 %</span>
        <span>100 %</span>
      </div>
    </div>
  );
}

// ── Répartition du CA ──

function RevenueBreakdownSection({ data }: { data: ReturnType<typeof calculateRevenueBreakdown> }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold">Répartition du CA</h3>
        <p className="text-sm text-muted-foreground">
          Aucune donnée de chiffre d'affaires renseignée.
        </p>
      </div>
    );
  }

  const totalCA = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Répartition du CA</h3>
        <span className="text-xs text-muted-foreground">
          Total : {formatCurrency(totalCA)} / mois
        </span>
      </div>
      <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
        <DonutChart
          data={data}
          centerValue={formatCurrency(totalCA)}
          centerLabel="CA mensuel"
          height={220}
        />
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
                <span className="w-12 text-right text-xs text-muted-foreground">
                  {item.percentage.toFixed(0)} %
                </span>
              </div>
            </div>
          ))}
          {/* Récurrence highlight */}
          {(() => {
            const recurrence = data
              .filter(d => d.name === "Gestion" || d.name === "Syndic")
              .reduce((sum, d) => sum + d.value, 0);
            if (recurrence === 0) return null;
            const recurrencePct = (recurrence / totalCA) * 100;
            return (
              <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Part récurrente (Gestion + Syndic) :{" "}
                  <span className={cn("font-medium", recurrencePct >= 15 ? "text-green-500" : "text-orange-500")}>
                    {recurrencePct.toFixed(0)} %
                  </span>
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Score santé financière ──

function HealthScoreSection({ score }: { score: ReturnType<typeof calculateHealthScore> }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", STATUS_BORDER[score.status])}>
      <h3 className="mb-4 text-sm font-semibold">Santé financière</h3>

      <div className="flex items-center gap-4">
        {/* Score circle */}
        <div className={cn(
          "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-4",
          score.status === "ok" ? "border-green-500" : score.status === "warning" ? "border-orange-500" : "border-red-500"
        )}>
          <span className={cn("text-2xl font-bold", STATUS_TEXT[score.status])}>
            {score.score}
          </span>
        </div>
        <div>
          <p className={cn("text-lg font-semibold", STATUS_TEXT[score.status])}>
            {score.label}
          </p>
          <p className="text-xs text-muted-foreground">sur 100</p>
        </div>
      </div>

      {score.details.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {score.details.map((detail, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", detail.status === "danger" ? "bg-red-500" : "bg-orange-500")} />
                <span className="text-muted-foreground">{detail.label}</span>
              </div>
              <span className={cn("font-medium", STATUS_TEXT[detail.status])}>
                {detail.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recommandation dirigeant ──

function RecommendationSection({
  recommendation,
  scoreStatus,
}: {
  recommendation: string | null;
  scoreStatus: HealthStatus;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Recommandation dirigeant</h3>
      {recommendation ? (
        <div className={cn("rounded-lg p-4", STATUS_BG[scoreStatus])}>
          <p className={cn("text-sm leading-relaxed", STATUS_TEXT[scoreStatus])}>
            {recommendation}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-4">
          <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Complétez les données financières pour obtenir une recommandation personnalisée.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Panneau données manquantes ──

function MissingDataSection({
  fields,
  onSave,
}: {
  fields: ReturnType<typeof detectMissingFields>;
  onSave: (field: FinancialFieldId, value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-orange-500/30 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Données manquantes à compléter</h3>
        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-500">
          {fields.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <MissingFieldInput key={field.id} field={field} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

function MissingFieldInput({
  field,
  onSave,
}: {
  field: { id: FinancialFieldId; label: string; impact: string };
  onSave: (field: FinancialFieldId, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  function handleSave() {
    const num = parseFloat(inputValue.replace(/\s/g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0) {
      onSave(field.id, num);
      setEditing(false);
      setInputValue("");
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-muted/30 p-3">
        <label className="mb-1 block text-xs font-medium text-foreground">
          {field.label}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            placeholder="0"
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={handleSave}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:brightness-110"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <Pencil className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
      <div>
        <p className="text-xs font-medium text-foreground">{field.label}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{field.impact}</p>
      </div>
    </button>
  );
}

// ── Shared sub-components ──

function KpiUnavailable({
  title,
  message,
  fields,
}: {
  title: string;
  message: string;
  fields: FinancialFieldId[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5">
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
      <p className="mt-2 text-sm text-muted-foreground/70">{message}</p>
      {fields.length > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          Champs requis : {fields.map(f => FINANCIAL_FIELD_LABELS[f]).join(", ")}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const labels: Record<HealthStatus, string> = {
    ok: "Sain",
    warning: "Surveillance",
    danger: "Alerte",
  };

  return (
    <span className={cn("mt-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_BG[status], STATUS_TEXT[status])}>
      {labels[status]}
    </span>
  );
}
