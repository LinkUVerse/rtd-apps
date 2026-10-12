// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";

import {
  connection,
  objectNode,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import {
  KIOSK_BCS,
  KIOSK_CAP_BCS,
  KIOSK_ITEM_BCS,
  KIOSK_LISTING_BCS,
  KIOSK_LOCK_BCS,
  PERSONAL_CAP_BCS,
  readNativeKiosks,
} from "./kiosk-reader";

const address = normalizeRtdAddress("0xb");
const capId = normalizeRtdAddress("0xa");
const kioskId = normalizeRtdAddress("0xc");
const itemId = normalizeRtdAddress("0xd");
const itemFieldId = deriveDynamicFieldID(
  kioskId,
  "0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>",
  KIOSK_ITEM_BCS.serialize({ id: itemId }).toBytes(),
);

function kioskFixture(failure?: string, personal = false) {
  const cap: any = objectNode(capId, address);
  cap.contents.type.repr = personal
    ? "0x3::personal_kiosk::PersonalKioskCap"
    : "0x2::kiosk::KioskOwnerCap";
  cap.contents.display.basis.objectType = normalizeStructTag(cap.contents.type.repr);
  const embedded = { id: capId, for: kioskId };
  const capBytes = personal
    ? PERSONAL_CAP_BCS.serialize({
        id: capId,
        cap: failure === "borrowed-personal-cap" ? null : embedded,
      }).toBytes()
    : KIOSK_CAP_BCS.serialize({
        ...embedded,
        id: failure === "wrong-cap-uid" ? "0xf" : capId,
      }).toBytes();
  cap.contents.bcs = toBase64(
    failure === "trailing-cap-bcs"
      ? Uint8Array.from([...capBytes, 0])
      : capBytes,
  );
  const kiosk: any = objectNode(kioskId);
  kiosk.contents.type.repr =
    failure === "wrong-kiosk-type" ? "0x2::other::Other" : "0x2::kiosk::Kiosk";
  kiosk.contents.display.basis.objectType = normalizeStructTag(kiosk.contents.type.repr);
  kiosk.owner = { __typename: "Shared", initialSharedVersion: 1 };
  kiosk.contents.bcs = toBase64(
    KIOSK_BCS.serialize({
      id: kioskId,
      profits: { value: "9007199254740993" },
      owner: address,
      item_count: failure === "wrong-item-count" ? 2 : 1,
      allow_extensions: false,
    }).toBytes(),
  );
  const item: any = objectNode(itemId);
  item.contents.bcs = toBase64(bcs.Address.serialize(itemId).toBytes());
  item.owner = {
    __typename: "ObjectOwner",
    address: {
      address: failure === "wrong-child-owner" ? kioskId : itemFieldId,
    },
  };
  const itemName = KIOSK_ITEM_BCS.serialize({ id: itemId }).toBytes();
  const listingName = KIOSK_LISTING_BCS.serialize({
    id: failure === "orphan-listing" ? "0xf" : itemId,
    is_exclusive: true,
  }).toBytes();
  const lockName = KIOSK_LOCK_BCS.serialize({ id: itemId }).toBytes();
  const fields: any[] = [
    {
      address: itemFieldId,
      name: { type: { repr: "0x2::kiosk::Item" }, bcs: toBase64(itemName) },
      value: {
        __typename: "MoveObject",
        address: failure === "wrong-child-id" ? "0xf" : itemId,
        contents: {
          bcs:
            failure === "inconsistent-child-content"
              ? "AA=="
              : item.contents.bcs,
          type: { repr: item.contents.type.repr },
        },
      },
    },
    {
      address: deriveDynamicFieldID(
        kioskId,
        "0x2::kiosk::Listing",
        listingName,
      ),
      name: {
        type: { repr: "0x2::kiosk::Listing" },
        bcs: toBase64(listingName),
      },
      value: {
        __typename: "MoveValue",
        type: { repr: "u64" },
        bcs: toBase64(bcs.u64().serialize("9007199254740993").toBytes()),
      },
    },
    {
      address: deriveDynamicFieldID(kioskId, "0x2::kiosk::Lock", lockName),
      name: { type: { repr: "0x2::kiosk::Lock" }, bcs: toBase64(lockName) },
      value: {
        __typename: "MoveValue",
        type: { repr: "bool" },
        bcs: toBase64(
          bcs
            .bool()
            .serialize(failure !== "invalid-lock-value")
            .toBytes(),
        ),
      },
    },
  ];
  if (failure === "duplicate-field") fields.push(fields[0]);
  return snapshotFixture({
    read: (request) => {
      if (request.query.includes("objects(first:"))
        return {
          address: {
            address,
            objects:
              request.variables.cursor === null
                ? connection([], "scan", true)
                : connection(
                    failure === "duplicate-cap"
                      ? [
                          cap,
                          {
                            ...cap,
                            address: "0xf",
                            contents: {
                              ...cap.contents,
                              bcs: toBase64(
                                KIOSK_CAP_BCS.serialize({
                                  id: "0xf",
                                  for: kioskId,
                                }).toBytes(),
                              ),
                            },
                          },
                        ]
                      : [cap],
                  ),
          },
        };
      if (request.query.includes("dynamicFields(first:"))
        return {
          address: {
            address: kioskId,
            dynamicFields:
              request.variables.cursor === null
                ? connection(fields.slice(0, 1), "rest", true)
                : connection(fields.slice(1)),
          },
        };
      return {
        multiGetObjects: (request.variables.keys as { address: string }[]).map(
          ({ address }) => {
            if (address === itemId && failure === "missing-item") return null;
            return {
              address,
              asMoveObject: address === kioskId ? kiosk : item,
            };
          },
        ),
      };
    },
    alter: (response, request) =>
      failure === "partial" && request.query.includes("dynamicFields(first:")
        ? { ...response, errors: [{ message: "partial" }] }
        : response,
  });
}

describe("framework / PersonalKiosk 原生同 S 领域读取", () => {
  it.each([false, true])(
    "全分页 caps/items，BCS cap %s 与价款保留整数，子对象归属 wrapper Field",
    async (personal) => {
      const fixture = kioskFixture(undefined, personal);
      const reader = await WalletAssetReader.open(fixture.session, {
        fetch: fixture.fetch,
      });
      const result = await readNativeKiosks(reader, address);
      expect(result.snapshot.cacheKey).toBe(reader.proof.cacheKey);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].profits).toBe("9007199254740993");
      expect(result.value[0].ownerCap).toMatchObject({
        objectId: capId,
        kioskId,
        isPersonal: personal,
      });
      expect(result.value[0].items[0]).toMatchObject({
        objectId: itemId,
        kioskId,
        isLocked: true,
        owner: { $kind: "ObjectOwner", ObjectOwner: itemFieldId },
        listing: { isExclusive: true, price: "9007199254740993" },
      });
      expect(result.value[0].items[0]).not.toHaveProperty("data");
      expect(Object.isFrozen(result.value[0].items)).toBe(true);
      expect(fixture.requests.at(-1)?.query).toContain(
        "WalletSnapshotRevalidate",
      );
    },
  );

  it.each([
    "wrong-cap-uid",
    "trailing-cap-bcs",
    "duplicate-cap",
    "wrong-kiosk-type",
    "wrong-item-count",
    "wrong-child-owner",
    "orphan-listing",
    "wrong-child-id",
    "inconsistent-child-content",
    "invalid-lock-value",
    "duplicate-field",
    "missing-item",
    "partial",
  ])("%s 必须报错，不能过滤成完整或空 kiosk", async (failure) => {
    const fixture = kioskFixture(failure);
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    await expect(readNativeKiosks(reader, address)).rejects.toThrow();
  });

  it("PersonalKiosk cap 为 None 不推断拥有权或可转移", async () => {
    const fixture = kioskFixture("borrowed-personal-cap", true);
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    await expect(readNativeKiosks(reader, address)).rejects.toThrow();
  });
});
