// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DateCard } from "_app/shared/date-card";
import { useI18n } from "_app/i18n";
import { Text } from "_app/shared/text";
import type { WalletHistoryTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { receiptStakeEvents } from "rtd-apps-core/src/rpc/transaction-view";
import { formatAddress } from "rtd-typescript/utils";
import { Link } from "react-router-dom";
import { ActivityStatusTag, GenesisTag, type ActivityStatus } from "./ActivityStatusTag";
import { TxnIcon } from "./TxnIcon";

export function TransactionCard({
  txn,
  address,
  activityStatus,
}: {
  txn: WalletHistoryTransaction;
  address: string;
  activityStatus?: ActivityStatus;
}) {
  const { t } = useI18n();
  const stakes = txn.transaction
    ? receiptStakeEvents(txn.transaction, address)
    : [];
  const kind =
    stakes.length && stakes.every((event) => event.kind === "stake")
      ? "Staked"
      : stakes.length && stakes.every((event) => event.kind === "unstake")
        ? "Unstaked"
        : "Transaction";
  const label =
    kind === "Staked"
      ? t("staking.stakeRtd")
      : kind === "Unstaked"
        ? t("staking.unstakeRtd")
        : t("receipt.transaction");
  const error = txn.transaction?.status.error?.message;
  // The first system transaction of a chain is its genesis record; existing
  // history fields identify it without another read.
  const genesis = txn.kind === "SystemTransaction" && txn.checkpoint === 0;
  const verifiedStatus: ActivityStatus =
    txn.status === "FAILURE" ? "failed" : "complete";
  return (
    <Link
      data-testid="link-to-txn"
      to={`/receipt?${new URLSearchParams({
        txdigest: txn.digest,
        ...(txn.transaction || !txn.nativeTransaction
          ? {}
          : {
              native: "1",
              checkpoint: String(txn.checkpoint),
              timestamp: String(txn.timestampMs),
              status: txn.status,
            }),
      })}`}
      className="flex min-w-0 items-center w-full flex-col gap-2 py-4 no-underline"
    >
      <div className="flex items-start w-full justify-between gap-3">
        <div className="w-7.5">
          <TxnIcon txnFailed={txn.status === "FAILURE"} variant={kind} />
        </div>
        <div className="flex flex-col w-full gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Text color="gray-90" weight="semibold">
              {txn.status === "FAILURE" ? t("receipt.failed") : label}
            </Text>
            {activityStatus ? (
              <ActivityStatusTag status={activityStatus} />
            ) : genesis ? (
              <GenesisTag />
            ) : (
              <ActivityStatusTag status={verifiedStatus} />
            )}
          </div>
          {error && (
            <Text variant="pSubtitle" color="issue-dark">
              {error}
            </Text>
          )}
          {txn.transaction && txn.sender && (
            <Text variant="subtitle" color="steel-darker">
              {t("activity.sender")}: {formatAddress(txn.sender)}
            </Text>
          )}
          <DateCard timestamp={txn.timestampMs} size="sm" />
        </div>
      </div>
    </Link>
  );
}
