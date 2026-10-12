// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from "vitest";
import { probeGraphQLDomainCapabilities } from "./graphql-domain-capabilities";
import * as schema from "./graphql-schema-capabilities";
import {
  WALLET_GRAPHQL_SCHEMA_CONTRACTS,
  type WalletGraphQLSchemaContract,
} from "./graphql-schema-contracts";
import {
  GraphQLSnapshot,
  SnapshotReadError,
  type CoverageDependency,
} from "./graphql-snapshot";
import { NetworkIdentityError } from "./identity";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";

function session(names = true, graphql = true) {
  const p = profileFixture();
  if (!names) delete p.packages.name;
  if (!graphql) delete p.endpoints.graphqlUrl;
  return new WalletReadSession(validateNetworkProfile(p));
}
function schemaReport(s: WalletReadSession): schema.WalletSchemaCapabilities {
  return Object.freeze({
    state: "schema-compatible",
    bindingKey: s.bindingKey,
    readSessionKey: s.cacheKey,
    observedAt: 1,
    genesisDigest: s.profile.expectedGenesisDigest,
    schemaSha256: "0".repeat(64),
    contractVersion: 1,
    metadata: Object.freeze({
      oneOf: "verified",
      inputValueDeprecation: "not-requested",
    }),
    contracts: Object.freeze(
      Object.fromEntries(
        Object.keys(WALLET_GRAPHQL_SCHEMA_CONTRACTS).map((key) => [
          key,
          "compatible",
        ]),
      ) as Record<WalletGraphQLSchemaContract, "compatible">,
    ),
  });
}
function opened(
  s: WalletReadSession,
  dependencies: readonly CoverageDependency[],
) {
  return {
    proof: Object.freeze({
      bindingKey: s.bindingKey,
      checkpoint: "10",
      digest: s.profile.expectedGenesisDigest,
      cacheKey: "unit-snapshot",
      dependencies,
    }),
  } as GraphQLSnapshot;
}
function has(dependencies: readonly CoverageDependency[], field: string) {
  return dependencies.some((d) => d.field === field);
}
beforeEach(() => {
  vi.spyOn(schema, "probeGraphQLSchemaCapabilities").mockImplementation(
    async (s) => schemaReport(s),
  );
  vi.spyOn(GraphQLSnapshot, "open").mockImplementation(
    async (s, dependencies) => opened(s, dependencies),
  );
});

describe("领域capability聚合，仅准入声明而非业务完成", () => {
  it("八领域分别准入并冻结proof报告，不能发布client或签名许可", async () => {
    const s = session(),
      report = await probeGraphQLDomainCapabilities(s);
    expect(report.state).toBe("query-protocol-verified");
    expect(Object.values(report.domains).map((v) => v.state)).toEqual(
      Array(8).fill("snapshot-verified"),
    );
    expect(report).not.toHaveProperty("client");
    expect(report).not.toHaveProperty("ready");
    expect(report.bindingKey).toBe(s.bindingKey);
    expect(report.readSessionKey).toBe(s.cacheKey);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.domains)).toBe(true);
    expect(GraphQLSnapshot.open).toHaveBeenCalledTimes(8);
  });
  it("Display coverage失败保留完整assets失败，同时余额metadatastaking独立通过", async () => {
    vi.mocked(GraphQLSnapshot.open).mockImplementation(async (s, deps) => {
      if (has(deps, "display")) throw new SnapshotReadError("coverage");
      return opened(s, deps);
    });
    const report = await probeGraphQLDomainCapabilities(session());
    expect(report).toMatchObject({
      state: "query-protocol-degraded",
      domains: {
        assets: { state: "syncing" },
        balances: { state: "snapshot-verified" },
        coinMetadata: { state: "snapshot-verified" },
        staking: { state: "snapshot-verified" },
      },
    });
    expect(report.domains.assets).not.toHaveProperty("proof");
  });
  it("schema Display不兼容不能阻断无Display的staking multiGet合同", async () => {
    vi.mocked(schema.probeGraphQLSchemaCapabilities).mockImplementation(
      async (s) => {
        const report = schemaReport(s);
        if (report.state === "unconfigured") throw new Error("fixture");
        return {
          ...report,
          state: "schema-degraded",
          contracts: {
            ...report.contracts,
            multiGetObjects: "unsupported",
            displayHistory: "unsupported",
          },
        };
      },
    );
    const report = await probeGraphQLDomainCapabilities(session());
    expect(report).toMatchObject({
      domains: {
        assets: { state: "unsupported" },
        staking: { state: "snapshot-verified" },
      },
    });
    expect(GraphQLSnapshot.open).toHaveBeenCalledTimes(7);
  });
  it("names未配置不猜registry，其他领域照常探测", async () => {
    const report = await probeGraphQLDomainCapabilities(session(false));
    expect(report).toMatchObject({
      state: "query-protocol-degraded",
      domains: { names: { state: "unconfigured", reason: "name-registry" } },
    });
    expect(GraphQLSnapshot.open).toHaveBeenCalledTimes(7);
  });
  it("原生GraphQL未配置零snapshot探测", async () => {
    vi.mocked(schema.probeGraphQLSchemaCapabilities).mockImplementation(
      async (s) => ({
        state: "unconfigured",
        bindingKey: s.bindingKey,
        readSessionKey: s.cacheKey,
      }),
    );
    const report = await probeGraphQLDomainCapabilities(session(true, false));
    expect(report.state).toBe("unconfigured");
    expect(GraphQLSnapshot.open).not.toHaveBeenCalled();
  });
  it("events两种过滤分别验证，不能只检查其中一个", async () => {
    const report = await probeGraphQLDomainCapabilities(session());
    expect(report.domains.eventsByType.state).toBe("snapshot-verified");
    const filters = vi
      .mocked(GraphQLSnapshot.open)
      .mock.calls.flatMap((call) => call[1].flatMap((d) => d.filters ?? []));
    expect(filters).toEqual(
      expect.arrayContaining(["type", "module", "sentAddress"]),
    );
  });
  it("schema绑定不一致禁止任何snapshot探测", async () => {
    vi.mocked(schema.probeGraphQLSchemaCapabilities).mockImplementation(
      async (s) => ({ ...schemaReport(s), bindingKey: "foreign" }),
    );
    await expect(
      probeGraphQLDomainCapabilities(session()),
    ).rejects.toMatchObject({ reason: "incompatible" });
    expect(GraphQLSnapshot.open).not.toHaveBeenCalled();
  });
  it("已知错链优先于其它领域暂不可用，不发布成功子报告", async () => {
    vi.mocked(GraphQLSnapshot.open).mockImplementation(async (s, deps) => {
      if (has(deps, "balances")) throw new Error("private transport detail");
      if (has(deps, "coinMetadata"))
        throw new NetworkIdentityError("graphql", "chain-mismatch");
      return opened(s, deps);
    });
    await expect(
      probeGraphQLDomainCapabilities(session()),
    ).rejects.toMatchObject({ reason: "chain-mismatch" });
  });
  it("snapshot错binding拒绝整体，不能只按schema已验证放行", async () => {
    vi.mocked(GraphQLSnapshot.open).mockImplementation(
      async (s, deps) =>
        ({
          proof: { ...opened(s, deps).proof, bindingKey: "foreign" },
        }) as GraphQLSnapshot,
    );
    await expect(
      probeGraphQLDomainCapabilities(session()),
    ).rejects.toMatchObject({ reason: "incompatible" });
  });
  it.each(["partial", "changed", "incompatible"] as const)(
    "领域%s保留不完整状态与固定原因，不能当空集合",
    async (reason) => {
      vi.mocked(GraphQLSnapshot.open).mockImplementation(async (s, deps) => {
        if (has(deps, "balances")) throw new SnapshotReadError(reason);
        return opened(s, deps);
      });
      const report = await probeGraphQLDomainCapabilities(session());
      expect(report.domains.balances).toEqual({
        state: "incomplete",
        reason: reason === "incompatible" ? "response" : reason,
      });
    },
  );
  it("临时失败不读上次成功值，也不透传服务原文", async () => {
    const s = session();
    await probeGraphQLDomainCapabilities(s);
    vi.mocked(GraphQLSnapshot.open).mockRejectedValue(
      new Error("private transport detail"),
    );
    const report = await probeGraphQLDomainCapabilities(s);
    expect(
      Object.values(report.domains).every((v) => v.state === "unavailable"),
    ).toBe(true);
    expect(JSON.stringify(report)).not.toContain("private transport detail");
  });
  it("整个调用共用signal及下界，不把S当native水位", async () => {
    await probeGraphQLDomainCapabilities(session(), {
      minimumCheckpoint: "8",
      timeoutMs: 1000,
    });
    const calls = vi.mocked(GraphQLSnapshot.open).mock.calls;
    expect(new Set(calls.map((call) => call[2]?.signal)).size).toBe(1);
    expect(calls.every((call) => call[2]?.minimumCheckpoint === "8")).toBe(
      true,
    );
  });
  it("不可表达的UInt53下界在请求前拒绝", async () => {
    await expect(
      probeGraphQLDomainCapabilities(session(), {
        minimumCheckpoint: "9007199254740992",
      }),
    ).rejects.toMatchObject({ reason: "incompatible" });
    expect(schema.probeGraphQLSchemaCapabilities).not.toHaveBeenCalled();
  });
  it("caller取消结束等待，忽略abort的未结算准入不能迟到发布", async () => {
    let releases: (() => void)[] = [];
    vi.mocked(GraphQLSnapshot.open).mockImplementation(
      (s, deps) =>
        new Promise((resolve) => {
          releases.push(() => resolve(opened(s, deps)));
        }),
    );
    const controller = new AbortController(),
      s = session();
    const promise = probeGraphQLDomainCapabilities(s, {
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(releases.length).toBe(8));
    controller.abort();
    await assertion;
    releases.forEach((release) => release());
    await Promise.resolve();
  });
  it("关闭会话在整个聚合中拒绝旧报告", async () => {
    const s = session();
    vi.mocked(GraphQLSnapshot.open).mockImplementation(
      async (current, deps) => {
        s.close();
        return opened(current, deps);
      },
    );
    await expect(probeGraphQLDomainCapabilities(s)).rejects.toMatchObject({
      name: "StaleWalletSessionError",
    });
  });
});
