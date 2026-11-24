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
import { usePendingActivity } from "_src/ui/app/hooks/usePendingActivity";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";
import { Refresh16, Spinner16 } from "rtd-apps-icons";
import cl from "clsx";
import { useCallback, useEffect, useState } from "react";

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
  const [manualRefreshing, setManualRefreshing] = useState(false);
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
  // A confirmed execution is shown from the local store until the checkpoint
  // read returns the same digest; the verified row then replaces it.
  const { pendingRows, pendingDigests, confirmedDigests } = usePendingActivity(
    activeAddress,
    error ? undefined : (history ?? cached)?.transactions,
  );
  // Every hook stays above the early returns: the page can start unconfigured,
  // address-less, blocked or failed and then recover, and a hook that only some
  // renders reach makes React fail with "rendered more hooks than before".
  const refreshActivity = useCallback(async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    const started = Date.now();
    try {
      await refetch({ cancelRefetch: false });
    } finally {
      // Keep the spinner perceptible on a fast archive read without delaying
      // the data or locking the control longer than one interaction cycle.
      const remaining = 450 - (Date.now() - started);
      window.setTimeout(
        () => setManualRefreshing(false),
        Math.max(0, remaining),
      );
    }
  }, [manualRefreshing, refetch]);
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
  const rows = shown ? [...pendingRows, ...shown.transactions] : pendingRows;
  const refreshLabel = t("activity.refresh");
  const updating = manualRefreshing || isFetching;
  return (
    <Loading loading={isPending && !shown && pendingRows.length === 0}>
      <div className="flex min-h-8 items-center justify-between gap-3 px-4 pb-2">
        {shown ? (
          <span
            role="status"
            className="inline-flex min-w-0 items-center gap-1.5 text-subtitle font-medium text-steel-darker"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-steel/70"
            />
            <span className="truncate whitespace-nowrap tabular-nums">
              {t("activity.window", {
                lo: String(shown.checkpointLo),
                hi: String(shown.checkpointHi),
              })}
            </span>
          </span>
        ) : (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-subtitle font-medium text-steel"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-steel/70 motion-reduce:animate-none"
            />
            {t("activity.windowLoading")}
          </span>
        )}
        <button
          type="button"
          data-testid="refresh-activity"
          aria-label={refreshLabel}
          aria-busy={updating}
          disabled={updating}
          onClick={() => void refreshActivity()}
          className={cl(
            "relative inline-flex h-8 min-w-[7.5rem] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-3 text-xs font-semibold shadow-xs transition-colors duration-200 disabled:cursor-default",
            updating
              ? "border-rtd/40 bg-rtd/5 text-rtd"
              : "border-gray-45 bg-white text-steel-darker hover:bg-gray-40 active:bg-gray-45",
          )}
        >
          {/* A slow brand-tinted sheen says "still updating" without turning
              the control into a progress indicator or moving its bounds. */}
          <span
            aria-hidden
            className={cl(
              "pointer-events-none absolute inset-0 transition-opacity duration-200",
              updating ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-rtd/20 to-transparent animate-activity-sheen motion-reduce:hidden" />
          </span>
          <span className="relative inline-flex items-center gap-1.5">
            {updating ? (
              <Spinner16 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
            ) : (
              <Refresh16 className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{refreshLabel}</span>
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {updating ? t("activity.refreshing") : ""}
        </span>
      </div>
      {showingCached ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="activity-cached-banner"
          className="mx-4 flex items-center gap-2 rounded-xl bg-gray-40 px-3 py-1.5 text-subtitle text-steel-darker"
        >
          <Refresh16 className="h-3 w-3 shrink-0 animate-spin text-steel motion-reduce:animate-none" />
          <span className="truncate">
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
      {rows.length > 0 && activeAddress ? (
        <div className="divide-y divide-x-0 divide-solid divide-gray-45">
          {rows.map((txn) => (
            <ErrorBoundary key={txn.digest}>
              <TransactionCard
                txn={txn}
                address={activeAddress}
                activityStatus={
                  pendingDigests.has(txn.digest)
                    ? "confirming"
                    : confirmedDigests.has(txn.digest)
                      ? "complete"
                      : undefined
                }
              />
            </ErrorBoundary>
          ))}
        </div>
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
