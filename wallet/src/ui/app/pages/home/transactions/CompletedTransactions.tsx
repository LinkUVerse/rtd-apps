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
    hasMore,
    loadMore,
    loadingMore,
    loadMoreError,
    cached,
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
  // Until the first verified page arrives, the last visit's rows are shown so
  // the tab is not blank; a banner says they are being refreshed. They are
  // replaced by the verified page, or by the error if the read fails.
  const shown = history ?? cached;
  const showingCached = !history && !!cached;
  return (
    <Loading loading={isPending && !shown}>
      <div className="flex items-center justify-between gap-3 px-4">
        {shown ? (
          <span role="status" className="text-sm text-steel-darker">
            {t("activity.window", {
              lo: String(shown.checkpointLo),
              hi: String(shown.checkpointHi),
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
      {showingCached ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="activity-cached-banner"
          className="mx-4 flex items-center gap-2 rounded-lg bg-gray-40 px-3 py-2 text-xs text-steel-darker"
        >
          <LoadingIndicator />
          <span>
            {t("activity.showingCached", {
              time: new Date(cached!.savedAt).toLocaleString(),
            })}
          </span>
        </div>
      ) : null}
      {shown &&
        (!shown.coverage.allAccountActivityCertified ||
          !shown.coverage.registrationComplete ||
          !shown.coverage.completeForDiscoveredOwnerTokens ||
          !shown.coverage.completeForDiscoveredCapabilities) && (
          <p className="px-4 text-sm text-steel-darker">
            {t("activity.limited")}
          </p>
        )}
      {shown?.transactions.length && activeAddress ? (
        shown.transactions.map((txn) => (
          <ErrorBoundary key={txn.digest}>
            <TransactionCard txn={txn} address={activeAddress} />
          </ErrorBoundary>
        ))
      ) : (
        <NoActivityCard message={t("activity.windowEmpty")} />
      )}
      {/* Older rows are read page by page inside the same verified window; a
          failed page keeps the rows already shown and can simply be retried. */}
      {loadMoreError ? (
        <p role="alert" className="px-4 text-sm text-issue-dark">
          {walletReadErrorMessage(loadMoreError)}
        </p>
      ) : null}
      {hasMore && !showingCached ? (
        <div className="flex justify-center px-4 py-3">
          <button
            type="button"
            data-testid="load-more-activity"
            aria-busy={loadingMore}
            disabled={loadingMore}
            onClick={() => void loadMore?.()}
            className="flex items-center gap-2 rounded-full border border-gray-45 bg-white px-4 py-2 text-sm font-semibold text-steel-darker disabled:opacity-60"
          >
            {loadingMore ? <LoadingIndicator /> : null}
            {loadingMore ? t("activity.loadingMore") : t("activity.loadMore")}
          </button>
        </div>
      ) : null}
    </Loading>
  );
}
