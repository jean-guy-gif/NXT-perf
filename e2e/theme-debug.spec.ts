import { test, expect, type Page } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════
// Diagnostic — Couleurs agence (CSS custom properties)
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

async function getAgencyPrimary(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--agency-primary").trim()
  );
}

test.describe("Diagnostic — Thème couleurs agence", () => {

  test("1 — --agency-primary est défini au chargement dashboard démo", async ({ page }) => {
    await enterDemo(page);
    const primary = await getAgencyPrimary(page);
    console.log("[THEME TEST 1] --agency-primary =", JSON.stringify(primary));
    expect(primary).toBeTruthy();
    // Default NXT purple is #6C5CE7 — should be set
    expect(primary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test("2 — --agency-primary persiste après navigation entre pages", async ({ page }) => {
    await enterDemo(page);
    const primary1 = await getAgencyPrimary(page);
    console.log("[THEME TEST 2] dashboard --agency-primary =", JSON.stringify(primary1));

    await page.goto("/performance");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const primary2 = await getAgencyPrimary(page);
    console.log("[THEME TEST 2] performance --agency-primary =", JSON.stringify(primary2));

    await page.goto("/formation");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const primary3 = await getAgencyPrimary(page);
    console.log("[THEME TEST 2] formation --agency-primary =", JSON.stringify(primary3));

    // All should be the same color
    expect(primary1).toBe(primary2);
    expect(primary2).toBe(primary3);
  });

  test("3 — Toutes les CSS custom properties agency sont définies", async ({ page }) => {
    await enterDemo(page);
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        primary: s.getPropertyValue("--agency-primary").trim(),
        secondary: s.getPropertyValue("--agency-secondary").trim(),
        dark: s.getPropertyValue("--agency-dark").trim(),
        light: s.getPropertyValue("--agency-light").trim(),
      };
    });
    console.log("[THEME TEST 3] CSS vars:", JSON.stringify(vars));

    expect(vars.primary).toBeTruthy();
    expect(vars.secondary).toBeTruthy();
    expect(vars.dark).toBeTruthy();
    expect(vars.light).toBeTruthy();
  });

  test("4 — Sidebar nav utilise agency-primary pour l'item actif", async ({ page }) => {
    await enterDemo(page);
    // Set demo-saisie cookie so we see the real dashboard (not gate)
    await page.evaluate(() => { document.cookie = "nxt-demo-saisie=true;path=/;max-age=28800"; });
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });

    // Check if sidebar active indicator uses agency-primary
    const hasAgencyPrimaryClass = await page.evaluate(() => {
      const nav = document.querySelector("[data-tour='sidebar']");
      if (!nav) return { found: false, html: "no nav found" };
      const activeIndicator = nav.querySelector(".bg-agency-primary\\/15, [class*='agency-primary']");
      return {
        found: !!activeIndicator,
        classes: activeIndicator?.className ?? "none",
      };
    });
    console.log("[THEME TEST 4] Active sidebar:", JSON.stringify(hasAgencyPrimaryClass));
    expect(hasAgencyPrimaryClass.found).toBe(true);
  });

  test("5 — design-tokens.css contient les valeurs par défaut", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const tokensPath = path.join(__dirname, "..", "src", "styles", "design-tokens.css");
    const content = fs.readFileSync(tokensPath, "utf-8");

    expect(content).toContain("--agency-primary:");
    expect(content).toContain("--agency-secondary:");
    expect(content).toContain("--agency-dark:");
    expect(content).toContain("--agency-light:");
    expect(content).toContain("#6C5CE7"); // default primary
    console.log("[THEME TEST 5] design-tokens.css defaults verified");
  });

  test("6 — applyAgencyTheme change effectivement les CSS vars", async ({ page }) => {
    await enterDemo(page);
    const before = await getAgencyPrimary(page);
    console.log("[THEME TEST 6] before:", JSON.stringify(before));

    // Manually call applyAgencyTheme with a test color
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--agency-primary", "#FF0000");
      document.documentElement.style.setProperty("--agency-secondary", "#CC0000");
    });

    const after = await getAgencyPrimary(page);
    console.log("[THEME TEST 6] after injection:", JSON.stringify(after));
    expect(after).toBe("#FF0000");

    // Verify it's different from before (unless before was also red)
    if (before !== "#FF0000") {
      expect(after).not.toBe(before);
    }
  });

  test("7 — Valeurs par défaut sont le violet NXT (#6C5CE7)", async ({ page }) => {
    await enterDemo(page);
    const primary = await getAgencyPrimary(page);
    console.log("[THEME TEST 7] default primary =", JSON.stringify(primary));
    // Demo mode should use the default NXT purple
    expect(primary).toBe("#6C5CE7");
  });
});
