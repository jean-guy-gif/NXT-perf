import { test, expect } from "@playwright/test";

test.describe("WeeklyGate — non-regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Tester en démo" }).click();
    await page.waitForURL("**/dashboard**");
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
});
