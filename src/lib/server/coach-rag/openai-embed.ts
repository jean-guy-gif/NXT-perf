/**
 * openai-embed — wrapper embeddings via OpenRouter (OpenAI text-embedding-3-small).
 *
 * SERVEUR UNIQUEMENT. `OPENROUTER_API_KEY` lu dans process.env.
 *
 * Architecture : OpenRouter proxifie l'API OpenAI embeddings. Format
 * OpenAI-compatible (POST /v1/embeddings, response { data: [{ embedding }] }).
 *
 * Default model : openai/text-embedding-3-small (1536 dims).
 * Coût : ~0.02$/1M tokens (markup OpenRouter négligeable).
 *
 * Historique :
 *   - V1 voyage-embed (Voyage AI voyage-2 1024 dims) — abandonné car free
 *     tier rate-limited à 3 RPM (impossible pour 10K chunks).
 *   - V2 openai-embed direct OpenAI (1536 dims) — abandonné car le compte
 *     OpenAI utilisateur n'avait pas de payment method.
 *   - V3 actuel : OpenRouter proxy → openai/text-embedding-3-small. La clé
 *     OPENROUTER_API_KEY existe déjà depuis avant le chantier Coach.
 *
 * Note : le nom de fichier `openai-embed.ts` est conservé pour minimiser le
 * churn. Le modèle reste text-embedding-3-small (OpenAI), juste proxifié.
 */

const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";
const DEFAULT_MODEL =
  process.env.OPENAI_EMBED_MODEL ?? "openai/text-embedding-3-small";
const MAX_BATCH = 256;

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model?: string;
  usage?: { prompt_tokens: number; total_tokens: number };
}

export class OpenAIEmbedError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpenAIEmbedError";
  }
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenAIEmbedError(
      "OPENROUTER_API_KEY missing. Add it to .env.local and Vercel env.",
      500,
    );
  }
  return key;
}

async function embedBatch(
  texts: string[],
  model: string,
): Promise<number[][]> {
  const apiKey = getApiKey();
  const res = await fetch(OPENROUTER_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://nxt-perf.vercel.app",
      "X-Title": "NXT Performance",
    },
    body: JSON.stringify({
      input: texts,
      model,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenAIEmbedError(
      `OpenRouter embeddings ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as OpenAIEmbeddingResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Embed un seul texte. Pour ingestion (multiple), préférer embedTexts.
 *
 * Signature compatible legacy : le paramètre `inputType` est ignoré
 * (OpenAI n'a pas de notion query/document) — gardé pour minimiser les
 * changements côté callers.
 */
export async function embedText(
  text: string,
  _inputType: "query" | "document" = "query",
  model: string = DEFAULT_MODEL,
): Promise<number[]> {
  const [embedding] = await embedBatch([text], model);
  return embedding;
}

/**
 * Embed un batch de textes (auto-batché par MAX_BATCH).
 */
export async function embedTexts(
  texts: string[],
  _inputType: "query" | "document" = "document",
  model: string = DEFAULT_MODEL,
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const slice = texts.slice(i, i + MAX_BATCH);
    const embeddings = await embedBatch(slice, model);
    out.push(...embeddings);
  }
  return out;
}
