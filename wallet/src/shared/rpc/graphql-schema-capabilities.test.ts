// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSchema, introspectionFromSchema } from "graphql";
import { describe, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import {
  probeGraphQLSchemaCapabilities,
  WalletSchemaCapabilityError,
  WALLET_SCHEMA_INTROSPECTION_QUERY,
} from "./graphql-schema-capabilities";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";

const sdl = readFileSync(
  resolve(
    process.cwd(),
    "../../rtd/crates/rtd-indexer-alt-graphql/schema.graphql",
  ),
  "utf8",
);
const declaration = introspectionFromSchema(buildSchema(sdl), {
  descriptions: false,
});
function session(graphql = true) {
  const profile = profileFixture();
  if (!graphql) delete profile.endpoints.graphqlUrl;
  return new WalletReadSession(validateNetworkProfile(profile));
}
function payload() {
  return {
    data: {
      ...structuredClone(declaration),
      walletGenesis: { digest: profileFixture().expectedGenesisDigest },
    },
  };
}
function transport(body: unknown = payload()) {
  return vi.fn<typeof fetch>(async (input, init) => {
    expect(String(input)).toBe(profileFixture().endpoints.graphqlUrl);
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const request = JSON.parse(String(init?.body));
    expect(request.query).toBe(WALLET_SCHEMA_INTROSPECTION_QUERY);
    expect(request.variables).toEqual({});
    expect(request.query).not.toMatch(
      /\bmutation\b|simulateTransaction\s*\(|executeTransaction\s*\(/,
    );
    return Response.json(body);
  });
}
function type(data: ReturnType<typeof payload>, name: string) {
  return data.data.__schema.types.find((t) => t.name === name) as any;
}
function field(data: ReturnType<typeof payload>, parent: string, name: string) {
  return type(data, parent).fields.find((f: any) => f.name === name);
}
async function changed(change: (data: ReturnType<typeof payload>) => void) {
  const data = payload();
  change(data);
  return probeGraphQLSchemaCapabilities(session(), { fetch: transport(data) });
}

describe("GraphQL完整schema与已审核查询合同", () => {
  it("实际SDK发一次全新H0＋自省查询，十一个合同兼容也不宣称wallet ready或释放client", async () => {
    const readSession = session(),
      fetch = transport();
    const report = await probeGraphQLSchemaCapabilities(readSession, { fetch });
    expect(report).toMatchObject({
      state: "schema-compatible",
      bindingKey: readSession.bindingKey,
      readSessionKey: readSession.cacheKey,
      contractVersion: 1,
      metadata: { oneOf: "verified", inputValueDeprecation: "not-requested" },
      genesisDigest: readSession.profile.expectedGenesisDigest,
    });
    expect(report).not.toHaveProperty("client");
    expect(report).not.toHaveProperty("ready");
    if (report.state === "unconfigured") throw new Error("configured");
    expect(Object.values(report.contracts)).toEqual(
      Array(11).fill("compatible"),
    );
    expect(report.schemaSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.contracts)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const next = await probeGraphQLSchemaCapabilities(readSession, { fetch });
    expect(next).toMatchObject({ schemaSha256: report.schemaSha256 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("未配置明确返回unconfigured且零请求", async () => {
    const fetch = transport();
    expect(
      await probeGraphQLSchemaCapabilities(session(false), { fetch }),
    ).toMatchObject({ state: "unconfigured" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([0, 60_001, 0.5])("非法期限%s不能启动请求", async (timeoutMs) => {
    const fetch = transport();
    await expect(
      probeGraphQLSchemaCapabilities(session(), { fetch, timeoutMs }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("完整H0错链拒绝，schema成功不能掩盖", async () => {
    await expect(
      changed((data) => {
        data.data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(77));
      }),
    ).rejects.toMatchObject({ role: "graphql", reason: "chain-mismatch" });
  });
  it("旧短链标签拒绝", async () => {
    await expect(
      changed((data) => {
        data.data.walletGenesis.digest = "12345678";
      }),
    ).rejects.toMatchObject({ role: "graphql", reason: "incompatible" });
  });
  it.each([502, 403])(
    "HTTP%s不能算schema成功，远端正文不透传",
    async (status) => {
      const fetch = vi.fn<typeof globalThis.fetch>(
        async () => new Response("private-service-detail", { status }),
      );
      await expect(
        probeGraphQLSchemaCapabilities(session(), { fetch }),
      ).rejects.toEqual(new WalletSchemaCapabilityError("unavailable"));
    },
  );
  it.each([
    { errors: [{ message: "private-service-detail" }] },
    { errors: "malformed" },
  ])("有data但errors不完整拒绝", async (extra) => {
    await expect(
      probeGraphQLSchemaCapabilities(session(), {
        fetch: transport({ ...payload(), ...extra }),
      }),
    ).rejects.toEqual(new WalletSchemaCapabilityError("partial"));
  });
  it("自省关闭不会用此前schema正事实兜底", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(payload()))
      .mockResolvedValueOnce(
        Response.json({
          data: null,
          errors: [{ message: "introspection disabled" }],
        }),
      );
    const current = session();
    expect(
      await probeGraphQLSchemaCapabilities(current, { fetch }),
    ).toMatchObject({ state: "schema-compatible" });
    await expect(
      probeGraphQLSchemaCapabilities(current, { fetch }),
    ).rejects.toMatchObject({ reason: "partial" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("不兼容自省不能只因Query名字存在而成功", async () => {
    await expect(
      changed((data) => {
        (data.data.__schema as any).queryType.name = "UnknownQuery";
      }),
    ).rejects.toEqual(new WalletSchemaCapabilityError("incompatible"));
  });
  it("类型数量超预算拒绝", async () => {
    await expect(
      changed((data) => {
        (data.data.__schema as any).types = Array(513).fill(
          data.data.__schema.types[0],
        );
      }),
    ).rejects.toMatchObject({ reason: "budget" });
  });
  it("字段数量超预算在构建schema前拒绝", async () => {
    await expect(
      changed((data) => {
        type(data, "Balance").fields = Array(8193).fill(
          field(data, "Balance", "totalBalance"),
        );
      }),
    ).rejects.toMatchObject({ reason: "budget" });
  });
  it("实际流体超过2MiB拒绝并取消，不信伪小content-length", async () => {
    let cancelled = false;
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.enqueue(new Uint8Array(128 * 1024));
            },
            cancel() {
              cancelled = true;
            },
          }),
          {
            headers: {
              "content-length": "1",
              "content-type": "application/json",
            },
          },
        ),
    );
    await expect(
      probeGraphQLSchemaCapabilities(session(), { fetch }),
    ).rejects.toMatchObject({ reason: "budget" });
    expect(cancelled).toBe(true);
  });
  it("嵌套余额字段缺失只降级对应合同，不能替换成空余额", async () => {
    const report = await changed((data) => {
      type(data, "Balance").fields = type(data, "Balance").fields.filter(
        (f: any) => f.name !== "addressBalance",
      );
    });
    expect(report).toMatchObject({
      state: "schema-degraded",
      contracts: { balances: "unsupported", coinMetadata: "compatible" },
    });
    expect(report).not.toHaveProperty("balances");
  });
  it("同名叶子改标量仍可能通过GraphQL query校验，但不匹配decoder合同", async () => {
    const report = await changed((data) => {
      field(data, "Balance", "totalBalance").type = {
        kind: "SCALAR",
        name: "String",
      };
    });
    expect(report).toMatchObject({
      state: "schema-degraded",
      contracts: { balances: "unsupported" },
    });
  });
  it("nullable变化不能按同名字段放行", async () => {
    const report = await changed((data) => {
      const f = field(data, "Balance", "totalBalance");
      f.type =
        f.type.kind === "NON_NULL"
          ? f.type.ofType
          : { kind: "NON_NULL", name: null, ofType: f.type };
    });
    expect(report).toMatchObject({ contracts: { balances: "unsupported" } });
  });
  it("参数标量改变不能按可接受相同整数literal放行", async () => {
    const report = await changed((data) => {
      const arg = field(data, "Query", "transactions").args.find(
        (a: any) => a.name === "last",
      );
      arg.type = { kind: "SCALAR", name: "UInt53" };
    });
    expect(report).toMatchObject({
      contracts: { indexedTransactions: "unsupported" },
    });
  });
  it("移除分页参数使对应查询合同降级", async () => {
    const report = await changed((data) => {
      const f = field(data, "Query", "transactions");
      f.args = f.args.filter((a: any) => a.name !== "before");
    });
    expect(report).toMatchObject({
      contracts: { indexedTransactions: "unsupported" },
    });
  });
  it("新增必填参数不能放行", async () => {
    const report = await changed((data) => {
      field(data, "Query", "coinMetadata").args.push({
        name: "mandatory",
        type: {
          kind: "NON_NULL",
          name: null,
          ofType: { kind: "SCALAR", name: "String" },
        },
        defaultValue: null,
      });
    });
    expect(report).toMatchObject({
      contracts: { coinMetadata: "unsupported" },
    });
  });
  it("移除变量输入对象中的type字段不能放行", async () => {
    const report = await changed((data) => {
      type(data, "ObjectFilter").inputFields = type(
        data,
        "ObjectFilter",
      ).inputFields.filter((f: any) => f.name !== "type");
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: "unsupported", stakingObjects: "unsupported" },
    });
  });
  it.each([false, true])("输入对象新增字段，required=%s", async (required) => {
    const report = await changed((data) => {
      type(data, "ObjectFilter").inputFields.push({
        name: "extension",
        type: required
          ? {
              kind: "NON_NULL",
              name: null,
              ofType: { kind: "SCALAR", name: "String" },
            }
          : { kind: "SCALAR", name: "String" },
        defaultValue: null,
      });
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: required ? "unsupported" : "compatible" },
    });
  });
  it("枚举输入收缩不能仅靠变量类型名放行", async () => {
    const report = await changed((data) => {
      type(data, "OwnerKind").enumValues.pop();
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: "unsupported" },
    });
  });
  it("input oneOf改变不能只按同名字段和标量放行", async () => {
    const report = await changed((data) => {
      type(data, "ObjectFilter").isOneOf = true;
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: "unsupported" },
    });
  });
  it("省略已请求的oneOf元数据不能按false默许", async () => {
    await expect(
      changed((data) => {
        delete type(data, "ObjectFilter").isOneOf;
      }),
    ).rejects.toMatchObject({ reason: "incompatible" });
  });
  it("availableRange过滤默认值改变须重审范围合同", async () => {
    const report = await changed((data) => {
      field(data, "ServiceConfig", "availableRange").args.find(
        (a: any) => a.name === "filters",
      ).defaultValue = '["unexpected"]';
    });
    expect(report).toMatchObject({ contracts: { snapshot: "unsupported" } });
  });
  it("名为constructor的新必填输入字段不能被Object原型键绕过", async () => {
    const report = await changed((data) => {
      type(data, "ObjectFilter").inputFields.push({
        name: "constructor",
        type: {
          kind: "NON_NULL",
          name: null,
          ofType: { kind: "SCALAR", name: "String" },
        },
        defaultValue: null,
      });
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: "unsupported" },
    });
  });
  it("未带字段的Immutable union分支改变仍须重审decoder合同", async () => {
    const report = await changed((data) => {
      type(data, "Owner").possibleTypes = type(
        data,
        "Owner",
      ).possibleTypes.filter((t: any) => t.name !== "Immutable");
    });
    expect(report).toMatchObject({
      contracts: { ownedObjects: "unsupported" },
    });
  });
  it("调用前取消零请求", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = transport();
    await expect(
      probeGraphQLSchemaCapabilities(session(), {
        fetch,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("迟到成功不能跨已关闭会话发布", async () => {
    let release!: (value: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(
      () =>
        new Promise((r) => {
          release = r;
        }),
    );
    const current = session(),
      promise = probeGraphQLSchemaCapabilities(current, { fetch });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    current.close();
    release(Response.json(payload()));
    await expect(promise).rejects.toMatchObject({
      name: "StaleWalletSessionError",
    });
  });
  it("超时传播给实际fetch，不发布旧成功值", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_, init) =>
        new Promise((_, reject) => {
          init!.signal!.addEventListener(
            "abort",
            () => reject(init!.signal!.reason),
            { once: true },
          );
        }),
    );
    await expect(
      probeGraphQLSchemaCapabilities(session(), { fetch, timeoutMs: 20 }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });
  it("摘要计算期间关闭会话仍不发布能力", async () => {
    const current = session(),
      digest = crypto.subtle.digest.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "digest").mockImplementation(async (...args) => {
      const value = await digest(...args);
      current.close();
      return value;
    });
    await expect(
      probeGraphQLSchemaCapabilities(current, { fetch: transport() }),
    ).rejects.toMatchObject({ name: "StaleWalletSessionError" });
  });
});
