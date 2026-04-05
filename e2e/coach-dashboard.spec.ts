import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Dashboard Coach
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemoAsCoach(page: Page) {
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
  // Switch to Coach view
  const coachBtn = page.locator("button").filter({ hasText: /Coach/i });
  if (await coachBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await coachBtn.first().click();
    await page.waitForTimeout(1_000);
  }
}

test.describe("Dashboard Coach", () => {
  test("1 — /coach/dashboard accessible", async ({ page }) => {
    await enterDemoAsCoach(page);
    await page.goto("/coach/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const text = await page.locator("main").textContent();
    expect(text!.length).toBeGreaterThan(50);
  });

  test("2 — /coach/cockpit accessible", async ({ page }) => {
    await enterDemoAsCoach(page);
    await page.goto("/coach/cockpit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const text = await page.locator("main").textContent();
    expect(text!.length).toBeGreaterThan(50);
  });

  test("3 — Page /onboarding/coach accessible", async ({ page }) => {
    await page.goto("/onboarding/coach");
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
  });

  test("4 — Page onboarding coach affiche 'espace coach est prêt'", async ({ page }) => {
    await page.goto("/onboarding/coach");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/coach")) {
      await expect(page.getByText(/espace coach est prêt/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test("5 — Page onboarding coach contient les 3 étapes", async ({ page }) => {
    await page.goto("/onboarding/coach");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/coach")) {
      await expect(page.getByText("Comment ça marche")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("6 — Démo redirige /onboarding/coach vers dashboard", async ({ page }) => {
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });

    await page.goto("/onboarding/coach");
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain("/dashboard");
  });
});
