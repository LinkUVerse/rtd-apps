// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Disposable current-extension test; never modify services, retained profiles, or dispatch.
const assert = require("node:assert/strict");
const { expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const path = require("node:path"),
  os = require("node:os"),
  crypto = require("node:crypto");
const { journal } = require("./test-dapp-execution.cjs");
const H0 = "3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj";
const scope = JSON.stringify([1, H0, "dev-20261003-01"]);
let restartArgs;
async function row(page) {
  return page.evaluate(
    (scope) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("RtdWallet NetworkObservations", 1);
        r.onupgradeneeded = () => {
          r.transaction.abort();
          reject(new Error("Existing observations required"));
        };
        r.onerror = r.onblocked = () =>
          reject(new Error("Observation read failed"));
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("observations-v1", "readonly"),
            read = tx.objectStore("observations-v1").get(scope);
          tx.oncomplete = () => {
            db.close();
            resolve(read.result);
          };
          tx.onabort = () => {
            db.close();
            reject(new Error("Observation read aborted"));
          };
        };
      }),
    scope,
  );
}
function verifyReset(value) {
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      "generation",
      "genesisDigest",
      "highest",
      "reset",
      "schemaVersion",
      "scope",
      "state",
    ].sort(),
  );
  assert.equal(value.scope, scope);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.state, "reset-required");
  assert.equal(value.reset.role, "archive");
  assert(BigInt(value.reset.previousHeight) > 0n);
  assert.equal(value.reset.observedHeight, "0");
  assert(BigInt(value.highest.archive) >= BigInt(value.reset.previousHeight));
}
async function test({
  context,
  demo,
  extensionPage,
  accountId,
  approvedBytesBase64,
  approvedDigest,
  setStage,
}) {
  const worker = context.serviceWorkers()[0],
    beforeJournal = await journal(extensionPage),
    before = await row(extensionPage);
  assert.equal(beforeJournal.length, 0);
  assert.equal(before.state, "observed");
  assert(BigInt(before.highest.archive) > 0n);
  const profileFile = path.join(
    os.homedir(),
    ".local/state/rtd-wallet-migration/dev-20261003-01/wallet-profile-20261004-03/profile.json",
  );
  const bindingKey = execFileSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "-e",
      "import {readFileSync} from 'node:fs';import {validateNetworkProfile,networkBindingKey} from './src/shared/rpc/profile';console.log(networkBindingKey(validateNetworkProfile(JSON.parse(readFileSync(process.argv[1],'utf8')),{requireComplete:true})));",
      profileFile,
    ],
    { cwd: path.resolve(__dirname, "../.."), encoding: "utf8" },
  ).trim();
  restartArgs = {
    accountId,
    bindingKey,
    requestId: "observation-restart-denied",
    bytesBase64: approvedBytesBase64,
    digest: approvedDigest,
  };
  const runtimeCodec = execFileSync(
    "pnpm",
    [
      "exec",
      "esbuild",
      "--bundle",
      "--platform=browser",
      "--format=iife",
      "--global-name=ObservationFaultTypes",
      "--log-level=error",
    ],
    {
      cwd: path.resolve(__dirname, "../.."),
      input: "export { GrpcTypes } from 'rtd-typescript/grpc';",
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  await worker.evaluate((code) => {
    (0, eval)(code);
  }, runtimeCodec);
  await worker.evaluate((H0) => {
    const original = globalThis.fetch;
    globalThis.__restoreNetworkObservations = () => {
      globalThis.fetch = original;
      delete globalThis.__restoreNetworkObservations;
    };
    const state = (globalThis.__networkObservations = {
      inject: false,
      replacements: 0,
      simulations: 0,
      dispatches: 0,
      identities: 0,
      actualArchiveSameChain: 0,
      actualArchiveHeights: [],
    });
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (/\/ExecuteTransaction(?:$|\?)/.test(url)) {
        state.dispatches++;
        throw new Error("Observation test forbids execution");
      }
      if (/\/SimulateTransaction(?:$|\?)/.test(url)) state.simulations++;
      const native = /\/GetServiceInfo(?:$|\?)/.test(url),
        graphql =
          url === "https://127.0.0.1:39600/graphql" &&
          JSON.parse(String(init?.body)).query ===
            "query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }";
      if (native || graphql) state.identities++;
      const response = await original(input, init);
      if (
        state.inject &&
        url ===
          "https://127.0.0.1:39603/archive/rtd.rpc.v2.LedgerService/GetServiceInfo"
      ) {
        if (response.status !== 200)
          throw new Error("Actual archive identity unavailable");
        const raw = new Uint8Array(await response.clone().arrayBuffer());
        if (raw[0] !== 0 || raw.length < 5)
          throw new Error("Actual native frame invalid");
        const length = new DataView(
            raw.buffer,
            raw.byteOffset,
            raw.byteLength,
          ).getUint32(1),
          type =
            globalThis.ObservationFaultTypes.GrpcTypes.GetServiceInfoResponse;
        const message = type.fromBinary(raw.subarray(5, 5 + length));
        if (message.chainId !== H0 || BigInt(message.checkpointHeight) <= 0n)
          throw new Error("Actual archive identity not positive same-chain");
        state.replacements++;
        state.actualArchiveSameChain++;
        state.actualArchiveHeights.push(String(message.checkpointHeight));
        message.checkpointHeight = 0n;
        message.lowestAvailableCheckpoint = 0n;
        message.lowestAvailableCheckpointObjects = 0n;
        const bytes = type.toBinary(message),
          replacement = new Uint8Array(
            5 + bytes.length + raw.length - 5 - length,
          );
        new DataView(replacement.buffer).setUint32(1, bytes.length);
        replacement.set(bytes, 5);
        replacement.set(raw.subarray(5 + length), 5 + bytes.length);
        return new Response(replacement, {
          status: 200,
          headers: response.headers,
        });
      }
      return response;
    };
  }, H0);
  let popup;
  try {
    setStage("network observation healthy preview");
    const opened = context.waitForEvent("page", { timeout: 20000 });
    opened.catch(() => {});
    await demo
      .getByRole("button", { name: "Sign transaction", exact: true })
      .click();
    popup = await opened;
    const approve = popup.getByRole("button", { name: /^(批准|Approve)$/ });
    await expect(approve).toBeEnabled({ timeout: 60000 });
    const previewDigest = (
      await popup.getByText(/^(交易摘要|Transaction digest):/).innerText()
    )
      .split(":")
      .pop()
      .trim();
    const prior = await worker.evaluate(() => globalThis.__networkObservations);
    assert(prior.simulations >= 2);
    setStage("network observation lower archive at approval");
    await worker.evaluate(() => {
      globalThis.__networkObservations.inject = true;
    });
    await approve.click();
    await expect(demo.getByRole("alert")).toContainText("水位已倒退", {
      timeout: 60000,
    });
    assert.equal(await demo.getByTestId("action-result").count(), 0);
    const persisted = await row(extensionPage);
    verifyReset(persisted);
    const afterFault = await worker.evaluate(
      () => globalThis.__networkObservations,
    );
    assert(afterFault.replacements > 0);
    assert.equal(afterFault.simulations, prior.simulations);
    assert.equal(afterFault.dispatches, 0);
    await worker.evaluate(() => {
      globalThis.__networkObservations.inject = false;
    });
    setStage("network observation fresh operation remains denied");
    const openedAgain = context.waitForEvent("page", { timeout: 20000 });
    openedAgain.catch(() => {});
    await demo
      .getByRole("button", { name: "Sign transaction", exact: true })
      .click();
    const denied = await openedAgain;
    await expect(
      denied.getByText(/^(网络费用估算失败|Gas estimation failed)$/).first(),
    ).toBeVisible({ timeout: 60000 });
    const disabled = denied.locator("button").filter({
      has: denied
        .locator(".nova-button__label")
        .filter({ hasText: /^(批准|Approve)$/ }),
    });
    await expect(disabled).toHaveCount(1);
    await expect(disabled).toBeDisabled();
    const nextState = await worker.evaluate(
      () => globalThis.__networkObservations,
    );
    assert.equal(nextState.identities, afterFault.identities);
    assert.equal(nextState.simulations, afterFault.simulations);
    assert.equal(nextState.dispatches, 0);
    await denied.getByRole("button", { name: /^(拒绝|Reject)$/ }).click();
    await expect(demo.getByRole("alert")).toContainText(/reject/i);
    assert.equal(await demo.getByTestId("action-result").count(), 0);
    assert.deepEqual(await journal(extensionPage), beforeJournal);
    assert.deepEqual(await row(extensionPage), persisted);
    return {
      passed: true,
      previewDigest,
      actualArchiveResponsesChecked: afterFault.actualArchiveSameChain,
      actualArchiveHeights: afterFault.actualArchiveHeights,
      controlledLowerHeight: "0",
      reset: persisted.reset,
      highest: persisted.highest,
      newOperationZeroIdentities: true,
      newOperationZeroSimulations: true,
      returnedSignature: false,
      journalUnchanged: true,
      dispatches: 0,
      rowSha256: crypto
        .createHash("sha256")
        .update(JSON.stringify(persisted))
        .digest("hex"),
      scope:
        "Current real extension: actual Archive identity decoded before controlled lower-height response at sign approval; native committed reset blocks fresh dApp operation. Whole-browser restart still verified by caller.",
    };
  } finally {
    await worker.evaluate(() => {
      globalThis.__restoreNetworkObservations();
      delete globalThis.ObservationFaultTypes;
    });
  }
}
async function verifyRestart({ context, page, command, accountId, setStage }) {
  setStage?.("network observation restart persisted row");
  assert.equal(restartArgs?.accountId, accountId);
  const persisted = await row(page);
  verifyReset(persisted);
  const before = await journal(page),
    worker = context.serviceWorkers()[0];
  assert.equal(before.length, 0);
  await worker.evaluate(() => {
    const original = globalThis.fetch;
    globalThis.__restoreRestartObservation = () => {
      globalThis.fetch = original;
      delete globalThis.__restoreRestartObservation;
    };
    globalThis.__restartObservationReads = 0;
    globalThis.fetch = async () => {
      globalThis.__restartObservationReads++;
      throw new Error("Restarted reset must reject before any transport");
    };
  });
  try {
    setStage?.("network observation restart guarded command");
    const denied = await command("executePreparedTransaction", restartArgs);
    assert.equal(denied.error, true);
    assert.match(denied.message, /水位已倒退/);
    assert.equal(
      await worker.evaluate(() => globalThis.__restartObservationReads),
      0,
    );
    setStage?.("network observation restart readonly recovery");
    const recovery = await command("recoverPreparedTransaction", { accountId });
    assert.notEqual(recovery.error, true);
    assert.deepEqual(await row(page), persisted);
    assert.deepEqual(await journal(page), before);
    return {
      passed: true,
      browserRestart: true,
      resetRetained: true,
      validApprovedBytesDenied: true,
      transports: 0,
      simulations: 0,
      dispatches: 0,
      journalUnchanged: true,
      readOnlyEmptyRecoveryAllowed: true,
    };
  } finally {
    await worker.evaluate(() => globalThis.__restoreRestartObservation());
    restartArgs = undefined;
  }
}
module.exports = test;
module.exports.verifyRestart = verifyRestart;
