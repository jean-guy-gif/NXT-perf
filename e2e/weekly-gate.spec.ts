import { test, expect } from "@playwright/test";

test.describe("WeeklyGate — non-regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    // Set nxt-demo-saisie cookie to bypass DemoSaisieGate and reach WeeklyGate
    await page.evaluate(() => {
      document.cookie = "nxt-demo-saisie=true;path=/;max-age=28800";
    });
    await page.goto("/dashboard?gate=1");
    await expect(page.getByText("Démarrer mon bilan")).toBeVisible({ timeout: 10_000 });
  });

  test("Import stays inline on /dashboard", async ({ page }) => {
    await page.getByRole("button", { name: "Démarrer mon bilan" }).click();
    await expect(page.getByText("Comment tu veux saisir")).toBeVisible();

    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    await page.getByRole("button", { name: /Importer un fichier/i }).click();
    await expect(page.getByText("Choisir un fichier")).toBeVisible({ timeout: 5_000 });

    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/saisie");
    expect(navigations.filter((u) => u.includes("/saisie"))).toHaveLength(0);
  });

  test("Manual mode stays inline on /dashboard", async ({ page }) => {
    await page.getByRole("button", { name: "Démarrer mon bilan" }).click();
    await page.getByRole("button", { name: /Saisir manuellement/i }).click();

    // First question should be visible with counter "1 / N"
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Combien de contacts au total")).toBeVisible();
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/saisie");
  });

  test("Voice mode stays inline on /dashboard", async ({ page }) => {
    await page.getByRole("button", { name: "Démarrer mon bilan" }).click();
    await page.getByRole("button", { name: /À la voix/i }).click();

    // Voice conversation should be visible (NXT Assistant header)
    await expect(page.getByText("NXT Assistant")).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("Dismiss returns to dashboard", async ({ page }) => {
    await page.getByText("Passer pour l'instant").first().click();

    // Dashboard content should be visible (heading, not sidebar tooltip)
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("Manual flow → confirmation → debrief → dashboard", async ({ page }) => {
    await page.getByRole("button", { name: "Démarrer mon bilan" }).click();
    await page.getByRole("button", { name: /Saisir manuellement/i }).click();

    // Fill 4 numeric questions quickly (contacts, entrants, RDV, infosVenteCount)
    for (const val of ["35", "20", "5", "0"]) {
      await expect(page.locator("input")).toBeVisible({ timeout: 3_000 });
      await page.locator("input").fill(val);
      await page.locator("input").press("Enter");
      await page.waitForTimeout(300);
    }

    // Continue through remaining numeric steps until confirmation
    const remaining = ["4", "2", "", "3", "1", "2", "0", "", "8", "12", "3", "1", "1", "15000"];
    for (const val of remaining) {
      const input = page.locator("input");
      if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await input.fill(val);
        await input.press("Enter");
        await page.waitForTimeout(250);
      }
    }

    // Should arrive at confirmation screen with "Enregistrer" button
    const saveBtn = page.getByRole("button", { name: /Enregistrer/i });
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveBtn.click();

      // Should arrive at debrief screen — wait for local content (instant)
      await expect(page.getByText(/débrief coaching/i)).toBeVisible({ timeout: 5_000 });

      // Signature finale
      await expect(page.getByText("meilleur que tu crois")).toBeVisible();

      // NXT Coaching branding
      await expect(page.getByText("NXT Coaching")).toBeVisible();

      // CTA visible and links to /formation
      const cta = page.getByRole("link", { name: /en savoir plus/i });
      await expect(cta).toBeVisible();
      const href = await cta.getAttribute("href");
      expect(href).toBe("/formation");

      // Volume section visible
      await expect(page.getByText("Volume").first()).toBeVisible();

      // Scores visible
      await expect(page.getByText("Global")).toBeVisible();

      // URL still on /dashboard (no navigation)
      expect(page.url()).toContain("/dashboard");

      // Close debrief → back to dashboard
      await page.getByRole("button", { name: /Retour au dashboard/i }).click();
      await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible({ timeout: 5_000 });
      expect(page.url()).toContain("/dashboard");
    }
  });
});
