// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Isolated compiler boundary check. Does not build/install the extension or contact a chain.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import webpack, { DefinePlugin } from "webpack";
import commonConfig from "../configs/webpack/webpack.config.common";
import { profileFixture } from "../src/shared/rpc/profile-fixture";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { reviewedDeploymentFixture } from "../tests/unit/rpc/reviewed-deployment-fixture";
import type { selectConfiguredDeployment } from "../src/shared/rpc/release-deployment-config";

async function main() {
  const root = await mkdtemp(resolve(tmpdir(), "rtd-release-config-"));
  const previous = process.env.WALLET_REVIEWED_DEPLOYMENTS;
  let passed = false,
    count = 0;
  const compile = async (registry: string | undefined, index: number) => {
    if (registry === undefined) delete process.env.WALLET_REVIEWED_DEPLOYMENTS;
    else process.env.WALLET_REVIEWED_DEPLOYMENTS = registry;
    const common = await commonConfig();
    const plugins =
      common.plugins?.filter(
        (p) =>
          p instanceof DefinePlugin &&
          Object.hasOwn(p.definitions, "__WALLET_REVIEWED_DEPLOYMENTS__"),
      ) ?? [];
    assert.equal(plugins.length, 1);
    assert.deepEqual(Object.keys(common.entry!), [
      "background",
      "ui",
      "content-script",
      "dapp-interface",
    ]);
    const compiler = webpack({
      mode: "development",
      devtool: false,
      target: "node",
      context: process.cwd(),
      entry: resolve("src/shared/rpc/release-deployment-config.ts"),
      output: {
        path: root,
        filename: `selector-${index}.cjs`,
        library: { type: "commonjs2" },
      },
      resolve: common.resolve,
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: resolve("configs/ts/tsconfig.rpc.json"),
              compilerOptions: { noEmit: false },
            },
          },
        ],
      },
      plugins,
      optimization: { minimize: false },
    });
    await new Promise<void>((yes, no) =>
      compiler.run((error, stats) => {
        compiler.close((closeError) => {
          if (error || closeError || stats?.hasErrors())
            no(new Error("受控发布输入独立编译失败"));
          else yes();
        });
      }),
    );
    return createRequire(import.meta.url)(
      resolve(root, `selector-${index}.cjs`),
    ) as { selectConfiguredDeployment: typeof selectConfiguredDeployment };
  };
  try {
    const profile = validateNetworkProfile(profileFixture()),
      release = await reviewedDeploymentFixture(profile);
    const empty = await compile(undefined, 1);
    assert.equal(
      (await empty.selectConfiguredDeployment(profile)).state,
      "unreviewed",
    );
    count++;
    const selected = await compile(release.registry, 2);
    assert.equal(
      (await selected.selectConfiguredDeployment(profile)).state,
      "reviewed",
    );
    count++;
    Object.assign(globalThis, {
      __WALLET_REVIEWED_DEPLOYMENTS__: "forged-runtime-value",
    });
    assert.equal(
      (await selected.selectConfiguredDeployment(profile)).state,
      "reviewed",
    );
    count++;
    process.env.WALLET_REVIEWED_DEPLOYMENTS = "forged-runtime-env";
    assert.equal(
      (await selected.selectConfiguredDeployment(profile)).state,
      "reviewed",
    );
    count++;
    const other = validateNetworkProfile({
      ...profile,
      revision: profile.revision + 1,
    });
    assert.deepEqual(await selected.selectConfiguredDeployment(other), {
      state: "unreviewed",
      reason: "binding-missing",
    });
    count++;
    const injection = await compile(
      '\");globalThis.__rtdPinExecuted=true;//',
      3,
    );
    assert.deepEqual(await injection.selectConfiguredDeployment(profile), {
      state: "rejected",
      reason: "format",
    });
    assert.equal(
      (globalThis as Record<string, unknown>).__rtdPinExecuted,
      undefined,
    );
    count++;
    passed = true;
    console.log(
      JSON.stringify({
        passed,
        count,
        scope:
          "actual common DefinePlugin/compiler/production selector; shared four build entries; synthetic release pin only",
        extensionBuilt: false,
        chainRequests: 0,
      }),
    );
  } finally {
    if (previous === undefined) delete process.env.WALLET_REVIEWED_DEPLOYMENTS;
    else process.env.WALLET_REVIEWED_DEPLOYMENTS = previous;
    delete (globalThis as Record<string, unknown>)
      .__WALLET_REVIEWED_DEPLOYMENTS__;
    if (passed) await rm(root, { recursive: true, force: true });
  }
}
main().catch(() => {
  console.error("受控发布输入独立编译边界验证失败");
  process.exitCode = 1;
});
