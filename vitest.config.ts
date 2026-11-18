import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      // RNF-07: la meta de cobertura aplica a las capas de dominio y aplicación.
      include: ["lib/dominio/**/*.ts", "lib/aplicacion/**/*.ts"],
      exclude: ["**/__tests__/**", "lib/aplicacion/puertos.ts"],
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
