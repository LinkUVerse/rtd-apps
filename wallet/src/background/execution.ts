// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from "rtd-typescript/transactions";
import { assertApprovedRecipient } from "../shared/rpc/approved-recipient";
import { WalletFullnodeReader } from "../shared/rpc/fullnode-reader";
import {
  WalletExecutionCoordinator,
  type WalletExecutionOutcome,
} from "../shared/rpc/execution-coordinator";
import {
  WalletExecutionJournal,
  type WalletStoredReceipt,
} from "../shared/rpc/execution-journal";
import { WalletExecutionReader } from "../shared/rpc/execution-reader";
import { WalletTransactionReader } from "../shared/rpc/transaction-reader";
import { WalletNameReader } from "../shared/rpc/name-reader";
import {
  networkBindingKey,
  executionScopeKey,
  assertGenesisDigest,
} from "../shared/rpc/profile";
import { selectNetworkProfile } from "../shared/rpc/profile-registry";
import { WalletReadSession } from "../shared/rpc/session";
import { walletAddress } from "../shared/rpc/asset-address";
import { assertTransactionNetworkIdentity } from "../shared/rpc/transaction-network-identity";
import { withPreparationGuard } from "../shared/rpc/preparation-guard";
import { createTransactionMoveAuthorizer } from "../shared/rpc/transaction-move-admission";
import { getAccountByID } from "./accounts";
import { isSigningAccount } from "./accounts/Account";
import { accountsEvents } from "./accounts/events";
import NetworkEnv from "./NetworkEnv";

export interface ExecutePreparedArgs {
  readonly accountId: string;
  readonly bindingKey: string;
  readonly requestId: string;
  readonly bytesBase64: string;
  readonly digest: string;
  readonly recipientName?: string;
  readonly recipientAddress?: string;
}
/** This command is reachable only from the existing origin-checked extension UI connection. */
export async function executeWalletPrepared(
  input: ExecutePreparedArgs,
): Promise<WalletExecutionOutcome> {
  const args = Object.freeze({ ...input });
  return withExecutionAccount(
    args.accountId,
    async ({ session, account, authorize }) => {
      if (args.bindingKey !== session.bindingKey)
        throw new Error("钱包网络配置已改变，请重新预览");
      const sender = walletAddress(await account.address);
      const moveAuthorization = createTransactionMoveAuthorizer(
        session,
        args.bytesBase64,
        sender,
        authorize,
      );
      let nameValidUntil: number | undefined;
      const finalAction = <T>(start: () => Promise<T>) =>
        moveAuthorization.runFinal(() => {
          if (
            nameValidUntil !== undefined &&
            performance.now() >= nameValidUntil
          )
            throw new Error("收款名称校验已过期，请重新预览");
          return start();
        });
      const coordinator = new WalletExecutionCoordinator(
        session,
        new WalletExecutionJournal(),
        new WalletExecutionReader(session, {
          finalDispatch: finalAction,
        }),
      );
      return coordinator.execute(
        {
          accountId: account.id,
          accountAddress: sender,
          requestId: args.requestId,
          originRef: "wallet-ui",
          bindingKey: args.bindingKey,
          bytesBase64: args.bytesBase64,
          digest: args.digest,
        },
        {
          authorize: async () => {
            await moveAuthorization.authorize();
            if (
              nameValidUntil !== undefined &&
              performance.now() >= nameValidUntil
            )
              throw new Error("收款名称校验已过期，请重新预览");
          },
          simulate: async (bytes, owner) => {
            await moveAuthorization.activate();
            const result = await new WalletTransactionReader(session).simulate(
              bytes,
              owner,
            );
            if (
              result.$kind !== "Transaction" ||
              result.Transaction.digest !== args.digest
            )
              throw new Error("批准交易在签名前未通过模拟");
            if (args.recipientName) {
              // Names are checked again in background; UI's cached proof is never an authorization.
              const resolution = await new WalletNameReader(session).resolve(
                args.recipientName,
              );
              if (
                !resolution ||
                !Number.isFinite(resolution.validUntilMonotonicMs) ||
                performance.now() >= resolution.validUntilMonotonicMs ||
                !args.recipientAddress ||
                resolution.address !== walletAddress(args.recipientAddress)
              )
                throw new Error("收款名称的目标已改变，请重新预览");
              nameValidUntil = resolution.validUntilMonotonicMs;
              await assertApprovedRecipient(
                Transaction.from(bytes).getData(),
                args.recipientAddress,
                session.profile.packages,
                (id, signal) =>
                  new WalletFullnodeReader(session).object(id, signal),
              );
            }
          },
          signData: (intent) => finalAction(() => account.signData(intent)),
        },
      );
    },
  );
}
const recoveryRequests = new Map<
  string,
  Promise<WalletExecutionOutcome | null>
>();
export async function recoverWalletExecution(
  accountId: string,
): Promise<WalletExecutionOutcome | null> {
  return withExecutionAccount(
    accountId,
    async ({ session, account, authorize }) => {
      const address = walletAddress(await account.address);
      const key = JSON.stringify([session.bindingKey, account.id, address]);
      let request = recoveryRequests.get(key);
      if (!request) {
        request = new WalletExecutionCoordinator(
          session,
          new WalletExecutionJournal(),
          new WalletExecutionReader(session),
        ).recover(address, authorize);
        recoveryRequests.set(key, request);
        const current = request;
        void current
          .finally(() => {
            if (recoveryRequests.get(key) === current)
              recoveryRequests.delete(key);
          })
          .catch(() => undefined);
      }
      // Wakeups and UI readers share only an in-flight recovery, never a dispatch.
      // Each caller still checks its own account/network lifetime before observing it.
      const result = await request;
      await authorize();
      return result;
    },
    false,
  );
}
export interface ReadStoredReceiptArgs {
  readonly accountId: string;
  readonly bindingKey: string;
  readonly digest: string;
}
/** Find a durable terminal receipt independently of transport availability, without clearing pending. */
export async function readWalletStoredReceipt(
  input: ReadStoredReceiptArgs,
): Promise<WalletStoredReceipt | null> {
  const args = Object.freeze({ ...input });
  assertGenesisDigest(args.digest);
  return withExecutionAccount(
    args.accountId,
    async ({ session, account, authorize }) => {
      if (args.bindingKey !== session.bindingKey)
        throw new Error("钱包网络配置已改变");
      const accountAddress = walletAddress(await account.address);
      const receipt = await new WalletExecutionJournal().confirmedReceipt(
        executionScopeKey(session.profile, accountAddress),
        args.digest,
      );
      await authorize();
      return receipt
        ? Object.freeze({
            bindingKey: session.bindingKey,
            accountAddress,
            receipt,
          })
        : null;
    },
    false,
  );
}
export async function withExecutionAccount<T>(
  accountId: string,
  operation: (context: {
    session: WalletReadSession;
    account: NonNullable<Awaited<ReturnType<typeof getAccountByID>>> & {
      signData: (intent: Uint8Array) => Promise<string>;
    };
    authorize: () => Promise<void>;
    /** Local account/profile fence; callers still need authorize at each action boundary. */
    authorizeLocal: () => Promise<void>;
  }) => Promise<T>,
  signing = true,
  options: {
    verifyTransactionNetwork?: boolean;
    preparationRequestId?: string;
  } = {},
): Promise<T> {
  if (typeof accountId !== "string" || !accountId || accountId.length > 200)
    throw new Error("授权账户无效");
  if (
    options.preparationRequestId !== undefined &&
    (!signing ||
      options.verifyTransactionNetwork === false ||
      typeof options.preparationRequestId !== "string" ||
      !options.preparationRequestId ||
      options.preparationRequestId.length > 200)
  )
    throw new Error("准备请求标识无效");
  const lifetime = new AbortController();
  let ownedSession: WalletReadSession | undefined;
  const close = () => {
    lifetime.abort(new Error("授权会话已改变，请重新批准"));
    ownedSession?.close();
  };
  const status = ({ accountID }: { accountID: string }) => {
    if (accountID === accountId) close();
  };
  const active = ({ accountID }: { accountID: string }) => {
    if (accountID !== accountId) close();
  };
  NetworkEnv.on("changed", close);
  accountsEvents.on("accountsChanged", close);
  accountsEvents.on("accountStatusChanged", status);
  accountsEvents.on("activeAccountChanged", active);
  try {
    const network = await NetworkEnv.getActiveNetwork();
    lifetime.signal.throwIfAborted();
    const selected = selectNetworkProfile(
      network,
      process.env.WALLET_NETWORK_PROFILES,
    );
    if (selected.state !== "configured") throw new Error(selected.message);
    const account = await getAccountByID(accountId);
    lifetime.signal.throwIfAborted();
    if (!account || account.id !== accountId || !isSigningAccount(account))
      throw new Error("当前账户不支持background签名");
    const authorizedAddress = walletAddress(await account.address);
    lifetime.signal.throwIfAborted();
    const session = new WalletReadSession(selected.profile);
    ownedSession = session;
    const authorizeLocal = async () => {
      session.assertActive();
      const current = selectNetworkProfile(
        await NetworkEnv.getActiveNetwork(),
        process.env.WALLET_NETWORK_PROFILES,
      );
      if (
        current.state !== "configured" ||
        networkBindingKey(current.profile) !== session.bindingKey
      )
        throw new Error("钱包网络配置已改变");
      const fresh = await getAccountByID(accountId);
      if (
        !fresh ||
        fresh.id !== accountId ||
        (signing && (await fresh.isLocked())) ||
        walletAddress(await fresh.address) !== authorizedAddress ||
        !(await fresh.toUISerialized()).selected
      )
        throw new Error("授权账户已锁定、切换或删除");
      session.assertActive();
    };
    const authorize = async () => {
      await authorizeLocal();
      if (signing && options.verifyTransactionNetwork !== false) {
        await assertTransactionNetworkIdentity(session);
        // An identity response cannot re-authorize an account/profile changed while waiting.
        await authorizeLocal();
      }
    };
    if (options.preparationRequestId !== undefined) {
      await authorizeLocal();
      // Refuse competing preparation before starting any new identity observation.
      // The actual preparation keeps its own guard after this short lock is released.
      await withPreparationGuard(
        session,
        authorizedAddress,
        async () => undefined,
        {
          requestId: options.preparationRequestId,
        },
      );
    }
    await authorize();
    return await operation({ session, account, authorize, authorizeLocal });
  } finally {
    ownedSession?.close();
    NetworkEnv.off("changed", close);
    accountsEvents.off("accountsChanged", close);
    accountsEvents.off("accountStatusChanged", status);
    accountsEvents.off("activeAccountChanged", active);
  }
}
