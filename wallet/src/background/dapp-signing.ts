// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { messageWithIntent } from "rtd-typescript/cryptography";
import {
  withAuthorizedDappRequest,
  dappPreparedRegistry,
  type PrepareDappArgs,
} from "./dapp-preparation";
import { BrowserExecutionLock } from "../shared/rpc/execution-coordinator";
import { WalletExecutionJournal } from "../shared/rpc/execution-journal";
import {
  approvedTransaction,
  WalletExecutionReader,
} from "../shared/rpc/execution-reader";
import { WalletTransactionReader } from "../shared/rpc/transaction-reader";
import { executionScopeKey } from "../shared/rpc/profile";
import { createTransactionMoveAuthorizer } from "../shared/rpc/transaction-move-admission";
import transactions from "./Transactions";
import { transactionMoveDependencies } from "../shared/rpc/transaction-move-dependencies";
export interface SignDappPreparedArgs extends PrepareDappArgs {
  readonly approvalToken: string;
}
/** Sign only: no dispatch, gas reconstruction or journal containing signing bytes. */
export async function signDappPrepared(input: SignDappPreparedArgs) {
  const args = Object.freeze({ ...input });
  return withAuthorizedDappRequest(
    args,
    async ({ session, account, request, sender, authorize }) => {
      if (request.binding?.mode !== "sign")
        throw new Error("此请求未授权只签名操作");
      const fixed = dappPreparedRegistry.consume(args.approvalToken, {
        accountId: args.accountId,
        requestId: args.requestId,
        bindingKey: session.bindingKey,
        origin: request.origin,
        sourceHash: request.binding.sourceHash,
        mode: "sign",
      });
      const data = approvedTransaction(fixed.bytesBase64, sender);
      if (data.digest !== fixed.digest) throw new Error("批准交易摘要不匹配");
      const moveAuthorization = createTransactionMoveAuthorizer(
        session,
        fixed.bytesBase64,
        sender,
        authorize,
      );
      const scope = executionScopeKey(session.profile, sender);
      return new BrowserExecutionLock().run(
        scope,
        async () => {
          await authorize();
          if (await new WalletExecutionJournal().pending(scope))
            throw new Error("当前账户存在未确定交易，请先恢复原交易");
          await moveAuthorization.activate();
          const simulation = await new WalletTransactionReader(
            session,
          ).simulate(fixed.bytesBase64, sender);
          if (
            simulation.$kind !== "Transaction" ||
            simulation.Transaction.digest !== fixed.digest
          )
            throw new Error("批准交易未通过正式模拟");
          await moveAuthorization.authorize();
          const claim = await transactions.captureDappEgress(
            args.requestId,
            session.profile,
            sender,
            transactionMoveDependencies(
              session.profile,
              fixed.bytesBase64,
              sender,
            ).areas,
          );
          const signature = await moveAuthorization.runFinal(() =>
            transactions.runDappAction(args.requestId, claim, "sign", () =>
              account.signData(
                messageWithIntent(
                  "TransactionData",
                  Uint8Array.from(data.bytes),
                ),
              ),
            ),
          );
          await moveAuthorization.authorize();
          transactions.sealDappEgress(args.requestId, claim, {
            type: "sign-transaction-response",
            result: { transactionBlockBytes: fixed.bytesBase64, signature },
          });
          await new WalletExecutionReader(session).verifySignature(
            fixed.bytesBase64,
            sender,
            signature,
            session.signal,
          );
          await moveAuthorization.authorize();
          return moveAuthorization.runFinal(() =>
            Promise.resolve({ bytes: fixed.bytesBase64, signature }),
          );
        },
        session.signal,
      );
    },
  );
}
