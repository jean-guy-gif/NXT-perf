import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// PRD — Import de Performance, Création de Comptes & Monétisation
// Tests: Freemium cadenas, overlay, /souscrire, onboarding import, API, démo
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Enter demo mode via /demo page with DEMO2024 code */
async function enterDemoViaCode(page: Page) {
  await page.goto("/demo");
  await page.locator("input[type='password']").fill("DEMO2024");
  await page.getByRole("button", { name: /Démarrer la démo/i }).click();
  await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
}

/** Enter demo mode and land on dashboard (full flow: /demo → code → onboarding → skip → dashboard) */
async function enterDemo(page: Page) {
  await enterDemoViaCode(page);
  // Click "Passer cette étape" to skip onboarding and go to dashboard
  await page.getByText(/Passer cette étape/i).click();
  // Onboarding sets cookie and redirects to /dashboard?gate=1 via window.location.href
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  // Dismiss guided tour if present
  const skipBtn = page.getByRole("button", { name: "Passer" });
  if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}

// ═══ 1. ESSAI GRATUIT — ACCÈS COMPLET EN DÉMO ══════════════════════════════

test.describe("1. Essai gratuit — Accès complet en démo", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  const pages = [
    { label: "Mes Résultats", href: "/resultats" },
    { label: "Ma Performance", href: "/performance" },
    { label: "Ma Formation", href: "/formation" },
    { label: "Mes Objectifs", href: "/objectifs" },
    { label: "Comparaison", href: "/comparaison" },
  ];

  for (const p of pages) {
    test(`1.x — "${p.label}" accessible sans cadenas (trial actif)`, async ({ page }) => {
      await page.goto(p.href);
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      // No lock overlay should be visible
      const lockOverlay = page.getByText("Débloquez");
      const hasLock = await lockOverlay.isVisible({ timeout: 1_000 }).catch(() => false);
      expect(hasLock).toBe(false);
    });
  }
});

// ═══ 2. PAGE /souscrire — ESSAI GRATUIT ═══════════════════════════════════

test.describe("2. Page /souscrire — Essai gratuit", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemo(page);
  });

  test("2.1 — Page /souscrire accessible", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByText("Accès anticipé")).toBeVisible({ timeout: 10_000 });
  });

  test("2.2 — Affiche 'GRATUIT'", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByText("GRATUIT", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("2.3 — Badge 'Bêta' visible", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByText("Bêta")).toBeVisible({ timeout: 10_000 });
  });

  test("2.4 — Bouton 'Démarrer mon essai gratuit' présent", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByRole("button", { name: /essai gratuit/i })).toBeVisible({ timeout: 10_000 });
  });

  test("2.5 — Champ code partenaire présent", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByPlaceholder(/Code partenaire/i)).toBeVisible({ timeout: 10_000 });
  });

  test("2.6 — Prix barré 9€/mois visible", async ({ page }) => {
    await page.goto("/souscrire");
    await expect(page.getByText("9€/mois", { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

// ═══ 4. ONBOARDING — ZONE IMPORT ════════════════════════════════════════════

test.describe("4. Onboarding — Zone import", () => {
  test("4.1 — Page /onboarding/identite contient 'Importer vos données de performance'", async ({ page }) => {
    // Go through demo flow to reach onboarding
    await enterDemoViaCode(page);
    await expect(page.getByText("Importer vos données de performance")).toBeVisible({ timeout: 10_000 });
  });

  test("4.2 — Zone accepte les fichiers (input file présent)", async ({ page }) => {
    await enterDemoViaCode(page);
    await expect(page.getByText("Importer vos données de performance")).toBeVisible({ timeout: 10_000 });
    // The import zone has a hidden file input that accepts xlsx, csv, pdf, jpg, png, etc.
    const fileInput = page.locator("input[type='file'][accept*='.xlsx']").first();
    await expect(fileInput).toBeAttached();
  });

  test("4.3 — Bouton 'Passer cette étape' présent", async ({ page }) => {
    await enterDemoViaCode(page);
    await expect(page.getByText(/Passer cette étape/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ═══ 5. API /api/import-performance ══════════════════════════════════════════

test.describe("5. API /api/import-performance", () => {
  test("5.1 — Route existe et retourne 401 si non authentifié", async ({ request }) => {
    const formData = new URLSearchParams();
    // Send a POST without auth — should get 401
    const response = await request.post("/api/import-performance", {
      multipart: {
        file: {
          name: "test.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("col1,col2\nval1,val2"),
        },
      },
    });
    // Should return 401 (not 404) proving the route exists
    expect(response.status()).toBe(401);
  });

  test("5.2 — Route accepte POST multipart/form-data (pas 405)", async ({ request }) => {
    const response = await request.post("/api/import-performance", {
      multipart: {
        file: {
          name: "test.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: Buffer.from("dummy"),
        },
      },
    });
    // Should NOT be 405 (Method Not Allowed) — route accepts POST
    expect(response.status()).not.toBe(405);
    // Should be 401 (no auth) or 500 (processing error), not 404
    expect(response.status()).not.toBe(404);
  });
});

// ═══ 6. DÉMO COMPLÈTE ═══════════════════════════════════════════════════════

test.describe("6. Démo complète", () => {
  test("6.1 — /demo accessible", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Accès démonstration")).toBeVisible({ timeout: 10_000 });
  });

  test("6.2 — Input mot de passe présent (type=password)", async ({ page }) => {
    await page.goto("/demo");
    const pwInput = page.locator("input[type='password']");
    await expect(pwInput).toBeVisible({ timeout: 10_000 });
  });

  test("6.3 — Code DEMO2024 → redirige vers /onboarding/identite", async ({ page }) => {
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/identite**", { timeout: 15_000 });
    expect(page.url()).toContain("/onboarding/identite");
  });

  test("6.4 — Onboarding démo : 4 zones visibles (photo, logo, voix, import)", async ({ page }) => {
    await enterDemoViaCode(page);
    // Photo de profil
    await expect(page.getByText("Photo de profil")).toBeVisible({ timeout: 10_000 });
    // Logo de l'agence
    await expect(page.getByText("Logo de l'agence").first()).toBeVisible();
    // Votre voix coach
    await expect(page.getByText("Votre voix coach")).toBeVisible();
    // Importer vos données de performance
    await expect(page.getByText("Importer vos données de performance")).toBeVisible();
  });

  test("6.5 — CTA 'Accéder à mon dashboard' présent", async ({ page }) => {
    await enterDemoViaCode(page);
    await expect(
      page.getByRole("button", { name: /Accéder à mon dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("6.6 — /dashboard?gate=1 → simulation saisie visible", async ({ page }) => {
    // Enter demo mode first (via login button for cookie setup)
    await enterDemo(page);
    // Clear the demo-saisie cookie so DemoSaisieGate shows
    await page.evaluate(() => {
      document.cookie = "nxt-demo-saisie=;path=/;max-age=0";
    });
    await page.goto("/dashboard?gate=1");
    await expect(page.getByText("Simulation de saisie hebdomadaire")).toBeVisible({ timeout: 10_000 });
  });

  test("6.7 — Simulation saisie : 3 modes présents (Vocal, Manuel, Tableau)", async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(() => {
      document.cookie = "nxt-demo-saisie=;path=/;max-age=0";
    });
    await page.goto("/dashboard?gate=1");
    await expect(page.getByText("Simulation de saisie hebdomadaire")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Vocal", { exact: true })).toBeVisible();
    await expect(page.getByText("Manuel", { exact: true })).toBeVisible();
    await expect(page.getByText("Tableau", { exact: true })).toBeVisible();
  });

  test("6.8 — Bouton 'Valider ma simulation' présent après choix de mode", async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(() => {
      document.cookie = "nxt-demo-saisie=;path=/;max-age=0";
    });
    await page.goto("/dashboard?gate=1");
    await expect(page.getByText("Simulation de saisie hebdomadaire")).toBeVisible({ timeout: 10_000 });
    // Select a mode (e.g., Tableau)
    await page.getByText("Tableau", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Valider ma simulation/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
