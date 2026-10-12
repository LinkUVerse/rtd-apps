// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from "rtd-typescript/transactions";
import transactions from "./Transactions";
import permissions from "./Permissions";
import { withExecutionAccount } from "./execution";
import { assertDappRequestBinding } from "../shared/rpc/dapp-request-binding";
import { walletAddress } from "../shared/rpc/asset-address";
import { WalletTransactionReader } from "../shared/rpc/transaction-reader";
import { unsupportedSponsorExecution } from "../shared/rpc/transaction-sponsorship";

import { withPreparationGuard } from "../shared/rpc/preparation-guard";
import { dappPreparedRegistry } from "./dapp-state";
export { dappPreparedRegistry } from "./dapp-state";

export interface PrepareDappArgs {
  readonly accountId: string;
  readonly requestId: string;
}
/** Origin-checked UI command: source transaction and chain come only from background storage. */
export async function withAuthorizedDappRequest<T>(
  input: PrepareDappArgs,
  operation: (context: {
    session: Parameters<
      Parameters<typeof withExecutionAccount>[1]
    >[0]["session"];
    account: Parameters<
      Parameters<typeof withExecutionAccount>[1]
    >[0]["account"];
    request: import("../shared/messaging/messages/payloads/transactions/ApprovalRequest").ApprovalRequest;
    sender: string;
    authorize: () => Promise<void>;
  }) => Promise<T>,
  options: { readOnly?: true; preparing?: true } = {},
): Promise<T> {
  const { accountId, requestId } = input;
  if (typeof requestId !== "string" || !requestId || requestId.length > 200)
    throw new Error("dApp请求标识无效");
  return withExecutionAccount(
    accountId,
    async ({ session, account, authorize, authorizeLocal }) => {
      const lifetime = transactions.getRequestSignal(requestId);
      const close = () => session.close();
      lifetime.addEventListener("abort", close, { once: true });
      try {
        lifetime.throwIfAborted();
        const sender = walletAddress(await account.address);
        const readAuthorized = async () => {
          lifetime.throwIfAborted();
          // Fence local state before reading the request. The full authorization
          // below probes fresh identities and rechecks account/profile afterward;
          // probing twice here repeats all three endpoints within one boundary.
          await authorizeLocal();
          const request = await transactions.getTransactionRequest(requestId);
          if (
            !request ||
            request.id !== requestId ||
            request.approved !== null ||
            request.tx.type !== "transaction"
          )
            throw new Error("dApp批准请求已失效");
          const age = Date.now() - Date.parse(request.createdDate);
          if (!Number.isFinite(age) || age < 0 || age >= 3 * 60 * 60 * 1000)
            throw new Error("dApp批准请求已过期");
          const binding = await assertDappRequestBinding(
            request.binding!,
            requestId,
            request.origin,
            request.tx,
            session.profile,
          );
          if (binding.account !== sender) throw new Error("dApp批准账户不匹配");
          // Always read current permissions; a stored approval is not an enduring grant.
          if (
            !(await permissions.hasPermissions(
              request.origin,
              ["viewAccount", "suggestTransactions"],
              undefined,
              sender,
            ))
          )
            throw new Error("dApp账户权限已撤销");
          lifetime.throwIfAborted();
          await authorize();
          lifetime.throwIfAborted();
          return request;
        };
        const request = await readAuthorized();
        if (request.tx.type !== "transaction")
          throw new Error("dApp交易类型无效");
        const reauthorize = async () => {
          const fresh = await readAuthorized();
          if (
            fresh.binding?.sourceHash !== request.binding?.sourceHash ||
            fresh.binding?.mode !== request.binding?.mode ||
            fresh.origin !== request.origin
          )
            throw new Error("dApp请求在准备期间已改变");
        };
        return await operation({
          session,
          account,
          request,
          sender,
          authorize: reauthorize,
        });
      } finally {
        lifetime.removeEventListener("abort", close);
      }
    },
    true,
    {
      verifyTransactionNetwork: !options.readOnly,
      ...(options.preparing ? { preparationRequestId: requestId } : {}),
    },
  );
}

export async function prepareDappTransaction(input: PrepareDappArgs) {
  return withAuthorizedDappRequest(
    input,
    async ({ session, request, sender, authorize }) => {
      if (request.tx.type !== "transaction")
        throw new Error("dApp交易类型无效");
      const transactionData = request.tx.data;
      const transaction = Transaction.from(transactionData);
      if (
        unsupportedSponsorExecution(
          transaction,
          sender,
          request.tx.justSign === true,
        )
      )
        throw new Error("赞助交易需要完整多方签名授权，当前入口不能单独提交");
      const prepared = await withPreparationGuard(
        session,
        sender,
        async () => {
          const result = await new WalletTransactionReader(session).prepare(
            transaction,
            sender,
          );
          await authorize();
          return result;
        },
        { requestId: input.requestId },
      );
      const approval = dappPreparedRegistry.register(
        input.accountId,
        request.binding!,
        prepared,
      );
      return {
        requestId: input.requestId,
        binding: request.binding!,
        prepared,
        ...approval,
      };
    },
    { preparing: true },
  );
}
