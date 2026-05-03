/**
 * Persistance simple de l'état d'ingestion (state.json local).
 *
 * Sert à l'idempotence : on n'ingère pas deux fois le même `fileId`.
 * Le fichier est gitignored (cf. .gitignore) — chaque environnement
 * (dev local, runner CI) maintient son propre état.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { IngestState } from "./types";

const STATE_FILE_PATH = path.resolve(__dirname, "state.json");

const DEFAULT_STATE: IngestState = {
  ingestedFileIds: [],
  lastRunAt: null,
  stats: {
    totalRuns: 0,
    totalFilesProcessed: 0,
    totalPatternsUpserted: 0,
  },
};

export async function loadState(): Promise<IngestState> {
  try {
    const raw = await fs.readFile(STATE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<IngestState>;
    return {
      ingestedFileIds: parsed.ingestedFileIds ?? [],
      lastRunAt: parsed.lastRunAt ?? null,
      stats: {
        totalRuns: parsed.stats?.totalRuns ?? 0,
        totalFilesProcessed: parsed.stats?.totalFilesProcessed ?? 0,
        totalPatternsUpserted: parsed.stats?.totalPatternsUpserted ?? 0,
      },
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_STATE };
    }
    throw err;
  }
}

export async function saveState(state: IngestState): Promise<void> {
  await fs.writeFile(
    STATE_FILE_PATH,
    JSON.stringify(state, null, 2),
    "utf-8",
  );
}
