// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { ErrorBoundary } from "_components/error-boundary";
import Loading from "_components/loading";
import { TransactionCard } from "_components/transactions-card";
import { NoActivityCard } from "_components/transactions-card/NoActivityCard";
import { useQueryTransactionsByAddress } from "_hooks";
import { useI18n } from "_app/i18n";
import { useActiveAddress } from "_src/ui/app/hooks/useActiveAddress";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";
import { Refresh16 } from "rtd-apps-icons";
import { useEffect } from "react";

export function CompletedTransactions() {
  const { t } = useI18n();
  const rpc = useWalletRpc();
  const activeAddress = useActiveAddress();
  const {
    data: history,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQueryTransactionsByAddress(activeAddress);
  const allowed = walletReadAllowed(rpc, "history");
  // Returning to the tab is the moment a just-sent transfer is expected. The
  // previous page stays on screen (the query keeps it as placeholder data) and
  // the reader returns whole windows newest-first, so the new row appears at the
  // head without a loading screen.
  useEffect(() => {
    if (!allowed || !activeAddress) return;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void refetch({ cancelRefetch: false });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [allowed, activeAddress, refetch]);
  if (rpc.state === "unconfigured" || rpc.state === "invalid")
    return <Alert>{rpc.message}</Alert>;
  if (!activeAddress) return null;
  if (!allowed) return <Alert>{t("activity.admissionBlocked")}</Alert>;
  // An in-flight refresh keeps the admitted page on screen (the query holds it
  // as placeholder data). A *failed* one must not: an unreadable window cannot
  // stand in for a verified one, so the error replaces the rows.
  if (error) return <Alert>{walletReadErrorMessage(error)}</Alert>;
  return (
    <Loading loading={isPending && !history}>
      <div className="flex items-center justify-between gap-3 px-4">
        {history ? (
          <span role="status" className="text-sm text-steel-darker">
            {t("activity.window", {
              lo: String(history.checkpointLo),
              hi: String(history.checkpointHi),
            })}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          data-testid="refresh-activity"
          aria-label={t("activity.refresh")}
          aria-busy={isFetching}
          disabled={isFetching}
          onClick={() => void refetch({ cancelRefetch: false })}
          className="flex shrink-0 items-center gap-1 rounded-full border border-gray-45 bg-white px-3 py-1 text-xs font-semibold text-steel-darker disabled:opacity-60"
        >
          {isFetching ? (
            <LoadingIndicator />
          ) : (
            <Refresh16 className="h-3 w-3" />
          )}
          {isFetching ? t("activity.refreshing") : t("activity.refresh")}
        </button>
      </div>
      {history &&
        (!history.coverage.allAccountActivityCertified ||
          !history.coverage.registrationComplete ||
          !history.coverage.completeForDiscoveredOwnerTokens ||
          !history.coverage.completeForDiscoveredCapabilities) && (
          <p className="px-4 text-sm text-steel-darker">
            {t("activity.limited")}
          </p>
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
