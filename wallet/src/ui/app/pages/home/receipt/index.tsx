// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Alert from "_components/alert";
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
  const indexing = useReceiptIndexing(transactionId, facts.conflict ? null :
    facts.receipt?.checkpoint ?? data?.checkpoint);

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
        closeOverlay={closeReceipt}
        closeIcon={
          <Check32 fill="currentColor" className="text-rtd-light w-8 h-8" />
        }
      >
        {isError || rpc.state === "unconfigured" || rpc.state === "invalid" ? (
          <div className="mb-2 h-fit">
            <Alert>{t("receipt.detailsUnavailable")}</Alert>
          </div>
        ) : null}
        {facts.conflict && <Alert>{t("receipt.factMismatch")}</Alert>}
        {facts.confirmed !== undefined && !facts.conflict && indexing.data !== true && (
          <div role="status" className="mb-3">{t("receipt.indexingPending")}</div>
        )}
        {facts.receipt && !data && (
          <div role="status" className="mb-3 break-all">
            <p>
              {facts.receipt.success
                ? t("receipt.confirmedSuccess")
                : t("receipt.confirmedFailure")}
            </p>
            <p>{facts.receipt.digest}</p>
            {facts.receipt.checkpoint !== null && (
              <p>
                {t("receipt.confirmedCheckpoint", {
                  checkpoint: facts.receipt.checkpoint,
                })}
              </p>
            )}
            <p>{t("receipt.detailsPending")}</p>
          </div>
        )}

        {details === null && facts.confirmed === undefined && (
          <Alert mode="warning">{t("receipt.awaitingConfirmation")}</Alert>
        )}
        {(isError || details === null || facts.conflict) && (
          <button
            className="mb-3 border-0 bg-transparent text-hero-dark"
            onClick={() => {
              void refetch();
              void stored.refetch();
            }}
          >
            {t("receipt.refreshDetails")}
          </button>
        )}
        {data && activeAddress && <ReceiptCard txn={data} activeAddress={activeAddress} />}
      </Overlay>
    </Loading>
  );
}

export default ReceiptPage;
