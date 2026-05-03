/**
 * load-patterns.ts (PR3.8 follow-up — PR-A).
 *
 * SERVEUR UNIQUEMENT — ne jamais importer depuis un composant client.
 * `SUPABASE_SERVICE_ROLE_KEY` est lue dans `process.env`. Aucune valeur
 * sensible ne fuite vers le client : seul le shape `CoachingPattern` est
 * exposé via la route `/api/manager/coach-brain/pattern`.
 *
 * Lecture only en V1. L'écriture (upsert depuis l'ingestion Drive) sera
 * faite par un script dédié dans une PR ultérieure.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { CoachingPattern } from "@/lib/coaching/coaching-patterns";

type Axis = "behavior" | "mistake" | "question" | "angle";

interface PatternRow {
  expertise_id: string;
  axis: Axis;
  text: string;
  frequency_score: number;
  last_seen: string;
}

const TOP_PER_AXIS = 3;

let cachedClient: SupabaseClient | null = null;

/**
 * Crée (ou réutilise) le client Supabase service-role. Renvoie `null` si
 * les variables d'environnement sont absentes — l'app retombe alors sur
 * le fallback hardcoded.
 */
function getServiceClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * Charge un `CoachingPattern` depuis Supabase pour un levier donné.
 *
 * Stratégie :
 *   1. Récupère jusqu'à 4 × TOP_PER_AXIS lignes pour ce levier, triées par
 *      `frequency_score DESC, last_seen DESC`.
 *   2. Regroupe par axe et garde le top 3 par axe.
 *   3. Si AUCUNE ligne (ou client KO) → renvoie `null` ; l'appelant
 *      laissera la place au fallback hardcoded `coaching-patterns.ts`.
 *
 * Ne jette JAMAIS — toute erreur est avalée et remontée comme `null` pour
 * garantir la dégradation gracieuse côté kit coaching.
 */
export async function loadCoachingPatternFromSupabase(
  expertiseId: ExpertiseRatioId,
): Promise<CoachingPattern | null> {
  const client = getServiceClient();
  if (!client) return null;

  // Limite haute : 4 axes × 3 par axe = 12. On prend une marge à 24 pour
  // gérer un cas où un axe surreprésenté pousserait les autres hors fenêtre.
  const { data, error } = await client
    .from("coach_brain_patterns")
    .select("expertise_id, axis, text, frequency_score, last_seen")
    .eq("expertise_id", expertiseId)
    .order("frequency_score", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(24);

  if (error) {
    // Ne jamais faire fuiter de détail upstream — log côté serveur et
    // bascule fallback.
    console.warn("[coach-brain/load-patterns] supabase error", {
      expertiseId,
      code: error.code,
    });
    return null;
  }

  const rows = (data ?? []) as PatternRow[];
  if (rows.length === 0) return null;

  const buckets: Record<Axis, string[]> = {
    behavior: [],
    mistake: [],
    question: [],
    angle: [],
  };

  for (const row of rows) {
    const axis = row.axis;
    if (axis !== "behavior" && axis !== "mistake" && axis !== "question" && axis !== "angle") {
      continue;
    }
    if (buckets[axis].length >= TOP_PER_AXIS) continue;
    if (typeof row.text === "string" && row.text.trim().length > 0) {
      buckets[axis].push(row.text);
    }
  }

  const total =
    buckets.behavior.length +
    buckets.mistake.length +
    buckets.question.length +
    buckets.angle.length;
  if (total === 0) return null;

  return {
    observedBehaviors: buckets.behavior,
    recurringMistakes: buckets.mistake,
    signalQuestions: buckets.question,
    coachingAngles: buckets.angle,
  };
}
