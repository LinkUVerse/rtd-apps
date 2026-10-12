// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress,
  toBase64,
} from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";

import { connection, snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import { decodeDynamicField, dynamicType } from "./dynamic-fields";

const parent = normalizeRtdAddress("0xa");
const key = bcs.u64().serialize(42).toBytes();
function fieldNode(object = false) {
  return {
    address: deriveDynamicFieldID(
      parent,
      object ? "0x2::dynamic_object_field::Wrapper<u64>" : "u64",
      key,
    ),
    name: { type: { repr: "u64" }, bcs: toBase64(key) },
    value: object
      ? {
          __typename: "MoveObject",
          address: "0xb",
          contents: { type: { repr: "0x2::test::Object" }, bcs: bcs.Address.serialize(normalizeRtdAddress("0xb")).toBase64() },
        }
      : {
          __typename: "MoveValue",
          type: { repr: "vector<u8>" },
          bcs: toBase64(bcs.vector(bcs.u8()).serialize([1, 2]).toBytes()),
        },
  };
}

describe("原生动态字段（SDK 与 Sui 固定 SDL）", () => {
  it("完整多页保留 name BCS，字段包装 ID 与子对象 ID 明确区分", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.parent,
          dynamicFields:
            request.variables.cursor === null
              ? connection([fieldNode()], "next", true)
              : connection([fieldNode(true)]),
        },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    const result = await reader.dynamicFields(parent);
    expect(result.value).toHaveLength(2);
    expect(result.value[0]).toMatchObject({
      $kind: "DynamicField",
      valueType: "vector<u8>",
    });
    expect(result.value[0]).not.toHaveProperty("childId");
    expect(result.value[1]).toMatchObject({
      $kind: "DynamicObject",
      childId: normalizeRtdAddress("0xb"),
    });
    expect(result.value[1].fieldId).not.toBe(result.value[1].childId);
    expect([...result.value[1].name.bcs]).toEqual([...key]);
    expect(fixture.requests.at(-1)?.query).toContain(
      "WalletSnapshotRevalidate",
    );
  });

  it.each(["short-content", "wrong-child-uid"])("动态对象%s拒绝，不能只相信返回的address", failure => {
    const node = fieldNode(true);
    const value = node.value as {contents:{bcs:string}};
    value.contents.bcs = failure === "short-content" ? "AQID" : bcs.Address.serialize(normalizeRtdAddress("0xc")).toBase64();
    expect(() => decodeDynamicField(parent,node)).toThrow();
  });

  it.each(["DynamicField", "DynamicObject"] as const)(
    "点查 %s 使用独立原生选择器并核验 name/kind",
    async (kind) => {
      const fixture = snapshotFixture({
        read: () => ({
          address: {
            address: parent,
            field: fieldNode(kind === "DynamicObject"),
          },
        }),
      });
      const reader = await WalletAssetReader.open(fixture.session, {
        fetch: fixture.fetch,
      });
      const result = await reader.dynamicField(
        parent,
        { type: "u64", bcs: key },
        kind,
      );
      expect(result.value?.$kind).toBe(kind);
      expect(
        fixture.requests.find((request) =>
          request.query.includes("WalletSnapshotRead"),
        )?.query,
      ).toContain(
        kind === "DynamicObject"
          ? "dynamicObjectField(name:"
          : "dynamicField(name:",
      );
    },
  );

  it("点查只有明确 null 是不存在，缺 field 必须失败", async () => {
    let absent = true;
    const fixture = snapshotFixture({
      read: () => ({
        address: { address: parent, ...(absent ? { field: null } : {}) },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    expect(
      (
        await reader.dynamicField(
          parent,
          { type: "u64", bcs: key },
          "DynamicField",
        )
      ).value,
    ).toBeNull();
    absent = false;
    await expect(
      reader.dynamicField(parent, { type: "u64", bcs: key }, "DynamicField"),
    ).rejects.toThrow();
  });

  it.each([
    "wrong-field-id",
    "missing-value",
    "missing-bcs",
    "wrong-kind",
    "wrong-name",
    "duplicate",
    "stalled",
    "partial",
  ])("%s 拒绝，不能变成空集合", async (failure) => {
    const node: any = fieldNode();
    if (failure === "wrong-field-id") node.address = "0xf";
    if (failure === "missing-value") node.value = null;
    if (failure === "missing-bcs") delete node.value.bcs;
    if (failure === "wrong-kind") node.value.__typename = "Unknown";
    if (failure === "wrong-name") node.name.type.repr = "u8";
    const fixture = snapshotFixture({
      read: () => ({
        address: {
          address: parent,
          dynamicFields: connection(
            [node],
            "same",
            failure === "duplicate" || failure === "stalled",
          ),
        },
      }),
      alter: (response, request) =>
        failure === "partial" && request.query.includes("WalletSnapshotRead")
          ? { ...response, errors: [{ message: "partial" }] }
          : response,
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    await expect(reader.dynamicFields(parent)).rejects.toThrow();
  });

  it("动态对象不能被同名普通字段点查结果冒充", async () => {
    const fixture = snapshotFixture({
      read: () => ({ address: { address: parent, field: fieldNode() } }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    await expect(
      reader.dynamicField(parent, { type: "u64", bcs: key }, "DynamicObject"),
    ).rejects.toThrow();
  });

  it.each(["u64", "vector<vector<u8>>", "0x2::kiosk::Item"])(
    "接受真实 Move 类型 %s",
    (type) => {
      expect(dynamicType(type)).toBeTruthy();
    },
  );
  it.each([
    "0x2::kiosk::Item garbage",
    "@kiosk::Item",
    "0x2::bad-module::Item",
    "",
    "vector<u8>>",
  ])("拒绝损坏类型 %s", (type) => {
    expect(() => dynamicType(type)).toThrow();
  });

  it("name/value 都要求规范 base64，不以空 BCS补齐缺字段", () => {
    const node: any = fieldNode();
    node.name.bcs = "Zg";
    expect(() => decodeDynamicField(parent, node)).toThrow();
  });
});
