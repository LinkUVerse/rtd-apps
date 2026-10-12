// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeRtdAddress, normalizeStructTag } from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";

import {
  balanceNode,
  connection,
  objectNode,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import { SnapshotReadError } from "./graphql-snapshot";

describe("资产领域读取（真实 SDK Fetch + 本地 SDL）", () => {
  it("多页余额保持大整数，coin/address 组成精确校验，只在终页复验后交付", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances:
            request.variables.cursor === null
              ? connection([balanceNode()], "next", true)
              : connection([balanceNode("0x9::coin::TOKEN")]),
        },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    const result = await reader.balances("0xb");
    expect(result.value).toHaveLength(2);
    expect(result.value[0].balance).toBe("900719925474099312345");
    expect(result.value[0].coinBalance).toBe("900719925474099312000");
    expect(result.value[0].addressBalance).toBe("345");
    expect(fixture.requests.at(-1)?.query).toContain(
      "WalletSnapshotRevalidate",
    );
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(result.snapshot.checkpoint).toBe("10");
  });

  it.each([
    "duplicate",
    "stalled",
    "missing-amount",
    "inexact-number",
    "bad-sum",
    "wrong-owner",
    "partial",
  ])("余额 %s 不返回部分列表/零值", async (failure) => {
    const fixture = snapshotFixture({
      read: (request) => {
        const balance = balanceNode();
        if (failure === "missing-amount")
          delete (balance as Partial<typeof balance>).addressBalance;
        if (failure === "inexact-number")
          (balance as any).totalBalance = 9007199254740992;
        if (failure === "bad-sum") balance.totalBalance = "0";
        return {
          address: {
            address:
              failure === "wrong-owner" ? "0xf" : request.variables.owner,
            balances: connection(
              [balance],
              "same",
              failure === "duplicate" || failure === "stalled",
            ),
          },
        };
      },
      alter: (response, request) =>
        failure === "partial" && request.query.includes("WalletSnapshotRead")
          ? { ...response, errors: [{ message: "not complete" }] }
          : response,
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    await expect(reader.balances("0xb")).rejects.toThrow();
    expect(fixture.requests.at(-1)?.query).not.toContain(
      "WalletSnapshotRevalidate",
    );
  });

  it("明确空余额集合有效，缺 address 或 connection 不能冒充空集合", async () => {
    const empty = snapshotFixture({
      read: (request) => ({
        address: { address: request.variables.owner, balances: connection([]) },
      }),
    });
    const reader = await WalletAssetReader.open(empty.session, {
      fetch: empty.fetch,
    });
    expect((await reader.balances("0xb")).value).toEqual([]);
    const missing = snapshotFixture({ read: () => ({ address: null }) });
    await expect(
      (
        await WalletAssetReader.open(missing.session, { fetch: missing.fetch })
      ).balances("0xb"),
    ).rejects.toBeInstanceOf(SnapshotReadError);
  });

  it("元数据只有明确 null 算不存在，decimals=0 和空描述有效", async () => {
    let absent = true;
    const fixture = snapshotFixture({
      read: () => ({
        coinMetadata: absent
          ? null
          : {
              address: "0xc",
              decimals: 0,
              name: "Coin",
              symbol: "C",
              description: "",
              iconUrl: null,
            },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    expect((await reader.coinMetadata("0x2::rtd::RTD")).value).toBeNull();
    absent = false;
    expect((await reader.coinMetadata("0x2::rtd::RTD")).value).toMatchObject({
      decimals: 0,
      description: "",
    });
  });

  it.each([{}, { coinMetadata: { address: "0xc", decimals: 9 } }])(
    "缺元数据字段拒绝，不转换为不存在",
    async (read) => {
      const fixture = snapshotFixture({ read: () => read });
      const reader = await WalletAssetReader.open(fixture.session, {
        fetch: fixture.fetch,
      });
      await expect(reader.coinMetadata("0x2::rtd::RTD")).rejects.toBeInstanceOf(
        SnapshotReadError,
      );
    },
  );

  it("拥有对象保留新 owner、Move content BCS 和结构化 Display v2", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          objects: connection([objectNode("0xa", "0xb")]),
        },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    const result = await reader.ownedObjects("0xb");
    expect(result.value[0].owner).toEqual({
      $kind: "AddressOwner",
      AddressOwner: normalizeRtdAddress("0xb"),
    });
    expect([...result.value[0].content]).toEqual([1, 2, 3]);
    expect(result.value[0].display?.output?.attributes).toEqual({ rarity: 1 });
    expect(result.value[0]).not.toHaveProperty("data");
  });

  it("拥有对象小页读取仍收集完整集合，默认50并在同快照终页后复验", async () => {
    const fixture = snapshotFixture({ read: (request) => ({ address: {
      address: request.variables.owner,
      objects: request.variables.cursor === null
        ? connection([objectNode("0xa", "0xb")], "second", true)
        : connection([objectNode("0xc", "0xb")]),
    } }) });
    const reader = await WalletAssetReader.open(fixture.session, { fetch: fixture.fetch });
    const result = await reader.ownedObjects("0xb", { pageSize: 1 });
    expect(result.value.map(object => object.objectId)).toEqual([normalizeRtdAddress("0xa"), normalizeRtdAddress("0xc")]);
    const pages = fixture.requests.filter(request => request.query.includes("objects(first:"));
    expect(pages.map(page => page.variables.pageSize)).toEqual([1, 1]);
    expect(pages.map(page => page.variables.cursor)).toEqual([null, "second"]);
    expect(fixture.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
    await reader.ownedObjects("0xb");
    expect(fixture.requests.filter(request => request.query.includes("objects(first:")).slice(-2).map(page => page.variables.pageSize)).toEqual([50, 50]);
  });

  it.each([0, -1, 51, 1.5, NaN, Infinity])("拥有对象非法页大小%s在网络请求前拒绝", async pageSize => {
    const fixture = snapshotFixture();
    const reader = await WalletAssetReader.open(fixture.session, { fetch: fixture.fetch });
    const before = fixture.requests.length;
    await expect(reader.ownedObjects("0xb", { pageSize })).rejects.toBeInstanceOf(RangeError);
    expect(fixture.requests).toHaveLength(before);
  });

  it.each(["wrong-owner", "wrong-type", "missing-bcs", "bad-version"])(
    "拥有对象 %s 拒绝",
    async (failure) => {
      const node = objectNode("0xa", failure === "wrong-owner" ? "0xf" : "0xb");
      if (failure === "missing-bcs")
        delete (node.contents as Partial<typeof node.contents>).bcs;
      if (failure === "bad-version") node.version = Number.MAX_SAFE_INTEGER + 1;
      const fixture = snapshotFixture({
        read: (request) => ({
          address: {
            address: request.variables.owner,
            objects: connection([node]),
          },
        }),
      });
      const reader = await WalletAssetReader.open(fixture.session, {
        fetch: fixture.fetch,
      });
      await expect(
        reader.ownedObjects(
          "0xb",
          failure === "wrong-type" ? { type: "0x3::example::NFT" } : {},
        ),
      ).rejects.toBeInstanceOf(SnapshotReadError);
    },
  );

  it("展示 coin 对象余额严格 u64，发送选币接口不经此 reader", async () => {
    const node = objectNode("0xa", "0xb", "0x2::coin::Coin<0x2::rtd::RTD>");
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          objects: connection([node]),
        },
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    expect(
      (await reader.coinObjects("0xb", "0x2::rtd::RTD")).value[0].balance,
    ).toBe("123");
    node.contents.json.balance = "18446744073709551616";
    await expect(
      reader.coinObjects("0xb", "0x2::rtd::RTD"),
    ).rejects.toBeInstanceOf(SnapshotReadError);
  });

  it("批量对象保持 missing Error 位置，重复请求 ID 仍各占一项", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        multiGetObjects: (request.variables.keys as { address: string }[]).map(
          ({ address }) =>
            address === normalizeRtdAddress("0xc")
              ? null
              : { address, asMoveObject: objectNode(address) },
        ),
      }),
    });
    const reader = await WalletAssetReader.open(fixture.session, {
      fetch: fixture.fetch,
    });
    const result = await reader.objects(["0xa", "0xc", "0xa"]);
    expect(result.value).toHaveLength(3);
    expect(result.value[1]).toMatchObject({
      reason: "notFound",
      objectId: normalizeRtdAddress("0xc"),
    });
    expect(result.value[0]).toMatchObject({
      objectId: normalizeRtdAddress("0xa"),
      type: normalizeStructTag("0x2::example::NFT"),
    });
    expect(result.value[2]).toMatchObject({
      objectId: normalizeRtdAddress("0xa"),
    });
  });

  it.each(["missing-slot", "wrong-id", "missing-content"])(
    "批量 %s 拒绝整批，不过滤错位",
    async (failure) => {
      const fixture = snapshotFixture({
        read: () => ({
          multiGetObjects:
            failure === "missing-slot"
              ? []
              : [
                  {
                    address: failure === "wrong-id" ? "0xf" : "0xa",
                    asMoveObject:
                      failure === "missing-content" ? null : objectNode(),
                  },
                ],
        }),
      });
      const reader = await WalletAssetReader.open(fixture.session, {
        fetch: fixture.fetch,
      });
      await expect(reader.objects(["0xa"])).rejects.toBeInstanceOf(
        SnapshotReadError,
      );
    },
  );

  it("跨批次保持重复与缺失槽位，完整请求不超过默认5000字节", async () => {
    const fixture = snapshotFixture({
      read: request => ({ multiGetObjects: (request.variables.keys as { address: string }[]).map(({ address }) =>
        address === normalizeRtdAddress('0xc') ? null : { address, asMoveObject: objectNode(address) }) }),
    });
    const reader = await WalletAssetReader.open(fixture.session, { fetch: fixture.fetch });
    const ids = Array.from({ length: 43 }, (_, i) => i === 1 || i === 40 ? '0xc' : '0xa');
    const result = await reader.objects(ids);
    expect(result.value).toHaveLength(43);
    result.value.forEach((item, i) => expect(item).toMatchObject(i === 1 || i === 40
      ? { reason: 'notFound', objectId: normalizeRtdAddress('0xc') }
      : { objectId: normalizeRtdAddress('0xa') }));
    const batches = fixture.requests.filter(request => request.variables.keys);
    expect(batches.length).toBeGreaterThan(1);
    for (const request of batches) expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(5000);
  });
});
