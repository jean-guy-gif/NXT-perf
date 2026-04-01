import { test, expect } from "@playwright/test";

/**
 * Non-regression test: clicking "Importer un fichier" in MondayGate
 * must NOT navigate away from /dashboard. The import screen must render
 * inline within the MondayGate fullscreen overlay.
 *
 * Requires: dev server running on localhost:3000 with ?gate=1 support.
 */

test.describe("MondayGate — Import inline (non-regression)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login as demo user
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");

    // 2. Navigate to dashboard with forced gate
    await page.goto("/dashboard?gate=1");
    // Wait for MondayGate welcome screen
    await expect(page.getByText("Démarrer mon bilan")).toBeVisible({ timeout: 10_000 });
  });

  test("Import button stays on /dashboard and shows import screen", async ({ page }) => {
    // Click "Démarrer mon bilan"
    await page.getByRole("button", { name: "Démarrer mon bilan" }).click();

    // Wait for mode selection screen
    await expect(page.getByText("Comment tu veux saisir")).toBeVisible();

    // Record all navigations
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url());
      }
    });

    // Click "Importer un fichier"
    await page.getByRole("button", { name: /Importer un fichier/i }).click();

    // Wait for import screen to render
    await expect(page.getByText("Choisir un fichier")).toBeVisible({ timeout: 5_000 });

    // ── ASSERTIONS ──────────────────────────────────────────────────────

    // 1. URL still contains /dashboard
    expect(page.url()).toContain("/dashboard");

    // 2. URL does NOT contain /saisie
    expect(page.url()).not.toContain("/saisie");

    // 3. Import screen is visible (title + upload button)
    await expect(page.getByText("Importer un fichier")).toBeVisible();
    await expect(page.getByText("Image · PDF · Excel · Word")).toBeVisible();

    // 4. No navigation to /saisie occurred at any point
    const saisieNavs = navigations.filter((url) => url.includes("/saisie"));
    expect(saisieNavs).toHaveLength(0);

    // 5. "Retour" button goes back to mode select, not away
    await page.getByText("Retour").click();
    await expect(page.getByText("Comment tu veux saisir")).toBeVisible();
    expect(page.url()).toContain("/dashboard");
  });
});
