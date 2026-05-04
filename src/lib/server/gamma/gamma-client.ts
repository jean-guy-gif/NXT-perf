/**
 * Gamma API client (PR3.8.6 follow-up #3).
 *
 * SERVEUR UNIQUEMENT — ne jamais importer depuis un composant client.
 * `GAMMA_API_KEY` est lue dans `process.env` ; aucune valeur secrète ne
 * remonte vers le client (seules les fonctions résultats sont exposées via
 * une route Next.js qui filtre la réponse).
 */

const GAMMA_BASE_URL = "https://public-api.gamma.app/v1.0";

export interface GammaCreateInput {
  /** Texte structuré (markdown léger avec `---` entre slides). */
  inputText: string;
  /** Format de sortie. */
  format?: "presentation" | "document" | "social";
  /**
   * "preserve" pour conserver le texte fourni tel quel, "generate" pour
   * laisser Gamma reformuler.
   */
  textMode?: "preserve" | "generate";
  /** Nombre de cards visé (Gamma peut adapter). */
  numCards?: number;
  /** Instructions additionnelles (style, ton, public). */
  additionalInstructions?: string;
  /** Thème Gamma (slug). */
  themeName?: string;
  /**
   * Demande à Gamma d'exporter la présentation au format choisi à la création.
   * Quand fourni, la réponse `GET /generations/{id}` finit par contenir
   * `exportUrl` pointant sur le fichier exporté (PDF/PPTX). Sans ce flag,
   * Gamma renvoie uniquement `gammaUrl` (vue web).
   */
  exportAs?: "pdf" | "pptx";
}

export interface GammaApiGeneration {
  generationId: string;
  status?: string;
  /** URL Gamma de la présentation générée. */
  gammaUrl?: string;
  /** URL d'export (PDF/PPTX) si Gamma la calcule. */
  exportUrl?: string;
  /** Crédits consommés (peut ne pas être renvoyé). */
  credits?: number;
  /** Message d'erreur si l'API en remonte un. */
  message?: string;
}

class GammaClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly upstreamMessage?: string,
  ) {
    super(message);
    this.name = "GammaClientError";
  }
}

function readApiKey(): string {
  const key = process.env.GAMMA_API_KEY;
  if (!key) {
    throw new GammaClientError(
      "GAMMA_API_KEY missing in server environment",
      500,
    );
  }
  return key;
}

/**
 * Appel HTTP générique. Timeout 30s ; aucune valeur sensible loggée.
 */
async function gammaFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<unknown> {
  const apiKey = readApiKey();
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 30_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${GAMMA_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        // En-tête officiel Gamma pour l'API publique.
        "X-API-KEY": apiKey,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      const upstreamMessage =
        (typeof body === "object" && body && "message" in body
          ? String((body as { message: unknown }).message)
          : null) ?? `HTTP ${res.status}`;
      throw new GammaClientError(
        `Gamma API error ${res.status}`,
        res.status,
        upstreamMessage,
      );
    }
    return body;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new GammaClientError("Gamma API timeout", 504);
    }
    if (err instanceof GammaClientError) throw err;
    throw new GammaClientError(
      "Gamma API unreachable",
      502,
      (err as Error).message,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lance une génération Gamma. Renvoie un identifiant à poller via
 * `getGammaGeneration`.
 */
export async function createGammaGeneration(
  input: GammaCreateInput,
): Promise<GammaApiGeneration> {
  const body = {
    inputText: input.inputText,
    format: input.format ?? "presentation",
    textMode: input.textMode ?? "preserve",
    ...(input.numCards != null ? { numCards: input.numCards } : {}),
    ...(input.additionalInstructions
      ? { additionalInstructions: input.additionalInstructions }
      : {}),
    ...(input.themeName ? { themeName: input.themeName } : {}),
    ...(input.exportAs ? { exportAs: input.exportAs } : {}),
  };

  const raw = await gammaFetch("/generations", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return normalizeGenerationResponse(raw);
}

/**
 * Récupère le statut courant d'une génération Gamma.
 */
export async function getGammaGeneration(
  generationId: string,
): Promise<GammaApiGeneration> {
  if (!generationId) {
    throw new GammaClientError("Missing generationId", 400);
  }
  const raw = await gammaFetch(
    `/generations/${encodeURIComponent(generationId)}`,
    { method: "GET" },
  );
  return normalizeGenerationResponse(raw);
}

// ─── Normalisation défensive ──────────────────────────────────────────────

function normalizeGenerationResponse(raw: unknown): GammaApiGeneration {
  if (!raw || typeof raw !== "object") {
    throw new GammaClientError("Gamma API: invalid response shape", 502);
  }
  const obj = raw as Record<string, unknown>;
  const generationId =
    typeof obj.generationId === "string"
      ? obj.generationId
      : typeof obj.id === "string"
        ? obj.id
        : "";
  if (!generationId) {
    throw new GammaClientError("Gamma API: missing generationId", 502);
  }

  const status = typeof obj.status === "string" ? obj.status : undefined;
  const gammaUrl =
    typeof obj.gammaUrl === "string"
      ? obj.gammaUrl
      : typeof obj.url === "string"
        ? obj.url
        : undefined;
  const exportUrl =
    typeof obj.exportUrl === "string" ? obj.exportUrl : undefined;
  const credits =
    typeof obj.credits === "number" ? obj.credits : undefined;
  const message = typeof obj.message === "string" ? obj.message : undefined;

  return { generationId, status, gammaUrl, exportUrl, credits, message };
}

export { GammaClientError };
