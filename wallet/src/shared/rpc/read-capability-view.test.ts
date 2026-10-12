// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import type { WalletNetworkCapabilities } from "./network-capabilities";
import { probeNetworkCapabilities } from "./network-capabilities";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import {
  projectReadCapabilities,
  validatingReadCapabilities,
  unavailableReadCapabilities,
  quarantinedReadCapabilities,
} from "./read-capability-view";
import { WalletReadSession, StaleWalletSessionError } from "./session";
import { NetworkIdentityError } from "./identity";
import { historyRow } from "../../../tests/unit/rpc/history-fixtures";

describe("core只读状态投影", () => {
  let f: Awaited<ReturnType<typeof networkCapabilitiesFixture>>;
  let report: WalletNetworkCapabilities;
  beforeAll(async () => {
    f = await networkCapabilitiesFixture();
    report = await probeNetworkCapabilities(f.session, { fetch: f.fetch });
  });
  it("真实NC5生产结果保留有限状态，不发布客户端或整网授权", () => {
    const view = projectReadCapabilities(f.session, report);
    expect(view).toMatchObject({
      phase: "read-contracts-assessed",
      bindingKey: f.session.bindingKey,
      readSessionKey: f.session.cacheKey,
      readiness: "not-assessed",
      serviceDeployment: "not-verified",
      crossDomainSnapshot: "not-verified",
      execution: "not-probed",
      graphql: {
        state: "observed",
        value: {
          domains: {
            balances: { state: "snapshot-verified" },
            names: { state: "unconfigured", reason: "name-registry" },
          },
        },
      },
      native: {
        state: "observed",
        value: {
          endpoints: {
            fullnode: {
              methods: {
                "LedgerService/GetObject": { state: "positive-read-verified" },
              },
            },
          },
        },
      },
      deployment: {
        state: "observed",
        value: { state: "unreviewed", declaration: { state: "missing" } },
      },
      accountHistory: {
        state: "observed",
        value: {
          state: "coverage-window-verified",
          accountScope: "not-probed",
          allAccountHistoryVerified: false,
        },
      },
    });
    const json = JSON.stringify(view);
    expect(json).not.toMatch(
      /responseSha256|selector|descriptorSha256|accountSha256|bytecodeSha256|"proof"|"client"|"address"|"transactions"/,
    );
    expect(view).not.toHaveProperty("ready");
    expect(view).not.toHaveProperty("canSign");
  });
  it("输出复制并深冻结，不冻结调用方可变报告或共享其子对象", () => {
    const source = structuredClone(report),
      view = projectReadCapabilities(f.session, source);
    if (
      view.phase !== "read-contracts-assessed" ||
      view.graphql.state !== "observed" ||
      source.graphql.state !== "observed"
    )
      throw new Error("fixture");
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.graphql.value.domains.balances.snapshot)).toBe(
      true,
    );
    expect(Object.isFrozen(view.native)).toBe(true);
    Object.assign(source, {
      graphql: { state: "unavailable", reason: "transport" },
    });
    expect(view.graphql.state).toBe("observed");
  });
  it("每个domain独立S，不用余额快照替代staking或资产", () => {
    const source = structuredClone(report);
    if (source.graphql.state !== "observed") throw new Error("fixture");
    const balance = source.graphql.value.domains.balances;
    if (balance.state !== "snapshot-verified") throw new Error("fixture");
    Object.assign(source.graphql.value, {
      domains: {
        ...source.graphql.value.domains,
        staking: {
          state: "snapshot-verified",
          proof: {
            ...balance.proof,
            checkpoint: "23",
            digest: toBase58(new Uint8Array(32).fill(3)),
          },
        },
        assets: { state: "incomplete", reason: "partial" },
      },
    });
    const view = projectReadCapabilities(f.session, source);
    if (
      view.phase !== "read-contracts-assessed" ||
      view.graphql.state !== "observed"
    )
      throw new Error("fixture");
    expect(view.graphql.value.domains.staking.snapshot?.checkpoint).toBe("23");
    expect(view.graphql.value.domains.balances.snapshot?.checkpoint).not.toBe(
      "23",
    );
    expect(view.graphql.value.domains.assets).toEqual({
      state: "incomplete",
      reason: "partial",
    });
  });
  it("仅复制闭合的8领域、12Move组和原生read白名单", () => {
    const source = structuredClone(report);
    if (
      source.graphql.state !== "observed" ||
      source.deployment.state !== "observed" ||
      !source.deployment.value.move ||
      source.native.state !== "observed"
    )
      throw new Error("fixture");
    Object.assign(source.graphql.value.domains, {
      foreign: { state: "snapshot-verified", payload: "discarded" },
    });
    Object.assign(source.deployment.value.move.groups, {
      foreign: { state: "abi-compatible", payload: "discarded" },
    });
    Object.assign(source.native.value.endpoints.fullnode, {
      payload: "discarded",
    });
    const view = projectReadCapabilities(f.session, source);
    expect(JSON.stringify(view)).not.toContain("discarded");
    if (
      view.phase !== "read-contracts-assessed" ||
      view.graphql.state !== "observed" ||
      view.deployment.state !== "observed"
    )
      throw new Error("fixture");
    expect(Object.keys(view.graphql.value.domains)).toHaveLength(8);
    expect(Object.keys(view.deployment.value.move!.groups)).toHaveLength(12);
  });
  it.each(["graphql", "native", "deployment", "accountHistory"] as const)(
    "外层未观测保留降级而不凭上一轮补正：%s",
    (name) => {
      const source = structuredClone(report);
      Object.assign(source, {
        [name]: { state: "incomplete", reason: "partial" },
      });
      const view = projectReadCapabilities(f.session, source);
      expect(view).toHaveProperty(name, {
        state: "incomplete",
        reason: "partial",
      });
    },
  );
  it.each(["bindingKey", "readSessionKey"] as const)(
    "拒绝根绑定不同：%s",
    (key) => {
      const source = { ...report, [key]: "foreign" };
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        NetworkIdentityError,
      );
    },
  );
  it.each(["graphql", "native", "deployment", "accountHistory"] as const)(
    "拒绝已观测组旧session：%s",
    (name) => {
      const source = structuredClone(report),
        row = source[name];
      if (row.state !== "observed") throw new Error("fixture");
      Object.assign(row.value, { readSessionKey: "foreign" });
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        NetworkIdentityError,
      );
    },
  );
  it.each([
    "readiness",
    "serviceDeployment",
    "crossDomainSnapshot",
    "execution",
  ] as const)("拒绝擅自升级未证明范围：%s", (key) => {
    const source = {
      ...report,
      [key]: "verified",
    } as unknown as WalletNetworkCapabilities;
    expect(() => projectReadCapabilities(f.session, source)).toThrow(
      NetworkIdentityError,
    );
  });
  it.each(["before", "after"] as const)(
    "前后身份错链均保留明确分类：%s",
    (stage) => {
      const source = structuredClone(report);
      const row = source.identity[stage].endpoints.find(
        (r) => r.role === "graphql",
      )!;
      Object.assign(row, {
        genesisDigest: toBase58(new Uint8Array(32).fill(8)),
      });
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        expect.objectContaining({ role: "graphql", reason: "chain-mismatch" }),
      );
    },
  );
  it("不兼容的H0不冒作已知错链，重复／未知身份角色拒绝", () => {
    for (const mutate of [
      (s: WalletNetworkCapabilities) =>
        Object.assign(s.identity.after.endpoints[0], {
          genesisDigest: "broken",
        }),
      (s: WalletNetworkCapabilities) =>
        Object.assign(s.identity.after.endpoints[1], { role: "fullnode" }),
      (s: WalletNetworkCapabilities) =>
        Object.assign(s.identity.after.endpoints[1], {
          role: "accountHistory",
        }),
      (s: WalletNetworkCapabilities) =>
        Object.assign(s.identity.after.endpoints[0], { state: "unconfigured" }),
    ]) {
      const source = structuredClone(report);
      mutate(source);
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        expect.objectContaining({ reason: "incompatible" }),
      );
    }
  });
  it("schema、Move子报告与domain proof不能沿用另一个session", () => {
    for (const mode of [
      "schema",
      "move",
      "domain-binding",
      "domain-session",
    ] as const) {
      const source = structuredClone(report);
      if (
        source.graphql.state !== "observed" ||
        source.deployment.state !== "observed" ||
        !source.deployment.value.move
      )
        throw new Error("fixture");
      if (mode === "schema")
        Object.assign(source.graphql.value.schema, {
          readSessionKey: "foreign",
        });
      else if (mode === "move")
        Object.assign(source.deployment.value.move, {
          readSessionKey: "foreign",
        });
      else {
        const row = source.graphql.value.domains.balances;
        if (row.state !== "snapshot-verified") throw new Error("fixture");
        Object.assign(
          row.proof,
          mode === "domain-binding"
            ? { bindingKey: "foreign" }
            : { cacheKey: JSON.stringify(["foreign"]) },
        );
      }
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        NetworkIdentityError,
      );
    }
  });
  it("有限账户范围不能改为全集已验证", () => {
    const source = structuredClone(report);
    if (source.accountHistory.state !== "observed") throw new Error("fixture");
    Object.assign(source.accountHistory.value, {
      allAccountHistoryVerified: true,
    });
    expect(() => projectReadCapabilities(f.session, source)).toThrow(
      expect.objectContaining({
        role: "accountHistory",
        reason: "incompatible",
      }),
    );
  });
  it("真实owner全reader的结果仅保留window、计数和coverage标志", async () => {
    const row = await historyRow(),
      g = await networkCapabilitiesFixture({ rows: [row.row] });
    const actual = await probeNetworkCapabilities(g.session, {
      fetch: g.fetch,
      address: row.row.sender,
    });
    const view = projectReadCapabilities(g.session, actual);
    expect(view).toMatchObject({
      accountHistory: {
        state: "observed",
        value: {
          state: "scoped-window-verified",
          totalTransactions: 1,
          accountScope: "scoped-window-verified",
          allAccountHistoryVerified: false,
          coverage: {
            registrationComplete: true,
            allAccountActivityCertified: false,
          },
        },
      },
    });
    expect(JSON.stringify(view)).not.toMatch(
      /accountSha256|"snapshot"\s*:\s*"|"address"|"sender"|"transactions"/,
    );
    g.session.close();
  });
  it("缺配置状态保持，验证中／预算失败／负面视图均不生成事实或授权", async () => {
    const g = await networkCapabilitiesFixture({
      profile: (p) => {
        delete p.endpoints.graphqlUrl;
        delete p.endpoints.archiveGrpcWeb;
        delete p.endpoints.accountHistoryUrl;
      },
    });
    const actual = await probeNetworkCapabilities(g.session, {
      fetch: g.fetch,
    });
    expect(projectReadCapabilities(g.session, actual)).toMatchObject({
      graphql: { value: { state: "unconfigured" } },
      native: { value: { endpoints: { archive: { state: "unconfigured" } } } },
      accountHistory: { value: { state: "unconfigured" } },
    });
    for (const view of [
      validatingReadCapabilities(g.session),
      unavailableReadCapabilities(g.session, "budget"),
      quarantinedReadCapabilities(g.session, "graphql", "schema"),
    ]) {
      expect(Object.isFrozen(view)).toBe(true);
      expect(view).not.toHaveProperty("identity");
      expect(view.readiness).toBe("not-assessed");
    }
    g.session.close();
  });
  it("同profile新session／已关闭session拒绝旧能力", () => {
    const fresh = new WalletReadSession(f.profile);
    expect(() => projectReadCapabilities(fresh, report)).toThrow(
      NetworkIdentityError,
    );
    fresh.close();
    expect(() => validatingReadCapabilities(fresh)).toThrow(
      StaleWalletSessionError,
    );
    expect(() => projectReadCapabilities(fresh, report)).toThrow(
      StaleWalletSessionError,
    );
  });
  it.each(["schema", "native-fullnode", "native-archive", "move"] as const)(
    "内层canonical错链明确拒绝：%s",
    (mode) => {
      const source = structuredClone(report),
        wrong = toBase58(new Uint8Array(32).fill(8));
      if (
        source.graphql.state !== "observed" ||
        source.native.state !== "observed" ||
        source.deployment.state !== "observed" ||
        !source.deployment.value.move
      )
        throw new Error("fixture");
      if (mode === "schema")
        Object.assign(source.graphql.value.schema, { genesisDigest: wrong });
      else if (mode === "move")
        Object.assign(source.deployment.value.move, { genesisDigest: wrong });
      else
        Object.assign(
          source.native.value.endpoints[
            mode === "native-fullnode" ? "fullnode" : "archive"
          ],
          { genesisDigest: wrong },
        );
      expect(() => projectReadCapabilities(f.session, source)).toThrow(
        expect.objectContaining({ reason: "chain-mismatch" }),
      );
    },
  );
  it.each([
    "domain-reason",
    "assessment-reason",
    "move-reason",
    "package-id",
    "account-window",
    "state",
    "timestamp",
  ] as const)("拒绝不可投影的状态或公开字段，不携带任意payload：%s", (mode) => {
    const source = structuredClone(report);
    if (
      source.graphql.state !== "observed" ||
      source.deployment.state !== "observed" ||
      !source.deployment.value.move ||
      source.accountHistory.state !== "observed"
    )
      throw new Error("fixture");
    if (mode === "domain-reason")
      Object.assign(source.graphql.value.domains, {
        assets: { state: "incomplete", reason: { payload: "discarded" } },
      });
    else if (mode === "assessment-reason")
      Object.assign(source, {
        graphql: { state: "unavailable", reason: { payload: "discarded" } },
      });
    else if (mode === "move-reason")
      Object.assign(source.deployment.value.move.groups, {
        coins: { state: "unsupported", reason: { payload: "discarded" } },
      });
    else if (mode === "package-id")
      Object.assign(source.deployment.value, {
        packages: [
          { packageId: { payload: "discarded" }, state: "pin-matched" },
        ],
      });
    else if (mode === "account-window") {
      if (source.accountHistory.value.state !== "coverage-window-verified")
        throw new Error("fixture");
      Object.assign(source.accountHistory.value.window, {
        allAccountActivityCertified: { payload: "discarded" },
      });
    } else if (mode === "state")
      Object.assign(source.graphql.value, { state: "network-ready" });
    else Object.assign(source, { observedAt: -1 });
    expect(() => projectReadCapabilities(f.session, source)).toThrow(
      expect.objectContaining({ reason: "incompatible" }),
    );
  });
  it("已配置其它入口暂不可用保留身份降级，没有凭Fullnode正例补其它角色", () => {
    const source = structuredClone(report);
    for (const stage of ["before", "after"] as const)
      for (const row of source.identity[stage].endpoints)
        if (row.role !== "fullnode")
          Object.assign(row, { state: "unavailable" });
    expect(projectReadCapabilities(f.session, source)).toMatchObject({
      identity: {
        before: {
          fullnode: "verified",
          graphql: "unavailable",
          archive: "unavailable",
        },
        after: {
          fullnode: "verified",
          graphql: "unavailable",
          archive: "unavailable",
        },
      },
      readiness: "not-assessed",
    });
  });
});
