// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes } from "rtd-typescript/grpc";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import { WalletFullnodeReader } from "./fullnode-reader";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession, StaleWalletSessionError } from "./session";

function frame(payload: Uint8Array, trailer = false) {
  const output = new Uint8Array(5 + payload.length);
  output[0] = trailer ? 128 : 0;
  new DataView(output.buffer).setUint32(1, payload.length, false);
  output.set(payload, 5);
  return output;
}
function response(payload: Uint8Array, status = 0) {
  const message = frame(payload);
  const trailer = frame(
    new TextEncoder().encode(`grpc-status: ${status}\r\n`),
    true,
  );
  const output = new Uint8Array(message.length + trailer.length);
  output.set(message);
  output.set(trailer, message.length);
  return new Response(output, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
const type = normalizeStructTag("0x2::coin::Coin<0x2::rtd::RTD>");
const owner = normalizeRtdAddress("0xb");
function coin(overrides: Partial<GrpcTypes.Object> = {}): GrpcTypes.Object {
  return {
    objectId: "0xc",
    version: 11n,
    digest: toBase58(new Uint8Array(32).fill(9)),
    owner: { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: owner },
    objectType: type,
    balance: 9_007_199_254_740_993n,
    ...overrides,
  };
}
function fixture(
  options: {
    pages?: GrpcTypes.ListOwnedObjectsResponse[];
    status?: number;
    identity?: (call: number) => Partial<GrpcTypes.GetServiceInfoResponse>;
    maxPages?: number;
    maxCoins?: number;
  } = {},
) {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  let page = 0,
    info = 0;
  const requests: GrpcTypes.ListOwnedObjectsRequest[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    if (String(url).endsWith("/GetServiceInfo")) {
      return response(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: 20n,
          ...options.identity?.(++info),
        }),
      );
    }
    expect(String(url)).toContain("/rtd.rpc.v2.StateService/ListOwnedObjects");
    const body = init!.body as Uint8Array;
    const request = GrpcTypes.ListOwnedObjectsRequest.fromBinary(
      body.subarray(5),
    );
    requests.push(request);
    return response(
      GrpcTypes.ListOwnedObjectsResponse.toBinary(
        options.pages?.[page++] ?? { objects: [coin()] },
      ),
      options.status,
    );
  });
  return {
    session,
    fetch,
    requests,
    reader: new WalletFullnodeReader(session, {
      fetch,
      maxPages: options.maxPages,
      maxCoins: options.maxCoins,
    }),
  };
}

describe("发送 coin 的实际 Fullnode gRPC-Web 读取", () => {
  it("并发扫描共享相同分页而不省略下一页或读后校验", async () => {
    const f = fixture({ pages: [
      { objects: [coin()], nextPageToken: new Uint8Array([1]) },
      { objects: [coin({ objectId: '0xd' })] },
    ] });
    const [a, b] = await Promise.all([
      f.reader.coins(owner, '0x2::rtd::RTD'),
      f.reader.coins(owner, '0x2::rtd::RTD'),
    ]);
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(f.requests.map(r => r.pageToken)).toEqual([undefined, new Uint8Array([1])]);
    expect(f.fetch).toHaveBeenCalledTimes(4);
  });
  it("按原生类型查询全部分页，空扫描页继续，保留 u64 精度和全部引用字段", async () => {
    const f = fixture({
      pages: [
        { objects: [coin()], nextPageToken: new Uint8Array([1]) },
        { objects: [], nextPageToken: new Uint8Array([2]) },
        { objects: [coin({ objectId: "0xd", balance: 0n })] },
      ],
    });
    const result = await f.reader.coins("0xb", "0x2::rtd::RTD");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      objectId: normalizeRtdAddress("0xc"),
      balance: "9007199254740993",
      version: "11",
      type,
    });
    expect(result[0]).not.toHaveProperty("coinObjectId");
    expect(result[1].balance).toBe("0");
    expect(Object.isFrozen(result)).toBe(true);
    expect(f.fetch).toHaveBeenCalledTimes(5);
    expect(f.requests.map((r) => r.pageToken)).toEqual([
      undefined,
      new Uint8Array([1]),
      new Uint8Array([2]),
    ]);
    for (const request of f.requests)
      expect(request).toMatchObject({
        owner,
        objectType: type,
        pageSize: 100,
        readMask: {
          paths: [
            "object_id",
            "version",
            "digest",
            "owner",
            "object_type",
            "balance",
          ],
        },
      });
  });
  it("真正的空终页可以返回空集合，但仍校验终页身份", async () => {
    const f = fixture({ pages: [{ objects: [] }] });
    expect(await f.reader.coins(owner, "0x2::rtd::RTD")).toEqual([]);
    expect(f.fetch).toHaveBeenCalledTimes(3);
  });
  it.each([
    { version: undefined },
    { digest: undefined },
    { digest: "short" },
    { balance: undefined },
    { objectType: undefined },
    { objectType: "0x2::coin::Coin<0x2::other::OTHER>" },
    { owner: undefined },
    { owner: { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: "0xa" } },
    { owner: { kind: GrpcTypes.Owner_OwnerKind.OBJECT, address: owner } },
    { objectId: undefined },
  ] satisfies Partial<GrpcTypes.Object>[])(
    "缺字段、错类型或错 owner 拒绝整个结果 %j",
    async (overrides) => {
      const f = fixture({ pages: [{ objects: [coin(overrides)] }] });
      await expect(
        f.reader.coins(owner, "0x2::rtd::RTD"),
      ).rejects.toBeInstanceOf(Error);
    },
  );
  it("ConsensusAddressOwner 保留 startVersion，不能伪装普通 owner", async () => {
    const f = fixture({
      pages: [
        {
          objects: [
            coin({
              owner: {
                kind: GrpcTypes.Owner_OwnerKind.CONSENSUS_ADDRESS,
                address: owner,
                version: 5n,
              },
            }),
          ],
        },
      ],
    });
    expect((await f.reader.coins(owner, "0x2::rtd::RTD"))[0].owner).toEqual({
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: { owner, startVersion: "5" },
    });
  });
  it.each([
    [
      { objects: [coin()], nextPageToken: new Uint8Array([1]) },
      { objects: [coin()] },
    ],
    [
      { objects: [], nextPageToken: new Uint8Array([1]) },
      { objects: [], nextPageToken: new Uint8Array([1]) },
    ],
    [{ objects: [], nextPageToken: new Uint8Array() }],
  ])("重复对象或 cursor 无进展时不交付已收集页面", async (...pages) => {
    const f = fixture({ pages });
    await expect(f.reader.coins(owner, "0x2::rtd::RTD")).rejects.toMatchObject({
      reason: "pagination",
    });
  });
  it.each([
    {
      maxPages: 1,
      pages: [{ objects: [coin()], nextPageToken: new Uint8Array([1]) }],
    },
    { maxCoins: 1, pages: [{ objects: [coin(), coin({ objectId: "0xd" })] }] },
  ])("页面和对象数均有预算，预算不足不能静默截断", async (options) => {
    const f = fixture(options);
    await expect(f.reader.coins(owner, "0x2::rtd::RTD")).rejects.toMatchObject({
      reason: "budget",
    });
  });
  it.each([1, 2])(
    "扫描前或终页换链均拒绝（第 %i 次身份响应）",
    async (call) => {
      const f = fixture({
        identity: (n) =>
          n === call ? { chainId: toBase58(new Uint8Array(32).fill(2)) } : {},
      });
      await expect(
        f.reader.coins(owner, "0x2::rtd::RTD"),
      ).rejects.toMatchObject({ role: "fullnode", reason: "chain-mismatch" });
    },
  );
  it.each([
    () => ({ checkpointHeight: undefined }),
    () => ({ lowestAvailableCheckpoint: 21n }),
    (n: number) => ({ checkpointHeight: n === 1 ? 20n : 19n }),
  ])("身份缺水位、保留区间错误或扫描过程中退高拒绝", async (identity) => {
    const f = fixture({ identity });
    await expect(f.reader.coins(owner, "0x2::rtd::RTD")).rejects.toMatchObject({
      reason: "incompatible",
    });
  });
  it("HTTP 200 的失败 gRPC trailer 不能成为空成功", async () => {
    const f = fixture({ status: 14 });
    await expect(f.reader.coins(owner, "0x2::rtd::RTD")).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
  it("关闭会话后不接纳忽略取消的迟到响应", async () => {
    const f = fixture();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reader = new WalletFullnodeReader(f.session, {
      fetch: async (...args) => {
        await hold;
        return f.fetch(...args);
      },
    });
    const pending = reader.coins(owner, "0x2::rtd::RTD");
    f.session.close();
    release();
    await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
  });
  it("调用方取消不接纳结果，不再请求后续分页", async () => {
    const f = fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      f.reader.coins(owner, "0x2::rtd::RTD", controller.signal),
    ).rejects.toBeInstanceOf(Error);
    expect(f.fetch).not.toHaveBeenCalled();
  });
});

describe("zkLogin 当前 epoch 原生 Fullnode 读取", () => {
  it("H0 和 epoch 来自同一 GetServiceInfo，每次新读并保留 epoch+2 精度", async () => {
    const f = fixture({ identity: (call) => ({ epoch: BigInt(call + 7) }) });
    expect(await f.reader.currentEpoch()).toBe(8);
    expect(await f.reader.currentEpoch()).toBe(9);
    expect(f.requests).toHaveLength(0);
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, 9_007_199_254_740_990n, 0xffffffffffffffffn])(
    "拒绝缺少或不能安全转换为 maxEpoch 的 epoch %s",
    async (epoch) => {
      const f = fixture({ identity: () => ({ epoch }) });
      await expect(f.reader.currentEpoch()).rejects.toThrow();
    },
  );
  it("拒绝不同 H0 的有效 epoch", async () => {
    const f = fixture({
      identity: () => ({
        epoch: 1n,
        chainId: toBase58(new Uint8Array(32).fill(99)),
      }),
    });
    await expect(f.reader.currentEpoch()).rejects.toMatchObject({
      reason: "chain-mismatch",
    });
  });
  it("读取后会话失效仍拒绝返回", async () => {
    const f = fixture({
      identity: () => {
        f.session.close();
        return { epoch: 1n };
      },
    });
    await expect(f.reader.currentEpoch()).rejects.toBeInstanceOf(
      StaleWalletSessionError,
    );
  });
  it("调用前取消不发网络请求", async () => {
    const f = fixture({ identity: () => ({ epoch: 1n }) });
    const abort = new AbortController();
    abort.abort();
    await expect(f.reader.currentEpoch(abort.signal)).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
  });
});
