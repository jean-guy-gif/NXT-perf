import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — ProductionChain (chaîne de production immobilière)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("ProductionChain — Code source", () => {
  test("Composant existe avec 12 étapes et toggle Volumes/Ratios", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "dashboard", "production-chain.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Contacts entrants");
    expect(content).toContain("RDV Estimation");
    expect(content).toContain("Estimations réalisées");
    expect(content).toContain("Mandats signés");
    expect(content).toContain("% Exclusivité");
    expect(content).toContain("Acheteurs chauds");
    expect(content).toContain("Visites réalisées");
    expect(content).toContain("Offres reçues");
    expect(content).toContain("Compromis signés");
    expect(content).toContain("Actes signés");
    expect(content).toContain("CA Compromis");
    expect(content).toContain("CA Acte");
    expect(content).toContain('"volumes"');
    expect(content).toContain('"ratios"');
    expect(content).toContain('"both"');
  });

  test("Dashboard conseiller utilise ProductionChain (pas GpsPilotage)", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "dashboard", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("ProductionChain");
    expect(content).not.toContain("GpsPilotage");
    // Default tab should be "mois"
    expect(content).toContain('"mois"');
  });

  test("Manager cockpit utilise ProductionChain", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "manager", "cockpit", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("ProductionChain");
    expect(content).not.toContain("GpsPilotage");
  });

  test("Directeur pilotage utilise ProductionChain", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "directeur", "pilotage", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("ProductionChain");
    expect(content).not.toContain("GpsPilotage");
  });

  test("Statuts Surperf/Stable/Sous-perf définis dans le composant", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "dashboard", "production-chain.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("surperf");
    expect(content).toContain("stable");
    expect(content).toContain("sousperf");
    expect(content).toContain("isLowerBetter");
  });
});

test.describe("ProductionChain — UI manager", () => {
  test("Toggle Équipe / Par collaborateur présent sur /manager/cockpit", async ({ page }) => {
    // Enter demo
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    for (let i = 0; i < 4; i++) {
      const skip = page.getByText(/Passer cette étape|Continuer sans/i).first();
      if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await skip.click();
        await page.waitForTimeout(1_000);
      }
      if (page.url().includes("/dashboard")) break;
    }
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    const tourSkip = page.getByRole("button", { name: "Passer" });
    if (await tourSkip.isVisible({ timeout: 2_000 }).catch(() => false)) await tourSkip.click();

    await page.goto("/manager/cockpit");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Équipe", { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Par collaborateur")).toBeVisible();
  });
});
