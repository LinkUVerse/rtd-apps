import { describe, expect, it } from "vitest";
import { normalizeStructTag } from "rtd-typescript/utils";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import {
  ORIGINBYTE_OWNER_TOKEN_BCS,
  originByteOwnerToken,
} from "./originbyte-kiosk";
import {
  executionScopeKey,
  networkBindingKey,
  validateNetworkProfile,
} from "./profile";
import { profileFixture } from "./profile-fixture";
const address = walletAddress("0xb"),
  id = walletAddress("0xa"),
  kiosk = walletAddress("0xc");
const packages = {
  originByte: {
    discoveryPackage: walletAddress("0x88"),
    executionPackage: walletAddress("0x99"),
  },
};
function object(): WalletAssetObject {
  return {
    objectId: id,
    type: normalizeStructTag(
      `${packages.originByte.discoveryPackage}::ob_kiosk::OwnerToken`,
    ),
    content: ORIGINBYTE_OWNER_TOKEN_BCS.serialize({
      id,
      kiosk,
      owner: address,
    }).toBytes(),
    owner: { $kind: "AddressOwner", AddressOwner: address },
  } as WalletAssetObject;
}
describe("OriginByte package binding and discovery token", () => {
  it("decodes a discovery token without claiming a native OwnerCap", () => {
    const token = originByteOwnerToken(object(), address, packages)!;
    expect(token).toMatchObject({
      kind: "originbyte-discovery",
      kioskId: kiosk,
      owner: address,
    });
    expect(token).not.toHaveProperty("isPersonal");
    expect(Object.isFrozen(token)).toBe(true);
  });
  it("does not guess a historical package when unconfigured", () => {
    expect(originByteOwnerToken(object(), address, {})).toBeNull();
  });
  it("does not use execution package as discovery type origin", () => {
    const value = object();
    value.type = normalizeStructTag(
      `${packages.originByte.executionPackage}::ob_kiosk::OwnerToken`,
    );
    expect(originByteOwnerToken(value, address, packages)).toBeNull();
  });
  it.each([
    "uid",
    "owner-field",
    "owner-object",
    "shared",
    "trailing",
    "truncated",
  ])("rejects inconsistent token %s", (failure) => {
    const value = object();
    if (failure === "uid") value.objectId = kiosk;
    if (failure === "owner-field")
      value.content = ORIGINBYTE_OWNER_TOKEN_BCS.serialize({
        id,
        kiosk,
        owner: kiosk,
      }).toBytes();
    if (failure === "owner-object")
      value.owner = { $kind: "AddressOwner", AddressOwner: kiosk };
    if (failure === "shared")
      value.owner = { $kind: "Shared", Shared: { initialSharedVersion: "1" } };
    if (failure === "trailing")
      value.content = Uint8Array.from([...value.content, 0]);
    if (failure === "truncated") value.content = value.content.slice(1);
    expect(() => originByteOwnerToken(value, address, packages)).toThrow();
  });
  it("copies, validates and freezes both deployment packages", () => {
    const input = profileFixture();
    input.packages.originByte = {
      discoveryPackage: "0x88",
      executionPackage: "0x99",
    };
    const parsed = validateNetworkProfile(input);
    input.packages.originByte.executionPackage = "0xaa";
    expect(parsed.packages.originByte).toEqual(packages.originByte);
    expect(Object.isFrozen(parsed.packages.originByte)).toBe(true);
  });
  it.each([
    { discoveryPackage: "0x88" },
    { executionPackage: "0x99" },
    { discoveryPackage: "invalid", executionPackage: "0x99" },
  ])("rejects partial/invalid binding %j", (value) => {
    const input = profileFixture();
    input.packages.originByte = value as any;
    expect(() => validateNetworkProfile(input)).toThrow();
  });
  it("changes admission binding without splitting same-chain execution locks", () => {
    const input = profileFixture();
    const base = validateNetworkProfile(input);
    input.packages.originByte = {
      discoveryPackage: "0x88",
      executionPackage: "0x99",
    };
    const withOb = validateNetworkProfile(input);
    input.packages.originByte.executionPackage = "0xaa";
    const changed = validateNetworkProfile(input);
    expect(new Set([base, withOb, changed].map(networkBindingKey)).size).toBe(
      3,
    );
    expect(executionScopeKey(base, address)).toBe(
      executionScopeKey(changed, address),
    );
    expect(JSON.parse(networkBindingKey(base)).length).toBe(17);
  });
});

import { vi } from "vitest";
import { discoverOriginByteKiosks } from "./originbyte-kiosk";
import { KIOSK_BCS } from "./kiosk-reader";
import { WalletAssetReader } from "./asset-reader";
function readerFixture(failure?: string) {
  const token = object();
  const content = {
    id: kiosk,
    profits: { value: "0" },
    owner: failure === "kiosk-owner" ? id : address,
    item_count: 0,
    allow_extensions: true,
  };
  const kioskObject = {
    ...object(),
    objectId: kiosk,
    type: normalizeStructTag("0x2::kiosk::Kiosk"),
    owner: { $kind: "Shared", Shared: { initialSharedVersion: "1" } },
    content: KIOSK_BCS.serialize(content).toBytes(),
  };
  if (failure === "kiosk-type")
    kioskObject.type = normalizeStructTag("0x2::not::Kiosk");
  if (failure === "kiosk-uid")
    kioskObject.content = KIOSK_BCS.serialize({ ...content, id }).toBytes();
  if (failure === "trailing-kiosk")
    kioskObject.content = Uint8Array.from([...kioskObject.content, 0]);
  const proof = { cacheKey: "snapshot-s" };
  const revalidate = vi.fn(async () => {
    if (failure === "revalidation") throw new Error("snapshot changed");
  });
  const ownedObjects = vi.fn(async () => ({
    value: failure === "duplicate" ? [token, token] : [token],
  }));
  const objects = vi.fn(async (_ids: readonly string[]) => ({
    value: [failure === "missing" ? new Error("not found") : kioskObject],
  }));
  const reader = {
    proof,
    snapshot: { session: { profile: { packages } }, revalidate },
    ownedObjects,
    objects,
  } as unknown as WalletAssetReader;
  return { reader, revalidate, ownedObjects, objects };
}
it("discovers with same reader and final snapshot revalidation, without an OwnerCap", async () => {
  const fixture = readerFixture();
  const result = await discoverOriginByteKiosks(fixture.reader, address);
  expect(result.value[0].token.kioskId).toBe(kiosk);
  expect(result.value[0]).not.toHaveProperty("ownerCap");
  expect(fixture.objects.mock.calls[0][0]).toEqual([kiosk]);
  expect(fixture.revalidate).toHaveBeenCalledOnce();
});
it.each([
  "kiosk-owner",
  "kiosk-type",
  "kiosk-uid",
  "trailing-kiosk",
  "duplicate",
  "missing",
  "revalidation",
])("rejects invalid discovery %s", async (failure) => {
  await expect(
    discoverOriginByteKiosks(readerFixture(failure).reader, address),
  ).rejects.toThrow();
});
it("cancels before reading", async () => {
  const fixture = readerFixture();
  const controller = new AbortController();
  controller.abort();
  await expect(
    discoverOriginByteKiosks(fixture.reader, address, controller.signal),
  ).rejects.toThrow();
  expect(fixture.ownedObjects).not.toHaveBeenCalled();
});

import * as frameworkReader from "./kiosk-reader";
import {
  readOriginByteKiosks,
  ORIGINBYTE_EMPTY_KEY_BCS,
  ORIGINBYTE_TABLE_BCS,
  ORIGINBYTE_NFT_REF_BCS,
} from "./originbyte-kiosk";
import { bcs } from "rtd-typescript/bcs";
import { dynamicType } from "./dynamic-fields";
function contentsFixture(failure?: string) {
  const fixture = readerFixture();
  const itemId = walletAddress("0xd"),
    tableId = walletAddress("0xe");
  const type = (name: string) =>
    normalizeStructTag(
      `${packages.originByte.discoveryPackage}::ob_kiosk::${name}`,
    );
  const key = ORIGINBYTE_EMPTY_KEY_BCS.serialize({
    dummy_field: false,
  }).toBytes();
  const field = (name: string, valueType: string, bytes: Uint8Array) => ({
    $kind: "DynamicField",
    name: { type: type(name), bcs: key },
    valueType: dynamicType(valueType),
    value: { bcs: bytes },
  });
  const fields = [
    field(
      "VersionDfKey",
      "u64",
      bcs
        .u64()
        .serialize(failure === "version" ? "4" : "3")
        .toBytes(),
    ),
    field(
      "KioskOwnerCapDfKey",
      "0x2::kiosk::KioskOwnerCap",
      frameworkReader.KIOSK_CAP_BCS.serialize({
        id,
        for: failure === "embedded-cap" ? id : kiosk,
      }).toBytes(),
    ),
    field(
      "NftRefsDfKey",
      `0x2::table::Table<0x2::object::ID,${type("NftRef")}>`,
      ORIGINBYTE_TABLE_BCS.serialize({
        id: tableId,
        size:
          failure === "table-count"
            ? "2"
            : failure === "unregistered"
              ? "0"
              : "1",
      }).toBytes(),
    ),
  ];
  if (failure === "missing-version") fields.shift();
  if (failure === "duplicate-key") fields.push(fields[0]);
  if (failure === "true-key")
    fields[0].name.bcs = ORIGINBYTE_EMPTY_KEY_BCS.serialize({
      dummy_field: true,
    }).toBytes();
  const item = {
    ...object(),
    objectId: itemId,
    kioskId: kiosk,
    isLocked: false,
  };
  vi.spyOn(frameworkReader, "readFrameworkKioskContents").mockResolvedValue({
    kiosk: {
      id: kiosk,
      owner: address,
      profits: { value: "0" },
      item_count: 1,
      allow_extensions: failure !== "extensions-disabled",
    },
    contents: [item],
    fields,
  } as any);
  const refs = [
    {
      $kind: "DynamicField",
      name: {
        type: normalizeStructTag("0x2::object::ID"),
        bcs: bcs.Address.serialize(
          failure === "unknown-item" ? id : itemId,
        ).toBytes(),
      },
      valueType: type("NftRef"),
      value: {
        bcs: ORIGINBYTE_NFT_REF_BCS.serialize({
          auths: {
            contents:
              failure === "duplicate-auth"
                ? [id, id]
                : failure === "exclusive"
                  ? [id]
                  : [],
          },
          is_exclusively_listed:
            failure === "exclusive" || failure === "bad-exclusive",
        }).toBytes(),
      },
    },
  ];
  if (failure === "unregistered") refs.length = 0;
  if (failure === "duplicate-ref") refs.push(refs[0]);
  const dynamicFields = vi.fn(async () => ({ value: refs }));
  Object.assign(fixture.reader, { dynamicFields });
  return { ...fixture, dynamicFields, itemId, tableId };
}
it("reads registered OriginByte contents without inventing a transferable OwnerCap", async () => {
  const fixture = contentsFixture();
  const result = await readOriginByteKiosks(fixture.reader, address);
  expect(result.value[0]).toMatchObject({
    kind: "originbyte",
    ownerTokenId: id,
    extensionVersion: "3",
  });
  expect(result.value[0].items[0]).toMatchObject({
    objectId: fixture.itemId,
    originByteRegistered: true,
    originByteExclusive: false,
  });
  expect(result.value[0]).not.toHaveProperty("ownerCap");
  expect(fixture.revalidate).toHaveBeenCalledTimes(2);
});
it("preserves unregistered base items for display without marking them executable", async () => {
  const fixture = contentsFixture("unregistered");
  const result = await readOriginByteKiosks(fixture.reader, address);
  expect(result.value[0].items[0].originByteRegistered).toBe(false);
});
it("retains OriginByte-exclusive status separately from framework listings", async () => {
  const result = await readOriginByteKiosks(
    contentsFixture("exclusive").reader,
    address,
  );
  expect(result.value[0].items[0].originByteExclusive).toBe(true);
});
it.each([
  "version",
  "embedded-cap",
  "table-count",
  "missing-version",
  "duplicate-key",
  "true-key",
  "extensions-disabled",
  "unknown-item",
  "duplicate-auth",
  "bad-exclusive",
  "duplicate-ref",
])("rejects inconsistent OriginByte contents %s", async (failure) => {
  await expect(
    readOriginByteKiosks(contentsFixture(failure).reader, address),
  ).rejects.toThrow();
});

it("组合入口只启用OriginByte时仍读取登记项，不要求原生OwnerCap配置", async () => {
  const fixture = contentsFixture();
  Object.setPrototypeOf(fixture.reader, WalletAssetReader.prototype);
  const native = vi.spyOn(fixture.reader, "nativeKiosks");
  const result = await fixture.reader.kiosks(address);
  expect(result.value).toHaveLength(1);
  expect(result.value[0]).toMatchObject({
    kind: "originbyte",
    ownerTokenId: id,
  });
  expect(native).not.toHaveBeenCalled();
  expect(fixture.revalidate).toHaveBeenCalledTimes(3);
});
it("组合入口没有配置任何分支时不把不可用伪装为空集合", async () => {
  const fixture = contentsFixture();
  Object.setPrototypeOf(fixture.reader, WalletAssetReader.prototype);
  Object.assign(fixture.reader.snapshot.session.profile, { packages: {} });
  await expect(fixture.reader.kiosks(address)).rejects.toThrow("未配置");
  expect(fixture.ownedObjects).not.toHaveBeenCalled();
});

// Drive the browser deadline API with fake time; the real nested collection and
// registration validation still run, with a slow complete owner listing.
describe("Kiosk 复合读取的总期限与调用方取消", () => {
  async function slowCollection(delay: number, cancelAt?: number) {
    vi.useFakeTimers();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((ms) => {
        const controller = new AbortController();
        timers.push(
          setTimeout(
            () =>
              controller.abort(new DOMException("deadline", "TimeoutError")),
            ms,
          ),
        );
        return controller.signal;
      });
    const fixture = contentsFixture();
    Object.setPrototypeOf(fixture.reader, WalletAssetReader.prototype);
    const fast = fixture.ownedObjects.getMockImplementation()!;
    fixture.ownedObjects.mockImplementation(async (...args: any[]) => {
      const signal: AbortSignal = args[1].signal;
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort);
          resolve();
        }, delay);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      });
      return fast();
    });
    const caller = new AbortController();
    const outcome = fixture.reader.kiosks(address, caller.signal).then(
      (value) => ({ value, error: undefined }),
      (error) => ({ value: undefined, error }),
    );
    if (cancelAt !== undefined)
      timers.push(
        setTimeout(
          () => caller.abort(new DOMException("caller", "AbortError")),
          cancelAt,
        ),
      );
    try {
      await vi.advanceTimersByTimeAsync(
        cancelAt ?? Math.min(delay + 1, 60_000),
      );
      return { outcome: await outcome, fixture };
    } finally {
      for (const timer of timers) clearTimeout(timer);
      timeout.mockRestore();
      vi.useRealTimers();
    }
  }
  it("21 秒完整 owner 列表后仍完成登记项校验并返回完整 Kiosk", async () => {
    const { outcome, fixture } = await slowCollection(21_000);
    expect(outcome.error).toBeUndefined();
    expect(outcome.value!.value[0].items[0].objectId).toBe(fixture.itemId);
    expect(fixture.revalidate).toHaveBeenCalledTimes(3);
  });
  it("60 秒总期限拒绝迟到的列表，不发布部分结果", async () => {
    const { outcome, fixture } = await slowCollection(65_000);
    expect(outcome.value).toBeUndefined();
    expect(outcome.error.name).toBe("TimeoutError");
    expect(fixture.objects).not.toHaveBeenCalled();
    expect(fixture.revalidate).not.toHaveBeenCalled();
  });
  it("等待中调用方取消立即拒绝，不读取后续 Kiosk 对象", async () => {
    const { outcome, fixture } = await slowCollection(21_000, 1_000);
    expect(outcome.value).toBeUndefined();
    expect(outcome.error.name).toBe("AbortError");
    expect(fixture.objects).not.toHaveBeenCalled();
    expect(fixture.revalidate).not.toHaveBeenCalled();
  });
});
