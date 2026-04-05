import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — États vides pour nouveaux utilisateurs
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemo(page: Page) {
  await page.goto("/demo");
  await page.locator("input[type='password']").fill("DEMO2024");
  await page.getByRole("button", { name: /Démarrer la démo/i }).click();
  await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
  await page.getByText(/Passer cette étape/i).click();
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  const skipBtn = page.getByRole("button", { name: "Passer" });
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe("États vides", () => {
  test("1 — EmptyState composant existe dans le code source", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(__dirname, "..", "src", "components", "ui", "empty-state.tsx");
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("EmptyState");
    expect(content).toContain("ctaLabel");
  });

  test("2 — Dashboard démo affiche des données (pas d'état vide)", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    // Demo mode should show actual data, not the empty state
    const text = await page.locator("main").textContent();
    expect(text).not.toContain("Bienvenue sur NXT Performance");
  });

  test("3 — Performance page accessible en démo (pas d'état vide)", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/performance");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    // Demo has data → should show ratios, not empty state
    const text = await page.locator("main").textContent();
    expect(text).not.toContain("première saisie");
  });

  test("4 — Formation page accessible en démo (pas d'état vide)", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/formation");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const text = await page.locator("main").textContent();
    expect(text).not.toContain("première saisie");
  });

  test("5 — Manager cockpit affiche des données en démo", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/manager/cockpit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("main").getByRole("heading", { name: "Cockpit Manager" })).toBeVisible({ timeout: 5_000 });
    // Demo has team data — should NOT show empty state
    const text = await page.locator("main").textContent();
    expect(text).not.toContain("Votre équipe est vide");
  });
});
