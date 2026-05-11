/**
 * retrieve — recherche cosine top-k dans Supabase pgvector.
 *
 * SERVEUR UNIQUEMENT. Appelle les RPC coach_chunks_search et
 * coach_syntheses_search (cf. migration coach_rag_infrastructure).
 *
 * Politique retrieval hybride (alignée nxt-coach/lib/rag.ts) :
 *   - 4 synthèses (vue d'ensemble, contexte) + 6 chunks (détails actionables)
 *   - Cap total ~10 résultats pour rester sous le budget tokens system prompt
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/server/coach-rag/voyage-embed";

const DEFAULT_TOP_CHUNKS = 6;
const DEFAULT_TOP_SYNTHESES = 4;

export interface RetrievedChunk {
  id: number;
  sourceId: number;
  content: string;
  similarity: number;
  sourceTitle: string | null;
  sourceKind: string;
}

export interface RetrievedSynthesis {
  id: number;
  sourceId: number;
  sectionLabel: string | null;
  content: string;
  similarity: number;
  sourceTitle: string | null;
}

export interface RetrievalBundle {
  chunks: RetrievedChunk[];
  syntheses: RetrievedSynthesis[];
}

let cachedClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service role credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

interface ChunkRow {
  id: number;
  source_id: number;
  content: string;
  similarity: number;
  source_title: string | null;
  source_kind: string;
}

interface SynthesisRow {
  id: number;
  source_id: number;
  section_label: string | null;
  content: string;
  similarity: number;
  source_title: string | null;
}

export async function retrieveChunks(
  query: string,
  topK: number = DEFAULT_TOP_CHUNKS,
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query, "query");
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("coach_chunks_search", {
    query_embedding: embedding as unknown as string,
    match_count: topK,
  });
  if (error) {
    console.error("[coach-rag/retrieve] chunks RPC error", error.message);
    return [];
  }
  return ((data ?? []) as ChunkRow[]).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    content: row.content,
    similarity: row.similarity,
    sourceTitle: row.source_title,
    sourceKind: row.source_kind,
  }));
}

export async function retrieveSyntheses(
  query: string,
  topK: number = DEFAULT_TOP_SYNTHESES,
): Promise<RetrievedSynthesis[]> {
  const embedding = await embedText(query, "query");
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("coach_syntheses_search", {
    query_embedding: embedding as unknown as string,
    match_count: topK,
  });
  if (error) {
    console.error("[coach-rag/retrieve] syntheses RPC error", error.message);
    return [];
  }
  return ((data ?? []) as SynthesisRow[]).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    sectionLabel: row.section_label,
    content: row.content,
    similarity: row.similarity,
    sourceTitle: row.source_title,
  }));
}

/**
 * Retrieval hybride : 1 seul embedding réutilisé pour les 2 RPC.
 * Plus efficient que d'appeler retrieveChunks + retrieveSyntheses séparément.
 */
export async function retrieveHybrid(
  query: string,
  options: { topChunks?: number; topSyntheses?: number } = {},
): Promise<RetrievalBundle> {
  const topChunks = options.topChunks ?? DEFAULT_TOP_CHUNKS;
  const topSyntheses = options.topSyntheses ?? DEFAULT_TOP_SYNTHESES;

  const embedding = await embedText(query, "query");
  const supabase = getServiceClient();
  const embeddingParam = embedding as unknown as string;

  const [chunksRes, synthesesRes] = await Promise.all([
    supabase.rpc("coach_chunks_search", {
      query_embedding: embeddingParam,
      match_count: topChunks,
    }),
    supabase.rpc("coach_syntheses_search", {
      query_embedding: embeddingParam,
      match_count: topSyntheses,
    }),
  ]);

  const chunks: RetrievedChunk[] = chunksRes.error
    ? []
    : ((chunksRes.data ?? []) as ChunkRow[]).map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        content: row.content,
        similarity: row.similarity,
        sourceTitle: row.source_title,
        sourceKind: row.source_kind,
      }));

  const syntheses: RetrievedSynthesis[] = synthesesRes.error
    ? []
    : ((synthesesRes.data ?? []) as SynthesisRow[]).map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        sectionLabel: row.section_label,
        content: row.content,
        similarity: row.similarity,
        sourceTitle: row.source_title,
      }));

  if (chunksRes.error) {
    console.error("[coach-rag/retrieve] chunks RPC", chunksRes.error.message);
  }
  if (synthesesRes.error) {
    console.error(
      "[coach-rag/retrieve] syntheses RPC",
      synthesesRes.error.message,
    );
  }

  return { chunks, syntheses };
}

export async function listConcepts(
  limit: number = 60,
): Promise<Array<{ name: string; definition: string }>> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("coach_concepts")
    .select("name, definition")
    .order("name", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[coach-rag/retrieve] concepts error", error.message);
    return [];
  }
  return (data ?? []) as Array<{ name: string; definition: string }>;
}
