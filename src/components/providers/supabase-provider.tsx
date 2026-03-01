"use client";

import { useSupabaseProfile } from "@/hooks/use-supabase-profile";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { useSupabaseRatioConfigs } from "@/hooks/use-supabase-ratio-configs";
import { useSupabaseTeam } from "@/hooks/use-supabase-team";

/**
 * Initializes Supabase data loading on mount.
 * Renders nothing — just triggers the hooks.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  useSupabaseProfile();
  useSupabaseResults();
  useSupabaseRatioConfigs();
  useSupabaseTeam();
  return <>{children}</>;
}
