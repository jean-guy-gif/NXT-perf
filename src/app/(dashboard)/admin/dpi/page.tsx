"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DPIScores } from "@/lib/dpi-scoring";

interface DPIResult {
  id: string;
  email: string;
  status: string;
  context_answers: Record<string, number> | null;
  performance_answers: Record<string, number> | null;
  scores: DPIScores | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  started: { label: "Démarré", color: "bg-yellow-500/10 text-yellow-600" },
  completed: { label: "Complété", color: "bg-green-500/10 text-green-600" },
  pdf_downloaded: { label: "PDF téléchargé", color: "bg-blue-500/10 text-blue-600" },
};

const CA_LABELS: Record<number, string> = {
  1: "< 100k€",
  2: "100-250k€",
  3: "250-500k€",
  4: "> 500k€",
};

export default function AdminDPIPage() {
  const [results, setResults] = useState<DPIResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("dpi_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setResults(data as DPIResult[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.status === filter);
  }, [results, filter]);

  const exportCSV = () => {
    const headers = ["Email", "Date", "Statut", "Score", "Potentiel", "CA actuel", "Niveau"];
    const rows = results.map((r) => [
      r.email,
      new Date(r.created_at).toLocaleDateString("fr-FR"),
      STATUS_LABELS[r.status]?.label ?? r.status,
      r.scores?.globalScore ?? "",
      r.scores?.potentialScore ?? "",
      r.context_answers ? CA_LABELS[r.context_answers.ctx_ca] ?? "" : "",
      r.scores?.level ?? "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dpi-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads DPI</h1>
          <p className="text-sm text-muted-foreground">{results.length} diagnostic{results.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Tous" },
          { value: "started", label: "Démarrés" },
          { value: "completed", label: "Complétés" },
          { value: "pdf_downloaded", label: "PDF téléchargé" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>Email</span>
          <span>Date</span>
          <span>Statut</span>
          <span>Score</span>
          <span>Potentiel</span>
          <span>CA</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun diagnostic trouvé
          </div>
        ) : (
          filtered.map((r) => {
            const isExpanded = expandedId === r.id;
            const statusInfo = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-muted text-muted-foreground" };
            const caLabel = r.context_answers ? CA_LABELS[r.context_answers.ctx_ca] ?? "—" : "—";

            return (
              <div key={r.id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="grid w-full grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="truncate font-medium text-foreground">{r.email}</span>
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                  <span className="font-bold text-foreground">
                    {r.scores?.globalScore ?? "—"}
                  </span>
                  <span className="text-[#A055FF]">
                    {r.scores?.potentialScore ?? "—"}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {caLabel}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>

                {isExpanded && r.scores && (
                  <div className="border-t border-border bg-muted/30 px-4 py-4">
                    <div className="mb-3 text-sm font-medium text-foreground">
                      Niveau : {r.scores.level}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {r.scores.axes.map((axis) => (
                        <div key={axis.id} className="rounded-lg bg-card p-3">
                          <p className="text-xs text-muted-foreground">{axis.label}</p>
                          <p className="text-lg font-bold text-foreground">{axis.score}</p>
                          <p className="text-xs text-[#A055FF]">Potentiel : {axis.potential}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
