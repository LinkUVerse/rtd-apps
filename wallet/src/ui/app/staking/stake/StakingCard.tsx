// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TransactionValidity, canApproveTransactionValidity } from "_src/ui/app/pages/approval-request/transaction-request/TransactionValidity";
import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import Alert from "_components/alert";
import { useActiveAccount } from "_src/ui/app/hooks/useActiveAccount";
import { useBackgroundClient } from "_src/ui/app/hooks/useBackgroundClient";
import { useFreshBalance } from "_src/ui/app/hooks/useFreshBalance";
import { useI18n } from "_src/ui/app/i18n";
import { parseAmount } from "_src/ui/app/helpers/parseAmount";
import { MIN_NUMBER_RTD_TO_STAKE } from "_src/shared/constants";
import {
  prepareStaking,
  revalidateStaking,
  type PreparedStaking,
} from "_src/shared/rpc/staking-preparation";
import type { WalletExecutionOutcome } from "_src/shared/rpc/execution-coordinator";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Formik, useFormikContext } from "formik";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StakeForm from "./StakeForm";
import { UnStakeForm } from "./UnstakeForm";
import { ValidatorFormDetail } from "./ValidatorFormDetail";
import { createValidationSchema } from "./utils/validation";
export type FormValues = { amount: string };

function StakingAmountDraft({ onChange }: { onChange: (amount: string) => void }) {
  const { values } = useFormikContext<FormValues>();
  // Loading/error fences can unmount Formik before a preview is prepared.
  // Keep only the input in the keyed account/session/route lifetime.
  useEffect(() => onChange(values.amount), [onChange, values.amount]);
  return null;
}

export default function StakingCard() {
  const rpc = useWalletRpc(),
    account = useActiveAccount();
  const [params] = useSearchParams();
  return (
    <StakingSession
      key={JSON.stringify([
        rpc.bindingKey,
        rpc.readSessionKey,
        account?.id,
        account?.address,
        params.toString(),
      ])}
    />
  );
}
function StakingSession() {
  const { t } = useI18n(),
    rpc = useWalletRpc(),
    account = useActiveAccount(),
    background = useBackgroundClient();
  const [params] = useSearchParams();
  const unstake = params.get("unstake") === "true",
    objectId = params.get("staked"),
    validator = params.get("address");
  const staking = useStakingView(account?.address, { enabled: !!account });
  const balances = useFreshBalance(RTD_TYPE_ARG, account?.address);
  const metadata = useCoinMetadata(RTD_TYPE_ARG);
  const decimals = metadata.data?.decimals;
  const view = staking.data,
    position = view?.positions?.find((p) => p.objectId === objectId);
  const balance = balances.data ? BigInt(balances.data.balance) : null;
  const navigate = useNavigate(),
    queryClient = useQueryClient();
  const lifetime = useRef<AbortController | null>(null),
    operation = useRef(false);
  const [busy, setBusy] = useState(false),
    [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [amount, setAmount] = useState("");
  const [pending, setPending] = useState<Extract<
    WalletExecutionOutcome,
    { state: "pending" }
  > | null>(null);
  const [approval, setApproval] = useState<{
    prepared: PreparedStaking;
    requestId: string;
  } | null>(null);
  function showOutcome(result: WalletExecutionOutcome | null) {
    if (result?.state === "pending") {
      setPending(result);
      setApproval(null);
    } else if (result?.state === "confirmed") {
      setPending(null);
      setApproval(null);
      void queryClient.invalidateQueries({ queryKey: ["wallet-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-current-balances"] });
      void queryClient.invalidateQueries({
        queryKey: ["wallet-fresh-balance"],
      });
      void queryClient.invalidateQueries({ queryKey: ["wallet-fresh-coins"] });
      navigate(
        `/receipt?${new URLSearchParams({ txdigest: result.receipt.digest, from: "tokens" })}`,
      );
    }
  }
  const recoveryInFlight = useRef<Promise<WalletExecutionOutcome | null> | null>(null);
  async function recover(signal: AbortSignal) {
    if (!account || rpc.state !== "configured") return;
    // StrictMode effect replay shares this read-only request; never share execution.
    if (!recoveryInFlight.current) {
      const request = background.recoverPreparedTransaction(account.id);
      recoveryInFlight.current = request;
      void request.finally(() => {
        if (recoveryInFlight.current === request) recoveryInFlight.current = null;
      }).catch(() => undefined);
    }
    const result = await recoveryInFlight.current;
    signal.throwIfAborted();
    showOutcome(result);
    setChecked(true);
  }
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    operation.current = false;
    return () => controller.abort();
    // The keyed outer component owns account, route, binding and read-session changes.
  }, []);
  useEffect(() => {
    const controller = lifetime.current;
    if (!controller || controller.signal.aborted || rpc.state !== "configured" || operation.current)
      return;
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
    // Same-session asset initialization must not cancel a dispatched outcome or
    // race it with an automatic recovery. Unmount still aborts the owned lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc.state]);
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
    busy || !checked || !!pending || !account || rpc.state !== "configured";
  if (pending || !checked)
    return (
      <div className="flex flex-col gap-3">
        <Alert>
          {pending
            ? `${t("staking.pending")} ${pending.digest}`
            : t("staking.recoveryCheck")}
        </Alert>
        {error ? <Alert>{error}</Alert> : null}
        <Button
          type="button"
          variant="secondary"
          text={t("staking.recover")}
          loading={busy}
          onClick={() => run(recover)}
        />
      </div>
    );
  if (approval)
    return (
      <BottomMenuLayout>
        <Content>
          <div className="flex flex-col gap-3 break-all">
            {error ? <Alert>{error}</Alert> : null}
            <p>{t("staking.review")}</p>
            <p>{t(unstake ? "staking.unstakeRtd" : "staking.stakeRtd")}</p>
            <p>
              {t("staking.sender")}: {approval.prepared.sender}
            </p>
            {approval.prepared.input.kind === "stake" ? (
              <>
                <p>
                  {t("staking.validator")}: {approval.prepared.input.validator}
                </p>
                <p>
                  {t("staking.atomicAmount")}: {approval.prepared.input.amount}
                </p>
              </>
            ) : (
              <>
                <p>
                  {t("staking.position")}: {approval.prepared.input.objectId}
                </p>
                <p>
                  {t("staking.atomicPrincipal")}:{" "}
                  {approval.prepared.withdrawal?.principal}
                </p>
                <p>{t("staking.withdrawSimulationNote")}</p>
              </>
            )}
            <p>
              {t("nft.transferGasBudget")}: {approval.prepared.gasBudget}
            </p>
            <p>
              {t("nft.transferDigest")}: {approval.prepared.digest}
            </p>
            <TransactionValidity bytesBase64={approval.prepared.bytesBase64} />
          </div>
        </Content>
        <Menu stuckClass="staked-cta" className="w-full gap-2.5">
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
            text={t(unstake ? "staking.unstakeNow" : "staking.stakeNow")}
            loading={busy}
            disabled={disabled || !canApproveTransactionValidity(approval.prepared.bytesBase64)}
            onClick={() =>
              run(async (signal) => {
                if (disabled || !account || !canApproveTransactionValidity(approval.prepared.bytesBase64)) return;
                const prepared = await revalidateStaking(
                  rpc,
                  approval.prepared,
                  account.address,
                  signal,
                );
                signal.throwIfAborted();
                setChecked(false);
                setApproval(null);
                const result = await background.executePreparedTransaction({
                  accountId: account.id,
                  bindingKey: prepared.bindingKey,
                  requestId: approval.requestId,
                  bytesBase64: prepared.bytesBase64,
                  digest: prepared.digest,
                });
                signal.throwIfAborted();
                showOutcome(result);
              })
            }
          />
        </Menu>
      </BottomMenuLayout>
    );
  const invalid =
    staking.isError ||
    !view?.positions ||
    (unstake
      ? !position || (!!validator && position.validatorAddress !== validator)
      : !validator ||
        !view.validators.some((v) => v.active && v.address === validator) ||
        balances.isError ||
        balance === null ||
        metadata.isError ||
        decimals === undefined);
  if (
    staking.isPending ||
    (!unstake && (balances.isPending || metadata.isPending))
  )
    return <p>{t("common.loading")}</p>;
  if (invalid || !view) return <Alert>{t("common.syncError")}</Alert>;
  const schema = unstake
    ? undefined
    : createValidationSchema(
        balance!,
        metadata.data!.symbol,
        decimals!,
        false,
        parseAmount(MIN_NUMBER_RTD_TO_STAKE.toString(), decimals!),
        t,
      );
  return (
    <Formik
      initialValues={{ amount }}
      validationSchema={schema}
      validateOnMount
      onSubmit={({ amount: next }) =>
        run(async (signal) => {
          if (disabled || !account || invalid)
            throw new Error(t("transfer.missingData"));
          const prepared = await prepareStaking(
            rpc,
            unstake
              ? {
                  kind: "withdraw",
                  sender: account.address,
                  objectId: objectId!,
                }
              : {
                  kind: "stake",
                  sender: account.address,
                  validator: validator!,
                  amount: parseAmount(next, decimals!).toString(),
                },
            signal,
          );
          signal.throwIfAborted();
          setAmount(next);
          setApproval({ prepared, requestId: crypto.randomUUID() });
        })
      }
    >
      {({ isValid, submitForm, errors, touched }) => (
        <BottomMenuLayout>
          <Content>
            <StakingAmountDraft onChange={setAmount} />
            {error ? <Alert>{error}</Alert> : null}
            {(unstake ? position?.validatorAddress : validator) ? (
              <ValidatorFormDetail
                validatorAddress={
                  (unstake ? position!.validatorAddress : validator)!
                }
                unstake={unstake}
              />
            ) : (
              <Alert>{t("staking.unknownPool")}</Alert>
            )}
            {unstake ? (
              <UnStakeForm position={position!} view={view} />
            ) : (
              <StakeForm
                coinBalance={balance!}
                coinType={RTD_TYPE_ARG}
                view={view}
              />
            )}
            {touched.amount && errors.amount ? (
              <Alert>{errors.amount}</Alert>
            ) : null}
          </Content>
          <Menu stuckClass="staked-cta" className="w-full gap-2.5">
            <Button
              type="button"
              variant="secondary"
              to="/stake"
              text={t("common.back")}
              disabled={busy}
            />
            <Button
              type="button"
              variant="primary"
              text={t("staking.review")}
              onClick={submitForm}
              disabled={disabled || !isValid}
              loading={busy}
            />
          </Menu>
        </BottomMenuLayout>
      )}
    </Formik>
  );
}
