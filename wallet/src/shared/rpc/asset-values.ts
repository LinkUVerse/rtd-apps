// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from "rtd-typescript/utils";
import { SnapshotReadError } from "./graphql-snapshot";

export function moveType(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.includes("@"))
    throw new SnapshotReadError("incompatible");
  try {
    return normalizeStructTag(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

export function unsignedAmount(value: unknown, bits = 128): string {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    value.length > 39 ||
    BigInt(value) >= 1n << BigInt(bits)
  )
    throw new SnapshotReadError("incompatible");
  return value;
}
