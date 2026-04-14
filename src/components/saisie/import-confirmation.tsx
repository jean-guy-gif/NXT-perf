// @ts-nocheck
"use client";

import { useState } from "react";
import {
  CheckCircle, RotateCcw, AlertTriangle, FileCheck, Loader2,
} from "lucide-react";
import type {
  ExtractedFields, ExtractedArrays, MandatDetail,
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

type FieldKey = keyof ExtractedFields;

const FIELD_LABELS: Record<FieldKey, string> = {
  contactsTotaux:              "Contacts totaux",
  rdvEstimation:               "RDV estimations",
  estimationsRealisees:        "Estimations réalisées",
  mandatsSignes:               "Mandats signés",
  rdvSuivi:                    "RDV suivi vendeurs",
  requalificationSimpleExclusif: "Requalifications S→E",
  baissePrix:                  "Baisses de prix",
  acheteursSortisVisite:       "Acheteurs sortis en visite",
  nombreVisites:               "Visites réalisées",
  offresRecues:                "Offres reçues",
  compromisSignes:             "Compromis signés",
  chiffreAffairesCompromis:    "CA compromis (€)",
  actesSignes:                 "Actes signés",
  chiffreAffaires:             "Chiffre d'affaires (€)",
};

const SECTIONS: { title: string; fields: FieldKey[] }[] = [
  {
    title: "Prospection vendeur",
    fields: ["contactsTotaux", "rdvEstimation"],
  },
  {
    title: "Vendeurs",
    fields: [
      "estimationsRealisees", "mandatsSignes", "rdvSuivi",
      "requalificationSimpleExclusif", "baissePrix",
    ],
  },
  {
    title: "Acheteurs",
    fields: [
      "acheteursSortisVisite", "nombreVisites",
      "offresRecues", "compromisSignes", "chiffreAffairesCompromis",
    ],
  },
  {
    title: "Ventes",
    fields: ["actesSignes", "chiffreAffaires"],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

// ── Component ────────────────────────────────────────────────────────────────

export function ImportConfirmation({
  extracted,
  arrays,
  uncertain,
  unmapped,
  description,
  onConfirm,
  onReset,
  isSaving = false,
}: ImportConfirmationProps) {
  const [fields, setFields] = useState<ExtractedFields>({ ...extracted });
  const [mandats, setMandats] = useState<MandatDetail[]>([...arrays.mandats]);

  const filledCount = ALL_FIELDS.filter((f) => fields[f] !== undefined).length;
  const totalCount = ALL_FIELDS.length;
  const missingCount = totalCount - filledCount;

  const updateField = (key: FieldKey, value: string) => {
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

  const handleConfirm = () => {
    onConfirm(fields, { mandats });
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

        {/* Mandats detail */}
        {mandats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Détails mandats
            </p>
            {mandats.map((m, i) => (
              <div
                key={i}
                className="mb-2 rounded-xl border border-border bg-card p-3 space-y-2"
              >
                <p className="text-xs font-medium text-foreground">
                  Mandat {i + 1}
                </p>
                <input
                  type="text"
                  placeholder="Nom du vendeur"
                  value={m.nomVendeur}
                  onChange={(e) => {
                    const next = [...mandats];
                    next[i] = { ...next[i], nomVendeur: e.target.value };
                    setMandats(next);
                  }}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  {(["simple", "exclusif"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        const next = [...mandats];
                        next[i] = { ...next[i], type: t };
                        setMandats(next);
                      }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        m.type === t
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
          disabled={isSaving}
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
