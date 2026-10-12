// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress, toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import { FRESH_OBJECT_MASK } from "./fresh-object";
import {
  grpcPacket,
  movePackageFixtures,
  packageObject,
} from "./move-package-fixture";
import { probeMovePackageCapabilities } from "./move-package-capabilities";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile, type WalletNetworkProfile } from "./profile";
import { StaleWalletSessionError, WalletReadSession } from "./session";

type Call = { method: string; packageId?: string; objectRound: number };
function fixture(
  options: {
    profile?: WalletNetworkProfile;
    info?: (round: number) => Partial<GrpcTypes.GetServiceInfoResponse>;
    mutate?: (values: ReturnType<typeof movePackageFixtures>) => void;
    intercept?: (call: Call) => Response | Promise<Response> | undefined;
  } = {},
) {
  const profile = options.profile ?? profileFixture();
  profile.packages.originByte ??= {
    discoveryPackage: "0x7",
    executionPackage: "0x7",
  };
  const session = new WalletReadSession(validateNetworkProfile(profile));
  const values = movePackageFixtures(session.profile);
  options.mutate?.(values);
  const calls: Call[] = [];
  const objectCounts = new Map<string, number>();
  let info = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(String(url)).toMatch(
      /^http:\/\/127\.0\.0\.1:9000\/fullnode\/rtd\.rpc\.v2\./,
    );
    const method = String(url).split("rtd.rpc.v2.")[1],
      body = (init!.body as Uint8Array).subarray(5);
    let packageId: string | undefined;
    if (method === "LedgerService/GetObject") {
      const r = GrpcTypes.GetObjectRequest.fromBinary(body);
      packageId = r.objectId;
      expect(r).toEqual({
        objectId: packageId,
        readMask: { paths: [...FRESH_OBJECT_MASK] },
      });
      objectCounts.set(packageId!, (objectCounts.get(packageId!) ?? 0) + 1);
    } else if (method === "MovePackageService/GetPackage")
      packageId = GrpcTypes.GetPackageRequest.fromBinary(body).packageId;
    else expect(method).toBe("LedgerService/GetServiceInfo");
    const call = {
      method,
      packageId,
      objectRound: objectCounts.get(packageId!) ?? 0,
    };
    calls.push(call);
    const injected = options.intercept?.(call);
    if (injected !== undefined) return injected;
    if (method === "LedgerService/GetServiceInfo")
      return grpcPacket(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: BigInt(100 + ++info),
          lowestAvailableCheckpoint: 0n,
          lowestAvailableCheckpointObjects: 0n,
          ...options.info?.(info),
        }),
      );
    if (method === "LedgerService/GetObject")
      return grpcPacket(
        GrpcTypes.GetObjectResponse.toBinary({
          object: values.objects.get(packageId!),
        }),
      );
    return grpcPacket(
      GrpcTypes.GetPackageResponse.toBinary({
        package: values.packages.get(packageId!),
      }),
    );
  });
  return { session, fetch, calls, values };
}
describe("实际binary SDK包合同探测", () => {
  it("按本轮唯一package去重／对象包围，目录ABI匹配；名字合同可验但无ready", async () => {
    const f = fixture(),
      r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(f.calls).toHaveLength(17);
    expect(r.packages).toHaveLength(5);
    for (const pkg of r.packages) {
      expect(pkg.result.state).toBe("association-verified");
      if (pkg.result.state !== "association-verified") throw new Error();
      expect(pkg.result.association).toMatchObject({
        storageId: pkg.packageId,
        originalIdVerification: "version-one-verified",
        version: "1",
        descriptorSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(Object.isFrozen(pkg.result.association.modules)).toBe(true);
      expect(Object.isFrozen(pkg.result)).toBe(true);
      expect(
        f.calls.filter(
          (c) =>
            c.packageId === pkg.packageId &&
            c.method === "MovePackageService/GetPackage",
        ),
      ).toHaveLength(1);
    }
    for (const name of [
      "framework",
      "standardLibrary",
      "readerSupport",
      "coins",
      "staking",
      "dynamicFields",
      "display",
      "names",
      "kiosk",
      "personalKiosk",
      "originByteDiscovery",
      "originByteExecution",
    ] as const)
      expect(r.groups[name].state).toBe("abi-compatible");
    expect(r.groups.names.state).toBe("abi-compatible");
    expect(r).toMatchObject({
      state: "selected-contracts-compatible",
      catalogClosure: "reviewed-wallet-contracts",
      deployment: "not-verified",
      registry: "not-verified",
      executionSemantics: "not-verified",
    });
    expect(r).not.toHaveProperty("ready");
    expect(r).not.toHaveProperty("client");
    expect(Object.isFrozen(r.groups)).toBe(true);
    await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(f.calls).toHaveLength(34);
  });
  it("实际profile形状：无kiosk／PK／name但OriginByte依赖framework完整ABI", async () => {
    const profile = profileFixture();
    profile.packages = {
      originByte: { discoveryPackage: "0x7", executionPackage: "0x7" },
    };
    const f = fixture({ profile }),
      r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.state).toBe("selected-contracts-compatible");
    expect(f.calls).toHaveLength(14);
    expect(r.groups.kiosk.state).toBe("unconfigured");
    expect(r.groups.personalKiosk.state).toBe("unconfigured");
    expect(r.groups.names.state).toBe("unconfigured");
    expect(r.groups.originByteExecution.state).toBe("abi-compatible");
    expect(r.catalogClosure).toBe("reviewed-wallet-contracts");
  });
  it("ABI不兼容只影响对应领域及传递依赖，保留无关包关联", async () => {
    const f = fixture({
      mutate: (v) => {
        v.packages
          .get(normalizeRtdAddress("0x2"))!
          .modules.find((m) => m.name === "kiosk")!
          .datatypes[0].fields.reverse();
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.kiosk).toEqual({ state: "unsupported", reason: "abi" });
    expect(r.groups.framework.state).toBe("abi-compatible");
    expect(r.groups.coins.state).toBe("abi-compatible");
    expect(r.groups.originByteDiscovery).toEqual({
      state: "unsupported",
      reason: "abi",
    });
    expect(r.groups.originByteExecution).toEqual({
      state: "incomplete",
      reason: "dependency",
    });
    expect(r.groups.personalKiosk).toEqual({
      state: "unsupported",
      reason: "abi",
    });
    expect(
      r.packages.every((p) => p.result.state === "association-verified"),
    ).toBe(true);
  });
  it("ABI复杂度超限是incomplete预算，依赖领域撤值", async () => {
    const f = fixture({
      mutate: (v) => {
        v.packages
          .get(normalizeRtdAddress("0x2"))!
          .modules.find(
            (m) => m.name === "kiosk",
          )!.datatypes[0].fields[0].type!.typeParameterInstantiation =
          Array.from({ length: 33 }, () => ({
            type: GrpcTypes.OpenSignatureBody_Type.ADDRESS,
            typeParameterInstantiation: [],
          }));
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.kiosk).toEqual({
      state: "incomplete",
      reason: "budget",
    });
    expect(r.groups.originByteExecution).toEqual({
      state: "incomplete",
      reason: "dependency",
    });
  });
  it("PersonalKiosk显式缺framework配置时不能由其包ABI成功掩盖", async () => {
    const profile = profileFixture();
    delete profile.packages.kiosk;
    const f = fixture({ profile }),
      r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.personalKiosk).toEqual({
      state: "incomplete",
      reason: "dependency",
    });
  });
  it("Coin函数不兼容仅撤销Coin及staking依赖，名字与Kiosk仍可审核", async () => {
    const f = fixture({
      mutate: (values) => {
        values.packages
          .get(normalizeRtdAddress("0x2"))!
          .modules.find((m) => m.name === "coin")!.functions[0].returns = [];
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.coins).toEqual({ state: "unsupported", reason: "abi" });
    expect(r.groups.staking).toEqual({
      state: "incomplete",
      reason: "dependency",
    });
    expect(r.groups.names.state).toBe("abi-compatible");
    expect(r.groups.kiosk.state).toBe("abi-compatible");
    expect(r.groups.originByteExecution.state).toBe("abi-compatible");
  });
  it("名称记录ABI不兼容不从registry配置猜可用，无关Coin／staking保持", async () => {
    const f = fixture({
      mutate: (values) => {
        values.packages
          .get(normalizeRtdAddress("0x4"))!
          .modules.find((m) => m.name === "name_record")!
          .datatypes[0].fields.reverse();
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.names).toEqual({ state: "unsupported", reason: "abi" });
    expect(r.groups.coins.state).toBe("abi-compatible");
    expect(r.groups.staking.state).toBe("abi-compatible");
    expect(r.registry).toBe("not-verified");
  });
  it("Std String变化传递到依赖reader，Coin接口保持独立", async () => {
    const f = fixture({
      mutate: (values) => {
        values.packages
          .get(normalizeRtdAddress("0x1"))!
          .modules.find(
            (m) => m.name === "string",
          )!.datatypes[0].fields[0].type!.type =
          GrpcTypes.OpenSignatureBody_Type.U8;
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(r.groups.standardLibrary).toEqual({
      state: "unsupported",
      reason: "abi",
    });
    expect(r.groups.readerSupport.state).toBe("incomplete");
    expect(r.groups.staking.state).toBe("incomplete");
    expect(r.groups.names.state).toBe("incomplete");
    expect(r.groups.coins.state).toBe("abi-compatible");
  });
  it.each([5, 12, 14])(
    "包请求失败trailer%s不接纳，其他包仍可核验",
    async (status) => {
      const f = fixture({
        intercept: (c) =>
          c.method === "MovePackageService/GetPackage" &&
          c.packageId === normalizeRtdAddress("0x7")
            ? grpcPacket(new Uint8Array(), status)
            : undefined,
      });
      const r = await probeMovePackageCapabilities(f.session, {
        fetch: f.fetch,
      });
      expect(r.groups.framework.state).toBe("abi-compatible");
      expect(r.groups.originByteDiscovery.state).toBe("incomplete");
      expect(
        r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
          .result,
      ).toEqual(
        status === 5
          ? { state: "incomplete", reason: "missing-positive" }
          : { state: "unavailable", reason: "transport" },
      );
    },
  );
  it("缺对象不当不存在正例成功", async () => {
    const f = fixture({
      intercept: (c) =>
        c.method === "LedgerService/GetObject" &&
        c.packageId === normalizeRtdAddress("0x7")
          ? grpcPacket(GrpcTypes.GetObjectResponse.toBinary({}))
          : undefined,
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(
      r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
        .result,
    ).toEqual({ state: "incomplete", reason: "missing-positive" });
  });
  it("缺包描述符和有合法payload但失败trailer仍不接纳", async () => {
    for (const status of [0, 14]) {
      let payload: GrpcTypes.Package | undefined;
      const f = fixture({
        mutate: (values) => {
          payload = values.packages.get(normalizeRtdAddress("0x7"));
        },
        intercept: (c) =>
          c.method === "MovePackageService/GetPackage" &&
          c.packageId === normalizeRtdAddress("0x7")
            ? grpcPacket(
                GrpcTypes.GetPackageResponse.toBinary(
                  status === 0 ? {} : { package: payload },
                ),
                status,
              )
            : undefined,
      });
      const r = await probeMovePackageCapabilities(f.session, {
        fetch: f.fetch,
      });
      expect(
        r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
          .result,
      ).toEqual(
        status === 0
          ? { state: "incomplete", reason: "missing-positive" }
          : { state: "unavailable", reason: "transport" },
      );
    }
  });
  it("包selector／版本／origin错误不当ABI支持", async () => {
    const f = fixture({
      mutate: (v) => {
        v.packages.get(normalizeRtdAddress("0x7"))!.version = 2n;
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(
      r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
        .result,
    ).toEqual({ state: "incomplete", reason: "association" });
  });
  it("系统包在GetPackage期间升级改变稳定对象引用则整包撤值", async () => {
    const f = fixture({
      intercept: (c) => {
        if (
          c.method !== "LedgerService/GetObject" ||
          c.packageId !== normalizeRtdAddress("0x2") ||
          c.objectRound !== 2
        )
          return;
        const changed = structuredClone(f.values.packages.get(c.packageId)!);
        changed.version = 2n;
        return grpcPacket(
          GrpcTypes.GetObjectResponse.toBinary({
            object: packageObject(changed),
          }),
        );
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(
      r.packages.find((p) => p.packageId === normalizeRtdAddress("0x2"))!
        .result,
    ).toEqual({ state: "incomplete", reason: "changed" });
    expect(r.groups.originByteExecution.state).toBe("incomplete");
  });
  it("升级originalId不假装从bytecode独立解析，稳定版本与定义来源仍关联", async () => {
    const f = fixture({
      mutate: (v) => {
        const pkg = v.packages.get(normalizeRtdAddress("0x7"))!;
        pkg.version = 2n;
        pkg.originalId = normalizeRtdAddress("0x9");
        v.objects.set(pkg.storageId!, packageObject(pkg));
      },
    });
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(
      r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
        .result,
    ).toMatchObject({
      state: "association-verified",
      association: {
        originalId: normalizeRtdAddress("0x9"),
        originalIdVerification: "service-declaration",
      },
    });
  });
  it.each([1, 2])(
    "开始或末验同链H0不匹配拒绝所有合同，第%i轮",
    async (round) => {
      const f = fixture({
        info: (n) =>
          n === round
            ? {
                chainId: toBase58(new Uint8Array(32).fill(9)),
                checkpointHeight: undefined,
              }
            : {},
      });
      await expect(
        probeMovePackageCapabilities(f.session, { fetch: f.fetch }),
      ).rejects.toMatchObject({ role: "fullnode", reason: "chain-mismatch" });
      if (round === 1) expect(f.calls).toHaveLength(1);
    },
  );
  it.each([
    (n: number) => ({ checkpointHeight: n === 1 ? 100n : 99n }),
    (n: number) => ({ lowestAvailableCheckpoint: n === 1 ? 1n : 0n }),
    () => ({ lowestAvailableCheckpointObjects: undefined }),
  ])("身份倒退／最低倒退／字段缺失拒绝整个结果", async (info) => {
    const f = fixture({ info });
    await expect(
      probeMovePackageCapabilities(f.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ reason: "incompatible" });
  });
  it.each(["lowestAvailableCheckpoint", "lowestAvailableCheckpointObjects"])(
    "合法%s前进使包报告失效，不持久隔离网络身份",
    async (field) => {
      const f = fixture({ info: (n) => ({ [field]: n === 1 ? 0n : 1n }) });
      await expect(
        probeMovePackageCapabilities(f.session, { fetch: f.fetch }),
      ).rejects.toMatchObject({
        name: "WalletNativeReadWindowChangedError",
        code: "ABORTED",
        reason: "changed",
      });
    },
  );
  it("2MiB预算保留明确分类并取消stream", async () => {
    const cancel = vi.fn();
    const f = fixture({
      intercept: (c) =>
        c.method === "MovePackageService/GetPackage" &&
        c.packageId === normalizeRtdAddress("0x7")
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
    const r = await probeMovePackageCapabilities(f.session, { fetch: f.fetch });
    expect(
      r.packages.find((p) => p.packageId === normalizeRtdAddress("0x7"))!
        .result,
    ).toEqual({ state: "incomplete", reason: "budget" });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([0, 60_001, 0.5])("非法总期限%s在IO前拒绝", async (timeoutMs) => {
    const f = fixture();
    await expect(
      probeMovePackageCapabilities(f.session, { fetch: f.fetch, timeoutMs }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("caller取消可结束忽略abort的读取，底层迟到不发表", async () => {
    const f = fixture(),
      controller = new AbortController();
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>(() => late);
    const pending = probeMovePackageCapabilities(f.session, {
      fetch,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("cancelled");
    complete(grpcPacket(new Uint8Array()));
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("已取消caller在任何IO前拒绝", async () => {
    const f = fixture(),
      controller = new AbortController();
    controller.abort(new Error("pre-aborted"));
    await expect(
      probeMovePackageCapabilities(f.session, {
        fetch: f.fetch,
        signal: controller.signal,
      }),
    ).rejects.toThrow("pre-aborted");
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("身份与包请求共用一个期限及signal，迟到不能继续发新请求", async () => {
    const f = fixture();
    let complete!: (r: Response) => void;
    const late = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const signals: AbortSignal[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
      signals.push(init!.signal!);
      return String(input).endsWith("LedgerService/GetServiceInfo")
        ? f.fetch(input, init)
        : late;
    });
    const pending = probeMovePackageCapabilities(f.session, {
      fetch,
      timeoutMs: 30,
    });
    await expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    expect(signals.length).toBeGreaterThan(1);
    expect(signals.every((signal) => signal === signals[0])).toBe(true);
    const count = fetch.mock.calls.length;
    complete(grpcPacket(new Uint8Array()));
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fetch).toHaveBeenCalledTimes(count);
  });
  it("hash期间关闭会话禁止发布成功", async () => {
    const f = fixture(),
      original = crypto.subtle.digest.bind(crypto.subtle);
    const hash = vi
      .spyOn(crypto.subtle, "digest")
      .mockImplementation(async (...args) => {
        const value = await original(...args);
        f.session.close();
        return value;
      });
    try {
      await expect(
        probeMovePackageCapabilities(f.session, { fetch: f.fetch }),
      ).rejects.toBeInstanceOf(StaleWalletSessionError);
    } finally {
      hash.mockRestore();
    }
  });
});
