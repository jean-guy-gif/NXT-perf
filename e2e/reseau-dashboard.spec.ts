import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Dashboard Réseau
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemoAsReseau(page: Page) {
  // Enter demo, then switch to réseau view
  await page.goto("/demo");
  await page.locator("input[type='password']").fill("DEMO2024");
  await page.getByRole("button", { name: /Démarrer la démo/i }).click();
  await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
  await page.getByText(/Passer cette étape/i).click();
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  // Dismiss guided tour if present
  const skipBtn = page.getByRole("button", { name: "Passer" });
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
  // Switch to réseau view via header role buttons
  const reseauBtn = page.locator("button").filter({ hasText: /Réseau/i });
  if (await reseauBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await reseauBtn.first().click();
    await page.waitForTimeout(1_000);
  }
}

test.describe("Dashboard Réseau", () => {
  test("1 — /reseau/dashboard accessible en démo", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const text = await page.locator("main").textContent();
    expect(text!.length).toBeGreaterThan(50);
  });

  test("2 — KPIs globaux visibles", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/dashboard");
    await expect(page.getByText("Chiffre d'affaires")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Agences", { exact: true })).toBeVisible();
    await expect(page.getByText("Collaborateurs")).toBeVisible();
    await expect(page.getByText("Score moyen")).toBeVisible();
  });

  test("3 — Tableau classement des agences présent", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/dashboard");
    await expect(page.getByText("Classement des agences")).toBeVisible({ timeout: 10_000 });
  });

  test("4 — Comparaison inter-agences chart présent", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/dashboard");
    await expect(page.getByText("Comparaison inter-agences")).toBeVisible({ timeout: 10_000 });
  });

  test("5 — Top performers visibles", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/dashboard");
    await expect(page.getByText("Top conseillers réseau")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Top managers réseau")).toBeVisible();
  });

  test("6 — /reseau/agence accessible", async ({ page }) => {
    await enterDemoAsReseau(page);
    await page.goto("/reseau/agence");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
  });
});
