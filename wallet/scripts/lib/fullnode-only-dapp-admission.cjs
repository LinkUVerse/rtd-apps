const assert = require("node:assert/strict");

const forbidden = [
  "RTD_TEST_DAPP_EXECUTE",
  "RTD_TEST_DAPP_POST_DISPATCH",
  "RTD_TEST_STAKING_EXECUTE",
  "RTD_TEST_MIXED_EXECUTE",
  "RTD_TEST_MIXED_NATIVE",
  "RTD_TEST_DEV_KEYSTORE",
  "RTD_TEST_CREATE_MNEMONIC",
  "RTD_TEST_CUSTOM_NETWORK",
  "RTD_TEST_COIN_PREVIEW",
  "RTD_TEST_STAKING_PAGE",
  "RTD_TEST_STAKING_PREVIEW",
  "RTD_TEST_OWNED_ASSETS",
  "RTD_TEST_QUERY_SWITCH",
  "RTD_TEST_ASSET_READ_ERROR",
  "RTD_TEST_TOKEN_METADATA_MISSING",
  "RTD_TEST_FAILED_RECEIPT",
];

// Admit a disposable public-account test only after both original journals are terminal.
function admitFullnodeOnly({ env, audit, backgroundSha256, now }) {
  assert.equal(env.RTD_TEST_DAPP_FULLNODE_ONLY, "1");
  assert.equal(env.RTD_TEST_LOCAL_PROFILE, "1");
  assert(env.RTD_TEST_DAPP_DIR);
  for (const flag of forbidden)
    assert.equal(
      env[flag],
      undefined,
      "Fullnode-only mode forbids alternate fixtures",
    );
  auditOriginalJournals({audit,backgroundSha256,now});
  return {
    admitted: true,
    originalTerminalRecords: 7,
    originalJournalAuditAt: audit.observedAt,
    fullnodeOnly: true,
    assetSnapshotAccepted: false,
    newExecutionAllowed: false,
  };
}
function auditOriginalJournals({audit,backgroundSha256,now}) {
  assert.equal(audit.passed, true);
  const age = now - Date.parse(audit.observedAt);
  assert(age >= 0 && age < 600_000, "Recent original-journal audit required");
  assert.equal(
    audit.account,
    "0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da",
  );
  assert.equal(
    audit.genesisDigest,
    "3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj",
  );
  assert.equal(audit.generation, "dev-20261003-01");
  assert.equal(audit.dispatches, 0);
  assert.equal(audit.simulations, 0);
  assert.equal(audit.lookups, 7);
  assert.equal(audit.profiles.length, 2);
  for (const [i, directory, count] of [
    [0, "dapp-execution-browser-01", 5],
    [1, "staking-execution-browser-01", 2],
  ]) {
    const profile = audit.profiles[i];
    assert.equal(profile.directory, directory);
    assert.equal(profile.records, count);
    assert.equal(profile.pendingScopes, 0);
    assert.equal(profile.logicalContentsUnchanged, true);
    const worker =
      profile.workerProvenance.after ?? profile.workerProvenance.before;
    assert.equal(worker.matchesDisk, true);
    assert.equal(worker.workerSha256, backgroundSha256);
    assert.equal(worker.diskSha256, backgroundSha256);
    assert.equal(profile.chain.length, count);
    assert(
      profile.chain.every(
        (row) =>
          ["confirmed-success", "confirmed-failure"].includes(row.state) &&
          row.nativeEffectsMatch === true,
      ),
    );
  }
}
module.exports=admitFullnodeOnly;
module.exports.auditOriginalJournals=auditOriginalJournals;
