// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidRtdAddress, normalizeRtdAddress } from "rtd-typescript/utils";
import { SnapshotReadError } from "./graphql-snapshot";

export function walletAddress(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(value))
    throw new SnapshotReadError("incompatible");
  const address = normalizeRtdAddress(value);
  if (!isValidRtdAddress(address)) throw new SnapshotReadError("incompatible");
  return address;
}
