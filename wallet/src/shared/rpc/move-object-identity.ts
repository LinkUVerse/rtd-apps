// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdClientTypes } from "rtd-typescript/client";
import { fromBase64, normalizeStructTag, toBase64 } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import {
  checkpointNumber,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { assertGenesisDigest } from "./profile";
import type { WalletStakingObject } from "./staking-source";

export const MOVE_OBJECT_IDENTITY_SELECTION = `address version digest
  owner { __typename
    ... on AddressOwner { address { address } }
    ... on ObjectOwner { address { address } }
    ... on Shared { initialSharedVersion }
    ... on ConsensusAddressOwner { startVersion address { address } }
  }
  contents { bcs type { repr } }`;

export function decodeSnapshotOwner(
  value: unknown,
): RtdClientTypes.ObjectOwner {
  const raw = responseRecord(value);
  switch (raw.__typename) {
    case "AddressOwner":
      return {
        $kind: "AddressOwner",
        AddressOwner: walletAddress(responseRecord(raw.address).address),
      };
    case "ObjectOwner":
      return {
        $kind: "ObjectOwner",
        ObjectOwner: walletAddress(responseRecord(raw.address).address),
      };
    case "Immutable":
      return { $kind: "Immutable", Immutable: true };
    case "Shared":
      return {
        $kind: "Shared",
        Shared: {
          initialSharedVersion: String(
            checkpointNumber(raw.initialSharedVersion),
          ),
        },
      };
    case "ConsensusAddressOwner":
      return {
        $kind: "ConsensusAddressOwner",
        ConsensusAddressOwner: {
          owner: walletAddress(responseRecord(raw.address).address),
          startVersion: String(checkpointNumber(raw.startVersion)),
        },
      };
    default:
      throw new SnapshotReadError("incompatible");
  }
}

export function decodeMoveObjectIdentity(value: unknown): WalletStakingObject {
  const raw = responseRecord(value),
    content = responseRecord(raw.contents);
  try {
    const repr = responseRecord(content.type).repr;
    if (typeof repr !== "string" || !repr.trim() || repr.includes("@"))
      throw new Error("type");
    if (typeof content.bcs !== "string") throw new Error("BCS");
    const bytes = Uint8Array.from(fromBase64(content.bcs));
    if (toBase64(bytes) !== content.bcs) throw new Error("BCS encoding");
    return Object.freeze({
      objectId: walletAddress(raw.address),
      version: String(checkpointNumber(raw.version)),
      digest: assertGenesisDigest(raw.digest),
      owner: decodeSnapshotOwner(raw.owner),
      type: normalizeStructTag(repr),
      content: bytes,
    });
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}
