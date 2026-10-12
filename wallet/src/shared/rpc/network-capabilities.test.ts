// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import * as deadlines from "./read-deadline";
import { describe, it, expect, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { GrpcTypes } from "rtd-typescript/grpc";
import { historyRow } from "../../../tests/unit/rpc/history-fixtures";
import { probeNetworkCapabilities } from "./network-capabilities";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import { grpcPacket } from "./move-package-fixture";
import { StaleWalletSessionError } from "./session";
import { deploymentSha256 } from "./deployment-contract";

const wrong = toBase58(new Uint8Array(32).fill(8));
describe("四入口完整有限能力聚合", () => {
  it("30秒子组wrapper已结束但真实fetch在途，末尾身份成功仍不能返回完成报告", async () => {
    const f = await networkCapabilitiesFixture(),
      child = new AbortController(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    const deadline = deadlines.createReadDeadline;
    const spy = vi
      .spyOn(deadlines, "createReadDeadline")
      .mockImplementation((ms) =>
        ms === 30000
          ? { signal: child.signal, dispose: () => {} }
          : deadline(ms),
      );
    const run = probeNetworkCapabilities(f.session, {
      fetch: async (url, init) => {
        if (
          String(url) === f.profile.endpoints.graphqlUrl &&
          JSON.parse(String(init?.body)).query.includes("__schema")
        ) {
          entered.resolve();
          await held.promise;
        }
        return f.fetch(url, init);
      },
    });
    const assertion = expect(run).rejects.toMatchObject({ reason: "budget" });
    try {
      await entered.promise;
      child.abort(
        new DOMException("Controlled child deadline", "TimeoutError"),
      );
      await assertion;
      expect(
        f.requests.filter((r) => r.query?.includes("WalletGenesisIdentity")),
      ).toHaveLength(2);
    } finally {
      held.resolve();
      spy.mockRestore();
    }
    await new Promise((r) => setTimeout(r, 10));
  });
  it("总deadline包含开始身份IO，子组不能在身份结束后重新获得完整预算", async () => {
    const f = await networkCapabilitiesFixture(),
      held = Promise.withResolvers<void>();
    const started = performance.now();
    let identityRequests = 0;
    try {
      await expect(
        probeNetworkCapabilities(f.session, {
          timeoutMs: 400,
          fetch: async (url, init) => {
            if (String(url) === f.profile.endpoints.graphqlUrl) {
              const query = JSON.parse(String(init?.body)).query as string;
              if (query.includes("WalletGenesisIdentity")) {
                identityRequests++;
                await new Promise((r) => setTimeout(r, 150));
              }
              if (query.includes("__schema")) await held.promise;
            }
            return f.fetch(url, init);
          },
        }),
      ).rejects.toMatchObject({ name: "TimeoutError" });
      expect(performance.now() - started).toBeLessThan(525);
      expect(identityRequests).toBe(1);
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
  });
  it("异步期间调用方改变声明不改变本轮开始前复制的可信pin", async () => {
    const f = await networkCapabilitiesFixture(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    const declaration = {
      json: "{",
      trustedSha256: await deploymentSha256(new TextEncoder().encode("{")),
    };
    const pending = probeNetworkCapabilities(f.session, {
      declaration,
      fetch: async (...args) => {
        entered.resolve();
        await held.promise;
        return f.fetch(...args);
      },
    });
    await entered.promise;
    declaration.trustedSha256 = "0".repeat(64);
    held.resolve();
    const report = await pending;
    expect(report.deployment).toMatchObject({
      state: "observed",
      value: {
        state: "declaration-rejected",
        declaration: { state: "rejected", reason: "declaration" },
        move: null,
      },
    });
  });
  it.each(["native-checkpoint", "graphql-domain"] as const)(
    "组内已知错链不被同组held请求或总期限掩盖：%s",
    async (mode) => {
      const f = await networkCapabilitiesFixture(),
        held = Promise.withResolvers<void>();
      try {
        await expect(
          probeNetworkCapabilities(f.session, {
            timeoutMs: 500,
            fetch: async (url, init) => {
              if (mode === "native-checkpoint") {
                if (String(url).endsWith("LedgerService/GetCheckpoint"))
                  return grpcPacket(
                    GrpcTypes.GetCheckpointResponse.toBinary({
                      checkpoint: {
                        sequenceNumber: 0n,
                        digest: wrong,
                        transactions: [],
                      },
                    }),
                  );
                if (String(url).endsWith("LedgerService/GetObject"))
                  await held.promise;
              } else if (String(url) === f.profile.endpoints.graphqlUrl) {
                const query = JSON.parse(String(init?.body)).query as string;
                if (
                  query.includes("WalletSnapshotAdmission") &&
                  query.includes('field: "balances"')
                ) {
                  if (query.includes("walletDisplayService"))
                    await held.promise;
                  else {
                    const json = await (await f.fetch(url, init)).json();
                    for (const [name, value] of Object.entries(json.data)) {
                      if (
                        name === "walletGenesis" ||
                        name.endsWith("_walletGenesis")
                      )
                        (value as { digest: string }).digest = wrong;
                    }
                    return Response.json(json);
                  }
                }
              }
              return f.fetch(url, init);
            },
          }),
        ).rejects.toMatchObject({ reason: "chain-mismatch" });
      } finally {
        held.resolve();
      }
      await new Promise((r) => setTimeout(r, 10));
    },
  );
  it("实际SDK与RTD schema/BCS组合，报告保留每项有限合同和未验证部署，不发布client", async () => {
    const f = await networkCapabilitiesFixture();
    const result = await probeNetworkCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(result).toMatchObject({
      state: "capabilities-assessed",
      bindingKey: f.session.bindingKey,
      readSessionKey: f.session.cacheKey,
      graphql: {
        state: "observed",
        value: {
          schema: { state: "schema-compatible" },
          domains: {
            balances: { state: "snapshot-verified" },
            names: { state: "unconfigured" },
          },
        },
      },
      native: { state: "observed", value: { state: "native-probes-verified" } },
      deployment: {
        state: "observed",
        value: {
          state: "unreviewed",
          move: { state: "selected-contracts-compatible" },
        },
      },
      accountHistory: {
        state: "observed",
        value: {
          state: "coverage-window-verified",
          accountScope: "not-probed",
          allAccountHistoryVerified: false,
        },
      },
      readiness: "not-assessed",
      serviceDeployment: "not-verified",
      crossDomainSnapshot: "not-verified",
      execution: "not-probed",
    });
    expect(
      result.identity.before.endpoints.every((r) => r.state === "verified"),
    ).toBe(true);
    expect(
      result.identity.after.endpoints.every((r) => r.state === "verified"),
    ).toBe(true);
    expect(
      f.requests.filter((r) => r.query?.includes("WalletGenesisIdentity")),
    ).toHaveLength(2);
    expect(
      f.requests.filter((r) => r.method === "MovePackageService/GetPackage")
        .length,
    ).toBeGreaterThan(0);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty("client");
    expect(
      JSON.stringify(result, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    ).not.toMatch(/simulate|signAnd|executeTransaction/);
  });
  it("显式owner调用整条生产reader，报告只保留hash、计数与有限union标志", async () => {
    const row = await historyRow(),
      f = await networkCapabilitiesFixture({ rows: [row.row] });
    const result = await probeNetworkCapabilities(f.session, {
      fetch: f.fetch,
      address: row.row.sender,
    });
    expect(result.accountHistory).toMatchObject({
      state: "observed",
      value: {
        state: "scoped-window-verified",
        totalTransactions: 1,
        accountSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        allAccountHistoryVerified: false,
      },
    });
    expect(result.accountHistory).not.toHaveProperty("value.address");
    expect(
      f.history.requests.some((r) => r.query.includes("WalletAccountHistory")),
    ).toBe(true);
  });
  it("每次执行全新聚合，回到同profile也不复用旧session报告", async () => {
    const f = await networkCapabilitiesFixture(),
      g = await networkCapabilitiesFixture();
    const first = await probeNetworkCapabilities(f.session, { fetch: f.fetch });
    const second = await probeNetworkCapabilities(g.session, {
      fetch: g.fetch,
    });
    expect(first.bindingKey).toBe(second.bindingKey);
    expect(first.readSessionKey === second.readSessionKey).toBe(false);
    expect(f.requests.length).toBe(g.requests.length);
  });
  it("未配置入口和可选Move必须显式保留", async () => {
    const f = await networkCapabilitiesFixture({
      profile: (p) => {
        delete p.endpoints.archiveGrpcWeb;
        delete p.endpoints.graphqlUrl;
        delete p.endpoints.accountHistoryUrl;
        delete p.packages.kiosk;
        delete p.packages.personalKiosk;
        delete p.packages.originByte;
      },
    });
    const result = await probeNetworkCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(result.graphql).toMatchObject({
      state: "observed",
      value: { state: "unconfigured" },
    });
    expect(result.native).toMatchObject({
      state: "observed",
      value: { endpoints: { archive: { state: "unconfigured" } } },
    });
    expect(result.accountHistory).toMatchObject({
      state: "observed",
      value: { state: "unconfigured" },
    });
    expect(result.deployment).toMatchObject({
      state: "observed",
      value: { registry: { state: "unconfigured" } },
    });
  });
  it("当前schema部分响应不会沿用上一轮成功，末尾身份仍重验", async () => {
    const f = await networkCapabilitiesFixture();
    await probeNetworkCapabilities(f.session, { fetch: f.fetch });
    const before = f.requests.filter((r) =>
      r.query?.includes("WalletGenesisIdentity"),
    ).length;
    const result = await probeNetworkCapabilities(f.session, {
      fetch: async (url, init) =>
        String(url) === f.profile.endpoints.graphqlUrl &&
        JSON.parse(String(init?.body)).query?.includes("__schema")
          ? Response.json({
              errors: [{ message: "private endpoint body" }],
              data: null,
            })
          : f.fetch(url, init),
    });
    expect(result.graphql).toMatchObject({ state: "incomplete" });
    expect(
      f.requests.filter((r) => r.query?.includes("WalletGenesisIdentity"))
        .length - before,
    ).toBe(2);
  });
  it("末尾graphql错链优先于当前schema失败或缺部署声明", async () => {
    const f = await networkCapabilitiesFixture();
    let identities = 0;
    const fetch: typeof globalThis.fetch = async (url, init) => {
      if (String(url) === f.profile.endpoints.graphqlUrl) {
        const query = JSON.parse(String(init?.body)).query;
        if (query.includes("WalletGenesisIdentity") && ++identities === 2)
          return Response.json({ data: { checkpoint: { digest: wrong } } });
        if (query.includes("__schema"))
          return Response.json({
            errors: [{ message: "failed schema" }],
            data: null,
          });
      }
      return f.fetch(url, init);
    };
    await expect(
      probeNetworkCapabilities(f.session, { fetch }),
    ).rejects.toMatchObject({ role: "graphql", reason: "chain-mismatch" });
  });
  it("account已确认H0错链停止聚合", async () => {
    const f = await networkCapabilitiesFixture();
    await expect(
      probeNetworkCapabilities(f.session, {
        fetch: async (url, init) => {
          const response = await f.fetch(url, init);
          if (String(url) !== f.profile.endpoints.accountHistoryUrl)
            return response;
          const json = await response.json();
          json.data.accountHistoryCoverage.chainId = wrong;
          return Response.json(json);
        },
      }),
    ).rejects.toMatchObject({
      role: "accountHistory",
      reason: "chain-mismatch",
    });
  });
  it("Fullnode非业务成功trailer只降级该入口，HTTP200不冒作成功", async () => {
    const f = await networkCapabilitiesFixture();
    const result = await probeNetworkCapabilities(f.session, {
      fetch: async (url, init) =>
        String(url).endsWith("MovePackageService/GetFunction")
          ? grpcPacket(GrpcTypes.GetFunctionResponse.toBinary({}), 12)
          : f.fetch(url, init),
    });
    expect(result.native).toMatchObject({
      state: "observed",
      value: {
        state: "native-probes-degraded",
        endpoints: {
          fullnode: {
            methods: {
              "MovePackageService/GetFunction": {
                state: "unverified",
                reason: "unsupported",
              },
            },
          },
        },
      },
    });
  });
  it.each([0, -1, NaN, 60001, 1.5])(
    "非法总期限在首次IO前拒绝 %s",
    async (timeoutMs) => {
      const f = await networkCapabilitiesFixture(),
        fetch = vi.fn(f.fetch);
      await expect(
        probeNetworkCapabilities(f.session, { fetch, timeoutMs }),
      ).rejects.toBeInstanceOf(RangeError);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { address: "not-an-address" },
    { minimumCheckpoint: "9007199254740992" },
    { minimumCheckpoint: "-1" },
  ])("非法selector在首次IO前拒绝", async (options) => {
    const f = await networkCapabilitiesFixture(),
      fetch = vi.fn(f.fetch);
    await expect(
      probeNetworkCapabilities(f.session, { fetch, ...options }),
    ).rejects.toMatchObject({ reason: "incompatible" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("关闭session立即拒绝并禁止迟到成功发布", async () => {
    const f = await networkCapabilitiesFixture();
    let release!: () => void, enter!: () => void;
    const held = new Promise<void>((r) => (release = r)),
      entered = new Promise<void>((r) => (enter = r));
    const pending = probeNetworkCapabilities(f.session, {
      fetch: async (...args) => {
        enter();
        await held;
        return f.fetch(...args);
      },
    });
    const check = expect(pending).rejects.toBeInstanceOf(
      StaleWalletSessionError,
    );
    await entered;
    f.session.close();
    await check;
    release();
    await new Promise((r) => setTimeout(r, 10));
  });
});
