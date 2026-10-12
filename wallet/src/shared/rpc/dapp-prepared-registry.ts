// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { DappRequestBinding } from "./dapp-request-binding";
import type { WalletPreparedTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";

export interface DappPreparedClaim {
  readonly accountId: string;
  readonly requestId: string;
  readonly bindingKey: string;
  readonly origin: string;
  readonly sourceHash: string;
  readonly mode: "sign" | "execute";
}
export interface DappPreparedEntry extends DappPreparedClaim {
  readonly bytesBase64: string;
  readonly digest: string;
  readonly sender: string;
  readonly expiresAt: number;
}
/** Background memory only. Worker restart requires a new preview; journal never stores these bytes. */
export class DappPreparedRegistry {
  readonly #entries = new Map<string, Readonly<DappPreparedEntry>>();
  constructor(
    readonly now: () => number = Date.now,
    readonly token: () => string = () => crypto.randomUUID(),
    readonly maxEntries = 32,
    readonly ttlMs = 5 * 60 * 1000,
  ) {}
  register(
    accountId: string,
    binding: DappRequestBinding,
    prepared: WalletPreparedTransaction,
  ) {
    this.#prune();
    if (
      prepared.bindingKey !== binding.bindingKey ||
      prepared.sender !== binding.account
    )
      throw new Error("后台准备交易与请求绑定不匹配");
    // A new preview replaces previous approval bytes for this request.
    for (const [key, entry] of this.#entries)
      if (entry.requestId === binding.requestId) this.#entries.delete(key);
    if (this.#entries.size >= this.maxEntries)
      throw new Error("待批准交易过多，请关闭旧请求后重试");
    const key = this.token();
    if (!key || this.#entries.has(key)) throw new Error("批准凭据生成失败");
    const entry = Object.freeze({
      accountId,
      requestId: binding.requestId,
      bindingKey: binding.bindingKey,
      origin: binding.origin,
      sourceHash: binding.sourceHash,
      mode: binding.mode,
      bytesBase64: prepared.bytesBase64,
      digest: prepared.digest,
      sender: prepared.sender,
      expiresAt: this.now() + this.ttlMs,
    });
    this.#entries.set(key, entry);
    return { approvalToken: key, expiresAt: entry.expiresAt };
  }
  /** Synchronous removal precedes any await/signing; concurrent consumers cannot both sign. */
  consume(
    token: string,
    claim: DappPreparedClaim,
  ): Readonly<DappPreparedEntry> {
    this.#prune();
    const entry = this.#entries.get(token);
    if (!entry) throw new Error("批准凭据已失效，请重新预览");
    this.#entries.delete(token);
    for (const key of [
      "accountId",
      "requestId",
      "bindingKey",
      "origin",
      "sourceHash",
      "mode",
    ] as const)
      if (entry[key] !== claim[key])
        throw new Error("批准凭据与当前请求不匹配");
    return entry;
  }
  revokeRequest(requestId: string) {
    for (const [key, entry] of this.#entries)
      if (entry.requestId === requestId) this.#entries.delete(key);
  }
  clear() {
    this.#entries.clear();
  }
  #prune() {
    const now = this.now();
    for (const [key, entry] of this.#entries)
      if (entry.expiresAt <= now) this.#entries.delete(key);
  }
}
