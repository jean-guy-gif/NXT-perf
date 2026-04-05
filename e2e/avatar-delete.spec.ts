import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Suppression photo de profil
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Suppression photo de profil", () => {
  test("1 — Code AvatarUpload contient 'Supprimer la photo'", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "profile", "avatar-upload.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Supprimer la photo");
    expect(content).toContain("showDeleteConfirm");
    expect(content).toContain("handleDelete");
    expect(content).toContain("storage.from");
    expect(content).toContain("avatar_url: null");
  });

  test("2 — Code contient modale de confirmation avec Annuler/Supprimer", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "profile", "avatar-upload.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Annuler");
    expect(content).toContain("supprimée définitivement");
  });

  test("3 — Page paramètres/profil accessible et utilise AvatarUpload", async ({ page }) => {
    // Enter demo
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });

    await page.goto("/parametres/profil");
    await expect(page.getByRole("heading", { name: "Photo de profil" })).toBeVisible({ timeout: 10_000 });
  });

  test("4 — Bouton Supprimer non visible en mode démo", async ({ page }) => {
    // Enter demo
    await page.goto("/demo");
    await page.locator("input[type='password']").fill("DEMO2024");
    await page.getByRole("button", { name: /Démarrer la démo/i }).click();
    await page.waitForURL("**/onboarding/**", { timeout: 15_000 });
    await page.getByText(/Passer cette étape/i).click();
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });

    await page.goto("/parametres/profil");
    await expect(page.getByRole("heading", { name: "Photo de profil" })).toBeVisible({ timeout: 10_000 });
    // In demo mode, the delete button should NOT be shown (isDemo guard)
    const deleteBtn = page.getByText("Supprimer la photo");
    await expect(deleteBtn).not.toBeVisible();
  });
});
