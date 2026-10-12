// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import type {
  WalletMoveContractGroup,
  WalletMoveGroupContract,
} from "./wallet-move-contracts";
import { WalletMoveContractError } from "./move-contract-shape";

/** Audits authored expectations only. It does not turn opaque user types or runtime descriptors into reviewed contracts. */
export function auditWalletMoveCatalog(
  groups: Readonly<Record<WalletMoveContractGroup, WalletMoveGroupContract>>,
) {
  const datatypes = new Map<string, string>(),
    functions = new Map<string, string>(),
    references = new Set<string>();
  let nodes = 0;
  const visit = (
    body: GrpcTypes.OpenSignatureBody | undefined,
    parameters: number,
    depth = 0,
  ): void => {
    if (++nodes > 16384 || depth > 16)
      throw new WalletMoveContractError("budget");
    if (
      !body ||
      !Array.isArray(body.typeParameterInstantiation) ||
      !Number.isInteger(body.type) ||
      body.type! < 1 ||
      body.type! > 11
    )
      throw new WalletMoveContractError("incompatible");
    if (body.typeParameterInstantiation.length > 32)
      throw new WalletMoveContractError("budget");
    if (body.type === GrpcTypes.OpenSignatureBody_Type.DATATYPE) {
      if (typeof body.typeName !== "string")
        throw new WalletMoveContractError("incompatible");
      references.add(body.typeName);
    } else if (body.typeName !== undefined)
      throw new WalletMoveContractError("incompatible");
    if (body.type === GrpcTypes.OpenSignatureBody_Type.TYPE_PARAMETER) {
      if (
        !Number.isInteger(body.typeParameter) ||
        body.typeParameter! < 0 ||
        body.typeParameter! >= parameters
      )
        throw new WalletMoveContractError("incompatible");
    } else if (body.typeParameter !== undefined)
      throw new WalletMoveContractError("incompatible");
    body.typeParameterInstantiation.forEach((arg) =>
      visit(arg, parameters, depth + 1),
    );
  };
  const add = (
    map: Map<string, string>,
    key: string | undefined,
    descriptor: unknown,
  ) => {
    if (!key) throw new WalletMoveContractError("incompatible");
    const shape = JSON.stringify(descriptor),
      previous = map.get(key);
    if (previous !== undefined && previous !== shape)
      throw new WalletMoveContractError("incompatible");
    map.set(key, shape);
    if (datatypes.size + functions.size > 512)
      throw new WalletMoveContractError("budget");
  };
  for (const group of Object.values(groups)) {
    if (group.state !== "configured") continue;
    for (const contract of group.contracts) {
      for (const datatype of contract.datatypes) {
        datatype.fields.forEach((field) =>
          visit(field.type, datatype.typeParameters.length),
        );
        datatype.variants.forEach((variant) =>
          variant.fields.forEach((field) =>
            visit(field.type, datatype.typeParameters.length),
          ),
        );
        add(datatypes, datatype.typeName, datatype);
      }
      for (const fn of contract.functions) {
        [...fn.descriptor.parameters, ...fn.descriptor.returns].forEach(
          (signature) =>
            visit(signature.body, fn.descriptor.typeParameters.length),
        );
        add(
          functions,
          `${contract.packageId}::${fn.module}::${fn.descriptor.name}`,
          fn.descriptor,
        );
      }
    }
  }
  for (const reference of references)
    if (!datatypes.has(reference))
      throw new WalletMoveContractError("incompatible");
  return Object.freeze({
    datatypes: datatypes.size,
    functions: functions.size,
    referencedDatatypes: references.size,
    customMoveTypes: "opaque" as const,
    protocolEnvelopes: "sdk-pinned" as const,
  });
}
