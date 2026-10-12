// Read-only current production reader; this is not ordinary Chrome acceptance.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletBalanceReader } from "../src/shared/rpc/balance-reader";

async function main() {
  const profileFile = "/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json";
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, "utf8")));
  assert.equal(profile.endpoints.graphqlUrl, "http://127.0.0.1:41957/graphql");
  const owner = "0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc";
  const samples: unknown[] = [];
  for (let round = 0; round < 3; round++) {
    const session = new WalletReadSession(profile);
    const start = performance.now();
    try {
      const result = await WalletBalanceReader.read(session, owner);
      assert.equal(result.snapshot.bindingKey, session.bindingKey);
      assert.equal(result.value.length, 0);
      samples.push({ round: round + 1, milliseconds: Math.round(performance.now() - start),
        checkpoint: result.snapshot.checkpoint, digest: result.snapshot.digest,
        emptyCompleteBalanceSet: true });
    } finally { session.close(); }
  }
  const report = { passed: true, observedAt: new Date().toISOString(),
    scope: "Three fresh CLI sessions using the actual production GraphQL balance reader and certified profile. Not browser, user custom profile, durable admission or nonzero balance acceptance.",
    source: createHash("sha256").update(readFileSync(resolve(__filename))).digest("hex"),
    profileSha256: createHash("sha256").update(readFileSync(profileFile)).digest("hex"),
    owner, samples, signatures: 0, executionRequests: 0 };
  writeFileSync(resolve("migrationToGRpcOrGraphQLDoc/workLog/20261010-C207-live-balance-reader-01.json"), JSON.stringify(report, null, 2) + "\n", {flag: "wx", mode: 0o600});
  console.log(JSON.stringify({passed:true,samples}));
}
main().catch(() => { console.error("C207 live balance reader did not complete; no acceptance report written"); process.exitCode=1; });
