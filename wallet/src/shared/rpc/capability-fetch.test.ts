// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { createCapabilityFetch } from "./capability-fetch";
import { HISTORY_COVERAGE_QUERY } from "./account-history-protocol";
import { grpcPacket } from "./move-package-fixture";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";
import { probeNetworkCapabilities } from "./network-capabilities";
function setup() {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  return {
    session,
    signal: new AbortController(),
    url:
      session.profile.endpoints.fullnodeGrpcWeb +
      "/rtd.rpc.v2.LedgerService/GetServiceInfo",
  };
}
const post = { method: "POST", body: new Uint8Array() };
describe("能力聚合精确入口、有界body与真实cleanup", () => {
  it("正常EOF后封存，后续请求不能追加IO", async () => {
    const f = setup(),
      raw = vi.fn<typeof globalThis.fetch>(async () =>
        Response.json({ public: true }),
      ),
      bounded = createCapabilityFetch(f.session, f.signal.signal, raw);
    await bounded(f.url, post);
    bounded.assertCompleted();
    await expect(bounded(f.url, post)).rejects.toMatchObject({
      reason: "policy",
    });
    expect(raw).toHaveBeenCalledTimes(1);
  });
  it.each(["pending", "cancelled-after-eof"] as const)(
    "未完成观察不能由迟到响应补记完成：%s",
    async (mode) => {
      const f = setup(),
        child = new AbortController(),
        held = Promise.withResolvers<void>(),
        entered = Promise.withResolvers<void>(),
        bounded = createCapabilityFetch(
          f.session,
          f.signal.signal,
          async () => {
            entered.resolve();
            if (mode === "pending") await held.promise;
            return Response.json({ public: true });
          },
        );
      const call = bounded(f.url, { ...post, signal: child.signal });
      const assertion =
        mode === "pending"
          ? expect(call).rejects.toMatchObject({ reason: "policy" })
          : call;
      await entered.promise;
      if (mode === "cancelled-after-eof") {
        await call;
        child.abort();
      }
      expect(() => bounded.assertCompleted()).toThrowError(
        expect.objectContaining({ reason: "budget" }),
      );
      held.resolve();
      await assertion;
      expect(() => bounded.assertCompleted()).toThrowError(
        expect.objectContaining({ reason: "policy" }),
      );
    },
  );
  it("子signal取消、body cancel仍在途，完成校验不能提前释放", async () => {
    const f = setup(),
      child = new AbortController(),
      cleanup = Promise.withResolvers<void>(),
      entered = Promise.withResolvers<void>(),
      headers = Promise.withResolvers<void>();
    const bounded = createCapabilityFetch(
      f.session,
      f.signal.signal,
      async () => {
        await headers.promise;
        return new Response(
          new ReadableStream({
            cancel: () => {
              entered.resolve();
              return cleanup.promise;
            },
          }),
        );
      },
    );
    const call = bounded(f.url, { ...post, signal: child.signal });
    const assertion = expect(call).rejects.toBeDefined();
    child.abort();
    headers.resolve();
    await entered.promise;
    expect(() => bounded.assertCompleted()).toThrowError(
      expect.objectContaining({ reason: "budget" }),
    );
    cleanup.resolve();
    await assertion;
  });
  it.each([
    "TransactionExecutionService/ExecuteTransaction",
    "TransactionExecutionService/SimulateTransaction",
    "SubscriptionService/SubscribeCheckpoints",
    "LedgerService/GetTransaction",
    "LedgerService/GetServiceInfo?redirect=1",
  ])("拒绝非白名单native方法 %s", async (method) => {
    const f = setup(),
      fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        fetch,
      )(
        f.session.profile.endpoints.fullnodeGrpcWeb + "/rtd.rpc.v2." + method,
        post,
      ),
    ).rejects.toMatchObject({ reason: "policy" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "mutation { executeTransaction { digest } }",
    "subscription { checkpoint { digest } }",
    "query A { __typename } query B { __typename }",
    "query { harmless: simulateTransaction { digest } }",
    "query { ...Execute } fragment Execute on Query { executeTransaction { digest } }",
  ])("GraphQL仅允许一条query", async (query) => {
    const f = setup(),
      fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        fetch,
      )(f.session.profile.endpoints.graphqlUrl!, {
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    ).rejects.toMatchObject({ reason: "policy" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("account只两个固定根，Archive不能访问Fullnode方法或额外origin", async () => {
    const f = setup(),
      fetch = vi.fn<typeof globalThis.fetch>(),
      bounded = createCapabilityFetch(f.session, f.signal.signal, fetch);
    for (const [url, body] of [
      [
        f.session.profile.endpoints.accountHistoryUrl!,
        JSON.stringify({ query: "query { __typename }" }),
      ],
      [
        "https://unconfigured.test/graphql",
        JSON.stringify({ query: "query { __typename }" }),
      ],
      [
        f.session.profile.endpoints.archiveGrpcWeb! +
          "/rtd.rpc.v2.LedgerService/GetObject",
        new Uint8Array(),
      ],
    ] as const)
      await expect(
        bounded(url, { method: "POST", body }),
      ).rejects.toMatchObject({ reason: "policy" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([65537, -1])("native超预算或未知body格式在IO前拒绝", async (size) => {
    const f = setup(),
      fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        fetch,
      )(f.url, { ...post, body: size < 0 ? "invalid" : new Uint8Array(size) }),
    ).rejects.toMatchObject({ reason: "budget" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("account请求16KiB界限按UTF8字节，不能用字符数绕过", async () => {
    const f = setup(),
      fetch = vi.fn<typeof globalThis.fetch>();
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        fetch,
      )(f.session.profile.endpoints.accountHistoryUrl!, {
        method: "POST",
        body: JSON.stringify({
          query: HISTORY_COVERAGE_QUERY,
          padding: "中".repeat(5500),
        }),
      }),
    ).rejects.toMatchObject({ reason: "budget" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("流式重建保留native frame/trailer全部字节以及HTTP503/backoff header", async () => {
    const f = setup(),
      bytes = new Uint8Array(
        await grpcPacket(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: f.session.profile.expectedGenesisDigest,
            checkpointHeight: 1n,
          }),
          14,
        ).arrayBuffer(),
      );
    const response = await createCapabilityFetch(
      f.session,
      f.signal.signal,
      async (_, init) => {
        expect(init?.redirect).toBe("error");
        expect(init?.credentials).toBe("omit");
        return new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(bytes.slice(0, 8));
              c.enqueue(bytes.slice(8));
              c.close();
            },
          }),
          { status: 503, headers: { "retry-after": "1" } },
        );
      },
    )(f.url, post);
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
  it("成功HTTP无body与超过2MiB的stream不能通过", async () => {
    const f = setup();
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        async () => new Response(null),
      )(f.url, post),
    ).rejects.toMatchObject({ reason: "unavailable" });
    await expect(
      createCapabilityFetch(
        f.session,
        f.signal.signal,
        async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1)),
      )(f.url, post),
    ).rejects.toMatchObject({ reason: "budget" });
  });
  it.each(["late-headers", "held-body", "oversize-cleanup"] as const)(
    "真实聚合SDK leaf四名额取消后等待实际清理：%s",
    async (mode) => {
      const entered = Promise.withResolvers<void>(),
        releases: (() => void)[] = [],
        cleanups: (() => void)[] = [],
        streams: ReadableStream<Uint8Array>[] = [];
      let calls = 0;
      const rows = Array.from({ length: 4 }, () => setup());
      const assertions = rows.map((f) =>
        expect(
          probeNetworkCapabilities(f.session, {
            signal: f.signal.signal,
            fetch: async () => {
              calls++;
              const stream = new ReadableStream<Uint8Array>({
                start(c) {
                  if (mode === "oversize-cleanup")
                    c.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
                  else if (mode === "held-body") releases.push(() => c.close());
                },
                cancel: () =>
                  new Promise<void>((done) => {
                    cleanups.push(done);
                    if (mode === "oversize-cleanup" && cleanups.length === 4)
                      entered.resolve();
                  }),
              });
              streams.push(stream);
              if (mode === "late-headers")
                return new Promise<Response>((resolve) => {
                  releases.push(() => resolve(new Response(stream)));
                  if (calls === 4) entered.resolve();
                });
              if (calls === 4 && mode === "held-body") entered.resolve();
              return new Response(stream);
            },
          }),
        ).rejects.toBeDefined(),
      );
      try {
        await entered.promise;
        if (mode === "held-body")
          await vi.waitFor(() =>
            expect(streams.every((s) => s.locked)).toBe(true),
          );
        rows.forEach((f) => f.signal.abort(new Error("explicit cancellation")));
        await Promise.all(assertions);
        if (mode === "late-headers") {
          releases.forEach((r) => r());
          releases.length = 0;
          await vi.waitFor(() => expect(cleanups).toHaveLength(4));
        }
        const next = setup(),
          fetch = vi.fn<typeof globalThis.fetch>();
        await expect(
          probeNetworkCapabilities(next.session, { fetch, timeoutMs: 50 }),
        ).rejects.toBeDefined();
        expect(fetch).not.toHaveBeenCalled();
        expect(calls).toBe(4);
      } finally {
        releases.forEach((r) => r());
        cleanups.forEach((done) => done());
      }
      await new Promise((r) => setTimeout(r, 10));
    },
  );
});
