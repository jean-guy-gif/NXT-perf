import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Tour guidé première connexion
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemo(page: Page) {
  await page.goto("/demo");
  await page.locator("input[type='password']").fill("DEMO2024");
  await page.getByRole("button", { name: /Démarrer la démo/i }).click();
  await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
  await page.getByText(/Passer cette étape/i).click();
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  // Dismiss tour if it auto-launches
  const skipBtn = page.getByRole("button", { name: "Passer" });
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe("Tour guidé", () => {
  test("1 — data-tour='sidebar' présent sur nav", async ({ page }) => {
    await enterDemo(page);
    await expect(page.locator("[data-tour='sidebar']")).toBeAttached();
  });

  test("2 — data-tour='kpi-cards' défini dans le code source", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "dashboard", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('data-tour="kpi-cards"');
  });

  test("3 — data-tour='parametres-link' présent dans sidebar", async ({ page }) => {
    await enterDemo(page);
    await expect(page.locator("[data-tour='parametres-link']")).toBeAttached();
  });

  test("4 — Bouton aide (HelpCircle) visible dans le header", async ({ page }) => {
    await enterDemo(page);
    const helpBtn = page.locator("header button[title='Revoir le tour guidé']");
    await expect(helpBtn).toBeVisible({ timeout: 5_000 });
  });

  test("5 — Tour peut être fermé avec le bouton Passer", async ({ page }) => {
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
    // Tour may auto-launch — check it can be dismissed
    const skipBtn = page.getByRole("button", { name: "Passer" });
    const tourVisible = await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (tourVisible) {
      await skipBtn.click();
      await page.waitForTimeout(500);
      // After dismissing, the skip button should be gone
      await expect(skipBtn).not.toBeVisible({ timeout: 2_000 });
    }
    // Dashboard should be usable after tour dismissed
    await expect(page.locator("main")).toBeVisible();
  });
});
