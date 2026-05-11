"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";

/**
 * useDpiSnapshotEnsure — trigger client-side au login (chantier vue évolution DPI).
 *
 * Assure qu'il existe une row `dpi_snapshots` pour (user_id, snapshot_month
 * = mois courant). Si absent, l'insère à partir des `currentAxes` calculés
 * par `useDPIEvolution`.
 *
 * Migration douce localStorage → DB :
 *   - Au premier run, lit la clé legacy `nxt-dpi-snapshots` (format
 *     `Record<userId, { date, axes, globalScore }>`)
 *   - Si présent pour l'utilisateur courant, INSERT en upsert `dpi_snapshots`
 *     avec `snapshot_month = legacy.date.slice(0, 7)`
 *   - Supprime ensuite la clé localStorage pour éviter re-migration
 *
 * RLS prod : `dpi_snapshots_own` (user fait tout sur ses propres rows).
 *
 * Mode démo : early-return (pas de DB). Pas de migration ni d'INSERT.
 *
 * Guard `useRef` : exécuté UNE SEULE FOIS par mount (pas de re-trigger si
 * `currentAxes` change suite à des saisies de ratios — le snapshot mensuel
 * est figé au début du mois).
 */
export function useDpiSnapshotEnsure(userId: string | null): void {
  const isDemo = useAppStore((s) => s.isDemoMode);
  const { currentAxes, currentGlobalScore, mounted } = useDPIEvolution();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (isDemo || !userId || !mounted || hasRunRef.current) return;
    if (!currentAxes || currentAxes.length === 0) return;

    hasRunRef.current = true;

    const ensureSnapshot = async () => {
      const supabase = createClient();
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // ─── Étape 1 — Migration douce du localStorage (1er run only) ─────
      try {
        if (typeof window !== "undefined") {
          const legacyRaw = window.localStorage.getItem("nxt-dpi-snapshots");
          if (legacyRaw) {
            const legacyData = JSON.parse(legacyRaw) as Record<
              string,
              {
                userId?: string;
                date?: string;
                axes?: Array<{ id: string; label: string; score: number }>;
                globalScore?: number;
              }
            >;
            const userLegacy = legacyData[userId];
            if (userLegacy?.date && userLegacy?.axes && userLegacy.axes.length > 0) {
              const legacyMonth = userLegacy.date.slice(0, 7);
              await supabase.from("dpi_snapshots").upsert(
                {
                  user_id: userId,
                  snapshot_month: legacyMonth,
                  global_score: userLegacy.globalScore ?? 0,
                  axes: userLegacy.axes,
                },
                {
                  onConflict: "user_id,snapshot_month",
                  ignoreDuplicates: true,
                },
              );
            }
            window.localStorage.removeItem("nxt-dpi-snapshots");
          }
        }
      } catch (e) {
        console.warn(
          "[use-dpi-snapshot-ensure] legacy migration failed",
          e instanceof Error ? e.message : String(e),
        );
      }

      // ─── Étape 2 — Snapshot du mois courant si absent ─────────────────
      const { data: existing, error: selectErr } = await supabase
        .from("dpi_snapshots")
        .select("id")
        .eq("user_id", userId)
        .eq("snapshot_month", currentMonth)
        .maybeSingle();

      if (selectErr) {
        console.error(
          "[use-dpi-snapshot-ensure] select error",
          selectErr.message,
        );
        return;
      }

      if (!existing) {
        const { error: insertErr } = await supabase
          .from("dpi_snapshots")
          .insert({
            user_id: userId,
            snapshot_month: currentMonth,
            global_score: currentGlobalScore,
            axes: currentAxes,
          });
        if (insertErr) {
          console.error(
            "[use-dpi-snapshot-ensure] insert error",
            insertErr.message,
          );
        }
      }
    };

    ensureSnapshot().catch((e) =>
      console.error(
        "[use-dpi-snapshot-ensure] failed",
        e instanceof Error ? e.message : String(e),
      ),
    );
  }, [userId, mounted, isDemo, currentAxes, currentGlobalScore]);
}
