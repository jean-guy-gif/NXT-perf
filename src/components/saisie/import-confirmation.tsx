"use client";

import { useState } from "react";
import {
  CheckCircle, RotateCcw, AlertTriangle, FileCheck, Loader2,
} from "lucide-react";
import type {
  ExtractedFields, ExtractedArrays, MandatType,
} from "@/lib/saisie-ai-client";

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportConfirmationProps {
  extracted: ExtractedFields;
  arrays: ExtractedArrays;
  uncertain: string[];
  unmapped: string[];
  description: string;
  onConfirm: (fields: ExtractedFields, arrays: ExtractedArrays) => void;
  onReset: () => void;
  isSaving?: boolean;
}

// ── Field definitions ────────────────────────────────────────────────────────

type NumericFieldKey = Exclude<keyof ExtractedFields, "mandatsTypes">;

const FIELD_LABELS: Record<NumericFieldKey, string> = {
  contactsTotaux:              "Contacts totaux",
  rdvEstimation:               "RDV estimations",
  estimationsRealisees:        "Estimations réalisées",
  mandatsSignes:               "Mandats signés",
  rdvSuivi:                    "RDV suivi vendeurs",
  requalificationSimpleExclusif: "Requalif simple → exclu",
  baissePrix:                  "Baisses de prix",
  acheteursSortisVisite:       "Acheteurs sortis en visite",
  nombreVisites:               "Visites réalisées",
  offresRecues:                "Offres reçues",
  compromisSignes:             "Compromis signés",
  chiffreAffairesCompromis:    "CA compromis (€)",
  actesSignes:                 "Actes signés",
  chiffreAffaires:             "Chiffre d'affaires (€)",
};

const SECTIONS: { title: string; fields: NumericFieldKey[] }[] = [
  {
    title: "Prospection vendeur",
    fields: [
      "contactsTotaux", "rdvEstimation", "estimationsRealisees",
      "mandatsSignes",
    ],
  },
  {
    title: "Pilotage portefeuille",
    fields: ["rdvSuivi", "baissePrix", "requalificationSimpleExclusif"],
  },
  {
    title: "Transaction acheteur",
    fields: [
      "acheteursSortisVisite", "nombreVisites", "offresRecues",
      "compromisSignes", "chiffreAffairesCompromis",
      "actesSignes", "chiffreAffaires",
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

// ── Component ────────────────────────────────────────────────────────────────

export function ImportConfirmation({
  extracted,
  arrays: _arrays,
  uncertain,
  unmapped,
  description,
  onConfirm,
  onReset,
  isSaving = false,
}: ImportConfirmationProps) {
  const [fields, setFields] = useState<ExtractedFields>({ ...extracted });

  // Sync mandatsTypes length with mandatsSignes
  const mandatsCount = fields.mandatsSignes ?? 0;
  const mandatsTypes: Array<MandatType | null> = (() => {
    const provided = fields.mandatsTypes ?? [];
    const out: Array<MandatType | null> = Array(mandatsCount).fill(null);
    for (let i = 0; i < Math.min(provided.length, mandatsCount); i++) {
      out[i] = provided[i];
    }
    return out;
  })();

  const allMandatsTyped =
    mandatsCount === 0 || mandatsTypes.every((t) => t !== null);

  const filledCount = ALL_FIELDS.filter((f) => fields[f] !== undefined).length;
  const totalCount = ALL_FIELDS.length;
  const missingCount = totalCount - filledCount;

  const updateField = (key: NumericFieldKey, value: string) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[key];
      } else {
        (next as Record<string, number>)[key] = Number(value);
      }
      return next;
    });
  };

  const setMandatType = (index: number, type: MandatType) => {
    setFields((prev) => {
      const current = prev.mandatsTypes ?? [];
      const total = prev.mandatsSignes ?? 0;
      const next: MandatType[] = Array(total).fill("simple");
      for (let i = 0; i < total; i++) {
        next[i] = i === index ? type : (current[i] ?? "simple");
      }
      return { ...prev, mandatsTypes: next };
    });
  };

  const handleConfirm = () => {
    if (!allMandatsTyped) return;
    onConfirm(fields, {});
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 space-y-3 shrink-0">
        {description && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck className="h-4 w-4 shrink-0" />
            <span>{description}</span>
          </div>
        )}

        {/* Résumé X / Y */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
              {filledCount} renseignés
            </span>
          </div>
          {missingCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {missingCount} à compléter
              </span>
            </div>
          )}
        </div>

        {/* Unmapped labels */}
        {unmapped.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
              Libellés non reconnus
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {unmapped.join(" · ")}
            </p>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5 min-h-0">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.fields.map((f) => {
                const isUncertain = uncertain.includes(f);
                const hasValue = fields[f] !== undefined;

                return (
                  <div
                    key={f}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                      isUncertain
                        ? "border-amber-500/40 bg-amber-500/5"
                        : hasValue
                          ? "border-border bg-card"
                          : "border-dashed border-border/60 bg-muted/30"
                    }`}
                  >
                    <span className="text-sm text-foreground flex items-center gap-1.5">
                      {FIELD_LABELS[f]}
                      {isUncertain && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={f === "chiffreAffaires" || f === "chiffreAffairesCompromis" ? 100 : 1}
                      value={fields[f] ?? ""}
                      onChange={(e) => updateField(f, e.target.value)}
                      placeholder="—"
                      className="w-24 rounded-md border border-input bg-background px-2.5 py-1.5 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {mandatsCount > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Type de chaque mandat
            </p>
            <div className="space-y-2">
              {mandatsTypes.map((choice, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    choice === null
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="w-20 text-sm font-semibold text-foreground">
                    Mandat {i + 1}
                  </span>
                  {(["simple", "exclusif"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMandatType(i, t)}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                        choice === t
                          ? t === "exclusif"
                            ? "bg-emerald-500 text-white"
                            : "bg-amber-500 text-white"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t === "exclusif" ? "Exclusif" : "Simple"}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {!allMandatsTyped && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Choisis le type pour chaque mandat.
              </p>
            )}
          </div>
        )}

      </div>

      {/* Actions */}
      <div className="px-5 pb-5 pt-3 flex gap-2 shrink-0 border-t border-border">
        <button
          onClick={onReset}
          disabled={isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
          title="Recommencer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSaving || !allMandatsTyped}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
