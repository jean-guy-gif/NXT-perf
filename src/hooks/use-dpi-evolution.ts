"use client";

import { useState, useEffect, useMemo } from "react";
import { useRatios } from "@/hooks/use-ratios";
import { useAppStore } from "@/stores/app-store";

export interface DPISnapshot {
  userId: string;
  date: string;
  axes: Array<{ axisId: string; label: string; score: number }>;
  globalScore: number;
}

const DPI_STORAGE_KEY = "nxt-dpi-snapshots";

const RATIO_LABELS: Record<string, string> = {
  contacts_rdv: "Prospection",
  estimations_mandats: "Mandatement",
  pct_mandats_exclusifs: "Exclusivité",
  visites_offre: "Transformation",
  offres_compromis: "Concrétisation",
  mandats_simples_vente: "Vente simple",
  mandats_exclusifs_vente: "Vente exclu.",
};

function loadSnapshots(): Record<string, DPISnapshot> {
  try {
    const raw = localStorage.getItem(DPI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSnapshot(userId: string, snapshot: DPISnapshot) {
  try {
    const all = loadSnapshots();
    all[userId] = snapshot;
    localStorage.setItem(DPI_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function useDPIEvolution() {
  const { computedRatios } = useRatios();
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const [initialSnapshot, setInitialSnapshot] = useState<DPISnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    const all = loadSnapshots();
    setInitialSnapshot(all[user.id] ?? null);
  }, [mounted, user]);

  const currentAxes = useMemo(() =>
    computedRatios.map((r) => ({
      axisId: r.ratioId,
      label: RATIO_LABELS[r.ratioId] ?? r.ratioId,
      score: Math.min(100, Math.round(r.percentageOfTarget)),
    })),
    [computedRatios]
  );

  const currentGlobalScore = useMemo(() =>
    currentAxes.length > 0
      ? Math.round(currentAxes.reduce((acc, a) => acc + a.score, 0) / currentAxes.length)
      : 0,
    [currentAxes]
  );

  const isFirstOfMonth = useMemo(() => {
    if (isDemo) return true;
    return new Date().getDate() === 1;
  }, [isDemo]);

  function initializeSnapshot() {
    if (!user || !computedRatios.length) return;
    const snapshot: DPISnapshot = {
      userId: user.id,
      date: new Date().toISOString(),
      axes: currentAxes,
      globalScore: currentGlobalScore,
    };
    saveSnapshot(user.id, snapshot);
    setInitialSnapshot(snapshot);
  }

  const progression = useMemo(() => {
    if (!initialSnapshot) return null;
    return currentAxes.map((current) => {
      const initial = initialSnapshot.axes.find((a) => a.axisId === current.axisId);
      const delta = initial ? current.score - initial.score : 0;
      return { axisId: current.axisId, label: current.label, initial: initial?.score ?? 0, current: current.score, delta };
    });
  }, [initialSnapshot, currentAxes]);

  const globalDelta = useMemo(() => {
    if (!initialSnapshot) return 0;
    return currentGlobalScore - initialSnapshot.globalScore;
  }, [initialSnapshot, currentGlobalScore]);

  const smiley: "happy" | "neutral" | "sad" = globalDelta > 5 ? "happy" : globalDelta < -5 ? "sad" : "neutral";

  return {
    initialSnapshot,
    currentAxes,
    currentGlobalScore,
    isFirstOfMonth,
    progression,
    globalDelta,
    smiley,
    hasSnapshot: !!initialSnapshot,
    initializeSnapshot,
    mounted,
  };
}
