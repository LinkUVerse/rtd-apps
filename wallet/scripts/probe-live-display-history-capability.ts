// Read-only native Display capability and production parser evidence during certified replay.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { displayHistoryCapability } from "../src/shared/rpc/display-history";

type Envelope = {
  data?: {
    chainIdentifier?: string;
    checkpoint?: {
      sequenceNumber: number;
      digest: string;
      query: { serviceConfig: { displayHistory: unknown } } | null;
    } | null;
  };
  errors?: unknown[];
};

async function main() {
  const [runtime, output] = process.argv.slice(2);
  assert(runtime && output);
  const binding = JSON.parse(
    readFileSync(`${runtime}/publication-foundation/wallet-chain-binding.json`, "utf8"),
  );
  const queryBinding = JSON.parse(
    readFileSync(`${runtime}/publication-foundation/native-query-stack/binding.json`, "utf8"),
  );
  assert.equal(binding.generation, basename(runtime));
  assert.equal(binding.expectedGenesisDigest, queryBinding.scope.chainId);
  const endpoint = "http://127.0.0.1:39540/graphql";
  const request = async (checkpoint: number) => {
    const query = `query DisplayHistoryLiveAdmission {
      chainIdentifier checkpoint(sequenceNumber: ${checkpoint}) {
        sequenceNumber digest query { serviceConfig { displayHistory {
          apiVersion supportedTemplateKinds coverage {
            firstCheckpoint generation genesisDigest lastCheckpoint lastCheckpointDigest
            snapshotCheckpoint snapshotCheckpointDigest sourceId
          }
        } } }
      }
    }`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200);
    return (await response.json()) as Envelope;
  };
  const response = await request(100);
  assert.equal(response.errors?.length ?? 0, 0);
  assert.equal(response.data?.chainIdentifier, binding.expectedGenesisDigest);
  const checkpoint = response.data?.checkpoint;
  assert(checkpoint && checkpoint.query);
  assert.equal(checkpoint.sequenceNumber, 100);
  const capability = displayHistoryCapability(
    checkpoint.query.serviceConfig,
    binding.expectedGenesisDigest,
    100,
    checkpoint.digest,
  );
  assert.equal(capability.coverage.sourceId, queryBinding.scope.sourceId);
  assert.equal(capability.coverage.generation, binding.generation);
  assert(Object.isFrozen(capability) && Object.isFrozen(capability.coverage));
  assert.equal(capability.coverage.firstCheckpoint, "0");
  const uncovered = Number(capability.coverage.lastCheckpoint) + 10000;
  assert(Number.isSafeInteger(uncovered));
  const refused = await request(uncovered);
  assert((refused.errors?.length ?? 0) > 0);
  assert.equal(refused.data?.checkpoint?.query ?? null, null);
  const record = {
    observedAt: new Date().toISOString(),
    passed: true,
    endpoint,
    checkpoint: 100,
    checkpointDigest: checkpoint.digest,
    capability,
    uncoveredCheckpoint: uncovered,
    uncoveredErrorCount: refused.errors?.length,
    requests: 2,
    simulations: 0,
    dispatches: 0,
    scope: "Actual native same-S capability accepted by production wallet parser, uncovered S rejected. No asset/template, public ingress, Chrome or trial acceptance.",
  };
  writeFileSync(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ passed: true, checkpoint: 100, coveredThrough: capability.coverage.lastCheckpoint,
    uncoveredCheckpoint: uncovered, uncoveredRefused: true, requests: 2, dispatches: 0 }));
}

main().catch((error) => {
  console.error(JSON.stringify({ passed: false, errorType: error?.constructor?.name ?? "Error" }));
  process.exitCode = 1;
});
