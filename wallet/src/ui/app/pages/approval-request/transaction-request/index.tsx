// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UserApproveContainer } from "_components/user-approve-container";
import { useAppDispatch, useTransactionData } from "_hooks";
import { type TransactionApprovalRequest } from "_payloads/transactions/ApprovalRequest";
import { respondToTransactionRequest } from "_redux/slices/transaction-requests";
import { ampli } from "_src/shared/analytics/ampli";
import { useAccountByAddress } from "_src/ui/app/hooks/useAccountByAddress";
import { useI18n } from "_src/ui/app/i18n";
import { PageMainLayoutTitle } from "_src/ui/app/shared/page-main-layout/PageMainLayoutTitle";
import { Transaction } from "rtd-typescript/transactions";
import { unsupportedSponsorExecution } from "_src/shared/rpc/transaction-sponsorship";
import Alert from "_components/alert";
import { useMemo } from "react";

import { DappPreparationContext, coalesceDappPreparation } from "_src/ui/app/hooks/DappPreparationContext";
import { useBackgroundClient } from "_src/ui/app/hooks/useBackgroundClient";
import { SimulationPreview } from "./SimulationPreview";
import { DappRecoveryGate } from "./DappRecoveryGate";
import { TransactionValidity, canApproveTransactionValidity } from "./TransactionValidity";
import { GasFees } from "./GasFees";
import { TransactionDetails } from "./TransactionDetails";

export type TransactionRequestProps = {
  txRequest: TransactionApprovalRequest;
};

// Some applications require *a lot* of transactions to interact with, and this
// eats up our analytics event quota. As a short-term solution so we don't have
// to stop tracking this event entirely, we'll just manually exclude application
// origins with this list
const appOriginsToExcludeFromAnalytics = ["https://rtd8192.ethoswallet.xyz"];

export function TransactionRequest({ txRequest }: TransactionRequestProps) {
  const { data: account } = useAccountByAddress(txRequest.tx.account);
  const background = useBackgroundClient();
  const scope = useMemo(
    () => ({
      requestId: txRequest.id,
      accountId: account?.id,
      prepare: coalesceDappPreparation(async () => {
        if (!account?.id) throw new Error("批准账户不可用");
        const result = await background.prepareDappTransaction({
          requestId: txRequest.id,
          accountId: account.id,
        });
        if (
          result.requestId !== txRequest.id ||
          result.binding.sourceHash !== txRequest.binding?.sourceHash ||
          result.binding.origin !== txRequest.origin
        )
          throw new Error("后台预览与批准请求不匹配");
        return {
          ...result.prepared,
          dappApproval: {
            accountId: account.id,
            requestId: txRequest.id,
            approvalToken: result.approvalToken,
            expiresAt: result.expiresAt,
          },
        };
      }),
    }),
    [
      account?.id,
      txRequest.id,
      txRequest.binding?.sourceHash,
      txRequest.origin,
      background,
    ],
  );
  return (
    <DappPreparationContext.Provider value={scope}>
      {txRequest.tx.justSign ? <TransactionRequestContent txRequest={txRequest} /> :
        <DappRecoveryGate key={`${account?.id}:${txRequest.id}:${txRequest.binding?.bindingKey}`}
          accountId={account?.id} account={account ?? undefined} requestId={txRequest.id} origin={txRequest.origin} bindingKey={txRequest.binding?.bindingKey}>
          {(afterAttempt) => <TransactionRequestContent txRequest={txRequest} afterAttempt={afterAttempt} />}
        </DappRecoveryGate>}

    </DappPreparationContext.Provider>
  );
}

function TransactionRequestContent({ txRequest, afterAttempt }: TransactionRequestProps & { afterAttempt?: () => Promise<void> }) {
  const { t } = useI18n();
  const addressForTransaction = txRequest.tx.account;
  const { data: accountForTransaction } = useAccountByAddress(
    addressForTransaction,
  );
  const dispatch = useAppDispatch();
  const transaction = useMemo(() => {
    const tx = Transaction.from(txRequest.tx.data);
    if (addressForTransaction) {
      tx.setSenderIfNotSet(addressForTransaction);
    }
    return tx;
  }, [txRequest.tx.data, addressForTransaction]);
  const { prepared, isPending, isError } = useTransactionData(
    addressForTransaction,
    transaction,
  );
  const validExpiration = canApproveTransactionValidity(prepared?.bytesBase64);
  const unsupportedSponsor = unsupportedSponsorExecution(transaction, addressForTransaction, txRequest.tx.justSign === true);
  if (!accountForTransaction) {
    return null;
  }
  return (
    <>
      <UserApproveContainer
        origin={txRequest.origin}
        originFavIcon={txRequest.originFavIcon}
        approveTitle={t("approval.approve")}
        rejectTitle={t("dapp.reject")}
        onSubmit={async (approved: boolean) => {
          if (
            approved &&
            (isPending ||
              isError ||
              unsupportedSponsor ||
              !validExpiration ||
              !prepared?.dappApproval ||
              prepared.dappApproval.expiresAt <= Date.now())
          )
            return;
          await dispatch(
            respondToTransactionRequest({
              approved,
              txRequestID: txRequest.id,
              dappApproval: prepared?.dappApproval,
            }),
          );
          if (approved && !txRequest.tx.justSign) await afterAttempt?.();
          if (!appOriginsToExcludeFromAnalytics.includes(txRequest.origin)) {
            ampli.respondedToTransactionRequest({
              applicationUrl: txRequest.origin,
              approvedTransaction: approved,
              receivedFailureWarning: false,
              type: txRequest.tx.justSign ? "sign" : "sign-and-execute",
            });
          }
        }}
        address={addressForTransaction}
        approveLoading={isPending}
        approveDisabled={
          isPending ||
          isError ||
          unsupportedSponsor ||
          !validExpiration ||
          !prepared?.dappApproval ||
          prepared.dappApproval.expiresAt <= Date.now()
        }
        checkAccountLock
      >
        <PageMainLayoutTitle title={t("approval.approveTransaction")} />
        {unsupportedSponsor && <Alert>{t("approval.sponsorExecutionUnsupported")}</Alert>}
        <div className="flex flex-col">
          <div className="flex flex-col gap-4">
            <SimulationPreview
              prepared={prepared}
              isPending={isPending}
              isError={isError}
            />
          </div>
          <section className="theme-card -mx-6">
            <div className="flex flex-col gap-4 p-6">
              <GasFees
                sender={addressForTransaction}
                transaction={transaction}
              />
              <TransactionValidity bytesBase64={!isError && !isPending ? prepared?.bytesBase64 : undefined} />
              <TransactionDetails
                sender={addressForTransaction}
                transaction={transaction}
              />
            </div>
          </section>
        </div>
      </UserApproveContainer>
    </>
  );
}
