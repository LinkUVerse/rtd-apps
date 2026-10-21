// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";
import {
  associateMovePackage,
  matchMoveContract,
  WalletMoveContractError,
} from "./move-contract-shape";
import { movePackageFixtures, packageObject } from "./move-package-fixture";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { walletMoveContracts } from "./wallet-move-contracts";

function fixture() {
  const profile = validateNetworkProfile(profileFixture());
  const contracts = walletMoveContracts(profile);
  if (
    contracts.kiosk.state !== "configured" ||
    contracts.personalKiosk.state !== "configured"
  )
    throw new Error();
  const values = movePackageFixtures(profile);
  const id = normalizeRtdAddress("0x2"),
    pkg = values.packages.get(id)!;
  const parsed = bcs.Object.parse(values.objects.get(id)!.bcs!.value!);
  if (parsed.data.$kind !== "Package") throw new Error();
  return {
    pkg,
    raw: parsed.data.Package,
    contract: contracts.kiosk.contracts[0],
    personal: contracts.personalKiosk.contracts.at(-1)!,
  };
}
describe("审核的完整Move合同", () => {
  it("模板深冻结，调用者不能污染下一次期望", () => {
    const profile = validateNetworkProfile(profileFixture()),
      g = walletMoveContracts(profile).framework;
    if (g.state !== "configured") throw new Error();
    expect(() => {
      g.contracts[0].datatypes[1].fields[0].type!.type =
        GrpcTypes.OpenSignatureBody_Type.U64;
    }).toThrow();
    expect(Object.isFrozen(g.contracts[0].datatypes[0].fields)).toBe(true);
    const f = fixture();
    expect(matchMoveContract(f.pkg, f.contract)).toContain("Kiosk");
  });
  it("缺配置显式unconfigured，任意Kiosk拒绝、明确名称合同不作部署证明", () => {
    const profile = profileFixture();
    profile.packages.kiosk = "0xf";
    delete profile.packages.personalKiosk;
    const g = walletMoveContracts(validateNetworkProfile(profile));
    expect(g.kiosk).toEqual({ state: "unsupported", reason: "kiosk-package" });
    expect(g.personalKiosk).toEqual({ state: "unconfigured" });
    expect(g.names.state).toBe("configured");
  });
  it("abilities集合顺序可变，但泛型和布局仍严格", () => {
    const f = fixture();
    for (const d of f.pkg.modules.find((m) => m.name === "kiosk")!.datatypes)
      d.abilities.reverse();
    expect(matchMoveContract(f.pkg, f.contract)).toBeTypeOf("string");
  });
  it.each([
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.fields.reverse();
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.fields[0].position = undefined;
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.fields[0].name = "constructor";
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.fields[1].type!.typeParameterInstantiation = [];
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.fields[0].type!.type = GrpcTypes.OpenSignatureBody_Type.ADDRESS;
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.abilities.push(GrpcTypes.Ability.DROP);
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.abilities.push(d.abilities[0]);
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.kind = GrpcTypes.DatatypeDescriptor_DatatypeKind.ENUM;
    },
    (d: GrpcTypes.DatatypeDescriptor) => {
      d.definingId = normalizeRtdAddress("0x3");
    },
  ])("字段顺序／位置／类型／权限／origin变化全部拒绝", (mutate) => {
    const f = fixture();
    mutate(
      f.pkg.modules
        .find((m) => m.name === "kiosk")!
        .datatypes.find((d) => d.name === "Kiosk")!,
    );
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
      WalletMoveContractError,
    );
  });
  it.each([
    (f: GrpcTypes.FunctionDescriptor) => {
      f.isEntry = true;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.visibility = GrpcTypes.FunctionDescriptor_Visibility.PRIVATE;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.typeParameters[0].constraints = [GrpcTypes.Ability.KEY];
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.typeParameters[0].isPhantom = false;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.parameters[0].reference = GrpcTypes.OpenSignature_Reference.IMMUTABLE;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.parameters[2].reference =
        GrpcTypes.OpenSignature_Reference.REFERENCE_UNKNOWN;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.parameters.pop();
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.returns = [];
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.returns[0].body!.typeParameter = 1;
    },
    (f: GrpcTypes.FunctionDescriptor) => {
      f.parameters[2].body!.typeParameter = 0;
    },
  ])("完整函数的泛型／reference／参数／返回和entry变化拒绝", (mutate) => {
    const f = fixture();
    mutate(
      f.pkg.modules
        .find((m) => m.name === "kiosk")!
        .functions.find((v) => v.name === "take")!,
    );
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
      WalletMoveContractError,
    );
  });
  it("datatype phantom缺失不能猜false", () => {
    const f = fixture(),
      profile = validateNetworkProfile(profileFixture()),
      g = walletMoveContracts(profile).framework;
    if (g.state !== "configured") throw new Error();
    f.pkg.modules.find(
      (m) => m.name === "balance",
    )!.datatypes[0].typeParameters[0].isPhantom = undefined;
    expect(() => matchMoveContract(f.pkg, g.contracts[0])).toThrow();
  });
  it("过深signature有明确预算且不接受无限递归", () => {
    const f = fixture(),
      d = f.pkg.modules.find((m) => m.name === "kiosk")!.datatypes[0];
    let nested: GrpcTypes.OpenSignatureBody = {
      type: GrpcTypes.OpenSignatureBody_Type.ADDRESS,
      typeParameterInstantiation: [],
    };
    for (let i = 0; i < 18; i++)
      nested = {
        type: GrpcTypes.OpenSignatureBody_Type.VECTOR,
        typeParameterInstantiation: [nested],
      };
    d.fields[0].type = nested;
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
      expect.objectContaining({ reason: "budget" }),
    );
  });
  it("重复module／function不能选择第一个掩盖冲突", () => {
    const f = fixture();
    f.pkg.modules.push(f.pkg.modules[0]);
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow();
    const x = fixture(),
      m = x.pkg.modules.find((v) => v.name === "kiosk")!;
    m.functions.push(m.functions[0]);
    expect(() => matchMoveContract(x.pkg, x.contract)).toThrow();
  });
  it("实例化参数超过32明确预算，不误报ABI不兼容", () => {
    const f = fixture();
    f.pkg.modules.find(
      (m) => m.name === "kiosk",
    )!.datatypes[0].fields[0].type!.typeParameterInstantiation = Array.from(
      { length: 33 },
      () => ({
        type: GrpcTypes.OpenSignatureBody_Type.ADDRESS,
        typeParameterInstantiation: [],
      }),
    );
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
      expect.objectContaining({ reason: "budget" }),
    );
  });
  it.each(["fields", "variants", "typeParameters"])(
    "缺失datatype的%s数组属于不兼容而非预算超限",
    (key) => {
      const f = fixture();
      Object.defineProperty(
        f.pkg.modules.find((m) => m.name === "kiosk")!.datatypes[0],
        key,
        { value: undefined },
      );
      expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
        expect.objectContaining({ reason: "incompatible" }),
      );
    },
  );
  it.each(["parameters", "returns", "typeParameters"])(
    "缺失function的%s数组属于不兼容而非预算超限",
    (key) => {
      const f = fixture();
      Object.defineProperty(
        f.pkg.modules.find((m) => m.name === "kiosk")!.functions[0],
        key,
        { value: undefined },
      );
      expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
        expect.objectContaining({ reason: "incompatible" }),
      );
    },
  );
  it("嵌套datatype地址超过32字节明确不兼容", () => {
    const f = fixture();
    f.pkg.modules.find(
      (m) => m.name === "kiosk",
    )!.datatypes[0].fields[0].type!.typeName =
      `0x${"a".repeat(65)}::object::UID`;
    expect(() => matchMoveContract(f.pkg, f.contract)).toThrow(
      expect.objectContaining({ reason: "incompatible" }),
    );
  });
});

describe("包BCS与descriptor关联", () => {
  it("超过256模块和8192描述符分别保留预算分类", () => {
    const f = fixture();
    f.pkg.modules = Array.from({ length: 257 }, (_, i) => ({
      name: `m${i}`,
      datatypes: [],
      functions: [],
    }));
    f.raw.moduleMap = new Map(
      f.pkg.modules.map((m) => [m.name!, new Uint8Array([1])]),
    );
    expect(() =>
      associateMovePackage(f.pkg, f.raw, f.contract.packageId),
    ).toThrow(expect.objectContaining({ reason: "budget" }));
    const x = fixture();
    x.pkg.modules[0].functions = Array.from({ length: 8193 }, (_, i) => ({
      name: `f${i}`,
      typeParameters: [],
      parameters: [],
      returns: [],
    }));
    expect(() =>
      associateMovePackage(x.pkg, x.raw, x.contract.packageId),
    ).toThrow(expect.objectContaining({ reason: "budget" }));
  });
  it("规范ID／version／全部module／typeOrigin关联，contents缺失不冒作零字节码", () => {
    const f = fixture();
    const r = associateMovePackage(f.pkg, f.raw, f.contract.packageId);
    expect(r.originalId).toBe(f.contract.packageId);
    expect(r.modules.size).toBe(f.raw.moduleMap.size);
  });
  it.each([
    (f: ReturnType<typeof fixture>) => {
      f.pkg.storageId = normalizeRtdAddress("0xb");
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.version = 2n;
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.originalId = normalizeRtdAddress("0xb");
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.modules.pop();
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.modules.push(f.pkg.modules[0]);
    },
    (f: ReturnType<typeof fixture>) => {
      f.raw.moduleMap.set(f.pkg.modules[0].name!, new Uint8Array());
    },
    (f: ReturnType<typeof fixture>) => {
      f.raw.typeOriginTable[0].package = normalizeRtdAddress("0xb");
    },
    (f: ReturnType<typeof fixture>) => {
      f.raw.typeOriginTable.push(f.raw.typeOriginTable[0]);
    },
    (f: ReturnType<typeof fixture>) => {
      f.raw.typeOriginTable.pop();
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.modules[0].contents = new Uint8Array([4]);
    },
    (f: ReturnType<typeof fixture>) => {
      f.pkg.modules[0].datatypes.push(f.pkg.modules[0].datatypes[0]);
    },
  ])("同selector／包来源／版本／重复／字节码不一致拒绝", (mutate) => {
    const f = fixture();
    mutate(f);
    expect(() =>
      associateMovePackage(f.pkg, f.raw, f.contract.packageId),
    ).toThrow(WalletMoveContractError);
  });
  it("升级包storage／original可不同，只作为服务声明；definingId仍独立关联", () => {
    const f = fixture();
    f.pkg.version = 2n;
    f.pkg.originalId = normalizeRtdAddress("0xa");
    const parsed = bcs.Object.parse(packageObject(f.pkg).bcs!.value!);
    if (parsed.data.$kind !== "Package") throw new Error();
    expect(
      associateMovePackage(f.pkg, parsed.data.Package, f.contract.packageId)
        .originalId,
    ).toBe(normalizeRtdAddress("0xa"));
  });
});
