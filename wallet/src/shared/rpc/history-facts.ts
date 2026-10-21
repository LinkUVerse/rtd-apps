// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2.js";
import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import { GrpcTypes, parseGrpcTransactionResponse } from "rtd-typescript/grpc";
import { TransactionDataBuilder } from "rtd-typescript/transactions";
import { fromBase64, toBase58, toBase64 } from "rtd-typescript/utils";
import type { WalletHistoryTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  receiptObjectEffects,
  receiptStakeEvents,
} from "rtd-apps-core/src/rpc/transaction-view";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import {
  assertEventEnvelope,
  serializeEventEnvelope,
  WalletEventBcs,
} from "./event-envelope";
import { responseRecord, checkpointNumber } from "./graphql-snapshot";
import { assertGenesisDigest } from "./profile";
import {
  assertNativeExecutedTransaction,
  validateFinalSimulation,
} from "./transaction-reader";

export class WalletHistoryError extends Error {
  constructor(
    readonly reason:
      | "unconfigured"
      | "incompatible"
      | "changed"
      | "coverage"
      | "budget"
      | "partial",
  ) {
    super(
      reason === "unconfigured"
        ? "当前网络未配置账户历史查询服务"
        : reason === "coverage"
          ? "账户历史覆盖不足，请刷新重试"
          : reason === "budget"
            ? "账户历史查询超出预算，请缩小查询窗口"
            : reason === "changed"
              ? "账户历史快照已变化，请重新查询"
              : "账户历史事实不完整，已拒绝接纳",
    );
    this.name = "WalletHistoryError";
  }
}
export function historyCheck(condition: unknown): asserts condition {
  if (!condition) throw new WalletHistoryError("incompatible");
}
export function historyInteger(value: unknown): number {
  historyCheck(typeof value === "number");
  return checkpointNumber(value);
}
function bytes(value: unknown, empty = false) {
  historyCheck(typeof value === "string" && value.length <= 22_369_624);
  const result = fromBase64(value);
  historyCheck(
    (empty || result.length > 0) &&
      toBase64(result) === value &&
      result.length <= 16_777_216,
  );
  return result;
}
function effectsDigest(value: Uint8Array) {
  const prefix = new TextEncoder().encode("TransactionEffects::");
  const typed = new Uint8Array(prefix.length + value.length);
  typed.set(prefix);
  typed.set(value, prefix.length);
  return toBase58(blake2b(typed, { dkLen: 32 }));
}
const systemKinds = new Set([
  "GenesisTransaction",
  "ConsensusCommitPrologueTransaction",
  "ChangeEpochTransaction",
  "RandomnessStateUpdateTransaction",
  "AuthenticatorStateUpdateTransaction",
  "EndOfEpochTransaction",
  "ProgrammableSystemTransaction",
]);
/** Native GraphQL JSON is protobuf JSON. BCS is authoritative; no legacy RPC DTO is synthesized. */
export async function admitHistoryTransaction(
  input: unknown,
  lower: number,
  upper: number,
): Promise<WalletHistoryTransaction> {
  const row = responseRecord(input),
    native = responseRecord(row.transaction),
    effects = responseRecord(native.effects);
  const digest = assertGenesisDigest(row.digest),
    checkpoint = historyInteger(row.checkpoint);
  historyCheck(
    checkpoint >= lower &&
      checkpoint <= upper &&
      native.digest === digest &&
      effects.digest === digest &&
      historyInteger(responseRecord(effects.checkpoint).sequenceNumber) ===
        checkpoint,
  );
  historyCheck(row.status === "SUCCESS" || row.status === "FAILURE");
  historyCheck(effects.status === row.status);
  const kind = responseRecord(native.kind).__typename;
  historyCheck(typeof kind === "string");
  const sender = row.sender === null ? null : walletAddress(row.sender);
  historyCheck(
    sender === null
      ? native.sender === null &&
          typeof kind === "string" &&
          systemKinds.has(kind)
      : kind === "ProgrammableTransaction" &&
          walletAddress(responseRecord(native.sender).address) === sender,
  );
  const tx = GrpcTypes.Transaction.fromJson(
    responseRecord(native.transactionJson) as Parameters<
      typeof GrpcTypes.Transaction.fromJson
    >[0],
  );
  const fx = GrpcTypes.TransactionEffects.fromJson(
    responseRecord(effects.effectsJson) as Parameters<
      typeof GrpcTypes.TransactionEffects.fromJson
    >[0],
  );
  const txBytes = bytes(native.transactionBcs),
    fxBytes = bytes(effects.effectsBcs);
  historyCheck(
    (!tx.bcs?.value || toBase64(tx.bcs.value) === toBase64(txBytes)) &&
      (!fx.bcs?.value || toBase64(fx.bcs.value) === toBase64(fxBytes)),
  );
  tx.bcs = { value: txBytes };
  fx.bcs = { value: fxBytes };
  historyCheck(
    walletAddress(tx.sender) === (sender ?? walletAddress("0x0")) &&
      fx.version === effects.version &&
      fx.digest === assertGenesisDigest(effects.effectsDigest) &&
      fx.digest === effectsDigest(fxBytes),
  );
  historyCheck(
    typeof fx.status?.success === "boolean" &&
      fx.status.success === (row.status === "SUCCESS"),
  );
  historyCheck(
    Array.isArray(effects.balanceChangesJson) &&
      effects.balanceChangesJson.length <= 10_000,
  );
  const balances = effects.balanceChangesJson.map((value) =>
    GrpcTypes.BalanceChange.fromJson(
      responseRecord(value) as Parameters<
        typeof GrpcTypes.BalanceChange.fromJson
      >[0],
    ),
  );
  const balanceKeys = balances.map((value) =>
    JSON.stringify([walletAddress(value.address), dynamicType(value.coinType)]),
  );
  historyCheck(new Set(balanceKeys).size === balanceKeys.length);
  const gas = responseRecord(responseRecord(effects.gasEffects).gasSummary);
  for (const key of [
    "computationCost",
    "storageCost",
    "storageRebate",
  ] as const)
    historyCheck(BigInt(historyInteger(gas[key])) === fx.gasUsed?.[key]);
  historyCheck(
    typeof effects.timestamp === "string" &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(effects.timestamp),
  );
  const timestamp = Date.parse(effects.timestamp);
  historyCheck(
    Number.isSafeInteger(timestamp) &&
      timestamp > 0 &&
      new Date(timestamp).toISOString().slice(0, 19) ===
        effects.timestamp.slice(0, 19),
  );
  const facts = responseRecord(row.eventFacts);
  historyCheck(
    facts.complete === true &&
      Array.isArray(facts.events) &&
      facts.events.length <= 10_000 &&
      (facts.eventsDigest ?? null) === (fx.eventsDigest ?? null),
  );
  const events = facts.events.map((value, index) => {
    const node = responseRecord(value),
      contents = responseRecord(node.contents);
    historyCheck(
      historyInteger(node.sequenceNumber) === index &&
        responseRecord(node.transaction).digest === digest &&
        node.timestamp === effects.timestamp,
    );
    const eventBytes = bytes(node.eventBcs),
      event = WalletEventBcs.parse(eventBytes);
    historyCheck(
      toBase64(WalletEventBcs.serialize(event).toBytes()) ===
        toBase64(eventBytes),
    );
    const type = dynamicType(responseRecord(contents.type).repr);
    historyCheck(
      walletAddress(responseRecord(node.sender).address) === event.sender &&
        dynamicType(TypeTagSerializer.tagToString({ struct: event.type })) ===
          type &&
        responseRecord(node.transactionModule).fullyQualifiedName ===
          `${event.packageId}::${event.module}` &&
        toBase64(bytes(contents.bcs, true)) === toBase64(event.contents) &&
        contents.json !== null &&
        contents.json !== undefined,
    );
    return GrpcTypes.Event.create({
      packageId: event.packageId,
      module: event.module,
      sender: event.sender,
      eventType: type,
      contents: { value: event.contents },
    });
  });
  const envelope = GrpcTypes.TransactionEvents.create({
    events,
    ...(fx.eventsDigest
      ? {
          digest: fx.eventsDigest,
          bcs: { value: serializeEventEnvelope(events) },
        }
      : {}),
  });
  assertEventEnvelope(envelope, fx.eventsDigest);
  const raw = GrpcTypes.ExecutedTransaction.create({
    digest,
    transaction: tx,
    effects: fx,
    checkpoint: BigInt(checkpoint),
    balanceChanges: balances,
    events: envelope,
    timestamp: {
      seconds: BigInt(Math.floor(timestamp / 1000)),
      nanos: (timestamp % 1000) * 1_000_000,
    },
  });
  // History supplies no transaction signatures: it is display evidence, never confirmation/recovery authorization.
  assertNativeExecutedTransaction(raw, txBytes);
  const parsedTx = bcs.TransactionData.parse(txBytes);
  historyCheck(
    toBase64(bcs.TransactionData.serialize(parsedTx).toBytes()) ===
      toBase64(txBytes) &&
      parsedTx.V1.sender === walletAddress(tx.sender) &&
      TransactionDataBuilder.getDigestFromBytes(txBytes) === digest,
  );
  const gasBcs = parsedTx.V1.gasData;
  historyCheck(
    gasBcs.owner === walletAddress(tx.gasPayment!.owner) &&
      gasBcs.budget === tx.gasPayment!.budget!.toString() &&
      gasBcs.price === tx.gasPayment!.price!.toString() &&
      JSON.stringify(gasBcs.payment) ===
        JSON.stringify(
          tx.gasPayment!.objects.map((ref) => ({
            objectId: walletAddress(ref.objectId),
            version: ref.version!.toString(),
            digest: ref.digest,
          })),
        ),
  );
  const wireKinds: Record<string, GrpcTypes.TransactionKind_Kind> = {
    ProgrammableTransaction: 1,
    ChangeEpoch: 2,
    Genesis: 3,
    ConsensusCommitPrologue: 4,
    AuthenticatorStateUpdate: 5,
    EndOfEpochTransaction: 6,
    RandomnessStateUpdate: 7,
    ConsensusCommitPrologueV2: 8,
    ConsensusCommitPrologueV3: 9,
    ConsensusCommitPrologueV4: 10,
    ProgrammableSystemTransaction: 11,
  };
  historyCheck(wireKinds[parsedTx.V1.kind.$kind] === tx.kind!.kind);
  if (parsedTx.V1.kind.$kind === "Genesis") historyCheck(checkpoint === 0);
  // The SDK's programmable builder cannot represent system kinds. Retain their native facts rather than creating a fake PTB.
  if (sender === null) {
    const names: Record<string, string> = {
      Genesis: "GenesisTransaction",
      ChangeEpoch: "ChangeEpochTransaction",
      ConsensusCommitPrologue: "ConsensusCommitPrologueTransaction",
      ConsensusCommitPrologueV2: "ConsensusCommitPrologueTransaction",
      ConsensusCommitPrologueV3: "ConsensusCommitPrologueTransaction",
      ConsensusCommitPrologueV4: "ConsensusCommitPrologueTransaction",
      AuthenticatorStateUpdate: "AuthenticatorStateUpdateTransaction",
      EndOfEpochTransaction: "EndOfEpochTransaction",
      RandomnessStateUpdate: "RandomnessStateUpdateTransaction",
      ProgrammableSystemTransaction: "ProgrammableSystemTransaction",
    };
    historyCheck(names[parsedTx.V1.kind.$kind] === kind);
  } else
    await validateFinalSimulation(
      { transaction: raw, commandOutputs: [] },
      txBytes,
    );
  const result =
    sender === null
      ? null
      : parseGrpcTransactionResponse(raw, {
          include: {
            effects: true,
            transaction: true,
            bcs: true,
            balanceChanges: true,
            objectTypes: true,
            events: true,
          },
        });
  const transaction = result
    ? (result.Transaction ?? result.FailedTransaction!)
    : null;
  if (transaction) {
    const changes = receiptObjectEffects(transaction);
    const byId = new Map(changes.map((change) => [change.objectId, change]));
    // Native RPC uses a package marker outside Move TypeTag grammar. Its
    // authoritative BCS output must agree; the string alone proves nothing.
    const types = Object.entries(transaction.objectTypes).map(([id, type]) => {
      const objectId = walletAddress(id),
        change = byId.get(objectId);
      historyCheck(change);
      historyCheck(
        (type === "package") === (change.outputState === "PackageWrite"),
      );
      return [objectId, type === "package" ? type : dynamicType(type)];
    });
    historyCheck(new Set(types.map(([id]) => id)).size === types.length);
    transaction.objectTypes = Object.fromEntries(types);
    // The history projection omits the repeated changed-object list, so the
    // SDK has no JSON types to map. Only in that trimmed shape is the BCS
    // output state allowed to stand in for the marker: a row that still carries
    // the mirror but drops a type must stay rejected below, because an index
    // that cannot name the type it observed has not proved the fact.
    const mirrored =
      Array.isArray(
        (effects.effectsJson as Record<string, unknown> | undefined)
          ?.changedObjects,
      );
    if (!mirrored)
      for (const change of changes)
        if (change.outputState === "PackageWrite")
          transaction.objectTypes[change.objectId] = "package";
    for (const change of changes)
      if (change.outputState === "PackageWrite")
        historyCheck(transaction.objectTypes[change.objectId] === "package");
    if (sender) receiptStakeEvents(transaction, sender);
  }
  historyCheck(
    Array.isArray(row.origins) &&
      row.origins.length > 0 &&
      row.origins.length <= 10_000,
  );
  const origins = row.origins.map((value) => {
    historyCheck(
      typeof value === "string" &&
        (value === "affectedAddress" ||
          /^(?:kiosk|capability):0x[0-9a-f]{64}$/.test(value)),
    );
    return value;
  });
  historyCheck(new Set(origins).size === origins.length);
  return Object.freeze({
    digest,
    checkpoint,
    sender,
    origins: Object.freeze(origins),
    status: row.status,
    timestampMs: timestamp,
    kind: String(kind),
    nativeTransaction: native,
    eventFacts: facts,
    transaction,
    kioskTransfers: row.kioskTransfers ?? null,
  });
}
