const { test } = require("node:test");
const assert = require("node:assert/strict");
const admit = require("./fullnode-only-dapp-admission.cjs");
const now = Date.now();
const fixture = () => ({
  env: {
    RTD_TEST_DAPP_FULLNODE_ONLY: "1",
    RTD_TEST_LOCAL_PROFILE: "1",
    RTD_TEST_DAPP_DIR: "/demo",
  },
  backgroundSha256: "current-worker",
  now,
  audit: {
    passed: true,
    observedAt: new Date(now).toISOString(),
    account:
      "0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da",
    genesisDigest: "3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj",
    generation: "dev-20261003-01",
    dispatches: 0,
    simulations: 0,
    lookups: 7,
    profiles: [
      ["dapp-execution-browser-01", 5],
      ["staking-execution-browser-01", 2],
    ].map(([directory, records]) => ({
      directory,
      records,
      pendingScopes: 0,
      logicalContentsUnchanged: true,
      workerProvenance: {
        before: {
          matchesDisk: true,
          workerSha256: "current-worker",
          diskSha256: "current-worker",
        },
      },
      chain: Array.from({ length: records }, (_, i) => ({
        state:
          directory.startsWith("dapp") && i === 4
            ? "confirmed-failure"
            : "confirmed-success",
        nativeEffectsMatch: true,
      })),
    })),
  },
});
test("seven terminal originals admit only a nonexecuting, nonasset scope", () => {
  const result = admit(fixture());
  assert(result.admitted);
  assert.equal(result.newExecutionAllowed, false);
  assert.equal(result.assetSnapshotAccepted, false);
});
test("execution and private or asset fixtures are refused, even when flags are set to zero", () => {
  for (const name of [
    "RTD_TEST_DAPP_EXECUTE",
    "RTD_TEST_DAPP_POST_DISPATCH",
    "RTD_TEST_STAKING_EXECUTE",
    "RTD_TEST_MIXED_EXECUTE",
    "RTD_TEST_DEV_KEYSTORE",
    "RTD_TEST_OWNED_ASSETS",
    "RTD_TEST_COIN_PREVIEW",
  ]) {
    for (const value of ["1", "0"]) {
      const args = fixture();
      args.env[name] = value;
      assert.throws(() => admit(args));
    }
  }
});
test("expired, future, failed and wrong-chain evidence are refused", () => {
  for (const mutate of [
    (a) => {
      a.audit.observedAt = new Date(now - 600_000).toISOString();
    },
    (a) => {
      a.audit.observedAt = new Date(now + 1).toISOString();
    },
    (a) => {
      a.audit.passed = false;
    },
    (a) => {
      a.audit.genesisDigest = "other-chain";
    },
    (a) => {
      a.audit.account = "other-account";
    },
    (a) => {
      a.audit.generation = "other-generation";
    },
  ]) {
    const args = fixture();
    mutate(args);
    assert.throws(() => admit(args));
  }
});
test("pending, changed, incomplete and unaudited originals are refused", () => {
  for (const mutate of [
    (p) => {
      p.pendingScopes = 1;
    },
    (p) => {
      p.logicalContentsUnchanged = false;
    },
    (p) => {
      p.chain[0].state = "pending-unknown";
    },
    (p) => {
      p.chain[0].nativeEffectsMatch = false;
    },
    (p) => {
      p.chain.pop();
    },
    (p) => {
      p.records--;
    },
  ]) {
    const args = fixture();
    mutate(args.audit.profiles[0]);
    assert.throws(() => admit(args));
  }
});
test("earlier worker evidence cannot admit a newer bundle", () => {
  const args = fixture();
  args.backgroundSha256 = "newer-worker";
  assert.throws(() => admit(args));
});
