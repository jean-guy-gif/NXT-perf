"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { convertExtractedToPeriodResults } from "@/lib/weekly-gate";
import { awardBadgeIfEarned } from "@/lib/badge-service";
import type {
  ExtractedFields,
  ExtractedArrays,
  MandatType,
} from "@/lib/saisie-ai-client";
import {
  EXTRACTION_FIELDS,
  FIELD_LABELS_FR,
  type ExtractionFieldId,
} from "@/lib/extraction-dictionary";

type FieldResult = { value: number | null; confidence: number };

type UnknownLabel = {
  rawLabel: string;
  sheetName?: string;
  rowNumber?: number;
  columnLetter?: string;
};

type ImportResponse = {
  fileName: string;
  fileType: "excel" | "pdf" | "image" | "other";
  fields: Record<ExtractionFieldId, FieldResult>;
  unknownLabels: UnknownLabel[];
  sheetsRead: string[];
  sheetsSkipped: string[];
};

type EditedValues = Partial<Record<ExtractionFieldId, number | null>>;

interface ImportResult {
  fileName: string;
  status: "uploading" | "extracted" | "error";
  data?: ImportResponse;
  edited?: EditedValues;
  error?: string;
}

interface ImportPerformanceProps {
  isDemo?: boolean;
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  csv: FileSpreadsheet,
  pdf: FileText,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
  webp: ImageIcon,
};

// ── Confidence → visual state ──────────────────────────────────────────────

type ConfidenceState = "high" | "medium" | "empty";

function confidenceState(f: FieldResult, edited?: number | null): ConfidenceState {
  if (edited !== undefined) {
    // Valeur éditée manuellement : on la considère "high" (saisie utilisateur)
    return edited !== null ? "high" : "empty";
  }
  if (f.value === null) return "empty";
  if (f.confidence >= 0.8) return "high";
  if (f.confidence >= 0.5) return "medium";
  return "empty";
}

const STATE_CLASSES: Record<ConfidenceState, string> = {
  high: "border-green-500/50 focus:border-green-500 focus:ring-green-500/20",
  medium: "border-amber-500/60 focus:border-amber-500 focus:ring-amber-500/20",
  empty: "border-border focus:border-primary focus:ring-primary/20",
};

// ── Mandat types generation ────────────────────────────────────────────────

function buildMandatTypes(
  mandatsSignes: number | null,
  mandatsExclusifs: number | null,
): MandatType[] | undefined {
  const total = mandatsSignes ?? 0;
  if (total <= 0) return undefined;
  const exclusifs = Math.min(Math.max(mandatsExclusifs ?? 0, 0), total);
  const simples = total - exclusifs;
  return [
    ...Array<MandatType>(exclusifs).fill("exclusif"),
    ...Array<MandatType>(simples).fill("simple"),
  ];
}

// ── Component ──────────────────────────────────────────────────────────────

export function ImportPerformance({ isDemo }: ImportPerformanceProps) {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((s) => s.user);
  const addResults = useAppStore((s) => s.addResults);

  const emptyFields = (): Record<ExtractionFieldId, FieldResult> => {
    const out = {} as Record<ExtractionFieldId, FieldResult>;
    for (const f of EXTRACTION_FIELDS) out[f] = { value: null, confidence: 0 };
    return out;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const entry: ImportResult = { fileName: file.name, status: "uploading" };
      setResults((prev) => [...prev, entry]);

      try {
        if (isDemo) {
          await new Promise((r) => setTimeout(r, 1200));
          const demoFields = emptyFields();
          demoFields.contactsTotaux = { value: 144, confidence: 0.95 };
          demoFields.rdvEstimation = { value: 48, confidence: 0.9 };
          demoFields.estimationsRealisees = { value: 42, confidence: 0.9 };
          demoFields.mandatsSignes = { value: 36, confidence: 0.9 };
          demoFields.mandatsExclusifs = { value: 14, confidence: 0.85 };
          demoFields.rdvSuivi = { value: 22, confidence: 0.7 };
          demoFields.baissePrix = { value: 6, confidence: 0.6 };
          demoFields.nombreVisites = { value: 96, confidence: 0.9 };
          demoFields.offresRecues = { value: 24, confidence: 0.9 };
          demoFields.compromisSignes = { value: 18, confidence: 0.9 };
          demoFields.actesSignes = { value: 12, confidence: 0.95 };
          demoFields.chiffreAffaires = { value: 120000, confidence: 0.9 };
          const demoData: ImportResponse = {
            fileName: file.name,
            fileType: "excel",
            fields: demoFields,
            unknownLabels: [],
            sheetsRead: ["Hebdo 2026", "Bilan Mensuel 2026", "Bilan 2025"],
            sheetsSkipped: ["Analyse & Objectifs"],
          };
          setResults((prev) =>
            prev.map((r) =>
              r.fileName === file.name
                ? { ...r, status: "extracted", data: demoData }
                : r,
            ),
          );
        } else {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/import-performance", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();
          if (res.ok) {
            setResults((prev) =>
              prev.map((r) =>
                r.fileName === file.name
                  ? { ...r, status: "extracted", data: json as ImportResponse }
                  : r,
              ),
            );
          } else {
            setResults((prev) =>
              prev.map((r) =>
                r.fileName === file.name
                  ? {
                      ...r,
                      status: "error",
                      error: json.error || "Erreur d'extraction",
                    }
                  : r,
              ),
            );
          }
        }
      } catch {
        setResults((prev) =>
          prev.map((r) =>
            r.fileName === file.name
              ? { ...r, status: "error", error: "Erreur réseau" }
              : r,
          ),
        );
      }
    }
  };

  const updateField = (
    fileName: string,
    field: ExtractionFieldId,
    raw: string,
  ) => {
    const parsed = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    const value = parsed !== null && isNaN(parsed) ? null : parsed;
    setResults((prev) =>
      prev.map((r) =>
        r.fileName === fileName
          ? { ...r, edited: { ...(r.edited ?? {}), [field]: value } }
          : r,
      ),
    );
  };

  const getFieldValue = (r: ImportResult, field: ExtractionFieldId): number | null => {
    if (r.edited && field in r.edited) {
      const v = r.edited[field];
      return v === undefined ? null : v;
    }
    return r.data?.fields[field]?.value ?? null;
  };

  const removeFile = (fileName: string) => {
    setResults((prev) => prev.filter((r) => r.fileName !== fileName));
  };

  // ── Render validated state ──────────────────────────────────────────────

  if (validated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-green-500/30 bg-green-500/5 p-6">
        <Check className="h-8 w-8 text-green-500" />
        <p className="text-sm font-medium text-foreground">
          Données importées avec succès
        </p>
        <p className="text-xs text-muted-foreground">
          {results.filter((r) => r.status === "extracted").length} fichier(s)
          traité(s)
        </p>
      </div>
    );
  }

  // ── Render main ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">
          Importer vos données de performance
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Excel, PDF ou capture d'écran — on extrait, vous ajustez
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Glisser-déposer ou cliquer pour importer
        </p>
        <p className="text-[10px] text-muted-foreground">
          Excel (.xlsx, .xls, .csv), PDF, images (JPG, PNG, WEBP)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.heic"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
      </div>

      {/* File cards */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => {
            const ext = r.fileName.split(".").pop()?.toLowerCase() ?? "";
            const Icon = FILE_ICONS[ext] || FileText;

            // Stats for banner
            let high = 0;
            let medium = 0;
            let empty = 0;
            if (r.data) {
              for (const f of EXTRACTION_FIELDS) {
                const state = confidenceState(r.data.fields[f], r.edited?.[f]);
                if (state === "high") high++;
                else if (state === "medium") medium++;
                else empty++;
              }
            }

            return (
              <div
                key={r.fileName}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {r.fileName}
                  </span>
                  {r.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {r.status === "extracted" && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {r.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(r.fileName)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {r.status === "error" && (
                  <p className="text-xs text-destructive">{r.error}</p>
                )}

                {r.status === "extracted" && r.data && (
                  <>
                    {/* Banner diagnostic */}
                    <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-[11px]">
                      {r.data.sheetsRead.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">
                            <span className="font-semibold">
                              {r.data.sheetsRead.length}
                            </span>{" "}
                            {r.data.sheetsRead.length > 1 ? "sources lues" : "source lue"}
                            {" : "}
                            <span className="text-muted-foreground">
                              {r.data.sheetsRead.join(", ")}
                            </span>
                          </span>
                        </div>
                      )}
                      {r.data.sheetsSkipped.length > 0 && (
                        <div className="flex items-start gap-2">
                          <X className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">
                            <span className="font-semibold">
                              {r.data.sheetsSkipped.length}
                            </span>{" "}
                            {r.data.sheetsSkipped.length > 1 ? "ignorées" : "ignorée"}
                            {" : "}
                            <span className="text-muted-foreground">
                              {r.data.sheetsSkipped.join(", ")} (pas de données
                              chiffrées)
                            </span>
                          </span>
                        </div>
                      )}
                      {r.data.unknownLabels.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">
                            <span className="font-semibold">
                              {r.data.unknownLabels.length}
                            </span>{" "}
                            {r.data.unknownLabels.length > 1
                              ? "intitulés non reconnus"
                              : "intitulé non reconnu"}
                            {" : "}
                            <span className="text-muted-foreground">
                              {r.data.unknownLabels
                                .slice(0, 6)
                                .map((u) => u.rawLabel)
                                .join(", ")}
                              {r.data.unknownLabels.length > 6 && "…"}
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">→</span>
                        <span className="text-foreground">
                          <span className="text-green-600 font-semibold">
                            {high}
                          </span>{" "}
                          confiants
                          {medium > 0 && (
                            <>
                              {" · "}
                              <span className="text-amber-600 font-semibold">
                                {medium}
                              </span>{" "}
                              à vérifier
                            </>
                          )}
                          {empty > 0 && (
                            <>
                              {" · "}
                              <span className="text-muted-foreground font-semibold">
                                {empty}
                              </span>{" "}
                              à compléter
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 12 editable inputs */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {EXTRACTION_FIELDS.map((field) => {
                        const cur = r.data!.fields[field];
                        const edited = r.edited?.[field];
                        const displayValue =
                          edited !== undefined
                            ? (edited ?? "")
                            : (cur.value ?? "");
                        const state = confidenceState(cur, edited);
                        const showBadge = state === "medium" && edited === undefined;
                        return (
                          <div key={field} className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <label className="text-[11px] font-medium text-muted-foreground truncate">
                                {FIELD_LABELS_FR[field]}
                              </label>
                              {showBadge && (
                                <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide">
                                  à vérifier
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              value={displayValue}
                              placeholder={
                                state === "empty"
                                  ? "À compléter"
                                  : field === "chiffreAffaires"
                                    ? "€"
                                    : "0"
                              }
                              onChange={(e) =>
                                updateField(r.fileName, field, e.target.value)
                              }
                              className={`w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-all focus:ring-2 ${STATE_CLASSES[state]}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {results.some((r) => r.status === "extracted") && (
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                for (const r of results.filter(
                  (r) => r.status === "extracted" && r.data,
                )) {
                  const get = (f: ExtractionFieldId): number | null =>
                    getFieldValue(r, f);

                  const mandatsSignes = get("mandatsSignes");
                  const mandatsExclusifs = get("mandatsExclusifs");
                  const mandatsTypes = buildMandatTypes(
                    mandatsSignes,
                    mandatsExclusifs,
                  );

                  const fields: ExtractedFields = {
                    contactsTotaux: get("contactsTotaux") ?? undefined,
                    rdvEstimation: get("rdvEstimation") ?? undefined,
                    estimationsRealisees: get("estimationsRealisees") ?? undefined,
                    mandatsSignes: mandatsSignes ?? undefined,
                    mandatsTypes,
                    rdvSuivi: get("rdvSuivi") ?? undefined,
                    baissePrix: get("baissePrix") ?? undefined,
                    nombreVisites: get("nombreVisites") ?? undefined,
                    offresRecues: get("offresRecues") ?? undefined,
                    compromisSignes: get("compromisSignes") ?? undefined,
                    actesSignes: get("actesSignes") ?? undefined,
                    chiffreAffaires: get("chiffreAffaires") ?? undefined,
                  };
                  const arrays: ExtractedArrays = {};
                  const userId = user?.id ?? "unknown";
                  const periodResult = convertExtractedToPeriodResults(
                    userId,
                    fields,
                    arrays,
                  );
                  addResults(periodResult);
                  if (!isDemo && user?.id) {
                    const supabase = createClient();
                    await supabase.from("period_results").upsert(
                      {
                        user_id: user.id,
                        period_type: periodResult.periodType,
                        period_start: periodResult.periodStart,
                        period_end: periodResult.periodEnd,
                        data: {
                          prospection: periodResult.prospection,
                          vendeurs: periodResult.vendeurs,
                          acheteurs: periodResult.acheteurs,
                          ventes: periodResult.ventes,
                        },
                      },
                      { onConflict: "user_id,period_type,period_start" },
                    );
                  }
                }
                if (!isDemo && user?.id) {
                  const sb = createClient();
                  awardBadgeIfEarned(sb, user.id, "archiviste").catch(() => {});
                }
                setSaving(false);
                setValidated(true);
              }}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Valider ces données"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
