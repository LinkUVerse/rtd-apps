// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2.js";
import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import type { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { assertGenesisDigest } from "./profile";

// Rust rtd-types Event field order and TransactionEvents::data; Identifier is a BCS string.
export const WalletEventBcs = bcs.struct("Event", {
  packageId: bcs.Address,
  module: bcs.string(),
  sender: bcs.Address,
  type: bcs.StructTag,
  contents: bcs.byteVector(),
});
const EventsBcs = bcs.struct("TransactionEvents", {
  data: bcs.vector(WalletEventBcs),
});
export function serializeEventEnvelope(events: readonly GrpcTypes.Event[]) {
  return EventsBcs.serialize({
    data: events.map((event) => {
      const tag = TypeTagSerializer.parseFromStr(
        dynamicType(event.eventType),
        true,
      );
      if (
        !("struct" in tag) ||
        typeof event.module !== "string" ||
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(event.module) ||
        !(event.contents?.value instanceof Uint8Array) ||
        event.contents.value.length > 1_048_576
      )
        throw new Error("交易事件字段不完整");
      return {
        packageId: walletAddress(event.packageId),
        module: event.module,
        sender: walletAddress(event.sender),
        type: tag.struct,
        contents: event.contents.value,
      };
    }),
  }).toBytes();
}
export function eventEnvelopeDigest(bytes: Uint8Array): string {
  const prefix = new TextEncoder().encode("TransactionEvents::");
  const typed = new Uint8Array(prefix.length + bytes.length);
  typed.set(prefix);
  typed.set(bytes, prefix.length);
  return toBase58(blake2b(typed, { dkLen: 32 }));
}
export function assertEventEnvelope(
  raw: GrpcTypes.TransactionEvents | undefined,
  effectsDigest: string | undefined,
): void {
  if (!raw) {
    if (effectsDigest) throw new Error("交易事件未完整返回");
    return;
  }
  if (raw.events.length > 10_000) throw new Error("交易事件超出预算");
  if (!effectsDigest) {
    if (raw.events.length || raw.digest)
      throw new Error("无事件的effects与事件列表不一致");
    return;
  }
  if (
    !(raw.bcs?.value instanceof Uint8Array) ||
    raw.bcs.value.length > 16_777_216 ||
    assertGenesisDigest(raw.digest) !== effectsDigest
  )
    throw new Error("交易事件BCS／摘要缺失");
  const serialized = serializeEventEnvelope(raw.events);
  if (
    toBase64(serialized) !== toBase64(raw.bcs.value) ||
    eventEnvelopeDigest(serialized) !== effectsDigest
  )
    throw new Error("交易事件列表与effects摘要不一致");
}
