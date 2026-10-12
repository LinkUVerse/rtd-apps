// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  withAuthorizedDappRequest,
  dappPreparedRegistry,
} from "./dapp-preparation";
import type { SignDappPreparedArgs } from "./dapp-signing";
import { WalletExecutionCoordinator } from "../shared/rpc/execution-coordinator";
import { WalletExecutionJournal } from "../shared/rpc/execution-journal";
import { WalletExecutionReader } from "../shared/rpc/execution-reader";
import { WalletTransactionReader } from "../shared/rpc/transaction-reader";
import { recoveredDappResult } from "../shared/rpc/dapp-recovered-result";
import { executionScopeKey } from "../shared/rpc/profile";
import type { PrepareDappArgs } from "./dapp-preparation";
import { createTransactionMoveAuthorizer } from "../shared/rpc/transaction-move-admission";
import transactions from "./Transactions";
import { transactionMoveDependencies } from "../shared/rpc/transaction-move-dependencies";
import type { WalletDappEgressClaim } from "./dapp-egress-peer";
export type DappExecutionResult =
  | {
      state: "confirmed";
      digest: string;
      bytes: string;
      signature: string;
      effects: string;
    }
  | { state: "pending"; digest: string; recordId: string };
/** Execute only the registered bytes; durable journal precedes network dispatch. */
export async function executeDappPrepared(
  input: SignDappPreparedArgs,
): Promise<DappExecutionResult> {
  const args = Object.freeze({ ...input });
  return withAuthorizedDappRequest(
    args,
    async ({ session, account, request, sender, authorize }) => {
      if (request.binding?.mode !== "execute")
        throw new Error("此请求未授权执行操作");
      const fixed = dappPreparedRegistry.consume(args.approvalToken, {
        accountId: args.accountId,
        requestId: args.requestId,
        bindingKey: session.bindingKey,
        origin: request.origin,
        sourceHash: request.binding.sourceHash,
        mode: "execute",
      });
      let signature: string | undefined;
      let claim: WalletDappEgressClaim | undefined;
      const moveAuthorization = createTransactionMoveAuthorizer(
        session,
        fixed.bytesBase64,
        sender,
        authorize,
      );
      const reader = new WalletExecutionReader(session, {
        finalDispatch: (send) =>
          moveAuthorization.runFinal(() => {
            if (!claim) throw new Error("执行缺少原始结果授权");
            return transactions.runDappAction(
              args.requestId,
              claim,
              "dispatch",
              send,
            );
          }),
      });
      const outcome = await new WalletExecutionCoordinator(
        session,
        new WalletExecutionJournal(),
        reader,
      ).execute(
        {
          accountId: args.accountId,
          accountAddress: sender,
          requestId: args.requestId,
          originRef: request.origin,
          bindingKey: fixed.bindingKey,
          bytesBase64: fixed.bytesBase64,
          digest: fixed.digest,
        },
        {
          authorize: moveAuthorization.authorize,
          simulate: async (bytes, owner) => {
            await moveAuthorization.activate();
            const result = await new WalletTransactionReader(session).simulate(
              bytes,
              owner,
            );
            if (
              result.$kind !== "Transaction" ||
              result.Transaction.digest !== fixed.digest
            )
              throw new Error("批准交易未通过正式模拟");
          },
          signData: async (intent) => {
            claim = await transactions.captureDappEgress(
              args.requestId,
              session.profile,
              sender,
              transactionMoveDependencies(
                session.profile,
                fixed.bytesBase64,
                sender,
              ).areas,
            );
            signature = await moveAuthorization.runFinal(() =>
              transactions.runDappAction(args.requestId, claim!, "sign", () =>
                account.signData(intent),
              ),
            );
            return signature;
          },
        },
      );
      const digest =
        outcome.state === "confirmed" ? outcome.receipt.digest : outcome.digest;
      if (digest !== fixed.digest)
        throw new Error("当前账户另有未确定交易，请先恢复原交易");
      if (outcome.state === "pending")
        return { state: "pending", digest, recordId: outcome.recordId };
      if (!signature) {
        const result = await recoveredDappResult(
          await reader.details(digest, session.signal),
          outcome.receipt,
          session.bindingKey,
          sender,
          fixed.bytesBase64,
        );
        await authorize();
        transactions.sealRecoveredDappExecution(args.requestId, result);
        return { state: "confirmed", ...result };
      }
      await authorize();
      const result = {
        digest,
        bytes: fixed.bytesBase64,
        signature,
        effects: outcome.receipt.effectsBase64,
      };
      if (!claim) throw new Error("执行缺少原始结果授权");
      transactions.sealDappEgress(args.requestId, claim, {
        type: "execute-transaction-response",
        result,
      });
      return { state: "confirmed", ...result };
    },
  );
}

/** Read/recover this exact authorized request; no approval token, building, signing or dispatch. */
export async function recoverDappExecution(
  input: PrepareDappArgs,
): Promise<DappExecutionResult | null> {
  const args = Object.freeze({ ...input });
  return withAuthorizedDappRequest(
    args,
    async ({ session, request, sender, authorize }) => {
      if (request.binding?.mode !== "execute")
        throw new Error("此请求未授权执行恢复");
      const journal = new WalletExecutionJournal();
      const id = JSON.stringify([
        executionScopeKey(session.profile, sender),
        args.requestId,
      ]);
      const record = await journal.get(id);
      await authorize();
      if (!record) return null;
      if (
        record.requestId !== args.requestId ||
        record.accountId !== args.accountId ||
        record.accountAddress !== sender ||
        record.originRef !== request.origin ||
        record.bindingKey !== session.bindingKey
      ) {
        throw new Error("恢复记录不属于当前dApp授权");
      }
      const reader = new WalletExecutionReader(session);
      const outcome =
        record.state === "dispatch-pending"
          ? await new WalletExecutionCoordinator(
              session,
              journal,
              reader,
            ).recover(sender, authorize)
          : {
              state: "confirmed" as const,
              recordId: id,
              receipt: record.receipt!,
            };
      if (
        !outcome ||
        outcome.recordId !== id ||
        (outcome.state === "confirmed"
          ? outcome.receipt.digest
          : outcome.digest) !== record.digest
      ) {
        throw new Error("恢复期间原交易记录已改变，请重新查询");
      }
      if (outcome.state === "pending")
        return { state: "pending", digest: record.digest, recordId: id };
      const result = await recoveredDappResult(
        await reader.details(record.digest, session.signal),
        outcome.receipt,
        session.bindingKey,
        sender,
      );
      await authorize();
      transactions.sealRecoveredDappExecution(args.requestId, result);
      return { state: "confirmed", ...result };
    },
    { readOnly: true },
  );
}
