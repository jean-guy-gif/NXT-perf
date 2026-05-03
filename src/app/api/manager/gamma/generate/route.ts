import { NextResponse } from "next/server";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import type { KitKind } from "@/lib/coaching/team-activation-kit";
import {
  createGammaGeneration,
  getGammaGeneration,
  GammaClientError,
  type GammaApiGeneration,
} from "@/lib/server/gamma/gamma-client";
import { buildGammaPrompt } from "@/lib/server/gamma/build-gamma-prompt";
import type {
  GammaGenerateRequestBody,
  GammaGenerationResult,
  GammaGenerationStatus,
  TeamKitContext,
} from "@/types/gamma";

/**
 * Route Next.js (PR3.8.6 follow-up #3) — orchestre la génération Gamma.
 *
 * SÉCURITÉ :
 *   - GAMMA_API_KEY n'est lue que dans `src/lib/server/gamma/gamma-client`.
 *   - Le client n'envoie jamais la clé. La route ne la log JAMAIS.
 *   - En cas d'erreur upstream, on renvoie un message HTTP générique sans
 *     stacktrace ni clé.
 *
 * V1 :
 *   - POST  → lance la génération + bref poll (max ~12 s) pour tenter de
 *             remonter le `gammaUrl` immédiatement.
 *   - GET   → poll de statut côté client (`/api/manager/gamma/generate?id=`)
 *             — garde le frontend simple sans bibliothèque tierce.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── POST : créer une génération ──────────────────────────────────────────

export async function POST(req: Request) {
  let body: GammaGenerateRequestBody;
  try {
    body = (await req.json()) as GammaGenerateRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { kitKind, expertiseId, context } = body;

  if (!isKitKind(kitKind)) {
    return NextResponse.json(
      { error: "Invalid kitKind" },
      { status: 400 },
    );
  }
  if (typeof expertiseId !== "string" || !(expertiseId in RATIO_EXPERTISE)) {
    return NextResponse.json(
      { error: "Invalid expertiseId" },
      { status: 400 },
    );
  }

  const sanitizedContext = sanitizeContext(context);

  let prompt;
  try {
    prompt = buildGammaPrompt({
      kitKind,
      expertiseId: expertiseId as ExpertiseRatioId,
      context: sanitizedContext,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to build prompt" },
      { status: 500 },
    );
  }

  let initial: GammaApiGeneration;
  try {
    initial = await createGammaGeneration({
      inputText: prompt.inputText,
      format: "presentation",
      textMode: "preserve",
      numCards: prompt.numCards,
      additionalInstructions: prompt.additionalInstructions,
    });
  } catch (err) {
    return mapGammaError(err);
  }

  // Log non sensible côté serveur (sans clé, sans payload).
  console.info("[gamma] generation created", {
    generationId: initial.generationId,
    kitKind,
    expertiseId,
    initialStatus: initial.status ?? "unknown",
  });

  // Bref poll pour tenter de récupérer le gammaUrl tout de suite.
  // Si encore pending au bout de ~12 s, on retourne l'id ; le client
  // continuera à poller via GET.
  const polled = await briefPoll(initial.generationId, initial);

  const result: GammaGenerationResult = toGenerationResult(polled);
  return NextResponse.json(result, { status: 200 });
}

// ─── GET : statut d'une génération ────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  let api: GammaApiGeneration;
  try {
    api = await getGammaGeneration(id);
  } catch (err) {
    return mapGammaError(err);
  }
  const result: GammaGenerationResult = toGenerationResult(api);
  return NextResponse.json(result, { status: 200 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isKitKind(v: unknown): v is KitKind {
  return v === "meeting" || v === "practice" || v === "weekly";
}

/**
 * Sanitise le contexte client : ne garde que les nombres finis et les
 * chaînes courtes (≤ 120 chars). Évite injection / pollution du prompt.
 */
function sanitizeContext(c: unknown): TeamKitContext | undefined {
  if (!c || typeof c !== "object") return undefined;
  const src = c as Record<string, unknown>;
  const out: TeamKitContext = {};

  for (const k of ["realised", "toDate", "monthly", "gapPct"] as const) {
    if (typeof src[k] === "number" && Number.isFinite(src[k] as number)) {
      out[k] = src[k] as number;
    }
  }
  if (
    src.rhythmStatus === "behind" ||
    src.rhythmStatus === "on_track" ||
    src.rhythmStatus === "ahead"
  ) {
    out.rhythmStatus = src.rhythmStatus;
  }
  if (typeof src.indicatorLabel === "string" && src.indicatorLabel.length <= 120) {
    out.indicatorLabel = src.indicatorLabel;
  }

  const ratio = src.ratio;
  if (ratio && typeof ratio === "object") {
    const r = ratio as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.slice(0, 120) : "";
    if (label) {
      out.ratio = {
        label,
        teamAvg:
          typeof r.teamAvg === "number" && Number.isFinite(r.teamAvg) ? r.teamAvg : 0,
        target:
          typeof r.target === "number" && Number.isFinite(r.target) ? r.target : 0,
        isPercentage:
          typeof r.isPercentage === "boolean" ? r.isPercentage : undefined,
      };
    }
  }

  const refAdvisor = src.refAdvisor;
  if (refAdvisor && typeof refAdvisor === "object") {
    const ra = refAdvisor as Record<string, unknown>;
    const name = typeof ra.name === "string" ? ra.name.slice(0, 80) : "";
    if (name) {
      out.refAdvisor = {
        name,
        levelLabel:
          typeof ra.levelLabel === "string"
            ? ra.levelLabel.slice(0, 40)
            : undefined,
        ratioValue:
          typeof ra.ratioValue === "number" && Number.isFinite(ra.ratioValue)
            ? ra.ratioValue
            : undefined,
        gapVsAvgPct:
          typeof ra.gapVsAvgPct === "number" && Number.isFinite(ra.gapVsAvgPct)
            ? ra.gapVsAvgPct
            : undefined,
      };
    }
  }

  return out;
}

async function briefPoll(
  id: string,
  initial: GammaApiGeneration,
): Promise<GammaApiGeneration> {
  if (initial.status === "completed" && initial.gammaUrl) return initial;
  // ~12 s max : 4 essais espacés de 3 s.
  let last = initial;
  for (let i = 0; i < 4; i++) {
    await sleep(3000);
    try {
      last = await getGammaGeneration(id);
    } catch {
      // En cas d'erreur transitoire, on garde le dernier état connu.
      break;
    }
    if (last.status === "completed" || last.status === "failed") return last;
  }
  return last;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toGenerationResult(api: GammaApiGeneration): GammaGenerationResult {
  return {
    generationId: api.generationId,
    status: normalizeStatus(api.status),
    gammaUrl: api.gammaUrl,
    exportUrl: api.exportUrl,
    credits: api.credits,
    errorMessage: api.message,
  };
}

function normalizeStatus(s?: string): GammaGenerationStatus {
  if (s === "completed" || s === "succeeded" || s === "success") return "completed";
  if (s === "failed" || s === "error") return "failed";
  return "pending";
}

function mapGammaError(err: unknown): NextResponse {
  if (err instanceof GammaClientError) {
    // Pas de stacktrace ni de clé renvoyées au client.
    const status = err.status && err.status >= 400 ? err.status : 502;
    return NextResponse.json(
      {
        error: "Gamma API error",
        status,
        // Message upstream sanitisé (court, pas de secret).
        upstream: err.upstreamMessage?.slice(0, 240),
      },
      { status },
    );
  }
  return NextResponse.json({ error: "Unknown error" }, { status: 500 });
}
