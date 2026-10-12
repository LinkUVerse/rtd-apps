// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeStructTag } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import type { WalletMovePackageContract } from "./wallet-move-contracts";

export class WalletMoveContractError extends Error {
  constructor(readonly reason: "incompatible" | "budget" | "association") {
    super("链上包或完整ABI未通过审核合同，未接纳合约能力");
    this.name = "WalletMoveContractError";
  }
}
function identifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) ||
    value.length > 128
  )
    throw new WalletMoveContractError("incompatible");
  return value;
}
function abilities(values: readonly GrpcTypes.Ability[]) {
  if (
    !Array.isArray(values) ||
    values.length > 4 ||
    new Set(values).size !== values.length ||
    values.some((v) => !Number.isInteger(v) || v < 1 || v > 4)
  )
    throw new WalletMoveContractError("incompatible");
  return [...values].sort();
}
function typename(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]{1,64}::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/.test(
      value,
    ) ||
    value.length > 512
  )
    throw new WalletMoveContractError("incompatible");
  return normalizeStructTag(value);
}
interface Budget {
  nodes: number;
}
function body(
  value: GrpcTypes.OpenSignatureBody | undefined,
  parameters: number,
  budget: Budget,
  depth = 0,
): unknown {
  if (++budget.nodes > 4096 || depth > 16)
    throw new WalletMoveContractError("budget");
  if (!value || !Array.isArray(value.typeParameterInstantiation))
    throw new WalletMoveContractError("incompatible");
  if (value.typeParameterInstantiation.length > 32)
    throw new WalletMoveContractError("budget");
  const kind = value.type;
  if (!Number.isInteger(kind) || kind! < 1 || kind! > 11)
    throw new WalletMoveContractError("incompatible");
  const args = value.typeParameterInstantiation;
  if (kind! <= 8) {
    if (
      args.length ||
      value.typeName !== undefined ||
      value.typeParameter !== undefined
    )
      throw new WalletMoveContractError("incompatible");
    return [kind];
  }
  if (kind === GrpcTypes.OpenSignatureBody_Type.TYPE_PARAMETER) {
    if (
      !Number.isInteger(value.typeParameter) ||
      value.typeParameter! < 0 ||
      value.typeParameter! >= parameters ||
      args.length ||
      value.typeName !== undefined
    )
      throw new WalletMoveContractError("incompatible");
    return [kind, value.typeParameter];
  }
  if (value.typeParameter !== undefined)
    throw new WalletMoveContractError("incompatible");
  if (kind === GrpcTypes.OpenSignatureBody_Type.VECTOR) {
    if (args.length !== 1 || value.typeName !== undefined)
      throw new WalletMoveContractError("incompatible");
    return [kind, body(args[0], parameters, budget, depth + 1)];
  }
  return [
    kind,
    typename(value.typeName),
    args.map((arg) => body(arg, parameters, budget, depth + 1)),
  ];
}
function fields(
  values: readonly GrpcTypes.FieldDescriptor[],
  parameters: number,
  budget: Budget,
) {
  if (!Array.isArray(values)) throw new WalletMoveContractError("incompatible");
  if (values.length > 256) throw new WalletMoveContractError("budget");
  if (new Set(values.map((v) => identifier(v.name))).size !== values.length)
    throw new WalletMoveContractError("incompatible");
  return values.map((v, index) => {
    if (v.position !== index) throw new WalletMoveContractError("incompatible");
    return [v.name, index, body(v.type, parameters, budget)];
  });
}
function datatype(value: GrpcTypes.DatatypeDescriptor, budget: Budget) {
  if (!Array.isArray(value.typeParameters) || !Array.isArray(value.variants))
    throw new WalletMoveContractError("incompatible");
  if (value.typeParameters.length > 32 || value.variants.length > 256)
    throw new WalletMoveContractError("budget");
  if (
    value.kind !== GrpcTypes.DatatypeDescriptor_DatatypeKind.STRUCT ||
    value.variants.length
  )
    throw new WalletMoveContractError("incompatible");
  return [
    typename(value.typeName),
    walletAddress(value.definingId),
    identifier(value.module),
    identifier(value.name),
    value.kind,
    abilities(value.abilities),
    value.typeParameters.map((v) => {
      if (typeof v.isPhantom !== "boolean")
        throw new WalletMoveContractError("incompatible");
      return [abilities(v.constraints), v.isPhantom];
    }),
    fields(value.fields, value.typeParameters.length, budget),
  ];
}
function fn(value: GrpcTypes.FunctionDescriptor, budget: Budget) {
  if (
    ![1, 2, 3].includes(value.visibility!) ||
    typeof value.isEntry !== "boolean"
  )
    throw new WalletMoveContractError("incompatible");
  if (
    !Array.isArray(value.typeParameters) ||
    !Array.isArray(value.parameters) ||
    !Array.isArray(value.returns)
  )
    throw new WalletMoveContractError("incompatible");
  if (
    value.typeParameters.length > 32 ||
    value.parameters.length + value.returns.length > 256
  )
    throw new WalletMoveContractError("budget");
  const signature = (v: GrpcTypes.OpenSignature) => {
    if (
      v.reference !== undefined &&
      v.reference !== GrpcTypes.OpenSignature_Reference.IMMUTABLE &&
      v.reference !== GrpcTypes.OpenSignature_Reference.MUTABLE
    )
      throw new WalletMoveContractError("incompatible");
    return [
      v.reference ?? null,
      body(v.body, value.typeParameters.length, budget),
    ];
  };
  return [
    identifier(value.name),
    value.visibility,
    value.isEntry,
    value.typeParameters.map((v) => {
      if (v.isPhantom !== undefined)
        throw new WalletMoveContractError("incompatible");
      return abilities(v.constraints);
    }),
    value.parameters.map(signature),
    value.returns.map(signature),
  ];
}
export type ParsedMovePackage = Extract<
  ReturnType<typeof bcs.Object.parse>["data"],
  { $kind: "Package" }
>["Package"];

/** Structural association only: caller independently verifies the canonical object BCS/digest and stable before/after reference. */
export function associateMovePackage(
  pkg: GrpcTypes.Package,
  raw: ParsedMovePackage,
  packageId: string,
) {
  try {
    if (
      walletAddress(pkg.storageId) !== packageId ||
      raw.id !== packageId ||
      pkg.version?.toString() !== raw.version ||
      BigInt(raw.version) < 1n
    )
      throw new WalletMoveContractError("association");
    const original = walletAddress(pkg.originalId);
    if (raw.version === "1" && original !== packageId)
      throw new WalletMoveContractError("association");
    if (pkg.modules.length > 256) throw new WalletMoveContractError("budget");
    if (!pkg.modules.length || raw.moduleMap.size !== pkg.modules.length)
      throw new WalletMoveContractError("association");
    const modules = new Map<string, GrpcTypes.Module>(),
      origins = new Map<string, string>();
    if (raw.typeOriginTable.length > 8192)
      throw new WalletMoveContractError("budget");
    for (const origin of raw.typeOriginTable) {
      const key = `${identifier(origin.moduleName)}::${identifier(origin.datatypeName)}`;
      if (origins.has(key)) throw new WalletMoveContractError("association");
      origins.set(key, walletAddress(origin.package));
    }
    let descriptors = 0;
    for (const module of pkg.modules) {
      const name = identifier(module.name);
      if (
        modules.has(name) ||
        !raw.moduleMap.has(name) ||
        !raw.moduleMap.get(name)!.length
      )
        throw new WalletMoveContractError("association");
      descriptors += module.datatypes.length + module.functions.length;
      if (descriptors > 8192) throw new WalletMoveContractError("budget");
      if (
        new Set(module.datatypes.map((d) => identifier(d.name))).size !==
          module.datatypes.length ||
        new Set(module.functions.map((f) => identifier(f.name))).size !==
          module.functions.length
      )
        throw new WalletMoveContractError("association");
      for (const d of module.datatypes) {
        if (
          d.module !== name ||
          typename(d.typeName) !==
            normalizeStructTag(`${packageId}::${name}::${d.name}`) ||
          walletAddress(d.definingId) !== origins.get(`${name}::${d.name}`)
        )
          throw new WalletMoveContractError("association");
      }
      if (
        module.contents !== undefined &&
        (module.contents.length !== raw.moduleMap.get(name)!.length ||
          module.contents.some((v, i) => v !== raw.moduleMap.get(name)![i]))
      )
        throw new WalletMoveContractError("association");
      modules.set(name, module);
    }
    const declared = [...modules].reduce(
      (count, [, m]) => count + m.datatypes.length,
      0,
    );
    if (origins.size !== declared)
      throw new WalletMoveContractError("association");
    return { originalId: original, modules };
  } catch (error) {
    if (error instanceof WalletMoveContractError) throw error;
    throw new WalletMoveContractError("association");
  }
}

/** Exact reviewed ABI for selected reader/transaction paths. Extras in unrelated modules do not prove or alter this selected contract. */
export function matchMoveContract(
  pkg: GrpcTypes.Package,
  contract: WalletMovePackageContract,
) {
  const budget: Budget = { nodes: 0 };
  if (
    walletAddress(pkg.storageId) !== contract.packageId ||
    new Set(pkg.modules.map((m) => identifier(m.name))).size !==
      pkg.modules.length
  )
    throw new WalletMoveContractError("incompatible");
  for (const m of pkg.modules) {
    if (
      new Set(m.datatypes.map((d) => identifier(d.name))).size !==
        m.datatypes.length ||
      new Set(m.functions.map((f) => identifier(f.name))).size !==
        m.functions.length
    )
      throw new WalletMoveContractError("incompatible");
  }
  const modules = new Map(pkg.modules.map((m) => [m.name, m]));
  const shapes: unknown[] = [];
  for (const expected of contract.datatypes) {
    const actual = modules
      .get(expected.module)
      ?.datatypes.find((d) => d.name === expected.name);
    if (!actual) throw new WalletMoveContractError("incompatible");
    const shape = datatype(actual, budget),
      reviewed = datatype(expected, budget);
    if (JSON.stringify(shape) !== JSON.stringify(reviewed))
      throw new WalletMoveContractError("incompatible");
    shapes.push(["datatype", shape]);
  }
  for (const expected of contract.functions) {
    const actual = modules
      .get(expected.module)
      ?.functions.find((f) => f.name === expected.descriptor.name);
    if (!actual) throw new WalletMoveContractError("incompatible");
    const shape = fn(actual, budget),
      reviewed = fn(expected.descriptor, budget);
    if (JSON.stringify(shape) !== JSON.stringify(reviewed))
      throw new WalletMoveContractError("incompatible");
    shapes.push(["function", expected.module, shape]);
  }
  return JSON.stringify(shapes);
}
