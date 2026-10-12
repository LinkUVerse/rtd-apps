// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useActiveAddress } from "_app/hooks/useActiveAddress";
import { useI18n } from "_app/i18n";
import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { Text } from "_app/shared/text";
import { AddressInput } from "_components/address-input";
import Alert from "_components/alert";
import Loading from "_components/loading";
import { parseAmount } from "_helpers";
import { useGetAllCoins } from "_hooks";
import { useFreshBalance } from "_app/hooks/useFreshBalance";
import { GAS_SYMBOL } from "_src/ui/app/redux/slices/rtd-objects/Coin";
import { InputWithAction } from "_src/ui/app/shared/InputWithAction";
import { useRtdNSEnabled } from "rtd-apps-core/src/rpc/name-hooks";
import {
  CoinFormat,
  useCoinMetadata,
  useFormatCoin,
} from "rtd-apps-core/src/rpc/coin";
import { ArrowRight16 } from "rtd-apps-icons";
import type { RtdClientTypes } from "rtd-typescript/client";
import { isValidRtdNSName, RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useQuery } from "@tanstack/react-query";
import { Field, Form, Formik, useFormikContext } from "formik";
import { useEffect, useMemo } from "react";

import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  prepareCoinTransfer,
  assertCoinTransferDraft,
  type PreparedCoinTransfer,
} from "_src/shared/rpc/coin-transfer-preparation";
import { createValidationSchemaStepOne } from "./validation";

const initialValues = {
  to: "",
  amount: "",
  isPayAllRtd: false,
  gasBudgetEst: "",
  gasPreview: null as PreparedCoinTransfer | null,
};

export type FormValues = typeof initialValues;

export type SubmitProps = {
  requestId: string;
  to: string;
  amount: string;
  isPayAllRtd: boolean;
  coinIds: string[];
  coins: readonly RtdClientTypes.Coin[];
  gasBudgetEst: string;
  prepared: PreparedCoinTransfer;
};

export type SendTokenFormProps = {
  coinType: string;
  onSubmit: (values: SubmitProps) => void;
  initialAmount: string;
  initialTo: string;
};

function GasBudgetEstimation({
  coinType,
  coinDecimals,
  coins,
}: {
  coinType: string;
  coinDecimals: number;
  coins: readonly RtdClientTypes.Coin[];
}) {
  const { t } = useI18n();
  const activeAddress = useActiveAddress();
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const rtdNSEnabled = useRtdNSEnabled();

  const rpc = useWalletRpc();
  const gasQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      "wallet-transfer-preparation",
      rpc.bindingKey,
      rpc.readSessionKey,
      {
        coinType,
        isPayAllRtd: values.isPayAllRtd,
        to: values.to,
        amount: values.amount,
        coins,
        activeAddress,
        coinDecimals,
      },
    ],
    queryFn: async ({ signal }) => {
      if (!values.amount || !values.to || !coins || !activeAddress) {
        return null;
      }

      let to = values.to;
      if (rtdNSEnabled && isValidRtdNSName(values.to)) {
        const address = (await rpc.resolveRecipientName(values.to, signal))
          ?.address;
        if (!address) {
          throw new Error(t("transfer.nameNotFound"));
        }
        to = address;
      }

      return prepareCoinTransfer(
        rpc,
        {
          sender: activeAddress,
          to,
          amount: values.amount,
          coinType,
          coinDecimals,
          isPayAllRtd: values.isPayAllRtd,
          recipientName:
            rtdNSEnabled && isValidRtdNSName(values.to) ? values.to : undefined,
        },
        signal,
      );
    },
    enabled:
      rpc.state === "configured" &&
      !!activeAddress &&
      !!values.amount &&
      !!values.to,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    meta: { skipPersistedCache: true },
  });

  const [formattedGas, , gasMetadata] = useFormatCoin(
    gasQuery.data?.gasBudget,
    RTD_TYPE_ARG,
  );
  const ready =
    !!gasQuery.data &&
    !gasQuery.isFetching &&
    !gasQuery.isError &&
    !gasMetadata?.isError;

  // gasBudgetEstimation should change when the amount above changes
  useEffect(() => {
    setFieldValue("gasBudgetEst", ready ? formattedGas : "", true);
    setFieldValue("gasPreview", ready ? gasQuery.data : null, false);
  }, [ready, gasQuery.data, formattedGas, setFieldValue, values.amount]);

  return (
    <div className="px-2 my-2 flex w-full gap-2 justify-between">
      <div className="flex gap-1">
        <Text variant="body" color="gray-80" weight="medium">
          {t("transfer.estimatedGas")}
        </Text>
      </div>
      <Text variant="body" color="gray-90" weight="medium">
        {gasQuery.isError
          ? t("common.syncError")
          : ready
            ? formattedGas + " " + GAS_SYMBOL
            : "--"}
      </Text>
    </div>
  );
}

// Set the initial gasEstimation from initial amount
// base on the input amount field update the gasEstimation value
// Separating the gasEstimation from the formik context to access the input amount value and update the gasEstimation value
export function SendTokenForm({
  coinType,
  onSubmit,
  initialAmount = "",
  initialTo = "",
}: SendTokenFormProps) {
  const { t } = useI18n();
  const rpc = useWalletRpc();
  const activeAddress = useActiveAddress();
  const funds = useFreshBalance(coinType, activeAddress);
  const gasFunds = useFreshBalance(RTD_TYPE_ARG, activeAddress);
  // Get all coins of the type
  const {
    data: coinsData,
    isPending: coinsIsPending,
    isError: coinsIsError,
  } = useGetAllCoins(coinType, activeAddress!);

  const {
    data: rtdCoinsData,
    isPending: rtdCoinsIsPending,
    isError: rtdCoinsIsError,
  } = useGetAllCoins(RTD_TYPE_ARG, activeAddress!);

  const rtdCoins = rtdCoinsData;
  const coins = coinsData;
  const coinBalance = BigInt(funds.data?.balance ?? "0");
  const rtdBalance = BigInt(gasFunds.data?.balance ?? "0");

  const coinMetadata = useCoinMetadata(coinType);
  const coinDecimals = coinMetadata.data?.decimals;

  const [tokenBalance, symbol, queryResult] = useFormatCoin(
    coinBalance,
    coinType,
    CoinFormat.FULL,
  );
  const rtdNSEnabled = useRtdNSEnabled();

  const validationSchemaStepOne = useMemo(
    () =>
      coinDecimals === undefined
        ? undefined
        : createValidationSchemaStepOne(
            rpc,
            rtdNSEnabled,
            coinBalance,
            symbol,
            coinDecimals,
            t,
          ),
    [rpc, coinBalance, symbol, coinDecimals, rtdNSEnabled, t],
  );

  // remove the comma from the token balance
  const formattedTokenBalance = tokenBalance.replace(/,/g, "");
  const initAmountBig =
    coinDecimals === undefined
      ? null
      : parseAmount(initialAmount, coinDecimals);

  if (coinDecimals === undefined) {
    return (
      <Loading loading={coinMetadata.isPending}>
        <Alert>{t(!coinMetadata.isError && coinMetadata.data === null
          ? "transfer.metadataUnavailable" : "common.syncError")}</Alert>
      </Loading>
    );
  }
  if (coinsIsError || rtdCoinsIsError || funds.isError || gasFunds.isError)
    return <Alert>{t("common.syncError")}</Alert>;

  return (
    <Loading
      loading={
        queryResult.isPending ||
        funds.isPending ||
        gasFunds.isPending ||
        coinMetadata.isPending ||
        rtdCoinsIsPending ||
        coinsIsPending
      }
    >
      <Formik
        initialValues={{
          amount: initialAmount,
          to: initialTo,
          isPayAllRtd:
            !!initAmountBig &&
            initAmountBig === coinBalance &&
            coinType === RTD_TYPE_ARG,
          gasBudgetEst: "",
          gasPreview: null as PreparedCoinTransfer | null,
        }}
        validationSchema={validationSchemaStepOne}
        enableReinitialize
        validateOnMount
        validateOnChange
        onSubmit={async ({
          to,
          amount,
          isPayAllRtd,
          gasBudgetEst,
          gasPreview,
        }: FormValues) => {
          if (!coins || !rtdCoins || coinDecimals === undefined || !gasPreview)
            return;
          const coinsIDs = [...coins]
            .sort((a, b) =>
              BigInt(a.balance) < BigInt(b.balance)
                ? 1
                : BigInt(a.balance) > BigInt(b.balance)
                  ? -1
                  : 0,
            )
            .map(({ objectId }) => objectId);

          const recipientName =
            rtdNSEnabled && isValidRtdNSName(to) ? to : undefined;
          if (recipientName) {
            const address = (await rpc.resolveRecipientName(to))?.address;
            if (!address) {
              throw new Error(t("transfer.nameNotFound"));
            }
            to = address;
          }

          if (!activeAddress) return;
          assertCoinTransferDraft(rpc, gasPreview, {
            sender: activeAddress,
            to,
            coinType,
            amount,
            coinDecimals,
            isPayAllRtd,
            recipientName,
          });
          const data = {
            requestId: crypto.randomUUID(),
            prepared: gasPreview,
            to,
            amount,
            isPayAllRtd,
            coins,
            coinIds: coinsIDs,
            gasBudgetEst,
          };
          onSubmit(data);
        }}
      >
        {({
          isValid,
          isSubmitting,
          setFieldValue,
          values,
          submitForm,
          validateField,
        }) => {
          const newPayRtdAll =
            parseAmount(values.amount, coinDecimals) === coinBalance &&
            coinType === RTD_TYPE_ARG;
          if (values.isPayAllRtd !== newPayRtdAll) {
            setFieldValue("isPayAllRtd", newPayRtdAll);
          }

          const gasAtomic = values.gasPreview
            ? BigInt(values.gasPreview.gasBudget)
            : null;
          const hasEnoughBalance =
            gasAtomic !== null &&
            (values.isPayAllRtd ||
              values.gasPreview?.gasPaymentKind !== "coins" ||
              rtdBalance >=
                gasAtomic +
                  parseAmount(
                    coinType === RTD_TYPE_ARG ? values.amount : "0",
                    coinDecimals,
                  ));

          return (
            <BottomMenuLayout>
              <Content>
                <Form autoComplete="off" noValidate>
                  <div className="w-full flex flex-col flex-grow">
                    <div className="px-2 mb-2.5">
                      <Text variant="caption" color="steel" weight="semibold">
                        {t("transfer.selectAmount")}
                      </Text>
                    </div>

                    <InputWithAction
                      data-testid="coin-amount-input"
                      type="numberInput"
                      name="amount"
                      placeholder="0.00"
                      prefix={values.isPayAllRtd ? "~ " : ""}
                      actionText={t("common.max")}
                      suffix={` ${symbol}`}
                      actionType="button"
                      allowNegative={false}
                      decimals
                      rounded="lg"
                      dark
                      onActionClicked={async () => {
                        // using await to make sure the value is set before the validation
                        await setFieldValue("amount", formattedTokenBalance);
                        validateField("amount");
                      }}
                      actionDisabled={
                        parseAmount(values?.amount, coinDecimals) ===
                          coinBalance ||
                        queryResult.isPending ||
                        !coinBalance
                      }
                    />
                  </div>
                  {gasAtomic !== null && !hasEnoughBalance && isValid ? (
                    <div className="mt-3">
                      <Alert>{t("transfer.insufficientGas")}</Alert>
                    </div>
                  ) : null}

                  {coins ? (
                    <GasBudgetEstimation
                      coinType={coinType}
                      coinDecimals={coinDecimals}
                      coins={coins}
                    />
                  ) : null}

                  <div className="w-full flex gap-2.5 flex-col mt-7.5">
                    <div className="px-2 tracking-wider">
                      <Text variant="caption" color="steel" weight="semibold">
                        {t("transfer.recipient")}
                      </Text>
                    </div>
                    <div className="w-full flex relative items-center flex-col">
                      <Field
                        component={AddressInput}
                        name="to"
                        placeholder={t("transfer.addressPlaceholder")}
                      />
                    </div>
                  </div>
                </Form>
              </Content>
              <Menu
                stuckClass="sendCoin-cta"
                className="w-full px-0 pb-0 mx-0 gap-2.5"
              >
                <Button
                  type="submit"
                  onClick={submitForm}
                  variant="primary"
                  loading={isSubmitting}
                  disabled={
                    !isValid ||
                    isSubmitting ||
                    !hasEnoughBalance ||
                    values.gasBudgetEst === ""
                  }
                  size="tall"
                  text={t("common.review")}
                  after={<ArrowRight16 />}
                />
              </Menu>
            </BottomMenuLayout>
          );
        }}
      </Formik>
    </Loading>
  );
}
