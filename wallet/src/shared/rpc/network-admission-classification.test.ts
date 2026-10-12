// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual SDK/SDL protocol fixtures, not real deployment authority or native database evidence.
import { beforeAll, describe, expect, it } from "vitest";
import { NetworkIdentityError } from "./identity";
import { RpcError } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import {
  probeNetworkCapabilities,
  type WalletNetworkCapabilities,
} from "./network-capabilities";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import {
  classifyNetworkAdmissionError,
  classifyNetworkAdmissionCapabilities,
} from "./network-admission-classification";
import {
  createNetworkAdmissionTicket,
  reserveNetworkAdmissionObservation,
  completeNetworkAdmissionObservation,
  assertNetworkAdmissionClear,
} from "./network-admission-state";
import { WalletReadSession } from "./session";

describe("只把明确当前合同负面持久分类", () => {
  let f: Awaited<ReturnType<typeof networkCapabilitiesFixture>>,
    report: WalletNetworkCapabilities;
  beforeAll(async () => {
    f = await networkCapabilitiesFixture();
    report = await probeNetworkCapabilities(f.session, { fetch: f.fetch });
  });
  it("生产四族良好协议结果无负面，未审核部署不伪造ABI或错链", () => {
    expect(classifyNetworkAdmissionCapabilities(f.session, report)).toEqual([]);
    expect(report.deployment).toMatchObject({ value: { state: "unreviewed" } });
  });
  it.each(["chain-mismatch", "incompatible"] as const)(
    "实际生产identity探测拒绝后只分类已确认错误：%s",
    async (reason) => {
      let captured: unknown;
      try {
        await probeNetworkCapabilities(f.session, {
          fetch: async (url, init) => {
            if (
              String(url) === f.profile.endpoints.graphqlUrl &&
              String(init?.body).includes("WalletGenesisIdentity")
            )
              return Response.json({
                data: {
                  checkpoint: {
                    digest:
                      reason === "chain-mismatch"
                        ? toBase58(new Uint8Array(32).fill(8))
                        : "broken",
                  },
                },
              });
            return f.fetch(url, init);
          },
        });
      } catch (error) {
        captured = error;
      }
      expect(classifyNetworkAdmissionError(captured)).toEqual([
        { kind: "identity", role: "graphql", reason },
      ]);
    },
  );
  it.each(["fullnode", "graphql", "archive", "accountHistory"] as const)(
    "真实身份错误实例保留公开角色／原因：%s",
    (role) => {
      for (const reason of ["chain-mismatch", "incompatible"] as const)
        expect(
          classifyNetworkAdmissionError(new NetworkIdentityError(role, reason)),
        ).toEqual([{ kind: "identity", role, reason }]);
    },
  );
  it.each([
    new Error("chain-mismatch"),
    new RpcError("chain-mismatch", "UNAVAILABLE"),
    new DOMException("expired", "TimeoutError"),
    { name: "NetworkIdentityError", role: "graphql", reason: "chain-mismatch" },
    { errors: [{ data: { reason: "abi" } }] },
    null,
    undefined,
  ])("不解析名字／消息／data或瞬时失败，case %#", (error) => {
    expect(classifyNetworkAdmissionError(error)).toEqual([]);
  });
  it("实际完整有效SDL缺少Balance.addressBalance，生产报告给出对应schema负面，保留其它独立领域", async () => {
    const actual = await probeNetworkCapabilities(f.session, {
      fetch: async (url, init) => {
        const response = await f.fetch(url, init);
        if (
          String(url) === f.profile.endpoints.graphqlUrl &&
          String(init?.body).includes("__schema")
        ) {
          const json = await response.json(),
            address = json.data.__schema.types.find(
              (t: { name: string }) => t.name === "Balance",
            );
          const before = address.fields.length;
          address.fields = address.fields.filter(
            (v: { name: string }) => v.name !== "addressBalance",
          );
          if (address.fields.length !== before - 1)
            throw new Error("fixture schema field missing");
          return Response.json(json);
        }
        return response;
      },
    });
    const faults = classifyNetworkAdmissionCapabilities(f.session, actual);
    expect(faults).toContainEqual({
      kind: "graphql-domain",
      domain: "balances",
      reason: "schema",
    });
    expect(faults.some((row) => row.kind === "identity")).toBe(false);
    expect(actual.graphql).toMatchObject({
      value: {
        domains: {
          balances: { state: "unsupported", reason: "schema" },
          coinMetadata: { state: "snapshot-verified" },
        },
      },
    });
  });
  it("实际Package descriptor中的Coin ABI不同，生产探测分类ABI而不是依赖／缺审核pin", async () => {
    const g = await networkCapabilitiesFixture(),
      pkg = [...g.packages.values()].find((p) =>
        p.modules.some((m) => m.name === "coin"),
      )!,
      coin = pkg.modules
        .find((m) => m.name === "coin")!
        .datatypes.find((d) => d.name === "Coin")!;
    if (coin.fields.length !== 2) throw new Error("fixture coin layout");
    coin.fields[1].name = "wrong_balance";
    const actual = await probeNetworkCapabilities(g.session, {
        fetch: g.fetch,
      }),
      faults = classifyNetworkAdmissionCapabilities(g.session, actual);
    expect(faults).toContainEqual({
      kind: "move-group",
      group: "coins",
      reason: "abi",
    });
    expect(faults.every((row) => row.kind !== "identity")).toBe(true);
    expect(actual.deployment).toMatchObject({
      value: {
        state: "unreviewed",
        move: { groups: { coins: { state: "unsupported", reason: "abi" } } },
      },
    });
    g.session.close();
  });
  it.each(["partial", "HTTP503"] as const)(
    "当前schema仅降级，不持久伪造负面：%s",
    async (mode) => {
      const actual = await probeNetworkCapabilities(f.session, {
        fetch: async (url, init) => {
          if (
            String(url) === f.profile.endpoints.graphqlUrl &&
            String(init?.body).includes("__schema")
          ) {
            if (mode === "HTTP503")
              return new Response("unavailable", { status: 503 });
            return Response.json({
              data: null,
              errors: [
                {
                  message: "partial",
                  extensions: { code: "INTERNAL_SERVER_ERROR" },
                },
              ],
            });
          }
          return f.fetch(url, init);
        },
      });
      expect(classifyNetworkAdmissionCapabilities(f.session, actual)).toEqual(
        [],
      );
      expect(actual.graphql.state).not.toBe("observed");
    },
  );
  it("违反IAddressable的SDL响应不冒作已确认领域schema负面", async () => {
    const actual = await probeNetworkCapabilities(f.session, {
      fetch: async (url, init) => {
        const response = await f.fetch(url, init);
        if (
          String(url) === f.profile.endpoints.graphqlUrl &&
          String(init?.body).includes("__schema")
        ) {
          const json = await response.json(),
            address = json.data.__schema.types.find(
              (t: { name: string }) => t.name === "Address",
            );
          address.fields = address.fields.filter(
            (v: { name: string }) => v.name !== "balances",
          );
          return Response.json(json);
        }
        return response;
      },
    });
    expect(actual.graphql).toEqual({ state: "incomplete", reason: "response" });
    expect(classifyNetworkAdmissionCapabilities(f.session, actual)).toEqual([]);
  });
  it("缺全部可选入口／模板保持unconfigured或contract-not-reviewed，不伪造ABI", async () => {
    const g = await networkCapabilitiesFixture({
      profile: (p) => {
        delete p.endpoints.graphqlUrl;
        delete p.endpoints.archiveGrpcWeb;
        delete p.endpoints.accountHistoryUrl;
        p.packages.kiosk = "0x9";
        delete p.packages.personalKiosk;
        delete p.packages.originByte;
      },
    });
    const actual = await probeNetworkCapabilities(g.session, {
      fetch: g.fetch,
    });
    expect(classifyNetworkAdmissionCapabilities(g.session, actual)).toEqual([]);
    g.session.close();
  });
  it("schema／ABI以外的预算、依赖、缺包、pin差异、未审核等明确不分类", () => {
    const source = structuredClone(report);
    if (
      source.graphql.state !== "observed" ||
      source.deployment.state !== "observed" ||
      !source.deployment.value.move
    )
      throw new Error("fixture");
    Object.assign(source.graphql.value.domains, {
      assets: { state: "incomplete", reason: "partial" },
      staking: { state: "syncing", reason: "coverage" },
      balances: { state: "unavailable", reason: "transport" },
    });
    Object.assign(source.deployment.value.move.groups, {
      coins: { state: "incomplete", reason: "dependency" },
      kiosk: { state: "unsupported", reason: "kiosk-package" },
      originByteExecution: {
        state: "unsupported",
        reason: "contract-not-reviewed",
      },
    });
    Object.assign(source.deployment.value, {
      state: "declaration-rejected",
      declaration: { state: "rejected", reason: "trust" },
      packages: [
        { packageId: f.profile.packages.kiosk!, state: "pin-mismatch" },
      ],
    });
    expect(classifyNetworkAdmissionCapabilities(f.session, source)).toEqual([]);
  });
  it("普通后来生产正面报告不清除先前负面，正面不是存储写接口", () => {
    const area = { kind: "identity", role: "graphql" } as const,
      t = createNetworkAdmissionTicket([area]),
      q = completeNetworkAdmissionObservation(
        f.profile,
        reserveNetworkAdmissionObservation(f.profile, undefined, t),
        t,
        classifyNetworkAdmissionError(
          new NetworkIdentityError("graphql", "chain-mismatch"),
        ),
      );
    expect(classifyNetworkAdmissionCapabilities(f.session, report)).toEqual([]);
    expect(() => assertNetworkAdmissionClear(f.profile, q)).toThrow(
      expect.objectContaining({ reason: "quarantined" }),
    );
  });
  it("不同binding／同profile的新session及关闭session不沿用报告", () => {
    const next = new WalletReadSession(f.profile);
    expect(() => classifyNetworkAdmissionCapabilities(next, report)).toThrow(
      NetworkIdentityError,
    );
    next.close();
    expect(() => classifyNetworkAdmissionCapabilities(next, report)).toThrow(
      expect.objectContaining({ name: "StaleWalletSessionError" }),
    );
    expect(() =>
      classifyNetworkAdmissionCapabilities(f.session, {
        ...report,
        bindingKey: "foreign",
      }),
    ).toThrow(NetworkIdentityError);
  });
});
