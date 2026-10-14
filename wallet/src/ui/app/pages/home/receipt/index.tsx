// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ReceiptNotice } from "_components/receipt-card/ReceiptNotice";
import * as styles from "_components/receipt-card/Receipt.module.scss";
import Loading from "_components/loading";
import Overlay from "_components/overlay";
import { ReceiptCard } from "_src/ui/app/components/receipt-card";
import { useActiveAddress } from "_src/ui/app/hooks/useActiveAddress";
import { useUnlockedGuard } from "_src/ui/app/hooks/useUnlockedGuard";
import { useI18n } from "_src/ui/app/i18n";
import { useStoredTransactionReceipt } from "_src/ui/app/hooks/useStoredTransactionReceipt";
import { useReceiptIndexing } from "_src/ui/app/hooks/useReceiptIndexing";
import { selectReceiptFacts } from "_src/shared/rpc/stored-receipt";
import { useWalletTransactionDetails } from "rtd-apps-core/src/rpc/receipt-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { Check32 } from "rtd-apps-icons";
import { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

function ReceiptPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(true);
  const activeAddress = useActiveAddress();

  // get tx results from url params
  const transactionId = searchParams.get("txdigest");
  const fromParam = searchParams.get("from");
  const rpc = useWalletRpc();
  const {
    data: details,
    isPending,
    isError,
    refetch,
  } = useWalletTransactionDetails(transactionId);
  const stored = useStoredTransactionReceipt(transactionId);
  const facts = selectReceiptFacts(details, stored.data);
  const data = facts.transaction;
  const indexing = useReceiptIndexing(
    transactionId,
    facts.conflict ? null : (facts.receipt?.checkpoint ?? data?.checkpoint),
  );

  const navigate = useNavigate();
  // return to previous route or from param if available
  const closeReceipt = useCallback(() => {
    fromParam ? navigate(`/${fromParam}`) : navigate(-1);
  }, [fromParam, navigate]);

  const pageTitle = useMemo(() => {
    if (facts.confirmed !== undefined) {
      const executionStatus = facts.confirmed;

      // TODO: Infer out better name:
      return executionStatus ? t("receipt.transaction") : t("receipt.failed");
    }

    return t("receipt.transaction");
  }, [facts.confirmed, t]);

  const isGuardLoading = useUnlockedGuard();

  // A cold-opened receipt must keep its URL while the account query loads.
  if (!transactionId || (!activeAddress && !isGuardLoading)) {
    return <Navigate to="/transactions" replace={true} />;
  }

  return (
    <Loading
      loading={
        (isPending &&
          facts.confirmed === undefined &&
          (rpc.state === "configured" || rpc.state === "initializing")) ||
        isGuardLoading
      }
    >
      <Overlay
        showModal={showModal}
        setShowModal={setShowModal}
        title={pageTitle}
        className={styles.overlay}
        closeLabel={t("common.done")}
        closeOverlay={closeReceipt}
        closeIcon={
          <>
            <Check32
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            />
            <span>{t("common.done")}</span>
          </>
        }
      >
        <div className={styles.page}>
          {isError ||
          rpc.state === "unconfigured" ||
          rpc.state === "invalid" ? (
            <ReceiptNotice tone="warning">
              {t("receipt.detailsUnavailable")}
            </ReceiptNotice>
          ) : null}
          {facts.conflict && (
            <ReceiptNotice tone="issue">
              {t("receipt.factMismatch")}
            </ReceiptNotice>
          )}
          {facts.confirmed !== undefined &&
            !facts.conflict &&
            indexing.data !== true && (
              <ReceiptNotice>{t("receipt.indexingPending")}</ReceiptNotice>
            )}
          {facts.receipt && !data && (
            <ReceiptNotice tone={facts.receipt.success ? "success" : "issue"}>
              <p>
                {facts.receipt.success
                  ? t("receipt.confirmedSuccess")
                  : t("receipt.confirmedFailure")}
              </p>
              <p className={styles.identifier}>{facts.receipt.digest}</p>
              {facts.receipt.checkpoint !== null && (
                <p>
                  {t("receipt.confirmedCheckpoint", {
                    checkpoint: facts.receipt.checkpoint,
                  })}
                </p>
              )}
              <p>{t("receipt.detailsPending")}</p>
            </ReceiptNotice>
          )}

          {details === null && facts.confirmed === undefined && (
            <ReceiptNotice tone="warning">
              {t("receipt.awaitingConfirmation")}
            </ReceiptNotice>
          )}
          {(isError || details === null || facts.conflict) && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                void refetch();
                void stored.refetch();
              }}
            >
              {t("receipt.refreshDetails")}
            </button>
          )}
          {data && activeAddress && (
            <ReceiptCard txn={data} activeAddress={activeAddress} />
          )}
        </div>
      </Overlay>
    </Loading>
  );
}

export default ReceiptPage;
