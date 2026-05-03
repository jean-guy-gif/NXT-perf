/**
 * Entrypoint d'ingestion Coach Brain (PR-C).
 *
 * Usage :
 *   npm run ingest:coach-brain -- [--limit=50] [--dry-run] [--force]
 *
 * Comportement :
 *   1. Charge la config (env vars validées).
 *   2. Charge le state.json local (idempotence).
 *   3. Liste les fichiers Drive du dossier source.
 *   4. Filtre les fileIds non encore ingérés (sauf --force).
 *   5. Limite à `limit` (défaut 50, conforme batch policy).
 *   6. Pour chaque fichier :
 *        - download → anonymize → extract → upsert
 *        - log + skip si aucun pattern actionnable extrait
 *        - marque comme ingéré (que des patterns aient été extraits ou non)
 *   7. Sauvegarde state.json + stats.
 *
 * Aucun arrêt sur erreur d'un fichier — on passe au suivant et on log.
 * Le runner GitHub Actions (PR-D) affichera les warnings côté CI.
 */

import { loadConfig } from "./config";
import { loadState, saveState } from "./state";
import { createDriveClient } from "./drive-client";
import { anonymizeWithStats } from "./anonymize";
import { extractPatterns } from "./extract-patterns";
import { createSupabase, upsertPatterns } from "./supabase-upsert";
import type { IngestState } from "./types";

interface CliOptions {
  limit: number;
  dryRun: boolean;
  force: boolean;
}

const DEFAULT_LIMIT = 50;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    limit: DEFAULT_LIMIT,
    dryRun: false,
    force: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) opts.limit = n;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--force") {
      opts.force = true;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.info("[ingest] start", opts);

  const config = loadConfig();
  const state = await loadState();

  const drive = createDriveClient(config.googleServiceAccountKey, config.driveFolderId);
  const supabase = createSupabase(config.supabaseUrl, config.supabaseServiceRoleKey);

  console.info("[ingest] listing Drive folder…");
  const allFiles = await drive.listFiles();
  console.info(`[ingest] found ${allFiles.length} compatible file(s)`);

  const ingestedSet = new Set(state.ingestedFileIds);
  const candidates = opts.force
    ? allFiles
    : allFiles.filter((f) => !ingestedSet.has(f.id));
  const batch = candidates.slice(0, opts.limit);
  console.info(
    `[ingest] ${candidates.length} new candidate(s), processing batch of ${batch.length} (limit=${opts.limit})`,
  );

  let totalPatternsUpserted = 0;
  let totalSkipped = 0;
  let totalRejected = 0;

  for (const file of batch) {
    console.info(`[ingest] processing "${file.name}" (${file.id}, ${file.mimeType})`);

    const text = await drive.downloadText(file);
    if (!text) {
      console.warn("[ingest] download empty, skip");
      totalSkipped += 1;
      // On marque quand même comme ingéré pour ne pas réessayer indéfiniment
      ingestedSet.add(file.id);
      continue;
    }

    const { text: anonymized, substitutions } = anonymizeWithStats(text);
    console.info(`[ingest] regex anonymized (${substitutions} substitution(s))`);

    let extraction;
    try {
      extraction = await extractPatterns(anonymized, {
        openrouterApiKey: config.openrouterApiKey,
        openrouterModel: config.openrouterModel,
      });
    } catch (err) {
      console.warn("[ingest] extraction failed, skip file", {
        fileId: file.id,
        error: (err as Error).message,
      });
      totalSkipped += 1;
      // Pas de marquage → on retentera au prochain run (problème transitoire LLM).
      continue;
    }

    if (extraction.patterns.length === 0) {
      console.info("[ingest] no actionable pattern extracted, skip");
      totalRejected += 1;
      ingestedSet.add(file.id);
      continue;
    }

    if (opts.dryRun) {
      console.info(
        `[ingest][dry-run] would upsert ${extraction.patterns.length} pattern(s)`,
        extraction.patterns,
      );
      totalPatternsUpserted += extraction.patterns.length;
      ingestedSet.add(file.id);
      continue;
    }

    const stats = await upsertPatterns(supabase, extraction.patterns);
    console.info(
      `[ingest] upsert: +${stats.inserted} inserted, ${stats.incremented} incremented, ${stats.errors} errors`,
    );
    totalPatternsUpserted += stats.inserted + stats.incremented;
    ingestedSet.add(file.id);
  }

  const nextState: IngestState = {
    ingestedFileIds: Array.from(ingestedSet),
    lastRunAt: new Date().toISOString(),
    stats: {
      totalRuns: state.stats.totalRuns + 1,
      totalFilesProcessed: state.stats.totalFilesProcessed + batch.length,
      totalPatternsUpserted:
        state.stats.totalPatternsUpserted + totalPatternsUpserted,
    },
  };
  if (!opts.dryRun) {
    await saveState(nextState);
  }

  console.info("[ingest] done", {
    processed: batch.length,
    upserted: totalPatternsUpserted,
    rejected: totalRejected,
    skipped: totalSkipped,
    dryRun: opts.dryRun,
  });
}

main().catch((err) => {
  console.error("[ingest] fatal", err);
  process.exit(1);
});
