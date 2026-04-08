import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Système de notifications (cloche, dropdown, page)
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

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("1 — Cloche visible dans le header", async ({ page }) => {
    // The bell icon button is in the header
    const header = page.locator("header");
    // Bell is rendered as an SVG inside a button
    const bellBtn = header.locator("button").filter({ has: page.locator("svg") });
    // At least one button with an SVG (bell) should be visible
    await expect(bellBtn.first()).toBeVisible({ timeout: 5_000 });
  });

  test("2 — Page /notifications accessible", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByText("Notifications")).toBeVisible({ timeout: 10_000 });
  });

  test("3 — État vide affiché si aucune notif DB", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByText(/Aucune alerte|Aucune notification/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("4 — Message 'traité' visible quand pas de notifs non traitées", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByText(/traité|lu/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("5 — Dropdown s'ouvre au clic sur la cloche", async ({ page }) => {
    // Find and click the bell button in header
    const header = page.locator("header");
    // The bell button contains the Bell SVG
    const bellArea = header.locator("div.relative").filter({ has: page.locator("svg") }).first();
    const bellBtn = bellArea.locator("button").first();
    await bellBtn.click();
    // Dropdown should show "Voir toutes les notifications"
    await expect(page.getByText("Voir toutes les notifications")).toBeVisible({ timeout: 3_000 });
  });
});
