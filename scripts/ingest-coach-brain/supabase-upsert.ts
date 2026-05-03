/**
 * Upsert des patterns extraits dans Supabase (PR-C).
 *
 * Logique :
 *   - Pour chaque pattern (expertise_id, axis, text) :
 *     - Si une ligne existe déjà avec un texte EXACTEMENT identique
 *       → incrémenter `frequency_score`, mettre à jour `last_seen`.
 *     - Sinon : insert avec `frequency_score = 1`.
 *   - Pas de fuzzy matching V1 (peut être ajouté plus tard si trop de
 *     doublons sémantiques apparaissent).
 *
 * Comparaison de texte : `text` normalisé (trim + lowercase) côté client
 * pour la lookup, mais on stocke le texte original (avec capitalisation
 * et ponctuation) en BDD pour l'affichage.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedPattern } from "./types";

interface ExistingRow {
  id: string;
  text: string;
  frequency_score: number;
}

export interface UpsertStats {
  inserted: number;
  incremented: number;
  errors: number;
}

export function createSupabase(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function upsertPatterns(
  client: SupabaseClient,
  patterns: ExtractedPattern[],
): Promise<UpsertStats> {
  const stats: UpsertStats = { inserted: 0, incremented: 0, errors: 0 };

  for (const p of patterns) {
    const normalized = normalizeText(p.text);

    // Lookup existant — match strict sur (expertise_id, axis) puis
    // comparaison normalisée du texte côté Node (limite la sensibilité aux
    // variations de ponctuation/casse).
    const { data: existing, error: selectErr } = await client
      .from("coach_brain_patterns")
      .select("id, text, frequency_score")
      .eq("expertise_id", p.expertiseId)
      .eq("axis", p.axis);

    if (selectErr) {
      console.warn("[upsert] select failed", { code: selectErr.code });
      stats.errors += 1;
      continue;
    }

    const match = (existing as ExistingRow[] | null)?.find(
      (row) => normalizeText(row.text) === normalized,
    );

    if (match) {
      const { error: updateErr } = await client
        .from("coach_brain_patterns")
        .update({
          frequency_score: match.frequency_score + 1,
          last_seen: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (updateErr) {
        console.warn("[upsert] update failed", { code: updateErr.code });
        stats.errors += 1;
        continue;
      }
      stats.incremented += 1;
    } else {
      const { error: insertErr } = await client
        .from("coach_brain_patterns")
        .insert({
          expertise_id: p.expertiseId,
          axis: p.axis,
          text: p.text,
          frequency_score: 1,
          last_seen: new Date().toISOString(),
        });
      if (insertErr) {
        console.warn("[upsert] insert failed", { code: insertErr.code });
        stats.errors += 1;
        continue;
      }
      stats.inserted += 1;
    }
  }

  return stats;
}

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:'"\-—()[\]]/g, "")
    .trim();
}
