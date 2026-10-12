// Read-only Fullnode BCS validation and original-digest recovery of the seeded PersonalKiosk.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deriveDynamicFieldID } from "rtd-typescript/utils";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletExecutionReader } from "../src/shared/rpc/execution-reader";
import { WalletFullnodeReader } from "../src/shared/rpc/fullnode-reader";
import {
  nativeKioskCap,
  KIOSK_BCS,
  KIOSK_ITEM_BCS,
  exactBcs,
} from "../src/shared/rpc/kiosk-reader";
async function main() {
  const [profileFile, directory, publication, output, placed] =
    process.argv.slice(2);
  const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const profile = validateNetworkProfile(json(profileFile)),
    pending = json(join(directory, "pending.json"));
  const receipt = json(join(directory, "receipt.json")).Transaction,
    deployed = json(publication);
  assert.equal(deployed.h0, profile.expectedGenesisDigest);
  assert.equal(pending.h0, deployed.h0);
  assert.equal(deployed.recovered.success, true);
  assert.equal(receipt.digest, pending.digest);
  assert.equal(receipt.status.success, true);
  const personalType = `${deployed.packageId}::personal_kiosk::PersonalKioskCap`;
  const idFor = (type: string) => {
    const matches = Object.entries(receipt.objectTypes).filter(
      ([, value]) => value === type,
    );
    assert.equal(matches.length, 1);
    return matches[0][0];
  };
  const capId = idFor(personalType),
    kioskId = idFor(`${normalizeRtdAddress("0x2")}::kiosk::Kiosk`);
  const nft = Object.entries(receipt.objectTypes).find(([, value]) =>
    String(value).endsWith("::migration_nft::MigrationNFT"),
  );
  assert(nft);
  const session = new WalletReadSession(profile),
    original = globalThis.fetch,
    paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, "127.0.0.1");
    assert(
      ["/GetServiceInfo", "/GetTransaction", "/GetObject"].some((method) =>
        url.pathname.endsWith(method),
      ),
    );
    paths.push(url.href);
    return original(input, init);
  };
  try {
    const reader = new WalletFullnodeReader(session),
      execution = new WalletExecutionReader(session);
    const cap = await reader.object(capId),
      kiosk = await reader.object(kioskId),
      item = await reader.object(nft[0]);
    assert(cap && kiosk && item);
    assert(
      cap.owner.$kind === "AddressOwner" &&
        cap.owner.AddressOwner === pending.sender,
    );
    assert(kiosk.owner.$kind === "Shared");
    const decoded = nativeKioskCap(cap, {
      kiosk: normalizeRtdAddress("0x2"),
      personalKiosk: deployed.packageId,
    });
    assert(decoded?.isPersonal);
    assert.equal(decoded.kioskId, kioskId);
    const body = exactBcs(KIOSK_BCS, kiosk.content);
    assert.equal(body.id, kioskId);
    assert.equal(body.owner, pending.sender);
    assert.equal(body.item_count, placed ? 1 : 0);
    if (placed) {
      assert.equal(placed, "placed");
      const fieldId = deriveDynamicFieldID(
        kioskId,
        "0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>",
        KIOSK_ITEM_BCS.serialize({ id: item.objectId }).toBytes(),
      );
      assert(
        item.owner.$kind === "ObjectOwner" &&
          item.owner.ObjectOwner === fieldId,
      );
      const field = await reader.object(fieldId);
      assert(field);
      assert(
        field.owner.$kind === "ObjectOwner" &&
          field.owner.ObjectOwner === kioskId,
      );
    } else
      assert(
        item.owner.$kind === "AddressOwner" &&
          item.owner.AddressOwner === pending.sender,
      );
    const recovered = await execution.lookup(pending.digest);
    assert.equal(recovered?.digest, pending.digest);
    assert.equal(recovered?.success, true);
    const result = {
      observedAt: new Date().toISOString(),
      h0: pending.h0,
      sender: pending.sender,
      digest: pending.digest,
      personalPackage: deployed.packageId,
      kioskId,
      capId,
      nftId: item.objectId,
      nftType: item.type,
      decoded,
      kiosk: body,
      placed: !!placed,
      recovered,
      paths,
      dispatches: 0,
      scope:
        "Actual wallet Fullnode PersonalKioskCap and Kiosk BCS validation, minted NFT ownership or placed dynamic-object ownership and original-digest recovery; GraphQL discovery and NFT transfer not covered.",
    };
    writeFileSync(output, JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        kioskId,
        capId,
        nftId: item.objectId,
        recovered: true,
        dispatches: 0,
      }),
    );
  } finally {
    globalThis.fetch = original;
    session.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
