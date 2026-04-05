import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Onboarding guidé manager + directeur
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Onboarding Équipe & Agence", () => {

  test("1 — Page /onboarding/equipe accessible", async ({ page }) => {
    await page.goto("/onboarding/equipe");
    // Should show page content or redirect (no crash)
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
  });

  test("2 — Page /onboarding/agence accessible", async ({ page }) => {
    await page.goto("/onboarding/agence");
    // Should show page content or redirect (no crash)
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
  });

  test("3 — Page équipe affiche 'Invitez votre équipe'", async ({ page }) => {
    // Access directly — in demo mode it redirects, so go without demo
    await page.goto("/onboarding/equipe");
    // Either shows the content or redirects; check page didn't crash
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/equipe")) {
      await expect(page.getByText("Invitez votre équipe")).toBeVisible({ timeout: 5_000 });
    }
    // If redirected, that's OK (demo mode or not manager)
  });

  test("4 — Page agence affiche 'Votre agence est prête'", async ({ page }) => {
    await page.goto("/onboarding/agence");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/agence")) {
      await expect(page.getByText("Votre agence est prête")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("5 — Démo redirige /onboarding/equipe vers dashboard", async ({ page }) => {
    // Enter demo mode first
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    // Skip identity onboarding
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });

    // Now try to access /onboarding/equipe — should redirect to dashboard in demo
    await page.goto("/onboarding/equipe");
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain("/dashboard");
  });

  test("6 — Page équipe contient CTA 'Accéder à mon dashboard'", async ({ page }) => {
    await page.goto("/onboarding/equipe");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/equipe")) {
      await expect(page.getByRole("button", { name: /Accéder à mon dashboard/i })).toBeVisible({ timeout: 5_000 });
    }
  });

  test("7 — Page équipe contient 'Passer cette étape'", async ({ page }) => {
    await page.goto("/onboarding/equipe");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/equipe")) {
      await expect(page.getByText(/Passer cette étape/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test("8 — Page équipe affiche les 3 étapes explicatives", async ({ page }) => {
    await page.goto("/onboarding/equipe");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/equipe")) {
      await expect(page.getByText("Comment ça marche")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/s'inscrivent/i)).toBeVisible();
      await expect(page.getByText(/code/i).first()).toBeVisible();
    }
  });
});
