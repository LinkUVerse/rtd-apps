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
import { ReceiptNotice } from "./ReceiptNotice";
import * as styles from "./Receipt.module.scss";
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
    <div className={styles.card}>
      <div className={styles.summary}>
        <StatusIcon status={txn.status.success} />
        <h2 data-testid="transaction-status">
          {t(txn.status.success ? "receipt.success" : "receipt.failed")}
        </h2>
        {txn.timestampMs !== null && (
          <DateCard timestamp={txn.timestampMs} size="md" />
        )}
      </div>
      {!txn.status.success && (
        <ReceiptNotice tone="issue">{txn.status.error.message}</ReceiptNotice>
      )}
      <section className={styles.details}>
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
          <ReceiptNotice tone="warning">
            {t("receipt.checkpointPending")}
          </ReceiptNotice>
        )}
        <ExplorerLinkCard
          digest={txn.digest}
          timestamp={
            txn.timestampMs === null ? undefined : String(txn.timestampMs)
          }
        />
      </section>
    </div>
  );
}
