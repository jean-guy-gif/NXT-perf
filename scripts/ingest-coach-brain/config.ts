/**
 * Validation des variables d'environnement pour le pipeline d'ingestion.
 *
 * Toutes les valeurs sensibles restent côté serveur uniquement (script
 * Node.js standalone — n'arrive jamais dans le bundle Next.js).
 */

import "dotenv/config";

export interface IngestConfig {
  driveFolderId: string;
  /** Service account JSON (string) — soit JSON brut, soit base64 décodé. */
  googleServiceAccountKey: string;
  openrouterApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Modèle OpenRouter pour l'extraction (configurable, défaut sensible). */
  openrouterModel: string;
}

function readRequired(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

/**
 * Décode `GOOGLE_SERVICE_ACCOUNT_KEY` qui peut être soit du JSON brut, soit
 * du base64 (pratique pour Vercel / GH Actions secrets multilignes).
 */
function decodeServiceAccountKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  // Suppose base64 — décodage best-effort.
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
    if (decoded.trim().startsWith("{")) return decoded;
  } catch {
    // ignore
  }
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_KEY: format invalide (attendu JSON ou base64-JSON)",
  );
}

export function loadConfig(): IngestConfig {
  return {
    driveFolderId: process.env.COACH_BRAIN_DRIVE_FOLDER_ID!.trim(),

    googleServiceAccountKey: decodeServiceAccountKey(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
    ),

    openrouterApiKey: process.env.OPENROUTER_API_KEY!.trim(),

    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),

    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),

    openrouterModel:
      process.env.COACH_BRAIN_OPENROUTER_MODEL?.trim() ||
      "openai/gpt-4o-mini",
  };
}
