"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Download,
  Dumbbell,
  ExternalLink,
  FileText,
  Loader2,
  LineChart,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamActivationSlides } from "./team-activation-slides";
import { NxtTrainingCta } from "./nxt-training-cta";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { KitKind } from "@/lib/coaching/team-activation-kit";
import type {
  GammaGenerationResult,
  GammaGenerateRequestBody,
  TeamKitContext,
} from "@/types/gamma";

interface KitCard {
  kind: KitKind;
  icon: typeof Calendar;
  title: string;
  description: string;
}

const CARDS: KitCard[] = [
  {
    kind: "meeting",
    icon: Calendar,
    title: "Réunion équipe",
    description:
      "Trame de brief prête à présenter (objectif, constat, 3 actions, engagement).",
  },
  {
    kind: "practice",
    icon: Dumbbell,
    title: "Mise en pratique",
    description:
      "3 exercices terrain (jeu de rôle, cas réel, reformulation) avec consignes.",
  },
  {
    kind: "weekly",
    icon: LineChart,
    title: "4 points hebdo",
    description:
      "Trame de suivi sur 4 semaines (questions, indicateurs, décision finale).",
  },
];

interface TeamActivationStepsProps {
  /** Levier prioritaire — null = bloc masqué. */
  expertiseId: ExpertiseRatioId | null;
  /**
   * Contexte équipe à transmettre à Gamma (chiffres réels). Optionnel — si
   * non fourni, le serveur utilise des libellés génériques. Le serveur
   * recalcule TOUT le contenu de référence (label, causes, actions) à
   * partir d'`expertiseId`.
   */
  gammaContext?: TeamKitContext;
}

type GammaUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: GammaGenerationResult }
  | { status: "error"; message: string };

const POLL_MAX_ATTEMPTS = 30; // ~ 90 s à 3 s d'intervalle après le bref poll serveur
const POLL_INTERVAL_MS = 3000;

function gammaCacheKey(kind: KitKind, expertiseId: string): string {
  // v2 — depuis le passage à `exportAs: "pdf"` côté création Gamma, les
  // anciennes entrées cache n'ont pas `exportUrl`. Bump de version pour
  // que les managers déjà ayant généré un kit récupèrent un PDF natif.
  return `gamma-kit-v2-${kind}-${expertiseId}`;
}

/**
 * Bloc "Tout est prêt pour animer votre équipe" (PR3.8.6 follow-up #3).
 *
 * 3 cartes lanceur :
 *   - "Ouvrir" → mode présentation interne (TeamActivationSlides)
 *   - "Générer avec Gamma" → POST /api/manager/gamma/generate, poll, ouvre
 *     dans un nouvel onglet une fois prêt. Cache localStorage par kit+levier
 *     pour ne pas régénérer en boucle.
 *
 * En cas d'échec Gamma, l'UX dégrade silencieusement vers les slides
 * internes (qui restent toujours fonctionnels).
 */
export function TeamActivationSteps({
  expertiseId,
  gammaContext,
}: TeamActivationStepsProps) {
  const [openKind, setOpenKind] = useState<KitKind | null>(null);
  const [gammaState, setGammaState] = useState<Record<KitKind, GammaUiState>>({
    meeting: { status: "idle" },
    practice: { status: "idle" },
    weekly: { status: "idle" },
  });

  // Hydrate from localStorage on mount / when expertise changes.
  useEffect(() => {
    if (!expertiseId) return;
    if (typeof window === "undefined") return;
    setGammaState((prev) => {
      const next = { ...prev };
      for (const card of CARDS) {
        try {
          const raw = localStorage.getItem(gammaCacheKey(card.kind, expertiseId));
          if (!raw) continue;
          const cached = JSON.parse(raw) as GammaGenerationResult;
          if (cached.status === "completed" && cached.gammaUrl) {
            next[card.kind] = { status: "success", result: cached };
          }
        } catch {
          // ignore corrupted entry
        }
      }
      return next;
    });
  }, [expertiseId]);

  const persistResult = useCallback(
    (kind: KitKind, result: GammaGenerationResult) => {
      if (!expertiseId) return;
      try {
        localStorage.setItem(
          gammaCacheKey(kind, expertiseId),
          JSON.stringify(result),
        );
      } catch {
        // localStorage indisponible : pas grave, juste pas de cache
      }
    },
    [expertiseId],
  );

  const pollUntilDone = useCallback(
    async (kind: KitKind, generationId: string) => {
      let attempts = 0;
      while (attempts < POLL_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        attempts += 1;
        try {
          const res = await fetch(
            `/api/manager/gamma/generate?id=${encodeURIComponent(generationId)}`,
            { method: "GET", cache: "no-store" },
          );
          if (!res.ok) continue;
          const data = (await res.json()) as GammaGenerationResult;
          if (data.status === "completed" && data.gammaUrl) {
            setGammaState((prev) => ({
              ...prev,
              [kind]: { status: "success", result: data },
            }));
            persistResult(kind, data);
            return;
          }
          if (data.status === "failed") {
            setGammaState((prev) => ({
              ...prev,
              [kind]: {
                status: "error",
                message: data.errorMessage ?? "Génération Gamma échouée.",
              },
            }));
            return;
          }
        } catch {
          // Erreur transitoire — on continue à poller jusqu'au max.
        }
      }
      // Timeout client : on ne marque pas en erreur tant qu'on a un id (le
      // manager pourra retenter plus tard) — bascule fallback discret.
      setGammaState((prev) => ({
        ...prev,
        [kind]: {
          status: "error",
          message: "Génération en cours plus longue que prévu.",
        },
      }));
    },
    [persistResult],
  );

  const handleGenerate = (kind: KitKind) => async () => {
    if (!expertiseId) return;
    setGammaState((prev) => ({ ...prev, [kind]: { status: "loading" } }));
    const body: GammaGenerateRequestBody = {
      kitKind: kind,
      expertiseId,
      context: gammaContext,
    };
    try {
      const res = await fetch("/api/manager/gamma/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setGammaState((prev) => ({
          ...prev,
          [kind]: {
            status: "error",
            message: "Gamma indisponible, utilisez le support intégré.",
          },
        }));
        return;
      }
      const data = (await res.json()) as GammaGenerationResult;
      if (data.status === "completed" && data.gammaUrl) {
        setGammaState((prev) => ({
          ...prev,
          [kind]: { status: "success", result: data },
        }));
        persistResult(kind, data);
        return;
      }
      if (data.status === "failed") {
        setGammaState((prev) => ({
          ...prev,
          [kind]: {
            status: "error",
            message: data.errorMessage ?? "Génération Gamma échouée.",
          },
        }));
        return;
      }
      // pending — on continue à poller côté client.
      pollUntilDone(kind, data.generationId);
    } catch {
      setGammaState((prev) => ({
        ...prev,
        [kind]: {
          status: "error",
          message: "Gamma indisponible, utilisez le support intégré.",
        },
      }));
    }
  };

  if (!expertiseId) return null;

  const handleOpen = (kind: KitKind) => () => setOpenKind(kind);
  const handleClose = () => setOpenKind(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Tout est prêt pour animer votre équipe
          </h3>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Vous pouvez ouvrir le support intégré, ou générer une présentation
          Gamma haut de gamme à partager directement.
        </p>

        <ul className="grid gap-3 sm:grid-cols-3">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            const state = gammaState[card.kind];
            return (
              <li
                key={card.kind}
                className={cn(
                  "flex flex-col rounded-lg border border-border bg-muted/30 p-4",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {card.title}
                </p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {state.status === "success" && state.result.exportUrl ? (
                    // ÉTAT PDF prêt → "Télécharger le PDF" en action principale.
                    <a
                      href={state.result.exportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger le PDF
                    </a>
                  ) : state.status === "loading" ? (
                    // ÉTAT pendant génération → bouton désactivé avec spinner.
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground opacity-70 cursor-wait"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Génération…
                    </button>
                  ) : state.status === "success" && state.result.gammaUrl ? (
                    // ÉTAT Gamma OK mais pas (encore) de PDF → slides internes
                    // en fallback primary, "Ouvrir dans Gamma" en secondary
                    // ci-dessous. On ne force JAMAIS le manager à ouvrir Gamma.
                    <button
                      type="button"
                      onClick={handleOpen(card.kind)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ouvrir
                    </button>
                  ) : (
                    // ÉTAT idle / error → "Générer avec Gamma" en action
                    // principale (le manager doit être incité à générer le
                    // PDF prêt à présenter).
                    <button
                      type="button"
                      onClick={handleGenerate(card.kind)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Générer avec Gamma
                    </button>
                  )}

                  {/* Slot secondaire — varie selon état */}
                  {state.status === "success" && state.result.gammaUrl ? (
                    <a
                      href={state.result.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir dans Gamma
                    </a>
                  ) : (
                    // Idle / loading / error : "Ouvrir" (slides internes) reste
                    // toujours accessible — ne jamais bloquer le manager.
                    <button
                      type="button"
                      onClick={handleOpen(card.kind)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ouvrir
                    </button>
                  )}

                  {/* Lien tertiaire "Voir aperçu" quand le PDF est prêt */}
                  {state.status === "success" && state.result.exportUrl && (
                    <button
                      type="button"
                      onClick={handleOpen(card.kind)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
                    >
                      Voir aperçu
                    </button>
                  )}

                </div>

                {/* CTA NXT Training — uniquement sur la card "Mise en pratique" */}
                {card.kind === "practice" && (
                  <div className="mt-2">
                    <NxtTrainingCta />
                  </div>
                )}

                {/* Status message pendant génération */}
                {state.status === "loading" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Génération du support et préparation du PDF…
                  </p>
                )}

                {state.status === "success" && state.result.credits != null && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Crédits Gamma consommés : {state.result.credits}
                  </p>
                )}
                {state.status === "error" && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {state.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <TeamActivationSlides
        open={openKind !== null}
        onClose={handleClose}
        kind={openKind}
        expertiseId={expertiseId}
      />
    </>
  );
}
