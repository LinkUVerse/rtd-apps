// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs, type BcsType } from "rtd-typescript/bcs";
import type { SerializationType } from "./serializer";

/** Dynamic Move argument types; SDK schemas still validate every value before encoding. */
export function createBcsType(
  types: readonly (SerializationType | undefined)[],
): BcsType<unknown, unknown> {
  const [type, ...inner] = types;
  if (!type) throw new Error("Type cannot be undefined");
  if (type === "vector")
    return bcs.vector(createBcsType(inner)).transform<unknown, unknown>({
      input(value) {
        if (!Array.isArray(value))
          throw new Error("Vector argument must be an array");
        return value;
      },
    });
  if (type === "option") return bcs.option(createBcsType(inner));
  if (inner.length) throw new Error(`Unsupported types: [${types.join(", ")}]`);
  // Type information comes from normalized Move metadata at runtime, not a TS generic.
  return bcs[type] as BcsType<unknown, unknown>;
}
