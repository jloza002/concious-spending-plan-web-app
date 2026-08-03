import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Logic-only suite: the pure modules behind the plan and dashboard views.
    // Rendering tests would need jsdom + testing-library; keep those out until
    // there is a component worth the setup cost.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
