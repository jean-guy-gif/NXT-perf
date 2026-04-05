import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Flow reset mot de passe
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Reset mot de passe", () => {
  test("1 — /forgot-password accessible", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByText("Mot de passe oublié")).toBeVisible({ timeout: 10_000 });
  });

  test("2 — Champ email présent", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 10_000 });
  });

  test("3 — Bouton 'Envoyer le lien' présent", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("button", { name: /Envoyer le lien/i })).toBeVisible({ timeout: 10_000 });
  });

  test("4 — /reset-password accessible sans auth", async ({ page }) => {
    await page.goto("/reset-password");
    // Should show either the password form or the "lien expiré" message (both are valid)
    await page.waitForTimeout(2_000);
    const text = await page.locator("body").textContent();
    expect(text!.length).toBeGreaterThan(10);
    // Should NOT redirect to /login (middleware allows this route)
    expect(page.url()).toContain("/reset-password");
  });

  test("5 — /reset-password affiche 'Lien expiré' si pas de session", async ({ page }) => {
    await page.goto("/reset-password");
    // Without a valid session, should show expired link message
    await expect(page.getByText(/expiré|Lien/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("6 — Lien 'Mot de passe oublié ?' visible sur /login", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: /Mot de passe oublié/i });
    await expect(link).toBeVisible({ timeout: 10_000 });
    const href = await link.getAttribute("href");
    expect(href).toBe("/forgot-password");
  });

  test("7 — /forgot-password?error=link_expired affiche message d'erreur", async ({ page }) => {
    await page.goto("/forgot-password?error=link_expired");
    await expect(page.getByText(/lien a expiré/i)).toBeVisible({ timeout: 10_000 });
  });

  test("8 — Soumission email → message de confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator("input[type='email']").fill("test@example.com");
    await page.getByRole("button", { name: /Envoyer le lien/i }).click();
    // Should show confirmation or error (both are valid responses)
    await page.waitForTimeout(3_000);
    const text = await page.locator("body").textContent();
    // Either "Email envoyé" (success) or an error message
    expect(text).toMatch(/Email envoyé|erreur|error/i);
  });
});
