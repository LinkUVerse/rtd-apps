// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Message } from "../messaging/messages";
import type {
  SignedMessage,
  SignedTransaction,
} from "../messaging/signed-results";
import type { DappConfirmedResult } from "./dapp-execution-result";
export type DappEgressPayload =
  | { type: "sign-transaction-response"; result: SignedTransaction }
  | { type: "execute-transaction-response"; result: DappConfirmedResult }
  | { type: "sign-message-request"; return: SignedMessage };
export type DappEgressMessage = Message & { payload: DappEgressPayload };

export const DAPP_EGRESS_SOURCE_CHANNEL = "rtd-egress-source";
export const DAPP_EGRESS_GATE_CHANNEL = "rtd-egress-gate";
export const DAPP_EGRESS_GATE_PATH = "egress-gate.html";
export const DAPP_EGRESS_MAX_BYTES = 2 * 1024 * 1024;
export function ownEgressObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    !!value &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.getOwnPropertySymbols(value).length === 0 &&
    Object.getOwnPropertyNames(value).length === keys.length &&
    keys.every(
      (k) =>
        Object.hasOwn(value, k) &&
        Object.hasOwn(Object.getOwnPropertyDescriptor(value, k)!, "value"),
    )
  );
}
export function isSensitiveDappResult(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const p = (value as { payload?: { type?: unknown; return?: unknown } })
    .payload;
  return (
    !!p &&
    (p.type === "execute-transaction-response" ||
      p.type === "sign-transaction-response" ||
      p.type === "sign-message-request")
  );
}
function base64(value: unknown, empty = false): boolean {
  if (
    typeof value !== "string" ||
    (!empty && !value) ||
    value.length > DAPP_EGRESS_MAX_BYTES ||
    !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  )
    return false;
  try {
    return btoa(atob(value)) === value;
  } catch {
    return false;
  }
}
/** Shape/size only. Producer authorization and cryptographic verification remain mandatory. */
export function validateDappEgressMessage(
  value: unknown,
  requestId: string,
): DappEgressMessage {
  const fail = (): never => {
    throw new Error("dApp结果格式无效");
  };
  if (
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 200 ||
    !ownEgressObject(value, ["id", "payload"]) ||
    value.id !== requestId ||
    !value.payload ||
    typeof value.payload !== "object"
  )
    return fail();
  const p = value.payload as Record<string, unknown>;
  if (p.type === "sign-transaction-response") {
    if (
      !ownEgressObject(p, ["type", "result"]) ||
      !ownEgressObject(p.result, ["transactionBlockBytes", "signature"]) ||
      !base64(p.result.transactionBlockBytes) ||
      !base64(p.result.signature)
    )
      return fail();
  } else if (p.type === "sign-message-request") {
    if (
      !ownEgressObject(p, ["type", "return"]) ||
      !ownEgressObject(p.return, ["messageBytes", "signature"]) ||
      !base64(p.return.messageBytes, true) ||
      !base64(p.return.signature)
    )
      return fail();
  } else if (p.type === "execute-transaction-response") {
    if (
      !ownEgressObject(p, ["type", "result"]) ||
      !ownEgressObject(p.result, ["digest", "bytes", "signature", "effects"]) ||
      typeof p.result.digest !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.result.digest) ||
      !base64(p.result.bytes) ||
      !base64(p.result.signature) ||
      !base64(p.result.effects)
    )
      return fail();
  } else return fail();
  if (
    new TextEncoder().encode(JSON.stringify(value)).length >
    DAPP_EGRESS_MAX_BYTES
  )
    return fail();
  return value as DappEgressMessage;
}
