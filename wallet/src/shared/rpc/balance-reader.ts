// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RtdClientTypes } from "rtd-typescript/client";
import type { SnapshotResult } from "./asset-reader";
import { walletAddress } from "./asset-address";
import { moveType, unsignedAmount } from "./asset-values";
import {
  GraphQLSnapshot,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { collectSnapshotPages, decodeConnection } from "./snapshot-pagination";
import { WalletReadSession } from "./session";

export const BALANCE_COVERAGE = Object.freeze(
  [
    { type: "Query", field: "checkpoints" },
    { type: "Address", field: "balances" },
  ].map((dependency) => Object.freeze(dependency)),
);

export const BALANCE_SELECTION = `coinType { repr } totalBalance coinBalance addressBalance`;

function decodeBalance(value: unknown): RtdClientTypes.Balance {
  const raw = responseRecord(value);
  const total = unsignedAmount(raw.totalBalance);
  const coin = unsignedAmount(raw.coinBalance);
  const accumulator = unsignedAmount(raw.addressBalance);
  if (BigInt(total) !== BigInt(coin) + BigInt(accumulator))
    throw new SnapshotReadError("incompatible");
  return Object.freeze({
    coinType: moveType(responseRecord(raw.coinType).repr),
    balance: total,
    coinBalance: coin,
    addressBalance: accumulator,
  });
}

/** Full asset callers keep their original proof; this helper does not re-admit another S. */
export async function readSnapshotBalances(
  snapshot: GraphQLSnapshot,
  owner: string,
  signal?: AbortSignal,
): Promise<SnapshotResult<readonly RtdClientTypes.Balance[]>> {
  const address = walletAddress(owner);
  const balances = await collectSnapshotPages(
    snapshot,
    async (cursor) => {
      const data = await snapshot.read({
        selection: `address(address: $owner) { address balances(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor } nodes { ${BALANCE_SELECTION} }
        } }`,
        variableDefinitions: "$owner: RtdAddress!, $cursor: String",
        variables: { owner: address, cursor },
        signal,
      });
      const requested = responseRecord(data.address);
      if (walletAddress(requested.address) !== address)
        throw new SnapshotReadError("incompatible");
      const page = decodeConnection(requested.balances, decodeBalance);
      if (page.items.length > 50) throw new SnapshotReadError("incompatible");
      return page;
    },
    (balance) => balance.coinType,
    { signal },
  );
  return Object.freeze({ snapshot: snapshot.proof, value: balances });
}

/** Complete fungible balances at one independent S; not a complete NFT portfolio proof. */
export class WalletBalanceReader {
  static async read(
    session: WalletReadSession,
    owner: string,
    callerSignal?: AbortSignal,
  ) {
    const address = walletAddress(owner);
    const signal = AbortSignal.any([
      session.signal,
      AbortSignal.timeout(20_000),
      ...(callerSignal ? [callerSignal] : []),
    ]);
    return session.read(async () => {
      const snapshot = await GraphQLSnapshot.open(session, BALANCE_COVERAGE, {
        signal,
      });
      return readSnapshotBalances(snapshot, address, signal);
    });
  }
}
