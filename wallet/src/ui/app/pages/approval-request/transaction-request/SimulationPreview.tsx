// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useMemo } from "react";
import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { ObjectEffects } from "_src/ui/app/components/receipt-card/ObjectEffects";
import { BalanceChanges } from "_src/ui/app/shared/transaction-summary/cards/BalanceChanges";
import { useRecognizedPackages } from "_src/ui/app/hooks/useRecognizedPackages";
import { useI18n } from "_src/ui/app/i18n";
import type { WalletPreparedTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  receiptBalanceChanges,
  receiptObjectEffects,
} from "rtd-apps-core/src/rpc/transaction-view";

export function SimulationPreview({
  prepared,
  isPending,
  isError,
}: {
  prepared?: WalletPreparedTransaction;
  isPending: boolean;
  isError: boolean;
}) {
  const { t } = useI18n(),
    recognized = useRecognizedPackages();
  const transaction =
    !isError && prepared?.simulation.$kind === "Transaction"
      ? prepared.simulation.Transaction
      : undefined;
  const summary = useMemo(
    () =>
      transaction
        ? {
            balances: receiptBalanceChanges(transaction, recognized),
            objects: receiptObjectEffects(transaction),
          }
        : null,
    [transaction, recognized],
  );
  if (isPending) return <LoadingIndicator />;
  if (isError || !summary)
    return <Alert>{t("approval.estimationFailed")}</Alert>;
  return (
    <section className="flex flex-col gap-4">
      <p>{t("approval.simulationOnly")}</p>
      <BalanceChanges changes={summary.balances} />
      <ObjectEffects changes={summary.objects} />
      <p className="break-all">
        {t("nft.transferDigest")}: {prepared!.digest}
      </p>
    </section>
  );
}
