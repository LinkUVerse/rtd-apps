// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { buildSchema, graphql, GraphQLError } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RtdGrpcClient, GrpcTypes } from "rtd-typescript/grpc";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { WalletBalanceReader } from "./balance-reader";
import { WalletCoinMetadataReader } from "./coin-metadata-reader";
import { ReadRequestQueue } from "./read-request-queue";
import { queuedServiceInfo } from "./service-info-queue";
import {
  combineSnapshotQueries,
  partitionSnapshotQueries,
  createSnapshotQuerySend,
} from "./snapshot-query-queue";
import { GraphQLSnapshot } from "./graphql-snapshot";
import { snapshotDigest } from "../../../tests/unit/rpc/fixtures";
import { WalletReadAdmission } from "./read-admission";

afterEach(() => vi.unstubAllGlobals());
const schema = buildSchema(`
 scalar RtdAddress
 type Query { checkpoint(sequenceNumber: Float): Checkpoint serviceConfig: Config }
 type Config { availableRange(type: String!, field: String!): Range }
 type Range { first: Checkpoint last: Checkpoint }
 type Checkpoint { sequenceNumber: Float digest: String query: Snapshot }
 type Snapshot { address(address: RtdAddress!): Address coinMetadata(coinType: String!): Metadata }
 type Address { address: RtdAddress balances(first: Int, after: String): Balances }
 type Balances { pageInfo: Page nodes: [Balance!]! }
 type Page { hasNextPage: Boolean! endCursor: String }
 type Balance { coinType: Type totalBalance: String coinBalance: String addressBalance: String }
 type Type { repr: String }
 type Metadata { address: RtdAddress decimals: Int name: String symbol: String description: String iconUrl: String }
`);
function fixture(
  options: {
    metadataFailure?: boolean;
    rootFailure?: boolean;
    rangeFailure?: boolean;
  } = {},
) {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const requests: { query: string; variables: Record<string, unknown> }[] = [];
  const rootValue = {
    checkpoint: ({ sequenceNumber = 10 }: { sequenceNumber?: number }) => ({
      sequenceNumber,
      digest:
        sequenceNumber === 0
          ? session.profile.expectedGenesisDigest
          : snapshotDigest,
      query: {
        address: ({ address }: { address: string }) => ({
          address,
          balances: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        }),
        coinMetadata: () => {
          if (options.metadataFailure)
            throw new GraphQLError("metadata unavailable");
          return {
            address: "0xa",
            decimals: 9,
            name: "Rtd",
            symbol: "RTD",
            description: "",
            iconUrl: null,
          };
        },
      },
    }),
    serviceConfig: {
      availableRange: ({ field }: { field: string }) => ({
        first: {
          sequenceNumber:
            options.rangeFailure && field === "coinMetadata" ? 11 : 0,
        },
        last: { sequenceNumber: 10 },
      }),
    },
  };
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    const input = JSON.parse(String(init?.body));
    requests.push(input);
    if (options.rootFailure && input.query.includes("WalletSnapshotBatch"))
      return Response.json({
        errors: [{ message: "combined document unavailable" }],
      });
    return Response.json(
      await graphql({
        schema,
        source: input.query,
        variableValues: input.variables,
        rootValue,
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  return { session, requests, fetch };
}

describe("跨页面GraphQL复用仍保留独立领域证明", () => {
  it("一个批次传输失败不会污染其他分组或自动重试失败请求", async () => {
    const f = fixture();
    const inputs = Array.from({ length: 4 }, (_, i) => ({
      query:
        "query WalletSnapshotRead($v: String!) { checkpoint { query { coinMetadata(coinType: $v) { symbol } } } }",
      variables: { v: `${i}:${"x".repeat(1800)}` },
    }));
    const groups = partitionSnapshotQueries(inputs);
    expect(groups.map((group) => group.length)).toEqual([2, 2]);
    const failure = new Error("first partition transport unavailable");
    const query = vi.fn(async (input: any) => {
      if (
        Object.values(input.variables).some((value) =>
          String(value).startsWith("0:"),
        )
      )
        throw failure;
      return graphql({
        schema,
        source: input.query,
        variableValues: input.variables,
        rootValue: {
          checkpoint: { query: { coinMetadata: { symbol: "RTD" } } },
        },
      });
    });
    const send = createSnapshotQuerySend(
      f.session,
      { query } as any,
      f.fetch,
      10_000,
      false,
      "scope",
    );
    const replies = await Promise.allSettled(
      inputs.map((input) => send(input, new AbortController().signal)),
    );
    expect(replies.slice(0, 2)).toEqual([
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ]);
    for (const reply of replies.slice(2)) {
      expect(reply.status).toBe("fulfilled");
      if (reply.status === "fulfilled")
        expect(reply.value).toMatchObject({
          data: { checkpoint: { query: { coinMetadata: { symbol: "RTD" } } } },
        });
    }
    expect(query).toHaveBeenCalledTimes(2);
    f.session.close();
  });
  it("重型查询仅在同一快照实例中合并，完整独立结果和复验保持", async () => {
    const f = fixture();
    const snapshot = await GraphQLSnapshot.open(f.session, [
      { type: "MoveObject", field: "contents" },
    ]);
    f.requests.length = 0;
    const results = await Promise.all([
      snapshot.read({ selection: 'address(address: "0xb") { address }' }),
      snapshot.read({
        selection: 'coinMetadata(coinType: "0x2::rtd::RTD") { symbol }',
      }),
    ]);
    expect(results[0]).toHaveProperty("address");
    expect(results[1]).toHaveProperty("coinMetadata.symbol", "RTD");
    expect(f.requests).toHaveLength(1);
    await Promise.all([snapshot.revalidate(), snapshot.revalidate()]);
    expect(f.requests).toHaveLength(2);
    const other = await GraphQLSnapshot.open(f.session, [
      { type: "MoveObject", field: "contents" },
    ]);
    f.requests.length = 0;
    await Promise.all([
      snapshot.read({ selection: 'address(address: "0xb") { address }' }),
      other.read({
        selection: 'coinMetadata(coinType: "0x2::rtd::RTD") { symbol }',
      }),
    ]);
    expect(f.requests).toHaveLength(2);
    f.session.close();
  });
  it("大量可合并查询按真实字节分组，不限制总次数或丢弃请求", () => {
    const inputs = Array.from({ length: 70 }, (_, i) => ({
      query: "query Q($v: String!) { field(value: $v) }",
      variables: { v: `${i}:中文${"x".repeat(600)}` },
    }));
    const groups = partitionSnapshotQueries(inputs);
    expect(groups.flat()).toEqual(inputs);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.every((g) => g.length > 1)).toBe(true);
    for (const group of groups) {
      const { query, variables } = combineSnapshotQueries(group);
      expect(
        new TextEncoder().encode(JSON.stringify({ query, variables })).length,
      ).toBeLessThanOrEqual(5000);
    }
    const large = {
      query: "query Q($v: String!) { field(value: $v) }",
      variables: { v: "x".repeat(6000) },
    };
    expect(partitionSnapshotQueries([inputs[0], large, inputs[1]])).toEqual([
      [inputs[0]],
      [large],
      [inputs[1]],
    ]);
  });
  it("异步本地准入之后余额与元数据仍共享四次GraphQL读取", async () => {
    const f = fixture();
    // Native IndexedDB completes in separate tasks, unlike Promise.resolve mocks.
    const capture = vi.fn(
      () =>
        new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), 1),
        ),
    );
    const gate = new WalletReadAdmission(f.session, {
      capture,
      subscribe: () => () => {},
    });
    const [balances, metadata] = await Promise.all([
      gate.run("balances", () => WalletBalanceReader.read(f.session, "0xb")),
      gate.run("coinMetadata", () =>
        WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
      ),
    ]);
    expect(balances.value).toEqual([]);
    expect(metadata.value?.decimals).toBe(9);
    expect(f.requests).toHaveLength(4);
    // A new native capture after the business read is still mandatory.
    expect(capture.mock.calls.length).toBeGreaterThanOrEqual(2);
    f.session.close();
  });
  it("独立轮询任务与异步本地准入在每轮共享四次读取，后续轮次重新校验", async () => {
    const f = fixture();
    const capture = vi.fn(
      () =>
        new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), 1),
        ),
    );
    const gate = new WalletReadAdmission(f.session, {
      capture,
      subscribe: () => () => {},
    });
    const scheduled = <T>(read: () => Promise<T>) =>
      new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          void read().then(resolve, reject);
        }, 0);
      });
    for (let cycle = 1; cycle <= 3; cycle++) {
      const [balances, metadata] = await Promise.all([
        scheduled(() =>
          gate.run("balances", () =>
            WalletBalanceReader.read(f.session, "0xb"),
          ),
        ),
        scheduled(() =>
          gate.run("coinMetadata", () =>
            WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
          ),
        ),
      ]);
      expect(balances.value).toEqual([]);
      expect(metadata.value?.decimals).toBe(9);
      expect(f.requests).toHaveLength(4 * cycle);
      expect(capture).toHaveBeenCalledTimes(2 * cycle);
    }
    expect(
      f.requests.every((r) => r.query.includes("WalletSnapshotBatch")),
    ).toBe(true);
    f.session.close();
  });
  it("查询工厂保留跨事件任务的待发队列，直到实际派发", async () => {
    const f = fixture();
    const scheduled = <T>(read: () => Promise<T>) =>
      new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          void read().then(resolve, reject);
        }, 0);
      });
    await Promise.all([
      scheduled(() => WalletBalanceReader.read(f.session, "0xb")),
      scheduled(() =>
        WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
      ),
    ]);
    expect(f.requests).toHaveLength(4);
    f.session.close();
  });
  it("余额与元数据由8请求合成4请求，全部原reader校验照常通过", async () => {
    const f = fixture();
    const [balances, metadata] = await Promise.all([
      WalletBalanceReader.read(f.session, "0xb"),
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ]);
    expect(balances.value).toEqual([]);
    expect(metadata.value?.decimals).toBe(9);
    expect(f.requests).toHaveLength(4);
    expect(
      f.requests.every((r) => r.query.includes("WalletSnapshotBatch")),
    ).toBe(true);
    expect(balances.snapshot.dependencies).not.toEqual(
      metadata.snapshot.dependencies,
    );
    f.session.close();
  });
  it("元数据局部错误不阻止余额完整读取", async () => {
    const f = fixture({ metadataFailure: true });
    const results = await Promise.allSettled([
      WalletBalanceReader.read(f.session, "0xb"),
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    f.session.close();
  });
  it("元数据coverage不满足不阻止余额", async () => {
    const f = fixture({ rangeFailure: true });
    const results = await Promise.allSettled([
      WalletBalanceReader.read(f.session, "0xb"),
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: { reason: "coverage" },
    });
    f.session.close();
  });
  it("无法归属的批量错误只拆分一次，不丢弃独立余额成功", async () => {
    const f = fixture({ rootFailure: true, metadataFailure: true });
    const results = await Promise.allSettled([
      WalletBalanceReader.read(f.session, "0xb"),
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(f.requests.length).toBeLessThanOrEqual(10);
    f.session.close();
  });
  it("不跨session合并或复用已完成的结果", async () => {
    const f = fixture();
    const other = new WalletReadSession(f.session.profile);
    await Promise.all([
      WalletBalanceReader.read(f.session, "0xb"),
      WalletCoinMetadataReader.read(other, "0x2::rtd::RTD"),
    ]);
    expect(f.requests).toHaveLength(8);
    await WalletBalanceReader.read(f.session, "0xb");
    expect(f.requests).toHaveLength(12);
    f.session.close();
    other.close();
  });
  it("同时相同reader请求合并，调用方仍独立取消", async () => {
    const f = fixture();
    const cancelled = new AbortController();
    const first = WalletBalanceReader.read(f.session, "0xb", cancelled.signal);
    const rejected = expect(first).rejects.toBeDefined();
    const second = WalletBalanceReader.read(f.session, "0xb");
    cancelled.abort();
    await rejected;
    expect((await second).value).toEqual([]);
    expect(f.requests).toHaveLength(4);
    f.session.close();
  });
  it("变量与fragment命名空间隔离，拒绝mutation", () => {
    const input = {
      query:
        "query Test($id: String!) { a: lookup(id:$id) { ...Fields } } fragment Fields on Thing { id }",
      variables: { id: "a" },
    };
    const combined = combineSnapshotQueries([
      input,
      { ...input, variables: { id: "b" } },
    ]);
    expect(combined.variables).toEqual({ q0_id: "a", q1_id: "b" });
    expect(combined.query).toContain("fragment q0_Fields");
    expect(combined.query).toContain("fragment q1_Fields");
    expect(() =>
      combineSnapshotQueries([
        { query: "mutation { execute }", variables: {} },
      ]),
    ).toThrow();
  });
});

describe("复用队列的取消和读后边界", () => {
  it("派发前全部取消仍清理索引，派发回调在底层读取之前", async () => {
    const events: string[] = [];
    const queue = new ReadRequestQueue<number, number>(
      async (inputs) => {
        events.push("io");
        return inputs.map((value) => ({ status: "fulfilled", value }));
      },
      () => {
        events.push("release");
      },
    );
    const controller = new AbortController();
    const result = queue.request(1, controller.signal);
    const rejected = expect(result).rejects.toBeDefined();
    controller.abort();
    await rejected;
    await vi.waitFor(() => expect(events).toEqual(["release"]));
    await queue.request(2, new AbortController().signal);
    expect(events).toEqual(["release", "release", "io"]);
  });
  it("独立事件任务中的待发请求合并，派发前取消不产生底层读取", async () => {
    const execute = vi.fn(async (inputs: readonly number[]) =>
      inputs.map((value) => ({ status: "fulfilled" as const, value })),
    );
    const queue = new ReadRequestQueue(execute);
    const a = new AbortController(),
      b = new AbortController();
    const request = (value: number, signal: AbortSignal) =>
      new Promise<number>((resolve, reject) => {
        setTimeout(() => {
          void queue.request(value, signal).then(resolve, reject);
        }, 0);
      });
    expect(
      await Promise.all([request(1, a.signal), request(2, b.signal)]),
    ).toEqual([1, 2]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toEqual([1, 2]);
    const cancelled = queue.request(3, a.signal);
    const rejected = expect(cancelled).rejects.toBeDefined();
    a.abort();
    await rejected;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it("单个订阅取消不会中断其他订阅，全部取消则停止底层", async () => {
    let started!: () => void;
    const ready = new Promise<void>((r) => {
      started = r;
    });
    let signal!: AbortSignal;
    const queue = new ReadRequestQueue<number, number>(async (inputs, s) => {
      signal = s;
      started();
      await new Promise<void>((_, reject) =>
        s.addEventListener("abort", () => reject(s.reason), { once: true }),
      );
      return inputs.map((value) => ({ status: "fulfilled", value }));
    });
    const a = new AbortController(),
      b = new AbortController();
    const first = queue.request(1, a.signal),
      second = queue.request(2, b.signal);
    const settled = Promise.allSettled([first, second]);
    await ready;
    a.abort();
    expect(signal.aborted).toBe(false);
    b.abort();
    await settled;
    expect(signal.aborted).toBe(true);
  });
  it("已发送的请求不能充当后来发起的读后复验", async () => {
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const execute = vi.fn(async (inputs: readonly number[]) => {
      await held;
      return inputs.map((value) => ({ status: "fulfilled" as const, value }));
    });
    const queue = new ReadRequestQueue(execute),
      signal = new AbortController().signal;
    const before = queue.request(1, signal);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    const after = queue.request(2, signal);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    release();
    expect(await Promise.all([before, after])).toEqual([1, 2]);
  });
  it("原生grpc并发身份查询合并，后续校验和不同端点分别请求", async () => {
    const session = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    const payload = GrpcTypes.GetServiceInfoResponse.toBinary({
      chainId: session.profile.expectedGenesisDigest,
      checkpointHeight: 10n,
    });
    const trailer = new TextEncoder().encode("grpc-status: 0\r\n");
    const body = new Uint8Array(10 + payload.length + trailer.length);
    new DataView(body.buffer).setUint32(1, payload.length);
    body.set(payload, 5);
    body[5 + payload.length] = 128;
    new DataView(body.buffer).setUint32(6 + payload.length, trailer.length);
    body.set(trailer, 10 + payload.length);
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(body, {
          headers: { "content-type": "application/grpc-web+proto" },
        }),
    );
    const endpoint = session.profile.endpoints.fullnodeGrpcWeb,
      signal = session.signal;
    const info = () =>
      queuedServiceInfo(session, endpoint, fetch, 10000, signal);
    const results = await Promise.all([info(), info()]);
    expect(results[0].checkpointHeight).toBe(10n);
    expect(fetch).toHaveBeenCalledTimes(1);
    await info();
    expect(fetch).toHaveBeenCalledTimes(2);
    await Promise.all([
      info(),
      queuedServiceInfo(session, endpoint + "/other", fetch, 10000, signal),
    ]);
    expect(fetch).toHaveBeenCalledTimes(4);
    await Promise.all(
      [0, 1].map(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              void info().then(resolve, reject);
            }, 0);
          }),
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(5);
    session.close();
  });
});
