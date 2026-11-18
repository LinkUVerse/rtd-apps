// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes, parseGrpcTransactionResponse } from "rtd-typescript/grpc";
import type { WalletHistoryTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  receiptObjectEffects,
  receiptStakeEvents,
} from "rtd-apps-core/src/rpc/transaction-view";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { assertGenesisDigest } from "./profile";

function timestampMs(
  timestamp: { seconds: bigint; nanos: number } | undefined,
): number {
  if (!timestamp) throw new Error("历史交易缺少时间戳");
  const { seconds, nanos } = timestamp;
  if (
    seconds < 0n ||
    !Number.isInteger(nanos) ||
    nanos < 0 ||
    nanos >= 1_000_000_000 ||
    seconds * 1000n + BigInt(Math.floor(nanos / 1_000_000)) >
      BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("历史交易时间戳无效");
  return Number(seconds * 1000n + BigInt(Math.floor(nanos / 1_000_000)));
}

function checkpoint(raw: GrpcTypes.ExecutedTransaction): number {
  const value = raw.checkpoint;
  if (
    value === undefined ||
    value < 0n ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("历史交易 checkpoint 无效");
  return Number(value);
}

/** Protocol JSON view of one verified historical page row, for display and cache. */
export async function ledgerHistoryRow(
  raw: GrpcTypes.ExecutedTransaction,
  owner: string,
): Promise<WalletHistoryTransaction> {
  const digest = assertGenesisDigest(raw.digest);
  const sender = raw.transaction?.sender
    ? walletAddress(raw.transaction.sender)
    : null;
  let transaction = null;
  let status: "SUCCESS" | "FAILURE" =
    raw.effects?.status?.success === false ? "FAILURE" : "SUCCESS";
  try {
    const parsed = parseGrpcTransactionResponse(raw, {
      include: {
        effects: true,
        transaction: true,
        bcs: true,
        balanceChanges: true,
        objectTypes: true,
        events: true,
      },
    });
    const tx = parsed.Transaction ?? parsed.FailedTransaction!;
    transaction = tx;
    status = tx.status.success ? "SUCCESS" : "FAILURE";
    tx.objectTypes = Object.fromEntries(
      Object.entries(tx.objectTypes).map(([id, type]) => [
        walletAddress(id),
        type === "package" ? type : dynamicType(type),
      ]),
    );
    receiptStakeEvents(tx, walletAddress(owner));
    receiptObjectEffects(tx);
  } catch {
    // A system transaction has no programmable view; its raw effects still
    // carry the final status used by the activity card.
  }
  const origins = new Set<string>();
  if (sender) origins.add(sender);
  for (const change of raw.balanceChanges) {
    if (change.address) origins.add(walletAddress(change.address));
  }
  return Object.freeze({
    digest,
    checkpoint: checkpoint(raw),
    sender,
    origins: Object.freeze([...origins]),
    transaction,
    status,
    timestampMs: timestampMs(raw.timestamp),
    kind:
      raw.transaction?.kind?.data?.oneofKind === "programmableTransaction"
        ? "ProgrammableTransaction"
        : "SystemTransaction",
    nativeTransaction: raw.transaction ?? null,
    eventFacts: raw.events ?? null,
    kioskTransfers: null,
  });
}
