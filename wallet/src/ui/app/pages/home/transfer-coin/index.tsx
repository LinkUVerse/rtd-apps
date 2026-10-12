// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TransactionValidity, canApproveTransactionValidity } from "_src/ui/app/pages/approval-request/transaction-request/TransactionValidity";

import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { useI18n } from "_app/i18n";
import { Text } from "_app/shared/text";
import { ActiveCoinsCard } from "_components/active-coins-card";
import Overlay from "_components/overlay";
import { ampli } from "_src/shared/analytics/ampli";
import { getSignerOperationErrorMessage } from "_src/ui/app/helpers/errorMessages";
import { useActiveAccount } from "_src/ui/app/hooks/useActiveAccount";
import { useUnlockedGuard } from "_src/ui/app/hooks/useUnlockedGuard";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { useBackgroundClient } from "_src/ui/app/hooks/useBackgroundClient";
import Alert from "_components/alert";
import type { WalletExecutionOutcome } from "_src/shared/rpc/execution-coordinator";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { ArrowLeft16, ArrowRight16 } from "rtd-apps-icons";
import * as Sentry from "@sentry/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PreviewTransfer } from "./PreviewTransfer";
import { SendTokenForm } from "./SendTokenForm";
import type { SubmitProps } from "./SendTokenForm";
import { Transaction } from "rtd-typescript/transactions";
import { revalidateCoinTransfer } from "_src/shared/rpc/coin-transfer-preparation";

const TRANSFER_DEBUG_PREFIX = "[RTD Wallet Transfer Debug]";

function logTransferDebug(label: string, details: unknown) {
  console.info(`${TRANSFER_DEBUG_PREFIX} ${label}`, details);
}

function TransferCoinPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const coinType = searchParams.get("type");
  const [showTransactionPreview, setShowTransactionPreview] =
    useState<boolean>(false);
  const [formData, setFormData] = useState<SubmitProps>();
  const navigate = useNavigate();
  const { data: coinMetadata } = useCoinMetadata(coinType);
  const activeAccount = useActiveAccount();
  const address = activeAccount?.address;
  const queryClient = useQueryClient();
  const rpc = useWalletRpc();
  const background = useBackgroundClient();
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [pending, setPending] = useState<Extract<
    WalletExecutionOutcome,
    { state: "pending" }
  > | null>(null);

  useEffect(() => {
    setPending(null);
    setRecoveryError(null);
    setFormData(undefined);
    setShowTransactionPreview(false);
  }, [rpc.readSessionKey, address, coinType]);

  const recoveryInFlight = useRef<{key: string; promise: Promise<WalletExecutionOutcome | null>} | null>(null);
  useEffect(() => {
    if (!activeAccount || activeAccount.type === "qredo" || rpc.state !== "configured") return;
    let active = true;
    const key = JSON.stringify([activeAccount.id, rpc.bindingKey, rpc.readSessionKey]);
    // StrictMode replays this effect; share only the same scope's read-only recovery.
    if (recoveryInFlight.current?.key !== key) {
      const request = {key, promise: background.recoverPreparedTransaction(activeAccount.id)};
      recoveryInFlight.current = request;
      void request.promise.finally(() => {
        if (recoveryInFlight.current === request) recoveryInFlight.current = null;
      }).catch(() => undefined);
    }
    recoveryInFlight.current.promise
      .then((result) => {
        if (!active) return;
        if (result?.state === "pending") setPending(result);
        else if (result?.state === "confirmed")
          navigate(
            `/receipt?txdigest=${encodeURIComponent(result.receipt.digest)}&from=transactions`,
          );
      })
      .catch((error) => {
        if (active) setRecoveryError(getSignerOperationErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [activeAccount?.id, rpc.bindingKey, rpc.readSessionKey, rpc.state, background, navigate]);

  const resetCoinQueries = () => {
    queryClient.removeQueries({ queryKey: ["wallet-fresh-coins"] });
    queryClient.removeQueries({ queryKey: ["wallet-fresh-balance"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-assets"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-current-balances"] });
  };

  const transaction = useMemo(() => {
    if (!coinType || !activeAccount || !formData || !address || !coinMetadata)
      return null;

    if (
      formData.prepared.bindingKey !== rpc.bindingKey ||
      formData.prepared.readSessionKey !== rpc.readSessionKey
    )
      return null;
    try { return Transaction.from(formData.prepared.bytesBase64); }
    catch { return null; }
  }, [
    formData,
    activeAccount,
    coinType,
    address,
    coinMetadata?.decimals,
    rpc.bindingKey,
    rpc.readSessionKey,
  ]);

  const executeTransfer = useMutation({
    mutationFn: async () => {
      if (
        !transaction ||
        !activeAccount ||
        !formData ||
        !coinType ||
        !address ||
        !coinMetadata ||
        !canApproveTransactionValidity(formData.prepared.bytesBase64)
      ) {
        throw new Error(t("transfer.missingData"));
      }

      return await Sentry.startSpan(
        {
          name: "send-tokens",
        },
        async (span) => {
          const executeApprovedBytes = async () => {
            const prepared = await revalidateCoinTransfer(
              rpc,
              formData.prepared,
              address,
            );
            return background.executePreparedTransaction({
              accountId: activeAccount!.id,
              bindingKey: rpc.bindingKey,
              requestId: formData.requestId,
              bytesBase64: prepared.bytesBase64,
              digest: prepared.digest,
              recipientName: prepared.input.recipientName,
              recipientAddress: prepared.input.to,
            });
          };

          try {
            return await executeApprovedBytes();
          } catch (error) {
            logTransferDebug("transfer failed", {
              errorMessage: getSignerOperationErrorMessage(error),
              error,
            });
            span.setAttributes({ failure: true });
            throw error;
          }
        },
      );
    },
    onSuccess: (response) => {
      if (response.state === "pending") {
        setPending(response);
        return;
      }
      if (!response.receipt.success) {
        toast.error("交易已入链但执行失败，请查看回执");
      }
      resetCoinQueries();

      ampli.sentCoins({
        coinType: coinType!,
      });

      const receiptUrl = `/receipt?txdigest=${encodeURIComponent(
        response.receipt.digest,
      )}&from=transactions`;
      return navigate(receiptUrl);
    },
    onError: (error) => {
      resetCoinQueries();
      toast.error(
        <div className="max-w-xs overflow-hidden flex flex-col">
          <small className="text-ellipsis overflow-hidden">
            {getSignerOperationErrorMessage(error)}
          </small>
        </div>,
      );
    },
  });

  if (useUnlockedGuard()) {
    return null;
  }

  if (!coinType) {
    return <Navigate to="/" replace={true} />;
  }

  return (
    <Overlay
      showModal={true}
      title={
        showTransactionPreview
          ? t("transfer.reviewAndSend")
          : t("transfer.sendCoins")
      }
      closeOverlay={() => navigate("/")}
    >
      <div className="flex flex-col w-full h-full">
        {activeAccount?.type === "qredo" ? (
          <Alert>{t("qredo.readonly")}</Alert>
        ) : pending ? (
          <Alert>
            交易结果待确认：{pending.digest}。请勿重新发送。
            <Button
              type="button"
              variant="secondary"
              text="查询原交易结果"
              onClick={async () => {
                const result = await background
                  .recoverPreparedTransaction(activeAccount!.id)
                  .catch((error) => {
                    setRecoveryError(getSignerOperationErrorMessage(error));
                    return null;
                  });
                if (result?.state === "confirmed") {
                  setPending(null);
                  resetCoinQueries();
                  navigate(
                    `/receipt?txdigest=${encodeURIComponent(result.receipt.digest)}&from=transactions`,
                  );
                } else if (result?.state === "pending") setPending(result);
              }}
            />
          </Alert>
        ) : null}
        {recoveryError ? <Alert>{recoveryError}</Alert> : null}
        {showTransactionPreview && formData ? (
          <BottomMenuLayout>
            <Content>
              <PreviewTransfer
                prepared={formData.prepared}
                coinSymbol={formData.coinSymbol}
                gasBudget={formData.gasBudgetEst}
              />
              {executeTransfer.isPending ? (
                <p role="status">正在校验并提交已批准的交易，请勿重复发送。交易结果将按下方摘要查询。</p>
              ) : null}
              <p className="break-all" data-testid="coin-preview-digest">
                {t("nft.transferDigest")}: {formData.prepared.digest}
              </p>
              <TransactionValidity bytesBase64={formData.prepared.bytesBase64} />
            </Content>

            <Menu
              stuckClass="sendCoin-cta"
              className="w-full px-0 pb-0 mx-0 gap-2.5"
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTransactionPreview(false)}
                text={t("common.back")}
                disabled={executeTransfer.isPending || !!pending}
                before={<ArrowLeft16 />}
              />

              <Button
                type="button"
                variant="primary"
              onClick={() => executeTransfer.mutate()}
                text={t("transfer.sendNow")}
                disabled={
                  coinType === null ||
                  !transaction ||
                  !!pending ||
                  !!recoveryError ||
                  !canApproveTransactionValidity(formData.prepared.bytesBase64)
                }
                after={<ArrowRight16 />}
                loading={executeTransfer.isPending}
              />
            </Menu>
          </BottomMenuLayout>
        ) : (
          <>
            <div className="mb-7 flex flex-col gap-2.5">
              <div className="pl-1.5">
                <Text variant="caption" color="steel" weight="semibold">
                  {t("transfer.selectAllCoins")}
                </Text>
              </div>
              <ActiveCoinsCard activeCoinType={coinType} />
            </div>

            <SendTokenForm
              onSubmit={(formData) => {
                setShowTransactionPreview(true);
                setFormData(formData);
              }}
              coinType={coinType}
              initialAmount={formData?.amount || ""}
              initialTo={
                formData?.prepared.input.recipientName ?? formData?.to ?? ""
              }
            />
          </>
        )}
      </div>
    </Overlay>
  );
}

export default TransferCoinPage;
