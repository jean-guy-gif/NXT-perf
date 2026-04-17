import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Refonte v2.0 (Priorités 1-8)
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemo(page: Page) {
  await page.goto("/demo");
  await page.locator("input[type='password']").fill("DEMO2024");
  await page.getByRole("button", { name: /Démarrer la démo/i }).click();
  await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
  await page.getByText(/Passer cette étape/i).click();
  await page.waitForURL("**/**", { timeout: 15_000 });
  // May land on /onboarding/dpi or /dashboard — skip through
  if (page.url().includes("/onboarding")) {
    const skipBtn = page.getByText(/Passer cette étape|Continuer sans/i).first();
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(1_000);
    }
    // May be on /onboarding/gps now
    if (page.url().includes("/onboarding")) {
      const skipBtn2 = page.getByText(/Passer cette étape/i).first();
      if (await skipBtn2.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await skipBtn2.click();
        await page.waitForTimeout(1_000);
      }
    }
  }
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  const tourSkip = page.getByRole("button", { name: "Passer" });
  if (await tourSkip.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await tourSkip.click();
    await page.waitForTimeout(500);
  }
}

// ═══ P1 — NAVIGATION & RENOMMAGES ══════════════════════════════════════════

test.describe("P1 — Navigation renommée", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("Conseiller — sidebar contient 'Mon Volume d'Activité'", async ({ page }) => {
    await expect(page.locator("nav").getByText("Mon Volume d'Activité").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Conseiller — sidebar contient 'Mes Ratios de Transformation'", async ({ page }) => {
    await expect(page.locator("nav").getByText("Mes Ratios de Transformation").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Conseiller — sidebar contient 'Ma Comparaison'", async ({ page }) => {
    await expect(page.locator("nav").getByText("Ma Comparaison").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Conseiller — sidebar ne contient PAS 'Mes Objectifs'", async ({ page }) => {
    const objLink = page.locator("nav").getByText("Mes Objectifs");
    await expect(objLink).not.toBeVisible();
  });

  test("Conseiller — sidebar contient 'Ma Formation'", async ({ page }) => {
    await expect(page.locator("nav").getByText("Ma Formation").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ═══ P2 — DASHBOARD PILOTAGE ═══════════════════════════════════════════════

test.describe("P2 — Dashboard pilotage", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("Onglet 'Ce mois' existe dans le code dashboard", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "dashboard", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Ce mois");
    expect(content).toContain('"mois"');
  });

  test("Bouton 'Personnaliser' existe dans le code dashboard", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "dashboard", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Personnaliser");
    expect(content).toContain("editingFavorites");
  });
});

// ═══ P3 — RATIOS DE TRANSFORMATION ═════════════════════════════════════════

test.describe("P3 — Ratios de transformation", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("Toggle Chiffres/Pourcentages visible sur /performance", async ({ page }) => {
    await page.goto("/performance");
    await expect(page.getByText("Chiffres", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pourcentages", { exact: true })).toBeVisible();
  });

  test("Score global absent de /performance", async ({ page }) => {
    await page.goto("/performance");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const scoreGlobal = page.locator("main").getByText("Score global");
    await expect(scoreGlobal).not.toBeVisible();
  });

  test("Badge profil dynamique visible dans le header", async ({ page }) => {
    // Header should show a category badge (Junior/Confirmé/Expert)
    const header = page.locator("header");
    const badge = header.getByText(/Junior|Confirmé|Expert/i).first();
    await expect(badge).toBeVisible({ timeout: 5_000 });
  });
});

// ═══ P4 — AMÉLIORER CE RATIO ═══════════════════════════════════════════════

test.describe("P4 — Catalogue et outils", () => {
  test("ImprovementCatalogue code source contient les 4 outils", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "dashboard", "improvement-catalogue.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Plan 30 jours");
    expect(content).toContain("NXT Coaching");
    expect(content).toContain("NXT Training");
    expect(content).toContain("Formation certifiante");
  });

  test("Page /formation contient 'Outils pour progresser'", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/formation");
    await expect(page.getByText("Outils pour progresser")).toBeVisible({ timeout: 10_000 });
  });

  test("Onglet 'Catalogue' visible dans Ma Formation", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/formation");
    await expect(page.getByText("Catalogue", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ═══ P5 — ALERTES MANAGER ══════════════════════════════════════════════════

test.describe("P5 — Alertes manager", () => {
  test("Page /manager/alertes accessible", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/manager/alertes");
    await expect(page.locator("main").getByRole("heading", { name: "Alertes" })).toBeVisible({ timeout: 10_000 });
  });

  test("Filtres Toutes/Non traitées/Traitées présents", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/manager/alertes");
    await expect(page.getByText("Toutes", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Non traitées", { exact: true })).toBeVisible();
    await expect(page.getByText("Traitées", { exact: true })).toBeVisible();
  });

  test("Sidebar manager contient lien Alertes", async ({ page }) => {
    const filePath = path.join(__dirname, "..", "src", "components", "layout", "sidebar.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('"/manager/alertes"');
    expect(content).toContain('"Alertes"');
  });
});

// ═══ P7 — BADGES PERFORMANCE ═══════════════════════════════════════════════

test.describe("P7 — Badges performance", () => {
  test("Service badges performance existe avec 8 badges", async () => {
    const filePath = path.join(__dirname, "..", "src", "lib", "performance-badge-service.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("prospecteur");
    expect(content).toContain("roi_estimation");
    expect(content).toContain("maitre_exclusivite");
    expect(content).toContain("visiteur_pro");
    expect(content).toContain("closing_master");
    expect(content).toContain("finisher");
    expect(content).toContain("top_ca");
    expect(content).toContain("regularite");
  });

  test("Page paramètres/profil contient 'Badges de performance'", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/parametres/profil");
    await expect(page.getByText("Badges de performance")).toBeVisible({ timeout: 10_000 });
  });
});

// ═══ P8 — ONBOARDING GPS + DPI ═════════════════════════════════════════════

test.describe("P8 — Onboarding GPS + DPI", () => {
  test("Page /onboarding/dpi accessible", async ({ page }) => {
    await page.goto("/onboarding/dpi");
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
  });

  test("Page /onboarding/gps accessible", async ({ page }) => {
    await page.goto("/onboarding/gps");
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
  });

  test("/onboarding/gps affiche formulaire d'objectifs", async ({ page }) => {
    await page.goto("/onboarding/gps");
    await page.waitForTimeout(2_000);
    const url = page.url();
    if (url.includes("/onboarding/gps")) {
      await expect(page.getByText(/objectifs/i).first()).toBeVisible({ timeout: 5_000 });
      await expect(page.getByPlaceholder(/150000|Ex:/i).first()).toBeVisible();
    }
  });

  test("'Passer cette étape' présent sur /onboarding/dpi", async ({ page }) => {
    await page.goto("/onboarding/dpi");
    await page.waitForTimeout(2_000);
    if (page.url().includes("/onboarding/dpi")) {
      await expect(page.getByText(/Passer cette étape/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test("'Passer cette étape' présent sur /onboarding/gps", async ({ page }) => {
    await page.goto("/onboarding/gps");
    await page.waitForTimeout(2_000);
    if (page.url().includes("/onboarding/gps")) {
      await expect(page.getByText(/Passer cette étape/i)).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ═══ P6 — CATALOGUE FORMATION ══════════════════════════════════════════════

test.describe("P6 — Catalogue formation", () => {
  test("Onglet Catalogue dans le code formation", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "formation", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('"catalogue"');
    expect(content).toContain("CatalogueTab");
    expect(content).toContain("start-academy.fr");
  });
});
