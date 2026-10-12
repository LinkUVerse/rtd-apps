// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  fromBase64,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import type { WalletDynamicField } from "rtd-apps-core/src/rpc/WalletRpcContext";

import { responseRecord, SnapshotReadError } from "./graphql-snapshot";
import { walletAddress } from "./asset-address";

export const DYNAMIC_FIELD_SELECTION = `address name { bcs type { repr } }
  value { __typename
    ... on MoveValue { bcs type { repr } }
    ... on MoveObject { address contents { bcs type { repr } } }
  }`;

/** Dynamic names/values can be primitive or vector types, not only structs. */
export function dynamicType(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 8192 ||
    value.includes("@")
  )
    throw new SnapshotReadError("incompatible");
  try {
    const tag = TypeTagSerializer.parseFromStr(value, true);
    const check = (
      type: ReturnType<typeof TypeTagSerializer.parseFromStr>,
      depth = 0,
    ): void => {
      if (depth > 32) throw new Error("type depth");
      if ("vector" in type) check(type.vector, depth + 1);
      if ("struct" in type) {
        walletAddress(type.struct.address);
        if (
          ![type.struct.module, type.struct.name].every((name) =>
            /^[_A-Za-z][_A-Za-z0-9]*$/.test(name),
          )
        )
          throw new Error("type identifier");
        type.struct.typeParams.forEach((parameter) =>
          check(parameter, depth + 1),
        );
      }
    };
    check(tag);
    const normalized = TypeTagSerializer.tagToString(tag);
    // Parsing a prefix must not silently discard malformed suffixes.
    const shortAddresses = (type: string) =>
      type.replace(/0x0+([0-9a-f]+)/gi, "0x$1").replace(/\s/g, "");
    if (
      shortAddresses(value).toLowerCase() !==
      shortAddresses(normalized).toLowerCase()
    )
      throw new Error("type suffix");
    return normalized;
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function decodeBytes(value: unknown) {
  if (typeof value !== "string") throw new SnapshotReadError("incompatible");
  try {
    const result = Uint8Array.from(fromBase64(value));
    if (toBase64(result) !== value) throw new Error("non-canonical BCS");
    return result;
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

export function decodeDynamicField(
  parentId: string,
  value: unknown,
): WalletDynamicField {
  const raw = responseRecord(value);
  const name = responseRecord(raw.name);
  const nameType = dynamicType(responseRecord(name.type).repr);
  const nameBytes = decodeBytes(name.bcs);
  const rawValue = responseRecord(raw.value);
  const isObject = rawValue.__typename === "MoveObject";
  if (!isObject && rawValue.__typename !== "MoveValue")
    throw new SnapshotReadError("incompatible");
  const content = isObject ? responseRecord(rawValue.contents) : rawValue;
  const valueType = dynamicType(responseRecord(content.type).repr);
  const derivedName = isObject
    ? `0x2::dynamic_object_field::Wrapper<${nameType}>`
    : nameType;
  const fieldId = deriveDynamicFieldID(parentId, derivedName, nameBytes);
  if (walletAddress(raw.address) !== fieldId)
    throw new SnapshotReadError("incompatible");
  const valueBytes = decodeBytes(content.bcs);
  const childId = isObject ? walletAddress(rawValue.address) : null;
  // MoveObject::id_opt reads the UID from the first 32 bytes of contents.
  if (isObject && (valueBytes.length < 32 || bcs.Address.parse(valueBytes.subarray(0, 32)) !== childId))
    throw new SnapshotReadError("incompatible");
  const entry = {
    fieldId,
    type: normalizeStructTag(
      `0x2::dynamic_field::Field<${derivedName},${isObject ? "0x2::object::ID" : valueType}>`,
    ),
    name: { type: nameType, bcs: nameBytes },
    valueType,
    value: { type: valueType, bcs: valueBytes },
  };
  return isObject
    ? {
        ...entry,
        $kind: "DynamicObject",
        childId: childId!,
      }
    : { ...entry, $kind: "DynamicField" };
}
