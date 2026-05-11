"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

export interface DpiSnapshot {
  id: string;
  /** Format YYYY-MM, ex "2026-05". */
  snapshotMonth: string;
  globalScore: number;
  axes: Array<{ id: string; label: string; score: number }>;
  createdAt: string;
}

interface UseDpiSnapshotHistoryReturn {
  /** Triés par `snapshotMonth` DESC (le plus récent en premier). */
  snapshots: DpiSnapshot[];
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * useDpiSnapshotHistory — chantier vue évolution DPI.
 *
 * Lit l'historique des snapshots DPI mensuels d'un user via RLS
 * `dpi_snapshots_own`. Sorted DESC sur `snapshot_month` (le mois le plus
 * récent en premier — utile pour identifier le "DPI initial" comme dernier
 * élément du tableau).
 *
 * Mode démo : early-return `[]` (pas de DB consommée — cohérent avec
 * `useDpiSnapshotEnsure` qui ne crée rien en démo).
 */
export function useDpiSnapshotHistory(
  userId: string | null,
): UseDpiSnapshotHistoryReturn {
  const isDemo = useAppStore((s) => s.isDemoMode);
  const [snapshots, setSnapshots] = useState<DpiSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (isDemo || !userId) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dpi_snapshots")
        .select("id, snapshot_month, global_score, axes, created_at")
        .eq("user_id", userId)
        .order("snapshot_month", { ascending: false });

      if (error) {
        console.error(
          "[use-dpi-snapshot-history] fetch error",
          error.message,
        );
        setSnapshots([]);
        return;
      }

      setSnapshots(
        (data ?? []).map((r) => {
          const row = r as {
            id: string;
            snapshot_month: string;
            global_score: number;
            axes: Array<{ id: string; label: string; score: number }>;
            created_at: string;
          };
          return {
            id: row.id,
            snapshotMonth: row.snapshot_month,
            globalScore: Number(row.global_score),
            axes: row.axes,
            createdAt: row.created_at,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [isDemo, userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { snapshots, loading, refresh: fetchHistory };
}
