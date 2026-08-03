import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Source is ESM and imports siblings with explicit .js specifiers, which
    // point at build output that does not exist during a test run. Map them
    // back to the TypeScript sources.
    extensions: [".ts", ".js", ".json"],
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
  },
});
