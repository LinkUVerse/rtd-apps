// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import type { WalletReceiptTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  receiptBalanceChanges,
  receiptGas,
  receiptObjectEffects,
  receiptStakeEvents,
} from "rtd-apps-core/src/rpc/transaction-view";
import Alert from "../alert";
import { useRecognizedPackages } from "../../hooks/useRecognizedPackages";
import { useI18n } from "../../i18n";
import { DateCard } from "../../shared/date-card";
import { BalanceChanges } from "../../shared/transaction-summary/cards/BalanceChanges";
import { ExplorerLinkCard } from "../../shared/transaction-summary/cards/ExplorerLink";
import { GasSummary } from "../../shared/transaction-summary/cards/GasSummary";
import { ObjectEffects } from "./ObjectEffects";
import { StakeTxnCard } from "./StakeTxnCard";
import { StatusIcon } from "./StatusIcon";
import { UnStakeTxnCard } from "./UnstakeTxnCard";

export function ReceiptCard({
  txn,
  activeAddress,
}: {
  txn: WalletReceiptTransaction;
  activeAddress: string;
}) {
  const { t } = useI18n();
  const recognized = useRecognizedPackages();
  const balances = useMemo(
    () => receiptBalanceChanges(txn, recognized),
    [txn, recognized],
  );
  const objects = useMemo(() => receiptObjectEffects(txn), [txn]);
  const stakes = useMemo(
    () => receiptStakeEvents(txn, activeAddress),
    [txn, activeAddress],
  );
  const gas = useMemo(() => receiptGas(txn), [txn]);
  return (
    <div className="block relative w-full h-full">
      <div className="flex flex-col gap-3 items-center justify-center mb-4">
        <StatusIcon status={txn.status.success} />
        <span data-testid="transaction-status" className="sr-only">
          {t(txn.status.success ? "receipt.success" : "receipt.failed")}
        </span>
        {txn.timestampMs !== null && (
          <DateCard timestamp={txn.timestampMs} size="md" />
        )}
      </div>
      {!txn.status.success && <Alert>{txn.status.error.message}</Alert>}
      <section className="-mx-5 bg-rtd/10 min-h-full">
        <div className="px-5 py-8 flex flex-col gap-4">
          {stakes.map((event) =>
            event.kind === "stake" ? (
              <StakeTxnCard key={event.index} event={event} />
            ) : (
              <UnStakeTxnCard key={event.index} event={event} />
            ),
          )}
          <BalanceChanges changes={balances} />
          <ObjectEffects changes={objects} />
          <GasSummary gasSummary={gas} />
          {txn.checkpoint === null && (
            <Alert mode="warning">{t("receipt.checkpointPending")}</Alert>
          )}
          <ExplorerLinkCard
            digest={txn.digest}
            timestamp={
              txn.timestampMs === null ? undefined : String(txn.timestampMs)
            }
          />
        </div>
      </section>
    </div>
  );
}
