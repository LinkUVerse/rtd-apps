// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import { freshObjectDigest, FRESH_OBJECT_MASK } from "./fresh-object";
import {
  NATIVE_READ_PROBE_METHODS,
  probeNativeServiceCapabilities,
} from "./native-service-capabilities";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { StaleWalletSessionError, WalletReadSession } from "./session";

const id = normalizeRtdAddress("0x2"),
  h0 = profileFixture().expectedGenesisDigest;
function packet(bytes: Uint8Array, trailer = false) {
  const framed = new Uint8Array(bytes.length + 5);
  framed[0] = trailer ? 128 : 0;
  new DataView(framed.buffer).setUint32(1, bytes.length, false);
  framed.set(bytes, 5);
  return framed;
}
function response(bytes: Uint8Array, status = 0) {
  const data = packet(bytes),
    trailer = packet(
      new TextEncoder().encode(`grpc-status: ${status}\r\n`),
      true,
    );
  const out = new Uint8Array(data.length + trailer.length);
  out.set(data);
  out.set(trailer, data.length);
  return new Response(out, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
function packageObject(): GrpcTypes.Object {
  const previousTransaction = toBase58(new Uint8Array(32).fill(2));
  const bytes = bcs.Object.serialize({
    data: {
      Package: {
        id,
        version: "1",
        moduleMap: new Map(),
        typeOriginTable: [],
        linkageTable: new Map(),
      },
    },
    owner: { Immutable: null },
    previousTransaction,
    storageRebate: "0",
  }).toBytes();
  return {
    objectId: id,
    version: 1n,
    digest: freshObjectDigest(bytes),
    bcs: { value: bytes },
    owner: { kind: GrpcTypes.Owner_OwnerKind.IMMUTABLE },
    objectType: "package",
    previousTransaction,
  };
}
type Call = {
  role: "fullnode" | "archive";
  method: string;
  bytes: Uint8Array;
  infoRound: number;
};
function fixture(
  options: {
    noArchive?: boolean;
    info?: (
      role: Call["role"],
      round: number,
    ) => Partial<GrpcTypes.GetServiceInfoResponse>;
    intercept?: (call: Call) => Response | Promise<Response> | undefined;
  } = {},
) {
  const profile = profileFixture();
  if (options.noArchive) delete profile.endpoints.archiveGrpcWeb;
  const session = new WalletReadSession(validateNetworkProfile(profile));
  const counts = { fullnode: 0, archive: 0 };
  const calls: Call[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const role = String(url).startsWith(
      session.profile.endpoints.fullnodeGrpcWeb + "/",
    )
      ? "fullnode"
      : "archive";
    expect(String(url)).toMatch(
      /^https?:\/\/(127\.0\.0\.1:9000\/fullnode|localhost:9001\/archive)\/rtd\.rpc\.v2\./,
    );
    const method = String(url).split("rtd.rpc.v2.")[1];
    expect(NATIVE_READ_PROBE_METHODS[role]).toContain(method);
    const bytes = (init!.body as Uint8Array).subarray(5);
    if (method === "LedgerService/GetServiceInfo") counts[role]++;
    const call: Call = { role, method, bytes, infoRound: counts[role] };
    calls.push(call);
    const injected = options.intercept?.(call);
    if (injected !== undefined) return injected;
    switch (method) {
      case "LedgerService/GetServiceInfo":
        return response(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: h0,
            checkpointHeight: BigInt(20 + counts[role]),
            lowestAvailableCheckpoint: 0n,
            lowestAvailableCheckpointObjects: 0n,
            ...options.info?.(role, counts[role]),
          }),
        );
      case "LedgerService/GetCheckpoint": {
        const request = GrpcTypes.GetCheckpointRequest.fromBinary(bytes);
        expect(request.readMask?.paths).toEqual(["sequence_number", "digest"]);
        expect(request.checkpointId.oneofKind).toBe("sequenceNumber");
        return response(
          GrpcTypes.GetCheckpointResponse.toBinary({
            checkpoint: {
              sequenceNumber:
                request.checkpointId.oneofKind === "sequenceNumber"
                  ? request.checkpointId.sequenceNumber
                  : undefined,
              digest:
                request.checkpointId.oneofKind === "sequenceNumber" &&
                request.checkpointId.sequenceNumber === 0n
                  ? h0
                  : toBase58(new Uint8Array(32).fill(7)),
              transactions: [],
            },
          }),
        );
      }
      case "LedgerService/GetObject": {
        const request = GrpcTypes.GetObjectRequest.fromBinary(bytes);
        expect(request).toEqual({
          objectId: id,
          readMask: { paths: [...FRESH_OBJECT_MASK] },
        });
        return response(
          GrpcTypes.GetObjectResponse.toBinary({ object: packageObject() }),
        );
      }
      case "StateService/GetCoinInfo": {
        expect(GrpcTypes.GetCoinInfoRequest.fromBinary(bytes).coinType).toBe(
          normalizeStructTag("0x2::rtd::RTD"),
        );
        return response(
          GrpcTypes.GetCoinInfoResponse.toBinary({
            coinType: "0x2::rtd::RTD",
            metadata: { id: "0xa", decimals: 9, name: "RTD", symbol: "RTD" },
          }),
        );
      }
      case "MovePackageService/GetDatatype": {
        expect(GrpcTypes.GetDatatypeRequest.fromBinary(bytes)).toEqual({
          packageId: id,
          moduleName: "object",
          name: "UID",
        });
        return response(
          GrpcTypes.GetDatatypeResponse.toBinary({
            datatype: {
              typeName: "0x2::object::UID",
              definingId: id,
              module: "object",
              name: "UID",
              abilities: [],
              typeParameters: [],
              kind: GrpcTypes.DatatypeDescriptor_DatatypeKind.STRUCT,
              fields: [
                {
                  name: "id",
                  type: {
                    type: GrpcTypes.OpenSignatureBody_Type.DATATYPE,
                    typeName: "0x2::object::ID",
                    typeParameter: undefined,
                    typeParameterInstantiation: [],
                  },
                },
              ],
              variants: [],
            },
          }),
        );
      }
      case "MovePackageService/GetFunction": {
        expect(GrpcTypes.GetFunctionRequest.fromBinary(bytes)).toEqual({
          packageId: id,
          moduleName: "object",
          name: "id",
        });
        return response(
          GrpcTypes.GetFunctionResponse.toBinary({
            function: {
              name: "id",
              isEntry: false,
              visibility: GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
              typeParameters: [],
              parameters: [
                {
                  body: {
                    type: GrpcTypes.OpenSignatureBody_Type.TYPE_PARAMETER,
                    typeParameter: 0,
                    typeParameterInstantiation: [],
                  },
                },
              ],
              returns: [
                {
                  body: {
                    type: GrpcTypes.OpenSignatureBody_Type.DATATYPE,
                    typeName: "0x2::object::ID",
                    typeParameterInstantiation: [],
                  },
                },
              ],
            },
          }),
        );
      }
      default:
        throw new Error("unexpected method");
    }
  });
  return { session, fetch, calls, counts };
}

describe("原生只读正例能力", () => {
  it("实际SDK binary、逐方法正例、同链前后包围，冻结声明但无ready／ABI／client", async () => {
    const f = fixture();
    const result = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(result).toMatchObject({
      state: "native-probes-verified",
      bindingKey: f.session.bindingKey,
      readSessionKey: f.session.cacheKey,
      deployment: "not-verified",
      nonReadMethods: "not-probed",
      packageRegistryCompatibility: "not-verified",
    });
    expect(f.calls).toHaveLength(10);
    expect(f.counts).toEqual({ fullnode: 2, archive: 2 });
    for (const role of ["fullnode", "archive"] as const) {
      const endpoint = result.endpoints[role];
      expect(endpoint.state).toBe("probes-verified");
      if (endpoint.state !== "probes-verified") throw new Error();
      expect(Object.keys(endpoint.methods)).toEqual(
        NATIVE_READ_PROBE_METHODS[role],
      );
      for (const row of Object.values(endpoint.methods)) {
        expect(row).toMatchObject({
          state: "positive-read-verified",
          responseSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        });
        expect(Object.isFrozen(row)).toBe(true);
      }
      expect(Object.isFrozen(endpoint.methods)).toBe(true);
      expect(Object.isFrozen(endpoint)).toBe(true);
    }
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.endpoints)).toBe(true);
    expect(result).not.toHaveProperty("client");
    expect(result).not.toHaveProperty("ready");
    await probeNativeServiceCapabilities(f.session, { fetch: f.fetch });
    expect(f.calls).toHaveLength(20);
  });
  it("未配置归档不推导URL且保持显式负状态", async () => {
    const f = fixture({ noArchive: true });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.archive).toEqual({ state: "unconfigured" });
    expect(f.calls).toHaveLength(7);
  });
  it("最低保留大于0时查实际可读选择器，不借H0查询越界", async () => {
    const f = fixture({
      info: () => ({
        lowestAvailableCheckpoint: 10n,
        lowestAvailableCheckpointObjects: 11n,
      }),
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.archive).toMatchObject({
      state: "probes-verified",
      methods: { "LedgerService/GetCheckpoint": { selector: "10" } },
    });
  });
  it.each([12, 5, 14])("失败trailer不成为成功：%s", async (status) => {
    const f = fixture({
      intercept: (call) =>
        call.method === "StateService/GetCoinInfo"
          ? response(new Uint8Array(), status)
          : undefined,
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.state).toBe("native-probes-degraded");
    expect(r.endpoints.fullnode).toMatchObject({
      state: "probes-degraded",
      methods: {
        "StateService/GetCoinInfo": {
          state: "unverified",
          reason:
            status === 12
              ? "unsupported"
              : status === 5
                ? "missing-positive"
                : "unavailable",
        },
        "LedgerService/GetObject": { state: "positive-read-verified" },
      },
    });
    expect(f.counts.fullnode).toBe(2);
  });
  it.each([
    [
      "LedgerService/GetObject",
      GrpcTypes.GetObjectResponse.toBinary({}),
      "missing-positive",
    ],
    [
      "StateService/GetCoinInfo",
      GrpcTypes.GetCoinInfoResponse.toBinary({ coinType: "0x2::rtd::RTD" }),
      "missing-positive",
    ],
    [
      "MovePackageService/GetDatatype",
      GrpcTypes.GetDatatypeResponse.toBinary({}),
      "missing-positive",
    ],
    [
      "MovePackageService/GetFunction",
      GrpcTypes.GetFunctionResponse.toBinary({}),
      "missing-positive",
    ],
    [
      "StateService/GetCoinInfo",
      GrpcTypes.GetCoinInfoResponse.toBinary({
        coinType: "0x2::bad::BAD",
        metadata: { id: "0xa", decimals: 9, name: "x", symbol: "x" },
      }),
      "incompatible",
    ],
    [
      "LedgerService/GetCheckpoint",
      GrpcTypes.GetCheckpointResponse.toBinary({
        checkpoint: {
          sequenceNumber: 1n,
          digest: h0,
          transactions: [],
        },
      }),
      "incompatible",
    ],
    [
      "LedgerService/GetObject",
      GrpcTypes.GetObjectResponse.toBinary({
        object: { ...packageObject(), objectId: "0x3" },
      }),
      "incompatible",
    ],
    [
      "MovePackageService/GetDatatype",
      GrpcTypes.GetDatatypeResponse.toBinary({
        datatype: {
          typeName: "0x3::object::UID",
          definingId: id,
          name: "UID",
          module: "object",
          abilities: [],
          typeParameters: [],
          fields: [],
          variants: [],
        },
      }),
      "incompatible",
    ],
    [
      "MovePackageService/GetFunction",
      GrpcTypes.GetFunctionResponse.toBinary({
        function: {
          name: "other",
          typeParameters: [],
          parameters: [],
          returns: [],
        },
      }),
      "incompatible",
    ],
  ] as const)("缺正例／错误响应逐项拒绝 %s", async (method, bytes, reason) => {
    const f = fixture({
      intercept: (call) =>
        call.role === "fullnode" && call.method === method
          ? response(bytes)
          : undefined,
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.fullnode).toMatchObject({
      state: "probes-degraded",
      methods: { [method]: { state: "unverified", reason } },
    });
    expect(r.endpoints.archive.state).toBe("probes-verified");
  });
  it.each([1, 2])("开始或末验错链全部拒绝：第%i轮", async (round) => {
    const f = fixture({
      info: (role, n) =>
        role === "archive" && n === round
          ? {
              chainId: toBase58(new Uint8Array(32).fill(9)),
              checkpointHeight: undefined,
            }
          : {},
    });
    await expect(
      probeNativeServiceCapabilities(f.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ role: "archive", reason: "chain-mismatch" });
  });
  it("可读H0检查点digest错链优先，即使其他角色不可用", async () => {
    const f = fixture({
      intercept: (call) =>
        call.role === "archive"
          ? new Response("raw-secret", { status: 503 })
          : call.method === "LedgerService/GetCheckpoint"
            ? response(
                GrpcTypes.GetCheckpointResponse.toBinary({
                  checkpoint: {
                    sequenceNumber: 0n,
                    digest: toBase58(new Uint8Array(32).fill(9)),
                    transactions: [],
                  },
                }),
              )
            : undefined,
    });
    await expect(
      probeNativeServiceCapabilities(f.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ role: "fullnode", reason: "chain-mismatch" });
  });
  it.each([
    () => ({ checkpointHeight: undefined }),
    () => ({ lowestAvailableCheckpoint: 100n }),
    (n: number) => ({ checkpointHeight: n === 1 ? 20n : 19n }),
    (n: number) => ({ lowestAvailableCheckpoint: n === 1 ? 1n : 0n }),
    (n: number) => ({ lowestAvailableCheckpointObjects: n === 1 ? 1n : 0n }),
  ])("身份不完整／水位倒退不发表角色结果", async (info) => {
    const f = fixture({
      info: (role, n) => (role === "fullnode" ? info(n) : {}),
    });
    await expect(
      probeNativeServiceCapabilities(f.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ role: "fullnode", reason: "incompatible" });
  });
  it.each(["lowestAvailableCheckpoint", "lowestAvailableCheckpointObjects"])(
    "合法%s前进只使本次角色窗口失效，不冒称身份不兼容",
    async (field) => {
      const f = fixture({
        info: (role, n) =>
          role === "fullnode" ? { [field]: n === 1 ? 0n : 1n } : {},
      });
      const result = await probeNativeServiceCapabilities(f.session, {
        fetch: f.fetch,
      });
      expect(result.state).toBe("native-probes-degraded");
      expect(result.endpoints.fullnode).toEqual({
        state: "unavailable",
        reason: "changed",
      });
    },
  );
  it("HTTP失败不泄漏原文／不从上次成功取值", async () => {
    const f = fixture();
    await probeNativeServiceCapabilities(f.session, { fetch: f.fetch });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: async () => new Response("secret", { status: 503 }),
    });
    expect(r.state).toBe("native-probes-degraded");
    expect(r.endpoints.fullnode).toEqual({
      state: "unavailable",
      reason: "unavailable",
    });
    expect(JSON.stringify(r)).not.toContain("secret");
  });
  it("有效正例数据后的失败trailer仍不可接纳", async () => {
    const f = fixture({
      intercept: (c) =>
        c.method === "StateService/GetCoinInfo"
          ? response(
              GrpcTypes.GetCoinInfoResponse.toBinary({
                coinType: "0x2::rtd::RTD",
                metadata: {
                  id: "0xa",
                  decimals: 9,
                  name: "RTD",
                  symbol: "RTD",
                },
              }),
              5,
            )
          : undefined,
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.fullnode).toMatchObject({
      methods: {
        "StateService/GetCoinInfo": {
          state: "unverified",
          reason: "missing-positive",
        },
      },
    });
  });
  it("未知signature类型不能当基础descriptor正例", async () => {
    const f = fixture({
      intercept: (c) =>
        c.method === "MovePackageService/GetFunction"
          ? response(
              GrpcTypes.GetFunctionResponse.toBinary({
                function: {
                  name: "id",
                  isEntry: false,
                  visibility: GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
                  typeParameters: [],
                  parameters: [{ body: { typeParameterInstantiation: [] } }],
                  returns: [
                    {
                      body: {
                        type: GrpcTypes.OpenSignatureBody_Type.U64,
                        typeParameterInstantiation: [],
                      },
                    },
                  ],
                },
              }),
            )
          : undefined,
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.fullnode).toMatchObject({
      methods: {
        "MovePackageService/GetFunction": {
          state: "unverified",
          reason: "incompatible",
        },
      },
    });
  });
  it("已经收到的错链优先于另一角色忽略abort造成的期限耗尽", async () => {
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const f = fixture({
      intercept: (c) =>
        c.role === "archive"
          ? late
          : c.method === "LedgerService/GetCheckpoint"
            ? response(
                GrpcTypes.GetCheckpointResponse.toBinary({
                  checkpoint: {
                    sequenceNumber: 0n,
                    digest: toBase58(new Uint8Array(32).fill(9)),
                    transactions: [],
                  },
                }),
              )
            : undefined,
    });
    await expect(
      probeNativeServiceCapabilities(f.session, {
        fetch: f.fetch,
        timeoutMs: 100,
      }),
    ).rejects.toMatchObject({ role: "fullnode", reason: "chain-mismatch" });
    complete(response(new Uint8Array()));
  });
  it("2MiB单响应预算拒绝并取消stream，其他方法独立", async () => {
    const cancel = vi.fn();
    const f = fixture({
      intercept: (c) =>
        c.method === "MovePackageService/GetFunction"
          ? new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
                },
                cancel,
              }),
            )
          : undefined,
    });
    const r = await probeNativeServiceCapabilities(f.session, {
      fetch: f.fetch,
    });
    expect(r.endpoints.fullnode).toMatchObject({
      methods: {
        "MovePackageService/GetFunction": {
          state: "unverified",
          reason: "budget",
        },
      },
    });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([0, 60_001, 0.5])("无效总期限在请求前拒绝%s", async (timeoutMs) => {
    const f = fixture();
    await expect(
      probeNativeServiceCapabilities(f.session, { fetch: f.fetch, timeoutMs }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("已取消不发请求", async () => {
    const f = fixture();
    const c = new AbortController();
    c.abort(new Error("cancelled"));
    await expect(
      probeNativeServiceCapabilities(f.session, {
        fetch: f.fetch,
        signal: c.signal,
      }),
    ).rejects.toThrow("cancelled");
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("底层忽略abort时结束调用但不接纳迟到请求", async () => {
    const f = fixture();
    const c = new AbortController();
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>(() => late);
    const result = probeNativeServiceCapabilities(f.session, {
      fetch,
      signal: c.signal,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    c.abort(new Error("cancelled"));
    await expect(result).rejects.toThrow("cancelled");
    complete(response(new Uint8Array()));
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("总期限共享，超时不逐角色重置", async () => {
    const f = fixture();
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const result = probeNativeServiceCapabilities(f.session, {
      fetch: () => late,
      timeoutMs: 5,
    });
    await expect(result).rejects.toMatchObject({ name: "TimeoutError" });
    complete(response(new Uint8Array()));
  });
  it("关闭session拒绝底层迟到成功", async () => {
    const f = fixture();
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>(() => late);
    const result = probeNativeServiceCapabilities(f.session, { fetch });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    f.session.close();
    await expect(result).rejects.toBeInstanceOf(StaleWalletSessionError);
    complete(response(new Uint8Array()));
  });
  it("计算响应SHA期间关闭会话仍拒绝发布", async () => {
    const f = fixture();
    const original = crypto.subtle.digest.bind(crypto.subtle);
    const hash = vi
      .spyOn(crypto.subtle, "digest")
      .mockImplementation(async (...args) => {
        const value = await original(...args);
        f.session.close();
        return value;
      });
    try {
      await expect(
        probeNativeServiceCapabilities(f.session, { fetch: f.fetch }),
      ).rejects.toBeInstanceOf(StaleWalletSessionError);
    } finally {
      hash.mockRestore();
    }
  });
});
