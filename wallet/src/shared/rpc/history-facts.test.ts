// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2.js";
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { TransactionDataBuilder } from "rtd-typescript/transactions";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";
import { historyRow } from "../../../tests/unit/rpc/history-fixtures";
import { admitHistoryTransaction } from "./history-facts";
import {
  eventEnvelopeDigest,
  serializeEventEnvelope,
  WalletEventBcs,
} from "./event-envelope";
import { walletAddress } from "./asset-address";

function installEffects(row: any, raw: GrpcTypes.ExecutedTransaction) {
  const body = raw.effects!.bcs!.value!,
    prefix = new TextEncoder().encode("TransactionEffects::");
  const typed = new Uint8Array(prefix.length + body.length);
  typed.set(prefix);
  typed.set(body, prefix.length);
  raw.effects!.digest = toBase58(blake2b(typed, { dkLen: 32 }));
  Object.assign(row.transaction.effects, {
    effectsDigest: raw.effects!.digest,
    effectsBcs: toBase64(body),
    effectsJson: GrpcTypes.TransactionEffects.toJson({
      ...raw.effects!,
      bcs: undefined,
    }),
  });
}
async function withEvents(count = 55) {
  const { row, raw } = await historyRow();
  const event = {
    packageId: walletAddress("0x3"),
    module: "example",
    sender: row.sender,
    eventType: "0x3::example::Event",
    contents: { value: bcs.u64().serialize(9007199254740993n).toBytes() },
  };
  const events = Array.from({ length: count }, () =>
    GrpcTypes.Event.create(event),
  );
  const digest = eventEnvelopeDigest(serializeEventEnvelope(events));
  const effects = bcs.TransactionEffects.parse(raw.effects!.bcs!.value!);
  effects.V2!.eventsDigest = digest;
  raw.effects!.eventsDigest = digest;
  raw.effects!.bcs = {
    value: bcs.TransactionEffects.serialize(effects).toBytes(),
  };
  installEffects(row, raw);
  Object.assign(row.eventFacts, {
    eventsDigest: digest,
    events: events.map((item, index) => ({
      sequenceNumber: index,
      eventBcs: toBase64(
        WalletEventBcs.serialize({
          packageId: event.packageId,
          module: event.module,
          sender: event.sender,
          type: {
            address: event.packageId,
            module: "example",
            name: "Event",
            typeParams: [],
          },
          contents: event.contents.value,
        }).toBytes(),
      ),
      timestamp: row.transaction.effects.timestamp,
      sender: { address: row.sender },
      contents: {
        bcs: toBase64(event.contents.value),
        json: { value: "9007199254740993" },
        type: { repr: event.eventType },
      },
      transactionModule: {
        fullyQualifiedName: `${event.packageId}::${event.module}`,
      },
      transaction: { digest: row.digest },
    })),
  });
  return row;
}
describe("历史原生facts与BCS一致性", () => {
  it("完整超过50事件与内容精度保留；JSON不作为事件事实来源", async () => {
    const row = await withEvents();
    const admitted = await admitHistoryTransaction(row, 0, 25);
    expect(admitted.transaction!.events).toHaveLength(55);
    expect(admitted.eventFacts).toEqual(row.eventFacts);
    expect(bcs.u64().parse(admitted.transaction!.events[0].bcs)).toBe(
      "9007199254740993",
    );
  });
  it.each([
    "truncated",
    "contents",
    "type",
    "module",
    "sender",
    "sequence",
    "timestamp",
    "parent",
    "incomplete",
  ])("事件%s拒绝整条历史", async (failure) => {
    const row: any = await withEvents(2),
      node = row.eventFacts.events[0];
    if (failure === "truncated") row.eventFacts.events.pop();
    if (failure === "contents") node.contents.bcs = "AA==";
    if (failure === "type") node.contents.type.repr = "0x3::example::Other";
    if (failure === "module")
      node.transactionModule.fullyQualifiedName = "0x3::other";
    if (failure === "sender") node.sender.address = "0x1";
    if (failure === "sequence") node.sequenceNumber = 1;
    if (failure === "timestamp") node.timestamp = "2026-10-02T00:00:00Z";
    if (failure === "parent")
      node.transaction.digest = toBase58(new Uint8Array(32).fill(9));
    if (failure === "incomplete") row.eventFacts.complete = false;
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toThrow();
  });
  it.each([
    "digest",
    "checkpoint",
    "sender",
    "kind",
    "bcs",
    "effects-digest",
    "status",
    "gas",
    "amount",
    "balance-duplicate",
    "invalid-date",
    "noncanonical",
    "origin",
  ])("原生%s不能补默认值接纳", async (failure) => {
    const { row }: any = await historyRow(),
      native = row.transaction,
      effects = native.effects;
    if (failure === "digest")
      native.digest = toBase58(new Uint8Array(32).fill(4));
    if (failure === "checkpoint") effects.checkpoint.sequenceNumber = 22;
    if (failure === "sender") native.sender.address = "0x1";
    if (failure === "kind") delete native.kind.__typename;
    if (failure === "bcs") native.transactionBcs = "AA==";
    if (failure === "effects-digest")
      effects.effectsDigest = toBase58(new Uint8Array(32).fill(4));
    if (failure === "status") row.status = "FAILURE";
    if (failure === "gas") effects.gasEffects.gasSummary.storageCost = 0;
    if (failure === "amount") effects.balanceChangesJson[0].amount = "1e9";
    if (failure === "balance-duplicate")
      effects.balanceChangesJson.push({ ...effects.balanceChangesJson[0] });
    if (failure === "invalid-date") effects.timestamp = "2026-02-30T01:02:03Z";
    if (failure === "noncanonical") native.transactionBcs += "\n";
    if (failure === "origin") row.origins = ["ToAddress"];
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toThrow();
  });
  it("系统交易保留null sender和原生facts，不构造伪PTB；错种类及非0 Genesis拒绝", async () => {
    const { row, raw }: any = await historyRow();
    const bytes = bcs.TransactionData.serialize({
      V1: {
        kind: { Genesis: { objects: [] } },
        sender: "0x0",
        gasData: { payment: [], owner: "0x0", price: 0n, budget: 0n },
        expiration: { None: true },
      },
    }).toBytes();
    const digest = TransactionDataBuilder.getDigestFromBytes(bytes),
      zero = walletAddress("0x0");
    const tx = GrpcTypes.Transaction.create({
      bcs: { value: bytes },
      digest,
      sender: zero,
      gasPayment: { owner: zero, price: 0n, budget: 0n, objects: [] },
      kind: {
        kind: 3,
        data: { oneofKind: "genesis", genesis: { objects: [] } },
      },
      expiration: { kind: 1 },
    });
    raw.effects.transactionDigest = digest;
    const effects = bcs.TransactionEffects.parse(raw.effects.bcs.value);
    effects.V2!.transactionDigest = digest;
    raw.effects.bcs.value = bcs.TransactionEffects.serialize(effects).toBytes();
    installEffects(row, raw);
    Object.assign(row, { digest, checkpoint: 0, sender: null });
    Object.assign(row.transaction, {
      digest,
      sender: null,
      kind: { __typename: "GenesisTransaction" },
      transactionBcs: toBase64(bytes),
      transactionJson: GrpcTypes.Transaction.toJson({ ...tx, bcs: undefined }),
    });
    Object.assign(row.transaction.effects, {
      digest,
      checkpoint: { sequenceNumber: 0 },
    });
    const admitted = await admitHistoryTransaction(row, 0, 25);
    expect(admitted.sender).toBeNull();
    expect(admitted.transaction).toBeNull();
    expect(admitted.kind).toBe("GenesisTransaction");
    const wrong = structuredClone(row);
    wrong.transaction.transactionJson.kind.kind = "PROGRAMMABLE_TRANSACTION";
    await expect(admitHistoryTransaction(wrong, 0, 25)).rejects.toThrow();
    row.checkpoint = 1;
    row.transaction.effects.checkpoint.sequenceNumber = 1;
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toThrow();
  });
});
