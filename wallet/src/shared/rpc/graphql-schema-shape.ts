// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isNonNullType,
  isScalarType,
  isUnionType,
  parse,
  print,
  TypeInfo,
  validate,
  visit,
  visitWithTypeInfo,
  type GraphQLNamedType,
  type GraphQLInputType,
  type GraphQLDefaultInput,
  type GraphQLSchema,
} from "graphql";

interface InputShape {
  readonly type: string;
  readonly required: boolean;
  readonly defaultLiteral: string | null;
}
export interface SchemaContractShape {
  readonly document: string;
  readonly fields: Readonly<
    Record<
      string,
      {
        readonly type: string;
        readonly arguments: Readonly<Record<string, InputShape>>;
      }
    >
  >;
  readonly types: Readonly<
    Record<
      string,
      {
        readonly kind: string;
        readonly oneOf?: boolean;
        readonly fields?: Readonly<Record<string, InputShape>>;
        readonly variants?: readonly string[];
      }
    >
  >;
}

function inputShape(input: {
  type: GraphQLInputType;
  default?: GraphQLDefaultInput;
}): InputShape {
  if (input.default && !input.default.literal)
    throw new Error("schema默认值缺少可审核literal");
  return {
    type: String(input.type),
    required: isNonNullType(input.type) && input.default === undefined,
    defaultLiteral: input.default?.literal
      ? print(input.default.literal)
      : null,
  };
}

/** Shared by the reviewed build-time baseline and runtime comparison; never derive expectations from a remote schema. */
export function schemaContractShape(
  schema: GraphQLSchema,
  source: string,
): SchemaContractShape {
  const document = parse(source, { maxTokens: 4096 });
  if (validate(schema, document, undefined, { maxErrors: 1 }).length)
    throw new Error("钱包查询合同不匹配schema");
  const fields: Record<string, SchemaContractShape["fields"][string]> =
    Object.create(null);
  const types: Record<string, SchemaContractShape["types"][string]> =
    Object.create(null);
  const remember = (type: GraphQLNamedType) => {
    if (types[type.name]) return;
    if (isInputObjectType(type)) {
      types[type.name] = { kind: "INPUT_OBJECT" };
      const inputs: Record<string, InputShape> = Object.create(null);
      for (const field of Object.values(type.getFields())) {
        inputs[field.name] = inputShape(field);
        remember(getNamedType(field.type));
      }
      types[type.name] = {
        kind: "INPUT_OBJECT",
        oneOf: type.isOneOf,
        fields: inputs,
      };
    } else if (isEnumType(type)) {
      types[type.name] = {
        kind: "ENUM",
        variants: type
          .getValues()
          .map((v) => v.name)
          .sort(),
      };
    } else if (isUnionType(type) || isInterfaceType(type)) {
      types[type.name] = {
        kind: isUnionType(type) ? "UNION" : "INTERFACE",
        variants: (isUnionType(type)
          ? type.getTypes()
          : schema.getPossibleTypes(type)
        )
          .map((v) => v.name)
          .sort(),
      };
    } else
      types[type.name] = { kind: isScalarType(type) ? "SCALAR" : "OBJECT" };
  };
  const info = new TypeInfo(schema);
  visit(
    document,
    visitWithTypeInfo(info, {
      Field(node) {
        if (node.name.value === "__typename") return;
        const parent = info.getParentType(),
          field = info.getFieldDef();
        if (!parent || !field) throw new Error("钱包查询合同字段未解析");
        remember(parent);
        remember(getNamedType(field.type));
        const args: Record<string, InputShape> = Object.create(null);
        for (const argument of field.args) {
          args[argument.name] = inputShape(argument);
          remember(getNamedType(argument.type));
        }
        fields[`${parent.name}.${field.name}`] = {
          type: String(field.type),
          arguments: args,
        };
      },
      VariableDefinition() {
        const type = info.getInputType();
        if (type) remember(getNamedType(type));
      },
    }),
  );
  return { document: print(document), fields, types };
}

function inputsMatch(
  expected: Readonly<Record<string, InputShape>>,
  actual: Readonly<Record<string, InputShape>>,
) {
  return (
    Object.entries(expected).every(
      ([name, value]) =>
        actual[name]?.type === value.type &&
        actual[name]?.required === value.required &&
        actual[name]?.defaultLiteral === value.defaultLiteral,
    ) &&
    Object.entries(actual).every(
      ([name, value]) => Object.hasOwn(expected, name) || !value.required,
    )
  );
}

/** Optional input/argument additions are allowed; changed scalar/list/nullability or new mandatory input is not. */
export function matchesSchemaContract(
  schema: GraphQLSchema,
  source: string,
  expected: SchemaContractShape,
): boolean {
  try {
    const actual = schemaContractShape(schema, source);
    if (actual.document !== expected.document) return false;
    for (const [name, field] of Object.entries(expected.fields)) {
      const got = actual.fields[name];
      if (
        !got ||
        got.type !== field.type ||
        !inputsMatch(field.arguments, got.arguments)
      )
        return false;
    }
    for (const [name, type] of Object.entries(expected.types)) {
      const got = actual.types[name];
      if (
        !got ||
        got.kind !== type.kind ||
        got.oneOf !== type.oneOf ||
        (type.fields &&
          (!got.fields || !inputsMatch(type.fields, got.fields))) ||
        (type.variants &&
          JSON.stringify(type.variants) !== JSON.stringify(got.variants))
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
