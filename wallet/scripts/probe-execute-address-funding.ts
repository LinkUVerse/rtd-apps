// One-shot pure address-funded pay-all using actual wallet readers and an isolated fixture key.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Ed25519Keypair } from "rtd-typescript/keypairs/ed25519";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import type { WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletFullnodeReader } from "../src/shared/rpc/fullnode-reader";
import { WalletTransactionReader } from "../src/shared/rpc/transaction-reader";
import { WalletExecutionReader } from "../src/shared/rpc/execution-reader";
import {
  prepareCoinTransfer,
  revalidateCoinTransfer,
} from "../src/shared/rpc/coin-transfer-preparation";
async function main() {
  const [runtime, profileFile, fixtureDirectory, proofFile, output] =
    process.argv.slice(2);
  const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
  const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  assert(resolve(output).startsWith(resolve(runtime) + "/"));
  assert(resolve(fixtureDirectory).startsWith(resolve(runtime) + "/"));
  const fixture = json(join(fixtureDirectory, "fixture.json")),
    meta = json(join(runtime, "runtime.json")),
    proof = json(proofFile);
  assert.equal(meta.ready, true);
  assert.equal(meta.binary, proof.binaries.rtd.path);
  assert.equal(hash(readFileSync(meta.binary)), proof.binaries.rtd.sha256);
  const source = resolve(dirname(meta.binary), "../..");
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", source, ...args]);
  assert.equal(git("rev-parse", "HEAD").toString().trim(), proof.source.head);
  assert.equal(hash(git("diff", "--binary", "HEAD")), proof.source.diffSha256);
  for (const [file, expected] of Object.entries(proof.source.changedFiles))
    assert.equal(hash(readFileSync(join(source, file))), expected);
  process.kill(meta.pid, 0);
  const profile = validateNetworkProfile(json(profileFile));
  assert.equal(profile.expectedGenesisDigest, fixture.h0);
  assert.equal(profile.endpoints.fullnodeGrpcWeb, fixture.endpoint);
  assert.equal(meta.rpcUrl, fixture.endpoint);
  assert.equal(new URL(fixture.endpoint).hostname, "127.0.0.1");
  mkdirSync(output, { mode: 0o700 });
  function record(name: string, data: unknown) {
    const fd = openSync(join(output, name), "wx", 0o600);
    try {
      writeFileSync(
        fd,
        JSON.stringify(
          data,
          (_, value) => (typeof value === "bigint" ? value.toString() : value),
          2,
        ) + "\n",
      );
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    const dir = openSync(output, "r");
    try {
      fsyncSync(dir);
    } finally {
      closeSync(dir);
    }
  }
  const session = new WalletReadSession(profile),
    paths: string[] = [];
  const originalFetch = globalThis.fetch;
  let dispatches = 0;
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, "127.0.0.1");
    if (url.pathname.endsWith("/ExecuteTransaction")) {
      assert.equal(++dispatches, 1);
      assert(existsSync(join(output, "pending.json")));
    }
    assert(!String(init?.body).includes('"jsonrpc"'));
    paths.push(url.href);
    return originalFetch(input, init);
  };
  try {
    const fullnode = new WalletFullnodeReader(session),
      transactions = new WalletTransactionReader(session);
    const execution = new WalletExecutionReader(session, { timeoutMs: 60000 });
    const rpc = {
      bindingKey: session.bindingKey,
      readSessionKey: session.cacheKey,
      readFreshCoins: (owner, type, signal) =>
        fullnode.coins(owner, type, signal),
      readFreshBalance: (owner, type, signal) =>
        fullnode.balance(owner, type, signal),
      prepareTransaction: (tx, owner, signal) =>
        transactions.prepare(tx, owner, signal),
      simulateTransaction: (bytes, owner, signal) =>
        transactions.simulate(bytes, owner, signal),
    } as WalletRpc;
    const balance = await fullnode.balance(fixture.target, RTD_TYPE_ARG);
    assert.equal(balance.coinBalance, "0");
    assert.equal(balance.addressBalance, fixture.amount);
    const prepared = await prepareCoinTransfer(rpc, {
      sender: fixture.target,
      to: fixture.sender,
      coinType: RTD_TYPE_ARG,
      coinDecimals: 0,
      amount: balance.balance,
      isPayAllRtd: true,
    });
    await revalidateCoinTransfer(rpc, prepared, fixture.target);
    record("prepared.json", prepared);
    const key = Ed25519Keypair.fromSecretKey(
      json(join(fixtureDirectory, "keys.json")).target,
    );
    assert.equal(key.toRtdAddress(), fixture.target);
    const signed = await key.signTransaction(
      Buffer.from(prepared.bytesBase64, "base64"),
    );
    await execution.verifySignature(
      prepared.bytesBase64,
      fixture.target,
      signed.signature,
    );
    record("pending.json", {
      digest: prepared.digest,
      sender: fixture.target,
      bytesBase64: prepared.bytesBase64,
      signature: signed.signature,
    });
    const receipt = await execution.dispatch(
      prepared.bytesBase64,
      fixture.target,
      [signed.signature],
    );
    record("receipt.json", receipt);
    assert.equal(receipt.digest, prepared.digest);
    assert.equal(receipt.success, true);
    let recovered = await execution.lookup(prepared.digest);
    for (let i = 0; !recovered && i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      recovered = await execution.lookup(prepared.digest);
    }
    const after = await fullnode.balance(fixture.target, RTD_TYPE_ARG);
    record("evidence.json", {
      observedAt: new Date().toISOString(),
      h0: fixture.h0,
      sourceHead: proof.source.head,
      sender: fixture.target,
      recipient: fixture.sender,
      before: balance,
      after,
      receipt,
      recovered,
      dispatches,
      paths,
      scope:
        "Actual wallet pure-address-balance pay-all prepare, fixed-byte simulation, test-key signature, single dispatch and original-digest lookup. Private file record; not Chrome signing or product IndexedDB journal acceptance.",
    });
    assert(recovered);
    assert.equal(recovered.digest, prepared.digest);
    assert.equal(after.balance, "0");
    console.log(
      JSON.stringify({
        digest: prepared.digest,
        success: true,
        dispatches,
        recovered: true,
        after,
      }),
    );
  } finally {
    record("trace.json", {
      observedAt: new Date().toISOString(),
      paths,
      dispatches,
    });
    globalThis.fetch = originalFetch;
    session.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "execution probe failed",
  );
  process.exitCode = 1;
});
