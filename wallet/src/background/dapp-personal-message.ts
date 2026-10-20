import { assertPersonalMessageChain } from "./personal-message-chain";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import {
  messageWithIntent,
  parseSerializedSignature,
} from "rtd-typescript/cryptography";
import { verifyPersonalMessageSignature } from "rtd-typescript/verify";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import transactions from "./Transactions";
import permissions from "./Permissions";
import { getAccountByID } from "./accounts";
import { isSigningAccount } from "./accounts/Account";
import { accountsEvents } from "./accounts/events";
import NetworkEnv from "./NetworkEnv";
import { walletAddress } from "../shared/rpc/asset-address";
import { resolveNetworkProfile } from "../shared/rpc/profile-registry";
import { WalletReadSession } from "../shared/rpc/session";
import { WalletExecutionReader } from "../shared/rpc/execution-reader";
import type { PrepareDappArgs } from "./dapp-preparation";
const signingRequests = new Set<string>();
/** PersonalMessage has no transaction gas/GraphQL requirement; ordinary signatures verify locally. */
export async function signDappPersonalMessage(input: PrepareDappArgs) {
  const { accountId, requestId } = input;
  if (
    typeof accountId !== "string" ||
    !accountId ||
    accountId.length > 200 ||
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 200
  )
    throw new Error("消息签名账户或请求标识无效");
  const lifetime = transactions.getRequestSignal(requestId);
  if (signingRequests.has(requestId))
    throw new Error("消息请求已进入签名，请重新发起");
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("消息授权会话已改变"));
  lifetime.addEventListener("abort", cancel, { once: true });
  accountsEvents.on("accountsChanged", cancel);
  accountsEvents.on("accountStatusChanged", cancel);
  accountsEvents.on("activeAccountChanged", cancel);
  NetworkEnv.on("changed", cancel);
  try {
    const account = await getAccountByID(accountId);
    if (!account || account.id !== accountId || !isSigningAccount(account))
      throw new Error("账户不支持后台签名");
    const owner = walletAddress(await account.address);
    const request = await transactions.getTransactionRequest(requestId);
    if (!request || request.tx.type !== "sign-message")
      throw new Error("消息请求无效");
    const source = request.tx.message;
    const requestedChain = request.tx.chain;
    if (typeof source !== "string" || source.length > 1_400_000)
      throw new Error("消息大小超限");
    const message = fromBase64(source);
    if (message.length > 1_048_576 || toBase64(message) !== source)
      throw new Error("消息编码无效");
    const origin = request.origin;
    const authorize = async () => {
      lifetime.throwIfAborted();
      controller.signal.throwIfAborted();
      const fresh = await transactions.getTransactionRequest(requestId);
      const age = fresh ? Date.now() - Date.parse(fresh.createdDate) : NaN;
      if (
        !fresh ||
        fresh.id !== requestId ||
        fresh.approved !== null ||
        fresh.origin !== origin ||
        fresh.tx.type !== "sign-message" ||
        fresh.tx.message !== source ||
        fresh.tx.chain !== requestedChain ||
        walletAddress(fresh.tx.accountAddress) !== owner ||
        !Number.isFinite(age) ||
        age < 0 ||
        age >= 10800000
      )
        throw new Error("消息批准请求已失效");
      await assertPersonalMessageChain(requestedChain);
      controller.signal.throwIfAborted();
      const current = await getAccountByID(accountId);
      if (
        !current ||
        current.id !== accountId ||
        walletAddress(await current.address) !== owner ||
        (await current.isLocked()) ||
        !(await current.toUISerialized()).selected
      )
        throw new Error("消息签名账户已改变");
      if (
        !(await permissions.hasPermissions(
          origin,
          ["viewAccount", "suggestTransactions"],
          undefined,
          owner,
        ))
      )
        throw new Error("消息账户权限已撤销");
      lifetime.throwIfAborted();
      controller.signal.throwIfAborted();
    };
    await authorize();
    lifetime.throwIfAborted();
    controller.signal.throwIfAborted();
    // Recheck after asynchronous authorization, then claim synchronously before signing.
    if (signingRequests.has(requestId))
      throw new Error("消息请求已进入签名，请重新发起");
    signingRequests.add(requestId);
    lifetime.addEventListener(
      "abort",
      () => signingRequests.delete(requestId),
      { once: true },
    );
    const selected = await resolveNetworkProfile(
      await NetworkEnv.getActiveNetwork(),
      process.env.WALLET_NETWORK_PROFILES,
    );
    if (selected.state !== "configured") throw new Error(selected.message);
    const claim = await transactions.captureDappEgress(
      requestId,
      selected.profile,
      owner,
      [],
    );
    const signature = await transactions.runDappAction(
      requestId,
      claim,
      "sign",
      () =>
        account.signData(
          messageWithIntent(
            "PersonalMessage",
            bcs.vector(bcs.u8()).serialize(message).toBytes(),
          ),
        ),
    );
    await authorize();
    if (parseSerializedSignature(signature).signatureScheme === "ZkLogin") {
      const selected = await resolveNetworkProfile(
        await NetworkEnv.getActiveNetwork(),
        process.env.WALLET_NETWORK_PROFILES,
      );
      if (selected.state !== "configured") throw new Error(selected.message);
      const session = new WalletReadSession(selected.profile);
      const close = () => session.close();
      controller.signal.addEventListener("abort", close, { once: true });
      NetworkEnv.on("changed", close);
      try {
        await new WalletExecutionReader(session).verifyPersonalMessage(
          message,
          owner,
          signature,
          controller.signal,
        );
      } finally {
        session.close();
        controller.signal.removeEventListener("abort", close);
        NetworkEnv.off("changed", close);
      }
    } else
      await verifyPersonalMessageSignature(message, signature, {
        address: owner,
      });
    await authorize();
    transactions.sealDappEgress(requestId, claim, {
      type: "sign-message-request",
      return: { messageBytes: source, signature },
    });
    return { messageBytes: source, signature };
  } finally {
    NetworkEnv.off("changed", cancel);
    lifetime.removeEventListener("abort", cancel);
    accountsEvents.off("accountsChanged", cancel);
    accountsEvents.off("accountStatusChanged", cancel);
    accountsEvents.off("activeAccountChanged", cancel);
  }
}
