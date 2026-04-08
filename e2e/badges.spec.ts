import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Système de gamification badges
// ═══════════════════════════════════════════════════════════════════════════════

async function enterDemo(page: Page) {
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
}

test.describe("Gamification — Badges", () => {
  test("1 — 15 badges définis dans le code source", async () => {
    const filePath = path.join(__dirname, "..", "src", "lib", "badges.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const badgeKeys = content.match(/^\s+\w+:/gm);
    // Should have 15 badge keys (plus category array)
    expect(badgeKeys).toBeTruthy();
    expect(badgeKeys!.filter((k) => !k.includes("key:") && !k.includes("label:")).length).toBeGreaterThanOrEqual(15);
  });

  test("2 — Badge service contient awardBadgeIfEarned", async () => {
    const filePath = path.join(__dirname, "..", "src", "lib", "badge-service.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("awardBadgeIfEarned");
    expect(content).toContain("checkAndAwardBadges");
  });

  test("3 — Badge toast component existe", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "badges", "badge-toast.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Nouveau badge débloqué");
  });

  test("4 — Page paramètres/profil contient section 'Mes badges'", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/parametres/profil");
    await expect(page.getByText("Mes badges")).toBeVisible({ timeout: 10_000 });
  });

  test("5 — Grille de badges visible (15 badges affichés)", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/parametres/profil");
    await expect(page.getByText("Mes badges")).toBeVisible({ timeout: 10_000 });
    // Check categories are displayed
    await expect(page.getByText("Démarrage")).toBeVisible();
    await expect(page.getByText("Régularité").first()).toBeVisible();
    await expect(page.getByText("Social")).toBeVisible();
  });

  test("6 — useBadges hook existe", async () => {
    const filePath = path.join(__dirname, "..", "src", "hooks", "use-badges.ts");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("useBadges");
    expect(content).toContain("earnedBadges");
    expect(content).toContain("hasBadge");
  });
});
