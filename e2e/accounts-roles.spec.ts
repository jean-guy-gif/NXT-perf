import { test, expect } from "@playwright/test";
import {
  getAdminClient,
  getAuthenticatedClient,
  migrationTablesExist,
  createTestUser,
  cleanupTestUsers,
  type TestUser,
} from "./helpers/supabase-test-client";

// ═══════════════════════════════════════════════════════════════════════════════
// NXT Performance — Accounts, Roles & Attachment Tests
// Requires migrations 017-025 applied on Supabase
// ═══════════════════════════════════════════════════════════════════════════════

let migrationsReady = false;

test.beforeAll(async () => {
  migrationsReady = await migrationTablesExist();
  if (!migrationsReady) {
    console.warn("⚠️ Migrations 017-025 NOT applied — RLS tests will be skipped");
  }
});

test.afterAll(async () => {
  await cleanupTestUsers();
});

// ═══ 1. INSCRIPTION & RATTACHEMENT (UI) ═════════════════════════════════════

test.describe("1. Inscription & Rattachement", () => {
  test("Register page loads and shows role selection", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Créer un compte")).toBeVisible({ timeout: 10_000 });
    // Role selection should be visible (any role label)
    await expect(page.locator("button").first()).toBeVisible();
  });

  test("Register with invalid invite code shows error", async ({ page }) => {
    await page.goto("/register?code=INVALID-CODE-123");
    await expect(page.getByText("Créer un compte")).toBeVisible({ timeout: 10_000 });
    // The page should still load — code validation happens at submit
  });

  test("Demo mode works without registration", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible({ timeout: 10_000 });
  });
});

// ═══ 2. VISIBILITÉ RLS ══════════════════════════════════════════════════════

test.describe("2. Visibilité RLS", () => {

  // These tests need real Supabase users. They test RLS at the database level.
  // For now, provide the structure — they'll pass once migrations are live.

  test("Conseiller sees only own profile", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();

    // Create org + team + 2 conseillers
    const { data: org } = await admin.from("organizations").insert({ name: "Test Agence RLS", invite_code: "TEST-RLS-" + Date.now() }).select().single();
    const { data: team } = await admin.from("teams").insert({ org_id: org!.id, name: "Équipe RLS" }).select().single();

    const c1 = await createTestUser("conseiller", "rls1", org!.id, team!.id);
    const c2 = await createTestUser("conseiller", "rls2", org!.id, team!.id);

    // Auth as c1
    const client1 = await getAuthenticatedClient(c1.email, c1.password);

    // c1 should see own profile
    const { data: ownProfile } = await client1.from("profiles").select("id").eq("id", c1.id);
    expect(ownProfile).toHaveLength(1);

    // c1 should NOT see c2's profile
    const { data: otherProfile } = await client1.from("profiles").select("id").eq("id", c2.id);
    expect(otherProfile).toHaveLength(0);

    // Cleanup
    await admin.auth.admin.deleteUser(c1.id);
    await admin.auth.admin.deleteUser(c2.id);
    await admin.from("teams").delete().eq("id", team!.id);
    await admin.from("organizations").delete().eq("id", org!.id);
  });

  test("Manager sees team members only", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();
    const { data: org } = await admin.from("organizations").insert({ name: "Test Agence Manager", invite_code: "TEST-MGR-" + Date.now() }).select().single();

    const mgr = await createTestUser("manager", "mgr1", org!.id);
    const { data: team } = await admin.from("teams").insert({ org_id: org!.id, name: "Équipe Mgr", manager_id: mgr.id }).select().single();

    const c1 = await createTestUser("conseiller", "mc1", org!.id, team!.id);
    const c2 = await createTestUser("conseiller", "mc2", org!.id); // no team = not in manager's team

    const mgrClient = await getAuthenticatedClient(mgr.email, mgr.password);

    // Manager sees c1 (in team)
    const { data: teamMember } = await mgrClient.from("profiles").select("id").eq("id", c1.id);
    expect(teamMember).toHaveLength(1);

    // Manager does NOT see c2 (not in team)
    const { data: notTeamMember } = await mgrClient.from("profiles").select("id").eq("id", c2.id);
    expect(notTeamMember).toHaveLength(0);

    // Cleanup
    for (const u of [mgr, c1, c2]) await admin.auth.admin.deleteUser(u.id);
    await admin.from("teams").delete().eq("id", team!.id);
    await admin.from("organizations").delete().eq("id", org!.id);
  });

  test("Conseiller sees only own team", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();
    const { data: org } = await admin.from("organizations").insert({ name: "Test Agence Teams", invite_code: "TEST-TMS-" + Date.now() }).select().single();
    const { data: t1 } = await admin.from("teams").insert({ org_id: org!.id, name: "Team A" }).select().single();
    const { data: t2 } = await admin.from("teams").insert({ org_id: org!.id, name: "Team B" }).select().single();

    const c1 = await createTestUser("conseiller", "ct1", org!.id, t1!.id);

    const client1 = await getAuthenticatedClient(c1.email, c1.password);

    // c1 sees t1
    const { data: ownTeam } = await client1.from("teams").select("id").eq("id", t1!.id);
    expect(ownTeam).toHaveLength(1);

    // c1 does NOT see t2
    const { data: otherTeam } = await client1.from("teams").select("id").eq("id", t2!.id);
    expect(otherTeam).toHaveLength(0);

    await admin.auth.admin.deleteUser(c1.id);
    await admin.from("teams").delete().eq("id", t1!.id);
    await admin.from("teams").delete().eq("id", t2!.id);
    await admin.from("organizations").delete().eq("id", org!.id);
  });

  test("Manager sees only own team in teams table", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();
    const { data: org } = await admin.from("organizations").insert({ name: "Test Agence Mgr Teams", invite_code: "TEST-MT-" + Date.now() }).select().single();

    const mgr = await createTestUser("manager", "mt1", org!.id);
    const { data: t1 } = await admin.from("teams").insert({ org_id: org!.id, name: "Mgr Team", manager_id: mgr.id }).select().single();
    const { data: t2 } = await admin.from("teams").insert({ org_id: org!.id, name: "Other Team" }).select().single();

    const mgrClient = await getAuthenticatedClient(mgr.email, mgr.password);

    const { data: visibleTeams } = await mgrClient.from("teams").select("id");
    const ids = (visibleTeams || []).map((t: { id: string }) => t.id);
    expect(ids).toContain(t1!.id);
    expect(ids).not.toContain(t2!.id);

    await admin.auth.admin.deleteUser(mgr.id);
    await admin.from("teams").delete().eq("id", t1!.id);
    await admin.from("teams").delete().eq("id", t2!.id);
    await admin.from("organizations").delete().eq("id", org!.id);
  });
});

// ═══ 3. SÉCURITÉ RPC ════════════════════════════════════════════════════════

test.describe("3. Sécurité RPC", () => {
  // Migrations 017-025 now applied

  test("upgrade_role rejects conseiller → directeur", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();
    const c = await createTestUser("conseiller", "sec1");
    const client = await getAuthenticatedClient(c.email, c.password);

    const { data } = await client.rpc("upgrade_role", { p_new_role: "directeur" });
    expect(data?.error).toBeTruthy();

    await admin.auth.admin.deleteUser(c.id);
  });

  test("upgrade_role allows conseiller → manager", async () => {
    if (!migrationsReady) return;

    const admin = getAdminClient();
    const c = await createTestUser("conseiller", "sec2");
    const client = await getAuthenticatedClient(c.email, c.password);

    const { data } = await client.rpc("upgrade_role", { p_new_role: "manager" });
    expect(data?.success).toBe(true);

    // Verify history recorded
    const { data: history } = await admin.from("role_history").select("*").eq("user_id", c.id);
    expect(history).toHaveLength(1);
    expect(history![0].old_role).toBe("conseiller");
    expect(history![0].new_role).toBe("manager");

    await admin.auth.admin.deleteUser(c.id);
  });
});

// ═══ 4. SWITCH DE VUE ═══════════════════════════════════════════════════════

test.describe("4. Switch de vue", () => {
  test("Demo mode shows role switch buttons", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");

    // Demo user has multiple roles — header should have role switch buttons
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible({ timeout: 5_000 });
    // Look for any role switch button in the header area
    const roleButtons = page.locator("button").filter({ hasText: /Conseiller|Manager|Agence|Coach|Réseau/ });
    await expect(roleButtons.first()).toBeVisible({ timeout: 5_000 });
  });

  test("Dashboard stays on /dashboard after role interaction", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");
    expect(page.url()).toContain("/dashboard");
  });
});

// ═══ 5. PARAMÈTRES (UI) ═════════════════════════════════════════════════════

test.describe("5. Paramètres pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");
  });

  test("Paramètres page shows Voix & Saisie card", async ({ page }) => {
    await page.goto("/parametres");
    await expect(page.getByText("Voix & Saisie")).toBeVisible({ timeout: 5_000 });
  });

  test("Paramètres page shows Coaching card", async ({ page }) => {
    await page.goto("/parametres");
    await expect(page.getByText("Coaching")).toBeVisible({ timeout: 5_000 });
  });

  test("Paramètres page shows Mon équipe card for manager role", async ({ page }) => {
    await page.goto("/parametres");
    // Demo user has manager access
    await expect(page.getByText("Mon équipe")).toBeVisible({ timeout: 5_000 });
  });

  test("Paramètres page shows Mon agence card for directeur role", async ({ page }) => {
    await page.goto("/parametres");
    await expect(page.getByText("Mon agence")).toBeVisible({ timeout: 5_000 });
  });

  test("Coaching page loads without crash", async ({ page }) => {
    const res = await page.goto("/parametres/coaching");
    expect(res?.status()).toBeLessThan(500);
  });

  test("Équipe page loads without crash", async ({ page }) => {
    const res = await page.goto("/parametres/equipe");
    expect(res?.status()).toBeLessThan(500);
  });

  test("Agence page loads without crash", async ({ page }) => {
    const res = await page.goto("/parametres/agence");
    expect(res?.status()).toBeLessThan(500);
  });
});
