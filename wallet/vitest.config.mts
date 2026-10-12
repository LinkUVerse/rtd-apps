// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    exclude: [
      ...configDefaults.exclude,
      "tests/**",
      "scripts/**/*.test.cjs",
      // Audit snapshots preserve source names but are not runnable test projects.
      "migrationToGRpcOrGraphQLDoc/**",
    ],
    // TODO: Create custom extension environment.
    environment: "happy-dom",
    setupFiles: ["./testSetup.ts"],
    restoreMocks: true,
  },
});
