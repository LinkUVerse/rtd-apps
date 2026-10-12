// Read-only verification of the controlled PersonalKiosk publication.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RtdGrpcClient } from "rtd-typescript/grpc";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletExecutionReader } from "../src/shared/rpc/execution-reader";
async function main() {
  const [profileFile, directory, output] = process.argv.slice(2);
  const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const profile = validateNetworkProfile(json(profileFile));
  const pending = json(join(directory, "pending.json"));
  const receipt = json(join(directory, "receipt.json")).Transaction;
  assert.equal(pending.h0, profile.expectedGenesisDigest);
  assert.equal(receipt.digest, pending.digest);
  assert.equal(receipt.status.success, true);
  const packages = receipt.effects.changedObjects.filter(
    (object: { outputState: string }) => object.outputState === "PackageWrite",
  );
  assert.equal(packages.length, 1);
  const packageId = packages[0].objectId;
  const session = new WalletReadSession(profile);
  const originalFetch = globalThis.fetch,
    paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, "127.0.0.1");
    assert(
      ["/GetServiceInfo", "/GetTransaction", "/GetPackage"].some((method) =>
        url.pathname.endsWith(method),
      ),
    );
    paths.push(url.href);
    return originalFetch(input, init);
  };
  try {
    const execution = new WalletExecutionReader(session);
    let recovered = null,
      recoveryError = null;
    try {
      recovered = await execution.lookup(pending.digest);
    } catch (error) {
      recoveryError = error instanceof Error ? error.message : String(error);
    }
    const client = new RtdGrpcClient({
      network: "localnet",
      baseUrl: profile.endpoints.fullnodeGrpcWeb,
      format: "binary",
    });
    assert.equal(
      (await client.ledgerService.getServiceInfo({})).response.chainId,
      pending.h0,
    );
    const result = (await client.movePackageService.getPackage({ packageId }))
      .response.package;
    assert.equal(result?.storageId, packageId);
    assert.deepEqual(result?.modules.map((module) => module.name).sort(), [
      "floor_price_rule",
      "kiosk_lock_rule",
      "personal_kiosk",
      "personal_kiosk_rule",
      "royalty_rule",
      "witness_rule",
    ]);
    const module = result!.modules.find(
      (value) => value.name === "personal_kiosk",
    )!;
    const cap = module.datatypes.find(
      (value) => value.name === "PersonalKioskCap",
    )!;
    assert.deepEqual(
      cap.fields.map((field) => field.name),
      ["id", "cap"],
    );
    assert.equal(
      cap.fields[0].type?.typeName,
      `${normalizeRtdAddress("0x2")}::object::UID`,
    );
    assert.equal(
      cap.fields[1].type?.typeName,
      `${normalizeRtdAddress("0x1")}::option::Option`,
    );
    assert.equal(
      cap.fields[1].type?.typeParameterInstantiation[0].typeName,
      `${normalizeRtdAddress("0x2")}::kiosk::KioskOwnerCap`,
    );
    const borrow = module.functions.find(
      (value) => value.name === "borrow_val",
    )!;
    const back = module.functions.find((value) => value.name === "return_val")!;
    assert.equal(borrow.parameters.length, 1);
    assert.equal(borrow.returns.length, 2);
    assert.equal(back.parameters.length, 3);
    assert.equal(back.returns.length, 0);
    assert.equal(borrow.parameters[0].body?.typeName, cap.typeName);
    assert.equal(
      borrow.returns[0].body?.typeName,
      `${normalizeRtdAddress("0x2")}::kiosk::KioskOwnerCap`,
    );
    assert.equal(
      borrow.returns[1].body?.typeName,
      `${packageId}::personal_kiosk::Borrow`,
    );
    assert.deepEqual(
      back.parameters.map((value) => value.body?.typeName),
      [
        cap.typeName,
        borrow.returns[0].body?.typeName,
        borrow.returns[1].body?.typeName,
      ],
    );
    const evidence = {
      observedAt: new Date().toISOString(),
      h0: pending.h0,
      digest: pending.digest,
      packageId,
      recovered,
      recoveryError,
      package: result,
      paths,
      dispatches: 0,
      scope:
        "Actual wallet original-digest lookup and Fullnode package descriptor verification; not PersonalKiosk object or transfer acceptance.",
    };
    writeFileSync(
      output,
      JSON.stringify(
        evidence,
        (_, value) =>
          typeof value === "bigint"
            ? value.toString()
            : value instanceof Uint8Array
              ? Buffer.from(value).toString("base64")
              : value,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        packageId,
        digest: pending.digest,
        recovered: !!recovered,
        recoveryError,
        modules: result?.modules.length,
        dispatches: 0,
      }),
    );
    assert.equal(recovered?.digest, pending.digest);
    assert.equal(recovered?.success, true);
  } finally {
    globalThis.fetch = originalFetch;
    session.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
