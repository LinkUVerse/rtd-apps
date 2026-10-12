// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DateCard } from "_app/shared/date-card";
import { useI18n } from "_app/i18n";
import { Text } from "_app/shared/text";
import type { WalletHistoryTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { receiptStakeEvents } from "rtd-apps-core/src/rpc/transaction-view";
import { formatAddress } from "rtd-typescript/utils";
import { Link } from "react-router-dom";
import { TxnIcon } from "./TxnIcon";

export function TransactionCard({
  txn,
  address,
}: {
  txn: WalletHistoryTransaction;
  address: string;
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
  return (
    <Link
      data-testid="link-to-txn"
      to={`/receipt?${new URLSearchParams({ txdigest: txn.digest })}`}
      className="flex min-w-0 items-center w-full flex-col gap-2 py-4 no-underline"
    >
      <div className="flex items-start w-full justify-between gap-3">
        <div className="w-7.5">
          <TxnIcon txnFailed={txn.status === "FAILURE"} variant={kind} />
        </div>
        <div className="flex flex-col w-full gap-1.5">
          <Text color="gray-90" weight="semibold">
            {txn.status === "FAILURE" ? t("receipt.failed") : label}
          </Text>
          {error && (
            <Text variant="pSubtitle" color="issue-dark">
              {error}
            </Text>
          )}
          {txn.sender && (
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
