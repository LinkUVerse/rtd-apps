// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  TransactionValidity,
  canApproveTransactionValidity,
} from "_src/ui/app/pages/approval-request/transaction-request/TransactionValidity";

import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { AddressInput } from "_components/address-input";
import Alert from "_components/alert";
import { ampli } from "_src/shared/analytics/ampli";
import { useActiveAccount } from "_src/ui/app/hooks/useActiveAccount";
import { useBackgroundClient } from "_src/ui/app/hooks/useBackgroundClient";
import { useI18n } from "_src/ui/app/i18n";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";
import { useRtdNSEnabled } from "rtd-apps-core/src/rpc/name-hooks";
import { isValidRtdNSName } from "rtd-typescript/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Field, Form, Formik } from "formik";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  prepareNftTransfer,
  revalidateNftTransfer,
  type PreparedNftTransfer,
} from "_src/shared/rpc/nft-transfer-preparation";
import type { WalletExecutionOutcome } from "_src/shared/rpc/execution-coordinator";
import { createValidationSchema } from "./validation";
import { expectHistoryTransaction } from "rtd-apps-core/src/rpc/history-hooks";

type Props = {
  objectId: string;
  objectType?: string | null;
  ownershipReady: boolean;
  onPreparationStateChange?: (active: boolean) => void;
  onDispatchStarted?: () => void;
  onRecoveryChecked?: (active: boolean) => void;
};
export function TransferNFTForm(props: Props) {
  const rpc = useWalletRpc();
  const account = useActiveAccount();
  // A new account/session/object gets a new approval lifetime, including same-network reconnects.
  return (
    <NftTransferSession
      key={JSON.stringify([
        rpc.bindingKey,
        rpc.readSessionKey,
        account?.id,
        account?.address,
        props.objectId,
        props.objectType,
      ])}
      {...props}
    />
  );
}
function NftTransferSession({
  objectId,
  objectType,
  ownershipReady,
  onPreparationStateChange,
  onDispatchStarted,
  onRecoveryChecked,
}: Props) {
  const { t } = useI18n();
  const account = useActiveAccount();
  const rpc = useWalletRpc();
  const background = useBackgroundClient();
  const namesEnabled = useRtdNSEnabled();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifetime = useRef<AbortController | null>(null);
  const recoveryAttempt = useRef<AbortController | null>(null);
  const recoveryInFlight = useRef<Promise<WalletExecutionOutcome | null> | null>(null);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Extract<
    WalletExecutionOutcome,
    { state: "pending" }
  > | null>(null);
  const [approval, setApproval] = useState<{
    prepared: PreparedNftTransfer;
    requestId: string;
  } | null>(null);
  const [recipient, setRecipient] = useState("");
  const validationSchema = createValidationSchema(
    rpc,
    namesEnabled,
    account?.address || "",
    objectId,
    t,
  );

  function showOutcome(
    result: WalletExecutionOutcome | null,
    sentHere = false,
  ) {
    if (result?.state === "pending") {
      setPending(result);
      setApproval(null);
    } else if (result?.state === "confirmed") {
      setPending(null);
      setApproval(null);
      void queryClient.invalidateQueries({ queryKey: ["wallet-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-current-balances"] });
      // Poll Activity quickly until this confirmed transfer appears.
      expectHistoryTransaction(account?.address, result.receipt.digest);
      void queryClient.invalidateQueries({ queryKey: ["wallet-account-history"] });
      if (sentHere && result.receipt.success)
        ampli.sentCollectible({ objectId });
      navigate(
        `/receipt?${new URLSearchParams({ txdigest: result.receipt.digest, from: "nfts" })}`,
      );
    }
  }
  async function recover(signal: AbortSignal) {
    if (!account || !rpc.hasFullnodeSession) return;
    if (!recoveryInFlight.current) {
      const request = background.recoverPreparedTransaction(account.id);
      recoveryInFlight.current = request;
      void request.finally(() => {
        if (recoveryInFlight.current === request) recoveryInFlight.current = null;
      }).catch(() => {});
    }
    const result = await recoveryInFlight.current;
    signal.throwIfAborted();
    onRecoveryChecked?.(result !== null);
    showOutcome(result);
    setChecked(true);
  }
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    operation.current = false;
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = lifetime.current;
    if (!controller || controller.signal.aborted || !rpc.hasFullnodeSession ||
        operation.current || recoveryAttempt.current === controller) return;
    recoveryAttempt.current = controller;
    operation.current = true;
    setBusy(true);
    recover(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (lifetime.current === controller) {
          operation.current = false;
          if (!controller.signal.aborted) setBusy(false);
        }
      });
    // One initial recovery per owned lifetime. StrictMode's new lifetime shares
    // the same readonly request, while normal read fences cannot restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc.hasFullnodeSession]);

  useEffect(() => {
    // Retain only rendering while the current preparation or approved preview lives.
    onPreparationStateChange?.(preparing || !!approval);
  }, [preparing, approval, onPreparationStateChange]);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      await action(signal);
    } catch (e) {
      if (!signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      operation.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  const disabled =
    busy || !checked || !!pending || !ownershipReady || !account || rpc.state !== "configured" ||
    !rpc.hasFullnodeSession || !walletReadAllowed(rpc, "assets") ||
    !walletReadAllowed(rpc, "assetKiosks");
  if (pending || !checked)
    return (
      <div className="flex flex-col gap-3">
        <Alert>
          {pending
            ? `${t("nft.transferPending")} ${pending.digest}`
            : t("nft.transferRecoveryCheck")}
        </Alert>
        {error ? <Alert>{error}</Alert> : null}
        <Button
          type="button"
          variant="secondary"
          text={t("nft.transferRecover")}
          loading={busy}
          disabled={!rpc.hasFullnodeSession}
          onClick={() => run(recover)}
        />
      </div>
    );
  return (
    <BottomMenuLayout className="h-full">
      <Content>
        {error ? <Alert>{error}</Alert> : null}
        {approval ? (
          <div className="flex flex-col gap-3 break-all">
            <p>{t("transfer.reviewAndSend")}</p>
            <p>
              {t("nft.transferObject")}: {approval.prepared.input.objectId}
            </p>
            <p>
              {t("transfer.recipient")}:{" "}
              {approval.prepared.input.recipientName
                ? `${approval.prepared.input.recipientName} → `
                : ""}
              {approval.prepared.input.to}
            </p>
            <p>
              {t("nft.transferGasBudget")}: {approval.prepared.gasBudget}
            </p>
            <p>
              {t("nft.transferDigest")}: {approval.prepared.digest}
            </p>
            <TransactionValidity bytesBase64={approval.prepared.bytesBase64} />
          </div>
        ) : (
          <Formik
            initialValues={{ to: recipient }}
            validateOnMount
            validationSchema={validationSchema}
            onSubmit={({ to }) =>
              run(async (signal) => {
                if (disabled || !account || !objectType)
                  throw new Error(t("transfer.missingData"));
                setPreparing(true);
                try {
                  const recipientName =
                    namesEnabled && isValidRtdNSName(to) ? to : undefined;
                  const resolved = recipientName
                    ? await rpc.resolveRecipientName(recipientName, signal)
                    : null;
                  if (recipientName && !resolved)
                    throw new Error(t("transfer.nameNotFound"));
                  const prepared = await prepareNftTransfer(
                    rpc,
                    {
                      sender: account.address,
                      objectId,
                      objectType,
                      to: resolved?.address ?? to,
                      recipientName,
                    },
                    signal,
                  );
                  signal.throwIfAborted();
                  setRecipient(to);
                  setApproval({ prepared, requestId: crypto.randomUUID() });
                } finally {
                  setPreparing(false);
                }
              })
            }
          >
            {({ isValid }) => (
              <Form autoComplete="off" className="flex flex-col gap-3">
                <label>{t("transfer.recipient")}</label>
                <Field
                  component={AddressInput}
                  name="to"
                  placeholder={t("transfer.addressPlaceholder")}
                />
                <Button
                  type="submit"
                  variant="primary"
                  text={t("transfer.reviewAndSend")}
                  loading={busy}
                  disabled={disabled || !isValid || !objectType}
                />
              </Form>
            )}
          </Formik>
        )}
      </Content>
      {approval ? (
        <Menu stuckClass="sendCoin-cta" className="w-full gap-2.5">
          <Button
            type="button"
            variant="secondary"
            text={t("common.back")}
            disabled={busy}
            onClick={() => setApproval(null)}
          />
          <Button
            type="button"
            variant="primary"
            text={t("nft.sendNow")}
            loading={busy}
            disabled={
              disabled ||
              !canApproveTransactionValidity(approval.prepared.bytesBase64)
            }
            onClick={() =>
              run(async (signal) => {
                if (
                  disabled ||
                  !account ||
                  !canApproveTransactionValidity(approval.prepared.bytesBase64)
                )
                  return;
                const prepared = await revalidateNftTransfer(
                  rpc,
                  approval.prepared,
                  account.address,
                  signal,
                );
                signal.throwIfAborted();
                // Once dispatch begins, any transport error must be recovered before another send is enabled.
                onDispatchStarted?.();
                setChecked(false);
                setApproval(null);
                const result = await background.executePreparedTransaction({
                  accountId: account.id,
                  bindingKey: prepared.bindingKey,
                  requestId: approval.requestId,
                  bytesBase64: prepared.bytesBase64,
                  digest: prepared.digest,
                  recipientName: prepared.input.recipientName,
                  recipientAddress: prepared.input.to,
                });
                signal.throwIfAborted();
                showOutcome(result, true);
              })
            }
          />
        </Menu>
      ) : null}
    </BottomMenuLayout>
  );
}
