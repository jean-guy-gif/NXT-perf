/**
 * voyage-embed — wrapper Voyage AI embeddings (POST https://api.voyageai.com/v1/embeddings).
 *
 * SERVEUR UNIQUEMENT. `VOYAGE_API_KEY` lu dans process.env.
 *
 * Doc : https://docs.voyageai.com/reference/embeddings-api
 * - Default model `voyage-2` (1024 dims) — alignable via env VOYAGE_MODEL
 * - Input cap : 128 textes par requête (voyage-2). On batch automatiquement.
 * - Input types : "query" (pour user query) ou "document" (pour ingestion chunks)
 */

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_MODEL = process.env.VOYAGE_MODEL ?? "voyage-2";
const MAX_BATCH = 128;

export type VoyageInputType = "query" | "document";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

export class VoyageError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "VoyageError";
  }
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new VoyageError(
      "VOYAGE_API_KEY missing. Add it to .env.local and Vercel env.",
      500,
    );
  }
  return key;
}

async function embedBatch(
  texts: string[],
  inputType: VoyageInputType,
  model: string,
): Promise<number[][]> {
  const apiKey = getApiKey();
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new VoyageError(
      `Voyage AI ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as VoyageResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Embed un seul texte. Pour ingestion (multiple), préférer embedTexts.
 */
export async function embedText(
  text: string,
  inputType: VoyageInputType = "query",
  model: string = DEFAULT_MODEL,
): Promise<number[]> {
  const [embedding] = await embedBatch([text], inputType, model);
  return embedding;
}

/**
 * Embed un batch de textes (auto-batché par MAX_BATCH).
 */
export async function embedTexts(
  texts: string[],
  inputType: VoyageInputType = "document",
  model: string = DEFAULT_MODEL,
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const slice = texts.slice(i, i + MAX_BATCH);
    const embeddings = await embedBatch(slice, inputType, model);
    out.push(...embeddings);
  }
  return out;
}
