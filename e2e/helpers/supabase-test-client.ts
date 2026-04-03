import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Admin client (bypasses RLS) — for test setup/teardown */
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

/** Anon client (subject to RLS) — simulates a real user */
export function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY);
}

/** Create an authenticated client for a specific user */
export async function getAuthenticatedClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return client;
}

/** Check if new migration tables exist */
export async function migrationTablesExist(): Promise<boolean> {
  const admin = getAdminClient();
  const { error } = await admin.from("networks").select("id").limit(0);
  return !error;
}

// ── Test user factory ────────────────────────────────────────────────────────

const TEST_PREFIX = "test_e2e_";
const TEST_PASSWORD = "TestPass123!";
const RUN_ID = Date.now().toString(36);

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
}

export async function createTestUser(
  role: string,
  suffix: string,
  orgId?: string,
  teamId?: string,
): Promise<TestUser> {
  const admin = getAdminClient();
  const email = `${TEST_PREFIX}${role}_${suffix}_${RUN_ID}@test.nxt.local`;

  // Create auth user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: `Test${role}`,
      last_name: suffix,
      main_role: role,
      selected_roles: [role],
      category: "confirme",
      context_mode: "personal",
    },
  });

  if (error) throw new Error(`createTestUser failed: ${error.message}`);

  // Wait for trigger to create profile
  await new Promise((r) => setTimeout(r, 1500));

  // Patch profile with org/team if needed
  if (orgId || teamId) {
    await admin.from("profiles").update({
      ...(orgId ? { org_id: orgId } : {}),
      ...(teamId ? { team_id: teamId } : {}),
    }).eq("id", data.user.id);
  }

  return { id: data.user.id, email, password: TEST_PASSWORD, role };
}

export async function cleanupTestUsers(): Promise<void> {
  const admin = getAdminClient();

  // Find all test profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .like("email", `${TEST_PREFIX}%`);

  if (!profiles || profiles.length === 0) return;

  for (const p of profiles) {
    // Delete auth user (cascades to profile)
    await admin.auth.admin.deleteUser(p.id);
  }
}
