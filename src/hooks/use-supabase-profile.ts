"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Chantier A.2 — shape attendu de `objectives.input` (jsonb). On garde un
 * type souple pour ne pas casser sur des entrées historiques sans
 * `avg_commission_eur`.
 */
interface ObjectivesInputJson {
  objectifFinancierAnnuel?: number;
  avg_commission_eur?: number;
}

/**
 * Loads the current user's profile from Supabase on mount.
 * Retries up to 3 times if the profile isn't found (trigger may be slow).
 * As a last resort, creates the profile from auth user metadata.
 * In demo mode, does nothing (store already has mock user).
 */
export function useSupabaseProfile() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const setOrgInviteCode = useAppStore((s) => s.setOrgInviteCode);
  const setAgencyObjective = useAppStore((s) => s.setAgencyObjective);
  const profile = useAppStore((s) => s.profile);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isDemo || profile || attemptedRef.current) return;
    attemptedRef.current = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Retry fetching the profile (trigger may still be running)
      let dbProfile: DbProfile | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          dbProfile = data as DbProfile;
          break;
        }

        // If error is not "no rows" (406/PGRST116), don't retry
        if (error && !error.message.includes("PGRST116") && error.code !== "406") {
          console.warn("[useSupabaseProfile] Unexpected error:", error.message);
        }

        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      // Fallback: create profile from auth metadata if trigger didn't
      if (!dbProfile) {
        const meta = user.user_metadata || {};
        const fallbackProfile = {
          id: user.id,
          org_id: "",
          team_id: null,
          email: user.email ?? "",
          first_name: meta.first_name || "Utilisateur",
          last_name: meta.last_name || "",
          role: meta.main_role || "conseiller",
          available_roles: meta.selected_roles || [meta.main_role || "conseiller"],
          category: meta.category || "confirme",
          avatar_url: null,
          onboarding_status: "DONE",
          profile_type: null,
          agency_logo_url: null,
          agency_primary_color: null,
          agency_secondary_color: null,
          coach_voice: "bienveillant",
          created_at: new Date().toISOString(),
        };

        // Try to insert into Supabase (may fail if trigger runs concurrently — that's OK)
        const { data: inserted } = await supabase
          .from("profiles")
          .upsert(fallbackProfile, { onConflict: "id" })
          .select()
          .single();

        dbProfile = (inserted as DbProfile) ?? (fallbackProfile as DbProfile);
      }

      setProfile(dbProfile);

      // Fetch the org's invite code
      if (dbProfile.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("invite_code")
          .eq("id", dbProfile.org_id)
          .single();

        if (org) {
          setOrgInviteCode(org.invite_code);
        }
      }

      // Chantier A.2 — hydrate agencyObjective Zustand depuis objectives row
      // courant. Sans cette étape, `avgActValue` redevient null après chaque
      // reload → diagnostic dégradé via FALLBACK 8000€ (cf. PRIORITE 1 audit).
      const currentYear = new Date().getFullYear();
      const { data: objectivesRow } = await supabase
        .from("objectives")
        .select("input")
        .eq("user_id", dbProfile.id)
        .eq("year", currentYear)
        .single();

      if (objectivesRow?.input) {
        const input = objectivesRow.input as ObjectivesInputJson;
        const annualCA =
          typeof input.objectifFinancierAnnuel === "number"
            ? input.objectifFinancierAnnuel
            : 0;
        const avgActValue =
          typeof input.avg_commission_eur === "number"
            ? input.avg_commission_eur
            : 0;
        if (annualCA > 0 || avgActValue > 0) {
          setAgencyObjective({ annualCA, avgActValue });
        }
      }
    }

    load();
  }, [supabase, isDemo, setProfile, setOrgInviteCode, setAgencyObjective, profile]);
}
