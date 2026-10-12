// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from "rtd-typescript/transactions";
import { walletAddress } from "./asset-address";
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";

export interface DappRequestBinding {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly origin: string;
  readonly account: string;
  readonly chain: string;
  readonly bindingKey: string;
  readonly sourceHash: string;
  readonly mode: "sign" | "execute";
}
export interface DappTransactionSource {
  readonly data: string;
  readonly account: string;
  readonly chain?: string;
  readonly justSign?: boolean;
}
async function sourceHash(data: string) {
  if (typeof data !== "string" || !data.length || data.length > 2_000_000)
    throw new Error("dApp交易请求超出大小限制");
  const bytes = new TextEncoder().encode(data);
  if (!bytes.length || bytes.length > 2_000_000)
    throw new Error("dApp交易请求超出大小限制");
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
/** Called in background with browser-supplied origin and its selected profile, never UI claims. */
export async function bindDappRequest(
  requestId: string,
  origin: string,
  source: DappTransactionSource,
  profile: ValidatedNetworkProfile,
): Promise<DappRequestBinding> {
  if (
    !source ||
    typeof source !== "object" ||
    (source.justSign !== undefined && typeof source.justSign !== "boolean")
  )
    throw new Error("dApp交易请求格式不合法");
  const url = new URL(origin);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error("dApp请求来源不合法");
  if (typeof requestId !== "string" || !requestId || requestId.length > 200)
    throw new Error("dApp请求标识不合法");
  if (source.chain !== profile.walletStandardChain)
    throw new Error("dApp请求链与当前钱包网络不匹配");
  const account = walletAddress(source.account);
  const hash = await sourceHash(source.data);
  const tx = Transaction.from(source.data).getData();
  if (tx.sender !== null && walletAddress(tx.sender) !== account)
    throw new Error("dApp交易sender与授权账户不匹配");
  return Object.freeze({
    schemaVersion: 1,
    requestId,
    origin,
    account,
    chain: profile.walletStandardChain,
    bindingKey: networkBindingKey(profile),
    sourceHash: hash,
    mode: source.justSign ? "sign" : "execute",
  });
}
/** Recheck persisted request identity before preparing/signing; this does not itself authorize a signature. */
export async function assertDappRequestBinding(
  binding: DappRequestBinding,
  requestId: string,
  origin: string,
  source: DappTransactionSource,
  profile: ValidatedNetworkProfile,
) {
  if (!binding || binding.schemaVersion !== 1)
    throw new Error("旧dApp请求缺少网络绑定，请重新发起");
  const expected = await bindDappRequest(requestId, origin, source, profile);
  for (const key of Object.keys(expected) as (keyof DappRequestBinding)[])
    if (binding[key] !== expected[key])
      throw new Error("dApp请求、账户或网络绑定已改变，请重新发起");
  return expected;
}
