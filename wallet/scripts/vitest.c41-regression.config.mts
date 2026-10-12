import { resolve } from "node:path";
import ts from "typescript";
import { defineConfig } from "vitest/config";

const paths = ts.readConfigFile("configs/ts/tsconfig.common.json", ts.sys.readFile).config.compilerOptions.paths;

export default defineConfig({
  resolve: { alias: Object.entries(paths).map(([find, targets]) => ({
    find: find.replace(/\/\*$/, ""),
    replacement: resolve((targets as string[])[0].replace(/\/\*$/, "")),
  })) },
  test: {
    include: ["scripts/c41-nft-draft-retention.test.ts"],
    environment: "happy-dom",
    setupFiles: ["./testSetup.ts"],
    restoreMocks: true,
  },
});
