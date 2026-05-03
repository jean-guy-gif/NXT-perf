"use client";

import { useEffect, useState } from "react";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import {
  getCoachingPattern,
  type CoachingPattern,
} from "@/lib/coaching/coach-brain";

/**
 * useCoachingPattern (PR-B — PR3.8 follow-up).
 *
 * Récupère le pattern coaching pour un levier donné en privilégiant la
 * source serveur (table `coach_brain_patterns` via
 * `/api/manager/coach-brain/pattern`) puis bascule en silence sur le
 * fallback hardcoded `getCoachingPattern` du coach-brain.
 *
 * Stratégie de chargement :
 *   - Au montage : `pattern` est immédiatement le fallback synchrone →
 *     l'UI ne bloque jamais.
 *   - En arrière-plan : fetch de l'endpoint. Si 200, on REMPLACE par le
 *     pattern serveur (`source = "server"`). Si 404 ou erreur, on garde
 *     le fallback (`source = "fallback"`), aucun message agressif.
 *
 * Signature stable : compatible avec un futur déménagement vers un
 * service plus riche (RAG, embeddings) sans changer les consommateurs.
 */

export type CoachingPatternSource = "server" | "fallback";

export interface UseCoachingPatternResult {
  pattern: CoachingPattern | null;
  isLoading: boolean;
  error: Error | null;
  source: CoachingPatternSource;
}

export function useCoachingPattern(
  expertiseId: ExpertiseRatioId | null,
): UseCoachingPatternResult {
  // Initialisation synchrone avec le fallback : l'UI a toujours un
  // pattern utilisable au premier render.
  const initialFallback = expertiseId ? getCoachingPattern(expertiseId) : null;

  const [pattern, setPattern] = useState<CoachingPattern | null>(
    initialFallback,
  );
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(expertiseId));
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<CoachingPatternSource>("fallback");

  useEffect(() => {
    if (!expertiseId) {
      setPattern(null);
      setIsLoading(false);
      setError(null);
      setSource("fallback");
      return;
    }

    // Reset sur changement de levier : on repart sur le fallback local
    // (instant), puis on tente le serveur.
    const localFallback = getCoachingPattern(expertiseId);
    setPattern(localFallback);
    setSource("fallback");
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch(
      `/api/manager/coach-brain/pattern?expertiseId=${encodeURIComponent(expertiseId)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (res) => {
        if (res.status === 200) {
          const data = (await res.json()) as CoachingPattern;
          if (controller.signal.aborted) return;
          setPattern(data);
          setSource("server");
          return;
        }
        // 404 / 400 / 500 : on garde le fallback déjà en place. Pas d'UI
        // agressive — la seule trace est `source === "fallback"`.
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // Erreur réseau / aborted hors signal : on conserve le fallback,
        // on remonte l'erreur pour debug mais elle n'est pas affichée.
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [expertiseId]);

  return { pattern, isLoading, error, source };
}
