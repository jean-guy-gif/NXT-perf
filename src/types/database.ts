// Supabase row types (mirrors the SQL schema)

export interface DbOrganization {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  org_id: string;
  team_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: "conseiller" | "manager";
  category: "debutant" | "confirme" | "expert";
  avatar_url: string | null;
  created_at: string;
}

export interface DbPeriodResult {
  id: string;
  user_id: string;
  period_type: "day" | "week" | "month";
  period_start: string;
  period_end: string;
  data: {
    prospection: {
      contactsEntrants: number;
      contactsTotaux: number;
      rdvEstimation: number;
      informationsVente: Array<{
        id: string;
        nom: string;
        commentaire: string;
        statut: "en_cours" | "deale" | "abandonne";
      }>;
    };
    vendeurs: {
      rdvEstimation: number;
      estimationsRealisees: number;
      mandatsSignes: number;
      mandats: Array<{
        id: string;
        nomVendeur: string;
        type: "simple" | "exclusif";
      }>;
      rdvSuivi: number;
      requalificationSimpleExclusif: number;
      baissePrix: number;
    };
    acheteurs: {
      acheteursChauds: Array<{
        id: string;
        nom: string;
        commentaire: string;
        statut: "en_cours" | "deale" | "abandonne";
      }>;
      acheteursSortisVisite: number;
      nombreVisites: number;
      offresRecues: number;
      compromisSignes: number;
    };
    ventes: {
      actesSignes: number;
      chiffreAffaires: number;
      delaiMoyenVente: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface DbRatioConfig {
  id: string;
  org_id: string;
  ratio_id: string;
  thresholds: {
    debutant: number;
    confirme: number;
    expert: number;
  };
  updated_at: string;
}

export interface DbObjective {
  id: string;
  user_id: string;
  year: number;
  input: { objectifFinancierAnnuel: number };
  breakdown: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

import type { PeriodResults } from "./results";
import type { RatioConfig, RatioId } from "./ratios";

/** Convert a Supabase period_results row to the app's PeriodResults type */
export function dbResultToAppResult(row: DbPeriodResult): PeriodResults {
  return {
    id: row.id,
    userId: row.user_id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    prospection: row.data.prospection,
    vendeurs: row.data.vendeurs,
    acheteurs: row.data.acheteurs,
    ventes: row.data.ventes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a set of Supabase ratio_configs rows to the app's Record<RatioId, RatioConfig> */
export function dbRatioConfigsToApp(
  rows: DbRatioConfig[],
  defaults: Record<RatioId, RatioConfig>
): Record<RatioId, RatioConfig> {
  const result = { ...defaults };
  for (const row of rows) {
    const id = row.ratio_id as RatioId;
    if (result[id]) {
      result[id] = {
        ...result[id],
        thresholds: row.thresholds,
      };
    }
  }
  return result;
}
