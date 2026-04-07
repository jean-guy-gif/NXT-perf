import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests — Animation célébration badge
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Badge Celebration", () => {
  test("1 — BadgeCelebration component existe", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "badges", "badge-celebration.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Nouveau badge débloqué");
    expect(content).toContain("Super !");
    expect(content).toContain("animate-bounce");
  });

  test("2 — Badge store existe avec queue et celebrations", async () => {
    const filePath = path.join(__dirname, "..", "src", "stores", "badge-store.ts");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("queueCelebrations");
    expect(content).toContain("nextCelebration");
    expect(content).toContain("currentCelebration");
  });

  test("3 — BadgeCelebration intégré dans le layout dashboard", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "layout.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("BadgeCelebration");
  });

  test("4 — Saisie page déclenche les célébrations via badge store", async () => {
    const filePath = path.join(__dirname, "..", "src", "app", "(dashboard)", "saisie", "page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("useBadgeStore");
    expect(content).toContain("queueCelebrations");
  });

  test("5 — Badge grid a bouton Revoir sur les badges obtenus", async () => {
    const filePath = path.join(__dirname, "..", "src", "components", "badges", "badge-grid.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Revoir");
    expect(content).toContain("queueCelebrations");
  });
});
