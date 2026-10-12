// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdClientTypes } from "rtd-typescript/client";
import { normalizeStructTag } from "rtd-typescript/utils";
import type { SnapshotResult } from "./asset-reader";
import { walletAddress } from "./asset-address";
import {
  GraphQLSnapshot,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { WalletReadSession } from "./session";

export const COIN_METADATA_COVERAGE = Object.freeze(
  [
    { type: "Query", field: "checkpoints" },
    { type: "Query", field: "coinMetadata" },
  ].map((dependency) => Object.freeze(dependency)),
);

export const COIN_METADATA_SELECTION =
  "coinMetadata(coinType: $type) { address decimals name symbol description iconUrl }";

function coinType(value: string) {
  if (!value.trim() || value.includes("@"))
    throw new SnapshotReadError("incompatible");
  try {
    return normalizeStructTag(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function decodeCoinMetadata(
  value: unknown,
): RtdClientTypes.CoinMetadata | null {
  if (value === null) return null;
  const raw = responseRecord(value);
  if (
    !Number.isInteger(raw.decimals) ||
    Number(raw.decimals) < 0 ||
    Number(raw.decimals) > 255 ||
    [raw.name, raw.symbol, raw.description].some(
      (value) => typeof value !== "string",
    ) ||
    (raw.iconUrl !== null && typeof raw.iconUrl !== "string")
  )
    throw new SnapshotReadError("incompatible");
  return Object.freeze({
    id: walletAddress(raw.address),
    decimals: Number(raw.decimals),
    name: raw.name as string,
    symbol: raw.symbol as string,
    description: raw.description as string,
    iconUrl: raw.iconUrl as string | null,
  });
}

/** Shared decoder retains the caller's own admitted snapshot, including full asset readers. */
export async function readSnapshotCoinMetadata(
  snapshot: GraphQLSnapshot,
  type: string,
  signal?: AbortSignal,
): Promise<SnapshotResult<RtdClientTypes.CoinMetadata | null>> {
  const data = await snapshot.read({
    selection: COIN_METADATA_SELECTION,
    variableDefinitions: "$type: String!",
    variables: { type: coinType(type) },
    signal,
  });
  // Explicit null is absence; failures and missing fields never become absence.
  const value = decodeCoinMetadata(data.coinMetadata);
  await snapshot.revalidate(signal);
  return Object.freeze({ snapshot: snapshot.proof, value });
}

/** Metadata-only proof cannot authorize a complete NFT/Display portfolio. */
export class WalletCoinMetadataReader {
  static async read(
    session: WalletReadSession,
    type: string,
    callerSignal?: AbortSignal,
  ) {
    const requested = coinType(type);
    const signal = AbortSignal.any([
      session.signal,
      AbortSignal.timeout(20_000),
      ...(callerSignal ? [callerSignal] : []),
    ]);
    return session.read(async () => {
      const snapshot = await GraphQLSnapshot.open(
        session,
        COIN_METADATA_COVERAGE,
        { signal },
      );
      return readSnapshotCoinMetadata(snapshot, requested, signal);
    });
  }
}
