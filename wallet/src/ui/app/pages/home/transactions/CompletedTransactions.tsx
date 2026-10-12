// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import Alert from "_components/alert";
import { ErrorBoundary } from "_components/error-boundary";
import Loading from "_components/loading";
import { TransactionCard } from "_components/transactions-card";
import { NoActivityCard } from "_components/transactions-card/NoActivityCard";
import { useQueryTransactionsByAddress } from "_hooks";
import { useI18n } from "_app/i18n";
import { useActiveAddress } from "_src/ui/app/hooks/useActiveAddress";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";

export function CompletedTransactions() {
  const { t } = useI18n();
  const rpc = useWalletRpc();
  const activeAddress = useActiveAddress();
  const {
    data: history,
    isPending,
    error,
  } = useQueryTransactionsByAddress(activeAddress);
  if (rpc.state === "unconfigured" || rpc.state === "invalid")
    return <Alert>{rpc.message}</Alert>;
  if (!activeAddress) return null;
  if (!walletReadAllowed(rpc, "history"))
    return <Alert>{t("activity.admissionBlocked")}</Alert>;
  if (error) {
    return <Alert>{walletReadErrorMessage(error)}</Alert>;
  }
  return (
    <Loading loading={isPending}>
      {history && (
        <div role="status" className="px-4 text-sm text-steel-darker">
          {t("activity.window", {
            lo: String(history.checkpointLo),
            hi: String(history.checkpointHi),
          })}
          {(!history.coverage.allAccountActivityCertified ||
            !history.coverage.registrationComplete ||
            !history.coverage.completeForDiscoveredOwnerTokens ||
            !history.coverage.completeForDiscoveredCapabilities) && (
            <p>{t("activity.limited")}</p>
          )}
        </div>
      )}
      {history?.transactions.length && activeAddress ? (
        history.transactions.map((txn) => (
          <ErrorBoundary key={txn.digest}>
            <TransactionCard txn={txn} address={activeAddress} />
          </ErrorBoundary>
        ))
      ) : (
        <NoActivityCard message={t("activity.windowEmpty")} />
      )}
    </Loading>
  );
}
