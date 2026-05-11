/**
 * coach-rag-ingest — script local one-time pour migrer le corpus NXT-Coach
 * depuis nxt-coach/data/coach.db (SQLite + sqlite-vec) vers Supabase pgvector.
 *
 * Usage :
 *   npm run ingest:coach-rag
 *
 * Pré-requis (.env.local) :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - VOYAGE_API_KEY
 *
 * Migration douce :
 *   - Idempotent : upsert sur hash pour les sources, et re-create pour chunks/syntheses
 *   - Re-embed via OpenRouter → OpenAI text-embedding-3-small (1536 dims,
 *     les vectors SQLite étaient en nomic-embed-text 768 dims, incompatibles).
 *
 * Coût estimé : ~10 641 chunks × ~500 tokens ≈ 5M tokens input
 *               → text-embedding-3-small = 0.02$/1M tokens → ~0.10$ one-time.
 *
 * Durée estimée : ~5-10 min (OpenRouter accepte des batches de 256).
 */

import { config as loadEnv } from "dotenv";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

// Charge .env.local (Next.js convention) — tsx ne le fait pas par défaut.
loadEnv({ path: ".env.local" });
loadEnv(); // fallback .env

import { embedTexts } from "../../src/lib/server/coach-rag/openai-embed";

// ─── Config ───────────────────────────────────────────────────────────────

const SQLITE_PATH = path.resolve(
  process.cwd(),
  "nxt-coach/data/coach.db",
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BATCH_SIZE = 128; // sous le cap OpenRouter/OpenAI MAX_BATCH=256, garde marge
const UPSERT_BATCH = 100;

// ─── Types ─────────────────────────────────────────────────────────────────

interface SourceRow {
  id: number;
  kind: string;
  path: string;
  title: string | null;
  coach: string | null;
  topic: string | null;
  url: string | null;
  hash: string | null;
  created_at: string;
}

interface ChunkRow {
  id: number;
  source_id: number;
  ordinal: number;
  content: string;
  token_count: number | null;
}

interface SynthesisRow {
  id: number;
  source_id: number;
  section_index: number;
  section_label: string | null;
  content: string;
  token_count: number | null;
  model: string | null;
}

interface ConceptRow {
  name: string;
  definition: string;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }
  if (!process.env.VOYAGE_API_KEY) {
    console.error(
      "Missing VOYAGE_API_KEY — create one at https://voyageai.com",
    );
    process.exit(1);
  }

  console.log(`Reading SQLite: ${SQLITE_PATH}`);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ─── 1. Sources ────────────────────────────────────────────────────────
  const sources = sqlite
    .prepare("SELECT id, kind, path, title, coach, topic, url, hash, created_at FROM sources")
    .all() as SourceRow[];
  console.log(`Found ${sources.length} sources in SQLite.`);

  // Map ancien_id_sqlite → nouveau_id_supabase
  const sourceIdMap = new Map<number, number>();

  for (let i = 0; i < sources.length; i += UPSERT_BATCH) {
    const batch = sources.slice(i, i + UPSERT_BATCH).map((s) => ({
      kind: s.kind,
      path: s.path,
      title: s.title,
      coach: s.coach,
      topic: s.topic,
      url: s.url,
      hash: s.hash,
    }));

    const { data, error } = await supabase
      .from("coach_sources")
      .upsert(batch, { onConflict: "hash" })
      .select("id, hash");

    if (error) {
      console.error("Sources upsert error:", error.message);
      process.exit(1);
    }

    // Re-link old sqlite id → new supabase id via hash
    for (const row of data ?? []) {
      const original = sources.find((s) => s.hash === row.hash);
      if (original) sourceIdMap.set(original.id, row.id);
    }
    console.log(`  Sources upserted: ${Math.min(i + UPSERT_BATCH, sources.length)}/${sources.length}`);
  }

  // ─── 2. Chunks (re-embed via OpenRouter → OpenAI embeddings) ──────────
  const chunks = sqlite
    .prepare("SELECT id, source_id, ordinal, content, token_count FROM chunks")
    .all() as ChunkRow[];
  console.log(`Found ${chunks.length} chunks. Embedding via OpenRouter...`);

  // Clear existing chunks for re-ingestion idempotence
  const sourceIdsArray = Array.from(sourceIdMap.values());
  if (sourceIdsArray.length > 0) {
    const { error: delErr } = await supabase
      .from("coach_chunks")
      .delete()
      .in("source_id", sourceIdsArray);
    if (delErr) {
      console.error("Chunks delete error:", delErr.message);
      process.exit(1);
    }
  }

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    let embeddings: number[][];
    try {
      embeddings = await embedTexts(texts, "document");
    } catch (err) {
      console.error(
        `Embedding batch failed at chunk ${i}-${i + batch.length}:`,
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }

    const rows = batch
      .map((c, idx) => {
        const supabaseSourceId = sourceIdMap.get(c.source_id);
        if (!supabaseSourceId) return null;
        return {
          source_id: supabaseSourceId,
          ordinal: c.ordinal,
          content: c.content,
          token_count: c.token_count,
          embedding: embeddings[idx] as unknown as string,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const { error } = await supabase.from("coach_chunks").insert(rows);
    if (error) {
      console.error(`Chunks insert error at batch ${i}:`, error.message);
      process.exit(1);
    }
    console.log(
      `  Chunks embedded + upserted: ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`,
    );
  }

  // ─── 3. Syntheses (re-embed) ───────────────────────────────────────────
  const syntheses = sqlite
    .prepare(
      "SELECT id, source_id, section_index, section_label, content, token_count, model FROM syntheses",
    )
    .all() as SynthesisRow[];
  console.log(`Found ${syntheses.length} syntheses. Embedding...`);

  if (sourceIdsArray.length > 0) {
    const { error: delErr } = await supabase
      .from("coach_syntheses")
      .delete()
      .in("source_id", sourceIdsArray);
    if (delErr) {
      console.error("Syntheses delete error:", delErr.message);
      process.exit(1);
    }
  }

  for (let i = 0; i < syntheses.length; i += BATCH_SIZE) {
    const batch = syntheses.slice(i, i + BATCH_SIZE);
    const texts = batch.map((s) => s.content);

    let embeddings: number[][];
    try {
      embeddings = await embedTexts(texts, "document");
    } catch (err) {
      console.error(
        `Synthesis embedding failed at ${i}-${i + batch.length}:`,
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }

    const rows = batch
      .map((s, idx) => {
        const supabaseSourceId = sourceIdMap.get(s.source_id);
        if (!supabaseSourceId) return null;
        return {
          source_id: supabaseSourceId,
          section_index: s.section_index,
          section_label: s.section_label,
          content: s.content,
          token_count: s.token_count,
          model: s.model,
          embedding: embeddings[idx] as unknown as string,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const { error } = await supabase.from("coach_syntheses").insert(rows);
    if (error) {
      console.error(`Syntheses insert error at batch ${i}:`, error.message);
      process.exit(1);
    }
    console.log(
      `  Syntheses embedded + upserted: ${Math.min(i + BATCH_SIZE, syntheses.length)}/${syntheses.length}`,
    );
  }

  // ─── 4. Concepts (pas d'embedding) ────────────────────────────────────
  const concepts = sqlite
    .prepare("SELECT name, definition FROM concepts")
    .all() as ConceptRow[];
  console.log(`Found ${concepts.length} concepts.`);

  if (concepts.length > 0) {
    const { error } = await supabase
      .from("coach_concepts")
      .upsert(concepts, { onConflict: "name" });
    if (error) {
      console.error("Concepts upsert error:", error.message);
      process.exit(1);
    }
  }

  console.log("✅ Ingestion complete.");
  sqlite.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
