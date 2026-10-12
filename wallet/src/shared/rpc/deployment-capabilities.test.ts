// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Synthetic protocol/release pins only, never an actual deployment signature or Move execution proof.
import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import {
  deploymentSha256,
  NAME_REGISTRY_FIELD_BCS,
  nameRegistryFieldId,
  verifyReviewedDeployment,
} from "./deployment-contract";
import { probeDeploymentCapabilities } from "./deployment-capabilities";
import { freshObjectDigest, FRESH_OBJECT_MASK } from "./fresh-object";
import {
  grpcPacket,
  movePackageFixtures,
  packageObject,
} from "./move-package-fixture";
import { networkBindingKey, validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { WalletReadSession } from "./session";

const id = normalizeRtdAddress;
const bodyType = (
  typeName: string,
  typeParameterInstantiation: GrpcTypes.OpenSignatureBody[] = [],
): GrpcTypes.OpenSignatureBody => ({
  type: GrpcTypes.OpenSignatureBody_Type.DATATYPE,
  typeName: normalizeStructTag(typeName),
  typeParameterInstantiation,
});
function descriptorFixture(pkg: string): GrpcTypes.DatatypeDescriptor[] {
  const T = GrpcTypes.OpenSignatureBody_Type,
    A = GrpcTypes.Ability;
  const datatype = (
    module: string,
    name: string,
    abilities: GrpcTypes.Ability[],
    fields: [string, GrpcTypes.OpenSignatureBody][],
    typeParameters: GrpcTypes.TypeParameter[] = [],
  ): GrpcTypes.DatatypeDescriptor => ({
    typeName: normalizeStructTag(`${pkg}::${module}::${name}`),
    definingId: pkg,
    module,
    name,
    abilities,
    typeParameters,
    kind: GrpcTypes.DatatypeDescriptor_DatatypeKind.STRUCT,
    fields: fields.map(([name, type], position) => ({ name, type, position })),
    variants: [],
  });
  return [
    datatype(
      "registry",
      "Registry",
      [A.STORE],
      [
        [
          "registry",
          bodyType("0x2::table::Table", [
            bodyType(`${pkg}::domain::Domain`),
            bodyType(`${pkg}::name_record::NameRecord`),
          ]),
        ],
        [
          "reverse_registry",
          bodyType("0x2::table::Table", [
            { type: T.ADDRESS, typeParameterInstantiation: [] },
            bodyType(`${pkg}::domain::Domain`),
          ]),
        ],
      ],
    ),
    datatype(
      "suins",
      "RegistryKey",
      [A.COPY, A.DROP, A.STORE],
      [["dummy_field", { type: T.BOOL, typeParameterInstantiation: [] }]],
      [{ constraints: [], isPhantom: true }],
    ),
  ];
}
function moveObject(
  objectId: string,
  type: string,
  contents: Uint8Array,
  owner: Parameters<typeof bcs.Object.serialize>[0]["owner"],
  version = "1",
): GrpcTypes.Object {
  const tag = TypeTagSerializer.parseFromStr(type, true);
  if (!("struct" in tag)) throw new Error("fixture struct");
  const previousTransaction = toBase58(new Uint8Array(32).fill(2));
  const bytes = bcs.Object.serialize({
    data: {
      Move: {
        type: { Other: tag.struct },
        hasPublicTransfer: false,
        version,
        contents,
      },
    },
    owner,
    previousTransaction,
    storageRebate: "0",
  }).toBytes();
  return {
    objectId,
    version: BigInt(version),
    objectType: normalizeStructTag(type),
    digest: freshObjectDigest(bytes),
    owner:
      "Shared" in owner
        ? {
            kind: GrpcTypes.Owner_OwnerKind.SHARED,
            version: BigInt(owner.Shared.initialSharedVersion),
          }
        : "ObjectOwner" in owner
          ? {
              kind: GrpcTypes.Owner_OwnerKind.OBJECT,
              address:
                typeof owner.ObjectOwner === "string"
                  ? owner.ObjectOwner
                  : bcs.Address.parse(Uint8Array.from(owner.ObjectOwner)),
            }
          : { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: id("0xa") },
    bcs: { value: bytes },
    contents: { value: contents },
    previousTransaction,
    hasPublicTransfer: false,
  };
}
type Call = {
  method: string;
  objectId?: string;
  objectRound: number;
  infoRound: number;
};
async function fixture(
  options: {
    names?: boolean;
    intercept?: (call: Call) => Response | Promise<Response> | undefined;
    info?: (round: number) => Partial<GrpcTypes.GetServiceInfoResponse>;
    mutate?: (values: ReturnType<typeof movePackageFixtures>) => void;
  } = {},
) {
  const raw = profileFixture();
  raw.packages = {
    ...(options.names === false ? {} : { name: raw.packages.name }),
    originByte: { discoveryPackage: "0x7", executionPackage: "0x7" },
  };
  const profile = validateNetworkProfile(raw),
    session = new WalletReadSession(profile),
    values = movePackageFixtures(profile);
  const rootId = id("0x8"),
    pkgId = id("0x4"),
    fieldId = nameRegistryFieldId(pkgId, rootId);
  if (profile.packages.name) {
    const pkg = values.packages.get(pkgId)!;
    for (const d of descriptorFixture(pkgId)) {
      const module = { name: d.module, datatypes: [d], functions: [] };
      pkg.modules.push(module);
    }
    values.objects.set(pkgId, packageObject(pkg));
    values.objects.set(
      rootId,
      moveObject(
        rootId,
        `${pkgId}::suins::SuiNS`,
        bcs
          .struct("Root", { id: bcs.Address, balance: bcs.u64() })
          .serialize({ id: rootId, balance: "0" })
          .toBytes(),
        { Shared: { initialSharedVersion: "1" } },
      ),
    );
    values.objects.set(
      fieldId,
      moveObject(
        fieldId,
        `0x2::dynamic_field::Field<${pkgId}::suins::RegistryKey<${pkgId}::registry::Registry>,${pkgId}::registry::Registry>`,
        NAME_REGISTRY_FIELD_BCS.serialize({
          id: fieldId,
          name: { dummy_field: false },
          value: {
            registry: { id: profile.packages.name.forwardRegistry, size: "0" },
            reverse_registry: {
              id: profile.packages.name.reverseRegistry,
              size: "0",
            },
          },
        }).toBytes(),
        { ObjectOwner: rootId },
      ),
    );
  }
  // The expected fixture pin is recorded before optional runtime corruption.
  const declaration = {
    schemaVersion: 1,
    reviewId: "synthetic-release-fixture",
    profileBindingKey: networkBindingKey(profile),
    packages: await Promise.all(
      [...values.packages].map(async ([storageId, pkg]) => ({
        storageId,
        originalId: pkg.originalId!,
        version: pkg.version!.toString(),
        objectBcsSha256: await deploymentSha256(
          values.objects.get(storageId)!.bcs!.value!,
        ),
        modules: await Promise.all(
          pkg.modules.map(async (m) => ({
            name: m.name!,
            bytecodeSha256: await deploymentSha256(new Uint8Array([1, 2, 3])),
          })),
        ),
      })),
    ),
    nameRegistry: profile.packages.name
      ? {
          layout: "suins-v1",
          rootId,
          initialSharedVersion: "1",
          registryFieldId: fieldId,
        }
      : null,
  };
  const pin = async () => {
    const json = JSON.stringify(declaration);
    return {
      json,
      trustedSha256: await deploymentSha256(new TextEncoder().encode(json)),
    };
  };
  options.mutate?.(values);
  let infoRound = 0;
  const counts = new Map<string, number>(),
    calls: Call[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(String(url)).toMatch(
      /^http:\/\/127\.0\.0\.1:9000\/fullnode\/rtd\.rpc\.v2\./,
    );
    const method = String(url).split("rtd.rpc.v2.")[1],
      bytes = (init!.body as Uint8Array).subarray(5);
    let objectId: string | undefined;
    if (method === "LedgerService/GetObject") {
      const request = GrpcTypes.GetObjectRequest.fromBinary(bytes);
      objectId = request.objectId;
      expect(request.readMask?.paths).toEqual([...FRESH_OBJECT_MASK]);
      counts.set(objectId!, (counts.get(objectId!) ?? 0) + 1);
    } else if (method === "MovePackageService/GetPackage")
      objectId = GrpcTypes.GetPackageRequest.fromBinary(bytes).packageId;
    else {
      expect(method).toBe("LedgerService/GetServiceInfo");
      ++infoRound;
    }
    const call = {
      method,
      objectId,
      objectRound: counts.get(objectId!) ?? 0,
      infoRound,
    };
    calls.push(call);
    const injected = options.intercept?.(call);
    if (injected !== undefined) return injected;
    if (method === "LedgerService/GetServiceInfo")
      return grpcPacket(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: profile.expectedGenesisDigest,
          checkpointHeight: BigInt(100 + infoRound),
          lowestAvailableCheckpoint: 0n,
          lowestAvailableCheckpointObjects: 0n,
          ...options.info?.(infoRound),
        }),
      );
    if (method === "LedgerService/GetObject")
      return grpcPacket(
        GrpcTypes.GetObjectResponse.toBinary({
          object: values.objects.get(objectId!),
        }),
      );
    return grpcPacket(
      GrpcTypes.GetPackageResponse.toBinary({
        package: values.packages.get(objectId!),
      }),
    );
  });
  return {
    profile,
    session,
    values,
    declaration,
    pin,
    fetch,
    calls,
    rootId,
    fieldId,
  };
}
describe("独立发布pin与嵌入名称Registry", () => {
  it("新鲜包／ABI及共享根／Registry字段匹配，双Table不是独立GetObject目标", async () => {
    const f = await fixture(),
      r = await probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      });
    expect(r.state).toBe("reviewed-deployment-matched");
    expect(r.registry).toMatchObject({
      state: "anchor-matched",
      forwardSize: "0",
      reverseSize: "0",
    });
    expect(r.packages.every((p) => p.state === "pin-matched")).toBe(true);
    expect(r.declaration).toMatchObject({
      state: "release-pin-matched",
      authority: "caller-pinned-release",
    });
    expect(r).toMatchObject({
      bindingKey: f.session.bindingKey,
      readSessionKey: f.session.cacheKey,
      executionSemantics: "not-verified",
      scope: "reviewed-move-deployment",
      serviceDeployment: "not-verified",
    });
    expect(r).not.toHaveProperty("ready");
    expect(r).not.toHaveProperty("client");
    expect(f.calls).toHaveLength(24);
    expect(
      f.calls.filter(
        (c) =>
          c.objectId === f.profile.packages.name!.forwardRegistry ||
          c.objectId === f.profile.packages.name!.reverseRegistry,
      ),
    ).toHaveLength(0);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.packages)).toBe(true);
    await probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: await f.pin(),
    });
    expect(f.calls).toHaveLength(48);
  });
  it.each([true, false])(
    "声明缺失names=%s：仍新鲜查包，但不把观察自签为部署证据",
    async (names) => {
      const f = await fixture({ names }),
        r = await probeDeploymentCapabilities(f.session, { fetch: f.fetch });
      expect(r.state).toBe("unreviewed");
      expect(r.declaration.state).toBe("missing");
      expect(r.registry.state).toBe(names ? "unreviewed" : "unconfigured");
      expect(f.calls).toHaveLength(names ? 17 : 14);
    },
  );
  it("未配置名称仍需基础全部package pin，不能推导默认名称", async () => {
    const f = await fixture({ names: false }),
      r = await probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      });
    expect(r.state).toBe("reviewed-deployment-matched");
    expect(r.registry.state).toBe("unconfigured");
    expect(f.calls).toHaveLength(14);
  });
  it.each(["storage", "original", "version", "bcs", "modules"])(
    "包%s pin冲突明确降级",
    async (field) => {
      const f = await fixture({ names: false });
      const p = f.declaration.packages[0];
      if (field === "storage") p.storageId = id("0xff");
      if (field === "original") p.originalId = id("0xff");
      if (field === "version") p.version = "2";
      if (field === "bcs") p.objectBcsSha256 = "a".repeat(64);
      if (field === "modules") p.modules[0].bytecodeSha256 = "b".repeat(64);
      const r = await probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      });
      expect(r.state).toBe(
        field === "storage"
          ? "declaration-rejected"
          : "reviewed-deployment-degraded",
      );
      if (field !== "storage") expect(r.packages[0].state).toBe("pin-mismatch");
      else expect(f.calls).toHaveLength(0);
    },
  );
  it.each([
    "root-owner",
    "root-type",
    "root-initial",
    "field-owner",
    "field-type",
    "tables-swapped",
    "suffix",
    "true-key",
    "uid-mismatch",
  ])("%s不能通过名称锚", async (fault) => {
    const f = await fixture(),
      root = f.values.objects.get(f.rootId)!,
      field = f.values.objects.get(f.fieldId)!;
    if (fault === "root-owner")
      f.values.objects.set(
        f.rootId,
        moveObject(f.rootId, root.objectType!, root.contents!.value!, {
          ObjectOwner: id("0xa"),
        }),
      );
    if (fault === "root-type")
      f.values.objects.set(
        f.rootId,
        moveObject(
          f.rootId,
          `${id("0x4")}::suins::Other`,
          root.contents!.value!,
          { Shared: { initialSharedVersion: "1" } },
        ),
      );
    if (fault === "root-initial")
      f.values.objects.set(
        f.rootId,
        moveObject(f.rootId, root.objectType!, root.contents!.value!, {
          Shared: { initialSharedVersion: "2" },
        }),
      );
    if (fault === "field-owner")
      f.values.objects.set(
        f.fieldId,
        moveObject(f.fieldId, field.objectType!, field.contents!.value!, {
          ObjectOwner: id("0xa"),
        }),
      );
    if (fault === "field-type")
      f.values.objects.set(
        f.fieldId,
        moveObject(
          f.fieldId,
          `${id("0x4")}::registry::Registry`,
          field.contents!.value!,
          { ObjectOwner: f.rootId },
        ),
      );
    if (
      ["tables-swapped", "suffix", "true-key", "uid-mismatch"].includes(fault)
    ) {
      const v = NAME_REGISTRY_FIELD_BCS.parse(field.contents!.value!);
      if (fault === "tables-swapped")
        [v.value.registry.id, v.value.reverse_registry.id] = [
          v.value.reverse_registry.id,
          v.value.registry.id,
        ];
      if (fault === "true-key") v.name.dummy_field = true;
      if (fault === "uid-mismatch") v.id = id("0xa");
      const bytes = NAME_REGISTRY_FIELD_BCS.serialize(v).toBytes();
      f.values.objects.set(
        f.fieldId,
        moveObject(
          f.fieldId,
          field.objectType!,
          fault === "suffix" ? new Uint8Array([...bytes, 0]) : bytes,
          { ObjectOwner: f.rootId },
        ),
      );
    }
    const r = await probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: await f.pin(),
    });
    expect(r.state).toBe("reviewed-deployment-degraded");
    expect(r.registry).toEqual({ state: "incomplete", reason: "registry" });
  });
  it.each(["Registry", "RegistryKey"])(
    "来源ABI %s错误不能由字段值匹配掩盖",
    async (name) => {
      const f = await fixture({
        mutate: (v) => {
          const pkg = v.packages.get(id("0x4"))!;
          pkg.modules
            .flatMap((m) => m.datatypes)
            .find((d) => d.name === name)!.abilities = [];
          v.objects.set(id("0x4"), packageObject(pkg));
        },
      });
      const r = await probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      });
      expect(r.registry).toEqual({ state: "incomplete", reason: "abi" });
    },
  );
  it("字段读间实际变动撤销，mutable size不要求等于发布时size", async () => {
    let f: Awaited<ReturnType<typeof fixture>>;
    f = await fixture({
      intercept: (c) => {
        if (c.objectId === f.fieldId && c.objectRound === 2) {
          const old = f.values.objects.get(f.fieldId)!,
            v = NAME_REGISTRY_FIELD_BCS.parse(old.contents!.value!);
          v.value.registry.size = "1";
          return grpcPacket(
            GrpcTypes.GetObjectResponse.toBinary({
              object: moveObject(
                f.fieldId,
                old.objectType!,
                NAME_REGISTRY_FIELD_BCS.serialize(v).toBytes(),
                { ObjectOwner: f.rootId },
                "2",
              ),
            }),
          );
        }
      },
    });
    const r = await probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: await f.pin(),
    });
    expect(r.registry).toEqual({ state: "incomplete", reason: "changed" });
  });
  it.each(["null", "not-found", "trailer", "http", "oversize"])(
    "字段%s分类且不是成功正例",
    async (fault) => {
      let f: Awaited<ReturnType<typeof fixture>>;
      f = await fixture({
        intercept: (c) => {
          if (c.objectId !== f.fieldId) return;
          if (fault === "null")
            return grpcPacket(GrpcTypes.GetObjectResponse.toBinary({}));
          if (fault === "not-found") return grpcPacket(new Uint8Array(), 5);
          if (fault === "trailer")
            return grpcPacket(
              GrpcTypes.GetObjectResponse.toBinary({
                object: f.values.objects.get(f.fieldId),
              }),
              14,
            );
          if (fault === "http") return new Response(null, { status: 503 });
          return new Response(new Uint8Array(2 * 1024 * 1024 + 1));
        },
      });
      const r = await probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      });
      expect(r.registry).toEqual({
        state: "incomplete",
        reason: ["null", "not-found"].includes(fault)
          ? "missing-positive"
          : fault === "oversize"
            ? "budget"
            : "transport",
      });
    },
  );
  it.each(["chain", "height", "lower", "objects"])(
    "名称结束%s身份／保留窗口错误优先，不给部分成功",
    async (fault) => {
      const f = await fixture({
        info: (round) =>
          round === 4
            ? fault === "chain"
              ? { chainId: toBase58(new Uint8Array(32).fill(9)) }
              : fault === "height"
                ? { checkpointHeight: 99n }
                : fault === "lower"
                  ? { lowestAvailableCheckpoint: 1n }
                  : { lowestAvailableCheckpointObjects: 1n }
            : {},
      });
      await expect(
        probeDeploymentCapabilities(f.session, {
          fetch: f.fetch,
          declaration: await f.pin(),
        }),
      ).rejects.toMatchObject({
        name: ["lower", "objects"].includes(fault)
          ? "WalletNativeReadWindowChangedError"
          : "NetworkIdentityError",
        reason:
          fault === "chain"
            ? "chain-mismatch"
            : fault === "height"
              ? "incompatible"
              : "changed",
      });
    },
  );
  it("名称局部失败后结束错链仍优先", async () => {
    let f: Awaited<ReturnType<typeof fixture>>;
    f = await fixture({
      intercept: (c) =>
        c.objectId === f.fieldId
          ? new Response(null, { status: 503 })
          : undefined,
      info: (round) =>
        round === 4 ? { chainId: toBase58(new Uint8Array(32).fill(9)) } : {},
    });
    await expect(
      probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration: await f.pin(),
      }),
    ).rejects.toMatchObject({ reason: "chain-mismatch" });
  });
  it("结束后关闭session不会沿用历史部署报告", async () => {
    const f = await fixture({ names: false });
    await probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: await f.pin(),
    });
    f.session.close();
    await expect(
      probeDeploymentCapabilities(f.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ name: "StaleWalletSessionError" });
    expect(f.calls).toHaveLength(14);
  });
  it.each(["caller", "session", "deadline"])(
    "%s中断忽略abort的名称leaf，迟到结果不发布",
    async (abort) => {
      let release: (r: Response) => void = () => {},
        f: Awaited<ReturnType<typeof fixture>>;
      const entered = Promise.withResolvers<void>();
      f = await fixture({
        intercept: (c) => {
          if (c.objectId !== f.rootId) return;
          entered.resolve();
          return new Promise((r) => {
            release = r;
          });
        },
      });
      const controller = new AbortController();
      if (abort === "deadline")
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const result = probeDeploymentCapabilities(f.session, {
          fetch: f.fetch,
          declaration: await f.pin(),
          signal: controller.signal,
          timeoutMs: abort === "deadline" ? 100 : 30000,
        });
        const assertion = expect(result).rejects.toBeDefined();
        await entered.promise;
        if (abort === "caller")
          controller.abort(new Error("fixture cancellation"));
        else if (abort === "session") f.session.close();
        else await vi.advanceTimersByTimeAsync(100);
        await assertion;
        const count = f.calls.length;
        release(
          grpcPacket(
            GrpcTypes.GetObjectResponse.toBinary({
              object: f.values.objects.get(f.rootId),
            }),
          ),
        );
        if (abort === "deadline") await vi.advanceTimersByTimeAsync(10);
        else await new Promise((r) => setTimeout(r, 10));
        expect(f.calls).toHaveLength(count);
      } finally {
        if (abort === "deadline") vi.useRealTimers();
      }
    },
  );
});
describe("声明严格版本／信任／完整集合", () => {
  it.each([
    "sha",
    "binding",
    "revision",
    "extra",
    "duplicate-package",
    "duplicate-module",
    "zero-version",
    "overflow-version",
    "uppercase-sha",
    "unknown-layout",
    "wrong-field-id",
    "unknown-field",
  ])("%s拒绝且不发送任何网络请求", async (fault) => {
    const f = await fixture();
    if (fault === "binding") f.declaration.profileBindingKey = "[]";
    if (fault === "revision") {
      const tuple = JSON.parse(f.declaration.profileBindingKey);
      ++tuple[2];
      f.declaration.profileBindingKey = JSON.stringify(tuple);
    }
    if (fault === "extra")
      f.declaration.packages.push({
        ...f.declaration.packages[0],
        storageId: id("0xff"),
      });
    if (fault === "duplicate-package")
      f.declaration.packages.push(f.declaration.packages[0]);
    if (fault === "duplicate-module")
      f.declaration.packages[0].modules.push(
        f.declaration.packages[0].modules[0],
      );
    if (fault === "zero-version") f.declaration.packages[0].version = "0";
    if (fault === "overflow-version")
      f.declaration.packages[0].version = "18446744073709551616";
    if (fault === "uppercase-sha")
      f.declaration.packages[0].objectBcsSha256 = "A".repeat(64);
    if (fault === "unknown-layout")
      f.declaration.nameRegistry!.layout = "arbitrary";
    if (fault === "wrong-field-id")
      f.declaration.nameRegistry!.registryFieldId = id("0xff");
    if (fault === "unknown-field")
      Object.assign(f.declaration, { extra: true });
    const input = await f.pin();
    if (fault === "sha") input.trustedSha256 = "f".repeat(64);
    const r = await probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: input,
    });
    expect(r.state).toBe("declaration-rejected");
    expect(f.calls).toHaveLength(0);
  });
  it.each([
    "duplicate-key",
    "pretty",
    "oversize",
    "missing-package",
    "module-budget",
  ])("%s拒绝canonical输入或集合预算", async (fault) => {
    const f = await fixture();
    if (fault === "missing-package") f.declaration.packages.pop();
    if (fault === "module-budget")
      f.declaration.packages[0].modules = Array.from(
        { length: 257 },
        (_, i) => ({ name: `m${i}`, bytecodeSha256: "a".repeat(64) }),
      );
    let json = JSON.stringify(f.declaration);
    if (fault === "duplicate-key")
      json = json.replace(
        '"schemaVersion":1',
        '"schemaVersion":1,"schemaVersion":1',
      );
    if (fault === "pretty") json = JSON.stringify(f.declaration, null, 2);
    if (fault === "oversize") json = " ".repeat(65_537);
    const input = {
      json,
      trustedSha256: await deploymentSha256(new TextEncoder().encode(json)),
    };
    await expect(
      verifyReviewedDeployment(f.profile, input),
    ).rejects.toMatchObject({ name: "WalletDeploymentContractError" });
  });
  it("声明copy／nested freeze，不能在异步验证后改写pins", async () => {
    const f = await fixture(),
      input = await f.pin(),
      r = await verifyReviewedDeployment(f.profile, input);
    f.declaration.packages[0].version = "9";
    expect(r.packages[0].version).toBe("1");
    expect(Object.isFrozen(r.packages[0].modules[0])).toBe(true);
    expect(Object.isFrozen(r.nameRegistry)).toBe(true);
  });
});

describe("部署新鲜性与共享leaf边界", () => {
  it("同一可写options的声明在首次await前取快照", async () => {
    const f = await fixture({ names: false }),
      input = await f.pin();
    const promise = probeDeploymentCapabilities(f.session, {
      fetch: f.fetch,
      declaration: input,
    });
    input.json = "{}";
    input.trustedSha256 = "f".repeat(64);
    expect((await promise).state).toBe("reviewed-deployment-matched");
  });
  it("根共享对象读间变更撤销名称锚", async () => {
    let f: Awaited<ReturnType<typeof fixture>>;
    f = await fixture({
      intercept: (c) => {
        if (c.objectId !== f.rootId || c.objectRound !== 2) return;
        const root = f.values.objects.get(f.rootId)!;
        return grpcPacket(
          GrpcTypes.GetObjectResponse.toBinary({
            object: moveObject(
              f.rootId,
              root.objectType!,
              root.contents!.value!,
              { Shared: { initialSharedVersion: "1" } },
              "2",
            ),
          }),
        );
      },
    });
    expect(
      (
        await probeDeploymentCapabilities(f.session, {
          fetch: f.fetch,
          declaration: await f.pin(),
        })
      ).registry,
    ).toEqual({ state: "incomplete", reason: "changed" });
  });
  it("后续GetPackage descriptor与本轮已关联摘要不同时拒绝", async () => {
    let f: Awaited<ReturnType<typeof fixture>>,
      round = 0;
    f = await fixture({
      intercept: (c) => {
        if (
          c.method !== "MovePackageService/GetPackage" ||
          c.objectId !== id("0x4") ||
          ++round !== 2
        )
          return;
        const pkg = structuredClone(f.values.packages.get(id("0x4"))!);
        pkg.modules.find((m) => m.name === "registry")!.datatypes[0].abilities =
          [];
        return grpcPacket(
          GrpcTypes.GetPackageResponse.toBinary({ package: pkg }),
        );
      },
    });
    expect(
      (
        await probeDeploymentCapabilities(f.session, {
          fetch: f.fetch,
          declaration: await f.pin(),
        })
      ).registry,
    ).toEqual({ state: "incomplete", reason: "registry" });
  });
  it("四个取消后仍在读取的名称leaf继续占共享名额，迟到不发布", async () => {
    const entered = Promise.withResolvers<void>(),
      releases: (() => void)[] = [];
    const rows = await Promise.all(
      Array.from({ length: 4 }, async () => {
        let f: Awaited<ReturnType<typeof fixture>>;
        f = await fixture({
          intercept: (c) => {
            if (c.objectId !== f.rootId) return;
            return new Promise<Response>((resolve) => {
              releases.push(() =>
                resolve(
                  grpcPacket(
                    GrpcTypes.GetObjectResponse.toBinary({
                      object: f.values.objects.get(f.rootId),
                    }),
                  ),
                ),
              );
              if (releases.length === 4) entered.resolve();
            });
          },
        });
        return {
          f,
          controller: new AbortController(),
          declaration: await f.pin(),
        };
      }),
    );
    const promises = rows.map(({ f, controller, declaration }) =>
      probeDeploymentCapabilities(f.session, {
        fetch: f.fetch,
        declaration,
        signal: controller.signal,
      }),
    );
    const assertions = promises.map((p) => expect(p).rejects.toBeDefined());
    await entered.promise;
    rows.forEach(({ controller }) =>
      controller.abort(new Error("fixture cancellation")),
    );
    await Promise.all(assertions);
    const next = await fixture({ names: false });
    await expect(
      probeDeploymentCapabilities(next.session, {
        fetch: next.fetch,
        timeoutMs: 50,
      }),
    ).rejects.toBeDefined();
    expect(next.calls).toHaveLength(0);
    const counts = rows.map(({ f }) => f.calls.length);
    releases.forEach((release) => release());
    await new Promise((r) => setTimeout(r, 20));
    expect(rows.map(({ f }) => f.calls.length)).toEqual(counts);
  });
});
