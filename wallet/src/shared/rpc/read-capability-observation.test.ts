// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import * as deadlines from "./read-deadline";
// Actual SDK/schema/BCS protocols; memory storage is control-flow evidence only.
import { afterEach, describe, it, expect, vi } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import { reviewedDeploymentFixture } from "../../../tests/unit/rpc/reviewed-deployment-fixture";
import { observeReadCapabilities } from "./read-capability-observation";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import { grpcPacket } from "./move-package-fixture";
import { networkBindingKey } from "./profile";
import { WalletReadAdmission } from "./read-admission";
import {
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionFault,
  type NetworkAdmissionTicket,
} from "./network-admission-state";
import * as releaseConfig from "./release-deployment-config";
import { selectReviewedDeployment } from "./reviewed-deployment-registry";

class Store extends MemoryNetworkAdmission {
  capture = vi.fn(
    async (profile: Parameters<MemoryNetworkAdmission["begin"]>[0]) =>
      this.records.get(networkBindingKey(profile)),
  );
  begin = vi.fn((...args: Parameters<MemoryNetworkAdmission["begin"]>) =>
    super.begin(...args),
  );
  complete = vi.fn((...args: Parameters<MemoryNetworkAdmission["complete"]>) =>
    super.complete(...args),
  );
}
const wrong = toBase58(new Uint8Array(32).fill(8));
afterEach(() => vi.restoreAllMocks());
async function seeded(fault: NetworkAdmissionFault) {
  const { reason: _reason, ...area } = fault;
  const f = await networkCapabilitiesFixture(),
    store = new Store(),
    ticket = await store.begin(f.profile, [area]);
  await store.complete(f.profile, ticket, [fault]);
  store.begin.mockClear();
  store.complete.mockClear();
  return { f, store };
}
describe("当前session NC5原ticket协调", () => {
  it.each([false, true])(
    "合法裁剪下界推进不制造身份Fault，并保留原有ABI负面=%s",
    async (priorFault) => {
      const f = await networkCapabilitiesFixture({
        profile: (p) => {
          delete p.endpoints.graphqlUrl;
          delete p.endpoints.archiveGrpcWeb;
          delete p.endpoints.accountHistoryUrl;
        },
      });
      const store = new Store();
      const fault: NetworkAdmissionFault = {
        kind: "move-group",
        group: "coins",
        reason: "abi",
      };
      if (priorFault) {
        const ticket = await store.begin(f.profile, [
          { kind: "move-group", group: "coins" },
        ]);
        await store.complete(f.profile, ticket, [fault]);
      }
      let infoRound = 0;
      const result = await observeReadCapabilities(
        f.session,
        {
          fetch: async (url, init) => {
            if (String(url).endsWith("LedgerService/GetServiceInfo")) {
              const lower = ++infoRound >= 3 ? 1n : 0n;
              return grpcPacket(
                GrpcTypes.GetServiceInfoResponse.toBinary({
                  chainId: f.profile.expectedGenesisDigest,
                  checkpointHeight: 100n,
                  lowestAvailableCheckpoint: lower,
                  lowestAvailableCheckpointObjects: lower,
                }),
              );
            }
            return f.fetch(url, init);
          },
        },
        store,
      );
      const record = await store.capture(f.profile);
      expect(record?.pending).toEqual([]);
      expect(record?.faults).toEqual(priorFault ? [fault] : []);
      expect(result.phase).toBe(
        priorFault ? "unavailable" : "read-contracts-assessed",
      );
      f.session.close();
    },
  );
  it("只配置Fullnode时只占配置身份及12组，未配置服务不补造H0", async () => {
    const f = await networkCapabilitiesFixture({
        profile: (p) => {
          delete p.endpoints.graphqlUrl;
          delete p.endpoints.archiveGrpcWeb;
          delete p.endpoints.accountHistoryUrl;
        },
      }),
      store = new Store();
    const result = await observeReadCapabilities(
      f.session,
      { fetch: f.fetch },
      store,
    );
    expect(result).toMatchObject({
      phase: "read-contracts-assessed",
      identity: {
        before: { graphql: "unconfigured", archive: "unconfigured" },
      },
      graphql: { value: { state: "unconfigured" } },
      accountHistory: {
        value: { state: "unconfigured", accountScope: "not-probed" },
      },
    });
    const ticket: NetworkAdmissionTicket =
      await store.begin.mock.results[0].value;
    expect(ticket.areas).toHaveLength(13);
    expect(ticket.areas.filter((x) => x.kind === "identity")).toEqual([
      { kind: "identity", role: "fullnode" },
    ]);
  });
  it("子组deadline结束wrapper但真实schema fetch仍在途，原ticket保持pending", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      child = new AbortController(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    const deadline = deadlines.createReadDeadline;
    vi.spyOn(deadlines, "createReadDeadline").mockImplementation((ms) =>
      ms === 30000 ? { signal: child.signal, dispose: () => {} } : deadline(ms),
    );
    const run = observeReadCapabilities(
      f.session,
      {
        fetch: async (url, init) => {
          if (
            String(url) === f.profile.endpoints.graphqlUrl &&
            String(init?.body).includes("__schema")
          ) {
            entered.resolve();
            await held.promise;
          }
          return f.fetch(url, init);
        },
      },
      store,
    );
    try {
      await entered.promise;
      child.abort(
        new DOMException("Controlled child deadline", "TimeoutError"),
      );
      expect(await run).toMatchObject({
        phase: "unavailable",
        reason: "budget",
      });
      expect(store.complete).not.toHaveBeenCalled();
      expect(store.records.get(f.session.bindingKey)).toMatchObject({
        faults: [],
        pending: [expect.anything()],
      });
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(store.complete).not.toHaveBeenCalled();
  });
  it("真实组内错链立即保存，忽略取消的兄弟请求不能把负面拖到超时或空完成", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    const run = observeReadCapabilities(
      f.session,
      {
        fetch: async (url, init) => {
          if (
            String(url) === f.profile.endpoints.graphqlUrl &&
            String(init?.body).includes("__schema")
          ) {
            entered.resolve();
            await held.promise;
          }
          if (
            String(url).startsWith(f.profile.endpoints.fullnodeGrpcWeb) &&
            String(url).endsWith("LedgerService/GetCheckpoint")
          ) {
            await entered.promise;
            return grpcPacket(
              GrpcTypes.GetCheckpointResponse.toBinary({
                checkpoint: {
                  sequenceNumber: 0n,
                  digest: wrong,
                  transactions: [],
                },
              }),
            );
          }
          return f.fetch(url, init);
        },
      },
      store,
    );
    try {
      expect(await run).toMatchObject({
        phase: "quarantined",
        role: "fullnode",
        reason: "chain-mismatch",
      });
      expect(store.complete).toHaveBeenCalledTimes(1);
      expect(store.records.get(f.session.bindingKey)).toMatchObject({
        faults: [
          { kind: "identity", role: "fullnode", reason: "chain-mismatch" },
        ],
        pending: [],
      });
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(store.complete).toHaveBeenCalledTimes(1);
  });
  it("原占位先完成再真实四族SDK，完成只原ticket且有限投影不授权", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    const view = await observeReadCapabilities(
      f.session,
      {
        fetch: async (...args) => {
          expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(
            1,
          );
          expect(store.complete).not.toHaveBeenCalled();
          return f.fetch(...args);
        },
      },
      store,
    );
    expect(view).toMatchObject({
      phase: "read-contracts-assessed",
      readSessionKey: f.session.cacheKey,
      readiness: "not-assessed",
      execution: "not-probed",
      crossDomainSnapshot: "not-verified",
      deployment: { value: { state: "unreviewed" } },
      accountHistory: {
        value: { accountScope: "not-probed", allAccountHistoryVerified: false },
      },
    });
    expect(store.begin).toHaveBeenCalledTimes(1);
    const ticket = await store.begin.mock.results[0].value;
    expect(ticket.areas).toHaveLength(24);
    expect(store.complete.mock.calls[0][1]).toBe(ticket);
    expect(store.complete.mock.calls[0][2]).toEqual([]);
    expect(store.records.get(f.session.bindingKey)?.pending).toEqual([]);
    expect(
      f.requests.filter((r) => r.query?.includes("WalletGenesisIdentity")),
    ).toHaveLength(2);
    expect(view).not.toHaveProperty("client");
    expect(view).not.toHaveProperty("address");
    expect(Object.isFrozen(view)).toBe(true);
  });
  it("begin尚未resolve不得SDK IO，存储失败没有观察完成", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      held = Promise.withResolvers<void>(),
      entered = Promise.withResolvers<void>();
    store.begin.mockImplementation(async () => {
      entered.resolve();
      await held.promise;
      throw new WalletNetworkAdmissionStateError("unavailable");
    });
    const run = observeReadCapabilities(f.session, { fetch: f.fetch }, store);
    await entered.promise;
    expect(f.requests).toHaveLength(0);
    held.resolve();
    expect(await run).toMatchObject({
      phase: "unavailable",
      reason: "transport",
    });
    expect(store.complete).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
  });
  it.each(["fullnode", "graphql", "archive", "accountHistory"] as const)(
    "已有%s身份负面0 SDK，绑定模板在session关闭后仍可撤值",
    async (role) => {
      const { f, store } = await seeded({
        kind: "identity",
        role,
        reason: "chain-mismatch",
      });
      const result = await observeReadCapabilities(
        f.session,
        { fetch: f.fetch },
        store,
      );
      expect(result).toMatchObject({
        phase: "quarantined",
        role,
        reason: "chain-mismatch",
      });
      expect(store.begin).not.toHaveBeenCalled();
      expect(f.requests).toHaveLength(0);
    },
  );
  it("已有域负面或跨实例pending拒绝聚合，不伪造身份Fault", async () => {
    const { f, store } = await seeded({
      kind: "move-group",
      group: "display",
      reason: "abi",
    });
    expect(
      await observeReadCapabilities(f.session, { fetch: f.fetch }, store),
    ).toMatchObject({ phase: "unavailable", reason: "policy" });
    const g = await networkCapabilitiesFixture(),
      pending = new Store();
    await pending.begin(g.profile, [{ kind: "identity", role: "fullnode" }]);
    expect(
      await observeReadCapabilities(g.session, { fetch: g.fetch }, pending),
    ).toMatchObject({ phase: "unavailable", reason: "policy" });
    expect(f.requests).toHaveLength(0);
    expect(g.requests).toHaveLength(0);
    expect(pending.records.get(g.session.bindingKey)?.pending).toHaveLength(1);
    expect(pending.complete).not.toHaveBeenCalled();
    f.session.assertActive();
    g.session.assertActive();
  });
  it.each(["fullnode", "graphql", "archive"] as const)(
    "实际%s错链保存负面且不发布旧正面",
    async (role) => {
      const f = await networkCapabilitiesFixture(),
        store = new Store();
      const result = await observeReadCapabilities(
        f.session,
        {
          fetch: async (url, init) => {
            if (
              role === "fullnode" &&
              String(url).endsWith("LedgerService/GetServiceInfo") &&
              String(url).startsWith(f.profile.endpoints.fullnodeGrpcWeb)
            )
              return grpcPacket(
                GrpcTypes.GetServiceInfoResponse.toBinary({
                  chainId: wrong,
                  checkpointHeight: 100n,
                }),
              );
            if (
              role === "archive" &&
              String(url).startsWith(f.profile.endpoints.archiveGrpcWeb!) &&
              String(url).endsWith("LedgerService/GetCheckpoint")
            )
              return grpcPacket(
                GrpcTypes.GetCheckpointResponse.toBinary({
                  checkpoint: {
                    sequenceNumber: 0n,
                    digest: wrong,
                    transactions: [],
                  },
                }),
              );
            if (
              role === "graphql" &&
              String(url) === f.profile.endpoints.graphqlUrl &&
              String(init?.body).includes("WalletGenesisIdentity")
            )
              return Response.json({ data: { checkpoint: { digest: wrong } } });
            return f.fetch(url, init);
          },
        },
        store,
      );
      expect(result).toMatchObject({
        phase: "quarantined",
        role,
        reason: "chain-mismatch",
      });
      expect(result).not.toHaveProperty("graphql");
      expect(store.records.get(f.session.bindingKey)).toMatchObject({
        faults: [{ kind: "identity", role, reason: "chain-mismatch" }],
        pending: [],
      });
      expect(store.complete).toHaveBeenCalledTimes(1);
    },
  );
  it("真实Coin ABI错误仅保留coins组，余额门槛仍可独立读取", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      coin = [...f.packages.values()]
        .flatMap((p) => p.modules)
        .find((m) => m.name === "coin")!
        .datatypes.find((d) => d.name === "Coin")!;
    coin.fields[1].name = "wrong_balance";
    const result = await observeReadCapabilities(
      f.session,
      { fetch: f.fetch },
      store,
    );
    expect(result).toMatchObject({
      phase: "read-contracts-assessed",
      deployment: {
        value: {
          move: { groups: { coins: { state: "unsupported", reason: "abi" } } },
        },
      },
    });
    expect(store.records.get(f.session.bindingKey)?.faults).toContainEqual({
      kind: "move-group",
      group: "coins",
      reason: "abi",
    });
    expect(
      store.records
        .get(f.session.bindingKey)
        ?.faults.every((x) => x.kind !== "identity"),
    ).toBe(true);
    const gate = new WalletReadAdmission(f.session, {
      capture: store.capture,
      subscribe: () => () => {},
    });
    expect(await gate.run("balances", async () => "public-balance")).toBe(
      "public-balance",
    );
    await expect(
      gate.run("freshCoins", async () => "public-coins"),
    ).resolves.toBe("public-coins");
    f.session.assertActive();
  });
  it.each(["partial", "HTTP503"] as const)(
    "真实已结束%s仅降级，原占位可以完成且不制造Fault",
    async (mode) => {
      const f = await networkCapabilitiesFixture(),
        store = new Store();
      const result = await observeReadCapabilities(
        f.session,
        {
          fetch: async (url, init) =>
            String(url) === f.profile.endpoints.graphqlUrl &&
            String(init?.body).includes("__schema")
              ? mode === "HTTP503"
                ? new Response("public-unavailable", { status: 503 })
                : Response.json({
                    data: null,
                    errors: [{ message: "public-partial" }],
                  })
              : f.fetch(url, init),
        },
        store,
      );
      expect(result.phase).toBe("read-contracts-assessed");
      expect(store.records.get(f.session.bindingKey)).toMatchObject({
        faults: [],
        pending: [],
      });
      expect(store.complete).toHaveBeenCalledTimes(1);
    },
  );
  it("忽略取消的实际fetch留原pending，迟到成功不第二次complete", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      signal = new AbortController(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    const run = observeReadCapabilities(
      f.session,
      {
        signal: signal.signal,
        fetch: async (...args) => {
          entered.resolve();
          await held.promise;
          return f.fetch(...args);
        },
      },
      store,
    );
    try {
      await entered.promise;
      signal.abort();
      expect(await run).toMatchObject({ phase: "unavailable" });
      expect(store.complete).not.toHaveBeenCalled();
      expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
    } finally {
      held.resolve();
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(store.complete).not.toHaveBeenCalled();
    await expect(
      store.begin(f.profile, [{ kind: "identity", role: "fullnode" }]),
    ).rejects.toMatchObject({ reason: "reviewing" });
  });
  it("正常完成写入失败不发布报告，也不第二次空complete", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    store.complete.mockRejectedValue(
      new WalletNetworkAdmissionStateError("unavailable"),
    );
    expect(
      await observeReadCapabilities(f.session, { fetch: f.fetch }, store),
    ).toMatchObject({ phase: "unavailable", reason: "transport" });
    expect(store.complete).toHaveBeenCalledTimes(1);
    expect(store.complete.mock.calls[0][2]).toEqual([]);
    expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
  });
  it("已知错链写入期间session取消且提交失败，保留负面视图及原pending", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    store.complete.mockImplementation(async () => {
      f.session.close();
      throw new WalletNetworkAdmissionStateError("unavailable");
    });
    const view = await observeReadCapabilities(
      f.session,
      {
        fetch: async (url, init) =>
          String(url) === f.profile.endpoints.graphqlUrl &&
          String(init?.body).includes("WalletGenesisIdentity")
            ? Response.json({ data: { checkpoint: { digest: wrong } } })
            : f.fetch(url, init),
      },
      store,
    );
    expect(view).toMatchObject({
      phase: "quarantined",
      role: "graphql",
      reason: "chain-mismatch",
    });
    expect(view).not.toHaveProperty("native");
    expect(store.complete).toHaveBeenCalledTimes(1);
    expect(store.complete.mock.calls[0][2]).toEqual([
      { kind: "identity", role: "graphql", reason: "chain-mismatch" },
    ]);
    expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
  });
  it("complete后原生重读发现新身份负面，不返回本轮正面", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    store.capture.mockImplementation(async (p) => {
      if (store.complete.mock.calls.length) {
        const row = store.records.get(networkBindingKey(p))!;
        return {
          ...row,
          faults: [
            {
              kind: "identity",
              role: "accountHistory",
              reason: "chain-mismatch",
            },
          ],
        };
      }
      return store.records.get(networkBindingKey(p));
    });
    expect(
      await observeReadCapabilities(f.session, { fetch: f.fetch }, store),
    ).toMatchObject({ phase: "quarantined", role: "accountHistory" });
    expect(store.capture).toHaveBeenCalledTimes(2);
  });
  it("受控合成审核pin进入真实SDK；registry拒绝不生成可信声明或身份负面", async () => {
    const f = await networkCapabilitiesFixture(),
      release = await reviewedDeploymentFixture(f.profile),
      store = new Store();
    const selected = await selectReviewedDeployment(
      f.profile,
      release.registry,
    );
    const spy = vi
      .spyOn(releaseConfig, "selectConfiguredDeployment")
      .mockResolvedValue(selected);
    expect(
      await observeReadCapabilities(f.session, { fetch: f.fetch }, store),
    ).toMatchObject({
      phase: "read-contracts-assessed",
      deployment: { value: { state: "reviewed-deployment-matched" } },
    });
    const g = await networkCapabilitiesFixture(),
      other = new Store();
    spy.mockResolvedValue({ state: "rejected", reason: "trust" });
    expect(
      await observeReadCapabilities(g.session, { fetch: g.fetch }, other),
    ).toMatchObject({
      phase: "read-contracts-assessed",
      deployment: { state: "incomplete", reason: "policy" },
    });
    expect(other.records.get(g.session.bindingKey)).toMatchObject({
      faults: [],
      pending: [],
    });
  });
});

it("recovery-only startup does not reserve a full scan or fabricate a positive capability view", async () => {
  const f = await networkCapabilitiesFixture(),
    store = new Store();
  const fetch = vi.fn(f.fetch);
  const result = await observeReadCapabilities(
    f.session,
    { fetch, recoverOnly: true },
    store,
  );
  expect(result).toMatchObject({ phase: "unavailable", reason: "policy" });
  expect(result).not.toHaveProperty("graphql");
  expect(store.capture).toHaveBeenCalled();
  expect(store.begin).not.toHaveBeenCalled();
  expect(store.complete).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  f.session.close();
});
it("recovery-only startup preserves stored negatives without requesting an empty completion", async () => {
  const { f, store } = await seeded({
    kind: "identity",
    role: "graphql",
    reason: "chain-mismatch",
  });
  const fetch = vi.fn(f.fetch);
  const result = await observeReadCapabilities(
    f.session,
    { fetch, recoverOnly: true },
    store,
  );
  expect(result).toMatchObject({ phase: "quarantined", role: "graphql" });
  expect(store.begin).not.toHaveBeenCalled();
  expect(store.complete).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(store.records.get(f.session.bindingKey)?.faults).toHaveLength(1);
  f.session.close();
});
it("recovery-only startup attempts the original full protocol when an unfinished observation exists", async () => {
  const f = await networkCapabilitiesFixture(),
    store = new Store();
  await store.begin(f.profile, [{ kind: "identity", role: "graphql" }]);
  store.begin.mockClear();
  const result = await observeReadCapabilities(
    f.session,
    { fetch: f.fetch, recoverOnly: true },
    store,
  );
  expect(store.begin).toHaveBeenCalledOnce();
  expect(store.begin.mock.calls[0][1]).toEqual(
    expect.arrayContaining([
      { kind: "graphql-domain", domain: "balances" },
      { kind: "move-group", group: "names" },
    ]),
  );
  expect(result.phase).toBe("unavailable");
  expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
  expect(store.complete).not.toHaveBeenCalled();
  f.session.close();
});
