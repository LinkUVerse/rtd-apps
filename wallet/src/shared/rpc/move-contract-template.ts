// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeStructTag } from "rtd-typescript/utils";
export const T = GrpcTypes.OpenSignatureBody_Type;
export const primitive = (
  type: GrpcTypes.OpenSignatureBody_Type,
): GrpcTypes.OpenSignatureBody => ({ type, typeParameterInstantiation: [] });
export const param = (index: number): GrpcTypes.OpenSignatureBody => ({
  type: T.TYPE_PARAMETER,
  typeParameter: index,
  typeParameterInstantiation: [],
});
export const datatype = (
  typeName: string,
  ...args: GrpcTypes.OpenSignatureBody[]
): GrpcTypes.OpenSignatureBody => ({
  type: T.DATATYPE,
  typeName: normalizeStructTag(typeName),
  typeParameterInstantiation: args,
});
export const vector = (
  inner: GrpcTypes.OpenSignatureBody,
): GrpcTypes.OpenSignatureBody => ({
  type: T.VECTOR,
  typeParameterInstantiation: [inner],
});
export const argument = (
  body: GrpcTypes.OpenSignatureBody,
  reference?: GrpcTypes.OpenSignature_Reference,
): GrpcTypes.OpenSignature => ({
  body,
  ...(reference === undefined ? {} : { reference }),
});
export const typeParameter = (
  constraints: GrpcTypes.Ability[],
  isPhantom = false,
): GrpcTypes.TypeParameter => ({ constraints, isPhantom });

export function struct(
  packageId: string,
  module: string,
  name: string,
  abilities: GrpcTypes.Ability[],
  fields: [string, GrpcTypes.OpenSignatureBody][],
  typeParameters: GrpcTypes.TypeParameter[] = [],
): GrpcTypes.DatatypeDescriptor {
  return {
    typeName: normalizeStructTag(`${packageId}::${module}::${name}`),
    definingId: packageId,
    module,
    name,
    abilities,
    typeParameters,
    kind: GrpcTypes.DatatypeDescriptor_DatatypeKind.STRUCT,
    fields: fields.map(([name, type], position) => ({ name, type, position })),
    variants: [],
  };
}
export function fn(
  module: string,
  name: string,
  parameters: GrpcTypes.OpenSignature[],
  returns: GrpcTypes.OpenSignature[],
  options: {
    entry?: boolean;
    private?: boolean;
    generic?: boolean;
    typeParameters?: GrpcTypes.TypeParameter[];
  } = {},
) {
  return {
    module,
    descriptor: {
      name,
      visibility: options.private
        ? GrpcTypes.FunctionDescriptor_Visibility.PRIVATE
        : GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
      isEntry: options.entry ?? false,
      typeParameters:
        options.typeParameters ??
        (options.generic
          ? [{ constraints: [GrpcTypes.Ability.STORE, GrpcTypes.Ability.KEY] }]
          : []),
      parameters,
      returns,
    },
  };
}

export const A = GrpcTypes.Ability;
export const R = GrpcTypes.OpenSignature_Reference;
