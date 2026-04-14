// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, FileText, ImageIcon, Loader2, Check, AlertCircle, X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { convertExtractedToPeriodResults } from "@/lib/weekly-gate";
import { awardBadgeIfEarned } from "@/lib/badge-service";
import type { ExtractedFields, ExtractedArrays } from "@/lib/saisie-ai-client";

interface ExtractedPeriod {
  year: number;
  month: number | null;
  metrics: Record<string, number | null>;
}

interface ImportResult {
  fileName: string;
  status: "uploading" | "extracted" | "error";
  data?: { periods: ExtractedPeriod[]; confidence: string; missing_fields: string[] };
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

const METRIC_LABELS: Record<string, string> = {
  contacts_entrants: "Contacts entrants",
  mandats_signes: "Mandats signés",
  visites_realisees: "Visites réalisées",
  offres_recues: "Offres reçues",
  compromis_signes: "Compromis signés",
  actes_signes: "Actes signés",
  ca_encaisse: "CA encaissé",
};

export function ImportPerformance({ isDemo }: ImportPerformanceProps) {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((s) => s.user);
  const addResults = useAppStore((s) => s.addResults);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const entry: ImportResult = { fileName: file.name, status: "uploading" };
      setResults(prev => [...prev, entry]);

      try {
        if (isDemo) {
          // Demo mode: simulate extraction
          await new Promise(r => setTimeout(r, 1500));
          const demoData = {
            periods: [
              { year: 2025, month: null, metrics: { contacts_entrants: 144, mandats_signes: 36, visites_realisees: 96, offres_recues: 24, compromis_signes: 18, actes_signes: 12, ca_encaisse: 120000 } },
              { year: 2024, month: null, metrics: { contacts_entrants: 120, mandats_signes: 30, visites_realisees: 80, offres_recues: 20, compromis_signes: 15, actes_signes: 10, ca_encaisse: 95000 } },
            ],
            confidence: "high" as const,
            missing_fields: [] as string[],
          };
          setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: "extracted", data: demoData } : r));
        } else {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/import-performance", { method: "POST", body: formData });
          const json = await res.json();
          if (res.ok) {
            setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: "extracted", data: json } : r));
          } else {
            setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: "error", error: json.error || "Erreur d'extraction" } : r));
          }
        }
      } catch {
        setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: "error", error: "Erreur réseau" } : r));
      }
    }
  };

  const removeFile = (fileName: string) => {
    setResults(prev => prev.filter(r => r.fileName !== fileName));
  };

  if (validated) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-green-500/30 bg-green-500/5 p-6">
        <Check className="h-8 w-8 text-green-500" />
        <p className="text-sm font-medium text-foreground">Données importées avec succès</p>
        <p className="text-xs text-muted-foreground">{results.filter(r => r.status === "extracted").length} fichier(s) traité(s)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">Importer vos données de performance</h2>
        <p className="text-xs text-muted-foreground mt-1">Excel, PDF ou images — nous analysons automatiquement vos résultats</p>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Glisser-déposer ou cliquer pour importer</p>
        <p className="text-[10px] text-muted-foreground">Excel (.xlsx, .csv), PDF, images (JPG, PNG)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
        />
      </div>

      {/* File results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => {
            const ext = r.fileName.split(".").pop()?.toLowerCase() ?? "";
            const Icon = FILE_ICONS[ext] || FileText;
            return (
              <div key={r.fileName} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate flex-1">{r.fileName}</span>
                  {r.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {r.status === "extracted" && <Check className="h-4 w-4 text-green-500" />}
                  {r.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  <button type="button" onClick={() => removeFile(r.fileName)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {r.status === "error" && (
                  <p className="text-xs text-destructive">{r.error}</p>
                )}

                {r.status === "extracted" && r.data && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-1.5 text-left text-muted-foreground font-medium">Période</th>
                          {Object.keys(METRIC_LABELS).map(k => (
                            <th key={k} className="py-1.5 text-right text-muted-foreground font-medium px-2">{METRIC_LABELS[k]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.data.periods.map((p, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-1.5 font-medium text-foreground">{p.year}{p.month ? `-${String(p.month).padStart(2, "0")}` : ""}</td>
                            {Object.keys(METRIC_LABELS).map(k => (
                              <td key={k} className={`py-1.5 text-right px-2 ${p.metrics[k] == null ? "text-destructive/60 italic" : "text-foreground"}`}>
                                {p.metrics[k] != null ? (k === "ca_encaisse" ? `${(p.metrics[k]!).toLocaleString("fr-FR")} €` : p.metrics[k]) : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r.data.missing_fields.length > 0 && (
                      <p className="mt-2 text-[10px] text-amber-500">Champs manquants : {r.data.missing_fields.join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {results.some(r => r.status === "extracted") && (
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                // Persist extracted data to store (and Supabase if not demo)
                for (const r of results.filter(r => r.status === "extracted" && r.data)) {
                  for (const period of r.data!.periods) {
                    const m = period.metrics;
                    const fields: ExtractedFields = {
                      contactsEntrants: m.contacts_entrants ?? undefined,
                      mandatsSignes: m.mandats_signes ?? undefined,
                      nombreVisites: m.visites_realisees ?? undefined,
                      offresRecues: m.offres_recues ?? undefined,
                      compromisSignes: m.compromis_signes ?? undefined,
                      actesSignes: m.actes_signes ?? undefined,
                      chiffreAffaires: m.ca_encaisse ?? undefined,
                    };
                    const arrays: ExtractedArrays = { mandats: [], informationsVente: [], acheteursChauds: [] };
                    const userId = user?.id ?? "unknown";
                    const periodResult = convertExtractedToPeriodResults(userId, fields, arrays);
                    addResults(periodResult);
                    if (!isDemo && user?.id) {
                      const supabase = createClient();
                      await supabase.from("period_results").upsert({
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
                      }, { onConflict: "user_id,period_type,period_start" });
                    }
                  }
                }
                // Award archiviste badge for first import
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
