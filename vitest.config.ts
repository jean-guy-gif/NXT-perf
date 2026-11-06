import { defineConfig, defaultExclude } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Les specs Playwright (e2e/) et le sous-projet nxt-coach ne sont pas des
    // tests Vitest — ils cassent la collecte s'ils sont ramassés ici.
    exclude: [...defaultExclude, "e2e/**", "nxt-coach/**"],
  },
});
