import { createClient } from "@/lib/supabase/client";
import type { ImprovementResourceStatus } from "@/config/coaching";

// Local copy of the type to avoid a circular import with the hook.
export interface ImprovementResource {
  id: string;
  user_id: string;
  resource_type: "plan_30j" | "nxt_coaching" | "nxt_training" | "agefice";
  status: ImprovementResourceStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  archived_at: string | null;
  pain_ratio_id: string | null;
  pain_score: number | null;
  debrief_offered_count: number;
}

export type InsertInput = Partial<ImprovementResource> & {
  user_id: string;
  resource_type: ImprovementResource["resource_type"];
  status: ImprovementResourceStatus;
  payload: Record<string, unknown>;
};

export interface ImprovementResourcesAdapter {
  list(userId: string): Promise<ImprovementResource[]>;
  insert(row: InsertInput): Promise<ImprovementResource>;
  update(id: string, patch: Partial<ImprovementResource>): Promise<void>;
}

// ─── Supabase adapter (production / authentified user) ────────────────
export class SupabaseAdapter implements ImprovementResourcesAdapter {
  async list(userId: string): Promise<ImprovementResource[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_improvement_resources")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null);
    if (error) throw error;
    return (data ?? []) as ImprovementResource[];
  }

  async insert(row: InsertInput): Promise<ImprovementResource> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_improvement_resources")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as ImprovementResource;
  }

  async update(id: string, patch: Partial<ImprovementResource>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_improvement_resources")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
  }
}

// ─── LocalStorage adapter (demo mode) ─────────────────────────────────
export class LocalStorageAdapter implements ImprovementResourcesAdapter {
  private key(userId: string): string {
    return `demo_improvement_resources_${userId}`;
  }

  async list(userId: string): Promise<ImprovementResource[]> {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(this.key(userId));
    if (!raw) return [];
    try {
      const rows = JSON.parse(raw) as ImprovementResource[];
      return rows.filter((r) => r.archived_at === null);
    } catch {
      return [];
    }
  }

  async insert(row: InsertInput): Promise<ImprovementResource> {
    const now = new Date().toISOString();
    const newRow: ImprovementResource = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: now,
      updated_at: now,
      expires_at: null,
      archived_at: null,
      pain_ratio_id: null,
      pain_score: null,
      debrief_offered_count: 0,
      ...row,
    };
    if (typeof window !== "undefined") {
      const storageKey = this.key(row.user_id);
      const rawAll = window.localStorage.getItem(storageKey);
      const all: ImprovementResource[] = rawAll ? (JSON.parse(rawAll) as ImprovementResource[]) : [];
      window.localStorage.setItem(storageKey, JSON.stringify([...all, newRow]));
    }
    return newRow;
  }

  async update(id: string, patch: Partial<ImprovementResource>): Promise<void> {
    if (typeof window === "undefined") return;
    const keys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith("demo_improvement_resources_")
    );
    for (const k of keys) {
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      try {
        const rows = JSON.parse(raw) as ImprovementResource[];
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
          window.localStorage.setItem(k, JSON.stringify(rows));
          return;
        }
      } catch {
        // ignore malformed entries
      }
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────
export function getAdapter(isDemoMode: boolean): ImprovementResourcesAdapter {
  return isDemoMode ? new LocalStorageAdapter() : new SupabaseAdapter();
}
