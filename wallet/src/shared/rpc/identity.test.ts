// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";

import { probeNetworkIdentity } from "./identity";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { StaleWalletSessionError, WalletReadSession } from "./session";

function frame(payload: Uint8Array, trailer = false) {
  const output = new Uint8Array(5 + payload.length);
  output[0] = trailer ? 128 : 0;
  new DataView(output.buffer).setUint32(1, payload.length, false);
  output.set(payload, 5);
  return output;
}

function grpcInfo(
  digest: string,
  options: {
    status?: number;
    missingHeight?: boolean;
    badLower?: boolean;
  } = {},
) {
  const payload = GrpcTypes.GetServiceInfoResponse.toBinary({
    chainId: digest,
    checkpointHeight: options.missingHeight ? undefined : 100n,
    lowestAvailableCheckpoint: options.badLower ? 101n : 0n,
    lowestAvailableCheckpointObjects: 0n,
  });
  const message = frame(payload);
  const trailer = frame(
    new TextEncoder().encode(`grpc-status: ${options.status ?? 0}\r\n`),
    true,
  );
  const output = new Uint8Array(message.length + trailer.length);
  output.set(message);
  output.set(trailer, message.length);
  return new Response(output, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}

function session() {
  return new WalletReadSession(
    validateNetworkProfile(profileFixture(), { requireComplete: true }),
  );
}

function transport(
  graphql?: unknown,
  grpcOptions?: Parameters<typeof grpcInfo>[1],
) {
  return vi.fn<typeof fetch>(async (url, init) => {
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    if (String(url).endsWith("/graphql")) {
      const body = JSON.parse(String(init?.body));
      expect(body.query).toContain("checkpoint(sequenceNumber: 0)");
      return Response.json(
        graphql ?? {
          data: {
            checkpoint: { digest: profileFixture().expectedGenesisDigest },
          },
        },
      );
    }
    expect(String(url)).toMatch(/rtd\.rpc\.v2\.LedgerService\/GetServiceInfo$/);
    return grpcInfo(profileFixture().expectedGenesisDigest, grpcOptions);
  });
}

describe("同链三入口 raw 身份探测", () => {
  it("已确认canonical错链立即拒绝，忽略abort的native leaf不掩盖该错误", async () => {
    const normal = transport({
      data: { checkpoint: { digest: toBase58(new Uint8Array(32).fill(8)) } },
    });
    const held = Promise.withResolvers<void>();
    let completed = false;
    try {
      await expect(
        probeNetworkIdentity(session(), {
          fetch: async (...args) => {
            if (!String(args[0]).endsWith("/graphql")) {
              await held.promise;
              completed = true;
            }
            return normal(...args);
          },
        }),
      ).rejects.toMatchObject({ reason: "chain-mismatch", role: "graphql" });
      expect(completed).toBe(false);
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
  });
  it("caller取消立即结束等待，迟到响应不发布", async () => {
    const held = Promise.withResolvers<void>(),
      entered = Promise.withResolvers<void>(),
      controller = new AbortController(),
      normal = transport();
    const reason = new Error("caller cancelled");
    const assertion = expect(
      probeNetworkIdentity(session(), {
        signal: controller.signal,
        fetch: async (...args) => {
          entered.resolve();
          await held.promise;
          return normal(...args);
        },
      }),
    ).rejects.toBe(reason);
    await entered.promise;
    controller.abort(reason);
    await assertion;
    held.resolve();
    await new Promise((r) => setTimeout(r, 10));
  });
  it("预取消signal在首次IO之前拒绝", async () => {
    const controller = new AbortController(),
      fetch = transport();
    controller.abort();
    await expect(
      probeNetworkIdentity(session(), { signal: controller.signal, fetch }),
    ).rejects.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("身份deadline结束等待而不接受忽略abort的迟到成功", async () => {
    const held = Promise.withResolvers<void>(),
      normal = transport();
    try {
      await expect(
        probeNetworkIdentity(session(), {
          timeoutMs: 50,
          fetch: async (...args) => {
            await held.promise;
            return normal(...args);
          },
        }),
      ).rejects.toMatchObject({ name: "TimeoutError" });
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
  });
  it("从实际 SDK gRPC-Web 帧与 GraphQL H0 验证三入口，每次重验且不释放执行客户端", async () => {
    const readSession = session();
    const fetch = transport();
    const first = await probeNetworkIdentity(readSession, { fetch });
    expect(first.state).toBe("identity-verified");
    expect(first.endpoints.map((entry) => entry.state)).toEqual([
      "verified",
      "verified",
      "verified",
    ]);
    expect(first).not.toHaveProperty("fullnode");
    expect(first.endpoints[0]).toHaveProperty("checkpointHeight", 100n);
    await probeNetworkIdentity(readSession, { fetch });
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it("已知错链优先于其它入口不可用，拒绝整体绑定", async () => {
    const fetch = transport(
      {
        data: { checkpoint: { digest: toBase58(new Uint8Array(32).fill(2)) } },
      },
      { status: 14 },
    );
    await expect(
      probeNetworkIdentity(session(), { fetch }),
    ).rejects.toMatchObject({ role: "graphql", reason: "chain-mismatch" });
  });

  it("HTTP 200 加失败 gRPC trailer 不算业务成功", async () => {
    const report = await probeNetworkIdentity(session(), {
      fetch: transport(undefined, { status: 14 }),
    });
    expect(report.endpoints.map((entry) => entry.state)).toEqual([
      "unavailable",
      "verified",
      "unavailable",
    ]);
  });

  it.each([
    {
      data: { checkpoint: { digest: profileFixture().expectedGenesisDigest } },
      errors: [{ message: "partial error" }],
    },
    { data: { checkpoint: null } },
    { data: { checkpoint: { digest: "old-short-label" } } },
  ])("部分成功或缺失 GraphQL 身份不能接纳", async (graphql) => {
    await expect(
      probeNetworkIdentity(session(), { fetch: transport(graphql) }),
    ).rejects.toMatchObject({ reason: "incompatible" });
  });

  it.each([{ missingHeight: true }, { badLower: true }])(
    "缺水位或保留区间非法不能接纳",
    async (grpcOptions) => {
      await expect(
        probeNetworkIdentity(session(), {
          fetch: transport(undefined, grpcOptions),
        }),
      ).rejects.toMatchObject({ reason: "incompatible" });
    },
  );

  it("关闭会话后拒绝忽略取消的成功探测", async () => {
    const readSession = session();
    const normal = transport();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetch: typeof globalThis.fetch = async (...args) => {
      await hold;
      return normal(...args);
    };
    const pending = probeNetworkIdentity(readSession, { fetch });
    readSession.close();
    release();
    await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
  });
});
