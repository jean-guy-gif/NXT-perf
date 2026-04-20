"use client";

import { useState, useEffect, useMemo } from "react";
import { useRatios } from "@/hooks/use-ratios";
import { useResults } from "@/hooks/use-results";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { computeDPIAxes, computeGlobalDPIScore, type DPIAxis } from "@/lib/dpi-axes";

export interface DPISnapshot {
  userId: string;
  date: string;
  axes: DPIAxis[];
  globalScore: number;
}

const DPI_STORAGE_KEY = "nxt-dpi-snapshots";

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
  const results = useResults();
  const { category } = useUser();
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemoMode);
  const coachPlans = useAppStore((s) => s.coachPlans);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const [initialSnapshot, setInitialSnapshot] = useState<DPISnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    const all = loadSnapshots();
    setInitialSnapshot(all[user.id] ?? null);
  }, [mounted, user]);

  const plan30Params = useMemo(() => {
    const activePlan = coachPlans.find(
      (p) => p.status === "ACTIVE" || p.status === "VALIDATED"
    );
    if (!activePlan) return { total: 0, done: 0, hasActivePlan: false };
    const allActions = activePlan.weeks.flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    return { total, done, hasActivePlan: total > 0 };
  }, [coachPlans]);

  const hasCustomObjectif = useMemo(
    () => !!(agencyObjective?.annualCA && agencyObjective.annualCA > 0),
    [agencyObjective]
  );

  const currentAxes = useMemo(() => {
    if (!results || !computedRatios.length) return [];
    return computeDPIAxes(results, category, computedRatios, {
      plan30Total: plan30Params.total,
      plan30Done: plan30Params.done,
      hasActivePlan: plan30Params.hasActivePlan,
      hasCustomObjectif,
      nxtTrainingActive: plan30Params.hasActivePlan,
    });
  }, [results, category, computedRatios, plan30Params, hasCustomObjectif]);

  const currentGlobalScore = useMemo(
    () => computeGlobalDPIScore(currentAxes),
    [currentAxes]
  );

  // Auto-init en démo : snapshot dégradé de -15 pts pour montrer une progression
  useEffect(() => {
    if (!mounted || !user || !isDemo) return;
    if (initialSnapshot) return;
    if (currentAxes.length === 0) return;

    const degradedAxes = currentAxes.map((a) => ({
      ...a,
      score: Math.max(10, a.score - 15),
    }));
    const degradedGlobalScore = Math.round(
      degradedAxes.reduce((s, a) => s + a.score, 0) / degradedAxes.length
    );

    const snapshot: DPISnapshot = {
      userId: user.id,
      date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      axes: degradedAxes,
      globalScore: degradedGlobalScore,
    };
    saveSnapshot(user.id, snapshot);
    setInitialSnapshot(snapshot);
  }, [mounted, user, isDemo, initialSnapshot, currentAxes]);

  const isFirstOfMonth = useMemo(() => {
    if (isDemo) return true;
    return new Date().getDate() === 1;
  }, [isDemo]);

  function initializeSnapshot() {
    if (!user || !currentAxes.length) return;
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
      const initial = initialSnapshot.axes.find((a) => a.id === current.id);
      const delta = initial ? current.score - initial.score : 0;
      return { axisId: current.id, label: current.label, initial: initial?.score ?? 0, current: current.score, delta };
    });
  }, [initialSnapshot, currentAxes]);

  const globalDelta = useMemo(() => {
    if (!initialSnapshot) return 0;
    return Math.round(currentGlobalScore - initialSnapshot.globalScore);
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
